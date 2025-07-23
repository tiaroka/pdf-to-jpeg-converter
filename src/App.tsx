import React, { useState, useRef } from 'react';
import { Upload, Download, Loader2 } from 'lucide-react';
import { FileValidationError, getErrorMessage } from './types/errors';
import './App.css';

const PDFToJPEGConverter = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [images, setImages] = useState<Array<{
    pageNumber: number;
    blob: Blob;
    filename: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(2);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): void => {
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const ALLOWED_TYPES = ['application/pdf'];

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new FileValidationError('PDFファイルのみ対応しています');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new FileValidationError(`ファイルサイズが大きすぎます。${MAX_FILE_SIZE / (1024 * 1024)}MB以下にしてください`);
    }

    if (file.size === 0) {
      throw new FileValidationError('空のファイルです');
    }
  };

  const handleFileSelect = (file: File) => {
    try {
      validateFile(file);
      setPdfFile(file);
      setError('');
      setImages([]);
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const convertPDFToImages = async () => {
    if (!pdfFile) return;

    setLoading(true);
    setError('');
    setImages([]);

    try {
      // PDF.jsライブラリを確実に読み込む
      await loadPDFJS();
      
      if (!window.pdfjsLib) {
        throw new Error('PDF.js library not loaded. Please refresh the page and try again.');
      }
      
      const pdfjsLib = window.pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      
      const totalPages = pdf.numPages;
      const convertedImages = [];
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Canvas context not available');
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/jpeg', quality);
        });
        
        convertedImages.push({
          pageNumber: pageNum,
          blob: blob,
          filename: `slide_${String(pageNum).padStart(3, '0')}.jpg`
        });
      }

      setImages(convertedImages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError('PDFの変換中にエラーが発生しました: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleDownloadImage = (image: typeof images[0]) => {
    downloadImage(image.blob, image.filename);
  };

const handleDownloadAll = async () => {
  if (images.length > 10) {
    const confirmed = window.confirm(`${images.length}枚の画像をダウンロードします。続行しますか？`);
    if (!confirmed) return;
    
    try {
      // JSZipライブラリを動的に読み込み
      if (!window.JSZip) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
          script.crossOrigin = 'anonymous';
          script.referrerPolicy = 'no-referrer';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load JSZip library'));
          document.head.appendChild(script);
        });
      }
      
      if (!window.JSZip) {
        throw new Error('JSZip library not loaded');
      }
      
      const zip = new window.JSZip();
      
      // すべての画像をZIPに追加
      for (const image of images) {
        zip.file(image.filename, image.blob);
      }
      
      // ZIPファイルを生成
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadImage(zipBlob, 'pdf_slides.zip');
      
    } catch (error) {
      console.error('ZIP作成エラー:', error);
      alert('ZIPファイルの作成に失敗しました。個別にダウンロードします。');
      // 個別ダウンロードにフォールバック
      await downloadImagesIndividually();
    }
  } else {
    // 10枚以下の場合は個別にダウンロード
    await downloadImagesIndividually();
  }
};

const downloadImagesIndividually = async () => {
  for (let i = 0; i < images.length; i++) {
    downloadImage(images[i].blob, images[i].filename);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
};

  const ImagePreview = ({ image }: { image: typeof images[0] }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    
    React.useEffect(() => {
      const url = URL.createObjectURL(image.blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }, [image.blob]);
    
    return (
      <div className="border rounded-lg overflow-hidden shadow-sm">
        {blobUrl && (
          <img src={blobUrl} alt={`Slide ${image.pageNumber}`} className="w-full h-auto" />
        )}
        <div className="p-3 bg-gray-50 flex justify-between items-center">
          <span className="text-sm text-gray-600">スライド {image.pageNumber}</span>
          <button
            onClick={() => handleDownloadImage(image)}
            className="bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            保存
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            PDF → JPEG 変換ツール
          </h1>
          <p className="text-gray-600 text-center mb-8">
            PDFファイルを高品質なJPEG画像に変換します。<br />
            プレゼンテーションや資料を簡単に画像として保存・共有できます。
          </p>

          <div className="mb-8">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2">PDFファイルをドラッグ＆ドロップ</p>
              <p className="text-sm text-gray-500">または クリックして選択</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {pdfFile && (
              <p className="mt-4 text-sm text-gray-600">
                選択されたファイル: {pdfFile.name}
              </p>
            )}
          </div>

          {pdfFile && !loading && images.length === 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-4">変換設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    画質: {Math.round(quality * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    解像度倍率: {scale}x
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.5"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {pdfFile && !loading && images.length === 0 && (
            <button
              onClick={convertPDFToImages}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              JPEG画像に変換
            </button>
          )}

          {loading && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">変換中...</p>
            </div>
          )}

          {images.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  変換完了: {images.length}枚のスライド
                </h2>
                <button
                  onClick={handleDownloadAll}
                  className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  すべてダウンロード
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image) => (
                  <ImagePreview key={image.pageNumber} image={image} />
                ))}
              </div>

              <button
                onClick={() => {
                  setPdfFile(null);
                  setImages([]);
                }}
                className="w-full mt-6 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                新しいPDFを変換
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// PDF.jsライブラリの読み込みをPromiseベースに変更
const loadPDFJS = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
};

function App() {
  return <PDFToJPEGConverter />;
}

export default App;
import React, { useEffect, useRef, useState } from 'react';
import { Upload, Download, Loader2 } from 'lucide-react';
// legacy ビルドを使う（modern ビルドは最新ブラウザ専用の構文・API に依存するため、
// 一般公開のツールとしては対応範囲の広い legacy を選ぶ）
import type { PDFDocumentLoadingTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { ConversionError, getErrorMessage } from './types/errors';
import { validateFile } from './lib/validate-file';
import { describePdfError } from './lib/pdf-errors';
import { clampScale } from './lib/canvas-limits';
import { siteConfig } from '../site.config';

type ConvertedImage = {
  pageNumber: number;
  blob: Blob;
  filename: string;
};

// PDF.js は変換開始時に遅延ロードする（初回表示を軽くするため）。
// 本体・worker ともにビルド成果物として同一オリジンから配信し、CDN には依存しない。
const loadPdfJs = async () => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  return pdfjs;
};

const downloadBlob = (blob: Blob, filename: string) => {
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

// 親コンポーネントの外で定義する（内側に置くと親の再レンダーごとに再マウントされ、
// Blob URL を作り直してしまう）
const ImagePreview = ({
  image,
  onDownload,
}: {
  image: ConvertedImage;
  onDownload: (image: ConvertedImage) => void;
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(image.blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image.blob]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {blobUrl && (
        <img src={blobUrl} alt={`スライド ${image.pageNumber}`} className="w-full h-auto" />
      )}
      <div className="p-3 bg-gray-50 flex justify-between items-center">
        <span className="text-sm text-gray-600">スライド {image.pageNumber}</span>
        <button
          onClick={() => onDownload(image)}
          className="bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
        >
          <Download className="w-3 h-3" />
          保存
        </button>
      </div>
    </div>
  );
};

const Footer = () => {
  // 運営者名と関連サイトを「·」区切りで並べる（未設定の項目は出さない）
  const credits: React.ReactNode[] = [];
  if (siteConfig.operator) {
    credits.push(<span key="operator">運営: {siteConfig.operator}</span>);
  }
  for (const link of siteConfig.relatedLinks) {
    credits.push(
      <a
        key={link.url}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-gray-600 hover:underline"
      >
        {link.label}
      </a>,
    );
  }

  return (
    <footer className="mt-8 text-center text-sm text-gray-500 space-y-2">
      <p>PDFファイルはお使いのブラウザ内で処理され、サーバーには送信されません。</p>
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <a href="/privacy" className="underline hover:text-gray-700">
          プライバシーポリシー
        </a>
        <a href="/terms" className="underline hover:text-gray-700">
          利用規約
        </a>
        {siteConfig.contactFormUrl && (
          <a
            href={siteConfig.contactFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-700"
          >
            お問い合わせ
          </a>
        )}
        {siteConfig.repoUrl && (
          <a
            href={siteConfig.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-700"
          >
            GitHub
          </a>
        )}
      </nav>
      {credits.length > 0 && (
        <p className="text-xs text-gray-400">
          {credits.map((node, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="mx-1">·</span>}
              {node}
            </React.Fragment>
          ))}
        </p>
      )}
    </footer>
  );
};

const PDFToJPEGConverter = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(2);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    try {
      validateFile(file);
      setPdfFile(file);
      setError('');
      setImages([]);
    } catch (err) {
      setError(getErrorMessage(err));
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

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // 子要素（アイコンや文字）の上へ移っただけなら「離れた」扱いにしない（枠の点滅防止）
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
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
    setNotice('');
    setImages([]);

    let loadingTask: PDFDocumentLoadingTask | null = null;

    try {
      const pdfjs = await loadPdfJs();
      // data は worker に転送されるため、以降は再利用しない
      const data = new Uint8Array(await pdfFile.arrayBuffer());
      loadingTask = pdfjs.getDocument({ data });
      const pdf = await loadingTask.promise;

      const converted: ConvertedImage[] = [];
      let minEffectiveScale = scale;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        // 大判ページで canvas の上限を超えないよう、倍率をページごとに丸める
        const effectiveScale = clampScale(page.getViewport({ scale: 1 }), scale);
        minEffectiveScale = Math.min(minEffectiveScale, effectiveScale);
        const viewport = page.getViewport({ scale: effectiveScale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        await page.render({ canvas, viewport }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(
                  new ConversionError(
                    'ページが大きすぎて画像を生成できませんでした。解像度倍率を下げてお試しください',
                  ),
                );
              }
            },
            'image/jpeg',
            quality,
          );
        });

        // 使い終わったページとキャンバスのメモリを解放する
        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;

        converted.push({
          pageNumber: pageNum,
          blob,
          filename: `slide_${String(pageNum).padStart(3, '0')}.jpg`,
        });
      }

      setImages(converted);
      setNotice(
        minEffectiveScale < scale
          ? `一部のページが大きいため、解像度倍率を ${minEffectiveScale.toFixed(2)}x に自動で下げました`
          : '',
      );
    } catch (err) {
      console.error('PDF変換エラー:', err);
      setError(describePdfError(err));
    } finally {
      // worker 側のドキュメントとメモリを解放する
      if (loadingTask) {
        await loadingTask.destroy().catch(() => undefined);
      }
      setLoading(false);
    }
  };

  const handleDownloadImage = (image: ConvertedImage) => {
    downloadBlob(image.blob, image.filename);
  };

  const downloadImagesIndividually = async () => {
    for (const image of images) {
      downloadBlob(image.blob, image.filename);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  const handleDownloadAll = async () => {
    if (images.length <= 10) {
      // 10枚以下の場合は個別にダウンロード
      await downloadImagesIndividually();
      return;
    }

    const confirmed = window.confirm(
      `${images.length}枚の画像をダウンロードします。続行しますか？`,
    );
    if (!confirmed) return;

    try {
      // JSZip はビルド成果物として同梱し、必要になった時点で読み込む
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      for (const image of images) {
        zip.file(image.filename, image.blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'pdf_slides.zip');
    } catch (err) {
      console.error('ZIP作成エラー:', err);
      alert('ZIPファイルの作成に失敗しました。個別にダウンロードします。');
      await downloadImagesIndividually();
    }
  };

  const resetAll = () => {
    setPdfFile(null);
    setImages([]);
    setError('');
    setNotice('');
    // 同じファイルを再選択したときにも change イベントが発火するようにする
    if (fileInputRef.current) fileInputRef.current.value = '';
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
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {pdfFile && (
              <p className="mt-4 text-sm text-gray-600 text-center">
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
              {notice && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">{notice}</p>
                </div>
              )}
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
                  <ImagePreview
                    key={image.pageNumber}
                    image={image}
                    onDownload={handleDownloadImage}
                  />
                ))}
              </div>

              <button
                onClick={resetAll}
                className="w-full mt-6 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                新しいPDFを変換
              </button>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
};

function App() {
  return <PDFToJPEGConverter />;
}

export default App;

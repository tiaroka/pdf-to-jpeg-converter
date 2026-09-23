import React, { useEffect, useRef, useState } from 'react';
import { Upload, Download, Loader2 } from 'lucide-react';
// legacyビルドを使う（modernビルドは最新ブラウザ専用の構文・APIに依存するため、
// 一般公開のツールとしては対応範囲の広いlegacyを選ぶ）
import type { PDFDocumentLoadingTask, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { ConversionError, getErrorMessage } from './types/errors';
import { validateFile } from './lib/validate-file';
import { describePdfError } from './lib/pdf-errors';
import { clampScale } from './lib/canvas-limits';

type ConvertedImage = {
  pageNumber: number;
  blob: Blob;
  filename: string;
};

// 画面の状態。「変換中なのに結果がある」のようなありえない組み合わせを型で排除する
type Phase =
  | { kind: 'idle' }
  | { kind: 'selected'; file: File }
  | { kind: 'converting'; file: File; done: number; total: number }
  | { kind: 'done'; file: File; images: ConvertedImage[]; notice: string };

type RenderTask = ReturnType<PDFPageProxy['render']>;

// PDF.jsは変換開始時に遅延ロードする（初回表示を軽くするため）。
// 本体・workerともにビルド成果物として同一オリジンから配信し、CDNには依存しない。
const loadPdfJs = async () => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  return pdfjs;
};

// JSZipも同梱し、必要になった時点で読み込む
const loadJsZip = () => import('jszip');

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
// Blob URLを作り直してしまう）
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
        <img src={blobUrl} alt={`スライド${image.pageNumber}`} className="w-full h-auto" />
      )}
      <div className="p-3 bg-gray-50 flex justify-between items-center">
        <span className="text-sm text-gray-600">スライド{image.pageNumber}</span>
        <button
          onClick={() => onDownload(image)}
          className="bg-blue-600 text-white py-1px-3 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
        >
          <Download className="w-3 h-3" aria-hidden="true" />
          保存
        </button>
      </div>
    </div>
  );
};

const PDFToJPEGConverter = () => {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState('');
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(2);
  const [isDragging, setIsDragging] = useState(false);
  const [zipping, setZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // キャンセル要求と、進行中の描画タスク
  const cancelRef = useRef(false);
  const renderTaskRef = useRef<RenderTask | null>(null);
  // 変換完了後、ボタンが押される前に裏でJSZipを読んでおく
  const jszipPromise = useRef<ReturnType<typeof loadJsZip> | null>(null);

  const clearFileInput = () => {
    // 同じファイルを再選択したときにもchangeイベントが発火するようにする
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (file: File) => {
    try {
      validateFile(file);
      setPhase({ kind: 'selected', file });
      setError('');
    } catch (err) {
      // 不正なファイルを選んだときは前のファイルも残さない
      setPhase({ kind: 'idle' });
      clearFileInput();
      setError(getErrorMessage(err));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // 子要素（アイコンや文字）の上へ移っただけなら「離れた」扱いにしない（枠の点滅防止）
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const convertPDFToImages = async () => {
    if (phase.kind !== 'selected') return;
    const { file } = phase;

    setError('');
    cancelRef.current = false;
    setPhase({ kind: 'converting', file, done: 0, total: 0 });

    let loadingTask: PDFDocumentLoadingTask | null = null;

    try {
      const pdfjs = await loadPdfJs();
      // dataはworkerに転送されるため、以降は再利用しない
      const data = new Uint8Array(await file.arrayBuffer());
      loadingTask = pdfjs.getDocument({ data });
      const pdf = await loadingTask.promise;
      const total = pdf.numPages;
      setPhase({ kind: 'converting', file, done: 0, total });

      const converted: ConvertedImage[] = [];
      let minEffectiveScale = scale;

      for (let pageNum = 1; pageNum <= total; pageNum++) {
        if (cancelRef.current) throw new Error('cancelled');

        const page = await pdf.getPage(pageNum);
        // 大判ページでcanvasの上限を超えないよう、倍率をページごとに丸める
        const effectiveScale = clampScale(page.getViewport({ scale: 1 }), scale);
        minEffectiveScale = Math.min(minEffectiveScale, effectiveScale);
        const viewport = page.getViewport({ scale: effectiveScale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const renderTask = page.render({ canvas, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;

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
        setPhase({ kind: 'converting', file, done: pageNum, total });
      }

      const notice =
        minEffectiveScale < scale
          ? `一部のページが大きいため、解像度倍率を${minEffectiveScale.toFixed(2)}xに自動で下げました`
          : '';
      setPhase({ kind: 'done', file, images: converted, notice });
      jszipPromise.current ??= loadJsZip();
    } catch (err) {
      if (cancelRef.current) {
        // 利用者によるキャンセル。エラーではないので選択済みの状態に戻すだけ
        setPhase({ kind: 'selected', file });
        return;
      }
      console.error('PDF変換エラー:', err);
      setError(describePdfError(err));
      setPhase({ kind: 'selected', file });
    } finally {
      renderTaskRef.current = null;
      // worker側のドキュメントとメモリを解放する
      if (loadingTask) {
        await loadingTask.destroy().catch(() => undefined);
      }
    }
  };

  const cancelConversion = () => {
    cancelRef.current = true;
    // 描画中のページがあれば中断する（RenderingCancelledExceptionが投げられ、catchで拾う）
    renderTaskRef.current?.cancel();
  };

  const handleDownloadImage = (image: ConvertedImage) => {
    downloadBlob(image.blob, image.filename);
  };

  // 枚数にかかわらずZIPでまとめて保存する。個別ダウンロードの連打はブラウザの
  // 「複数ファイルのダウンロード」確認で2枚目以降が止まることが多い
  const handleDownloadAll = async () => {
    if (phase.kind !== 'done') return;
    const { file, images } = phase;

    setZipping(true);
    setError('');
    try {
      jszipPromise.current ??= loadJsZip();
      const { default: JSZip } = await jszipPromise.current;
      const zip = new JSZip();
      for (const image of images) {
        zip.file(image.filename, image.blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `${file.name.replace(/\.pdf$/i, '')}_slides.zip`);
    } catch (err) {
      console.error('ZIP作成エラー:', err);
      setError('ZIPファイルの作成に失敗しました。各画像の「保存」ボタンから個別に保存してください');
    } finally {
      setZipping(false);
    }
  };

  const resetAll = () => {
    setPhase({ kind: 'idle' });
    setError('');
    clearFileInput();
  };

  // 案内文とフッターはindex.html側の静的HTML（検索エンジンがJSなしで読めるように）。
  // ここでは変換UIのカードだけを描画する
  return (
    <div className="max-w-4xl mx-auto px-6 pt-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          PDFをJPEG画像として保存
        </h1>
        <p className="text-gray-600 text-center mb-8">
          PDFの各ページをJPEG画像に変換し、1枚ずつ、またはまとめて保存できます。
          <br />
          無料・登録不要。変換はお使いのブラウザの中で行われ、PDFファイルはどこにも送信されません。
        </p>

        <div className="mb-8">
          {/* labelで包むと、クリックでもキーボード（Tab → Enter/Space）でもファイル選択が開く */}
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" aria-hidden="true" />
            <span className="block text-gray-600 mb-2">PDFファイルをドラッグ＆ドロップ</span>
            <span className="block text-sm text-gray-500">または クリックして選択</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="PDFファイルを選択"
            />
          </label>
          {phase.kind !== 'idle' && (
            <p className="mt-4 text-sm text-gray-600 text-center">
              選択されたファイル: {phase.file.name}
            </p>
          )}
        </div>

        {phase.kind === 'selected' && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="font-semibold mb-4">変換設定</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="quality" className="block text-sm font-medium text-gray-700 mb-2">
                  画質: {Math.round(quality * 100)}%
                </label>
                <input
                  id="quality"
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
                <label htmlFor="scale" className="block text-sm font-medium text-gray-700 mb-2">
                  解像度倍率: {scale}x
                </label>
                <input
                  id="scale"
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
          <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {phase.kind === 'selected' && (
          <button
            onClick={convertPDFToImages}
            className="w-full bg-blue-600 text-white py-3px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            JPEG画像に変換
          </button>
        )}

        {phase.kind === 'converting' && (
          <div className="text-center py-8" aria-live="polite">
            <Loader2
              className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600"
              aria-hidden="true"
            />
            <p className="text-gray-600 mb-4">
              {phase.total > 0
                ? `変換中... ${phase.done}/${phase.total}ページ`
                : 'PDFを読み込んでいます...'}
            </p>
            {phase.total > 0 && (
              <div
                className="w-full bg-gray-200 rounded-full h-2 mb-6"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={phase.total}
                aria-valuenow={phase.done}
                aria-label="変換の進捗"
              >
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(phase.done / phase.total) * 100}%` }}
                />
              </div>
            )}
            <button
              onClick={cancelConversion}
              className="bg-gray-200 text-gray-700 py-2px-6 rounded-lg hover:bg-gray-300 transition-colors"
            >
              キャンセル
            </button>
          </div>
        )}

        {phase.kind === 'done' && (
          <div>
            {phase.notice && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">{phase.notice}</p>
              </div>
            )}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <h2 className="text-xl font-semibold text-gray-800" aria-live="polite">
                変換完了: {phase.images.length}枚のスライド
              </h2>
              <button
                onClick={handleDownloadAll}
                disabled={zipping}
                className="bg-green-600 text-white py-2px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-wait"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                {zipping ? 'ZIPを作成中...' : 'すべてダウンロード（ZIP）'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {phase.images.map((image) => (
                <ImagePreview
                  key={image.pageNumber}
                  image={image}
                  onDownload={handleDownloadImage}
                />
              ))}
            </div>

            <button
              onClick={resetAll}
              className="w-full mt-6 bg-gray-600 text-white py-2px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              新しいPDFを変換
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return <PDFToJPEGConverter />;
}

export default App;

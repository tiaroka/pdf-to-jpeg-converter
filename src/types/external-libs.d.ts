// Type definitions for external libraries

declare global {
  interface Window {
    pdfjsLib?: {
      getDocument: (src: ArrayBuffer) => PDFLoadingTask;
      GlobalWorkerOptions: {
        workerSrc: string;
      };
    };
    JSZip?: new () => JSZipInstance;
  }
}

interface PDFLoadingTask {
  promise: Promise<PDFDocumentProxy>;
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getViewport: (params: { scale: number }) => PDFViewport;
  render: (renderContext: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFViewport;
  }) => {
    promise: Promise<void>;
  };
}

interface PDFViewport {
  width: number;
  height: number;
}

interface JSZipInstance {
  file: (name: string, data: Blob) => void;
  generateAsync: (options: { type: 'blob' }) => Promise<Blob>;
}

export {};
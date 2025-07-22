// Custom error types for better error handling

export class PDFProcessingError extends Error {
  public readonly cause?: Error;
  
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'PDFProcessingError';
    this.cause = cause;
  }
}

export class LibraryLoadError extends Error {
  public readonly cause?: Error;
  
  constructor(libraryName: string, cause?: Error) {
    super(`Failed to load ${libraryName} library`);
    this.name = 'LibraryLoadError';
    this.cause = cause;
  }
}

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export class CanvasError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanvasError';
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}
import { FileValidationError } from '../types/errors';

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// 選択されたファイルが変換対象として妥当か検査する。問題があれば FileValidationError を投げる
export const validateFile = (file: File): void => {
  // ドラッグ＆ドロップでは MIME が空になる環境があるため、その場合のみ拡張子で補う
  const isPdf =
    file.type === 'application/pdf' || (file.type === '' && /\.pdf$/i.test(file.name));

  if (!isPdf) {
    throw new FileValidationError('PDFファイルのみ対応しています');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new FileValidationError(
      `ファイルサイズが大きすぎます。${MAX_FILE_SIZE / (1024 * 1024)}MB以下にしてください`,
    );
  }

  if (file.size === 0) {
    throw new FileValidationError('空のファイルです');
  }
};

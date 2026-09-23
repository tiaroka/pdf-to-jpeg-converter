import { ConversionError } from '../types/errors';

// 例外を利用者向けの文言に変換する。内部のメッセージは表に出さない（呼び出し側で console に残す）
export const describePdfError = (err: unknown): string => {
  if (err instanceof ConversionError) return err.message;
  const name = err instanceof Error ? err.name : '';
  switch (name) {
    case 'PasswordException':
      return 'パスワード付きPDFには対応していません。保護を解除してからお試しください';
    case 'InvalidPDFException':
      return 'PDFファイルとして読み込めませんでした。ファイルが壊れていないか確認してください';
    default:
      return '変換中に問題が発生しました。ファイルが壊れていないか確認し、もう一度お試しください';
  }
};

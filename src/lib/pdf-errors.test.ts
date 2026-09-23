import { describe, expect, it } from 'vitest';
import { ConversionError } from '../types/errors';
import { describePdfError } from './pdf-errors';

const namedError = (name: string, message: string): Error => {
  const err = new Error(message);
  err.name = name;
  return err;
};

describe('describePdfError', () => {
  it('ConversionError は自身のメッセージをそのまま返す', () => {
    expect(describePdfError(new ConversionError('大きすぎます'))).toBe('大きすぎます');
  });

  it('PasswordException はパスワード付き PDF の案内になる', () => {
    expect(describePdfError(namedError('PasswordException', 'No password given'))).toContain(
      'パスワード付きPDF',
    );
  });

  it('InvalidPDFException は壊れたファイルの案内になる', () => {
    expect(describePdfError(namedError('InvalidPDFException', 'Invalid PDF structure'))).toContain(
      'PDFファイルとして読み込めませんでした',
    );
  });

  it('不明なエラーでは内部メッセージを表に出さない', () => {
    const message = describePdfError(new Error('Failed to create blob from canvas'));
    expect(message).toContain('変換中に問題が発生しました');
    expect(message).not.toContain('Failed to create blob');
  });

  it('Error でない値でも固定の文言を返す', () => {
    expect(describePdfError('oops')).toContain('変換中に問題が発生しました');
  });
});

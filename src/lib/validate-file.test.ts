import { describe, expect, it } from 'vitest';
import { MAX_FILE_SIZE, validateFile } from './validate-file';

// 実際に 100MB を確保せず、size だけ差し替える
const fileWithSize = (name: string, type: string, size: number): File => {
  const file = new File([new Uint8Array(1)], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('validateFile', () => {
  it('MIME が application/pdf なら通る', () => {
    expect(() => validateFile(fileWithSize('a.pdf', 'application/pdf', 10))).not.toThrow();
  });

  it('MIME が空で拡張子が .pdf なら通る', () => {
    expect(() => validateFile(fileWithSize('a.pdf', '', 10))).not.toThrow();
  });

  it('MIME が空で拡張子が .PDF（大文字）でも通る', () => {
    expect(() => validateFile(fileWithSize('A.PDF', '', 10))).not.toThrow();
  });

  it('MIME が別の種類なら拡張子が .pdf でも拒否する', () => {
    expect(() => validateFile(fileWithSize('a.pdf', 'image/png', 10))).toThrow(
      'PDFファイルのみ対応しています',
    );
  });

  it('サイズ 0 は拒否する', () => {
    expect(() => validateFile(fileWithSize('a.pdf', 'application/pdf', 0))).toThrow('空のファイルです');
  });

  it('100MB ちょうどは通る', () => {
    expect(() =>
      validateFile(fileWithSize('a.pdf', 'application/pdf', MAX_FILE_SIZE)),
    ).not.toThrow();
  });

  it('100MB + 1 バイトは拒否する', () => {
    expect(() =>
      validateFile(fileWithSize('a.pdf', 'application/pdf', MAX_FILE_SIZE + 1)),
    ).toThrow('100MB以下にしてください');
  });
});

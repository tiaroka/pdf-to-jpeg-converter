# PDF to JPEG 変換ツール

シンプルで高性能なPDFからJPEG画像への変換ツールです。

## 機能

- 📄 PDF を JPEG 画像に変換
- 🔒 **完全プライベート**: データはサーバーに送信されません
- 🖱️ ドラッグ&ドロップ対応
- 📁 個別・一括ダウンロード
- ⚙️ 品質・サイズ設定
- 📱 スマホ対応

## ライブデモ

- [https://pdf2jpeg.aroka.net](https://pdf2jpeg.aroka.net)

## 使い方

1. PDFファイルを選択またはドラッグ&ドロップ
2. 品質とサイズを設定（必要に応じて）
3. 「変換」ボタンをクリック
4. 変換された画像をダウンロード

## プライバシー・セキュリティ

- 🔒 **完全クライアントサイド処理**: PDFファイルはサーバーに送信されません
- 💾 **データ保存なし**: すべての処理がブラウザ内で完結
- 🛡️ **機密文書も安全**: データ漏洩リスクゼロ
- 🌐 **オフライン動作可能**: 初回読み込み後はネットワーク不要

## 技術仕様

- **フロントエンド**: React + TypeScript
- **PDF処理**: PDF.js（ブラウザ内で実行）
- **デプロイ**: Google Cloud Run（静的ファイル配信のみ）
- **最大ファイルサイズ**: 100MB
- **対応ブラウザ**: Chrome, Firefox, Safari, Edge

## ローカル開発

```bash
# インストール
npm install

# 開発サーバー起動
npm run dev
```

## ライセンス

MIT License

## お問い合わせ

[ti@aroka.net](mailto:ti@aroka.net)

---

# PDF to JPEG Converter (English)

A simple and high-performance PDF to JPEG conversion tool.

## Features

- 📄 Convert PDF to JPEG images
- 🔒 **Fully Private**: No data sent to servers
- 🖱️ Drag & drop support
- 📁 Individual and bulk download
- ⚙️ Quality and size settings
- 📱 Mobile friendly

## Live Demo

- [https://pdf2jpeg.aroka.net](https://pdf2jpeg.aroka.net)

## How to Use

1. Select or drag & drop PDF file
2. Set quality and size (if needed)
3. Click "Convert" button
4. Download converted images

## Privacy & Security

- 🔒 **Complete Client-Side Processing**: PDF files are never uploaded to servers
- 💾 **No Data Storage**: All processing happens in your browser
- 🛡️ **Confidential Documents Safe**: Zero data breach risk
- 🌐 **Works Offline**: No network required after initial load

## Technical Specs

- **Frontend**: React + TypeScript
- **PDF Processing**: PDF.js (runs in browser)
- **Deployment**: Google Cloud Run (static file serving only)
- **Max File Size**: 100MB
- **Supported Browsers**: Chrome, Firefox, Safari, Edge

## Local Development

```bash
# Install
npm install

# Start dev server
npm run dev
```

## License

MIT License

## Contact

[ti@aroka.net](mailto:ti@aroka.net)
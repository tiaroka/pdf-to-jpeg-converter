# PDF to JPEG変換ツール（pdf2jpeg）

ブラウザ内で完結する、シンプルなPDF→JPEG画像変換ツールです。公開サイトでは「pdf2jpeg」の名前で運用しています（サイト名は `site.config.ts` の `siteName`）。

- ライブデモ: [https://pdf2jpeg.aroka.net](https://pdf2jpeg.aroka.net)
- [プライバシーポリシー](https://pdf2jpeg.aroka.net/privacy) / [利用規約](https://pdf2jpeg.aroka.net/terms)

## 機能

- 📄 PDFの各ページをJPEG画像に変換
- 🔒 PDFファイルはブラウザ内で処理され、サーバーには送信されない
- 🖱️ ドラッグ&ドロップ対応
- 📁 個別ダウンロード・ZIP一括ダウンロード
- ⚙️ 画質・解像度倍率の設定
- 📱 スマホ対応

## 使い方

1. PDFファイルを選択またはドラッグ&ドロップ
2.画質と解像度を設定（必要に応じて）
3.「JPEG画像に変換」ボタンをクリック
4.変換された画像をダウンロード

## プライバシー・セキュリティ

- **PDFはアップロードされません**: 変換処理はすべてブラウザ内（PDF.js）で実行され、PDFファイルや変換結果がアプリのサーバーへ送られるコードはありません
- **第三者への通信なし**: PDF.js、JSZipなどのライブラリはすべてビルドに同梱し、同一オリジンから配信しています（CDNへの実行時通信はありません）
- **アクセスログ**: Cloud RunがIPアドレス・日時・URL・User-Agentなどのアクセスログを記録します。詳細は[プライバシーポリシー](https://pdf2jpeg.aroka.net/privacy)を参照してください
- **Cookie・アクセス解析なし**
- **セキュリティヘッダー**: CSP、X-Content-Type-Options、X-Frame-Options、Referrer-Policy、HSTSなどをnginxで付与しています（`security-headers.conf`）

## 技術仕様

- **フロントエンド**: React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- **PDF処理**: [PDF.js](https://mozilla.github.io/pdf.js/)（pdfjs-dist、ブラウザ内で実行）
- **ZIP生成**: JSZip
- **配信**: Google Cloud Run上のnginx（静的ファイル配信のみ）
- **最大ファイルサイズ**: 100MB
- **対応ブラウザ**: Chrome, Firefox, Safari, Edgeの最新版

## ローカル開発

```bash
# インストール
npm install

# 開発サーバー起動
npm run dev

# lint / 本番ビルド / ビルド結果のプレビュー
npm run lint
npm run build
npm run preview
```

Node.js 22以上が必要です。

## フォークして使う場合

運営者名・お問い合わせ先・公開URLなど、デプロイ先ごとに変わる情報は `site.config.ts` にまとめています。フォークして自分のサイトとして公開する場合は、まずこのファイルを書き換えてください。値はビルド時に、フッター、`index.html` のcanonical / OG / JSON-LD、`robots.txt` / `sitemap.xml`、プライバシーポリシー・利用規約の運営者名やURLに反映されます。

- `privacy.html` / `terms.html` の本文はGoogle Cloud Runでのホスティングを前提に書いています。別のホスティングで公開する場合は本文も見直してください
- `cloudbuild.yaml` の `substitutions`（サービス名・リージョン）と `CLOUD_RUN_DEPLOY.md` も自分の環境に合わせてください

## デプロイ

Cloud Runへのデプロイ手順は [CLOUD_RUN_DEPLOY.md](CLOUD_RUN_DEPLOY.md)を参照してください。

## ライセンス

MIT License

## お問い合わせ

サイトのフッターにある「お問い合わせ」フォームからご連絡ください（URLは `site.config.ts` で設定）

---

# PDF to JPEG Converter (English)

A simple PDF to JPEG converter that runs entirely in your browser.

- Live demo: [https://pdf2jpeg.aroka.net](https://pdf2jpeg.aroka.net) (Japanese UI)

## Features

- 📄 Convert each PDF page to a JPEG image
- 🔒 PDF files are processed in the browser and never uploaded to a server
- 🖱️ Drag & drop support
- 📁 Individual download or ZIP bulk download
- ⚙️ Quality and resolution settings
- 📱 Mobile friendly

## Privacy & Security

- **No upload**: All processing happens in the browser with PDF.js. There is no code path that sends your PDF or the converted images to the application server.
- **No third-party requests**: PDF.js, JSZip and CSS are bundled and served from the same origin (no runtime CDN requests).
- **Access logs**: Cloud Run records standard access logs (IP address, timestamp, URL, User-Agent). See the [privacy policy](https://pdf2jpeg.aroka.net/privacy) (Japanese).
- **No cookies, no analytics.**
- **Security headers**: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy and HSTS are set by nginx (`security-headers.conf`).

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- **PDF processing**: PDF.js (pdfjs-dist, runs in the browser)
- **Deployment**: nginx on Google Cloud Run (static file serving only)
- **Max file size**: 100MB

## Local Development

```bash
npm install
npm run dev
```

Requires Node.js 22 or later.

## Forking

Deployment-specific values (operator name, contact form, site URL, related links) live in `site.config.ts`. Edit it first; the values are injected at build time into the footer, `index.html` metadata, `robots.txt` / `sitemap.xml` and the policy pages. The privacy policy and terms (Japanese) assume Cloud Run hosting, so review them for your setup.

## License

MIT License

## Contact

Use the contact form linked in the site footer (configured in `site.config.ts`).

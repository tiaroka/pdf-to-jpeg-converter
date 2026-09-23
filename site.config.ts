// デプロイ固有の設定
//
// フォークして自分のサイトとして公開する場合は、まずこのファイルを書き換える。
// ここの値は Vite プラグイン（vite.config.ts）でビルド時に以下へ差し込まれる:
//   - src/App.tsx のフッター（未設定の項目は表示されない）
//   - index.html の canonical / OG / JSON-LD
//   - robots.txt / sitemap.xml（ビルド時に生成）
//   - privacy.html / terms.html の運営者名・URL・お問い合わせ先
// privacy.html / terms.html の本文は Google Cloud Run でのホスティングを前提にしている。
// 別のホスティングで公開する場合は本文も見直すこと。

export type SiteConfig = {
  /** 公開 URL。末尾スラッシュ付き。canonical / OG / sitemap / robots に使う */
  siteUrl: string;
  /** 運営者表記（フッター・ポリシー）。空文字なら表示しない */
  operator: string;
  /** お問い合わせフォームの URL。空文字ならリンクを出さない */
  contactFormUrl: string;
  /** ソースコードの URL。空文字ならリンクを出さない */
  repoUrl: string;
  /** フッター下段に並べる関連サイト。空配列なら出さない */
  relatedLinks: Array<{ label: string; url: string }>;
  /** プライバシーポリシー・利用規約の制定日（表示用） */
  policyDate: string;
};

export const siteConfig: SiteConfig = {
  siteUrl: 'https://pdf2jpeg.aroka.net/',
  operator: 'aroka works',
  // 本アプリ専用の Google フォーム（ログイン不要）
  contactFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdj_YooRSBAme63wfZTnnGAZi2W_kh7SfM39WcBhJi_gxqD_Q/viewform',
  repoUrl: 'https://github.com/tiaroka/pdf-to-jpeg-converter',
  relatedLinks: [
    { label: '開発者ポートフォリオ', url: 'https://portfolio.aroka.net/' },
    { label: 'ブログ', url: 'https://blog.aroka.net/' },
    { label: '長い長いノート', url: 'https://longlongnote.aroka.net/' },
  ],
  policyDate: '2026年9月23日',
};

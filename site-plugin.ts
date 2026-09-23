// site.config.ts の値を HTML に差し込み、robots.txt / sitemap.xml を生成する Vite プラグイン。
// 純粋関数（escapeHtml / fill / buildVars など）は vite.config.ts から切り離してテストできるようにしている。
import type { Plugin } from 'vite'
import type { SiteConfig } from './site.config'

// アプリそのものの名前と説明（デプロイ先によらない値。サイト名は site.config.ts の siteName）
export const APP_NAME = 'PDF to JPEG 変換ツール'
export const APP_DESCRIPTION =
  'PDFの各ページをJPEG画像に変換して保存できる無料ツール。処理はブラウザ内で完結し、ファイルはサーバーに送信されません。登録不要・透かしなし・ページ数制限なし。'

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 'YYYY-MM-DD' を「YYYY年M月D日」にする
export const formatJaDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

// 末尾スラッシュの有無で結果が変わらないよう正規化する
export const normalizeSiteUrl = (url: string): string => url.replace(/\/*$/, '/')

// HTML の {{NAME}} を置き換える。vars に無い名前（prototype 由来の名前を含む）はそのまま残す
export const fill = (html: string, vars: Record<string, string>): string =>
  html.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (Object.hasOwn(vars, k) ? vars[k] : m))

const externalLink = (href: string, label: string): string =>
  `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="hover:text-gray-600 hover:underline">${escapeHtml(label)}</a>`

// 検索エンジン向けの構造化データ（WebSite + WebApplication）。
// <script> 内に置くため、JSON 文字列中の < は u003c 形式にエスケープして </script> で抜けないようにする
export const buildJsonLd = (config: SiteConfig): string => {
  const siteUrl = normalizeSiteUrl(config.siteUrl)
  const organization = config.operator ? { '@type': 'Organization', name: config.operator } : undefined
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}#website`,
        url: siteUrl,
        name: config.siteName,
        alternateName: APP_NAME,
        inLanguage: 'ja',
        ...(organization ? { publisher: organization } : {}),
      },
      {
        '@type': 'WebApplication',
        '@id': `${siteUrl}#app`,
        name: config.siteName,
        alternateName: APP_NAME,
        url: siteUrl,
        description: APP_DESCRIPTION,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        inLanguage: 'ja',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
        license: 'https://opensource.org/licenses/MIT',
        ...(organization ? { author: organization } : {}),
      },
    ],
  }
  return JSON.stringify(graph, null, 2).replace(/</g, '\\u003c')
}

// 差し込み用の値を組み立てる。属性値・本文のどちらに入っても壊れないよう、すべて HTML エスケープする
export const buildVars = (config: SiteConfig): Record<string, string> => {
  const siteUrl = normalizeSiteUrl(config.siteUrl)
  const relatedLinks = config.relatedLinks.map((l) => ` · ${externalLink(l.url, l.label)}`).join('')
  // トップページのフッター下段: サイト名（アプリ名）· 運営: ○○ · 関連リンク…（未設定の項目は出さない）
  const footerCredits =
    `${escapeHtml(config.siteName)}（${escapeHtml(APP_NAME)}）` +
    (config.operator ? ` · 運営: ${escapeHtml(config.operator)}` : '') +
    relatedLinks
  return {
    SITE_URL: escapeHtml(siteUrl),
    SITE_NAME: escapeHtml(config.siteName),
    APP_NAME: escapeHtml(APP_NAME),
    APP_DESCRIPTION: escapeHtml(APP_DESCRIPTION),
    OPERATOR: escapeHtml(config.operator),
    CONTACT_FORM_URL: escapeHtml(config.contactFormUrl),
    REPO_URL: escapeHtml(config.repoUrl),
    LICENSE_URL: escapeHtml(
      config.repoUrl ? `${config.repoUrl}/blob/master/LICENSE` : 'https://opensource.org/licenses/MIT',
    ),
    // 未設定ならリンクごと出さない
    CONTACT_LINK: config.contactFormUrl
      ? `<a href="${escapeHtml(config.contactFormUrl)}" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-700">お問い合わせ</a>`
      : '',
    REPO_LINK: config.repoUrl
      ? `<a href="${escapeHtml(config.repoUrl)}" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-700">GitHub</a>`
      : '',
    RELATED_LINKS: relatedLinks,
    FOOTER_CREDITS: footerCredits,
    POLICY_DATE: escapeHtml(formatJaDate(config.policyDate)),
    JSON_LD: buildJsonLd(config),
  }
}

export const buildRobots = (config: SiteConfig): string =>
  `User-agent: *\nAllow: /\n\nSitemap: ${normalizeSiteUrl(config.siteUrl)}sitemap.xml\n`

// lastmod はビルド日ではなく実際の更新日を出す（不正確な lastmod は検索エンジンに無視される）。
// トップは更新日を追跡していないので出さない。ポリシー・規約は制定日
export const buildSitemap = (config: SiteConfig): string => {
  const siteUrl = normalizeSiteUrl(config.siteUrl)
  const entry = (path: string, lastmod?: string) =>
    `  <url>\n    <loc>${siteUrl}${path}</loc>\n` +
    (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '') +
    `  </url>`
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [entry(''), entry('privacy', config.policyDate), entry('terms', config.policyDate)].join('\n') +
    '\n</urlset>\n'
  )
}

export function sitePlugin(config: SiteConfig): Plugin {
  const vars = buildVars(config)
  const robots = buildRobots(config)
  const sitemap = buildSitemap(config)

  return {
    name: 'site-config',
    transformIndexHtml: { order: 'pre', handler: (html) => fill(html, vars) },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
    },
    configureServer(server) {
      // 開発サーバーでも本番（nginx）と同じ URL で開けるようにする
      server.middlewares.use((req, res, next) => {
        if (req.url === '/privacy' || req.url === '/terms') {
          req.url += '.html'
        } else if (req.url === '/robots.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(robots)
          return
        } else if (req.url === '/sitemap.xml') {
          res.setHeader('Content-Type', 'application/xml; charset=utf-8')
          res.end(sitemap)
          return
        }
        next()
      })
    },
  }
}

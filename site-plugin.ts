// site.config.ts の値を HTML に差し込み、robots.txt / sitemap.xml を生成する Vite プラグイン。
// 純粋関数（escapeHtml / fill / buildVars など）は vite.config.ts から切り離してテストできるようにしている。
import type { Plugin } from 'vite'
import type { SiteConfig } from './site.config'

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

// 差し込み用の値を組み立てる。属性値・本文のどちらに入っても壊れないよう、すべて HTML エスケープする
export const buildVars = (config: SiteConfig): Record<string, string> => {
  const siteUrl = normalizeSiteUrl(config.siteUrl)
  const relatedLinks = config.relatedLinks
    .map(
      (l) =>
        ` · <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`,
    )
    .join('')
  return {
    SITE_URL: escapeHtml(siteUrl),
    OPERATOR: escapeHtml(config.operator),
    CONTACT_FORM_URL: escapeHtml(config.contactFormUrl),
    REPO_URL: escapeHtml(config.repoUrl),
    LICENSE_URL: escapeHtml(
      config.repoUrl ? `${config.repoUrl}/blob/master/LICENSE` : 'https://opensource.org/licenses/MIT',
    ),
    RELATED_LINKS: relatedLinks,
    POLICY_DATE: escapeHtml(formatJaDate(config.policyDate)),
    // JSON-LD の author。運営者が未設定なら行ごと省く。</script> で抜けないよう < は < にする
    JSON_LD_AUTHOR: config.operator
      ? `"author": { "@type": "Organization", "name": ${JSON.stringify(config.operator).replace(/</g, '\\u003c')} },`
      : '',
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

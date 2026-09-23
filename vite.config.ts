import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { siteConfig } from './site.config'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// site.config.ts の値を HTML の {{NAME}} に差し込み、robots.txt / sitemap.xml を生成する
function sitePlugin(): Plugin {
  const relatedLinks = siteConfig.relatedLinks
    .map(
      (l) =>
        ` · <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`,
    )
    .join('')
  const vars: Record<string, string> = {
    SITE_URL: siteConfig.siteUrl,
    OPERATOR: escapeHtml(siteConfig.operator),
    CONTACT_FORM_URL: siteConfig.contactFormUrl,
    REPO_URL: siteConfig.repoUrl,
    LICENSE_URL: siteConfig.repoUrl
      ? `${siteConfig.repoUrl}/blob/master/LICENSE`
      : 'https://opensource.org/licenses/MIT',
    RELATED_LINKS: relatedLinks,
    POLICY_DATE: escapeHtml(siteConfig.policyDate),
    // JSON-LD の author。運営者が未設定なら行ごと省く
    JSON_LD_AUTHOR: siteConfig.operator
      ? `"author": { "@type": "Organization", "name": ${JSON.stringify(siteConfig.operator)} },`
      : '',
  }
  const fill = (html: string) => html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m))

  const today = new Date().toISOString().slice(0, 10)
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteConfig.siteUrl}sitemap.xml\n`
  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ['', 'privacy', 'terms']
      .map((p) => `  <url>\n    <loc>${siteConfig.siteUrl}${p}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
      .join('\n') +
    '\n</urlset>\n'

  return {
    name: 'site-config',
    transformIndexHtml: { order: 'pre', handler: (html) => fill(html) },
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), sitePlugin()],
  build: {
    rollupOptions: {
      // プライバシーポリシー・利用規約も Vite の入口にして、設定値を差し込む
      input: {
        main: 'index.html',
        privacy: 'privacy.html',
        terms: 'terms.html',
      },
    },
  },
})

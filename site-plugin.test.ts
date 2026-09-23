import { describe, expect, it } from 'vitest'
import type { SiteConfig } from './site.config'
import {
  APP_NAME,
  buildJsonLd,
  buildRobots,
  buildSitemap,
  buildVars,
  escapeHtml,
  fill,
  formatJaDate,
  normalizeSiteUrl,
} from './site-plugin'

const base: SiteConfig = {
  siteUrl: 'https://example.com',
  siteName: 'pdf2jpeg',
  operator: 'Tom & Jerry <Inc>',
  contactFormUrl: 'https://forms.example.com/?a=1&b=2',
  repoUrl: 'https://github.com/example/repo',
  relatedLinks: [{ label: 'Blog <β>', url: 'https://blog.example.com/?x=1&y=2' }],
  policyDate: '2026-09-23',
}

describe('fill', () => {
  it('登録された名前を置き換える', () => {
    expect(fill('<p>{{A}}-{{B}}</p>', { A: '1', B: '2' })).toBe('<p>1-2</p>')
  })
  it('未知のプレースホルダはそのまま残す', () => {
    expect(fill('{{UNKNOWN}}', {})).toBe('{{UNKNOWN}}')
  })
  it('prototype 由来の名前は置換しない', () => {
    expect(fill('{{constructor}} {{toString}} {{__proto__}}', {})).toBe(
      '{{constructor}} {{toString}} {{__proto__}}',
    )
  })
})

describe('escapeHtml', () => {
  it('& < > " をエスケープする', () => {
    expect(escapeHtml('a&b<c>"d"')).toBe('a&amp;b&lt;c&gt;&quot;d&quot;')
  })
})

describe('normalizeSiteUrl', () => {
  it('末尾スラッシュの有無にかかわらず 1 つ付ける', () => {
    expect(normalizeSiteUrl('https://example.com')).toBe('https://example.com/')
    expect(normalizeSiteUrl('https://example.com/')).toBe('https://example.com/')
    expect(normalizeSiteUrl('https://example.com//')).toBe('https://example.com/')
    expect(normalizeSiteUrl('https://example.com/app')).toBe('https://example.com/app/')
  })
})

describe('formatJaDate', () => {
  it('YYYY-MM-DD を年月日にする（ゼロ埋めなし）', () => {
    expect(formatJaDate('2026-09-03')).toBe('2026年9月3日')
  })
})

describe('buildVars', () => {
  const vars = buildVars(base)
  it('URL は正規化してからエスケープする', () => {
    expect(vars.SITE_URL).toBe('https://example.com/')
    expect(vars.CONTACT_FORM_URL).toBe('https://forms.example.com/?a=1&amp;b=2')
  })
  it('運営者名と日付はエスケープ・整形される', () => {
    expect(vars.OPERATOR).toBe('Tom &amp; Jerry &lt;Inc&gt;')
    expect(vars.POLICY_DATE).toBe('2026年9月23日')
  })
  it('関連リンクは先頭に区切りを付けて並べる', () => {
    expect(vars.RELATED_LINKS).toBe(
      ' · <a href="https://blog.example.com/?x=1&amp;y=2" target="_blank" rel="noopener noreferrer" class="hover:text-gray-600 hover:underline">Blog &lt;β&gt;</a>',
    )
  })
  it('フッターの表記はサイト名（アプリ名）・運営・関連リンクの順', () => {
    expect(vars.FOOTER_CREDITS).toBe(
      `pdf2jpeg（${APP_NAME}） · 運営: Tom &amp; Jerry &lt;Inc&gt;` + vars.RELATED_LINKS,
    )
  })
  it('運営者と関連リンクが無ければサイト名だけになる', () => {
    expect(buildVars({ ...base, operator: '', relatedLinks: [] }).FOOTER_CREDITS).toBe(
      `pdf2jpeg（${APP_NAME}）`,
    )
  })
  it('お問い合わせ・GitHub のリンクは未設定なら空になる', () => {
    expect(vars.CONTACT_LINK).toContain('お問い合わせ')
    expect(vars.REPO_LINK).toContain('GitHub')
    const none = buildVars({ ...base, contactFormUrl: '', repoUrl: '' })
    expect(none.CONTACT_LINK).toBe('')
    expect(none.REPO_LINK).toBe('')
    expect(none.LICENSE_URL).toBe('https://opensource.org/licenses/MIT')
  })
})

describe('buildJsonLd', () => {
  it('WebSite と WebApplication をサイト名で出し、アプリ名を alternateName に残す', () => {
    const json = JSON.parse(buildJsonLd(base).replace(/\\u003c/g, '<'))
    const [site, app] = json['@graph']
    expect(site['@type']).toBe('WebSite')
    expect(site.name).toBe('pdf2jpeg')
    expect(site.alternateName).toBe(APP_NAME)
    expect(site.url).toBe('https://example.com/')
    expect(app['@type']).toBe('WebApplication')
    expect(app.author).toEqual({ '@type': 'Organization', name: 'Tom & Jerry <Inc>' })
  })
  it('< は \\u003c にして script 要素を壊さない', () => {
    const raw = buildJsonLd(base)
    expect(raw).toContain('\\u003cInc>')
    expect(raw).not.toContain('<Inc>')
  })
  it('運営者が空なら author / publisher を出さない', () => {
    const json = JSON.parse(buildJsonLd({ ...base, operator: '' }))
    expect(json['@graph'][0].publisher).toBeUndefined()
    expect(json['@graph'][1].author).toBeUndefined()
  })
})

describe('buildRobots / buildSitemap', () => {
  it('robots.txt は正規化した siteUrl で sitemap を指す', () => {
    expect(buildRobots(base)).toContain('Sitemap: https://example.com/sitemap.xml')
  })
  it('sitemap はトップに lastmod を出さず、ポリシー・規約には制定日を出す', () => {
    const xml = buildSitemap(base)
    expect(xml).toContain('<loc>https://example.com/</loc>\n  </url>')
    expect(xml).toContain('<loc>https://example.com/privacy</loc>\n    <lastmod>2026-09-23</lastmod>')
    expect(xml).toContain('<loc>https://example.com/terms</loc>\n    <lastmod>2026-09-23</lastmod>')
    expect(xml.match(/<lastmod>/g)).toHaveLength(2)
  })
})

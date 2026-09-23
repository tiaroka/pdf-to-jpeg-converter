import { describe, expect, it } from 'vitest'
import type { SiteConfig } from './site.config'
import {
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
      ' · <a href="https://blog.example.com/?x=1&amp;y=2" target="_blank" rel="noopener noreferrer">Blog &lt;β&gt;</a>',
    )
  })
  it('JSON-LD の author は < を \\u003c にする', () => {
    expect(vars.JSON_LD_AUTHOR).toContain('\\u003cInc>')
    expect(vars.JSON_LD_AUTHOR).not.toContain('<Inc>')
  })
  it('運営者が空なら JSON-LD の author 行は空になる', () => {
    expect(buildVars({ ...base, operator: '' }).JSON_LD_AUTHOR).toBe('')
  })
  it('repoUrl が空なら LICENSE_URL は OSI のページになる', () => {
    expect(buildVars({ ...base, repoUrl: '' }).LICENSE_URL).toBe('https://opensource.org/licenses/MIT')
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

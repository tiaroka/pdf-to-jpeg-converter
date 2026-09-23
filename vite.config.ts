/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { siteConfig } from './site.config'
import { sitePlugin } from './site-plugin'

// https://vite.dev/config/
export default defineConfig({
  // site.config.ts の値を HTML に差し込み、robots.txt / sitemap.xml を生成する（site-plugin.ts）
  plugins: [react(), tailwindcss(), sitePlugin(siteConfig)],
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
  test: {
    include: ['src/**/*.test.ts', '*.test.ts'],
  },
})

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const root = path.dirname(fileURLToPath(import.meta.url))

function dataUrl(file: string, mime: string): string {
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`
}

/** Bake Wikimedia portraits into the JS so the HTML has no sidecar files. */
function inlinePortraits(): Plugin {
  return {
    name: 'inline-portraits',
    transform(_code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/content/portraits.ts')) return
      const dir = path.join(root, 'public/portraits')
      const map: Record<string, string> = {}
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.jpg')) continue
        const slug = file.replace(/\.jpg$/, '')
        map[slug] = dataUrl(path.join(dir, file), 'image/jpeg')
      }
      return {
        code: `export const PORTRAITS = ${JSON.stringify(map)};\n`,
        map: null,
      }
    },
  }
}

/** Drop font preloads (fonts are inlined in CSS) and data-URL the favicons. */
function standaloneIndex(): Plugin {
  return {
    name: 'standalone-index',
    transformIndexHtml(html) {
      const owl = dataUrl(path.join(root, 'public/owl.svg'), 'image/svg+xml')
      const apple = dataUrl(path.join(root, 'public/apple-touch-icon.svg'), 'image/svg+xml')
      return html
        .replace(/<link rel="preload"[^>]*>\s*/g, '')
        .replace(/href="\.\/owl\.svg"/, `href="${owl}"`)
        .replace(/href="\.\/apple-touch-icon\.svg"/, `href="${apple}"`)
    },
  }
}

/** One-shot build: Council Room app → single inlined HTML. Offline prototype. */
export default defineConfig({
  base: './',
  plugins: [react(), inlinePortraits(), standaloneIndex(), viteSingleFile({ removeViteModuleLoader: true })],
  publicDir: false,
  build: {
    outDir: 'dist-standalone',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
})

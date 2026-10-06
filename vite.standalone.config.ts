import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

/** Stub the PWA virtual module so we can build without the service worker. */
function stubPwaRegister(): Plugin {
  const id = 'virtual:pwa-register'
  const resolved = '\0' + id
  return {
    name: 'stub-pwa-register',
    resolveId(source) {
      if (source === id) return resolved
    },
    load(id_) {
      if (id_ === resolved) {
        return `export function registerSW(){ return () => {} }`
      }
    },
  }
}

/** One-shot build: real Owlry app → single inlined HTML (no PWA). */
export default defineConfig({
  base: './',
  plugins: [react(), stubPwaRegister(), viteSingleFile({ removeViteModuleLoader: true })],
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

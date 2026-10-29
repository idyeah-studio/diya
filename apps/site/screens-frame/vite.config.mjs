// The Screens preview frame: a static Vite app that renders one screen file
// the way a fresh `npm create diya` Vite app would (same layer order, same
// provider), so the catalog previews exactly what readers paste.
//
//   pnpm --filter diya-site build:frame    # once, into public/screens-frame
//   pnpm --filter diya-site dev:frame      # rebuild on every change, beside `next dev`
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/screens-frame/',
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('../public/screens-frame', import.meta.url)),
    emptyOutDir: true,
    // One small chunk per screen; the frame loads only the one it shows.
    chunkSizeWarningLimit: 1200,
  },
})

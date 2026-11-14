// Builds the harness against the package's dist twice: once on React 18 (the package's own
// devDependency) and once on React 19 (the site's), the way two apps would install it.
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { writeFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'

const here = dirname(fileURLToPath(import.meta.url))
const pkg = join(here, '..', '..')
// Built output lives under node_modules/.cache, out of the repository's tree.
export const output = join(pkg, 'node_modules', '.cache', 'diya-browser')
const site = createRequire(join(pkg, '..', '..', 'apps', 'site', 'package.json'))
const own = createRequire(join(pkg, 'package.json'))
const reacts = {
  r18: { react: dirname(own.resolve('react/package.json')), 'react-dom': dirname(own.resolve('react-dom/package.json')) },
  r19: { react: dirname(site.resolve('react/package.json')), 'react-dom': dirname(site.resolve('react-dom/package.json')) },
}

export default async function setup() {
  for (const [name, paths] of Object.entries(reacts)) {
    for (const mode of ['production', 'development']) {
      await build({
        configFile: false,
        root: join(here, 'harness'),
        base: './',
        logLevel: 'error',
        mode,
        plugins: [react()],
        define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
        resolve: {
          alias: [
            { find: /^react-dom(\/.*)?$/, replacement: `${paths['react-dom']}$1` },
            { find: /^react(\/.*)?$/, replacement: `${paths.react}$1` },
            { find: /^@idyeah\/diya\/styles\.css$/, replacement: join(pkg, 'dist', 'styles.css') },
            { find: /^@idyeah\/diya$/, replacement: join(pkg, 'dist', 'index.js') },
            // lucide-react (the site's copy) for the leading-icon cases (M1).
            { find: /^lucide-react$/, replacement: dirname(site.resolve('lucide-react/package.json')) },
          ],
        },
        build: { outDir: join(output, mode === 'production' ? name : `${name}-dev`), emptyOutDir: true, minify: false },
      })
    }
  }
  // A hosted card field, as a payment provider ships one: its own page with one input, loaded
  // cross-origin (127.0.0.1 inside localhost) by the field case. Focusing its window focuses the
  // input, the way hosted fields forward focus.
  writeFileSync(join(output, 'card.html'), `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:transparent}input{font:16px system-ui;border:0;width:100%;height:100%;padding:0;background:transparent;outline:none;color:CanvasText}</style><input aria-label="Card number" id="card" placeholder="1234 1234 1234 1234"><script>addEventListener('focus',()=>document.getElementById('card').focus())</script>`)
}

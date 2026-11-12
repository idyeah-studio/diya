// Builds the harness against the package's dist twice: once on React 18 (the package's own
// devDependency) and once on React 19 (the site's), the way two apps would install it.
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
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
          ],
        },
        build: { outDir: join(output, mode === 'production' ? name : `${name}-dev`), emptyOutDir: true, minify: false },
      })
    }
  }
}

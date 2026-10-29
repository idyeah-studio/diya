#!/usr/bin/env node
// Measures how much JavaScript DIYA, and the libraries people compare it with,
// add to a fresh Vite + React production build. Everything installs into a
// temporary folder, never into this repository or its lockfile.
//
//   node bench/measure.mjs                 DIYA (packed from this folder) and the others
//   node bench/measure.mjs --only diya     DIYA alone, which is faster
//   node bench/measure.mjs --diya 1.0.0    a published version (or any npm spec / .tgz path)
//   node bench/measure.mjs --keep          keep the temporary folder and print where it is
//
// The number: the `gzip -9 -n` size of every .js file Vite writes, minus the same for
// a page that renders a plain <button> with React alone. DIYA's variants render
// inside StrictMode, so they're compared with a StrictMode baseline; the others
// render without it and are compared with the plain one. Each library is
// measured with its own provider when it has one.
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { gzipSync } from 'node:zlib'

const here = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(here, '..')

// Exact versions, so a rerun measures the same thing. Change them on purpose,
// and say so in README.md when you do.
export const TOOLCHAIN = {
  vite: '7.3.7',
  '@vitejs/plugin-react': '5.2.0',
  react: '19.3.1',
  'react-dom': '19.3.1',
}
// Vite's bundler and minifier move on their own, and their output moves with
// them, so they're pinned too (as npm overrides).
export const PINNED = {
  rollup: '4.64.12',
  esbuild: '0.28.2',
}
export const OTHERS = {
  '@mantine/core': '9.7.3',
  '@mantine/hooks': '9.7.3',
  '@mui/material': '9.5.0',
  '@emotion/react': '11.14.0',
  '@emotion/styled': '11.14.1',
  '@radix-ui/themes': '3.3.0',
  '@radix-ui/react-slot': '1.5.0',
  'class-variance-authority': '0.7.1',
  clsx: '2.1.1',
  'tailwind-merge': '3.7.0',
}

// Each variant, what it shows, and which baseline it is measured against.
export const VARIANTS = [
  { name: 'baseline', label: 'React alone, in StrictMode', group: 'baseline' },
  { name: 'baseline-nostrict', label: 'React alone', group: 'baseline' },
  { name: 'button', label: 'DIYA Button, with DiyaProvider', group: 'diya', base: 'baseline' },
  { name: 'button-noprovider', label: 'DIYA Button, no provider', group: 'diya', base: 'baseline' },
  { name: 'stack', label: 'DIYA Stack, TextInput and Button', group: 'diya', base: 'baseline' },
  { name: 'table', label: 'DIYA Button and Table', group: 'diya', base: 'baseline' },
  { name: 'all', label: 'All of DIYA (import *)', group: 'diya', base: 'baseline' },
  { name: 'radix-button', label: 'Radix Themes Button, with Theme', group: 'others', base: 'baseline-nostrict' },
  { name: 'shadcn-button', label: "shadcn's Button recipe (Tailwind's CSS not counted)", group: 'others', base: 'baseline-nostrict' },
  { name: 'mantine-button', label: 'Mantine Button, with MantineProvider', group: 'others', base: 'baseline-nostrict' },
  { name: 'mui-button', label: 'MUI Button', group: 'others', base: 'baseline-nostrict' },
  { name: 'radix-table', label: 'Radix Themes Button and Table', group: 'others', base: 'baseline-nostrict' },
  { name: 'mantine-table', label: 'Mantine Button and Table', group: 'others', base: 'baseline-nostrict' },
  { name: 'mui-table', label: 'MUI Button, Table and pagination', group: 'others', base: 'baseline-nostrict' },
]

// The gzip command line tool and Node's zlib both write DEFLATE, but not the
// same bytes: gzip's own encoder comes out about 0.1% smaller. The published
// numbers use the tool, so this does too, and falls back to zlib (and says so)
// where there's no gzip on the PATH.
let gzipTool
export function gzSize(file) {
  if (gzipTool === undefined) {
    try {
      execFileSync('gzip', ['--version'], { stdio: 'ignore' })
      gzipTool = true
    } catch {
      gzipTool = false
    }
  }
  if (gzipTool) return execFileSync('gzip', ['-9', '-n', '-c', file], { maxBuffer: 64 * 1024 * 1024 }).length
  return gzipSync(readFileSync(file), { level: 9 }).length
}
export const gzipMethod = () => (gzipTool === false ? "Node's zlib, level 9 (no gzip on the PATH; expect about 0.1% more)" : 'gzip -9 -n')

/** Sums the raw and gzipped sizes of the .js and .css files under dir. */
export function measureDir(dir) {
  const totals = { jsRaw: 0, jsGz: 0, cssRaw: 0, cssGz: 0 }
  const walk = (d) => {
    for (const name of readdirSync(d, { withFileTypes: true })) {
      const file = path.join(d, name.name)
      if (name.isDirectory()) walk(file)
      else if (/\.(js|css)$/.test(name.name)) {
        const kind = name.name.endsWith('.js') ? 'js' : 'css'
        totals[`${kind}Raw`] += readFileSync(file).length
        totals[`${kind}Gz`] += gzSize(file)
      }
    }
  }
  walk(dir)
  return totals
}

export const kb = (bytes) => `${bytes < 0 ? '−' : '+'}${(Math.abs(bytes) / 1000).toFixed(1)} KB`

/** Turns measurements into the rows README.md shows. */
export function table(results) {
  const rows = ['| Variant | JS, gzip | Added JS, gzip | CSS, gzip |', '| --- | ---: | ---: | ---: |']
  for (const v of VARIANTS) {
    const r = results[v.name]
    if (!r) continue
    const added = v.base && results[v.base] ? kb(r.jsGz - results[v.base].jsGz) : '·'
    rows.push(`| ${v.label} | ${(r.jsGz / 1000).toFixed(1)} KB | ${added} | ${r.cssGz ? `${(r.cssGz / 1000).toFixed(1)} KB` : '·'} |`)
  }
  return rows.join('\n')
}

function sh(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' })
}

function diyaSpec(requested, work) {
  if (requested) return /\.tgz$/.test(requested) ? `file:${path.resolve(requested)}` : requested
  if (!existsSync(path.join(packageRoot, 'dist/index.js'))) throw new Error('Build the package first (pnpm build), or pass --diya <version>.')
  const [packed] = JSON.parse(sh('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', work], packageRoot))
  return `file:${path.join(work, packed.filename)}`
}

async function main() {
  const { values } = parseArgs({ options: { only: { type: 'string' }, diya: { type: 'string' }, keep: { type: 'boolean' } } })
  if (values.only && values.only !== 'diya') throw new Error('--only takes diya')
  const variants = VARIANTS.filter((v) => !values.only || v.group !== 'others')
  const work = mkdtempSync(path.join(tmpdir(), 'diya-bench-'))
  try {
    const app = path.join(work, 'app')
    mkdirSync(path.join(app, 'src'), { recursive: true })
    const dependencies = { ...TOOLCHAIN, '@idyeah/diya': diyaSpec(values.diya, work), ...(values.only ? {} : OTHERS) }
    writeFileSync(path.join(app, 'package.json'), `${JSON.stringify({ name: 'diya-bench', private: true, type: 'module', dependencies, overrides: PINNED }, null, 2)}\n`)
    writeFileSync(path.join(app, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n')
    writeFileSync(path.join(app, 'vite.config.mjs'), "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()], logLevel: 'error' })\n")
    console.log(`Installing into ${app} …`)
    sh('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error', '--no-package-lock'], app)
    const installed = (name) => JSON.parse(readFileSync(path.join(app, 'node_modules', name, 'package.json'), 'utf8')).version
    const results = {}
    for (const v of variants) {
      copyFileSync(path.join(here, 'variants', `${v.name}.tsx`), path.join(app, 'src/main.tsx'))
      rmSync(path.join(app, 'dist'), { recursive: true, force: true })
      sh('npx', ['vite', 'build'], app)
      results[v.name] = measureDir(path.join(app, 'dist'))
      console.log(`  ${v.name.padEnd(18)} js ${String(results[v.name].jsGz).padStart(7)} B gz   css ${String(results[v.name].cssGz).padStart(6)} B gz`)
    }
    console.log(`\n@idyeah/diya ${installed('@idyeah/diya')} · Vite ${installed('vite')} (Rollup ${installed('rollup')}, esbuild ${installed('esbuild')}) · React ${installed('react')} · Node ${process.versions.node} · ${gzipMethod()}\n`)
    console.log(table(results))
    if (values.keep) console.log(`\nKept ${work}`)
  } finally {
    if (!values.keep) rmSync(work, { recursive: true, force: true })
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })

#!/usr/bin/env node
// Checks the templates against each other and against what create-diya expects:
// shared files stay identical, every provider file carries the one brand line
// create-diya fills in, the CSS layer order comes first, every template pins
// @idyeah/diya to create-diya's own version (they release in lockstep), no file
// name that npm or the public export would drop, and every path the notes
// mention exists.
//   node scripts/check-templates.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BRAND_MARKERS } from '../index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const templates = path.join(root, 'templates')
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

export const EXPECTED = ['next-dashboard', 'next-minimal', 'vite-minimal']
const SHARED = [
  ['next-minimal/app/first-form.tsx', 'vite-minimal/src/first-form.tsx'],
  ['next-minimal/_gitignore', 'next-dashboard/_gitignore'],
]
const LAYERS = '@layer reset, theme, base, diya, components, utilities;'
// npm drops .gitignore from tarballs; the public export refuses agent notes,
// lockfiles and build output. Templates store _gitignore and _agents.md instead.
const BANNED = /^(?:\.gitignore|AGENTS\.md|CLAUDE\.md|\.mcp\.json|\.npmrc|\.env.*|next-env\.d\.ts|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|node_modules|\.next|dist|.* [23]\..*)$/

function files(dir, rel = '') {
  const list = []
  for (const name of readdirSync(path.join(dir, rel)).sort()) {
    const child = rel ? `${rel}/${name}` : name
    list.push(child)
    if (statSync(path.join(dir, child)).isDirectory()) list.push(...files(dir, child))
  }
  return list
}

export function checkTemplates(dir = templates) {
  const problems = []
  const read = (p) => readFileSync(path.join(dir, p), 'utf8')
  const present = readdirSync(dir).filter((n) => statSync(path.join(dir, n)).isDirectory()).sort()
  if (present.join() !== EXPECTED.join()) problems.push(`templates are ${present.join(', ')}; expected ${EXPECTED.join(', ')}`)

  for (const [a, b] of SHARED)
    if (existsSync(path.join(dir, a)) && existsSync(path.join(dir, b)) && read(a) !== read(b)) problems.push(`${a} and ${b} differ`)

  for (const t of present) {
    const next = t.startsWith('next-')
    const all = files(path.join(dir, t))
    for (const rel of all) if (BANNED.test(path.basename(rel))) problems.push(`${t}/${rel}: npm or the public export would drop this name`)
    for (const need of ['package.json', '_gitignore', '_agents.md', 'README.md'])
      if (!all.includes(need)) problems.push(`${t} has no ${need}`)

    const pkg = JSON.parse(read(`${t}/package.json`))
    if (pkg.dependencies?.['@idyeah/diya'] !== `^${version}`)
      problems.push(`${t}/package.json pins @idyeah/diya to ${pkg.dependencies?.['@idyeah/diya']}; create-diya ${version} ships with ^${version}`)
    for (const script of ['dev', 'build']) if (!pkg.scripts?.[script]) problems.push(`${t}/package.json has no "${script}" script`)

    const providers = `${t}/${next ? 'app' : 'src'}/providers.tsx`
    if (!existsSync(path.join(dir, providers))) problems.push(`${providers} is missing`)
    else {
      const text = read(providers)
      const hits = BRAND_MARKERS.reduce((n, m) => n + text.split(m.find).length - 1, 0)
      if (hits !== 1) problems.push(`${providers} has ${hits} brand lines for --brand to fill; it needs exactly one`)
      if (next && !text.includes('linkComponent={Link}')) problems.push(`${providers} doesn't pass Next.js Link as linkComponent`)
      if (!/theme(?:=\{?["']system|: 'system')/.test(text)) problems.push(`${providers} doesn't default to theme="system"`)
    }

    if (t.endsWith('-minimal')) {
      const css = read(`${t}/${next ? 'app/globals.css' : 'src/index.css'}`)
      const firstRule = css.replace(/\/\*[\s\S]*?\*\//g, '').trimStart()
      if (!firstRule.startsWith(LAYERS)) problems.push(`${t}: the @layer order must be the stylesheet's first rule`)
      if (!css.includes('@import "@idyeah/diya/styles.css";')) problems.push(`${t}: the stylesheet doesn't import DIYA's styles`)
    }

    for (const note of ['_agents.md', 'README.md']) {
      if (!all.includes(note)) continue
      const text = read(`${t}/${note}`)
      for (const [, mentioned] of text.matchAll(/`((?:app|src|components|lib)\/[\w./-]*)`/g))
        if (!existsSync(path.join(dir, t, mentioned))) problems.push(`${t}/${note} mentions ${mentioned}, which isn't there`)
      for (const word of ['{{dev}}']) if (!text.includes(word)) problems.push(`${t}/${note} doesn't use ${word}`)
    }

    for (const rel of all) {
      if (!/\.(?:tsx?|css|md|json|html|mjs)$/.test(rel)) continue
      if (/colour/i.test(read(`${t}/${rel}`))) problems.push(`${t}/${rel}: use US spelling (color)`)
    }
  }
  return problems
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkTemplates()
  if (problems.length) {
    console.error(`Template check failed:\n  ${problems.join('\n  ')}`)
    process.exitCode = 1
  } else console.log(`Templates agree: ${EXPECTED.join(', ')} (create-diya ${version}, @idyeah/diya ^${version}).`)
}

#!/usr/bin/env node
// Builds templates/next-dashboard from the Oriel example app: copies it, takes
// out what only the live demo needs (the "A demo app · View this screen's source"
// bar and anything marked @demo-only), points @idyeah/diya at the published
// range, and lays the template's own README, agent notes and .gitignore on top.
//
//   node scripts/sync-oriel.mjs [--from <oriel folder>]          write the template
//   node scripts/sync-oriel.mjs [--from <oriel folder>] --check  fail if it's out of date
//
// Oriel can mark demo-only code three ways, and this script honors all three:
//   - a file whose first lines contain `@demo-only file` is left out;
//   - lines between `@demo-only start` and `@demo-only end` are left out;
//   - any other line containing `@demo-only` is left out.
// Binary files can't carry a marker, so a folder named `demo-only` (such as
// Oriel's public/demo-only, which holds its link-preview image) is left out whole.
// Without markers, it removes the demo bar element (className "source-bar" or
// "demo-bar", or <DemoBar>), the CSS rules for those classes, and the imports
// and constants that only the bar used.
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const self = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const TEMPLATE = 'templates/next-dashboard'
const OVERLAY = 'overlays/next-dashboard'

// Where Oriel lives: examples/oriel at the repository root.
export const defaultSources = [path.resolve(root, '../../examples/oriel')]

const skipNames = [
  /^(?:node_modules|\.next|dist|out|coverage|\.vercel|\.turbo)$/,
  /^next-env\.d\.ts$/,
  /\.tsbuildinfo$/,
  /^(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|npm-shrinkwrap\.json)$/,
  /^\.env/,
  /^(?:README|AGENTS|CLAUDE)\.md$/i,
  /^vercel\.json$/,
  /^\.DS_Store$/,
  / [23](?:\.|$)/,
  /^\.gitignore$/,
  /^demo-only$/,
]
const textFile = /\.(?:[cm]?[jt]sx?|css|json|md|svg|html|txt|ya?ml)$/i
// None of these may survive into the template.
export const FORBIDDEN = ['@demo-only', 'source-bar', 'demo-bar', 'DemoBar', 'View this screen', 'A demo app', 'a demo app', 'github.com/idyeah-studio/diya/blob', 'oriel.diya13.ai', 'pnpm-workspace.yaml']
const DEMO_CLASSES = ['source-bar', 'demo-bar']

function walk(dir, rel = "", skip = true) {
  const files = []
  for (const name of readdirSync(path.join(dir, rel)).sort()) {
    if (skip && skipNames.some((re) => re.test(name))) continue
    const child = rel ? `${rel}/${name}` : name
    const stat = lstatSync(path.join(dir, child))
    if (stat.isSymbolicLink()) throw new Error(`Oriel has a symlink, which the template can't carry: ${child}`)
    if (stat.isDirectory()) files.push(...walk(dir, child, skip))
    else files.push(child)
  }
  return files
}

/** Marker-based removal. Returns null when the whole file is demo-only. */
export function stripMarkers(text) {
  const lines = text.split('\n')
  if (lines.slice(0, 5).some((l) => l.includes('@demo-only file'))) return null
  const kept = []
  let skipping = false
  for (const line of lines) {
    if (line.includes('@demo-only start')) skipping = true
    else if (line.includes('@demo-only end')) skipping = false
    else if (!skipping && !line.includes('@demo-only')) kept.push(line)
  }
  if (skipping) throw new Error('An @demo-only start has no matching @demo-only end.')
  return kept.join('\n')
}

// Index of the '>' that ends the opening tag starting at `from` (a '<'), skipping {…} and quotes.
function openTagEnd(text, from) {
  let braces = 0
  let quote = null
  for (let j = from + 1; j < text.length; j++) {
    const c = text[j]
    if (quote) {
      if (c === quote) quote = null
    } else if (c === '"' || c === "'" || c === '`') quote = c
    else if (c === '{') braces++
    else if (c === '}') braces--
    else if (c === '>' && braces === 0) return j
  }
  throw new Error('A JSX tag in Oriel never closes.')
}

/** Removes each JSX element with a demo class or <DemoBar>, which must sit on lines of its own. */
export function stripDemoElements(text) {
  let changed = false
  for (;;) {
    const marker = text.search(/className="(?:source-bar|demo-bar)"|<DemoBar\b/)
    if (marker < 0) break
    let start = marker
    while (start >= 0 && !(text[start] === '<' && /[A-Za-z]/.test(text[start + 1] ?? ''))) start--
    if (start < 0) throw new Error('Found a demo class outside a JSX tag.')
    const tag = /^<([A-Za-z][\w.]*)/.exec(text.slice(start))[1]
    const esc = tag.replace(/\./g, '\\.')
    const openEnd = openTagEnd(text, start)
    let end
    if (text[openEnd - 1] === '/') end = openEnd + 1
    else {
      let depth = 1
      const re = new RegExp(`<${esc}(?=[\\s>/])|</${esc}>`, 'g')
      re.lastIndex = openEnd + 1
      for (let m = re.exec(text); m; m = re.exec(text)) {
        if (m[0].startsWith('</')) {
          if (--depth === 0) {
            end = m.index + m[0].length
            break
          }
        } else {
          const nestedEnd = openTagEnd(text, m.index)
          if (text[nestedEnd - 1] !== '/') depth++
          re.lastIndex = nestedEnd + 1
        }
      }
      if (end === undefined) throw new Error(`The demo bar's <${tag}> never closes.`)
    }
    const lineStart = text.lastIndexOf('\n', start - 1) + 1
    const nl = text.indexOf('\n', end)
    const lineEnd = nl < 0 ? text.length : nl + 1
    if (text.slice(lineStart, start).trim() || text.slice(end, lineEnd).trim())
      throw new Error('The demo bar shares a line with other code. Give it lines of its own, or mark it @demo-only.')
    text = text.slice(0, lineStart) + text.slice(lineEnd)
    changed = true
  }
  return { text, changed }
}

const DEMO_FILE = /^DemoBar\.[jt]sx?$/

/** Names a file imports with `import { … }`. */
export function importedNames(text) {
  const names = []
  for (const [, list] of text.matchAll(/^import\s+(?:type\s+)?\{([^}]*)\}\s+from/gm))
    for (const n of list.split(',')) if (n.trim()) names.push(n.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop())
  return names
}

/**
 * Removes exports that only a dropped demo file used, such as Oriel's CodeIcon:
 * an `export const X = … => (` block closed by a `)` at the start of a line, or an
 * `export function X(` block closed by a `}` there.
 */
export function pruneDeadExports(files, names) {
  const sources = [...files].filter(([rel]) => /\.[jt]sx?$/.test(rel))
  for (const name of names) {
    const users = sources.filter(([, buf]) => new RegExp(`\\b${name}\\b`).test(buf.toString('utf8')))
    if (users.length !== 1) continue
    const [rel, buf] = users[0]
    const text = buf.toString('utf8')
    const block = new RegExp(`^export (?:const ${name} = [^\\n]*\\n[\\s\\S]*?^\\)\\n|function ${name}\\b[^\\n]*\\n[\\s\\S]*?^\\}\\n)`, 'm')
    const match = block.exec(text)
    if (!match) continue
    const rest = text.replace(match[0], '')
    if (new RegExp(`\\b${name}\\b`).test(rest)) continue
    files.set(rel, Buffer.from(rest))
  }
}

/** The live demo's metadata names its own domain; a fresh app gets plain metadata. */
export function plainMetadata(text) {
  const block = /^export const metadata: Metadata = \{\n[\s\S]*?^\}\n/m
  if (!block.test(text)) throw new Error("app/layout.tsx has no metadata block for the template to replace.")
  // When the app names itself through lib/brand.tsx, the fresh app keeps that one constant.
  const branded = /^import \{[^}]*\bBRAND\b[^}]*\} from '@\/lib\/brand'$/m.test(text)
  const title = branded ? "{ default: BRAND.name, template: `%s · ${BRAND.name}` }" : "{ default: 'Oriel', template: '%s · Oriel' }"
  return text.replace(
    block,
    () => `export const metadata: Metadata = {\n  title: ${title},\n  description: 'A small invoicing app, made with DIYA.',\n}\n`,
  )
}

/** Drops named imports and top-level string constants that nothing uses any more. */
export function pruneUnused(text) {
  const used = (name, without) => new RegExp(`\\b${name}\\b`).test(text.replace(without, ''))
  text = text.replace(/^import\s+(type\s+)?\{([^}]*)\}\s+from\s+(['"][^'"]+['"])\n?/gm, (statement, typeOnly, names, from) => {
    const keep = names
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .filter((n) => used(n.replace(/^type\s+/, '').split(/\s+as\s+/).pop(), statement))
    if (!keep.length) return ''
    const list = keep.join(', ')
    return `import ${typeOnly ?? ''}{ ${list} } from ${from}\n`
  })
  text = text.replace(/^const ([A-Z_][A-Z0-9_]*) = (['"`])[^'"`\n]*\2\n\n?/gm, (line, name) => (used(name, line) ? line : ''))
  // Per-screen source paths, kept only for the bar's links.
  if (!/\.file\b|\{[^}]*\bfile\b[^}]*\}\s*=/.test(text)) text = text.replace(/,\s*file:\s*'[^']*'/g, '')
  return text
}

/** Removes CSS rules whose selectors name a demo class, and @media blocks left empty. */
export function stripDemoCss(css) {
  const out = []
  let i = 0
  const pushUntil = (j) => {
    out.push(css.slice(i, j))
    i = j
  }
  const blockEnd = (from) => {
    let depth = 0
    for (let j = from; j < css.length; j++) {
      if (css.startsWith('/*', j)) j = css.indexOf('*/', j + 2) + 1
      else if (css[j] === '{') depth++
      else if (css[j] === '}' && --depth === 0) return j + 1
    }
    throw new Error('Unbalanced braces in Oriel CSS.')
  }
  while (i < css.length) {
    const brace = css.indexOf('{', i)
    if (brace < 0) break
    // The selector runs from the end of the previous rule or comment.
    let selStart = Math.max(css.lastIndexOf('}', brace), css.lastIndexOf('*/', brace) + 1, css.lastIndexOf(';', brace)) + 1
    if (selStart <= i) selStart = i
    const selector = css.slice(selStart, brace)
    const end = blockEnd(brace)
    if (/^\s*@media/.test(selector)) {
      const inner = stripDemoCss(css.slice(brace + 1, end - 1))
      if (inner.trim()) {
        pushUntil(selStart)
        out.push(`${selector}{${inner}}`)
        i = end
      } else {
        // Drop the emptied block from the start of its line through its newline.
        pushUntil(Math.max(css.lastIndexOf('\n', selStart + selector.search(/\S/)) + 1, i))
        i = skipLineEnd(css, end, out)
      }
      continue
    }
    if (DEMO_CLASSES.some((c) => new RegExp(`\\.${c}\\b`).test(selector))) {
      // Remove from the start of the rule's line through its closing brace and newline.
      const lineStart = css.lastIndexOf('\n', selStart + selector.search(/\S/)) + 1
      pushUntil(Math.max(lineStart, i))
      i = end
      i = skipLineEnd(css, i, out)
      continue
    }
    pushUntil(end)
  }
  out.push(css.slice(i))
  return out.join('')
}

function skipLineEnd(css, i, out) {
  const nl = css.indexOf('\n', i)
  if (nl >= 0 && css.slice(i, nl).trim() === '') return nl + 1
  return i
}

const devFlags = /\s+(?:--hostname|--port|-H|-p)\s+\S+/g

export function rewritePackage(text, version) {
  const pkg = JSON.parse(text)
  const next = { name: 'my-app', version: '0.1.0', private: true, ...pkg }
  next.name = 'my-app'
  next.version = '0.1.0'
  next.private = true
  for (const [key, command] of Object.entries(next.scripts ?? {})) next.scripts[key] = command.replace(devFlags, '')
  if (!next.dependencies?.['@idyeah/diya']) throw new Error("Oriel's package.json doesn't depend on @idyeah/diya.")
  next.dependencies['@idyeah/diya'] = `^${version}`
  return `${JSON.stringify(next, null, 2)}\n`
}

/** Builds the template's files in memory: a Map of relative path to Buffer. */
export function buildTemplate(from, { version = self.version, overlay = path.join(root, OVERLAY) } = {}) {
  if (!existsSync(path.join(from, 'package.json'))) throw new Error(`No Oriel app at ${from}`)
  const files = new Map()
  const dropped = new Set()
  for (const rel of walk(from)) {
    const raw = readFileSync(path.join(from, rel))
    if (!textFile.test(rel)) {
      files.set(rel, raw)
      continue
    }
    let text = stripMarkers(raw.toString('utf8'))
    // A whole file for the demo: marked, or Oriel's DemoBar component.
    if (text === null || DEMO_FILE.test(path.posix.basename(rel))) {
      for (const name of importedNames(raw.toString('utf8'))) dropped.add(name)
      continue
    }
    if (rel === 'app/layout.tsx') text = plainMetadata(text)
    // Page titles that call the app a demo ("Oriel · a demo app made with DIYA").
    text = text.replace(/ · a demo app made with DIYA/g, '')
    if (rel === 'package.json') text = rewritePackage(text, version)
    else if (/\.[jt]sx$/.test(rel)) {
      const result = stripDemoElements(text)
      text = result.changed ? pruneUnused(result.text) : result.text
    } else if (/\.css$/.test(rel)) text = stripDemoCss(text)
    // A marker line that also closed a comment would leave the comment open and
    // swallow the CSS after it; refuse rather than write a quietly broken file.
    if (/\.(?:css|[cm]?[jt]sx?)$/.test(rel) && text.split('/*').length !== text.split('*/').length)
      throw new Error(`Stripping @demo-only lines left a comment open in ${rel}; end the comment on a line of its own.`)
    files.set(rel, Buffer.from(text))
  }
  pruneDeadExports(files, dropped)
  for (const rel of walk(overlay, "", false)) files.set(rel, readFileSync(path.join(overlay, rel)))
  for (const name of ['_gitignore', '_agents.md', 'README.md'])
    if (!files.has(name)) throw new Error(`The overlay is missing ${name}.`)
  const problems = []
  for (const [rel, buf] of files) {
    if (rel.startsWith('_') || rel === 'README.md' || !textFile.test(rel)) continue
    const text = buf.toString('utf8')
    for (const word of FORBIDDEN) if (text.includes(word)) problems.push(`${rel} still has "${word}"`)
  }
  const providers = files.get('app/providers.tsx')?.toString('utf8') ?? ''
  if (!providers.includes("brandColor: ''") && !providers.includes('const brandColor: string | undefined = undefined'))
    problems.push("app/providers.tsx has no brand line for --brand to fill (brandColor: '' or const brandColor: string | undefined = undefined)")
  if (problems.length) throw new Error(`The Oriel copy isn't clean:\n  ${problems.join('\n  ')}`)
  return files
}

function readTree(dir) {
  const files = new Map()
  if (!existsSync(dir)) return files
  const each = (rel) => {
    for (const name of readdirSync(path.join(dir, rel)).sort()) {
      const child = rel ? `${rel}/${name}` : name
      if (lstatSync(path.join(dir, child)).isDirectory()) each(child)
      else files.set(child, readFileSync(path.join(dir, child)))
    }
  }
  each('')
  return files
}

export function diffTrees(want, have) {
  const problems = []
  for (const [rel, buf] of want) if (!have.has(rel)) problems.push(`missing ${rel}`)
    else if (!have.get(rel).equals(buf)) problems.push(`differs ${rel}`)
  for (const rel of have.keys()) if (!want.has(rel)) problems.push(`extra ${rel}`)
  return problems
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { from: { type: 'string' }, check: { type: 'boolean' } } })
  const from = values.from ? path.resolve(values.from) : defaultSources.find((p) => existsSync(path.join(p, 'package.json')))
  const target = path.join(root, TEMPLATE)
  try {
    if (!from) throw new Error(`No Oriel app found. Looked in:\n  ${defaultSources.join('\n  ')}\nPass --from <folder>.`)
    const files = buildTemplate(from)
    if (values.check) {
      const problems = diffTrees(files, readTree(target))
      if (problems.length) {
        console.error(`${TEMPLATE} is out of date with ${path.relative(process.cwd(), from) || from}:\n  ${problems.join('\n  ')}`)
        console.error('Run node scripts/sync-oriel.mjs and commit the result.')
        process.exitCode = 1
      } else console.log(`${TEMPLATE} matches Oriel (${files.size} files).`)
    } else {
      rmSync(target, { recursive: true, force: true })
      for (const [rel, buf] of files) {
        mkdirSync(path.dirname(path.join(target, rel)), { recursive: true })
        writeFileSync(path.join(target, rel), buf)
      }
      console.log(`Wrote ${TEMPLATE} from ${from} (${files.size} files).`)
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

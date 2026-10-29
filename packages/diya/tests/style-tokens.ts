// Which public tokens an item's styles reach, read from styles.css and the item's source.
// Used by api-map.test.ts to check the hand-written token lists in api-meta.mjs.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

type Rule = { selector: string; body: string; classes: string[] }
const rootClasses = new Set(['diya-root', 'diya-portal-root'])

export function parseRules(css: string): Rule[] {
  const rules: Rule[] = []
  const stack: string[] = []
  let buffer = ''
  for (const char of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (char === '{') { stack.push(buffer.trim()); buffer = ''; continue }
    if (char !== '}') { buffer += char; continue }
    const selector = stack.pop() ?? ''
    if (!selector.startsWith('@')) rules.push({ selector, body: buffer, classes: [...selector.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(match => match[1]) })
    buffer = ''
  }
  return rules
}

const declarations = (body: string) => body.split(';').map(part => part.trim()).filter(Boolean).map(part => {
  const colon = part.indexOf(':')
  return { name: part.slice(0, colon).trim(), value: part.slice(colon + 1) }
})
const references = (value: string) => [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map(match => match[1])

// The source file behind each export of the two entries, plus the DIYA modules it imports.
export function exportSources(root: string) {
  const sources = new Map<string, string>()
  for (const entry of ['src/index.ts', 'src/data-viz/index.ts']) {
    const text = readFileSync(join(root, entry), 'utf8')
    for (const match of text.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'([^']+)\.js'/g)) {
      for (const name of match[1].split(',').map(part => part.trim()).filter(part => /^[A-Z]/.test(part))) {
        sources.set(name, resolveSource(join(root, dirname(entry)), match[2]))
      }
    }
  }
  return sources
}

function resolveSource(from: string, path: string) {
  const base = resolve(from, path)
  return [`${base}.tsx`, `${base}.ts`].find(existsSync) ?? base
}

function sourceText(file: string, seen = new Set<string>()): string {
  if (seen.has(file) || !existsSync(file)) return ''
  seen.add(file)
  const text = readFileSync(file, 'utf8')
  const imports = [...text.matchAll(/from '(\.\.?\/[^']+)\.js'/g)].map(match => match[1])
    .filter(path => !/(^|[/-])messages$|DiyaProvider$/.test(path))
  return [text, ...imports.map(path => sourceText(resolveSource(dirname(file), path), seen))].join('\n')
}

/** Public tokens reached by the styles of the given source files; the provider reads the root rules. */
export function styleTokens(css: string, files: string[], publicTokens: Set<string>, provider = false) {
  const rules = parseRules(css)
  const rootish = rules.filter(rule => rule.classes.every(name => rootClasses.has(name)))
  const text = files.map(file => sourceText(file)).join('\n')
  const classes = new Set(rules.flatMap(rule => rule.classes).filter(name => !rootClasses.has(name)))
  const used = new Set([...classes].filter(name => new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(text)))
  for (const prefix of text.matchAll(/([a-z][\w-]*-)\$\{/g)) for (const name of classes) if (name.startsWith(prefix[1])) used.add(name)
  const matched = provider ? [] : rules.filter(rule => rule.classes.some(name => used.has(name)))

  const definitions = new Map<string, string[]>()
  for (const rule of [...rootish, ...matched]) for (const { name, value } of declarations(rule.body)) {
    if (name.startsWith('--')) definitions.set(name, [...(definitions.get(name) ?? []), value])
  }
  const found = new Set<string>()
  const queue = provider
    ? rootish.flatMap(rule => declarations(rule.body).filter(({ name }) => !name.startsWith('--')).flatMap(({ value }) => references(value)))
    : matched.flatMap(rule => references(rule.body))
  const visited = new Set<string>()
  while (queue.length) {
    const name = queue.pop()!
    if (visited.has(name)) continue
    visited.add(name)
    if (publicTokens.has(name)) found.add(name)
    else for (const value of definitions.get(name) ?? []) queue.push(...references(value))
  }
  return [...found].sort()
}

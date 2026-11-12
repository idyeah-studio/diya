// The checks tests/screens-contract.test.ts runs on each screen file, shared
// with tests/screens-ui.test.tsx (the site's own Screens CSS follows the same
// 13px floor).

/** Every module a file imports or re-exports from, in order. */
export function importSources(source: string) {
  return [...source.matchAll(/^\s*(?:import|export)\b[^'"`;]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm)].map(
    ([, from, bare]) => from ?? bare
  )
}

/** The text of the file's `const css = `…`` block, or null. */
export function cssBlock(source: string) {
  return /\nconst css = `([\s\S]*?)`\s*$/.exec(source)?.[1] ?? null
}

/** font-size values (and font shorthands) that resolve under 13px, in px, rem or em (at 16px). */
export function smallFontSizes(css: string) {
  const found: string[] = []
  for (const [, value] of css.matchAll(/(?:font-size|font)\s*:\s*([^;}]+)/g)) {
    for (const [size, number, unit] of value.matchAll(/(\d*\.?\d+)(px|rem|em)\b/g)) {
      const px = Number(number) * (unit === 'px' ? 1 : 16)
      if (px < 13) found.push(size)
    }
  }
  return found
}

/** Class names a stylesheet defines, ignoring urls, strings and numbers. */
export function cssClasses(css: string) {
  const bare = css.replace(/url\([^)]*\)/g, '').replace(/(['"])(?:\\.|(?!\1).)*\1/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  return [...new Set([...bare.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)].map(([, name]) => name))]
}

/** Static class names in className="…", className={'…'} and className={`…`} (template holes skipped). */
export function jsxClasses(source: string) {
  const values = [...source.matchAll(/className=(?:"([^"]*)"|\{'([^']*)'\}|\{`([^`]*)`\})/g)].map(([, a, b, c]) => a ?? b ?? c ?? '')
  return values.flatMap((value) => value.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)).filter(Boolean)
}

/** Lowercase (native) JSX elements with a title attribute. */
export function nativeTitles(source: string) {
  return [...source.matchAll(/<([a-z][\w-]*)\b(?:[^<>]|=>)*?\stitle=/g)].map(([match]) => match)
}

/**
 * Toast state a screen keeps itself: a `<Toast>` element, `Toast` imported from
 * @idyeah/diya, or state named for a toast or notice. Screens call `toast()`.
 */
export function toastState(source: string) {
  const found = [...source.matchAll(/<Toast\b/g)].map(([match]) => match)
  for (const [, names] of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]@idyeah\/diya['"]/g))
    if (names.split(',').some((name) => name.trim() === 'Toast')) found.push('import { Toast }')
  for (const [match] of source.matchAll(/\bconst\s*\[\s*\w+\s*,\s*set(?:Toast|Toasts|Notice|Notices)\s*\]/g)) found.push(match)
  return found
}

/** The source between the brackets that open at `open` (strings, templates and comments skipped). */
function bracketed(source: string, open: number) {
  const closing: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
  const stack: string[] = []
  for (let i = open; i < source.length; i++) {
    const char = source[i]
    if (char === '/' && source[i + 1] === '/') i = source.indexOf('\n', i)
    else if (char === '/' && source[i + 1] === '*') i = source.indexOf('*/', i) + 1
    else if (char === "'" || char === '"') {
      for (i++; source[i] !== char; i++) if (source[i] === '\\') i++
    } else if (char === '`') {
      // Template holes may hold brackets of their own; skip the whole literal.
      let depth = 0
      for (i++; i < source.length; i++) {
        if (source[i] === '\\') i++
        else if (depth === 0 && source[i] === '`') break
        else if (source[i] === '$' && source[i + 1] === '{') { depth++; i++ }
        else if (depth > 0 && source[i] === '{') depth++
        else if (depth > 0 && source[i] === '}') depth--
      }
    } else if (char in closing) stack.push(closing[char])
    else if (char === stack.at(-1)) {
      stack.pop()
      if (!stack.length) return source.slice(open, i + 1)
    }
    if (i < 0) break
  }
  return source.slice(open)
}

/**
 * `toast()` calls inside an effect. In development StrictMode runs every effect
 * twice, so a toast fired from one shows twice; screens toast from handlers.
 * `toast.dismiss()` is allowed in an effect's cleanup, so a toast that only
 * makes sense on the Screen leaves with it (SITE-FE-01).
 */
export function toastsInEffects(source: string) {
  const found: string[] = []
  for (const match of source.matchAll(/\buse(?:Layout)?Effect\s*\(/g)) {
    const body = bracketed(source, match.index + match[0].length - 1)
    // Where the cleanup starts: `() => () => …`, or `return () => …` / `return function`.
    const nested = /^\(\s*\(\s*\)\s*=>\s*(?=\(\s*\)\s*=>)/.exec(body)
    const returned = /\breturn\s+(?:\([^()]*\)\s*=>|function\b)/.exec(body)
    const cleanup = nested ? nested[0].length : returned ? returned.index : body.length
    for (const call of body.matchAll(/\btoast(\.dismiss)?\s*\(/g)) {
      if (call[1] && call.index >= cleanup) continue
      found.push(`${match[0]}… ${call[0]}`)
    }
  }
  return found
}

/** The literal start of every id a screen gives `toast()`, written inline or as a `const id` it passes. */
export function toastIds(source: string) {
  const ids: string[] = []
  const lead = (literal: string) => literal.replace(/^['"`]/, '').split(/\$\{|['"`]/)[0]
  for (const match of source.matchAll(/\btoast\s*\(/g)) {
    const call = bracketed(source, match.index + match[0].length - 1)
    const inline = /\bid\s*:\s*(['"`][^'"`]*)/.exec(call)
    if (inline) ids.push(lead(inline[1]))
    else if (/(?:^|[^$])[{,]\s*id\s*[,}]/.test(call)) {
      const named = [...source.slice(0, match.index).matchAll(/\bconst id\s*=\s*(['"`][^'"`]*)/g)].at(-1)
      ids.push(named ? lead(named[1]) : '(unknown)')
    }
  }
  return ids
}

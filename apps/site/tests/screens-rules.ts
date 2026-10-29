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

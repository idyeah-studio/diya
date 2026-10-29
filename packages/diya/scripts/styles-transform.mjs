// Turns src/styles.css into the shipped dist/styles.css:
//   1. every rule written for [data-theme='light'] or [data-theme='dark'] gets a twin for
//      [data-theme='system'] inside the matching prefers-color-scheme query, right after it,
//      so theme="system" follows the OS in pure CSS with the same cascade order;
//   2. the whole sheet goes inside `@layer diya`, so unlayered app CSS and Tailwind's
//      components and utilities layers win over DIYA's rules.

const THEME = /\[data-theme=(['"])(light|dark)\1\]/

/** Splits on commas outside parentheses and brackets. */
export function splitSelectors(selector) {
  const out = ['']
  let depth = 0
  for (const char of selector) {
    if (char === ',' && depth === 0) { out.push(''); continue }
    if (char === '(' || char === '[') depth++
    if (char === ')' || char === ']') depth--
    out[out.length - 1] += char
  }
  return out.map(part => part.trim()).filter(Boolean)
}

/** The system twins for one rule, or '' when the rule doesn't depend on the theme. */
function systemTwins(selector, body, indent) {
  let twins = ''
  for (const scheme of ['light', 'dark']) {
    const parts = splitSelectors(selector)
      .filter(part => THEME.exec(part)?.[2] === scheme)
      .map(part => part.replace(THEME, "[data-theme='system']"))
    if (parts.length) twins += `\n${indent}@media (prefers-color-scheme: ${scheme}) {\n${indent}  ${parts.join(`,\n${indent}  `)} {${body}}\n${indent}}`
  }
  return twins
}

/** Adds the [data-theme='system'] twins. Comments and strings are skipped; nothing else moves. */
export function addSystemTheme(css) {
  const inserts = []
  const stack = []
  let boundary = 0
  for (let i = 0; i < css.length; i++) {
    const char = css[i]
    if (char === '/' && css[i + 1] === '*') { i = css.indexOf('*/', i + 2) + 1; if (i === 0) break; continue }
    if (char === '"' || char === "'") {
      for (i++; i < css.length && css[i] !== char; i++) if (css[i] === '\\') i++
      continue
    }
    if (char === ';') { boundary = i + 1; continue }
    if (char === '{') {
      const prelude = css.slice(boundary, i).replace(/\/\*[\s\S]*?\*\//g, '').trim()
      stack.push({ prelude, open: i, start: boundary })
      boundary = i + 1
      continue
    }
    if (char === '}') {
      const frame = stack.pop()
      boundary = i + 1
      if (!frame || frame.prelude.startsWith('@')) continue
      if (stack.some(parent => /^@(-\w+-)?(keyframes|font-face)/.test(parent.prelude))) continue
      if (!THEME.test(frame.prelude)) continue
      const line = css.lastIndexOf('\n', frame.open)
      const indent = /^[ \t]*/.exec(css.slice(line + 1))[0]
      inserts.push([i + 1, systemTwins(frame.prelude, css.slice(frame.open + 1, i), indent)])
    }
  }
  let out = ''
  let from = 0
  for (const [at, text] of inserts) { out += css.slice(from, at) + text; from = at }
  return out + css.slice(from)
}

export function buildStyles(css) {
  return `/* @idyeah/diya. Every rule is in the "diya" cascade layer, so your own CSS wins.
   With Tailwind v4, order the layers once: @layer theme, base, diya, components, utilities; */
@layer diya {
${addSystemTheme(css)}
}
`
}

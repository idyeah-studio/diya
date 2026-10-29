// Locks text-on-surface contrast for the status families (WCAG 1.4.3, 4.5:1 at
// 13px) from the public token values in styles.css, in both themes, on DIYA's
// own solid grounds and its Glass material laid over them, and on hovered and
// selected Table rows.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function block(selector: string) {
  const start = css.indexOf(`\n${selector} {`)
  if (start < 0) throw new Error(`missing ${selector}`)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/(--diya-[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]))
}
const dark = block('.diya-root')
const themes = { dark, light: { ...dark, ...block(".diya-root[data-theme='light']") } }

type RGBA = [number, number, number, number]
/** Splits on commas outside parentheses. */
const args = (text: string) => {
  const out = ['']
  let depth = 0
  for (const char of text) {
    if (char === ',' && depth === 0) { out.push(''); continue }
    if (char === '(') depth++
    if (char === ')') depth--
    out[out.length - 1] += char
  }
  return out.map((part) => part.trim())
}
function parse(value: string, tokens: Record<string, string>): RGBA {
  value = value.trim()
  if (value === 'transparent') return [0, 0, 0, 0]
  const ref = value.match(/^var\((--[\w-]+)\)$/)
  if (ref) return parse(tokens[ref[1]], tokens)
  const mix = value.match(/^color-mix\(in srgb,(.+)\)$/)
  if (mix) {
    // color-mix(in srgb, A p%, B): premultiplied interpolation, as CSS Color 5 specifies.
    const [first, second] = args(mix[1])
    const weight = first.match(/^(.+?)\s+(\d+(?:\.\d+)?)%$/)
    if (!weight) throw new Error(`unsupported mix ${value}`)
    const p = Number(weight[2]) / 100
    const [a, b] = [parse(weight[1], tokens), parse(second, tokens)]
    const alpha = a[3] * p + b[3] * (1 - p)
    if (alpha === 0) return [0, 0, 0, 0]
    const channel = (i: number) => (a[i] * a[3] * p + b[i] * b[3] * (1 - p)) / alpha
    return [channel(0), channel(1), channel(2), alpha]
  }
  const hex = value.match(/^#([0-9a-f]{3,8})$/i)
  if (!hex) throw new Error(`unsupported color ${value}`)
  const h = hex[1].length <= 4 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
  return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1]
}
/** The last value of `property` declared in rules with exactly this selector. */
function declared(selector: string, property: string) {
  let value: string | undefined
  for (const match of css.matchAll(/(^|\n)([^{}\n]+)\{([^{}]*)\}/g)) {
    if (match[2].trim() !== selector) continue
    const found = match[3].match(new RegExp(`${property}:\\s*([^;]+);`))
    if (found) value = found[1]
  }
  if (!value) throw new Error(`missing ${property} on ${selector}`)
  return value
}
const selectedWeight = {
  dark: declared('.diya-root .diya-table', '--diya-internal-table-selected-weight'),
  light: declared(".diya-root[data-theme='light'] .diya-table", '--diya-internal-table-selected-weight'),
}
// Status tags on a selected row paint their tint over the table surface, not over the row's selection tint.
const anchoredTags = /tr\[data-selected\] \.diya-tag:is\([^)]*\)\s*\{\s*background:linear-gradient\(var\(--diya-internal-tag-surface\), var\(--diya-internal-tag-surface\)\), var\(--diya-internal-table-surface\);/.test(css)
const tableHover = {
  dark: declared('.diya-root .diya-table', '--diya-internal-table-hover'),
  light: declared(".diya-root[data-theme='light'] .diya-table", '--diya-internal-table-hover'),
}
/** Paints `top` over an opaque `bottom`. */
const over = ([r, g, b, a]: RGBA, [R, G, B]: RGBA): RGBA => [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a), 1]
const mixIn = (color: RGBA, percent: number, ground: RGBA) => over([color[0], color[1], color[2], percent / 100], ground)
const channel = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const luminance = ([r, g, b]: RGBA) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const contrast = (text: RGBA, ground: RGBA) => {
  const [a, b] = [luminance(over(text, ground)), luminance(ground)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

const statuses = ['success', 'warning', 'error', 'info'] as const

describe.each(Object.entries(themes))('%s status contrast', (theme, tokens) => {
  const color = (name: string) => parse(tokens[`--diya-color-${name}`], tokens)
  const solid = { surface: color('surface'), raised: color('raised'), recessed: color('recessed') }
  // Glass: DIYA's translucent material (raised at 72%, as fields, popups and tables use it) on each solid ground.
  const grounds = {
    ...solid,
    ...Object.fromEntries(Object.entries(solid).map(([name, ground]) => [`glass on ${name}`, mixIn(solid.raised, 72, ground)])),
  }
  const cases: [string, RGBA, RGBA][] = []
  for (const [groundName, ground] of Object.entries(grounds)) {
    for (const status of statuses) {
      // Tag: the tone on its own -surface; metric changes and field messages: the tone on the ground.
      cases.push([`${status} tag on ${groundName}`, color(status), over(color(`${status}-surface`), ground)])
      cases.push([`${status} text on ${groundName}`, color(status), ground])
      // Alert: tinted with the fill (7% solid, 8% over the glass token), titled in text, described in muted,
      // acting in the tone (dark Glass actions use the text color; the tone is the stricter check).
      const tint = status === 'warning' && theme === 'dark' ? color('warning-fill') : color(`${status}-fill`)
      const alert = groundName.startsWith('glass') ? mixIn(tint, 8, over(color('glass'), ground)) : mixIn(tint, 7, ground)
      cases.push([`${status} alert title on ${groundName}`, color('text'), alert])
      cases.push([`${status} alert description on ${groundName}`, color('muted'), alert])
      cases.push([`${status} alert action on ${groundName}`, color(status), alert])
    }
    cases.push([`neutral tag on ${groundName}`, color('text'), over(color('selected'), ground)])
  }
  // A hovered Table row: the row's hover fill over the table's raised surface.
  const tableTokens = { ...tokens, '--diya-internal-table-surface': 'var(--diya-color-raised)' }
  const hovered = over(parse(tableHover[theme as 'dark' | 'light'], tableTokens), solid.raised)
  for (const status of statuses) cases.push([`${status} tag on a hovered table row`, color(status), over(color(`${status}-surface`), hovered)])
  cases.push(['neutral tag on a hovered table row', color('text'), over(color('selected'), hovered)])
  cases.push(['muted text on a hovered table row', color('muted'), hovered])
  // Selected rows: a text tint at the selected weight (sticky tables add 2%).
  const weight = parseFloat(selectedWeight[theme as 'dark' | 'light'])
  for (const [kind, percent] of [['selected', weight], ['sticky selected', weight + 2]] as const) {
    const selected = mixIn(color('text'), percent, solid.raised)
    const tagGround = (status: string) => over(color(`${status}-surface`), anchoredTags ? solid.raised : selected)
    for (const status of statuses) cases.push([`${status} tag on a ${kind} table row`, color(status), tagGround(status)])
    cases.push([`neutral tag on a ${kind} table row`, color('text'), over(color('selected'), selected)])
    cases.push([`muted text on a ${kind} table row`, color('muted'), selected])
    cases.push([`text on a ${kind} table row`, color('text'), selected])
  }
  it('keeps resting, hovered and selected table rows apart', () => {
    const selected = mixIn(color('text'), weight, solid.raised)
    const [rest, hover, pick] = [solid.raised, hovered, selected].map(luminance)
    expect(Math.abs(pick - rest)).toBeGreaterThan(0.01)
    expect(Math.abs(pick - hover)).toBeGreaterThan(0.01)
  })
  // The hover stays visible: at least a small luminance step from the resting row.
  it('keeps the hovered table row distinct from the resting row', () => {
    expect(Math.abs(luminance(hovered) - luminance(solid.raised))).toBeGreaterThan(0.005)
  })

  // Badges carry their own opaque fill.
  for (const status of ['neutral', ...statuses]) cases.push([`${status} badge`, color(`${status}-on-fill`), color(`${status}-fill`)])

  it.each(cases)('%s reaches 4.5:1', (_name, text, ground) => {
    expect(contrast(text, ground)).toBeGreaterThanOrEqual(4.5)
  })
})

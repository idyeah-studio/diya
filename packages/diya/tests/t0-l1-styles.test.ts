// The shipped stylesheet: one cascade layer, theme="system" twins, scoped resets, neutral grays
// and accent defaults that match the provider's own computation.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { addSystemTheme, buildStyles } from '../scripts/styles-transform.mjs'
import { BRAND_GROUNDS, contrast, DIYA_DEFAULT_BRAND, resolveBrand } from '../dist/internal/brand.js'

const source = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
const dist = readFileSync(resolve(process.cwd(), 'dist/styles.css'), 'utf8')
const bare = source.replace(/\/\*[\s\S]*?\*\//g, '')

function block(selector: string) {
  const start = bare.indexOf(`\n${selector} {`)
  const body = bare.slice(bare.indexOf('{', start) + 1, bare.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/(--diya-[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]))
}
const fallback = (value: string) => value.replace(/^var\(--diya-internal-[\w-]+, (.+)\)$/, '$1')
const dark = block('.diya-root')
const light = { ...dark, ...block(".diya-root[data-theme='light']") }

describe('dist/styles.css', () => {
  it('is the source inside @layer diya', () => {
    expect(dist).toBe(buildStyles(source))
    expect(dist).toMatch(/^\/\*[\s\S]*?\*\/\n@layer diya \{\n/)
    expect(dist.trimEnd().endsWith('}')).toBe(true)
    // One assertion for the whole walk: per-character expects made this the slowest SDK test on CI.
    let depth = 0
    let lowest = 0
    for (const char of dist.replace(/\/\*[\s\S]*?\*\//g, '').replace(/'[^']*'/g, '')) { if (char === '{') depth++; if (char === '}') depth--; lowest = Math.min(lowest, depth) }
    expect(lowest).toBe(0)
    expect(depth).toBe(0)
  })

  it('gives every Light or Dark rule a system twin in the matching scheme query', () => {
    const themed = [...bare.matchAll(/([^{}]*\[data-theme='(light|dark)'\][^{}]*)\{/g)]
    expect(themed.length).toBeGreaterThan(5)
    const out = addSystemTheme(source)
    expect(out.match(/\[data-theme='system'\]/g)!.length).toBe(themed.reduce((n, [selector]) => n + selector.split(',').filter(part => /\[data-theme='(light|dark)'\]/.test(part)).length, 0))
    expect(out).toContain("@media (prefers-color-scheme: light) {\n  .diya-root[data-theme='system'] {")
    // Strings and comments pass through untouched.
    expect(addSystemTheme("/* [data-theme='light'] { */ .a { content: '}' }")).toBe("/* [data-theme='light'] { */ .a { content: '}' }")
  })
})

describe('resets', () => {
  it('never style bare elements under the provider', () => {
    // Element rules reach DIYA's own elements only, at zero specificity.
    expect(bare).not.toMatch(/\n\.diya-root :where\((button|a|p|h1|svg|small)/)
    expect(bare).toContain(":where(.diya-root [class*='diya-']:not(.diya-root, .diya-portal-root)) :where(p)")
    expect(bare).not.toMatch(/\.diya-root \*\s*[,{]/)
  })
})

describe('tokens', () => {
  // The grays keep DIYA's own cool-fresh tint; only the dark colour (the default accent) is neutral.
  it('keeps the default accent and its text neutral (R = G = B, within 1)', () => {
    const grays = ['accent', 'accent-text']
    for (const theme of [dark, light]) for (const name of grays) {
      const value = theme[`--diya-color-${name}`]
      // Accent tokens read var(--diya-internal-accent-*, #fallback); the fallback is the default.
      const hex = value.match(/#([0-9a-f]{6}|[0-9a-f]{3})([0-9a-f]{2})?\b/i)![1]
      const full = hex.length === 3 ? [...hex].map(c => c + c).join('') : hex
      const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))
      expect(Math.max(r, g, b) - Math.min(r, g, b), `${name}: ${value}`).toBeLessThanOrEqual(1)
    }
  })

  it('reads text at 4.5:1 or better on every surface', () => {
    for (const theme of [dark, light]) for (const text of ['text', 'muted']) for (const ground of ['surface', 'recessed', 'raised']) {
      const [fg, bg] = [theme[`--diya-color-${text}`], theme[`--diya-color-${ground}`]].map(v => v.length === 4 ? `#${[...v.slice(1)].map(c => c + c).join('')}` : v)
      expect(contrast(fg, bg), `${text} on ${ground}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('falls back to exactly what the provider computes from DIYA_DEFAULT_BRAND', () => {
    const brand = resolveBrand(undefined)
    for (const [theme, tokens] of [['dark', dark], ['light', light]] as const) {
      expect(fallback(tokens['--diya-color-accent'])).toBe(DIYA_DEFAULT_BRAND[theme])
      expect(fallback(tokens['--diya-color-accent-text'])).toBe(brand[theme].accentText)
      expect(fallback(tokens['--diya-color-accent-soft'])).toBe(brand[theme].accentSoft)
      expect(fallback(tokens['--diya-color-accent-ink'])).toBe(brand[theme].accentInk)
      const raised = tokens['--diya-color-raised'] === '#fff' ? '#ffffff' : tokens['--diya-color-raised']
      expect(BRAND_GROUNDS[theme]).toEqual({ surface: tokens['--diya-color-surface'], raised, text: tokens['--diya-color-text'] })
    }
  })

  it('defines the control radius and the spacing scale', () => {
    expect(dark['--diya-radius-control']).toBe('calc(6px * var(--diya-corner-scale, 1))')
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(step => dark[`--diya-space-${step}`])).toEqual(['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'])
  })

  it('defines the scrim in Light and Dark, not only under Glass, and dims Dialog and Drawer with it', () => {
    // Unset, var(--diya-color-scrim) was empty outside Glass, so overlays and shadows built on it failed.
    expect(dark['--diya-color-scrim']).toBe('#00000088')
    expect(light['--diya-color-scrim']).toBe('#00000088')
    for (const owner of ['diya-dialog', 'diya-drawer-modal']) {
      const backdrop = bare.match(new RegExp(`\\.diya-root \\.${owner}::backdrop \\{([^}]*)\\}`))?.[1]
      expect(backdrop?.replace(/\s/g, ''), owner).toContain('background:var(--diya-color-scrim,#0008)')
    }
  })
})

// Motion. The rules that animate components arrive with them; these hold every one of them to
// the house rules, and prove the off switch can't be undone from CSS.
const motionDeclarations = [...bare.matchAll(/(?:^|[;{\s])((?:transition|animation)(?:-[a-z]+)?)\s*:\s*([^;{}]+)/g)]
  .map(([, name, value]) => ({ name, value: value.trim() }))

/** Every top-level rule and every rule inside an @media block, with its custom properties. */
function customPropertyRules(css: string) {
  const out: { selectors: string[]; media: string | null; values: Record<string, string> }[] = []
  const stack: string[] = []
  let buffer = ''
  for (const char of css) {
    if (char === '{') { stack.push(buffer.trim()); buffer = ''; continue }
    if (char !== '}') { buffer += char; continue }
    const prelude = stack.pop() ?? ''
    const parent = stack.at(-1) ?? null
    if (!prelude.startsWith('@') && (parent === null || parent.startsWith('@media'))) {
      const values = Object.fromEntries([...buffer.matchAll(/(--diya-[\w-]+)\s*:\s*([^;]+)/g)].map(([, name, value]) => [name, value.trim()]))
      out.push({ selectors: prelude.split(',').map(part => part.trim()), media: parent, values })
    }
    buffer = ''
  }
  return out
}
const propertyRules = customPropertyRules(bare)

/** The custom properties on a provider root with this motion setting, after an app's own CSS. */
function rootFor(motion: 'system' | 'reduced' | 'off', { reduce = false, app = {} as Record<string, string> } = {}) {
  const values: Record<string, string> = {}
  for (const rule of propertyRules) {
    const matches = rule.selectors.includes('.diya-root') || rule.selectors.includes(`.diya-root[data-motion='${motion}']`)
    const media = rule.media === null || (reduce && rule.media === '@media (prefers-reduced-motion: reduce)')
    if (matches && media) Object.assign(values, rule.values)
  }
  // Unlayered app CSS beats every rule in @layer diya.
  return { ...values, ...app }
}

/** A time in ms: var() substituted from `values` (or its fallback), then calc() worked out. */
function milliseconds(expression: string, values: Record<string, string>): number {
  let text = expression
  for (let pass = 0; pass < 10 && text.includes('var('); pass++) {
    text = text.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]+))?\)/g, (_, name: string, fallback?: string) => {
      const value = values[name] ?? fallback
      if (value === undefined) throw new Error(`${name} is not set`)
      return `(${value})`
    })
  }
  const arithmetic = text.replace(/calc\(/g, '(').replace(/(\d*\.?\d+)ms\b/g, '$1').replace(/(\d*\.?\d+)s\b/g, '($1*1000)')
  if (!/^[\d\s.()*/+-]+$/.test(arithmetic)) throw new Error(`not arithmetic: ${arithmetic}`)
  return Number(Function(`return (${arithmetic})`)())
}
const durations = ['--diya-duration-fast', '--diya-duration-medium', '--diya-duration-slow']
// Motion rules read their times from these, declared once on the provider root.
const step = (token: string) => token.replace('--diya-duration-', '')
const enter = (token: string) => `var(--diya-internal-duration-${step(token)})`
const exit = (token: string) => `var(--diya-internal-exit-${step(token)})`
// Every time a motion rule uses, plus the six the root declares.
const timeReferences = (value: string) => [...value.matchAll(/var\(--diya-internal-(?:duration|exit)-[\w-]+\)/g)].map(match => match[0])
const gatedUses = [...new Set([
  ...durations.flatMap(token => [enter(token), exit(token)]),
  ...motionDeclarations.flatMap(({ value }) => timeReferences(value)),
])]

describe('motion tokens', () => {
  it('declares three durations, a scale and three curves, and no page duration', () => {
    expect(durations.map(token => dark[token])).toEqual([
      'calc(120ms * var(--diya-duration-scale, 1))',
      'calc(160ms * var(--diya-duration-scale, 1))',
      'calc(240ms * var(--diya-duration-scale, 1))',
    ])
    expect(['enter', 'exit', 'move'].map(name => dark[`--diya-ease-${name}`])).toEqual([
      'cubic-bezier(0.2, 0.7, 0.2, 1)', 'cubic-bezier(0.4, 0, 1, 1)', 'cubic-bezier(0.4, 0, 0.2, 1)',
    ])
    // Like --diya-corner-scale, the scale is read with a fallback, so an ancestor can set it.
    expect(dark['--diya-duration-scale']).toBeUndefined()
    expect(source).not.toContain('--diya-duration-page')
  })

  it('times enters and two-thirds exits from the tokens, scaled by --diya-duration-scale', () => {
    const system = rootFor('system')
    expect(durations.map(token => milliseconds(enter(token), system))).toEqual([120, 160, 240])
    expect(durations.map(token => Math.round(milliseconds(exit(token), system)))).toEqual([80, 107, 160])
    const slower = rootFor('system', { app: { '--diya-duration-scale': '1.5' } })
    expect(durations.map(token => milliseconds(enter(token), slower))).toEqual([180, 240, 360])
    const reduced = rootFor('reduced', { app: { '--diya-duration-scale': '0.5' } })
    expect(durations.map(token => milliseconds(enter(token), reduced))).toEqual([60, 80, 120])
    const none = rootFor('system', { app: { '--diya-duration-scale': '0' } })
    for (const use of gatedUses) expect(milliseconds(use, none), use).toBe(0)
  })

  it('resolves every duration to 0 under motion="off", whatever tokens the app sets', () => {
    const app = { '--diya-duration-scale': '2', '--diya-duration-fast': '300ms', '--diya-duration-medium': '0.5s', '--diya-duration-slow': '1s' }
    for (const reduce of [false, true]) {
      const off = rootFor('off', { reduce, app })
      for (const use of gatedUses) expect(milliseconds(use, off), use).toBe(0)
      // The same overrides do reach the durations when motion is on.
      expect(milliseconds(enter('--diya-duration-medium'), rootFor('system', { reduce, app }))).toBe(500)
    }
  })

  it('times every motion rule through the gated durations on the root, one form everywhere', () => {
    // The six gated times: each is a public duration (an exit, two-thirds of it) times the gate.
    for (const token of durations) {
      expect(dark[`--diya-internal-duration-${step(token)}`]).toBe(`calc(var(${token}) * var(--diya-internal-motion))`)
      expect(dark[`--diya-internal-exit-${step(token)}`]).toBe(`calc(var(${token}) * 2 / 3 * var(--diya-internal-motion))`)
    }
    for (const { name, value } of motionDeclarations) {
      // No rule reads a public duration, or the gate, directly.
      expect(value, `${name}: ${value}`).not.toMatch(/--diya-duration-|--diya-internal-motion\)/)
      for (const reference of timeReferences(value)) expect(gatedUses, `${name}: ${reference}`).toContain(reference)
    }
    for (const reference of gatedUses) expect(dark[reference.slice(4, -1)], reference).toBeDefined()
  })

  it('derives exits from their enter: no transition is timed with a fixed value', () => {
    for (const { name, value } of motionDeclarations.filter(({ name }) => name.startsWith('transition'))) {
      const fixed = value.replace(/var\([^()]*\)/g, '').replace(/calc\([^;]*\)/g, '').match(/(?<![\w.-])(\d*\.?\d+)m?s\b/g) ?? []
      expect(fixed.filter(time => parseFloat(time) !== 0), `${name}: ${value}`).toEqual([])
    }
  })

  it('keeps fades but no travel or scale under reduced, under system with Reduce Motion, and off', () => {
    const internals = ['travel', 'distance', 'distance-edge', 'scale', 'scale-dialog', 'scale-press'].map(name => `--diya-internal-motion-${name}`)
    const read = (values: Record<string, string>) => internals.map(name => values[name])
    expect(read(rootFor('system'))).toEqual(['1', '4px', '12px', '0.97', '0.98', '0.98'])
    expect(read(rootFor('reduced', { reduce: false }))).toEqual(['0', '0px', '0px', '1', '1', '1'])
    expect(read(rootFor('system', { reduce: true }))).toEqual(['0', '0px', '0px', '1', '1', '1'])
    expect(read(rootFor('off'))).toEqual(['0', '0px', '0px', '1', '1', '1'])
    // Only motion="off" closes the gate; Reduce Motion keeps fades.
    expect([rootFor('system'), rootFor('system', { reduce: true }), rootFor('reduced'), rootFor('off')].map(values => values['--diya-internal-motion']))
      .toEqual(['1', '1', '1', '0'])
  })
})

describe('motion house rules', () => {
  it('never transitions all', () => {
    for (const { name, value } of motionDeclarations.filter(({ name }) => name === 'transition' || name === 'transition-property')) {
      expect(value.split(',').map(part => part.trim().split(/\s+/)[0]), `${name}: ${value}`).not.toContain('all')
    }
  })

  it('writes allow-discrete only in transition-behavior', () => {
    const uses = [...bare.matchAll(/([\w-]+)\s*:[^;{}]*allow-discrete/g)].map(match => match[1])
    expect(uses.filter(name => name !== 'transition-behavior')).toEqual([])
  })

  it('adds no !important', () => {
    expect(bare.match(/!\s*important/g) ?? []).toEqual([])
  })

  it('never transitions filter, backdrop-filter or outline', () => {
    for (const { name, value } of motionDeclarations.filter(({ name }) => name === 'transition' || name === 'transition-property')) {
      const properties = value.split(/,(?![^()]*\))/).map(part => part.trim().split(/\s+/)[0])
      for (const banned of ['filter', 'backdrop-filter', '-webkit-backdrop-filter', 'outline']) expect(properties, `${name}: ${value}`).not.toContain(banned)
    }
  })
})

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

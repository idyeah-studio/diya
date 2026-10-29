import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BRAND_DEFAULT,
  DEFAULT_APPEARANCE,
  changedPaths,
  effectiveAppearance,
  parseOverrides,
  withOverrides,
  type Appearance,
} from './appearance'
import { composite, contrast, inkFor, normalizeHex } from './color'
import { contrastIssues } from './contrast'
import { customizeItems } from './registry'
import { accentSet, appearanceCss, neutralSet, sharedTokens, statusSet, themeTokens } from './tokens'

const sdkCss = readFileSync(
  path.resolve(__dirname, '../../../../packages/diya/src/styles.css'),
  'utf8',
)
/** Custom properties declared in the first block matching `selector`. */
function sdkTokens(selector: string) {
  const start = sdkCss.indexOf(selector + ' {')
  const body = sdkCss.slice(start, sdkCss.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim().toUpperCase()]))
}
const full = (hex: string) => (/^#[\dA-F]{3}$/i.test(hex) ? '#' + hex.slice(1).replace(/./g, (d) => d + d) : hex).toUpperCase()

describe('defaults are the SDK’s own values', () => {
  const dark = sdkTokens('.diya-root')
  const light = { ...dark, ...sdkTokens(".diya-root[data-theme='light']") }
  for (const [theme, sdk] of [['dark', dark], ['light', light]] as const) {
    it(`${theme} roles match styles.css`, () => {
      const c = DEFAULT_APPEARANCE.colors[theme]
      expect(c.text).toBe(full(sdk['--diya-color-text']))
      expect(c.background).toBe(full(sdk['--diya-color-surface']))
      expect(c.raised).toBe(full(sdk['--diya-color-raised']))
      /* The accent reads the provider's brand, falling back to DIYA's neutral. */
      const accent = /var\(--diya-internal-accent-\w+, (#[\dA-F]+)\)/i.exec(sdk['--diya-color-accent'])?.[1] ?? ''
      expect(c.accent).toBe(full(accent))
      expect(c.accent).toBe(BRAND_DEFAULT[theme])
      expect(c.lines).toBe(full(sdk['--diya-color-line']))
      expect(neutralSet(DEFAULT_APPEARANCE, theme).muted).toBe(full(sdk['--diya-color-muted']))
      const s = DEFAULT_APPEARANCE.status[theme]
      expect(s.success).toBe(full(sdk['--diya-color-success-fill']))
      expect(s.warning).toBe(full(sdk['--diya-color-warning-fill']))
      expect(s.error).toBe(full(sdk['--diya-color-error-fill']))
      expect(s.info).toBe(full(sdk['--diya-color-info-fill']))
    })
  }

  it('emits nothing for an untouched appearance', () => {
    expect(themeTokens(DEFAULT_APPEARANCE, 'light')).toEqual({})
    expect(themeTokens(DEFAULT_APPEARANCE, 'dark')).toEqual({})
    expect(sharedTokens(DEFAULT_APPEARANCE)).toEqual({})
    expect(appearanceCss(DEFAULT_APPEARANCE, '.diya-root.diya-root')).toBe('')
    expect(changedPaths(DEFAULT_APPEARANCE)).toEqual([])
  })

  it('has no contrast issues by default', () => {
    expect(contrastIssues(DEFAULT_APPEARANCE)).toEqual([])
  })
})

describe('layering and validation', () => {
  it('applies item over brand over defaults, field by field', () => {
    const a = effectiveAppearance(
      { 'colors.light.accent': '#7a2e1f', font: 'lora' },
      { 'colors.light.accent': '#1F4E7A' },
    )
    expect(a.colors.light.accent).toBe('#1F4E7A')
    expect(a.font).toBe('lora')
    expect(a.colors.dark.accent).toBe(DEFAULT_APPEARANCE.colors.dark.accent)
    expect(changedPaths(a)).toEqual(['font', 'colors.light.accent'])
  })

  it('never mutates the defaults', () => {
    withOverrides(DEFAULT_APPEARANCE, { 'colors.dark.text': '#FFFFFF' })
    expect(DEFAULT_APPEARANCE.colors.dark.text).toBe('#F1F3F2')
  })

  it('rejects unknown paths and invalid values', () => {
    expect(() => parseOverrides({ 'colors.light.shadow': '#000000' })).toThrow(/colors\.light\.shadow/)
    expect(() => parseOverrides({ font: 'comic-sans' })).toThrow()
    expect(() => parseOverrides({ corners: 25 })).toThrow()
    expect(() => parseOverrides({ corners: 2.5 })).toThrow()
    expect(() => parseOverrides({ elevation: 'huge' })).toThrow()
    expect(() => parseOverrides({ translucent: 'yes' })).toThrow()
    expect(() => parseOverrides({ 'colors.light.text': 'red' })).toThrow()
    expect(() => parseOverrides({ 'colors.light.text': 'url(x)' })).toThrow()
    expect(() => parseOverrides(['font'])).toThrow()
    expect(() => parseOverrides(null)).toThrow()
  })

  it('normalizes hex case', () => {
    expect(parseOverrides({ 'colors.light.accent': '#abcdef' })).toEqual({ 'colors.light.accent': '#ABCDEF' })
  })
})

describe('colour maths', () => {
  it('measures WCAG contrast', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
  })

  it('composites translucent colours before measuring', () => {
    expect(composite('#FFFFFF80', '#000000')).toBe('#808080')
    expect(contrast('#FFFFFF30', '#242424')).toBeCloseTo(contrast(composite('#FFFFFF30', '#242424'), '#242424'), 5)
  })

  it('accepts what people type', () => {
    expect(normalizeHex('abc')).toBe('#AABBCC')
    expect(normalizeHex(' #1f4e7a ')).toBe('#1F4E7A')
    expect(normalizeHex('#12345')).toBeNull()
    expect(normalizeHex('red')).toBeNull()
  })

  it('chooses the more legible ink', () => {
    expect(inkFor('#FFC220')).not.toBe('#FFFFFF')
    expect(inkFor('#1F4E7A')).toBe('#FFFFFF')
  })
})

describe('tokens', () => {
  const custom = (overrides: Parameters<typeof withOverrides>[1]): Appearance =>
    withOverrides(DEFAULT_APPEARANCE, overrides)

  it('derives a legible ink for a new accent', () => {
    const t = themeTokens(custom({ 'colors.light.accent': '#FFC220' }), 'light')
    expect(t['--diya-color-accent']).toBe('#FFC220')
    expect(contrast(t['--diya-color-accent-text'], '#FFC220')).toBeGreaterThanOrEqual(4.5)
    expect(themeTokens(custom({ 'colors.light.accent': '#FFC220' }), 'dark')).toEqual({})
  })

  it('keeps muted text readable when text or surfaces change', () => {
    const a = custom({ 'colors.dark.background': '#0B1A2E', 'colors.dark.raised': '#13263F' })
    const t = themeTokens(a, 'dark')
    expect(contrast(t['--diya-color-muted'], '#0B1A2E')).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t['--diya-color-muted'], '#13263F')).toBeGreaterThanOrEqual(4.5)
    expect(t['--diya-color-recessed']).toBeDefined()
  })

  it('re-derives every status pair legibly from a new fill', () => {
    const a = custom({ 'status.light.success': '#7BD88F', 'status.light.error': '#FF6B6B' })
    const t = themeTokens(a, 'light')
    for (const status of ['success', 'error'] as const) {
      const s = statusSet(a, 'light', status)
      expect(t[`--diya-color-${status}`]).toBe(s.tone)
      expect(contrast(s.tone, s.surfaceOnRaised)).toBeGreaterThanOrEqual(4.5)
    }
    expect(t['--diya-color-error']).toBe(statusSet(a, 'light', 'error').tone)
    expect(t['--diya-color-destructive']).toBe(statusSet(a, 'light', 'error').tone)
    expect(t['--diya-color-info']).toBeUndefined()
  })

  it('writes a status as its four public tokens', () => {
    const a = custom({ 'status.dark.warning': '#F5A524' })
    const s = statusSet(a, 'dark', 'warning')
    expect(themeTokens(a, 'dark')).toMatchObject({
      '--diya-color-warning': s.tone,
      '--diya-color-warning-surface': s.surface,
      '--diya-color-warning-fill': '#F5A524',
      '--diya-color-warning-on-fill': s.ink,
    })
  })

  it('writes only public tokens', () => {
    const everything = custom({
      'colors.light.background': '#EFEFEF', 'colors.dark.background': '#252525', 'colors.light.accent': '#1F4E7A',
      'status.light.error': '#FF6B6B', 'status.dark.info': '#4AA3FF', elevation: 'lifted', corners: 4,
    })
    const css = appearanceCss(everything, '.diya-root.diya-root')
    expect(css).not.toMatch(/--diya-internal-/)
    for (const token of css.match(/--[\w-]+(?=:)/g) ?? []) expect(token).toMatch(/^--diya-(color-|shadow-raised$|elevation$|corner-scale$)/)
  })

  it('scales corners and sets elevation', () => {
    expect(sharedTokens(custom({ corners: 16 }))).toEqual({ '--diya-corner-scale': '1.6' })
    expect(sharedTokens(custom({ corners: 0 }))).toEqual({ '--diya-corner-scale': '0' })
    expect(sharedTokens(custom({ elevation: 'flat' }))['--diya-elevation']).toBe('0')
    expect(themeTokens(custom({ elevation: 'flat' }), 'light')['--diya-shadow-raised']).toBe('none')
  })

  it('scopes colour tokens outside forced colours, and shared tokens everywhere', () => {
    const css = appearanceCss(custom({ 'colors.light.accent': '#1F4E7A', corners: 4 }), ".diya-root[data-diya-custom='tabs']")
    expect(css).toContain(".diya-root[data-diya-custom='tabs'] {\n  --diya-corner-scale: 0.4;")
    expect(css).toContain("@media (forced-colors: none) {\n  .diya-root[data-diya-custom='tabs'][data-theme='light'] {")
    expect(css).not.toContain("[data-theme='dark']")
  })
})

describe('what actually renders', () => {
  it('sets the ink error and info badges use, through the public tokens', () => {
    const a = withOverrides(DEFAULT_APPEARANCE, { 'status.light.error': '#FFB3B3', 'status.dark.error': '#8B0000' })
    expect(themeTokens(a, 'light')['--diya-color-error-on-fill']).toBe('#000000')
    expect(themeTokens(a, 'dark')['--diya-color-error']).toMatch(/^#[0-9A-F]{6}$/)
    expect(appearanceCss(a, '.diya-root.diya-root')).not.toContain('.diya-badge')
    expect(contrastIssues(a)).toEqual([])
  })

  it('keeps the SDK’s own status pairs after a one-step background nudge', () => {
    const t = themeTokens(withOverrides(DEFAULT_APPEARANCE, { 'colors.light.background': '#EFEFEF', 'colors.dark.background': '#252525' }), 'light')
    expect(t['--diya-color-warning']).toBeUndefined()
    expect(t['--diya-color-success']).toBeUndefined()
  })

  it('derives glass that keeps text readable on a dark palette in the light theme', () => {
    const a = withOverrides(DEFAULT_APPEARANCE, { 'colors.light.background': '#000000', 'colors.light.raised': '#111111', 'colors.light.text': '#FFFFFF' })
    expect(contrastIssues(a).filter((i) => i.label === 'Text on glass surfaces')).toEqual([])
    expect(appearanceCss(a, '.x')).toContain('color-scheme: dark')
  })
})

describe('status colours people actually pick', () => {
  it('accepts common reds, blues and greens without a false alert block', () => {
    for (const fill of ['#E53935', '#D32F2F', '#F44336', '#1976D2', '#4CAF50'])
      for (const theme of ['light', 'dark'] as const) {
        const a = withOverrides(DEFAULT_APPEARANCE, { [`status.${theme}.error`]: fill } as never)
        expect(contrastIssues(a), `${theme} ${fill}`).toEqual([])
      }
  })

  it('never fails the alert pair on a derived tone', () => {
    for (let r = 0; r < 256; r += 51)
      for (let g = 0; g < 256; g += 51)
        for (let b = 0; b < 256; b += 51) {
          const fill = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
          for (const theme of ['light', 'dark'] as const) {
            const a = withOverrides(DEFAULT_APPEARANCE, { [`status.${theme}.error`]: fill } as never)
            expect(contrastIssues(a).filter((i) => i.label.includes('alert')), `${theme} ${fill}`).toEqual([])
          }
        }
  })

  it('does not block an item over colours it never renders', () => {
    const a = withOverrides(DEFAULT_APPEARANCE, { 'colors.light.accent': '#EEEEEE', 'status.light.info': '#757575' })
    expect(contrastIssues(a, customizeItems['text-input'])).toEqual([])
    expect(contrastIssues(a).length).toBeGreaterThan(0)
  })

  it('keeps the SDK’s muted text and dark pairs after a one-step nudge', () => {
    const a = withOverrides(DEFAULT_APPEARANCE, { 'colors.light.background': '#EFEFEF', 'colors.dark.background': '#252525' })
    expect(themeTokens(a, 'light')['--diya-color-muted']).toBe('#495659')
    expect(themeTokens(a, 'dark')['--diya-color-muted']).toBe('#BEC8CB')
    expect(themeTokens(a, 'dark')['--diya-color-error']).toBeUndefined()
    expect(contrastIssues(a)).toEqual([])
  })
})

describe('contrast gate', () => {
  it('checks accent on raised surfaces too', () => {
    const issues = contrastIssues(withOverrides(DEFAULT_APPEARANCE, { 'colors.light.background': '#FFFFFF', 'colors.light.raised': '#CCCCCC', 'colors.light.accent': '#888888' }))
    expect(issues.map((i) => i.label)).toContain('Accent on raised surfaces')
  })

  it('flags unreadable text in the theme where it happens', () => {
    const issues = contrastIssues(withOverrides(DEFAULT_APPEARANCE, { 'colors.dark.text': '#3A3A3A' }))
    expect(issues.some((i) => i.theme === 'dark' && i.label === 'Text on the background')).toBe(true)
    expect(issues.every((i) => i.theme === 'dark')).toBe(true)
  })

  it('flags an accent that disappears into the background', () => {
    const issues = contrastIssues(withOverrides(DEFAULT_APPEARANCE, { 'colors.light.accent': '#E4E4E4' }))
    expect(issues.map((i) => i.label)).toContain('Accent against the background')
  })

  it('always finds a legible badge ink, whatever the fill', () => {
    /* Pure black or white reaches at least ~4.58:1 on any colour. */
    for (let v = 0; v <= 255; v += 5) {
      const grey = '#' + v.toString(16).padStart(2, '0').repeat(3)
      const issues = contrastIssues(withOverrides(DEFAULT_APPEARANCE, { 'status.light.info': grey.toUpperCase() }))
      expect(issues.map((i) => i.label), grey).not.toContain('Info badge text')
    }
  })
})

describe('the same brand maths as the SDK', () => {
  it('gives the provider’s accent tokens for many colors, on DIYA’s own grounds', async () => {
    const { brandTokens } = await import('../../../../packages/diya/src/internal/brand')
    let seed = 7
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const colors = ['#262626', '#E8E8E8', '#1F4E7A', '#FFC220', '#777777', '#7D7D7D', '#8A8A8A', '#00FF00', '#FFFFFF', '#000000']
    for (let i = 0; i < 600; i++) colors.push('#' + Math.floor(random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase())
    for (const color of colors) {
      for (const theme of ['light', 'dark'] as const) {
        const ours = accentSet(withOverrides(DEFAULT_APPEARANCE, { [`colors.${theme}.accent`]: color }), theme)
        const sdk = brandTokens(color, theme)
        expect([ours.accent, ours.text, ours.soft, ours.ink], `${color} ${theme}`).toEqual(
          [sdk.accent, sdk.accentText, sdk.accentSoft, sdk.accentInk].map((hex) => hex.toUpperCase())
        )
      }
    }
  })
})

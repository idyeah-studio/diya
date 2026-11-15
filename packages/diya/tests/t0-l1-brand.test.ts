import { describe, expect, it } from 'vitest'
import { BRAND_GROUNDS, brandTokens, contrast, normalizeHex, resolveBrand } from '../dist/internal/brand.js'

const samples = ['#262626', '#e8e8e8', '#747CFF', '#2F6FEB', '#0071dc', '#ffc220', '#b5a06b', '#7a5c1e', '#de1c24', '#2a8703', '#ffffff', '#000000', '#808080', '#5e6ad2', '#ff6b35', '#14b8a6']
const over = (top: string, alpha: number, ground: string) => {
  const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  const [t, g] = [rgb(top), rgb(ground)]
  return `#${t.map((c, i) => Math.round(c * alpha + g[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`
}

describe('brand tokens', () => {
  it('normalizes hex input', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc')
    expect(normalizeHex('2F6FEB')).toBe('#2f6feb')
    expect(normalizeHex('blue')).toBeUndefined()
  })

  it.each(samples)('%s reads at 4.5:1 in both themes', color => {
    for (const theme of ['light', 'dark'] as const) {
      const t = brandTokens(color, theme)
      expect(contrast(t.accentText, t.accent), `${theme} text on fill`).toBeGreaterThanOrEqual(4.5)
      const { surface, raised } = BRAND_GROUNDS[theme]
      const alpha = parseInt(t.accentSoft.slice(7), 16) / 255
      for (const ground of [surface, raised, over(t.accent, alpha, surface), over(t.accent, alpha, raised)]) {
        expect(contrast(t.accentInk, ground), `${theme} ink on ${ground}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('puts white on the fill whenever white reads', () => {
    expect(brandTokens('#2F6FEB', 'light').accentText).toBe('#ffffff')
    expect(brandTokens('#262626', 'light').accentText).toBe('#fafafa')
    expect(brandTokens('#e8e8e8', 'dark').accentText).toBe('#1c1c1c')
    expect(brandTokens('#ffc220', 'light').accentText).toBe('#1c1c1c')
  })

  it('tints at 12% in Light and 20% in Dark, like the Customize export', () => {
    expect(brandTokens('#2f6feb', 'light').accentSoft).toBe('#2f6feb1f')
    expect(brandTokens('#2f6feb', 'dark').accentSoft).toBe('#2f6feb33')
  })

  it('falls back to DIYA’s default for an unreadable color', () => {
    expect(resolveBrand('nope').light.accent).toBe('#262626')
  })
})

// The 1.2 theming tokens have no value on .diya-root; a nested provider resets them to their
// fallback (initial) inside @layer diya. A brand file on .diya-root is unlayered, so it must
// still win on every nested provider. (That an outer provider's style stays out of a nested
// one needs real inheritance, which happy-dom doesn't do for custom properties: tokens.spec.ts
// proves it in Chromium, WebKit and Firefox.)
describe('the 1.2 theming tokens through nested providers', () => {
  const nine = ['--diya-color-focus', '--diya-color-heading', '--diya-color-field', '--diya-color-field-line', '--diya-height-control-small', '--diya-height-control-medium', '--diya-height-control-large', '--diya-radius-popup', '--diya-radius-modal']

  it('a brand file on .diya-root reaches a nested provider over the nested reset', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const css = readFileSync(resolve(process.cwd(), 'dist/styles.css'), 'utf8')
    expect(css).toContain('.diya-root .diya-root {')
    document.head.innerHTML = ''
    for (const text of [css, `.diya-root { ${nine.map(name => `${name}: 9px`).join('; ')} }`]) {
      const sheet = document.createElement('style')
      sheet.textContent = text
      document.head.append(sheet)
    }
    document.body.innerHTML = '<div class="diya-root" data-theme="light"><section><div class="diya-root" data-theme="dark" id="nested"></div></section></div>'
    const nested = document.getElementById('nested')!
    expect(nested.matches('.diya-root .diya-root')).toBe(true)
    expect(nine.map(name => getComputedStyle(nested).getPropertyValue(name).trim())).toEqual(nine.map(() => '9px'))
  })
})

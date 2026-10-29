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

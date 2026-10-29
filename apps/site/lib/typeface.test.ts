import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_APPEARANCE } from './customize/appearance'
import { catalogFonts } from './customize/fonts'

const app = path.resolve(__dirname, '..')

describe('DIYA Sans', () => {
  it('reaches the site from the SDK’s own files, so it is downloaded once', () => {
    const css = readFileSync(path.join(app, 'app/globals.css'), 'utf8')
    for (const file of ['DIYASans.woff2', 'DIYASans-Italic.woff2']) {
      const url = `../../../packages/diya/src/fonts/${file}`
      expect(css).toContain(`url('${url}')`)
      expect(existsSync(path.join(app, 'app', url)), file).toBe(true)
    }
    expect(existsSync(path.join(app, 'public/fonts/diya-sans'))).toBe(false)
  })

  it('gives the countdown its own frozen copy, so its digits never change', () => {
    const css = readFileSync(path.join(app, 'app/globals.css'), 'utf8')
    expect(css).toMatch(/@font-face\s*\{[^}]*'DIYA Sans Countdown'[^}]*url\('\.\/fonts\/DIYASans-countdown\.woff2'\)/)
    expect(css).toMatch(/\.countdown-time b \{[^}]*'DIYA Sans Countdown'/)
    expect(css).toMatch(/\.countdown-time i \{[^}]*'DIYA Sans Countdown'/)
    // The DIYA Sans that shipped with the countdown, byte for byte.
    const bytes = readFileSync(path.join(app, 'app/fonts/DIYASans-countdown.woff2'))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('9eef6d3482312da93e25d18130bf6742efa13565689bfd0e90739400d783e845')
  })

  it('keeps a metric-matched fallback on the site and leaves no Arial- or Georgia-first stacks', () => {
    const css = readFileSync(path.join(app, 'app/globals.css'), 'utf8')
    expect(css).toMatch(/@font-face\s*\{[^}]*'DIYA Sans Fallback'[^}]*local\('Arial'\)[^}]*size-adjust/)
    expect(css).not.toMatch(/font(-family)?:[^;]*\bGeorgia\b/)
    expect(css).not.toMatch(/font(-family)?:\s*(\d+ )?(\d+px )?Arial\b/)
  })

  it('is the Customize default and needs no extra download', () => {
    expect(DEFAULT_APPEARANCE.font).toBe('diya-sans')
    const font = catalogFonts['diya-sans']
    expect(font).toEqual({ label: 'DIYA Sans', family: '"DIYA Sans", "DIYA Sans Fallback", Arial, sans-serif' })
    expect('asset' in font).toBe(false)
    expect(catalogFonts.sans.label).toBe('Arial')
  })
})

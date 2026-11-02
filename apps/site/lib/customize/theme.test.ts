import { describe, expect, it } from 'vitest'
import { BRAND_SUGGESTIONS, DEFAULT_APPEARANCE, effectiveAppearance, fonts, type FontId } from './appearance'
import { contrast } from './color'
import { contrastIssues } from './contrast'
import { parseState } from './store'
import { appearanceCss, NEAR_BLACK, themeTokens } from './tokens'
import { buttonProps, contrastFix, fontFamilyValue, providerProps, providerSnippet, themeFile, themeSummary, webFont } from './theme'

describe('the theme file', () => {
  it('says how to use it, and changes nothing when nothing changed', () => {
    const css = themeFile(DEFAULT_APPEARANCE)
    expect(css).toMatch(/^\/\* diya-theme\.css, made in the DIYA catalog\.\n   Import it after '@idyeah\/diya\/styles\.css'\. Public tokens only\.\n   Brand: Neutral \(DIYA default\)\. \*\//)
    expect(css).not.toMatch(/--diya-/)
  })

  it('sets public tokens on the provider root, per theme, outside forced colors', () => {
    const css = themeFile(effectiveAppearance({ 'colors.light.accent': '#8A3D1F', 'colors.dark.accent': '#F0B48A', corners: 16, elevation: 'lifted' }))
    expect(css).toContain(".diya-root {\n  --diya-corner-scale: 1.6;\n  --diya-elevation: 1.6;\n}")
    expect(css).toContain('@media (forced-colors: none) {')
    expect(css).toMatch(/\.diya-root\[data-theme='light'\] \{\n    --diya-shadow-raised: /)
    expect(css).toMatch(/\.diya-root\[data-theme='dark'\] \{\n    --diya-shadow-raised: /)
    for (const [, name] of css.matchAll(/(--[\w-]+):/g)) expect(name).toMatch(/^--diya-(color|corner-scale|elevation|shadow-raised)/)
    /* theme="system", the provider's default, gets the same tokens through the OS setting. */
    expect(css).toMatch(/@media \(forced-colors: none\) and \(prefers-color-scheme: light\) \{\n  \.diya-root\[data-theme='system'\] \{\n    --diya-shadow-raised: /)
    expect(css).toMatch(/@media \(forced-colors: none\) and \(prefers-color-scheme: dark\) \{\n  \.diya-root\[data-theme='system'\] \{\n    --diya-shadow-raised: /)
  })

  it("leaves the brand to brandColor, so the file can't outrank it or a nested provider", () => {
    const appearance = effectiveAppearance({ 'colors.light.accent': '#8A3D1F', 'colors.dark.accent': '#F0B48A' })
    const css = themeFile(appearance)
    expect(css).toContain("Brand: #8A3D1F in Light, #F0B48A in Dark, set with DiyaProvider's brandColor.")
    expect(css).not.toMatch(/--diya-color-accent/)
    /* Customize's own preview has no provider prop to lean on, so it still paints the accent. */
    expect(appearanceCss(appearance, '.diya-root.preview')).toMatch(/--diya-color-accent: #8A3D1F;/)
  })
})

describe('provider props', () => {
  it('lists only what changed', () => {
    expect(providerProps(DEFAULT_APPEARANCE)).toEqual([])
    const props = providerProps(
      effectiveAppearance({ 'colors.light.accent': '#C2662D', 'colors.dark.accent': '#C2662D', font: 'manrope', translucent: true })
    )
    expect(props.map(({ name, value }) => ({ name, value }))).toEqual([
      { name: 'brandColor', value: '#C2662D' },
      { name: 'fontFamily', value: "'Manrope Variable', sans-serif" },
      { name: 'glass', value: true },
    ])
    expect(providerSnippet(props)).toBe(`<DiyaProvider\n  brandColor="#C2662D"\n  fontFamily="'Manrope Variable', sans-serif"\n  glass\n>`)
  })

  it('writes a Light and Dark pair when Dark has its own brand', () => {
    const props = providerProps(effectiveAppearance({ 'colors.light.accent': '#1F4E7A', 'colors.dark.accent': '#8DB4DA' }))
    expect(providerSnippet(props)).toBe(`<DiyaProvider\n  brandColor={{ light: '#1F4E7A', dark: '#8DB4DA' }}\n>`)
  })

  it('leaves glass out when it is off, even as an explicit choice', () => {
    expect(providerProps(effectiveAppearance({ translucent: false }))).toEqual([])
  })
})

describe('fonts', () => {
  it('installs every web font from Fontsource by its variable family name', () => {
    for (const id of Object.keys(fonts) as FontId[]) {
      const font = webFont(id)
      if (!('asset' in fonts[id])) {
        expect(font).toBeNull()
        continue
      }
      expect(font!.packageName).toBe(`@fontsource-variable/${(fonts[id] as { asset: string }).asset}`)
      expect(font!.family).toBe(`${fonts[id].label} Variable`)
    }
    expect(fontFamilyValue('lora')).toBe("'Lora Variable', serif")
    expect(fontFamilyValue('roboto-mono')).toBe("'Roboto Mono Variable', monospace")
  })

  it('needs no step for DIYA Sans or a system stack', () => {
    for (const id of ['diya-sans', 'sans', 'system', 'serif', 'mono'] as FontId[]) expect(webFont(id)).toBeNull()
    expect(fontFamilyValue('serif')).toBe("Georgia, 'Times New Roman', serif")
  })
})

describe('Button’s own settings', () => {
  it('become props, not a wrapper', () => {
    expect(buttonProps({})).toBeNull()
    // Pill is Button's own default, so only the rounded corner becomes a prop.
    expect(buttonProps({ size: 'large' })).toEqual({ snippet: '<Button size="large">Save</Button>', shadow: false })
    expect(buttonProps({ shape: 'pill', size: 'medium' })!.snippet).toBe('<Button>Save</Button>')
    expect(buttonProps({ shape: 'rounded', size: 'medium' })!.snippet).toBe('<Button shape="rounded">Save</Button>')
    expect(buttonProps({ shape: 'rounded', shadow: true })!.shadow).toBe(true)
  })
})

describe('one-click contrast fixes', () => {
  it('makes the failing pair readable without breaking another', () => {
    const brand = { 'colors.light.accent': '#E7A37C' }
    const [issue] = contrastIssues(effectiveAppearance(brand)).filter((i) => i.label === 'Accent against the background')
    expect(issue).toBeTruthy()
    const fix = contrastFix(brand, issue)!
    expect(fix.path).toBe('colors.light.accent')
    expect(fix.ratio).toBeGreaterThanOrEqual(3)
    expect(contrastIssues(effectiveAppearance({ ...brand, [fix.path]: fix.value }))).toEqual([])
  })

  it('fixes every pair a bad text color breaks, one click at a time', () => {
    let brand: Record<string, string> = { 'colors.light.text': '#EEEEEE' }
    for (let clicks = 0; clicks < 10; clicks++) {
      const issues = contrastIssues(effectiveAppearance(brand))
      if (!issues.length) break
      const fix = contrastFix(brand, issues[0])!
      expect(fix).not.toBeNull()
      brand = { ...brand, [fix.path]: fix.value }
    }
    expect(contrastIssues(effectiveAppearance(brand))).toEqual([])
  })
})

describe('summary', () => {
  it('names the theme in plain words', () => {
    expect(themeSummary(DEFAULT_APPEARANCE)).toMatchObject({ font: 'DIYA Sans', corners: 'Soft', elevation: 'Soft', glass: false, status: 'DIYA defaults' })
    expect(themeSummary(effectiveAppearance({ corners: 7, 'status.dark.error': '#FF0000' }))).toMatchObject({ corners: '7px', status: 'Your own' })
  })
})

describe('one brand colour', () => {
  it('says plainly when no brand is set', () => {
    expect(themeSummary(DEFAULT_APPEARANCE).brand).toBe('Neutral (DIYA default)')
    expect(themeSummary(effectiveAppearance({ 'colors.light.accent': '#1F4E7A', 'colors.dark.accent': '#1F4E7A' })).brand).toBe('#1F4E7A')
  })

  it('derives the four public brand tokens: white text when it passes AA, readable ink, a soft tint', () => {
    const tokens = themeTokens(effectiveAppearance({ 'colors.light.accent': '#1F4E7A', 'colors.dark.accent': '#1F4E7A' }), 'light')
    expect(tokens['--diya-color-accent']).toBe('#1F4E7A')
    expect(tokens['--diya-color-accent-text']).toBe('#FAFAFA')
    expect(tokens['--diya-color-accent-soft']).toMatch(/^#1F4E7A[0-9A-F]{2}$/)
    expect(contrast(tokens['--diya-color-accent-ink'], '#EEEEEE')).toBeGreaterThanOrEqual(4.5)
    const pale = themeTokens(effectiveAppearance({ 'colors.light.accent': '#F2C94C', 'colors.dark.accent': '#F2C94C' }), 'light')
    expect(pale['--diya-color-accent-text']).toBe(NEAR_BLACK)
    expect(contrast(pale['--diya-color-accent-ink'], '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })

  it('offers suggestions that all carry white text at AA', () => {
    for (const swatch of BRAND_SUGGESTIONS) expect(contrast('#FFFFFF', swatch.hex), swatch.name).toBeGreaterThanOrEqual(4.5)
  })

  it('reads an old saved brand as the one brand, and drops the old periwinkle default', () => {
    expect(parseState({ schemaVersion: 2, brand: { brand: '#c2662d' }, items: {} }).brand).toEqual({
      'colors.light.accent': '#C2662D',
      'colors.dark.accent': '#C2662D',
    })
    expect(parseState({ schemaVersion: 2, brand: { brand: '#747CFF', font: 'lora' }, items: {} }).brand).toEqual({ font: 'lora' })
    expect(parseState({ schemaVersion: 2, brand: { brand: '#C2662D', 'colors.light.accent': '#1F4E7A' }, items: {} }).brand).toEqual({
      'colors.light.accent': '#1F4E7A',
    })
  })
})

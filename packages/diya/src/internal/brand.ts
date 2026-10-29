// The brand color, worked out once per provider into the four accent tokens.

/** DIYA's own accent when the provider sets no `brandColor`: a true neutral ink in Light, its pale twin in Dark. */
export const DIYA_DEFAULT_BRAND = { light: '#262626', dark: '#e8e8e8' } as const

export type BrandTheme = 'light' | 'dark'
/** The accent tokens for one theme, as hex. */
export type DiyaBrandTokens = {
  /** Fills: the solid Button, a selected pill Tab, an on Switch, chart series 1. */
  accent: string
  /** Text and icons on the accent fill. */
  accentText: string
  /** A quiet translucent tint, such as behind a brand-tone Tag. */
  accentSoft: string
  /** Accent-colored text that reads on the page, the soft tint and raised surfaces. */
  accentInk: string
}

// DIYA's default surface, raised and text per theme, kept equal to styles.css by a test.
export const BRAND_GROUNDS: Record<BrandTheme, { surface: string; raised: string; text: string }> = {
  light: { surface: '#ffffff', raised: '#ffffff', text: '#202627' },
  dark: { surface: '#111113', raised: '#18181b', text: '#f1f3f2' },
}
// Text on the fill: the first of these that reaches 4.5:1. White wins whenever it can.
const TEXT_ON_FILL = ['#fafafa', '#ffffff', '#1c1c1c', '#000000']
// The same formula as Customize's theme export (apps/diya lib/customize/tokens.ts), so both give the same pixels.
// The alphas the soft tint renders at (#…1f and #…33), so contrast is checked on the pixels people see.
const SOFT_ALPHA: Record<BrandTheme, number> = { light: 31 / 255, dark: 51 / 255 }
const AA = 4.5

type RGB = [number, number, number]

/** `#rgb` or `#rrggbb`, with or without the hash, as lowercase `#rrggbb`; anything else is undefined. */
export function normalizeHex(value: string): string | undefined {
  const hex = value.trim().replace(/^#/, '')
  if (/^[\da-f]{3}$/i.test(hex)) return `#${[...hex].map(x => x + x).join('').toLowerCase()}`
  return /^[\da-f]{6}$/i.test(hex) ? `#${hex.toLowerCase()}` : undefined
}

const rgb = (hex: string): RGB => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as RGB
const toHex = (color: RGB) => `#${color.map(c => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`
const linear = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const luminance = ([r, g, b]: RGB) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)

/** WCAG 2 contrast ratio between two opaque hex colors. */
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(rgb(a)), luminance(rgb(b))]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const over = (top: RGB, alpha: number, ground: RGB): RGB => top.map((c, i) => c * alpha + ground[i] * (1 - alpha)) as RGB

/** The four accent tokens for one theme, from a hex brand color; contrast is checked against DIYA's default grounds. */
export function brandTokens(color: string, theme: BrandTheme): DiyaBrandTokens {
  const accent = normalizeHex(color) ?? DIYA_DEFAULT_BRAND[theme]
  // One of pure white or black always reaches 4.5:1, so the search never falls through.
  const accentText = TEXT_ON_FILL.find(text => contrast(accent, text) >= AA) ?? '#000000'
  const alpha = SOFT_ALPHA[theme]
  const accentSoft = `${accent}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
  // Ink reads on the surface, raised surfaces and the soft tint over each; it moves toward the text color only as far as that needs.
  const { surface, raised, text } = BRAND_GROUNDS[theme]
  const grounds = [surface, raised].flatMap(ground => [ground, toHex(over(rgb(accent), alpha, rgb(ground)))])
  const passes = (candidate: string) => grounds.every(ground => contrast(candidate, ground) >= AA)
  let accentInk = text
  for (let step = 0; step <= 40; step++) {
    const candidate = toHex(over(rgb(text), step / 40, rgb(accent)))
    if (passes(candidate)) { accentInk = candidate; break }
  }
  return { accent, accentText, accentSoft, accentInk }
}

/** A provider's `brandColor`, one color or one per theme, as the accent tokens for both themes. */
export function resolveBrand(brandColor: string | { light: string; dark: string } | undefined): Record<BrandTheme, DiyaBrandTokens> {
  const source = brandColor === undefined ? DIYA_DEFAULT_BRAND : typeof brandColor === 'string' ? { light: brandColor, dark: brandColor } : brandColor
  return { light: brandTokens(source.light, 'light'), dark: brandTokens(source.dark, 'dark') }
}

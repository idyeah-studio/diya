import { catalogFonts } from './fonts'
import { isHex } from './color'

export type FontId = keyof typeof catalogFonts
export const fonts = catalogFonts
export type Theme = 'light' | 'dark'
export const themes = ['light', 'dark'] as const

export const roleNames = ['accent', 'text', 'background', 'raised', 'lines'] as const
export type Role = (typeof roleNames)[number]
export const statusNames = ['success', 'warning', 'error', 'info'] as const
export type Status = (typeof statusNames)[number]
export const elevations = ['flat', 'soft', 'lifted'] as const
export type Elevation = (typeof elevations)[number]
/** DiyaProvider's `motion`. 'system', the default, follows the device and is never written out. */
export const motions = ['system', 'reduced', 'off'] as const
export type Motion = (typeof motions)[number]
/**
 * 1.2's per-theme theming tokens: `--diya-color-focus`, `--diya-color-heading`,
 * `--diya-color-field` and `--diya-color-field-line`. Unset, each follows DIYA's own
 * default (focus and heading follow the text color).
 */
export const tokenColorNames = ['focus', 'heading', 'field', 'fieldLine'] as const
export type TokenColor = (typeof tokenColorNames)[number]
/** 1.2's shared theming tokens, in px: the three control heights and the popup and modal corners. */
export const tokenLengthNames = ['heightSmall', 'heightMedium', 'heightLarge', 'radiusPopup', 'radiusModal'] as const
export type TokenLength = (typeof tokenLengthNames)[number]
/** What each length is when unset (the corners at a corner scale of 1), and the token it writes. */
export const TOKEN_LENGTHS: Record<TokenLength, { token: `--diya-${string}`; fallback: number; min: number; max: number }> = {
  heightSmall: { token: '--diya-height-control-small', fallback: 32, min: 24, max: 64 },
  heightMedium: { token: '--diya-height-control-medium', fallback: 40, min: 24, max: 64 },
  heightLarge: { token: '--diya-height-control-large', fallback: 48, min: 24, max: 64 },
  radiusPopup: { token: '--diya-radius-popup', fallback: 16, min: 0, max: 40 },
  radiusModal: { token: '--diya-radius-modal', fallback: 22, min: 0, max: 40 },
}
/**
 * Customize's Control height row (F11): the three heights move together as a
 * ladder (DS-SITE-03). Default is DIYA's own 32 / 40 / 48 and writes nothing.
 */
export const CONTROL_HEIGHTS = {
  compact: { heightSmall: 28, heightMedium: 36, heightLarge: 44 },
  default: { heightSmall: 32, heightMedium: 40, heightLarge: 48 },
  roomy: { heightSmall: 36, heightMedium: 44, heightLarge: 52 },
} as const
export type ControlHeight = keyof typeof CONTROL_HEIGHTS
export const CONTROL_HEIGHT_NAMES: Record<ControlHeight, string> = { compact: 'Compact', default: 'Default', roomy: 'Roomy' }

/** Which ladder an appearance's heights are, or null for heights set some other way. */
export function controlHeight(appearance: Appearance): ControlHeight | null {
  const fallback = (name: 'heightSmall' | 'heightMedium' | 'heightLarge') => appearance.tokens?.[name] ?? CONTROL_HEIGHTS.default[name]
  const found = (Object.keys(CONTROL_HEIGHTS) as ControlHeight[]).find((preset) =>
    (['heightSmall', 'heightMedium', 'heightLarge'] as const).every((name) => fallback(name) === CONTROL_HEIGHTS[preset][name])
  )
  return found ?? null
}

/** The 1.2 tokens a theme sets; anything left out keeps DIYA's default. */
export type ThemingTokens = Partial<Record<Theme, Partial<Record<TokenColor, string>>>> & Partial<Record<TokenLength, number>>

export type Appearance = {
  schemaVersion: 2
  font: FontId
  /**
   * Per theme. `accent` is the brand: DiyaProvider's `brandColor`, which
   * fills solid buttons, selected tabs, switches, sliders and progress,
   * leads chart series 1 when it has colour, and tints brand-tone tags and badges.
   */
  colors: Record<Theme, Record<Role, string>>
  status: Record<Theme, Record<Status, string>>
  /** Control radius in px; every other radius scales with it. */
  corners: number
  elevation: Elevation
  /** Export default for the library's glass material. */
  translucent: boolean
  /** How much the theme's app moves: DiyaProvider's `motion`. */
  motion: Motion
  /** 1.2's theming tokens that are set; DIYA's own defaults apply to the rest. */
  tokens?: ThemingTokens
}

/**
 * DIYA's own brand when none is set: a true neutral.
 * The one place the default lives; DiyaProvider's default matches it.
 */
export const BRAND_DEFAULT: Readonly<Record<Theme, string>> = Object.freeze({ light: '#262626', dark: '#E8E8E8' })
/** What the summary and the theme export call an unset brand. */
export const BRAND_DEFAULT_NAME = 'Neutral (DIYA default)'

/**
 * Starting points for a brand, from the bright family Oriel uses. Each one
 * passes the panel's own checks in both themes (3:1 against the page, its text
 * at 4.5:1, picked white or dark for it), so a suggestion never starts with a
 * warning: Ember is a touch deeper than Oriel's, and Violet stands in for a
 * yellow no bright shade of which reaches 3:1 on white. Neutral is DIYA's own
 * default; choosing it clears the brand.
 */
export const BRAND_SUGGESTIONS = [
  { name: 'Neutral', hex: BRAND_DEFAULT.light },
  { name: 'Ocean', hex: '#0A7CFF' },
  { name: 'Jade', hex: '#1FA855' },
  { name: 'Ember', hex: '#F25C10' },
  { name: 'Rose', hex: '#FF375F' },
  { name: 'Violet', hex: '#9B51E0' },
] as const

export const CORNERS_DEFAULT = 10
export const CORNERS_MAX = 24

/**
 * DIYA's own values (packages/diya/src/styles.css). A field equal
 * to its default emits nothing, so untouched parts render exactly as the
 * library does.
 */
export const DEFAULT_APPEARANCE: Appearance = Object.freeze({
  schemaVersion: 2,
  font: 'diya-sans',
  colors: {
    light: { accent: BRAND_DEFAULT.light, text: '#202627', background: '#FFFFFF', raised: '#FFFFFF', lines: '#1C1E2024' },
    dark: { accent: BRAND_DEFAULT.dark, text: '#F1F3F2', background: '#111113', raised: '#18181B', lines: '#FFFFFF26' },
  },
  status: {
    light: { success: '#34C759', warning: '#FF9F0A', error: '#DE1C24', info: '#0071DC' },
    dark: { success: '#30D158', warning: '#FF9F0A', error: '#FF453A', info: '#0A84FF' },
  },
  corners: CORNERS_DEFAULT,
  elevation: 'soft',
  translucent: false,
  motion: 'system',
}) as Appearance

/** Every customizable leaf, as a dotted path. Overrides are stored by path. */
export const appearancePaths = [
  'font',
  ...themes.flatMap((t) => roleNames.map((r) => `colors.${t}.${r}`)),
  ...themes.flatMap((t) => statusNames.map((s) => `status.${t}.${s}`)),
  'corners',
  'elevation',
  'translucent',
  'motion',
  ...themes.flatMap((t) => tokenColorNames.map((n) => `tokens.${t}.${n}`)),
  ...tokenLengthNames.map((n) => `tokens.${n}`),
] as const
export type AppearancePath = (typeof appearancePaths)[number]
export type Overrides = Partial<Record<AppearancePath, string | number | boolean>>

/** A leaf's value; an unset theming token is undefined. */
export function getPath(appearance: Appearance, path: AppearancePath): string | number | boolean {
  return path.split('.').reduce<unknown>((at, key) => (at as Record<string, unknown> | undefined)?.[key], appearance) as
    | string
    | number
    | boolean
}

function validLeaf(path: AppearancePath, value: unknown): boolean {
  if (path === 'font') return typeof value === 'string' && Object.hasOwn(fonts, value)
  if (path === 'corners') return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= CORNERS_MAX
  if (path === 'elevation') return typeof value === 'string' && (elevations as readonly string[]).includes(value)
  if (path === 'translucent') return typeof value === 'boolean'
  if (path === 'motion') return typeof value === 'string' && (motions as readonly string[]).includes(value)
  const length = TOKEN_LENGTHS[path.replace(/^tokens\./, '') as TokenLength]
  if (length) return typeof value === 'number' && Number.isInteger(value) && value >= length.min && value <= length.max
  return isHex(value)
}

function normalizeLeaf(value: unknown) {
  return typeof value === 'string' && value.startsWith('#') ? value.toUpperCase() : value
}

/** Apply overrides on top of a complete appearance. Unknown or invalid paths are an error. */
export function withOverrides(base: Appearance, overrides: Overrides): Appearance {
  const next = structuredClone(base) as Appearance
  for (const [path, value] of Object.entries(overrides) as [AppearancePath, unknown][]) {
    if (!(appearancePaths as readonly string[]).includes(path) || !validLeaf(path, value))
      throw new Error(`Invalid customization value at ${path}`)
    const keys = path.split('.')
    let at = next as unknown as Record<string, unknown>
    // Theming tokens start unset, so their branch is made on first use.
    for (const key of keys.slice(0, -1)) at = (at[key] ??= {}) as Record<string, unknown>
    at[keys[keys.length - 1]] = normalizeLeaf(value)
  }
  return next
}

/** Defaults, then the brand, then the item's own values. */
export function effectiveAppearance(brand: Overrides | null, item: Overrides | null = null): Appearance {
  return withOverrides(withOverrides(DEFAULT_APPEARANCE, brand ?? {}), item ?? {})
}

/** Strictly validate stored overrides (from storage or a request). */
export function parseOverrides(value: unknown): Overrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid customization')
  const out: Overrides = {}
  for (const [path, leaf] of Object.entries(value)) {
    if (!(appearancePaths as readonly string[]).includes(path) || !validLeaf(path as AppearancePath, leaf))
      throw new Error(`Invalid customization value at ${path}`)
    out[path as AppearancePath] = normalizeLeaf(leaf) as string | number | boolean
  }
  return out
}

/** Whether a brand colour is set, in either theme. */
export function brandSet(appearance: Appearance) {
  return themes.some((t) => appearance.colors[t].accent !== BRAND_DEFAULT[t])
}

/** Paths whose effective value differs from DIYA's default. */
export function changedPaths(appearance: Appearance): AppearancePath[] {
  return appearancePaths.filter((path) => getPath(appearance, path) !== getPath(DEFAULT_APPEARANCE, path))
}

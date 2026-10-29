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
}

/**
 * DIYA's own brand when none is set: a true neutral.
 * The one place the default lives; DiyaProvider's default matches it.
 */
export const BRAND_DEFAULT: Readonly<Record<Theme, string>> = Object.freeze({ light: '#262626', dark: '#E8E8E8' })
/** What the summary and the theme export call an unset brand. */
export const BRAND_DEFAULT_NAME = 'Neutral (DIYA default)'

/**
 * Starting points for a brand, each dark enough for white text at 4.5:1.
 * Neutral is DIYA's own default; choosing it clears the brand.
 */
export const BRAND_SUGGESTIONS = [
  { name: 'Neutral', hex: BRAND_DEFAULT.light },
  { name: 'Ink blue', hex: '#1F4E7A' },
  { name: 'Forest', hex: '#2F5D46' },
  { name: 'Brass', hex: '#7D5F22' },
  { name: 'Terracotta', hex: '#A3462A' },
  { name: 'Plum', hex: '#6B3A5B' },
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
}) as Appearance

/** Every customizable leaf, as a dotted path. Overrides are stored by path. */
export const appearancePaths = [
  'font',
  ...themes.flatMap((t) => roleNames.map((r) => `colors.${t}.${r}`)),
  ...themes.flatMap((t) => statusNames.map((s) => `status.${t}.${s}`)),
  'corners',
  'elevation',
  'translucent',
] as const
export type AppearancePath = (typeof appearancePaths)[number]
export type Overrides = Partial<Record<AppearancePath, string | number | boolean>>

export function getPath(appearance: Appearance, path: AppearancePath): string | number | boolean {
  return path.split('.').reduce<unknown>((at, key) => (at as Record<string, unknown>)[key], appearance) as
    | string
    | number
    | boolean
}

function validLeaf(path: AppearancePath, value: unknown): boolean {
  if (path === 'font') return typeof value === 'string' && Object.hasOwn(fonts, value)
  if (path === 'corners') return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= CORNERS_MAX
  if (path === 'elevation') return typeof value === 'string' && (elevations as readonly string[]).includes(value)
  if (path === 'translucent') return typeof value === 'boolean'
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
    for (const key of keys.slice(0, -1)) at = at[key] as Record<string, unknown>
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

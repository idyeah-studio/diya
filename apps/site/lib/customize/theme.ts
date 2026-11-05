import {
  BRAND_DEFAULT_NAME,
  brandSet,
  DEFAULT_APPEARANCE,
  fonts,
  getPath,
  withOverrides,
  type Appearance,
  type AppearancePath,
  type FontId,
  type Overrides,
  type Theme,
} from './appearance'
import { contrastIssues, contrastPairs, type ContrastIssue } from './contrast'
import { ensureContrast, isHex } from './color'
import { appearanceCss } from './tokens'

/**
 * What Customize exports at 1.0: one brand-level theme. Tokens go in
 * diya-theme.css; what CSS can't carry (brand colour, font, glass) goes on
 * DiyaProvider; Button's own settings are props where Button is used.
 */

export const THEME_FILENAME = 'diya-theme.css'

/**
 * The stylesheet, public tokens only, to import after '@idyeah/diya/styles.css'.
 * The brand stays with DiyaProvider's brandColor: pinned accent tokens here would
 * outrank it, and a nested provider could no longer give a region its own brand.
 */
export function themeFile(appearance: Appearance): string {
  const css = appearanceCss(appearance, '.diya-root', { accent: false })
  const brand = brandSet(appearance)
    ? `Brand: ${brandLabel(appearance)}, set with DiyaProvider's brandColor.`
    : `Brand: ${BRAND_DEFAULT_NAME}.`
  return `/* ${THEME_FILENAME}, made in the DIYA catalog.
   Import it after '@idyeah/diya/styles.css'. Public tokens only.
   ${brand} */
${css ? '\n' + css : brandSet(appearance) ? "\n/* No other color, corner or elevation changes: DIYA's defaults apply. */\n" : "\n/* No color, corner or elevation changes: DIYA's defaults apply. */\n"}`
}

/** The brand as the summary names it: one hex, a Light · Dark pair, or the neutral default. */
export function brandLabel(appearance: Appearance) {
  if (!brandSet(appearance)) return BRAND_DEFAULT_NAME
  const { light, dark } = { light: appearance.colors.light.accent, dark: appearance.colors.dark.accent }
  return light === dark ? light : `${light} in Light, ${dark} in Dark`
}

/** DiyaProvider's brandColor: one hex for both themes, a pair, or nothing when no brand is set. */
export function brandColorValue(appearance: Appearance): string | { light: string; dark: string } | null {
  if (!brandSet(appearance)) return null
  const light = appearance.colors.light.accent
  const dark = appearance.colors.dark.accent
  return light === dark ? light : { light, dark }
}

/** `brandColor="#…"` or `brandColor={{ light: '#…', dark: '#…' }}`, ready for JSX. */
export function brandColorAttribute(appearance: Appearance): string | null {
  const value = brandColorValue(appearance)
  if (!value) return null
  return typeof value === 'string' ? `brandColor="${value}"` : `brandColor={{ light: '${value.light}', dark: '${value.dark}' }}`
}

type WebFont = { id: FontId; label: string; packageName: string; family: string }

/** A font that isn't in the package, installed from Fontsource. Null for DIYA Sans and system stacks. */
export function webFont(id: FontId): WebFont | null {
  const font = fonts[id]
  if (!('asset' in font)) return null
  return { id, label: font.label, packageName: `@fontsource-variable/${font.asset}`, family: `${font.label} Variable` }
}

const GENERIC = /,\s*(sans-serif|serif|monospace)\s*$/

/** The `fontFamily` value for DiyaProvider, quoted the way it is written in JSX. */
export function fontFamilyValue(id: FontId): string {
  const font = fonts[id]
  const web = webFont(id)
  if (!web) return font.family.replace(/"/g, "'")
  return `'${web.family}', ${GENERIC.exec(font.family)?.[1] ?? 'sans-serif'}`
}

export type ProviderProp = { name: 'brandColor' | 'fontFamily' | 'glass'; value: string | true; jsx: string }

/** Only the DiyaProvider props this theme changes. */
export function providerProps(appearance: Appearance): ProviderProp[] {
  const props: ProviderProp[] = []
  const brand = brandColorValue(appearance)
  if (brand) props.push({ name: 'brandColor', value: typeof brand === 'string' ? brand : `${brand.light} / ${brand.dark}`, jsx: brandColorAttribute(appearance)! })
  if (appearance.font !== DEFAULT_APPEARANCE.font) {
    const family = fontFamilyValue(appearance.font)
    props.push({ name: 'fontFamily', value: family, jsx: `fontFamily="${family}"` })
  }
  if (appearance.translucent) props.push({ name: 'glass', value: true, jsx: 'glass' })
  return props
}

export function providerSnippet(props: ProviderProp[]): string {
  return `<DiyaProvider\n${props.map((p) => `  ${p.jsx}`).join('\n')}\n>`
}

/**
 * Button's own settings as props. Only what differs from Button's own
 * defaults; the shadow is a catalog preview with no prop yet.
 */
export function buttonProps(options: Record<string, string | boolean>): { snippet: string; shadow: boolean } | null {
  if (!Object.keys(options).length) return null
  const props: string[] = []
  if (options.shape === 'rounded') props.push('shape="rounded"')
  if (options.size === 'small' || options.size === 'large') props.push(`size="${options.size}"`)
  const icon = options.kind === 'icon'
  if (icon) props.push('iconOnly', 'aria-label="Add"')
  const shadow = options.shadow === true
  const open = props.length ? `<Button ${props.join(' ')}>` : '<Button>'
  const snippet = icon ? `${open}\n  <PlusIcon />\n</Button>` : `${open}Save</Button>`
  return { snippet, shadow }
}

/* ---- contrast fixes ---------------------------------------------------- */

export type ContrastFix = { path: AppearancePath; value: string; ratio: number }

const sameIssue = (a: ContrastIssue, b: ContrastIssue) => a.theme === b.theme && a.label === b.label

/**
 * One click that makes a failing pair readable: move one of the pair's
 * settings toward black or white, as little as needed, without making
 * another pair fail. Prefers the setting the person changed.
 */
export function contrastFix(brand: Overrides | null, issue: ContrastIssue): ContrastFix | null {
  const appearance = withOverrides(DEFAULT_APPEARANCE, brand ?? {})
  const before = contrastIssues(appearance)
  const changed = issue.paths.filter((p) => Object.hasOwn(brand ?? {}, p))
  const order = [...changed, ...issue.paths.filter((p) => !changed.includes(p))]
  for (const path of order) {
    const current = getPath(appearance, path)
    if (!isHex(current)) continue
    let best: { value: string; distance: number } | null = null
    for (const toward of ['#000000', '#FFFFFF']) {
      let steps = 0
      const value = ensureContrast(current, [], issue.minimum, toward, (candidate) => {
        steps += 1
        const after = contrastIssues(withOverrides(appearance, { [path]: candidate }))
        return !after.some((a) => sameIssue(a, issue)) && after.length < before.length && after.every((a) => before.some((b) => sameIssue(a, b)))
      })
      const fixed = contrastIssues(withOverrides(appearance, { [path]: value }))
      if (fixed.some((a) => sameIssue(a, issue)) || !fixed.every((a) => before.some((b) => sameIssue(a, b)))) continue
      if (!best || steps < best.distance) best = { value, distance: steps }
    }
    if (best) {
      const pair = contrastPairs(withOverrides(appearance, { [path]: best.value })).find((p) => sameIssue(p, issue))
      return { path, value: best.value, ratio: pair?.ratio ?? issue.minimum }
    }
  }
  return null
}

/* ---- summary ----------------------------------------------------------- */

const CORNER_NAMES: Record<number, string> = { 0: 'Square', 10: 'Soft', 16: 'Round' }
const ELEVATION_NAMES = { flat: 'Flat', soft: 'Soft', lifted: 'Lifted' } as const

export function themeSummary(appearance: Appearance) {
  const statusChanged = (['light', 'dark'] as Theme[]).some(
    (t) => JSON.stringify(appearance.status[t]) !== JSON.stringify(DEFAULT_APPEARANCE.status[t]),
  )
  return {
    brand: brandLabel(appearance),
    brandSet: brandSet(appearance),
    font: fonts[appearance.font].label,
    fontFamily: fonts[appearance.font].family,
    corners: CORNER_NAMES[appearance.corners] ?? `${appearance.corners}px`,
    elevation: ELEVATION_NAMES[appearance.elevation],
    glass: appearance.translucent,
    status: statusChanged ? 'Your own' : 'DIYA defaults',
  }
}

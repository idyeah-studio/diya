import {
  CORNERS_DEFAULT,
  DEFAULT_APPEARANCE,
  statusNames,
  themes,
  type Appearance,
  type Status,
  type Theme,
} from './appearance'
import { composite, contrast, ensureContrast, inkFor, lightness, mix, withAlpha } from './color'

export type Tokens = Record<`--${string}`, string>
/** Output for one theme: public token declarations and, where needed, the colour scheme. */
type ThemeOutput = { tokens: Tokens; colorScheme?: 'light' | 'dark' }

/* How the SDK's own recessed, selected and hover sit against its grounds (styles.css):
   recessed #fafafa on white and #0a0a0b on #111113; hover #…0a and #…10; selected #…12 and #…1c. */
const RECESS = { light: 0.02, dark: 0.4 } as const
const SELECTED_ALPHA = { light: 0x12 / 255, dark: 0x1c / 255 } as const
const HOVER_ALPHA = { light: 0x0a / 255, dark: 0x10 / 255 } as const
const CONTROL_LINE_ALPHA = 0.7
/** How far muted text sits from text toward the background, as in the SDK's own pairs. */
const MUTED_WEIGHT = 0.7

const LIFTED_DEPTH = {
  dark: 'inset 0 1px 0 #ffffff0a, 0 -6px 24px -6px #ffffff24, 0 0 44px -10px #ffffff18, 0 26px 56px -8px #000000c0',
  light: 'inset 0 1px 0 #ffffff80, 0 18px 44px #0000002e',
} as const

/** The SDK's own muted text, used while its inputs are untouched. */
const SDK_MUTED = { light: '#495659', dark: '#BEC8CB' } as const

/**
 * The SDK's hand-tuned status pairs (styles.css). Kept whenever a status is
 * untouched and its tone still reads on the current surfaces.
 */
const SDK_STATUS: Record<Theme, Record<Status, { tone: string; surface: string; ink: string }>> = {
  light: {
    success: { tone: '#0D7A33', surface: '#DFF6E4', ink: '#000000' },
    warning: { tone: '#B34700', surface: '#FFEED3', ink: '#000000' },
    error: { tone: '#D70015', surface: '#FFE7E6', ink: '#FFFFFF' },
    info: { tone: '#0062CC', surface: '#E0EFFF', ink: '#FFFFFF' },
  },
  dark: {
    success: { tone: '#30D158', surface: '#30D1582E', ink: '#000000' },
    warning: { tone: '#FFB340', surface: '#FF9F0A2E', ink: '#000000' },
    error: { tone: '#FF7A72', surface: '#FF453A33', ink: '#000000' },
    info: { tone: '#5EB0FF', surface: '#0A84FF38', ink: '#000000' },
  },
}

const surfacesChanged = (a: Appearance, t: Theme) => {
  const c = a.colors[t]
  const d = DEFAULT_APPEARANCE.colors[t]
  return c.text !== d.text || c.background !== d.background || c.raised !== d.raised
}

/** Alerts paint a 7% tint of the status over raised surfaces (styles.css). */
export function alertBackground(fill: string, raised: string) {
  return mix(fill, raised, 0.07)
}

/** How well the SDK's own pair reads on its own surfaces: the bar it sets for itself. */
function sdkBaseline(theme: Theme, status: Status) {
  const sdk = SDK_STATUS[theme][status]
  const { raised, background } = DEFAULT_APPEARANCE.colors[theme]
  const fill = DEFAULT_APPEARANCE.status[theme][status]
  return Math.min(...[composite(sdk.surface, raised), raised, background].map((bg) => contrast(sdk.tone, bg)), contrast(theme === 'light' ? sdk.tone : fill, alertBackground(fill, raised)))
}

/**
 * Colours for one status. Untouched statuses keep the SDK's tuned pair
 * while it reads at least as well on the current surfaces as it does on
 * the SDK's own (or 4.5:1, whichever is lower); otherwise the pair is
 * derived from the fill so tags, alerts and badges stay legible.
 */
export function statusSet(appearance: Appearance, theme: Theme, status: Status) {
  const fill = appearance.status[theme][status]
  const { background, raised, text } = appearance.colors[theme]
  const sdk = SDK_STATUS[theme][status]
  const untouched = fill === DEFAULT_APPEARANCE.status[theme][status]
  const alertBg = alertBackground(fill, raised)
  /* Nothing this status depends on changed: it is exactly the SDK's own. */
  if (untouched && !surfacesChanged(appearance, theme))
    return { fill, ink: sdk.ink, tone: sdk.tone, surface: sdk.surface, surfaceOnRaised: composite(sdk.surface, raised), alertBg, derived: false, sdkKept: true }
  if (untouched) {
    const onRaised = composite(sdk.surface, raised)
    const bar = Math.min(4.5, sdkBaseline(theme, status) - 0.01)
    const alertInk = theme === 'light' ? sdk.tone : fill
    if ([onRaised, raised, background].every((bg) => contrast(sdk.tone, bg) >= bar) && contrast(alertInk, alertBg) >= bar)
      return { fill, ink: sdk.ink, tone: sdk.tone, surface: sdk.surface, surfaceOnRaised: onRaised, alertBg, derived: false, sdkKept: true }
  }
  const surface = theme === 'light' ? mix(fill, raised, 0.1) : withAlpha(fill, 0.18)
  const surfaceOnRaised = composite(surface, raised)
  const tone = ensureContrast(fill, [surfaceOnRaised, raised, background, alertBg], 4.5, text)
  return { fill, ink: inkFor(fill), tone, surface, surfaceOnRaised, alertBg, derived: true, sdkKept: false }
}

/*
 * The brand maths match the SDK's own (packages/diya/src/internal/brand.ts),
 * so the preview, the theme file and DiyaProvider's brandColor give the same pixels;
 * a test runs both over many colors.
 */
/** Text on the brand: the first of these that reaches 4.5:1. White wins whenever it can. */
const TEXT_ON_BRAND = ['#FAFAFA', '#FFFFFF', '#1C1C1C', '#000000']
/** The dark choice, for anything that names it. */
export const NEAR_BLACK = '#1C1C1C'
// The alphas the soft tint renders at (#…1f and #…33), matching the SDK's brand.ts.
const SOFT_ALPHA = { light: 31 / 255, dark: 51 / 255 } as const

/** Text on a brand fill, as DiyaProvider picks it (WCAG AA, 4.5:1). */
export function textOnBrand(brand: string) {
  return TEXT_ON_BRAND.find((text) => contrast(text, brand) >= 4.5) ?? '#000000'
}

/** Paint `top` at `alpha` over an opaque `ground`, at full precision (no alpha rounding). */
function over(top: string, alpha: number, ground: string) {
  return mix(top, ground, alpha)
}

/**
 * The four public brand tokens for one theme, as DiyaProvider's
 * `brandColor` sets them: the fill, text on it, a soft tint behind
 * brand-tone tags and selected rows, and brand-coloured text that reads at
 * 4.5:1 on the page, on raised surfaces and on the tint.
 */
export function accentSet(appearance: Appearance, theme: Theme) {
  const { accent, background, raised, text } = appearance.colors[theme]
  const alpha = SOFT_ALPHA[theme]
  const soft = withAlpha(accent, alpha)
  const against = [background, raised].flatMap((ground) => [ground, over(accent, alpha, ground)])
  return { accent, text: textOnBrand(accent), soft, ink: ensureContrast(accent, against, 4.5, text) }
}

/** Neutral derivations that follow text, background and raised. */
export function neutralSet(appearance: Appearance, theme: Theme) {
  const { text, background, raised, accent } = appearance.colors[theme]
  const untouched = !surfacesChanged(appearance, theme)
  const keeps = (c: string) =>
    [background, raised].every(
      (bg) => contrast(c, bg) >= 4.5 && contrast(composite(withAlpha(c, CONTROL_LINE_ALPHA), bg), bg) >= 3,
    )
  /* Muted keeps the SDK's relationship to text, then moves back toward
     text only as far as readability (4.5:1) and visible control edges
     (3:1) require. */
  /* With the text colour unchanged, the SDK's own muted (which carries its
     own hue) stays while it still reads on the new surfaces. */
  const sdkMuted = SDK_MUTED[theme]
  const muted = untouched || (text === DEFAULT_APPEARANCE.colors[theme].text && keeps(sdkMuted))
    ? sdkMuted
    : ensureMuted(mix(text, background, MUTED_WEIGHT), text, keeps)
  const darkSurface = lightness(background) < 0.18
  return {
    muted,
    hover: withAlpha(text, HOVER_ALPHA[theme]),
    selected: withAlpha(text, SELECTED_ALPHA[theme]),
    recessed: mix('#000000', background, RECESS[theme]),
    controlLine: withAlpha(muted, CONTROL_LINE_ALPHA),
    accentInk: textOnBrand(accent),
    /* The SDK's glass is white at 5% on dark surfaces, raised at 56% on light ones. */
    glass: darkSurface ? withAlpha('#FFFFFF', 0x0d / 255) : withAlpha(raised, 0x90 / 255),
    darkSurface,
  }
}

function ensureMuted(start: string, text: string, keeps: (c: string) => boolean) {
  if (keeps(start)) return start
  for (let step = 1; step <= 20; step++) {
    const candidate = mix(text, start, step / 20)
    if (keeps(candidate)) return candidate
  }
  return text
}

/**
 * Output for one theme, emitted only where the appearance differs from
 * DIYA's defaults. A derived token is emitted when any of its inputs changed.
 */
export function themeOutput(appearance: Appearance, theme: Theme): ThemeOutput {
  const out: Tokens = {}
  const c = appearance.colors[theme]
  const d = DEFAULT_APPEARANCE.colors[theme]
  const n = neutralSet(appearance, theme)
  const surfaces = surfacesChanged(appearance, theme)
  let colorScheme: ThemeOutput['colorScheme']

  if (c.text !== d.text) out['--diya-color-text'] = c.text
  if (c.background !== d.background) {
    out['--diya-color-surface'] = c.background
    out['--diya-color-recessed'] = n.recessed
  }
  if (c.raised !== d.raised) out['--diya-color-raised'] = c.raised
  if (surfaces) {
    out['--diya-color-muted'] = n.muted
    out['--diya-color-hover'] = n.hover
    out['--diya-color-selected'] = n.selected
    out['--diya-color-glass'] = n.glass
    /* Form controls and scrollbars follow the surface, not the theme name. */
    if (n.darkSurface !== (theme === 'dark')) colorScheme = n.darkSurface ? 'dark' : 'light'
  }
  if (c.accent !== d.accent) {
    const brand = accentSet(appearance, theme)
    out['--diya-color-accent'] = brand.accent
    out['--diya-color-accent-text'] = brand.text
    out['--diya-color-accent-soft'] = brand.soft
    out['--diya-color-accent-ink'] = brand.ink
  }
  if (c.lines !== d.lines) out['--diya-color-line'] = c.lines

  for (const status of statusNames) {
    const s = statusSet(appearance, theme, status)
    if (!s.derived) continue
    out[`--diya-color-${status}`] = s.tone
    out[`--diya-color-${status}-surface`] = s.surface
    out[`--diya-color-${status}-fill`] = s.fill
    out[`--diya-color-${status}-on-fill`] = s.ink
    /* Invalid fields and destructive actions draw in the error tone. */
    if (status === 'error') out['--diya-color-destructive'] = s.tone
  }

  /* Popups and tables scale with --diya-elevation (see sharedTokens). */
  if (appearance.elevation === 'flat') out['--diya-shadow-raised'] = 'none'
  else if (appearance.elevation === 'lifted') out['--diya-shadow-raised'] = LIFTED_DEPTH[theme]
  return { tokens: out, colorScheme }
}

/** Token declarations for one theme (for callers that only need tokens). */
export function themeTokens(appearance: Appearance, theme: Theme): Tokens {
  return themeOutput(appearance, theme).tokens
}

/** Tokens that do not depend on the theme. */
export function sharedTokens(appearance: Appearance): Tokens {
  const out: Tokens = {}
  if (appearance.corners !== CORNERS_DEFAULT)
    out['--diya-corner-scale'] = String(Math.round((appearance.corners / CORNERS_DEFAULT) * 100) / 100)
  if (appearance.elevation === 'flat') out['--diya-elevation'] = '0'
  else if (appearance.elevation === 'lifted') out['--diya-elevation'] = '1.6'
  return out
}

const block = (selector: string, tokens: Record<string, string>, indent: string) => {
  const entries = Object.entries(tokens)
  if (!entries.length) return ''
  return `${indent}${selector} {\n${entries.map(([k, v]) => `${indent}  ${k}: ${v};`).join('\n')}\n${indent}}\n`
}

/**
 * A scoped stylesheet for an appearance. `scope` must select the
 * `.diya-root` element (for example `.diya-root.customize-scope--tabs`, or
 * `.diya-root.diya-root` in a download). Colour rules sit inside
 * `@media (forced-colors: none)`, as the SDK's own colour rules do, so
 * forced colours still win; glass and reduced transparency derive from
 * these base tokens, so they keep working. `accent: false` leaves the
 * `--diya-color-accent*` tokens to DiyaProvider's brandColor.
 */
export function appearanceCss(appearance: Appearance, scope: string, { accent = true }: { accent?: boolean } = {}): string {
  const shared = block(scope, sharedTokens(appearance), '')
  const declarations = (t: Theme) => {
    const o = themeOutput(appearance, t)
    const tokens = accent ? o.tokens : Object.fromEntries(Object.entries(o.tokens).filter(([name]) => !name.startsWith('--diya-color-accent')))
    return { ...tokens, ...(o.colorScheme ? { 'color-scheme': o.colorScheme } : {}) }
  }
  const themed = themes.map((t) => block(`${scope}[data-theme='${t}']`, declarations(t), '  ')).join('')
  /* theme="system" (the provider's default) follows the OS, as the SDK's own rules do. */
  const system = themes
    .map((t) => {
      const rule = block(`${scope}[data-theme='system']`, declarations(t), '  ')
      return rule ? `@media (forced-colors: none) and (prefers-color-scheme: ${t}) {\n${rule}}\n` : ''
    })
    .join('')
  return shared + (themed ? `@media (forced-colors: none) {\n${themed}}\n${system}` : '')
}

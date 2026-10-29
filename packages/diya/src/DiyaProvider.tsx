'use client'
import { createContext, forwardRef, useContext, useMemo, useState, useSyncExternalStore, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import type { DiyaMessages, DiyaMessagesInput } from './messages.js'
import { LinkComponentContext, type DiyaLinkComponent } from './internal/link.js'
import { cx } from './internal/cx.js'
import { resolveBrand, type DiyaBrandTokens } from './internal/brand.js'

/** DIYA Sans ships with the stylesheet; a metric-matched Arial covers the moment before it loads. */
export const DEFAULT_FONT_FAMILY = '"DIYA Sans", "DIYA Sans Fallback", Arial, sans-serif'
const DEFAULT_BRAND = resolveBrand(undefined)
const PortalContext = createContext<HTMLElement | null>(null)

/** What a DIYA provider resolved, for code that draws its own pixels, such as charts. */
export type DiyaAppearance = {
  /** The theme in effect. With `theme="system"` it is 'light' on the server and follows the OS from mount. */
  theme: 'light' | 'dark'
  /** Whether Glass is on. */
  glass: boolean
  /** The CSS font-family stack components use. */
  fontFamily: string
  /** The accent tokens for the theme in effect, as hex. */
  brand: DiyaBrandTokens
}
const AppearanceContext = createContext<DiyaAppearance>({ theme: 'light', glass: false, fontFamily: DEFAULT_FONT_FAMILY, brand: DEFAULT_BRAND.light })
export function useDiyaPortal() { return useContext(PortalContext) }
/** The nearest provider's resolved theme, Glass, font and brand accent. */
export function useDiyaAppearance() { return useContext(AppearanceContext) }
const MessagesContext = createContext<{ overrides: DiyaMessagesInput; locale?: string }>({ overrides: {} })
/** A nested provider adds to its parent's strings; a key set to undefined keeps the inherited one. */
function mergeMessages(parent: DiyaMessagesInput, own: DiyaMessagesInput | undefined): DiyaMessagesInput {
  if (!own) return parent
  const out: Record<string, object> = { ...parent }
  for (const [component, strings] of Object.entries(own)) {
    if (!strings) continue
    const kept = Object.fromEntries(Object.entries(strings).filter(([, value]) => value !== undefined))
    out[component] = { ...(out[component] ?? {}), ...kept }
  }
  return out as DiyaMessagesInput
}
/** A component's built-in strings, with any provider overrides applied. */
export function useDiyaMessages<K extends keyof DiyaMessages>(component: K, defaults: DiyaMessages[K]): DiyaMessages[K] {
  const override = useContext(MessagesContext).overrides[component] as object | undefined
  // Cast through object: a bundle without translatable components has an empty map.
  return useMemo(() => (override ? ({ ...(defaults as object), ...override } as DiyaMessages[K]) : defaults), [defaults, override])
}
/** BCP 47 locale for dates and numbers. */
export function useDiyaLocale() { return useContext(MessagesContext).locale ?? 'en-US' }

// theme="system" is pure CSS (prefers-color-scheme); this only tells JavaScript which one won.
const DARK_QUERY = '(prefers-color-scheme: dark)'
const media = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : undefined)
function subscribeToScheme(onChange: () => void) {
  const query = media()
  query?.addEventListener?.('change', onChange)
  return () => query?.removeEventListener?.('change', onChange)
}
const ignoreScheme = () => () => {}
const prefersDark = () => media()?.matches ?? false
const serverPrefersDark = () => false

export type DiyaProviderProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** The app or section that uses DIYA components; popups, tooltips and toasts render only inside a provider. */
  children: ReactNode
  /** Color scheme for everything inside. 'system' follows the visitor's OS setting in CSS, with no flash. Defaults to 'system'. */
  theme?: 'light' | 'dark' | 'system'
  /** Paints the provider's own background and text color, so DIYA reads on any page. Set false when your layout paints the ground. Defaults to true. */
  surface?: boolean
  /** Gives headers, popups and tabs a translucent, blurred finish where the browser supports it. Defaults to false. */
  glass?: boolean
  /** Your brand as a hex color, or one per theme as `{ light, dark }`. It fills main buttons, selected pills, switches, sliders and progress, and leads chart series 1 when it has color; text on it is white whenever that reads. Defaults to DIYA's neutral ink. */
  brandColor?: string | { light: string; dark: string }
  /** CSS font-family stack for every component. Defaults to DIYA Sans with a metric-matched fallback. */
  fontFamily?: string
  /** Replace any built-in string, by component: `{ table: { emptyTitle: 'Nothing here' } }`. A nested provider inherits its parent's strings and overrides only what it sets. */
  messages?: DiyaMessagesInput
  /** Locale for dates and numbers, e.g. 'en-GB'. Defaults to the parent provider's, then 'en-US'. */
  locale?: string
  /** Router link for every DIYA item with an `href` (Side Navigation, Breadcrumbs, Menu, Button), such as Next.js `Link`. Defaults to a plain anchor; a nested provider inherits it. */
  linkComponent?: DiyaLinkComponent
  /** Extra class on the provider's wrapper element. */
  className?: string
  /** Inline styles on the wrapper, such as public `--diya-*` token overrides. */
  style?: CSSProperties
}
/** Scoped appearance; no document mutation, cookies, network calls or global CSS. */
export const DiyaProvider = forwardRef<HTMLDivElement, DiyaProviderProps>(function DiyaProvider({ children, theme = 'system', surface = true, glass = false, brandColor, fontFamily = DEFAULT_FONT_FAMILY, messages, locale, linkComponent, className, style, ...rest }, ref) {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const parent = useContext(MessagesContext)
  const parentLink = useContext(LinkComponentContext)
  const text = useMemo(() => ({ overrides: mergeMessages(parent.overrides, messages), locale: locale ?? parent.locale }), [parent, messages, locale])
  const dark = useSyncExternalStore(theme === 'system' ? subscribeToScheme : ignoreScheme, prefersDark, serverPrefersDark)
  const resolved = theme === 'system' ? (dark ? 'dark' : 'light') : theme
  const brandKey = typeof brandColor === 'object' ? `${brandColor.light}|${brandColor.dark}` : brandColor
  const brand = useMemo(() => (brandColor === undefined ? DEFAULT_BRAND : resolveBrand(brandColor)), [brandKey])
  const appearance = useMemo(() => ({ theme: resolved, glass, fontFamily, brand: brand[resolved] }), [resolved, glass, fontFamily, brand])
  const tokens = {
    '--diya-font': fontFamily,
    ...accentVariables(brand),
    ...style,
  } as CSSProperties
  return <div {...rest} ref={ref} className={cx('diya-root', className)} data-theme={theme} data-glass={String(glass)} data-surface={String(surface)} style={tokens}>
    <AppearanceContext.Provider value={appearance}><MessagesContext.Provider value={text}><PortalContext.Provider value={portal}><LinkComponentContext.Provider value={linkComponent ?? parentLink}>{children}</LinkComponentContext.Provider><div className="diya-portal-root" ref={setPortal} /></PortalContext.Provider></MessagesContext.Provider></AppearanceContext.Provider>
  </div>
})

/** Both themes' accent tokens as private variables; styles.css picks the pair for the theme in effect. */
function accentVariables(brand: Record<'light' | 'dark', DiyaBrandTokens>) {
  const out: Record<string, string> = {}
  for (const theme of ['light', 'dark'] as const) {
    const { accent, accentText, accentSoft, accentInk } = brand[theme]
    out[`--diya-internal-accent-${theme}`] = accent
    out[`--diya-internal-accent-text-${theme}`] = accentText
    out[`--diya-internal-accent-soft-${theme}`] = accentSoft
    out[`--diya-internal-accent-ink-${theme}`] = accentInk
  }
  return out
}

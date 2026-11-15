'use client'
import { createContext, forwardRef, useContext, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import type { DiyaMessages, DiyaMessagesInput } from './messages.js'
import { LinkComponentContext, type DiyaLinkComponent } from './internal/link.js'
import { cx } from './internal/cx.js'
import { resolveBrand, type DiyaBrandTokens } from './internal/brand.js'
import { useClientLayoutEffect } from './internal/layout-effect.js'
import { watchPresses } from './internal/opener.js'
import { composeRefs } from './internal/slot.js'
import { motionTokens } from './toast/host.js'
import { ToastStack } from './toast/ToastStack.js'
import { addProviderRoot, removeProviderRoot, type ToastLook } from './toast/queue.js'

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
  /** How much DIYA moves: 'full', 'reduced' (fades only) or 'off'. With `motion="system"` it is 'full' on the server and follows the device's Reduce Motion setting from mount. */
  motion: 'full' | 'reduced' | 'off'
}
const AppearanceContext = createContext<DiyaAppearance>({ theme: 'light', glass: false, fontFamily: DEFAULT_FONT_FAMILY, brand: DEFAULT_BRAND.light, motion: 'full' })
type MotionSetting = 'system' | 'reduced' | 'off'
// The motion setting in effect, which a nested provider inherits.
const MotionContext = createContext<MotionSetting>('system')
// Whether a DIYA provider is above: toast() shows in the outermost one.
const NestedContext = createContext(false)
/** Internal: the nearest provider, how it looks and how it moves, for its <Toast>s in the page's one stack. */
export const ToastScopeContext = createContext<{ owner: object; look: ToastLook; motion: () => Record<string, string> | undefined } | null>(null)
export function useDiyaPortal() { return useContext(PortalContext) }
// Where other libraries' popups should render: the provider's portal, or an open Dialog or
// Drawer's own element, which they set for their children. The nearest one wins.
export const PortalContainerContext = createContext<HTMLElement | null>(null)
/**
 * Where a popup from another library should render so it works here: inside an open Dialog or
 * Drawer, that modal's element; anywhere else, the nearest DiyaProvider's portal, so popups
 * follow its theme. Null outside a provider and until the provider has mounted, which popup
 * libraries treat as document.body.
 * @since 1.2.0
 */
export function useDiyaPortalContainer(): HTMLElement | null { return useContext(PortalContainerContext) }
/** The nearest provider's resolved theme, Glass, font, brand accent and motion. */
export function useDiyaAppearance() { return useContext(AppearanceContext) }
/** How much DIYA moves inside the nearest provider: 'full', 'reduced' or 'off'. */
export function useDiyaMotion() { return useContext(AppearanceContext).motion }
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

// theme="system" and motion="system" are pure CSS (prefers-color-scheme, prefers-reduced-motion);
// this only tells JavaScript which one won. The server, and hydration, assume light and full motion.
function mediaQuery(query: string) {
  const list = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query) : undefined)
  return {
    subscribe(onChange: () => void) {
      const media = list()
      media?.addEventListener?.('change', onChange)
      return () => media?.removeEventListener?.('change', onChange)
    },
    matches: () => list()?.matches ?? false,
  }
}
const darkScheme = mediaQuery('(prefers-color-scheme: dark)')
const reducedMotion = mediaQuery('(prefers-reduced-motion: reduce)')
const ignoreMedia = () => () => {}
const onServer = () => false

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
  /**
   * How much DIYA moves. 'system' animates and follows the device's Reduce Motion setting; 'reduced' never slides or scales, only fades; 'off' changes everything at once, with 1.0's timing. Defaults to the parent provider's, then 'system'.
   * @since 1.1.0
   */
  motion?: 'system' | 'reduced' | 'off'
  /** Router link for every DIYA item with an `href` (Side Navigation, Breadcrumbs, Menu, Button), such as Next.js `Link`. Defaults to a plain anchor; a nested provider inherits it. */
  linkComponent?: DiyaLinkComponent
  /** Extra class on the provider's wrapper element. */
  className?: string
  /** Inline styles on the wrapper, such as public `--diya-*` token overrides. */
  style?: CSSProperties
}
/** Scoped appearance; no document mutation, cookies, network calls or global CSS. */
export const DiyaProvider = forwardRef<HTMLDivElement, DiyaProviderProps>(function DiyaProvider({ children, theme = 'system', surface = true, glass = false, brandColor, fontFamily = DEFAULT_FONT_FAMILY, messages, locale, motion, linkComponent, className, style, ...rest }, ref) {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const [owner] = useState(() => ({}))
  const self = useRef<HTMLDivElement | null>(null)
  const setRoot = useMemo(() => composeRefs<HTMLDivElement>(self, ref), [ref])
  // This provider marks its element for its React's toast stack, so a provider of the same React
  // inside it makes no stack of its own, while another React's app inside it still does (S5).
  // Every provider in a commit has marked its element before any stack checks: a stack makes its
  // host only once its portal (set from a ref, so a commit later) exists.
  useClientLayoutEffect(() => {
    const element = self.current
    if (!element) return
    addProviderRoot(element)
    // Remember presses from the start, so a Dialog or Drawer mounted by its opener's own click
    // can give focus back to that opener in Safari, whose clicks don't focus buttons (G7).
    watchPresses(element.ownerDocument)
    return () => removeProviderRoot(element)
  }, [])
  // How this provider moves, as resolved here (its motion setting, its duration scale and any set
  // above it), for its <Toast>s, which animate in the page's one stack (R2).
  const [motionOf] = useState(() => () => motionTokens(self.current))
  const parent = useContext(MessagesContext)
  const parentLink = useContext(LinkComponentContext)
  const text = useMemo(() => ({ overrides: mergeMessages(parent.overrides, messages), locale: locale ?? parent.locale }), [parent, messages, locale])
  const dark = useSyncExternalStore(theme === 'system' ? darkScheme.subscribe : ignoreMedia, darkScheme.matches, onServer)
  const resolved = theme === 'system' ? (dark ? 'dark' : 'light') : theme
  const parentMotion = useContext(MotionContext)
  const nested = useContext(NestedContext)
  const motionSetting = motion ?? parentMotion
  const reduce = useSyncExternalStore(motionSetting === 'system' ? reducedMotion.subscribe : ignoreMedia, reducedMotion.matches, onServer)
  const resolvedMotion: DiyaAppearance['motion'] = motionSetting === 'system' ? (reduce ? 'reduced' : 'full') : motionSetting
  const brandKey = typeof brandColor === 'object' ? `${brandColor.light}|${brandColor.dark}` : brandColor
  const brand = useMemo(() => (brandColor === undefined ? DEFAULT_BRAND : resolveBrand(brandColor)), [brandKey])
  const appearance = useMemo(() => ({ theme: resolved, glass, fontFamily, brand: brand[resolved], motion: resolvedMotion }), [resolved, glass, fontFamily, brand, resolvedMotion])
  // When the theme changes, transitions pause for the frame that paints it, so controls change
  // with the page instead of easing behind it. The pause is rendered in the same commit as the
  // new theme, so it's in place before any component reads layout in its own effects.
  const [painted, setPainted] = useState(resolved)
  const changing = painted !== resolved
  useClientLayoutEffect(() => {
    if (!changing) return
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => setPainted(resolved)) })
    return () => cancelAnimationFrame(frame)
  }, [changing, resolved])
  const tokens = {
    '--diya-font': fontFamily,
    ...accentVariables(brand),
    ...style,
  } as CSSProperties
  const styleKey = JSON.stringify(tokens)
  const scope = useMemo(() => ({ owner, look: { theme, glass: String(glass), motion: motionSetting, className, style: tokens as Record<string, unknown> }, motion: motionOf }), [owner, theme, glass, motionSetting, className, styleKey])
  return <div {...rest} ref={setRoot} className={cx('diya-root', className)} data-theme={theme} data-theme-change={changing ? '' : undefined} data-glass={String(glass)} data-surface={String(surface)} data-motion={motionSetting} style={tokens}>
    <AppearanceContext.Provider value={appearance}><MotionContext.Provider value={motionSetting}><MessagesContext.Provider value={text}><PortalContext.Provider value={portal}><PortalContainerContext.Provider value={portal}><LinkComponentContext.Provider value={linkComponent ?? parentLink}><NestedContext.Provider value={true}><ToastScopeContext.Provider value={scope}>{children}</ToastScopeContext.Provider></NestedContext.Provider></LinkComponentContext.Provider></PortalContainerContext.Provider><div className="diya-portal-root" ref={setPortal}><ToastStack portal={portal} outermost={!nested} owner={owner} /></div></PortalContext.Provider></MessagesContext.Provider></MotionContext.Provider></AppearanceContext.Provider>
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

'use client'
import { forwardRef, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode, type MouseEvent, type Ref } from 'react'
import { DEFAULT_FONT_FAMILY, useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { useDiyaLinkComponent } from '../internal/link.js'
import { composeRefs } from '../internal/slot.js'
import { Button } from '../button/Button.js'
import { Search } from '../search/Search.js'
import { siteHeaderMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    siteHeader: typeof siteHeaderMessages
  }
}
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

type HeaderLayout = { compact: boolean; stacked: boolean; toolsWrap: boolean }
type FocusRecovery = { node: HTMLElement; navigationValue?: string; toggle: boolean }

function pixels(value: string, fallback = 0) {
  const number = Number.parseFloat(value)
  return Number.isFinite(number) ? number : fallback
}
/** Measure actual slot contents rather than the extra space allocated to a wrapping row. */
function contentWidth(node: HTMLElement | null) {
  if (!node) return 0
  const style = getComputedStyle(node)
  const padding = pixels(style.paddingLeft) + pixels(style.paddingRight) + pixels(style.borderLeftWidth) + pixels(style.borderRightWidth)
  const children = Array.from(node.children) as HTMLElement[]
  const hasText = Array.from(node.childNodes).some(child => child.nodeType === 3 && child.textContent?.trim())
  if (children.length && !hasText) {
    const width = children.reduce((total, child) => total + Math.max(child.scrollWidth, child.getBoundingClientRect().width), 0)
    if (width) return width + Math.max(0, children.length - 1) * pixels(style.columnGap || style.gap) + padding
  }
  const range = node.ownerDocument.createRange()
  range.selectNodeContents(node)
  const width = typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect().width : 0
  return width ? width + padding : Math.max(node.scrollWidth, node.getBoundingClientRect().width)
}

export type SiteHeaderItem = {
  /** Stable key; matched against the header's `value` and passed to `onValueChange`. */
  value: string
  /** Visible link text. */
  label: string
  /** Renders a real link through the provider's `linkComponent`; plain clicks call `onValueChange` instead of navigating when it is given. */
  href?: string
  /** Shows the item but prevents choosing it. */
  disabled?: boolean
}
export type SiteHeaderProps = HTMLAttributes<HTMLDivElement> & {
  /** Logo or product name at the start of the header. */
  brand: ReactNode
  /** Accessible name of the brand link or button (not shown); defaults to "Home". */
  brandLabel?: string
  /** Makes the brand a link to this URL, through the provider's `linkComponent`. */
  brandHref?: string
  /** Makes the brand a button that calls this, when there is no `brandHref`. */
  onBrandClick?: () => void
  /** Top-level navigation links; they collapse into a menu button when space runs out. */
  items?: SiteHeaderItem[]
  /** The current item's `value`; it is marked as the current page. */
  value?: string
  /** Called with an item's `value` when it is chosen; routing belongs to the caller. */
  onValueChange?: (value: string) => void
  /** Accessible name for the navigation landmark (not shown); defaults to "Main navigation". */
  navigationLabel?: string
  /** Adds a search field; the caller owns its text. */
  search?: {
    /** The search field's text. */
    value: string
    /** Called with the new text on every keystroke. */
    onValueChange: (value: string) => void
    /** Called with the text when the person presses Enter. */
    onSubmit?: (value: string) => void
    /** Accessible name for the field and search landmark (not shown); defaults to "Search". */
    label?: string
    /** Placeholder text; defaults to "Search". */
    placeholder?: string
  }
  /** Slot for icon buttons such as notifications or help, before the avatar. */
  utilities?: ReactNode
  /** Slot at the end for the account avatar or its menu. */
  avatar?: ReactNode
}

/** A responsive top bar with brand, navigation, search and utilities that collapses its links into a menu when space runs out. The ref, `className`, `style` and other attributes go to the outer container. */
export const SiteHeader = forwardRef<HTMLDivElement, SiteHeaderProps>(function SiteHeader({
  brand,
  brandLabel,
  brandHref,
  onBrandClick,
  items = [],
  value,
  onValueChange,
  navigationLabel,
  search,
  utilities,
  avatar,
  className,
  onFocusCapture,
  onBlurCapture,
  onKeyDown,
  ...props
}, ref) {
  const t = useDiyaMessages('siteHeader', siteHeaderMessages)
  const Link = useDiyaLinkComponent()
  const [open, setOpen] = useState(false)
  const [layout, setLayout] = useState<HeaderLayout>({ compact: false, stacked: false, toolsWrap: false })
  const currentLayout = useRef(layout)
  const container = useRef<HTMLDivElement | null>(null)
  const setContainer = useMemo(() => composeRefs<HTMLDivElement>(container, ref as Ref<HTMLDivElement>), [ref])
  const headerNode = useRef<HTMLElement | null>(null)
  const brandNode = useRef<HTMLElement | null>(null)
  const navigation = useRef<HTMLElement | null>(null)
  const tools = useRef<HTMLDivElement | null>(null)
  const account = useRef<HTMLDivElement | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const pendingFocus = useRef<FocusRecovery | null>(null)
  const textMeasure = useRef<CanvasRenderingContext2D | null>(null)
  const id = useId()
  const navigationKey = JSON.stringify(items)
  // A router link that doesn't forward refs still gets measured.
  function brandElement() {
    return brandNode.current ?? container.current?.querySelector<HTMLElement>('.diya-site-brand') ?? null
  }
  function remainingControl() {
    const controls = Array.from(container.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? [])
    return controls.find(node => !node.closest('[hidden], [inert]')) ?? headerNode.current
  }
  useClientLayoutEffect(() => {
    const node = container.current
    if (!node) return
    let active = true
    // Navigation labels are strings. Canvas measures their real font even while
    // collapsed, without exposing duplicate links or temporarily hiding focused nodes.
    if (!textMeasure.current) {
      try { textMeasure.current = node.ownerDocument.createElement('canvas').getContext('2d') }
      catch { /* A conservative text-width fallback covers unavailable Canvas contexts. */ }
    }
    function measure() {
      if (!active || !node) return
      const width = node.getBoundingClientRect().width
      if (!width) return
      const style = getComputedStyle(node)
      const token = (name: string, fallback: number) => pixels(style.getPropertyValue(name), fallback)
      const fullInset = token('--diya-internal-site-full-inset', 24)
      const compactInset = token('--diya-internal-site-compact-inset', 16)
      const brandGap = token('--diya-internal-site-brand-nav-gap', 32)
      const spacer = token('--diya-internal-site-header-spacer', 24)
      const groupGap = token('--diya-internal-site-utilities-gap', 16)
      const compactGap = token('--diya-internal-site-compact-gap', 8)
      const searchWidth = search ? token('--diya-internal-site-search-min-width', 160) : 0
      const brandWidth = contentWidth(brandElement())
      const toolsWidth = contentWidth(tools.current)
      const accountWidth = contentWidth(account.current)
      const controls = [toolsWidth, accountWidth].filter(value => value > 0)
      const nav = navigation.current
      const navItems = Array.from(nav?.querySelectorAll<HTMLElement>('[data-navigation-value]') ?? [])
      const navWidth = navItems.reduce((total, item) => {
        const itemStyle = getComputedStyle(item)
        const label = item.textContent ?? ''
        const context = textMeasure.current
        if (context) context.font = itemStyle.font || `${itemStyle.fontWeight || '400'} ${itemStyle.fontSize || '14px'} ${itemStyle.fontFamily || DEFAULT_FONT_FAMILY}`
        const textWidth = context?.measureText(label).width ?? label.length * pixels(itemStyle.fontSize, 14)
        return total + textWidth + Math.max(0, Array.from(label).length - 1) * pixels(itemStyle.letterSpacing) +
          pixels(itemStyle.paddingLeft) + pixels(itemStyle.paddingRight) + pixels(itemStyle.borderLeftWidth) + pixels(itemStyle.borderRightWidth)
      }, 0) + Math.max(0, navItems.length - 1) * (nav ? pixels(getComputedStyle(nav).columnGap || getComputedStyle(nav).gap, 4) : 0)
      const trailing = [searchWidth, ...controls].filter(value => value > 0)
      const trailingWidth = trailing.reduce((total, value) => total + value, 0) + Math.max(0, trailing.length - 1) * groupGap
      const fullWidth = brandWidth + (items.length ? brandGap + navWidth : 0) + (trailing.length ? spacer + trailingWidth : 0) + fullInset * 2
      const compact = width <= 640 || fullWidth > width
      const compactControls = [...controls, ...(compact && items.length ? [40] : [])]
      const compactControlWidth = compactControls.reduce((total, value) => total + value, 0)
      const inlineGroups = [searchWidth, ...compactControls].filter(value => value > 0)
      const inlineWidth = brandWidth + (inlineGroups.length ? spacer : 0) + inlineGroups.reduce((total, value) => total + value, 0) + Math.max(0, inlineGroups.length - 1) * groupGap + fullInset * 2
      const stacked = width <= 640 || (compact && inlineWidth > width)
      const primaryWidth = brandWidth + (compactControls.length ? compactGap : 0) + compactControlWidth + Math.max(0, compactControls.length - 1) * compactGap + compactInset * 2
      const toolsWrap = stacked && !!utilities && primaryWidth > width
      const next = { compact, stacked, toolsWrap }
      const previous = currentLayout.current
      if (previous.compact === compact && previous.stacked === stacked && previous.toolsWrap === toolsWrap) return
      const focused = node.ownerDocument.activeElement
      if (focused instanceof HTMLElement && node.contains(focused)) {
        pendingFocus.current = { node: focused, navigationValue: navigation.current?.contains(focused) ? focused.dataset.navigationValue : undefined, toggle: focused === trigger.current }
      }
      currentLayout.current = next
      setOpen(false)
      setLayout(next)
    }
    measure()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    ;[node, brandElement(), navigation.current, tools.current, account.current].forEach(element => { if (element) observer?.observe(element) })
    window.addEventListener('resize', measure)
    const fonts = node.ownerDocument.fonts
    fonts?.addEventListener('loadingdone', measure)
    void fonts?.ready.then(measure)
    return () => {
      active = false
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      fonts?.removeEventListener('loadingdone', measure)
    }
  }, [navigationKey, brand, !!search, utilities, avatar, layout.compact, layout.stacked, layout.toolsWrap])
  useClientLayoutEffect(() => {
    if (layout !== currentLayout.current) return
    const recovery = pendingFocus.current
    pendingFocus.current = null
    const firstLink = navigation.current?.querySelector<HTMLElement>('a[href], button:not(:disabled)')
    if (recovery) {
      const matching = Array.from(navigation.current?.querySelectorAll<HTMLElement>('[data-navigation-value]') ?? []).find(node => node.dataset.navigationValue === recovery.navigationValue && !node.matches(':disabled'))
      const destination = recovery.navigationValue !== undefined
        ? layout.compact ? trigger.current ?? remainingControl() : matching ?? firstLink ?? remainingControl()
        : recovery.toggle && !layout.compact ? firstLink ?? remainingControl()
          : recovery.node.isConnected ? recovery.node : trigger.current ?? remainingControl()
      destination?.focus({ preventScroll: true })
    } else if (lastFocus.current && !lastFocus.current.isConnected && document.activeElement === document.body) {
      ;(trigger.current ?? remainingControl())?.focus({ preventScroll: true })
    }
    if (!items.length) setOpen(false)
  }, [layout, navigationKey])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  function select(item: SiteHeaderItem) {
    if (item.disabled) return
    if (open) {
      setOpen(false)
      trigger.current?.focus()
    }
    onValueChange?.(item.value)
  }
  function links() {
    return items.map((item) =>
      item.href && !item.disabled ? (
        <Link
          key={item.value}
          href={item.href}
          data-navigation-value={item.value}
          aria-current={value === item.value ? 'page' : undefined}
          onClick={(event: MouseEvent<HTMLAnchorElement>) => {
            if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
              return
            if (onValueChange) event.preventDefault()
            select(item)
          }}
        >
          {item.label}
        </Link>
      ) : (
        <button
          key={item.value}
          type="button"
          disabled={item.disabled}
          data-navigation-value={item.value}
          aria-current={value === item.value ? 'page' : undefined}
          onClick={() => select(item)}
        >
          {item.label}
        </button>
      )
    )
  }
  const nav = !!items.length && <nav key="navigation" ref={navigation} id={id}
    className={`diya-site-nav${layout.compact ? ' diya-site-mobile-nav' : ''}`}
    aria-label={navigationLabel ?? t.navigation} hidden={layout.compact && !open}>{links()}</nav>
  const searchForm = search && <form key="search" className="diya-site-search" role="search"
    aria-label={search.label ?? t.search} onSubmit={event => { event.preventDefault(); search.onSubmit?.(search.value) }}>
    <Search label={search.label ?? t.search} hideLabel placeholder={search.placeholder ?? t.search}
      value={search.value} onValueChange={search.onValueChange} clearable shape="rounded" />
  </form>
  const toolsGroup = utilities && <div key="tools" ref={tools} className="diya-site-tools">{utilities}</div>
  const avatarGroup = avatar && <div key="avatar" ref={account} className="diya-site-avatar">{avatar}</div>
  const toggle = layout.compact && !!items.length && <Button key="toggle" ref={trigger}
    className="diya-site-menu-toggle" variant="quiet" iconOnly
    aria-label={open ? t.closeNavigation : t.openNavigation} aria-expanded={open} aria-controls={id}
    onClick={() => setOpen(previous => !previous)}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d={open ? 'm6 6 12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'} />
    </svg>
  </Button>
  const utilityGroup = (utilities || avatar || toggle) && <div key="utilities" className="diya-site-utilities">
    {layout.toolsWrap ? <>{avatarGroup}{toggle}{toolsGroup}</> : <>{toolsGroup}{avatarGroup}{toggle}</>}
  </div>
  return (
    <div {...props} ref={setContainer} className={cx('diya-site-header-container', className)}
      data-compact={layout.compact} data-stacked={layout.stacked} data-tools-wrap={layout.toolsWrap}
      onFocusCapture={event => { onFocusCapture?.(event); lastFocus.current = event.target as HTMLElement }}
      onBlurCapture={event => {
        onBlurCapture?.(event)
        if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !pendingFocus.current) {
          setOpen(false)
          lastFocus.current = null
        }
      }}
      onKeyDown={event => {
        onKeyDown?.(event)
        if (open && event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault()
          setOpen(false)
          trigger.current?.focus()
        }
      }}>
      <header ref={headerNode} tabIndex={-1} className="diya-site-header">
        <div className="diya-site-header-row">
          <div className="diya-site-identity">
            {brandHref ? (
              <Link ref={(node: HTMLAnchorElement | null) => { brandNode.current = node }} className="diya-site-brand" href={brandHref} aria-label={brandLabel ?? t.home}>
                {brand}
              </Link>
            ) : onBrandClick ? (
              <button
                ref={node => { brandNode.current = node }}
                type="button"
                className="diya-site-brand"
                aria-label={brandLabel ?? t.home}
                onClick={onBrandClick}
              >
                {brand}
              </button>
            ) : (
              <span ref={node => { brandNode.current = node }} className="diya-site-brand">{brand}</span>
            )}
            {!layout.compact && nav}
          </div>
          {layout.stacked ? <>{utilityGroup}{searchForm}</> : <>{searchForm}{utilityGroup}</>}
          {layout.compact && nav}
        </div>
      </header>
    </div>
  )
})

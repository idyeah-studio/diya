'use client'
import Link from 'next/link'
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Appearance, useAppearance } from '../../app/Appearance'
import { FlameMark } from './FlameMark'
import { InstallChip } from './InstallChip'
import { GITHUB_URL, NPM_URL, GitHubIcon } from './links'
import { SiteStyles } from './SiteStyles'
import { SYSTEM_THEME_SCRIPT } from './system-theme'

export type SiteHeaderProps = {
  /** The library area this page belongs to; that link gets `aria-current="page"`. */
  current?: 'components' | 'patterns'
  /**
   * Id of the element the header floats over (the landing hero): the install
   * chip appears once it scrolls away. Omit it elsewhere: no chip. On every
   * page the header is clear at the top and turns solid once content scrolls
   * under it.
   */
  heroId?: string
}

/**
 * The site header, option C: wordmark | Components · Patterns | GitHub · Appearance.
 * Relight (the DIYA Pro waitlist) never appears here. On phones, GitHub, npm, Copy install and
 * Appearance move into a menu sheet. Needs an AppearanceProvider above it and
 * a DIYA provider (`.diya-root`) for its colors.
 *
 * <SiteHeader heroId="hero" />            // the landing
 * <SiteHeader current="patterns" />       // a catalog page
 */
export function SiteHeader({ current, heroId }: SiteHeaderProps) {
  const [pastHero, setPastHero] = useState(!heroId)
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const header = useRef<HTMLElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const sheetId = useId()

  useEffect(() => {
    const hero = heroId ? document.getElementById(heroId) : null
    if (!hero || !('IntersectionObserver' in window)) return setPastHero(true)
    const height = header.current?.offsetHeight ?? 72
    const observer = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting), {
      rootMargin: `-${height}px 0px 0px 0px`,
    })
    observer.observe(hero)
    return () => observer.disconnect()
  }, [heroId])

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  useEffect(() => {
    if (!open) return
    const focusables = () =>
      [
        menuButton.current,
        ...Array.from(
          sheet.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), summary, input:not([disabled]), select',
          ) ?? [],
        ),
      ].filter((node): node is HTMLElement => !!node && visible(node))
    focusables()[1]?.focus()

    const close = (returnFocus: boolean) => {
      setOpen(false)
      if (returnFocus) menuButton.current?.focus()
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // An open Appearance panel closes first, on its own.
        if (sheet.current?.querySelector('details[open]')) return
        event.preventDefault()
        close(true)
      }
      if (event.key !== 'Tab') return
      const nodes = focusables()
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!nodes.includes(document.activeElement as HTMLElement)) {
        event.preventDefault()
        first.focus()
      }
    }
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) close(false)
    }
    const wide = window.matchMedia('(min-width: 761px)')
    const resize = () => wide.matches && close(false)
    // Capture, so an open Appearance panel is still open when this runs.
    document.addEventListener('keydown', keydown, true)
    document.addEventListener('pointerdown', outside)
    wide.addEventListener('change', resize)
    return () => {
      document.removeEventListener('keydown', keydown, true)
      document.removeEventListener('pointerdown', outside)
      wide.removeEventListener('change', resize)
    }
  }, [open])

  const chip = !!heroId && pastHero
  // One Appearance control at a time: its radios share a name, so two copies would fight.
  const phone = usePhone()
  return (
    <header
      ref={header}
      className="site-top"
      data-solid={scrolled || open || undefined}
      data-menu-open={open || undefined}
    >
      {/* Before first paint: a first visit follows the visitor's light or dark setting. */}
      <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} suppressHydrationWarning />
      <SiteStyles />
      <div className="site-top-bar">
        <Link href="/" className="site-top-home" aria-label="DIYA home" data-site-mark="">
          <FlameMark decorative />
        </Link>
        <nav className="site-top-nav" aria-label="Library">
          <Link href="/explore?area=components" aria-current={current === 'components' ? 'page' : undefined}>
            Components
          </Link>
          <Link href="/explore?area=patterns" aria-current={current === 'patterns' ? 'page' : undefined}>
            Patterns
          </Link>
        </nav>
        <div className="site-top-end">
          <div className="site-top-chip" data-shown={chip || undefined} inert={!chip}>
            <InstallChip variant="compact" />
          </div>
          <a className="site-top-button" href={GITHUB_URL}>
            <GitHubIcon />
            GitHub
          </a>
          {!phone && (
            <div className="site-top-appearance">
              <Appearance />
            </div>
          )}
          <button
            ref={menuButton}
            type="button"
            className="site-top-menu-button"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls={sheetId}
            onClick={() => setOpen((value) => !value)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M5 9h14M5 15h14" />}
            </svg>
          </button>
        </div>
      </div>
      <div ref={sheet} id={sheetId} className="site-menu" role="dialog" aria-modal="true" aria-label="Menu" hidden={!open}>
        <a className="site-menu-row" href={GITHUB_URL}>
          <span>GitHub</span>
          <small>idyeah-studio/diya</small>
        </a>
        <a className="site-menu-row" href={NPM_URL}>
          <span>npm</span>
          <small>@idyeah/diya</small>
        </a>
        <InstallChip variant="menu" />
        {phone && <MenuAppearance />}
      </div>
    </header>
  )
}

function MenuAppearance() {
  const { light, glass } = useAppearance()
  return (
    <div className="site-menu-appearance">
      <span className="site-menu-row" aria-hidden="true">
        <span>Appearance</span>
        <small>
          {light ? 'Light' : 'Dark'}
          {glass ? ' · Glass' : ''}
        </small>
      </span>
      <Appearance />
    </div>
  )
}

const PHONE = '(max-width: 760px)'
function usePhone() {
  return useSyncExternalStore(
    (listener) => {
      const query = window.matchMedia(PHONE)
      query.addEventListener('change', listener)
      return () => query.removeEventListener('change', listener)
    },
    () => window.matchMedia(PHONE).matches,
    () => false,
  )
}

function visible(node: HTMLElement) {
  // checkVisibility also sees through closed <details> content.
  if (typeof node.checkVisibility === 'function') return node.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true })
  return node.getClientRects().length > 0
}

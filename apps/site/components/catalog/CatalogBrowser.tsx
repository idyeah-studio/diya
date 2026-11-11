'use client'
import Link from 'next/link'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Drawer, Search } from '@idyeah/diya'
import { useCatalogSearch, useListedScreens } from '../CatalogSearchProvider'
import { useActiveCatalogItem } from '../useActiveCatalogItem'
import { useCatalogTransition } from './CatalogTransitions'
import { SidebarFoot, type FootPage } from './SidebarFoot'
import { catalogGroups, catalogHref, filterGroups, onlyItems, type CatalogListArea } from './catalog-index'
import '../AtomicSidebar.css'

const words = {
  components: { title: 'Components', one: 'component', many: 'components', label: 'Component library', nav: 'Choose a component', search: 'Component search' },
  patterns: { title: 'Patterns', one: 'pattern', many: 'patterns', label: 'Patterns', nav: 'Pattern list', search: 'Pattern search' },
  screens: { title: 'Screens', one: 'screen', many: 'screens', label: 'Screens', nav: 'Screen list', search: 'Screen search' },
} as const
const AREAS: readonly CatalogListArea[] = ['components', 'patterns', 'screens']

const count = (n: number, area: CatalogListArea) => `${n} ${n === 1 ? words[area].one : words[area].many}`
const list = (parts: string[]) => (parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0])

/**
 * The catalog's list of components, patterns or screens, with one search
 * across all three: matches from the other areas follow under "In Patterns",
 * "In Screens" (or "In Components"). From 901px it's the sidebar. Below
 * that, an "All components" button opens it in a DIYA Drawer from the left,
 * so the page's specimen comes first.
 */
/** `page` marks a foot entry (Motion, Relight) as the current page instead of an item. */
export function CatalogBrowser({ area, current, page }: { area: CatalogListArea; current?: string; page?: FootPage }) {
  const [query, setQuery] = useCatalogSearch(area)
  const [open, setOpen] = useState(false)
  const nav = useRef<HTMLElement>(null)
  const panel = useRef<HTMLDialogElement>(null)
  // The Drawer stays mounted until its exit has played; then the sidebar's own markup returns.
  const [sheet, setSheet] = useState(false)
  if (open && !sheet) setSheet(true)
  const opener = useRef<HTMLButtonElement>(null)
  const resultsId = useId()
  const screens = useListedScreens()
  const groups = (target: CatalogListArea) => (target === 'screens' ? onlyItems(catalogGroups.screens, screens) : catalogGroups[target])
  const own = filterGroups(groups(area), query)
  const elsewhere = query.trim()
    ? AREAS.filter((target) => target !== area)
        .map((target) => ({ area: target, items: filterGroups(groups(target), query, false).flatMap((group) => group.items) }))
        .filter((found) => found.items.length > 0)
    : []
  const ownCount = own.reduce((total, group) => total + group.items.length, 0)
  const found = [...(ownCount ? [count(ownCount, area)] : []), ...elsewhere.map((other) => count(other.items.length, other.area))]
  const status = !query ? '' : `${found.length ? list(found) : count(0, area)} found`
  useActiveCatalogItem(nav, current ?? '', query, area)
  const armTransition = useCatalogTransition()

  // The phone sheet is a Drawer: the native modal keeps focus inside and closes on Escape, and
  // Drawer returns focus to the "All components" key. While it's open, <html> says so, so a
  // page change chosen from it skips the page transition: the Drawer's exit is the motion.
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    panel.current?.querySelector<HTMLInputElement>('input[type="search"], input')?.focus()
    const wide = window.matchMedia('(min-width: 901px)')
    const resize = () => wide.matches && setOpen(false)
    // The dialog's own cancel closes it too; this covers engines and tests without one.
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) setOpen(false) }
    root.dataset.catalogSheet = 'open'
    wide.addEventListener('change', resize)
    document.addEventListener('keydown', escape)
    return () => {
      delete root.dataset.catalogSheet
      wide.removeEventListener('change', resize)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  useLayoutEffect(() => {
    if (open || !sheet) return
    const running = panel.current?.getAnimations?.() ?? []
    if (!running.length) {
      setSheet(false)
      return
    }
    let live = true
    const done = () => { if (live) setSheet(false) }
    const cap = window.setTimeout(done, 1000)
    void Promise.allSettled(running.map((animation) => animation.finished)).then(done)
    return () => {
      live = false
      window.clearTimeout(cap)
    }
  }, [open, sheet])

  const link = (target: CatalogListArea, item: { id: string; title: string; soon?: boolean }) => {
    const selected = target === area && current === item.id
    return (
      <Link
        key={`${target}-${item.id}`}
        href={catalogHref(target, item.id)}
        className={`atomic-navigation-item${target !== 'components' ? ' pattern-current' : ''}`}
        aria-current={selected ? 'page' : undefined}
        onClick={(event) => {
          // A sidebar choice plays the page transition; one from the phone sheet doesn't, since
          // the Drawer's exit is that change's motion (UX-07). Modified clicks open a new tab.
          if (!open && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
          // A highlight scrolled out of the list's view doesn't fly in from outside it: the new
          // one simply appears.
          const mark = nav.current?.querySelector<HTMLElement>('.catalog-selected-mark')
          const box = nav.current?.getBoundingClientRect()
          const at = mark?.getBoundingClientRect()
          if (mark && box && at && (at.top < box.top || at.bottom > box.bottom)) mark.style.viewTransitionName = 'none'
          armTransition()
        }
          setOpen(false)
        }}
      >
        {/* The selected highlight, as its own piece so a page change can slide it alone. */}
        {selected && <span className="catalog-selected-mark" aria-hidden="true" />}
        {item.title}
        {item.soon && (
          <>
            <span className="sr-only">,</span>{' '}
            <span className="site-soon" data-size="small">
              Soon
            </span>
          </>
        )}
      </Link>
    )
  }

  const search = (
    <div role="search" aria-label={words[area].search}>
      <Search
        label={`Search ${words[area].many}`}
        hideLabel
        placeholder="Search"
        shape="pill"
        size="small"
        value={query}
        onValueChange={setQuery}
        clearable={!!query}
        aria-controls={resultsId}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && query) {
            setQuery('')
            event.preventDefault()
            event.stopPropagation()
          }
        }}
      />
    </div>
  )
  const results = (
    <>
      <nav ref={nav} id={resultsId} className="atomic-navigation" aria-label={words[area].nav}>
        {own.map((group) => (
          <div role="group" className="atomic-group" key={group.title} aria-label={group.title}>
            <h2>{group.title}</h2>
            {group.items.map((item) => link(area, item))}
          </div>
        ))}
        {elsewhere.map((other) => (
          <div role="group" className="atomic-group catalog-elsewhere" key={other.area} aria-label={`In ${words[other.area].title}`}>
            <h2>In {words[other.area].title}</h2>
            {other.items.map((item) => link(other.area, item))}
          </div>
        ))}
        {ownCount === 0 && elsewhere.length === 0 && (
          <p className="atomic-empty">No components, patterns or screens match “{query.trim()}”.</p>
        )}
      </nav>
      <span className="atomic-search-status" role="status" aria-live="polite">
        {status}
      </span>
    </>
  )

  return (
    <>
      <div className="catalog-browse">
        <button
          ref={opener}
          type="button"
          className="catalog-browse-button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M5 7h14M5 12h14M5 17h9" />
          </svg>
          All {words[area].many}
        </button>
      </div>
      {sheet ? (
        <Drawer ref={panel} side="left" open={open} onOpenChange={setOpen} title={words[area].title} className="catalog-sheet atomic-browser">
          {search}
          {results}
        </Drawer>
      ) : (
        <aside className={`component-browser atomic-browser${area !== 'components' ? ' pattern-browser' : ''}`} aria-label={words[area].label}>
          <div className="component-browser-heading">
            <div className="catalog-browser-title">
              <div className="catalog-browser-name">{words[area].title}</div>
            </div>
            {search}
          </div>
          {results}
          <SidebarFoot placement="side" page={page} />
        </aside>
      )}
    </>
  )
}

'use client'
import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { Search } from '@idyeah/diya'
import { useCatalogSearch, useListedScreens } from '../CatalogSearchProvider'
import { useActiveCatalogItem } from '../useActiveCatalogItem'
import { SidebarFoot } from './SidebarFoot'
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
 * that, a "Browse" button opens it as a full-height sheet, so the page's
 * specimen comes first.
 */
export function CatalogBrowser({ area, current, pro = false }: { area: CatalogListArea; current?: string; pro?: boolean }) {
  const [query, setQuery] = useCatalogSearch(area)
  const [open, setOpen] = useState(false)
  const nav = useRef<HTMLElement>(null)
  const panel = useRef<HTMLElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const resultsId = useId()
  const sheetTitle = useId()
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
  useActiveCatalogItem(nav, current ?? '', query)

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const close = (returnFocus: boolean) => {
      setOpen(false)
      if (returnFocus) opener.current?.focus()
    }
    const focusables = () =>
      Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])') ?? []).filter(
        (node) => node.getClientRects().length > 0
      )
    panel.current?.querySelector<HTMLInputElement>('input[type="search"], input')?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault()
        close(true)
      }
      if (event.key !== 'Tab') return
      const nodes = focusables()
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    const wide = window.matchMedia('(min-width: 901px)')
    const resize = () => wide.matches && close(false)
    root.dataset.catalogSheet = 'open'
    document.addEventListener('keydown', keydown)
    wide.addEventListener('change', resize)
    return () => {
      delete root.dataset.catalogSheet
      document.removeEventListener('keydown', keydown)
      wide.removeEventListener('change', resize)
    }
  }, [open])

  const link = (target: CatalogListArea, item: { id: string; title: string }) => (
    <Link
      key={`${target}-${item.id}`}
      href={catalogHref(target, item.id)}
      className={`atomic-navigation-item${target !== 'components' ? ' pattern-current' : ''}`}
      aria-current={target === area && current === item.id ? 'page' : undefined}
      onClick={() => setOpen(false)}
    >
      {item.title}
    </Link>
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
      <aside
        ref={panel}
        className={`component-browser atomic-browser${area !== 'components' ? ' pattern-browser' : ''}`}
        aria-label={open ? undefined : words[area].label}
        role={open ? 'dialog' : undefined}
        aria-modal={open || undefined}
        aria-labelledby={open ? sheetTitle : undefined}
        data-sheet={open ? 'open' : undefined}
      >
        <div className="component-browser-heading">
          <div className="catalog-browser-title">
            <h1 id={sheetTitle}>{words[area].title}</h1>
            <button type="button" className="catalog-sheet-close" aria-label="Close" onClick={() => {
              setOpen(false)
              opener.current?.focus()
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
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
                }
              }}
            />
          </div>
        </div>
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
        <SidebarFoot placement="side" pro={pro} />
      </aside>
    </>
  )
}

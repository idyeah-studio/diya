import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { DiyaProvider } from '@idyeah/diya'
import { AtomicSidebar } from '../components/AtomicSidebar'
import { PatternSidebar } from '../components/PatternSidebar'
import { CatalogSearchProvider } from '../components/CatalogSearchProvider'
import { TitleFocus } from '../components/catalog/TitleFocus'
import { CatalogBrowser } from '../components/catalog/CatalogBrowser'
import { catalogGroups, type CatalogListArea } from '../components/catalog/catalog-index'
import { listedScreens } from '../components/screens/screens-data'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

describe('catalog headings', () => {
  it('leaves the page its one h1: the sidebars name themselves without one', () => {
    for (const node of [<AtomicSidebar key="a" current="button" />, <PatternSidebar key="p" current="table" />]) {
      const { container, unmount } = render(
        <DiyaProvider>
          <CatalogSearchProvider>{node}</CatalogSearchProvider>
        </DiyaProvider>,
      )
      expect(container.querySelector('h1')).toBeNull()
      expect(container.querySelector('.catalog-browser-name')?.textContent).toMatch(/^(Components|Patterns), \d+$/)
      unmount()
    }
  })

  it('shows how many each list holds beside its title, counted from the list itself and read as "Patterns, 13"', () => {
    // Screens still to come ("Soon") are listed but not counted, so Screens agrees with the home page's "All N screens".
    const ready = new Set(listedScreens(false).filter((entry) => entry.status === 'ready').map((entry) => entry.id))
    const expected: Record<CatalogListArea, number> = {
      components: catalogGroups.components.reduce((sum, group) => sum + group.items.length, 0),
      patterns: catalogGroups.patterns.reduce((sum, group) => sum + group.items.length, 0),
      screens: catalogGroups.screens.reduce((sum, group) => sum + group.items.filter((item) => ready.has(item.id)).length, 0),
    }
    expect(expected.patterns).toBe(13)
    expect(expected.components).toBeGreaterThan(30)
    expect(expected.screens).toBeGreaterThan(30)
    for (const area of ['components', 'patterns', 'screens'] as const) {
      const { container, unmount } = render(
        <DiyaProvider>
          <CatalogSearchProvider>
            <CatalogBrowser area={area} />
          </CatalogSearchProvider>
        </DiyaProvider>,
      )
      const name = container.querySelector('.catalog-browser-name')!
      const title = { components: 'Components', patterns: 'Patterns', screens: 'Screens' }[area]
      // The comma is for screen readers only; on screen it's the title and a muted number.
      expect(name.textContent).toBe(`${title}, ${expected[area]}`)
      expect(name.querySelector('.sr-only')?.textContent).toBe(',')
      expect(name.querySelector('.catalog-browser-count')?.textContent).toBe(String(expected[area]))
      // Every row the list renders is one of those counted, or a "Soon" screen.
      const rows = container.querySelectorAll('.atomic-navigation-item')
      const soon = container.querySelectorAll('.atomic-navigation-item .site-soon')
      expect(rows.length - soon.length).toBe(expected[area])
      unmount()
    }
  })

  it('keeps the count while a search narrows the list', async () => {
    const { container, getByRole } = render(
      <DiyaProvider>
        <CatalogSearchProvider>
          <CatalogBrowser area="patterns" current="table" />
        </CatalogSearchProvider>
      </DiyaProvider>,
    )
    const { default: userEvent } = await import('@testing-library/user-event')
    await userEvent.setup().type(getByRole('searchbox', { name: 'Search patterns' }), 'table')
    expect(container.querySelector('.catalog-browser-count')?.textContent).toBe('13')
  })

  it('moves focus to the new page title after a navigation, never on the first load', () => {
    const page = (path: string, title: string) => (
      <>
        <TitleFocus path={path} />
        <main>
          <h1>{title}</h1>
        </main>
      </>
    )
    const { rerender, getByRole } = render(page('/explore?area=components&component=button', 'Button'))
    expect(document.activeElement).toBe(document.body)
    rerender(page('/explore?area=components&component=button', 'Button'))
    expect(document.activeElement).toBe(document.body)
    rerender(page('/explore?area=components&component=switch', 'Switch'))
    const title = getByRole('heading', { level: 1, name: 'Switch' })
    expect(document.activeElement).toBe(title)
    expect(title.getAttribute('tabindex')).toBe('-1')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { DiyaProvider } from '@idyeah/diya'
import { AtomicSidebar } from '../components/AtomicSidebar'
import { PatternSidebar } from '../components/PatternSidebar'
import { CatalogSearchProvider } from '../components/CatalogSearchProvider'
import { TitleFocus } from '../components/catalog/TitleFocus'

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
      expect(container.querySelector('.catalog-browser-name')?.textContent).toMatch(/^(Components|Patterns)$/)
      unmount()
    }
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

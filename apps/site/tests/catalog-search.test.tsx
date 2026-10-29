import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { DiyaProvider } from '@idyeah/diya'
import { CatalogSearchProvider } from '../components/CatalogSearchProvider'
import { AtomicSidebar, type AtomicComponent } from '../components/AtomicSidebar'
import { PatternSidebar } from '../components/PatternSidebar'
import { CatalogBrowser } from '../components/catalog/CatalogBrowser'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

// The sidebar foot's install chip has its own status for copy announcements.
function searchStatus() {
  return screen.getAllByRole('status').find((node) => node.classList.contains('atomic-search-status'))!
}

type PreviewProps = {
  area: 'components' | 'patterns'
  component?: AtomicComponent
  pattern?: ComponentProps<typeof PatternSidebar>['current']
}

function Preview({ area, component = 'text-input', pattern = 'page-header' }: PreviewProps) {
  return (
    <DiyaProvider>
      <CatalogSearchProvider>
        {area === 'components' ? (
          <AtomicSidebar key={component} current={component} />
        ) : (
          <PatternSidebar key={pattern} current={pattern} />
        )}
      </CatalogSearchProvider>
    </DiyaProvider>
  )
}

function links(navigation: 'Choose a component' | 'Pattern list') {
  return within(screen.getByRole('navigation', { name: navigation })).getAllByRole('link')
}

describe('catalog search continuity', () => {
  it('finds screens from Components and Patterns, and both from Screens, counting each area', async () => {
    const user = userEvent.setup()
    render(
      <DiyaProvider>
        <CatalogSearchProvider screens={['sign-in', 'resource-table', 'board']}>
          <CatalogBrowser area="components" current="button" />
        </CatalogSearchProvider>
      </DiyaProvider>
    )
    await user.type(screen.getByRole('searchbox', { name: 'Search components' }), 'table')
    expect(within(screen.getByRole('region', { name: 'In Patterns' })).getByRole('link', { name: 'Table' })).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'In Screens' })).getByRole('link', { name: 'Resource table' }).getAttribute('href')).toBe(
      '/explore?area=screens&screen=resource-table'
    )
    expect(searchStatus().textContent).toBe('1 pattern and 1 screen found')
  })

  it('lists only the screens the build lists, by category, and searches the others from Screens', async () => {
    const user = userEvent.setup()
    render(
      <DiyaProvider>
        <CatalogSearchProvider screens={['sign-in', 'board']}>
          <CatalogBrowser area="screens" current="sign-in" />
        </CatalogSearchProvider>
      </DiyaProvider>
    )
    const list = screen.getByRole('navigation', { name: 'Screen list' })
    expect(within(list).getAllByRole('link').map((link) => link.textContent)).toEqual(['Sign in', 'Board'])
    expect(within(list).getByRole('link', { name: 'Sign in' }).getAttribute('aria-current')).toBe('page')
    expect(within(list).getByRole('region', { name: 'Sign-in & onboarding' })).toBeTruthy()
    await user.type(screen.getByRole('searchbox', { name: 'Search screens' }), 'drag')
    expect(searchStatus().textContent).toBe('1 screen and 1 pattern found')
    expect(within(screen.getByRole('region', { name: 'In Patterns' })).getByRole('link', { name: 'File Upload' })).toBeTruthy()
  })

  it('finds patterns from the Components list, and components from the Patterns list', async () => {
    const user = userEvent.setup()
    const preview = render(<Preview area="components" component="button" />)
    await user.type(screen.getByRole('searchbox', { name: 'Search components' }), 'table')
    const elsewhere = screen.getByRole('region', { name: 'In Patterns' })
    expect(within(elsewhere).getByRole('link', { name: 'Table' }).getAttribute('href')).toBe('/explore?pattern=table')
    // Screens that use a Table can match too; the pattern is what this checks.
    expect(searchStatus().textContent).toMatch(/^1 pattern( and \d+ screens?)? found$/)
    preview.rerender(<Preview area="patterns" />)
    await user.type(screen.getByRole('searchbox', { name: 'Search patterns' }), 'toggle')
    const components = screen.getByRole('region', { name: 'In Components' })
    expect(within(components).getByRole('link', { name: 'Switch' }).getAttribute('href')).toBe(
      '/explore?area=components&component=switch'
    )
  })

  it('retains component search when a matching preview replaces and remounts its sidebar', async () => {
    const user = userEvent.setup()
    const preview = render(<Preview area="components" component="text-input" />)
    await user.type(screen.getByRole('searchbox', { name: 'Search components' }), 'field')
    // Two components, then the Form pattern from the other area.
    expect(links('Choose a component').map((link) => link.textContent)).toEqual([
      'Text Input',
      'Text Area',
      'Form',
    ])
    preview.rerender(<Preview area="components" component="text-area" />)
    expect(
      (screen.getByRole('searchbox', { name: 'Search components' }) as HTMLInputElement).value
    ).toBe('field')
    expect(links('Choose a component').map((link) => link.textContent)).toEqual([
      'Text Input',
      'Text Area',
      'Form',
    ])
    expect(screen.getByRole('link', { name: 'Text Area' }).getAttribute('aria-current')).toBe(
      'page'
    )
    expect(screen.getByRole('link', { name: 'Form' }).getAttribute('href')).toBe('/explore?pattern=form')
    expect(searchStatus().textContent).toBe('2 components and 1 pattern found')
  })

  it('retains pattern search when a matching preview replaces and remounts its sidebar', async () => {
    const user = userEvent.setup()
    const preview = render(<Preview area="patterns" pattern="page-header" />)
    await user.type(screen.getByRole('searchbox', { name: 'Search patterns' }), 'header')
    preview.rerender(<Preview area="patterns" pattern="site-header" />)
    expect(
      (screen.getByRole('searchbox', { name: 'Search patterns' }) as HTMLInputElement).value
    ).toBe('header')
    expect(links('Pattern list').map((link) => link.textContent)).toEqual([
      'Page Header',
      'Site Header',
    ])
    expect(screen.getByRole('link', { name: 'Site Header' }).getAttribute('aria-current')).toBe(
      'page'
    )
    expect(searchStatus().textContent).toBe('2 patterns found')
  })

  it('keeps independent area queries across switches and clears them independently', async () => {
    const user = userEvent.setup()
    const preview = render(<Preview area="components" />)
    await user.type(screen.getByRole('searchbox', { name: 'Search components' }), 'field')
    preview.rerender(<Preview area="patterns" />)
    const patternSearch = screen.getByRole('searchbox', {
      name: 'Search patterns',
    }) as HTMLInputElement
    expect(patternSearch.value).toBe('')
    await user.type(patternSearch, 'header')

    preview.rerender(<Preview area="components" component="text-area" />)
    const componentSearch = screen.getByRole('searchbox', {
      name: 'Search components',
    }) as HTMLInputElement
    expect(componentSearch.value).toBe('field')
    await user.click(screen.getByRole('button', { name: 'Clear search components' }))
    expect(componentSearch.value).toBe('')
    expect(document.activeElement).toBe(componentSearch)
    expect(links('Choose a component')).toHaveLength(29)

    preview.rerender(<Preview area="patterns" pattern="site-header" />)
    const returnedPatternSearch = screen.getByRole('searchbox', {
      name: 'Search patterns',
    }) as HTMLInputElement
    expect(returnedPatternSearch.value).toBe('header')
    await user.click(returnedPatternSearch)
    await user.keyboard('{Escape}')
    expect(returnedPatternSearch.value).toBe('')
    expect(links('Pattern list')).toHaveLength(13)

    preview.rerender(<Preview area="components" component="text-area" />)
    expect(
      (screen.getByRole('searchbox', { name: 'Search components' }) as HTMLInputElement).value
    ).toBe('')
    expect(links('Choose a component')).toHaveLength(29)
  })

  it('still supports isolated sidebar previews without a catalog search provider', async () => {
    const user = userEvent.setup()
    render(
      <DiyaProvider>
        <PatternSidebar current="table" />
      </DiyaProvider>
    )
    await user.type(screen.getByRole('searchbox', { name: 'Search patterns' }), 'records sort')
    expect(links('Pattern list').map((link) => link.textContent)).toEqual(['Table'])
    expect(searchStatus().textContent).toBe('1 pattern found')
  })
})

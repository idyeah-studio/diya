import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { version, type ComponentProps } from 'react'
import { DiyaProvider } from '@idyeah/diya'
import { AppearanceProvider } from '../app/Appearance'
import { CatalogProvider } from '../components/CatalogProvider'
import { ButtonLibrary } from '../components/ButtonLibrary'
import { PatternSidebar } from '../components/PatternSidebar'
import { getSnapshot, STORAGE_KEY } from '../lib/customize/store'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

// The sidebar foot's install chip has its own status for copy announcements.
function searchStatus() {
  return screen.getAllByRole('status').find((node) => node.classList.contains('atomic-search-status'))!
}

// Stop at the Get code drawer boundary: get-code.test.tsx covers the drawer itself.
// Record the stored Button options the drawer will see when it opens.
vi.mock('../components/GetCodeDrawer', () => ({
  GetCodeDrawer: ({ open, id }: { open: boolean; id: string }) =>
    open ? (
      <output data-testid="requested-button-package">
        {JSON.stringify({ id, button: getSnapshot().items.button ?? null })}
      </output>
    ) : null,
}))

beforeEach(() => {
  window.localStorage.removeItem(STORAGE_KEY)
})

function renderButton() {
  return render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <CatalogProvider>
        <ButtonLibrary />
      </CatalogProvider>
    </AppearanceProvider>
  )
}

function requestedPackage(): { id: string; button: { overrides: object; options: Record<string, unknown> } | null } {
  return JSON.parse(screen.getByTestId('requested-button-package').textContent!)
}

function specimens() {
  return within(screen.getByRole('region', { name: 'Button variants' }))
}

describe('Button preview to Get code', () => {
  it('keeps an untouched Button uncustomized, with the app React runtime', async () => {
    const user = userEvent.setup()
    const { container } = renderButton()
    expect(version).toMatch(/^19\./)
    await user.click(screen.getByRole('button', { name: 'Get code' }))
    expect(requestedPackage()).toEqual({ id: 'button', button: null })
    expect(container.querySelector('.customize-scope--button > style')).toBeNull()
  })

  it('records the chosen size as a Button option and previews it', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('radio', { name: 'Large' }))
    await user.click(screen.getByRole('button', { name: 'Get code' }))
    expect(requestedPackage().button?.options.size).toBe('large')
    expect(
      specimens()
        .getAllByRole('button')
        .map((button) => button.getAttribute('data-size'))
    ).toEqual(['large', 'large', 'large'])
  })

  it('records Icon type and prevents incompatible leading/trailing changes', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('radio', { name: 'Icon' }))
    const leading = screen.getByRole('checkbox', { name: 'Leading' }) as HTMLInputElement
    const trailing = screen.getByRole('checkbox', { name: 'Trailing' }) as HTMLInputElement
    expect((leading.closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true)
    expect((trailing.closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true)
    await user.click(leading)
    await user.click(trailing)
    expect(leading.checked).toBe(false)
    expect(trailing.checked).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Get code' }))
    expect(requestedPackage().button?.options.kind).toBe('icon')
    expect(specimens().getAllByRole('button', { name: /add item/ })).toHaveLength(3)
  })

  it('records leading and trailing icon defaults', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('checkbox', { name: 'Leading' }))
    await user.click(screen.getByRole('checkbox', { name: 'Trailing' }))
    await user.click(screen.getByRole('button', { name: 'Get code' }))
    expect(requestedPackage().button?.options).toMatchObject({ leadingIcon: true, trailingIcon: true })
    expect(
      specimens()
        .getAllByRole('button', { name: 'Continue' })
        .every((button) => button.querySelectorAll('svg').length === 2)
    ).toBe(true)
  })

  it.each(['Disabled', 'Loading'])('keeps %s as a preview state only', async (state) => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('radio', { name: 'Small' }))
    await user.click(screen.getByRole('button', { name: 'Get code' }))
    const before = requestedPackage()
    await user.click(screen.getByRole('radio', { name: state }))
    // Disabled is the native attribute; Loading stays focusable and inert.
    expect(
      specimens()
        .getAllByRole('button')
        .every((button) =>
          state === 'Disabled'
            ? (button as HTMLButtonElement).disabled
            : !(button as HTMLButtonElement).disabled && button.getAttribute('aria-disabled') === 'true'
        )
    ).toBe(true)
    expect(getSnapshot().items.button?.options).toEqual(before.button?.options)
    for (const key of ['disabled', 'loading', 'state']) expect(getSnapshot().items.button?.options).not.toHaveProperty(key)
  })

  it('opens the shared Customize panel for Button, with Button’s own settings', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: 'Customize' }))
    const panel = screen.getByRole('complementary', { name: 'Customize Your brand' })
    expect(within(panel).getByRole('heading', { name: 'Button’s own settings' })).toBeTruthy()
    expect(within(panel).getByRole('radio', { name: 'Rounded' })).toBeTruthy()
    await user.click(within(panel).getByRole('radio', { name: 'Rounded' }))
    expect(getSnapshot().items.button?.options.shape).toBe('rounded')
    expect(specimens().getAllByRole('button').every((b) => b.getAttribute('data-shape') === 'rounded')).toBe(true)
  })
})

const patternIds = [
  'page-header',
  'site-header',
  'card',
  'dialog',
  'table',
  'file-upload',
  'form',
  'drawer',
  'empty-state',
  'side-navigation',
  'chatbot',
  'data-viz',
  'wizard',
]

function renderPatterns() {
  return render(
    <DiyaProvider>
      <PatternSidebar current="empty-state" />
    </DiyaProvider>
  )
}

function patternLinks() {
  return within(screen.getByRole('navigation', { name: 'Pattern list' })).queryAllByRole('link')
}

describe('Patterns discovery', () => {
  it('preserves all 13 routes and exposes the current selection', () => {
    renderPatterns()
    expect(
      patternLinks()
        .map((link) => link.getAttribute('href'))
        .sort()
    ).toEqual(patternIds.map((id) => `/explore?pattern=${id}`).sort())
    expect(
      screen.getByRole('link', { name: 'Content State' }).getAttribute('aria-current')
    ).toBe('page')
    expect(screen.queryByRole('button', { name: 'Clear Search patterns' })).toBeNull()
  })

  it('matches case-insensitive multiword keywords and announces the result count', async () => {
    const user = userEvent.setup()
    renderPatterns()
    await user.type(screen.getByRole('searchbox', { name: 'Search patterns' }), '  LINE dashboard')
    expect(patternLinks().map((link) => link.textContent)).toEqual(['Data Viz'])
    expect(searchStatus().textContent).toBe('1 pattern found')
  })

  it('shows clear only for a query, restores all links, and returns focus to Search', async () => {
    const user = userEvent.setup()
    renderPatterns()
    const search = screen.getByRole('searchbox', { name: 'Search patterns' }) as HTMLInputElement
    await user.type(search, 'navigation')
    // The three Navigation patterns, then Text Link from Components.
    expect(patternLinks().map((link) => link.textContent)).toEqual(['Page Header', 'Site Header', 'Side Navigation', 'Text Link'])
    expect(searchStatus().textContent).toBe('3 patterns and 1 component found')
    await user.click(screen.getByRole('button', { name: 'Clear Search patterns' }))
    expect(search.value).toBe('')
    expect(document.activeElement).toBe(search)
    expect(patternLinks()).toHaveLength(13)
    expect(screen.queryByRole('button', { name: 'Clear Search patterns' })).toBeNull()
  })

  it('announces no results and lets Escape clear the query without losing the selection', async () => {
    const user = userEvent.setup()
    renderPatterns()
    const search = screen.getByRole('searchbox', { name: 'Search patterns' }) as HTMLInputElement
    await user.type(search, 'zzzz-missing-pattern')
    expect(patternLinks()).toHaveLength(0)
    expect(screen.getByText('No components, patterns or screens match “zzzz-missing-pattern”.')).toBeDefined()
    expect(searchStatus().textContent).toBe('0 patterns found')
    await user.keyboard('{Escape}')
    expect(search.value).toBe('')
    expect(patternLinks()).toHaveLength(13)
    expect(screen.queryByText(/No components, patterns or screens match/)).toBeNull()
    expect(
      screen.getByRole('link', { name: 'Content State' }).getAttribute('aria-current')
    ).toBe('page')
  })
})

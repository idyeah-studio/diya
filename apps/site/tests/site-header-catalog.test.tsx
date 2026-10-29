import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { AppearanceProvider } from '../app/Appearance'
import { CatalogProvider } from '../components/CatalogProvider'
import { SiteHeaderLibrary } from '../components/SiteHeaderLibrary'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))
vi.mock('../components/LibraryDownload', () => ({ LibraryDownload: () => null }))

beforeEach(() => {
  // Native modal layout/focus containment is browser-tested separately.
  const dialog = Object.getPrototypeOf(document.createElement('dialog'))
  vi.spyOn(dialog, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
    this.open = true
    this.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  })
  vi.spyOn(dialog, 'close').mockImplementation(function (this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  })
})

function renderWorkspace() {
  return render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <CatalogProvider>
        <SiteHeaderLibrary />
      </CatalogProvider>
    </AppearanceProvider>
  )
}

function projectCards() {
  return within(screen.getByRole('region', { name: 'Projects workspace' })).queryAllByRole(
    'article'
  )
}

describe('composed Site Header catalog example', () => {
  it('searches the real sample projects by multiple keywords and recovers from no results', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    expect(projectCards()).toHaveLength(3)
    expect(screen.getByRole('navigation', { name: 'Veylo navigation' })).toBeDefined()
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).toBeNull()
    const search = screen.getByRole('searchbox', { name: 'Search projects' }) as HTMLInputElement
    await user.type(search, 'SAMIRA flow')
    expect(projectCards().map((card) => card.getAttribute('aria-label'))).toEqual(['Avyra'])
    expect(screen.getByRole('status', { name: 'Project search results' }).textContent).toBe(
      '1 project'
    )
    await user.clear(search)
    await user.type(search, 'zzzz-unmatched')
    expect(projectCards()).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'No matching projects' })).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(projectCards()).toHaveLength(3)
    expect(search.value).toBe('')
    expect(document.activeElement).toBe(search)
  })

  it('shows populated Activity and People sections and searches projects from either section', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(screen.getByRole('button', { name: 'Activity' }))
    expect(
      within(screen.getByRole('list', { name: 'Recent team activity' })).getAllByRole('listitem')
    ).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'People' }))
    expect(
      within(screen.getByRole('list', { name: 'Workspace people' })).getAllByRole('listitem')
    ).toHaveLength(3)
    await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), 'reporting')
    expect(projectCards().map((card) => card.getAttribute('aria-label'))).toEqual(['Kelmio'])
    expect(screen.getByRole('button', { name: 'Projects' }).getAttribute('aria-current')).toBe(
      'page'
    )
  })

  it('opens useful project details and returns focus to the originating project action', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    const action = screen.getByRole('button', { name: 'View Avyra' })
    await user.click(action)
    const details = screen.getByRole('dialog', { name: 'Avyra' })
    expect(details.textContent).toContain('Incorporate feedback on the signup flow.')
    expect(details.textContent).toContain('Samira Chen')
    await user.click(within(details).getByRole('button', { name: 'Close dialog' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(action)
  })

  it('opens a named account menu with profile, meaningful display preferences, and help', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    const account = screen.getByRole('button', { name: 'Account for Alex Morgan' })
    await user.click(account)
    const summaries = screen.getByRole('menuitemcheckbox', { name: 'Show project summaries' })
    expect(summaries.getAttribute('aria-checked')).toBe('true')
    await user.click(summaries)
    expect(summaries.getAttribute('aria-checked')).toBe('false')
    expect(screen.queryByText('A calmer workspace for planning team projects.')).toBeNull()
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(account)
    await user.click(account)
    await user.click(screen.getByRole('menuitem', { name: 'View profile' }))
    const profile = screen.getByRole('dialog', { name: 'Alex Morgan' })
    expect(profile.textContent).toContain('Product designer')
    expect(profile.textContent).toContain('alex@example.com')
    await user.click(within(profile).getByRole('button', { name: 'Close dialog' }))
    await user.click(account)
    await user.click(screen.getByRole('menuitem', { name: 'Search tips' }))
    expect(screen.getByRole('dialog', { name: 'Search tips' }).textContent).toContain(
      'Results update as you type.'
    )
  })

  it('opens a related notification record, updates unread count, and can mark the rest read', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(screen.getByRole('button', { name: 'Notifications, 2 unread' }))
    await user.click(screen.getByRole('menuitem', { name: 'Samira shared feedback on Avyra' }))
    const project = screen.getByRole('dialog', { name: 'Avyra' })
    await user.click(within(project).getByRole('button', { name: 'Close dialog' }))
    await user.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }))
    await user.click(screen.getByRole('menuitem', { name: 'Mark all as read' }))
    await user.click(screen.getByRole('button', { name: 'Notifications, 0 unread' }))
    expect(
      (screen.getByRole('menuitem', { name: 'You’re all caught up' }) as HTMLButtonElement).disabled
    ).toBe(true)
  })

  it('keeps enabled Settings and Support available without Avatar, and respects their toggles', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(screen.getByRole('checkbox', { name: 'Avatar' }))
    expect(screen.queryByRole('button', { name: 'Account for Alex Morgan' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Workspace actions' }))
    expect(screen.getByRole('menuitemcheckbox', { name: 'Show project owners' })).toBeDefined()
    expect(screen.getByRole('menuitem', { name: 'Search tips' })).toBeDefined()
    expect(screen.queryByRole('menuitem', { name: 'View profile' })).toBeNull()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('checkbox', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'Workspace actions' }))
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Show project owners' })).toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Search tips' })).toBeDefined()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('checkbox', { name: 'Support' }))
    expect(screen.queryByRole('button', { name: 'Workspace actions' })).toBeNull()
  })

  it('does not leave an invisible search filter active when its optional slot is omitted', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), 'Samira')
    expect(projectCards()).toHaveLength(1)
    await user.click(screen.getByRole('checkbox', { name: 'Search' }))
    expect(screen.queryByRole('searchbox', { name: 'Search projects' })).toBeNull()
    expect(projectCards()).toHaveLength(3)
    await user.click(screen.getByRole('checkbox', { name: 'Search' }))
    expect(
      (screen.getByRole('searchbox', { name: 'Search projects' }) as HTMLInputElement).value
    ).toBe('Samira')
    expect(projectCards()).toHaveLength(1)
  })
})

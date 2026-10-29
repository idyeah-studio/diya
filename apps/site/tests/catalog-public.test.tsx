import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { DiyaProvider } from '@idyeah/diya'
import { Appearance, AppearanceProvider } from '../app/Appearance'
import { AtomicSidebar } from '../components/AtomicSidebar'
import { PatternSidebar } from '../components/PatternSidebar'
import { CatalogProvider } from '../components/CatalogProvider'
import { CatalogSearchProvider } from '../components/CatalogSearchProvider'
import { DialogLibrary } from '../components/DialogLibrary'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))
vi.mock('../components/LibraryDownload', () => ({ LibraryDownload: () => null }))

function sidebar(node: React.ReactNode) {
  return render(
    <DiyaProvider>
      <CatalogSearchProvider>{node}</CatalogSearchProvider>
    </DiyaProvider>
  )
}

function proEntry() {
  return screen.getByRole('link', { name: /^Relight/ })
}

describe('catalog sidebar foot', () => {
  it('pins the install command, the request page and the one Relight entry under the component list', () => {
    sidebar(<AtomicSidebar current="button" />)
    const aside = screen.getByRole('complementary', { name: 'Component library' })
    expect(within(aside).getByRole('group', { name: 'Install DIYA' }).textContent).toContain('npm install @idyeah/diya')
    within(aside).getByRole('button', { name: 'Copy install command: npm install @idyeah/diya' })
    const links = within(aside).getByRole('list', { name: 'More from DIYA' })
    expect(within(links).getByRole('link', { name: 'Ask for a component' }).getAttribute('href')).toBe('/ask')
    const entry = proEntry()
    expect(entry.getAttribute('href')).toBe('/explore?area=pro')
    expect(entry.textContent).toBe('Relight, the DIYA Pro waitlist')
    expect(entry.hasAttribute('aria-current')).toBe(false)
  })

  it('shows the same foot in the pattern sidebar', () => {
    sidebar(<PatternSidebar current="table" />)
    const aside = screen.getByRole('complementary', { name: 'Patterns' })
    within(aside).getByRole('group', { name: 'Install DIYA' })
    expect(within(aside).getByRole('link', { name: /^Relight/ }).getAttribute('href')).toBe('/explore?area=pro')
  })

  it('marks Relight as the current page on its own page, and search never hides it', async () => {
    const user = userEvent.setup()
    sidebar(<AtomicSidebar pro />)
    expect(proEntry().getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('navigation', { name: 'Choose a component' }).querySelector('[aria-current]')).toBeNull()
    await user.type(screen.getByRole('searchbox', { name: 'Search components' }), 'no such thing')
    screen.getByText('No components, patterns or screens match “no such thing”.')
    expect(proEntry().getAttribute('aria-current')).toBe('page')
  })
})

describe('catalog wording in public mode', () => {
  it('describes Glass as a finish with one prop', async () => {
    const user = userEvent.setup()
    render(
      <AppearanceProvider initialTheme="dark" initialGlass={false}>
        <Appearance />
      </AppearanceProvider>
    )
    await user.click(screen.getByLabelText('Appearance'))
    const glass = screen.getByRole('switch')
    expect(glass.closest('label')!.textContent).toContain('GlassA finish. One prop: glass')
    expect(document.body.textContent).not.toMatch(/translucent/i)
  })
})

describe('Dialog playground', () => {
  it('draws the actions divider when Divider is on', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <AppearanceProvider initialTheme="light" initialGlass={false}>
        <CatalogProvider>
          <DialogLibrary />
        </CatalogProvider>
      </AppearanceProvider>
    )
    const inline = () => container.querySelector('.dialog-pattern-canvas .diya-dialog-actions')!
    expect(inline().hasAttribute('data-divider')).toBe(false)
    await user.click(screen.getByRole('checkbox', { name: 'Divider' }))
    expect(inline().getAttribute('data-divider')).toBe('true')
  })
})

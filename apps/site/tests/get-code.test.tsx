import { useState, type ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, DiyaProvider } from '@idyeah/diya'
import { Appearance, AppearanceProvider } from '../app/Appearance'
import { ButtonLibrary } from '../components/ButtonLibrary'
import { CatalogProvider } from '../components/CatalogProvider'
import { CODE_FORMAT_KEY, GetCodeDrawer, SETUP_COPIED_KEY } from '../components/GetCodeDrawer'
import { resetStoreForTests, setBrandColor } from '../lib/customize/store'
import { PACKAGE_MANAGER_KEY } from '../components/site/package-manager'
import { snippetFor } from '../components/code/snippets'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

function Harness({ id = 'button', glass = false }: { id?: string; glass?: boolean }) {
  const [open, setOpen] = useState(false)
  return <DiyaProvider><Button onClick={() => setOpen(true)}>Open</Button>
    <GetCodeDrawer id={id} open={open} onOpenChange={setOpen} glass={glass} />
  </DiyaProvider>
}
async function openDrawer(user: ReturnType<typeof userEvent.setup>, name = 'Open') {
  await user.click(screen.getByRole('button', { name }))
  return screen.findByRole('dialog', { name: 'Get code' })
}

beforeEach(() => {
  window.localStorage.clear()
  resetStoreForTests()
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList)
  const dialog = Object.getPrototypeOf(document.createElement('dialog'))
  vi.spyOn(dialog, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
    this.open = true
  })
  vi.spyOn(dialog, 'close').mockImplementation(function (this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  })
})

describe('Get code', () => {
  it('opens on its title with three steps, and Escape returns focus to the button', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const drawer = await openDrawer(user)
    await waitFor(() => expect(document.activeElement).toBe(within(drawer).getByRole('heading', { name: 'Get code', level: 3 })))
    expect(within(drawer).getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual([
      'Step 1: Install',
      'Step 2: Add the styles and provider',
      'Step 3: Use Button',
    ])
    expect(within(drawer).getByRole('textbox', { name: 'Install command' }).textContent).toBe('npm install @idyeah/diya')
    expect(within(drawer).getByRole('textbox', { name: 'Styles and provider' }).textContent).toBe(
      "import '@idyeah/diya/styles.css'\nimport { DiyaProvider } from '@idyeah/diya'\n\n<DiyaProvider theme=\"light\">\n  {children}\n</DiyaProvider>",
    )
    expect(within(drawer).getByText(/@idyeah\/diya/, { selector: 'b' }).parentElement!.textContent).toBe('@idyeah/diya 1.1.0-beta.1 · MIT')
    expect(within(drawer).getByRole('link', { name: 'README' }).getAttribute('href')).toBe('https://github.com/idyeah-studio/diya#readme')
    expect(within(drawer).getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe('https://github.com/idyeah-studio/diya')
    expect(drawer.textContent).not.toMatch(/\bPro\b|preview only|Internal|Evaluation|ZIP|Download/)
    act(() => {
      drawer.dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(screen.queryByRole('dialog', { name: 'Get code' })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open' })))
  })

  it('remembers the package manager by keyboard, everywhere', async () => {
    window.localStorage.setItem(PACKAGE_MANAGER_KEY, 'yarn')
    const user = userEvent.setup()
    render(<Harness />)
    const drawer = await openDrawer(user)
    expect(within(drawer).getByRole('textbox', { name: 'Install command' }).textContent).toBe('yarn add @idyeah/diya')
    act(() => within(drawer).getByRole('tab', { name: 'yarn' }).focus())
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(within(drawer).getByRole('tab', { name: 'bun' }))
    expect(within(drawer).getByRole('textbox', { name: 'Install command' }).textContent).toBe('bun add @idyeah/diya')
    expect(window.localStorage.getItem(PACKAGE_MANAGER_KEY)).toBe('bun')
    await waitFor(() => expect(within(drawer).getByText('Showing bun commands.')).toBeTruthy())
  })

  it('carries glass into the provider when the catalog shows Glass', async () => {
    const user = userEvent.setup()
    render(<Harness glass />)
    const drawer = await openDrawer(user)
    expect(within(drawer).getByRole('textbox', { name: 'Styles and provider' }).textContent).toContain('<DiyaProvider theme="light" glass>')
  })

  it('folds steps 1 and 2 after the first copy, with a Show button', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<Harness />)
    let drawer = await openDrawer(user)
    await user.click(within(drawer).getByRole('button', { name: 'Copy install command' }))
    expect(window.localStorage.getItem(SETUP_COPIED_KEY)).toBe('1')
    /* Nothing folds under the reader mid-task. */
    expect(within(drawer).getByRole('textbox', { name: 'Install command' })).toBeTruthy()
    await user.click(within(drawer).getByRole('button', { name: 'Close drawer' }))
    drawer = await openDrawer(user)
    expect(within(drawer).queryByRole('textbox', { name: 'Install command' })).toBeNull()
    expect(within(drawer).getByText('Install and styles: you’ve copied these before.')).toBeTruthy()
    const show = within(drawer).getByRole('button', { name: 'Show install and styles' })
    expect(show.getAttribute('aria-expanded')).toBe('false')
    await user.click(show)
    await waitFor(() => expect(document.activeElement).toBe(within(drawer).getByRole('heading', { name: 'Step 1: Install' })))
    expect(within(drawer).getByRole('textbox', { name: 'Install command' })).toBeTruthy()
  })

  it('adds ECharts for Data Viz, and only there', async () => {
    const user = userEvent.setup()
    render(<Harness id="data-viz" />)
    const drawer = await openDrawer(user)
    expect(within(drawer).getByRole('textbox', { name: 'Install command' }).textContent).toBe('npm install @idyeah/diya echarts@6')
    expect(within(drawer).getByText('Charts need one more package.')).toBeTruthy()
    expect(within(drawer).getByRole('textbox', { name: 'Data Viz example' }).textContent).toContain("from '@idyeah/diya/charts'")
    expect(!!within(drawer).queryByText('Using Next.js?')).toBe(snippetFor('data-viz', {}).functionProps.length > 0)
  })

  it('folds a long snippet behind Show all N lines, and still copies all of it', async () => {
    const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    const snippet = snippetFor('table', {})
    const lines = snippet.code.split('\n').length
    expect(lines).toBeGreaterThan(10)
    const user = userEvent.setup()
    render(<Harness id="table" />)
    const drawer = await openDrawer(user)
    const toggle = within(drawer).getByRole('button', { name: `Show all ${lines} lines` })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await user.click(within(drawer).getByRole('button', { name: 'Copy Table example' }))
    expect(clipboard).toHaveBeenLastCalledWith(snippet.code)
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.textContent).toBe('Show less')
    const uses = within(drawer).getByText(/^Built with/)
    for (const link of within(uses).getAllByRole('link')) expect(link.getAttribute('href')).toMatch(/^\/explore\?area=components&component=[a-z-]+$/)
    expect(within(drawer).getByText('Using Next.js?')).toBeTruthy()
  })
})

describe('Get code on an item page', () => {
  it('matches what the playground shows when it opens', async () => {
    const user = userEvent.setup()
    render(
      <AppearanceProvider initialTheme="dark" initialGlass>
        <header className="site-header"><Appearance /></header>
        <CatalogProvider><ButtonLibrary /></CatalogProvider>
      </AppearanceProvider>,
    )
    await user.click(screen.getByRole('radio', { name: 'Large' }))
    const drawer = await openDrawer(user, 'Get code')
    const code = within(drawer).getByRole('textbox', { name: 'Button example' }).textContent
    expect(code).toContain('size="large"')
    expect(within(drawer).getByRole('textbox', { name: 'Styles and provider' }).textContent).toContain('<DiyaProvider theme="dark" glass>')
    expect(within(drawer).getByText('Using Next.js?')).toBeTruthy()
  })
})

describe('Get code, complete file and brand', () => {
  it('offers the example as a complete file, and remembers the choice', async () => {
    const user = userEvent.setup()
    render(<Harness id="side-navigation" />)
    const drawer = await openDrawer(user)
    expect(within(drawer).getByRole('textbox', { name: 'Side Navigation example' }).textContent).toContain('<SideNavigation')
    expect(within(drawer).getByText(/Icons are yours\./).parentElement!.textContent).toMatch(/ActivityIcon and the others stand in.+lucide-react/)
    await user.click(within(drawer).getByRole('tab', { name: 'Complete file' }))
    const file = within(drawer).getByRole('textbox', { name: 'Side Navigation complete file' }).textContent!
    expect(file.startsWith("'use client'")).toBe(true)
    expect(file).toContain("import { useState } from 'react'")
    expect(file).toContain('function LayersIcon()')
    expect(file).toContain('export default function SideNavigationExample()')
    expect(within(drawer).getByText(/SideNavigationExample\.tsx/, { selector: 'code' })).toBeTruthy()
    expect(window.localStorage.getItem(CODE_FORMAT_KEY)).toBe('file')
  })

  it('puts brandColor in the provider only when a brand was picked', async () => {
    const user = userEvent.setup()
    const view = render(<Harness />)
    let drawer = await openDrawer(user)
    expect(within(drawer).getByRole('textbox', { name: 'Styles and provider' }).textContent).not.toContain('brandColor')
    view.unmount()
    setBrandColor('#1F4E7A', '#8DB4DA')
    render(<Harness />)
    drawer = await openDrawer(user)
    expect(within(drawer).getByRole('textbox', { name: 'Styles and provider' }).textContent).toContain(
      `<DiyaProvider theme="light" brandColor={{ light: '#1F4E7A', dark: '#8DB4DA' }}>`
    )
  })

  it('offers a Next.js providers file with linkComponent when the item renders links', async () => {
    const user = userEvent.setup()
    const view = render(<Harness id="breadcrumbs" />)
    const drawer = await openDrawer(user)
    const file = within(drawer).getByRole('textbox', { name: 'Next.js providers file' }).textContent!
    expect(file.startsWith("'use client'\nimport Link from 'next/link'")).toBe(true)
    expect(file).toContain('<DiyaProvider theme="light" linkComponent={Link}>')
    view.unmount()
    render(<Harness id="button" />)
    const plain = await openDrawer(user)
    expect(within(plain).queryByRole('textbox', { name: 'Next.js providers file' })).toBeNull()
  })
})

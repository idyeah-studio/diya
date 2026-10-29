import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Appearance, AppearanceProvider } from '../app/Appearance'
import { ButtonLibrary } from '../components/ButtonLibrary'
import { CatalogProvider } from '../components/CatalogProvider'
import { PACKAGE_MANAGER_KEY } from '../components/site/package-manager'
import { contrastIssues } from '../lib/customize/contrast'
import { effectiveAppearance } from '../lib/customize/appearance'
import { getSnapshot, resetStoreForTests, setBrandValue, setItemOption } from '../lib/customize/store'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

function Preview() {
  return (
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <header className="site-header">
        <Appearance />
      </header>
      <CatalogProvider>
        <ButtonLibrary />
      </CatalogProvider>
    </AppearanceProvider>
  )
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

async function openGetTheme(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^Customiz/ }))
  const panel = screen.getByRole('complementary', { name: 'Customize Your brand' })
  const trigger = within(panel).getByRole('button', { name: 'Get theme' })
  await user.click(trigger)
  const drawer = await screen.findByRole('dialog', { name: 'Get theme' })
  return { panel, trigger, drawer }
}

describe('Get theme, ready', () => {
  it('opens on its title and gives the file, the import order and only the changed props', async () => {
    setBrandValue('colors.light.accent', '#8A3D1F')
    setBrandValue('colors.dark.accent', '#F0B48A')
    setBrandValue('translucent', true)
    const user = userEvent.setup()
    render(<Preview />)
    const { drawer } = await openGetTheme(user)
    await waitFor(() => expect(document.activeElement).toBe(within(drawer).getByRole('heading', { name: 'Get theme', level: 3 })))
    const file = within(drawer).getByRole('textbox', { name: 'Theme file' })
    expect(file.textContent).toContain("Import it after '@idyeah/diya/styles.css'. Public tokens only.")
    expect(file.textContent).toContain('--diya-color-accent: #8A3D1F;')
    expect(within(drawer).getByRole('textbox', { name: 'Styles imports' }).textContent).toBe("import '@idyeah/diya/styles.css'\nimport './diya-theme.css'")
    expect(file.textContent).toContain('Brand: #8A3D1F in Light, #F0B48A in Dark.')
    expect(within(drawer).getByRole('textbox', { name: 'Provider props' }).textContent).toBe(
      "<DiyaProvider\n  brandColor={{ light: '#8A3D1F', dark: '#F0B48A' }}\n  glass\n>"
    )
    expect(within(drawer).queryByRole('heading', { name: /Load / })).toBeNull()
    expect(drawer.textContent).not.toMatch(/Pro\b|preview only|ZIP|Internal/)
  })

  it('downloads a real diya-theme.css and announces it', async () => {
    setBrandValue('corners', 16)
    const created: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => (created.push(blob as Blob), 'blob:theme'))
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<Preview />)
    const { drawer } = await openGetTheme(user)
    await user.click(within(drawer).getByRole('button', { name: 'Download diya-theme.css' }))
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('diya-theme.css')
    expect(link.href).toBe('blob:theme')
    expect(created[0].type).toBe('text/css;charset=utf-8')
    expect(await created[0].text()).toContain('--diya-corner-scale: 1.6;')
    await waitFor(() => expect(within(drawer).getByText('diya-theme.css is downloading.')).toBeTruthy())
  })

  it('installs a web font from Fontsource with the shared package manager', async () => {
    window.localStorage.setItem(PACKAGE_MANAGER_KEY, 'pnpm')
    setBrandValue('font', 'manrope')
    const user = userEvent.setup()
    render(<Preview />)
    const { drawer } = await openGetTheme(user)
    expect(within(drawer).getByRole('heading', { name: 'Step 4: Load Manrope' })).toBeTruthy()
    expect(within(drawer).getByRole('textbox', { name: 'Font install command' }).textContent).toBe('pnpm add @fontsource-variable/manrope')
    expect(within(drawer).getByRole('textbox', { name: 'Font import' }).textContent).toBe("import '@fontsource-variable/manrope'")
    expect(within(drawer).getByRole('textbox', { name: 'Provider props' }).textContent).toContain(`fontFamily="'Manrope Variable', sans-serif"`)
    await user.click(within(drawer).getByRole('tab', { name: 'bun' }))
    expect(within(drawer).getByRole('textbox', { name: 'Font install command' }).textContent).toBe('bun add @fontsource-variable/manrope')
    expect(window.localStorage.getItem(PACKAGE_MANAGER_KEY)).toBe('bun')
  })

  it('turns Button’s own settings into props', async () => {
    setItemOption('button', 'size', 'large')
    const user = userEvent.setup()
    render(<Preview />)
    const { drawer } = await openGetTheme(user)
    expect(within(drawer).getByRole('textbox', { name: 'Button props' }).textContent).toBe('<Button size="large">Save</Button>')
  })
})

describe('Get theme, when a color pair is too faint', () => {
  it('stays usable, lists each pair with its theme and ratio, and fixes one in a click', async () => {
    setBrandValue('colors.light.accent', '#E7A37C')
    const user = userEvent.setup()
    render(<Preview />)
    const { trigger, drawer } = await openGetTheme(user)
    expect((trigger as HTMLButtonElement).disabled).toBe(false)
    const issues = contrastIssues(effectiveAppearance(getSnapshot().brand))
    expect(issues.length).toBeGreaterThan(0)
    expect(within(drawer).getByRole('heading', { level: 4 }).textContent).toMatch(/too faint to read, so the theme isn’t ready yet\./)
    expect(within(drawer).queryByRole('textbox', { name: 'Theme file' })).toBeNull()
    const row = within(drawer).getByText('Accent against the background, in Light').closest('li')!
    expect(row.textContent).toMatch(/\d+(\.\d+)?:1 · needs 3:1/)
    const fixes = within(drawer).getAllByRole('button', { name: /^Use #/ })
    for (const fix of fixes.slice().reverse()) {
      if (!fix.isConnected) continue
      await user.click(fix)
      if (!within(drawer).queryAllByRole('button', { name: /^Use #/ }).length) break
    }
    await waitFor(() => expect(within(drawer).getByRole('textbox', { name: 'Theme file' })).toBeTruthy())
    expect(contrastIssues(effectiveAppearance(getSnapshot().brand))).toEqual([])
    await waitFor(() => expect(document.activeElement).toBe(within(drawer).getByRole('heading', { name: 'Step 1: Save the theme file' })))
    await waitFor(() => expect(within(drawer).getByText('All pairs read well. Your theme file is ready.')).toBeTruthy())
  })

  it('Adjust in Customize closes the drawer and focuses that setting', async () => {
    setBrandValue('colors.dark.text', '#303033')
    const user = userEvent.setup()
    render(<Preview />)
    const { panel, drawer } = await openGetTheme(user)
    const adjust = within(drawer).getAllByRole('button', { name: /^Adjust in Customize: Text on the background, in Dark/ })[0]
    await user.click(adjust)
    expect(screen.queryByRole('dialog', { name: 'Get theme' })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(within(panel).getByRole('textbox', { name: 'Text' })))
    expect(within(panel).getByRole('radio', { name: 'Dark' })).toHaveProperty('checked', true)
  })

  it('Escape closes it and returns focus to Get theme', async () => {
    const user = userEvent.setup()
    render(<Preview />)
    const { trigger, drawer } = await openGetTheme(user)
    act(() => {
      drawer.dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(screen.queryByRole('dialog', { name: 'Get theme' })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})

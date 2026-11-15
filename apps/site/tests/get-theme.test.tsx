import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Appearance, AppearanceProvider } from '../app/Appearance'
import { ButtonLibrary } from '../components/ButtonLibrary'
import { CatalogProvider } from '../components/CatalogProvider'
import { PACKAGE_MANAGER_KEY } from '../components/site/package-manager'
import { settingName } from '../components/customize/CustomizePanel'
import { contrast } from '../lib/customize/color'
import { contrastIssues } from '../lib/customize/contrast'
import { effectiveAppearance, parseOverrides } from '../lib/customize/appearance'
import { contrastFix, themeFile } from '../lib/customize/theme'
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
    setBrandValue('corners', 16)
    const user = userEvent.setup()
    render(<Preview />)
    const { drawer } = await openGetTheme(user)
    await waitFor(() => expect(document.activeElement).toBe(within(drawer).getByRole('heading', { name: 'Get theme', level: 3 })))
    const file = within(drawer).getByRole('textbox', { name: 'Theme file' })
    expect(file.textContent).toContain("Import it after '@idyeah/diya/styles.css'. Public tokens only.")
    expect(file.textContent).toContain('--diya-corner-scale: 1.6;')
    /* The brand travels as brandColor; accent tokens in the file would outrank it. */
    expect(file.textContent).not.toContain('--diya-color-accent')
    expect(within(drawer).getByRole('textbox', { name: 'Styles imports' }).textContent).toBe("import '@idyeah/diya/styles.css'\nimport './diya-theme.css'")
    expect(file.textContent).toContain("Brand: #8A3D1F in Light, #F0B48A in Dark, set with DiyaProvider's brandColor.")
    expect(within(drawer).getByRole('textbox', { name: 'Provider props' }).textContent).toBe(
      "<DiyaProvider\n  brandColor={{ light: '#8A3D1F', dark: '#F0B48A' }}\n  glass\n>"
    )
    expect(within(drawer).queryByRole('heading', { name: /Load / })).toBeNull()
    expect(drawer.textContent).not.toMatch(/Pro\b|preview only|ZIP|Internal/)
  })

  it('skips the file when only provider props changed', async () => {
    setBrandValue('colors.light.accent', '#8A3D1F')
    setBrandValue('colors.dark.accent', '#F0B48A')
    const user = userEvent.setup()
    render(<Preview />)
    const { drawer } = await openGetTheme(user)
    expect(within(drawer).queryByRole('textbox', { name: 'Theme file' })).toBeNull()
    expect(within(drawer).queryByRole('heading', { name: /Import it/ })).toBeNull()
    expect(within(drawer).getByRole('heading', { name: 'Step 1: Pass these to DiyaProvider' })).toBeTruthy()
    expect(within(drawer).getByRole('textbox', { name: 'Provider props' }).textContent).toBe("<DiyaProvider\n  brandColor={{ light: '#8A3D1F', dark: '#F0B48A' }}\n>")
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
    /* Only provider props changed, so there's no theme file to save: the font is step 2. */
    expect(within(drawer).getByRole('heading', { name: 'Step 2: Load Manrope' })).toBeTruthy()
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
    /* Only the brand changed, so the first step is the provider prop. */
    await waitFor(() => expect(within(drawer).getByRole('textbox', { name: 'Provider props' })).toBeTruthy())
    expect(contrastIssues(effectiveAppearance(getSnapshot().brand))).toEqual([])
    await waitFor(() => expect(document.activeElement).toBe(within(drawer).getByRole('heading', { name: 'Step 1: Pass these to DiyaProvider' })))
    await waitFor(() => expect(within(drawer).getByText('All pairs read well. Your theme is ready.')).toBeTruthy())
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

/*
 * 1.2's nine theming tokens in the theme file: the four colors per theme, the
 * three control heights and the popup and modal corners, each only when set to
 * something DIYA wouldn't draw anyway, with the same Light, Dark and
 * theme="system" blocks as every other token. The values are the visual
 * designer's invented "Brackwater" brand (visual.md §6).
 */
describe('Get theme, the 1.2 theming tokens', () => {
  const BRACKWATER = {
    'tokens.light.focus': '#0F6B70',
    'tokens.dark.focus': '#4CC4BB',
    'tokens.light.heading': '#0B4A4E',
    'tokens.dark.heading': '#9FE3DC',
    // White is what Light fields are filled with anyway, so it's left out of the file.
    'tokens.light.field': '#FFFFFF',
    'tokens.dark.field': '#18181B',
    'tokens.light.fieldLine': '#768587',
    'tokens.dark.fieldLine': '#6B7A7C',
    'tokens.heightSmall': 36,
    'tokens.heightMedium': 44,
    'tokens.heightLarge': 52,
    'tokens.radiusPopup': 10,
    'tokens.radiusModal': 14,
  } as const

  it('writes the system blocks for the new tokens', async () => {
    for (const [path, value] of Object.entries(BRACKWATER)) setBrandValue(path as keyof typeof BRACKWATER, value)
    const user = userEvent.setup()
    render(<Preview />)
    const { drawer } = await openGetTheme(user)
    const file = within(drawer).getByRole('textbox', { name: 'Theme file' }).textContent!
    expect(file).toContain(
      '.diya-root {\n  --diya-height-control-small: 36px;\n  --diya-height-control-medium: 44px;\n  --diya-height-control-large: 52px;\n  --diya-radius-popup: 10px;\n  --diya-radius-modal: 14px;\n}'
    )
    const light = '--diya-color-focus: #0F6B70;\n    --diya-color-heading: #0B4A4E;\n    --diya-color-field-line: #768587;\n  }'
    const dark = '--diya-color-focus: #4CC4BB;\n    --diya-color-heading: #9FE3DC;\n    --diya-color-field: #18181B;\n    --diya-color-field-line: #6B7A7C;\n  }'
    expect(file).toContain(`  .diya-root[data-theme='light'] {\n    ${light}`)
    expect(file).toContain(`  .diya-root[data-theme='dark'] {\n    ${dark}`)
    expect(file).toContain(`@media (forced-colors: none) and (prefers-color-scheme: light) {\n  .diya-root[data-theme='system'] {\n    ${light}\n}`)
    expect(file).toContain(`@media (forced-colors: none) and (prefers-color-scheme: dark) {\n  .diya-root[data-theme='system'] {\n    ${dark}\n}`)
    expect(file).not.toContain('--diya-color-field: #FFFFFF')
    expect(contrastIssues(effectiveAppearance(getSnapshot().brand))).toEqual([])
  })

  it('leaves out a token set to what DIYA draws anyway, and keeps stored values in range', () => {
    const same = effectiveAppearance({ 'tokens.light.focus': '#202627', 'tokens.dark.heading': '#F1F3F2', 'tokens.heightMedium': 40, 'tokens.radiusModal': 22 })
    expect(themeFile(same)).not.toMatch(/--diya-(color-focus|color-heading|height-control|radius-modal)/)
    // A corner follows the corner setting until it's set: 16px popups at Round corners are a change.
    expect(themeFile(effectiveAppearance({ corners: 16, 'tokens.radiusPopup': 16 }))).toContain('--diya-radius-popup: 16px;')
    expect(() => parseOverrides({ 'tokens.heightSmall': 20 })).toThrow()
    expect(() => parseOverrides({ 'tokens.radiusPopup': 12.5 })).toThrow()
    expect(() => parseOverrides({ 'tokens.light.focus': 'teal' })).toThrow()
    expect(parseOverrides({ 'tokens.heightSmall': 36, 'tokens.dark.fieldLine': '#6b7a7c' })).toEqual({ 'tokens.heightSmall': 36, 'tokens.dark.fieldLine': '#6B7A7C' })
    expect(settingName('tokens.light.focus')).toBe('Focus ring (Light)')
    expect(settingName('tokens.heightLarge')).toBe('Large control height')
  })

  it('flags a Light focus ring that reads on white but not over Glass, and fixes it in a click', () => {
    // The visual designer's first try: 4.71:1 on white, 2.79:1 over Glass Light's real backdrop.
    const brand = { 'tokens.light.focus': '#138086' } as const
    const issues = contrastIssues(effectiveAppearance(brand))
    expect(issues.map(({ label, minimum, path }) => ({ label, minimum, path }))).toEqual([
      { label: 'Focus rings on white, so they hold over Glass', minimum: 5.1, path: 'tokens.light.focus' },
    ])
    const fix = contrastFix(brand, issues[0])!
    expect(fix.path).toBe('tokens.light.focus')
    expect(contrast(fix.value, '#FFFFFF')).toBeGreaterThanOrEqual(5.1)
    // Without a focus color, the ring is the text color, and a pale enough text fails it too.
    const pale = contrastIssues(effectiveAppearance({ 'colors.light.text': '#6F6F6F' }))
    expect(pale.find((issue) => issue.label === 'Focus rings on white, so they hold over Glass')?.path).toBe('colors.light.text')
    expect(pale.find((issue) => issue.label === 'Text on the background')).toBeUndefined()
  })
})

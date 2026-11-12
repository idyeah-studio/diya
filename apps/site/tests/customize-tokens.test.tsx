import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppearanceProvider } from '../app/Appearance'
import { CatalogProvider } from '../components/CatalogProvider'
import { TextInputLibrary } from '../components/TextInputLibrary'
import { contrastIssues } from '../lib/customize/contrast'
import { effectiveAppearance } from '../lib/customize/appearance'
import { getSnapshot, resetStoreForTests } from '../lib/customize/store'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

/*
 * F11: Customize's Control height row (Compact, Default, Roomy; the three
 * heights move together, DS-SITE-03) and Fields rows (fill and edge, each
 * Auto until picked, per palette). The preview takes them, Get theme writes
 * them and contrast checks them.
 */
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

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <CatalogProvider>
        <TextInputLibrary />
      </CatalogProvider>
    </AppearanceProvider>
  )
  await user.click(screen.getByRole('button', { name: /^Customiz/ }))
  return screen.getByRole('complementary', { name: 'Customize Your brand' })
}

async function themeFile(user: ReturnType<typeof userEvent.setup>, panel: HTMLElement) {
  await user.click(within(panel).getByRole('button', { name: 'Get theme' }))
  const drawer = await screen.findByRole('dialog', { name: 'Get theme' })
  return { drawer, file: within(drawer).queryByRole('textbox', { name: 'Theme file' })?.textContent ?? '' }
}

/** The preview scope's own stylesheet, where a customization reaches the component. */
const scopeCss = () => document.querySelector('.customize-scope--text-input style')?.textContent ?? ''

describe('Customize: Control height', () => {
  it('steps the three heights together, in the preview and in Get theme', async () => {
    const user = userEvent.setup()
    const panel = await openPanel(user)
    const group = within(panel).getByRole('group', { name: 'Control height' })
    expect(within(group).getAllByRole('radio').map((radio) => radio.closest('label')!.textContent)).toEqual(['Compact', 'Default', 'Roomy'])
    expect((within(group).getByRole('radio', { name: 'Default' }) as HTMLInputElement).checked).toBe(true)

    await user.click(within(group).getByRole('radio', { name: 'Roomy' }))
    expect(getSnapshot().brand).toEqual({ 'tokens.heightSmall': 36, 'tokens.heightMedium': 44, 'tokens.heightLarge': 52 })
    expect(scopeCss()).toContain('--diya-height-control-medium: 44px;')
    const { drawer, file } = await themeFile(user, panel)
    expect(file).toContain('.diya-root {\n  --diya-height-control-small: 36px;\n  --diya-height-control-medium: 44px;\n  --diya-height-control-large: 52px;\n}')
    expect(drawer.textContent).toContain('Roomy · Auto')
  })

  it('Compact writes 28, 36 and 44; Default writes nothing', async () => {
    const user = userEvent.setup()
    const panel = await openPanel(user)
    const group = within(panel).getByRole('group', { name: 'Control height' })
    await user.click(within(group).getByRole('radio', { name: 'Compact' }))
    expect(getSnapshot().brand).toEqual({ 'tokens.heightSmall': 28, 'tokens.heightMedium': 36, 'tokens.heightLarge': 44 })
    await user.click(within(group).getByRole('radio', { name: 'Default' }))
    expect(getSnapshot().brand).toBeNull()
    expect(scopeCss()).not.toContain('--diya-height-control')
  })
})

describe('Customize: Fields', () => {
  it('shows Auto until a fill is picked, writes it for that palette, and goes back to Auto', async () => {
    const user = userEvent.setup()
    const panel = await openPanel(user)
    const fill = within(panel).getByRole('textbox', { name: 'Field fill' }) as HTMLInputElement
    const edge = within(panel).getByRole('textbox', { name: 'Field edge' }) as HTMLInputElement
    // Auto shows what DIYA draws: white fields in Light, edged with muted text at 70%.
    expect(fill.value).toBe('#FFFFFF')
    expect(edge.value).toBe('#495659')
    expect(fill.closest('.customize-color')!.querySelector('.customize-auto')?.textContent).toBe('Auto')

    await user.clear(fill)
    await user.type(fill, '#F4F6F6')
    expect(getSnapshot().brand).toEqual({ 'tokens.light.field': '#F4F6F6' })
    expect(scopeCss()).toContain('--diya-color-field: #F4F6F6;')
    expect(fill.closest('.customize-color')!.querySelector('.customize-auto')).toBeNull()
    expect(within(panel).getByRole('button', { name: 'Use Auto for Field fill' })).toBeTruthy()

    await user.click(within(panel).getByRole('radio', { name: 'Dark' }))
    const darkEdge = within(panel).getByRole('textbox', { name: 'Field edge' })
    await user.clear(darkEdge)
    await user.type(darkEdge, '#6B7A7C')
    expect(getSnapshot().brand).toEqual({ 'tokens.light.field': '#F4F6F6', 'tokens.dark.fieldLine': '#6B7A7C' })

    const { drawer, file } = await themeFile(user, panel)
    expect(file).toMatch(/\.diya-root\[data-theme='light'\] \{\n {4}--diya-color-field: #F4F6F6;\n {2}\}/)
    expect(file).toMatch(/\.diya-root\[data-theme='dark'\] \{\n {4}--diya-color-field-line: #6B7A7C;\n {2}\}/)
    expect(drawer.textContent).toContain('Default · Your own')
    await user.keyboard('{Escape}')

    await user.click(within(panel).getByRole('button', { name: 'Use Auto for Field edge' }))
    expect(getSnapshot().brand).toEqual({ 'tokens.light.field': '#F4F6F6' })
  })

  it('checks a picked edge against the field and the page, and takes you to it', async () => {
    const user = userEvent.setup()
    const panel = await openPanel(user)
    const edge = within(panel).getByRole('textbox', { name: 'Field edge' })
    await user.clear(edge)
    await user.type(edge, '#E2E5E5')
    const labels = contrastIssues(effectiveAppearance(getSnapshot().brand)).map((issue) => issue.label)
    expect(labels).toEqual(['Field edges on the field', 'Field edges on the background'])
    const issues = within(panel).getByRole('heading', { name: /color pairs? (is|are) hard to read/ }).closest('section')!
    await user.click(within(issues).getByRole('button', { name: 'Adjust Field edge (Light)' }))
    await waitFor(() => expect(document.activeElement).toBe(within(panel).getByRole('textbox', { name: 'Field edge' })))
    const { drawer, file } = await themeFile(user, panel)
    expect(file).toBe('')
    expect(within(drawer).getByText('Field edges on the field, in Light')).toBeTruthy()
  })
})

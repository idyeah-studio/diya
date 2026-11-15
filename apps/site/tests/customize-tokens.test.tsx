import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppearanceProvider } from '../app/Appearance'
import { CatalogProvider } from '../components/CatalogProvider'
import { TextInputLibrary } from '../components/TextInputLibrary'
import { contrastIssues } from '../lib/customize/contrast'
import { contrastFix } from '../lib/customize/theme'
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
    expect(labels).toEqual(['Field edges on the field', 'Field edges on the background', 'Field edges on white, so they hold over Glass'])
    const issues = within(panel).getByRole('heading', { name: /color pairs? (is|are) hard to read/ }).closest('section')!
    await user.click(within(issues).getByRole('button', { name: 'Adjust Field edge (Light)' }))
    await waitFor(() => expect(document.activeElement).toBe(within(panel).getByRole('textbox', { name: 'Field edge' })))
    const { drawer, file } = await themeFile(user, panel)
    expect(file).toBe('')
    expect(within(drawer).getByText('Field edges on the field, in Light')).toBeTruthy()
  })
})

// DS-SITE-04's two pairs (W10): a picked fill must keep placeholders readable and the error edge visible.
describe('Customize: a picked field fill', () => {
  it('checks quieter text at 4.5:1 and the error edge at 3:1 on it', () => {
    // Text still reads on this fill (about 6:1), but placeholders and the error edge don't.
    const issues = contrastIssues(effectiveAppearance({ 'tokens.light.field': '#9AA3A5' }))
    const muted = issues.find((issue) => issue.label === 'Quieter text in fields')!
    const error = issues.find((issue) => issue.label === 'Error edges on the field')!
    expect(issues.find((issue) => issue.label === 'Text in fields')).toBeUndefined()
    expect(muted).toMatchObject({ theme: 'light', minimum: 4.5, path: 'colors.light.text', paths: ['colors.light.text', 'tokens.light.field'] })
    expect(error).toMatchObject({ theme: 'light', minimum: 3, path: 'tokens.light.field', paths: ['tokens.light.field', 'status.light.error'] })
    // A fill that keeps them all, and Auto, add nothing.
    expect(contrastIssues(effectiveAppearance({ 'tokens.light.field': '#F4F6F6' }))).toEqual([])
    expect(contrastIssues(effectiveAppearance({ 'tokens.light.fieldLine': '#5E7476' }))).toEqual([])
  })
})

// Visual's DOC-03 ruling: under Glass Light the field renders its fill at 66% over the page behind
// Glass (about #EDEEED for a white fill), so a picked edge also needs 3:1 there.
describe('Customize: a picked field edge under Glass Light', () => {
  const glassEdge = (brand: Record<string, string | boolean>) =>
    contrastIssues(effectiveAppearance(brand)).find((issue) => issue.label === 'Field edges on the Glass field')

  it('checks the edge against the Glass field as it renders, and offers a fix', () => {
    // 3.45:1 on white, so it passes on the field and the page, but about 2.95:1 on the Glass field.
    const brand = { translucent: true, 'tokens.light.fieldLine': '#8A8A8A' }
    const issue = glassEdge(brand)!
    expect(issue).toMatchObject({ theme: 'light', minimum: 3, path: 'tokens.light.fieldLine', background: '#EDEEED' })
    expect(issue.ratio).toBeLessThan(3)
    // 3.45:1 on white fails the 3.8:1 pair too.
    expect(contrastIssues(effectiveAppearance(brand)).map((i) => i.label)).toEqual(['Field edges on white, so they hold over Glass', 'Field edges on the Glass field'])
    const fix = contrastFix(brand, issue)!
    expect(fix.path).toBe('tokens.light.fieldLine')
    expect(fix.ratio).toBeGreaterThanOrEqual(3)
    expect(glassEdge({ ...brand, 'tokens.light.fieldLine': fix.value })).toBeUndefined()
  })

  it('leaves it out without Glass, in Dark, and for the sample edge', () => {
    expect(glassEdge({ 'tokens.light.fieldLine': '#8A8A8A' })).toBeUndefined()
    expect(glassEdge({ translucent: true, 'tokens.dark.fieldLine': '#8A8A8A' })).toBeUndefined()
    // The README's sample: 3.30:1 on the Glass field.
    expect(contrastIssues(effectiveAppearance({ translucent: true, 'tokens.light.fieldLine': '#768587' }))).toEqual([])
  })
})

// VIS-04, as the README and api.json now say it: in Light a picked edge needs 3.8:1 against white,
// so it still holds 3:1 over Glass, whether or not this theme turns Glass on.
describe('Customize: a picked field edge in Light, against white', () => {
  const onWhite = (brand: Record<string, string | boolean>) =>
    contrastIssues(effectiveAppearance(brand)).find((issue) => issue.label === 'Field edges on white, so they hold over Glass')

  it('checks 3.8:1 on white, and offers a fix that reaches it', () => {
    // Brackwater's first edge: 3.49:1 on white, so it passes the 3:1 pairs but not this one.
    const brand = { 'tokens.light.fieldLine': '#7D8C8E' }
    const issue = onWhite(brand)!
    expect(issue).toMatchObject({ theme: 'light', minimum: 3.8, path: 'tokens.light.fieldLine', background: '#FFFFFF' })
    expect(contrastIssues(effectiveAppearance(brand)).map((i) => i.label)).toEqual(['Field edges on white, so they hold over Glass'])
    const fix = contrastFix(brand, issue)!
    expect(fix).toMatchObject({ path: 'tokens.light.fieldLine' })
    expect(fix.ratio).toBeGreaterThanOrEqual(3.8)
    expect(onWhite({ 'tokens.light.fieldLine': fix.value })).toBeUndefined()
  })

  it('passes the README sample, leaves Dark alone, and never flags DIYA’s own edge', () => {
    expect(onWhite({ 'tokens.light.fieldLine': '#768587' })).toBeUndefined()
    expect(onWhite({ 'tokens.dark.fieldLine': '#7D8C8E' })).toBeUndefined()
    // A picked fill alone keeps DIYA's edge, which isn't the person's pick.
    expect(onWhite({ 'tokens.light.field': '#F4F6F6' })).toBeUndefined()
  })
})

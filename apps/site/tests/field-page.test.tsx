import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { AppearanceProvider } from '../app/Appearance'
import { CatalogProvider } from '../components/CatalogProvider'
import { FieldLibrary } from '../components/FieldLibrary'
import { readPlayground } from '../components/code/playground'
import { snippetFor } from '../components/code/snippets'
import { guidance } from '../components/reference/guidance'
import { itemReference } from '../components/reference/api'
import { resolveCatalogRoute } from '../lib/catalog-route'
import { customizeItems } from '../lib/customize/registry'
import { resetStoreForTests } from '../lib/customize/store'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))
vi.mock('../components/LibraryDownload', () => ({ LibraryDownload: () => null }))

beforeEach(() => {
  window.localStorage.clear()
  resetStoreForTests()
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList)
})

/** The words the control's aria-describedby points at. */
const description = (control: Element) =>
  (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? '').join(' ')

function renderPage() {
  const view = render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <CatalogProvider>
        <FieldLibrary />
      </CatalogProvider>
    </AppearanceProvider>
  )
  return { read: () => readPlayground(view.container.querySelector('.component-document')!) }
}

describe('the Field page', () => {
  it('is a component page of its own, with its Customize item, guidance and api.json reference', () => {
    expect(resolveCatalogRoute({ area: 'components', component: 'field' })).toEqual({ area: 'components', id: 'field' })
    expect(customizeItems.field).toEqual({
      id: 'field',
      title: 'Field',
      kind: 'component',
      text: 'Label, help and the field edge',
      roles: {},
      note: 'The control inside is yours; Field draws only its frame.',
    })
    expect(guidance.field.instead).toContain('Use its own label, helperText and error.')
    expect(itemReference('field')).toMatchObject({ exportName: 'Field', importFrom: '@idyeah/diya', kind: 'component', since: '1.2.0' })
  })

  it('frames a native time input with Field’s label, help and error', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Field')
    const preview = screen.getByRole('region', { name: 'Field preview' })
    const input = within(preview).getByLabelText('Start time') as HTMLInputElement
    expect(input.type).toBe('time')
    expect(description(input)).toBe('In your time zone.')
    expect(preview.querySelector('.diya-field-frame')).toBeTruthy()

    await user.click(screen.getByRole('radio', { name: 'Error' }))
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(description(input)).toMatch(/Pick a time between 9:00 AM and 6:00 PM\./)

    await user.click(screen.getByRole('radio', { name: 'Disabled' }))
    expect(input.disabled).toBe(true)

    await user.click(screen.getByRole('checkbox', { name: 'Framed' }))
    expect(preview.querySelector('.diya-field-frame')).toBeNull()
    // Without the frame the input is the browser's own, still labeled, described and keeping its value.
    const bare = within(preview).getByLabelText('Start time') as HTMLInputElement
    expect(bare.value).toBe('09:30')
    expect(description(bare)).toBe('Locked while the event is live.')
    expect(bare.disabled).toBe(true)
  })

  it('Get code follows the playground: the size only with framed', async () => {
    const user = userEvent.setup()
    const page = renderPage()
    expect(snippetFor('field', page.read()).code).toBe(`import { Field } from '@idyeah/diya'

<Field label="Start time" helperText="In your time zone." framed>
  <input
    type="time"
    value={startTime}
    onChange={(event) => setStartTime(event.target.value)}
  />
</Field>`)
    await user.click(screen.getByRole('radio', { name: 'Large' }))
    await user.click(screen.getByRole('radio', { name: 'Error' }))
    await user.click(screen.getByRole('checkbox', { name: 'Helper text' }))
    const { code, file, functionProps } = snippetFor('field', page.read())
    expect(code).toContain('<Field\n  label="Start time"\n  error="Pick a time between 9:00 AM and 6:00 PM."\n  framed\n  size="large"\n>')
    expect(functionProps).toEqual(['onChange'])
    expect(file).toContain("const [startTime, setStartTime] = useState('09:30')")
    await user.click(screen.getByRole('checkbox', { name: 'Framed' }))
    expect(snippetFor('field', page.read()).code).not.toMatch(/framed|size=/)
  })
})

describe('the Field page’s Disabled state (UX-SITE-02)', () => {
  it('gives the reason in the help, in the preview and in Get code', async () => {
    const user = userEvent.setup()
    const page = renderPage()
    await user.click(screen.getByRole('radio', { name: 'Disabled' }))
    const input = within(screen.getByRole('region', { name: 'Field preview' })).getByLabelText('Start time') as HTMLInputElement
    expect(input.disabled).toBe(true)
    expect(description(input)).toBe('Locked while the event is live.')
    const { code } = snippetFor('field', page.read())
    expect(code).toContain('helperText="Locked while the event is live."')
    expect(code).not.toContain('In your time zone.')
    expect(code).toContain('disabled')
  })
})

describe('the Field page with Framed off (VIS-SITE-02)', () => {
  it('styles the input as the reader’s own, edged in the error color from Field’s aria-invalid, in the preview and Get code', async () => {
    const user = userEvent.setup()
    const page = renderPage()
    await user.click(screen.getByRole('checkbox', { name: 'Framed' }))
    await user.click(screen.getByRole('radio', { name: 'Error' }))
    const preview = screen.getByRole('region', { name: 'Field preview' })
    const input = within(preview).getByLabelText('Start time') as HTMLInputElement
    expect(input.className).toBe('time-input')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const css = preview.querySelector('style')!.textContent!
    expect(css).toContain(".time-input[aria-invalid='true'] {\n  border-color: var(--diya-color-error);\n}")
    expect(css).toContain('border-radius: 999px;')
    const { code } = snippetFor('field', page.read())
    expect(code).toContain('const css = `' + css + '`')
    expect(code).toContain('<style>{css}</style>')
    expect(code).toContain('className="time-input"')
    // Framed, the frame is DIYA's and the input needs no style of its own.
    await user.click(screen.getByRole('checkbox', { name: 'Framed' }))
    expect(preview.querySelector('style')).toBeNull()
    expect(snippetFor('field', page.read()).code).not.toMatch(/time-input|<style>/)
  })
})

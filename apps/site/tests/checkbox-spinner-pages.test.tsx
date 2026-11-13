import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps, ReactElement } from 'react'
import { AppearanceProvider } from '../app/Appearance'
import { CatalogProvider } from '../components/CatalogProvider'
import { CheckboxLibrary } from '../components/CheckboxLibrary'
import { SpinnerLibrary } from '../components/SpinnerLibrary'
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

function renderPage(page: ReactElement) {
  const view = render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <CatalogProvider>{page}</CatalogProvider>
    </AppearanceProvider>
  )
  return { read: () => readPlayground(view.container.querySelector('.component-document')!) }
}

const description = (control: Element) =>
  (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? '').join(' ')

describe('the Checkbox page', () => {
  it('is a component page with its Customize item (frontend.md step 11), guidance and api.json reference', () => {
    expect(resolveCatalogRoute({ area: 'components', component: 'checkbox' })).toEqual({ area: 'components', id: 'checkbox' })
    expect(customizeItems.checkbox).toEqual({ id: 'checkbox', title: 'Checkbox', kind: 'component', text: 'Label and the unchecked box', roles: { accent: 'Checked and mixed box' } })
    expect(guidance.checkbox.use).toContain('Switch acts now. Checkbox is a yes or no you send with a form. Choice picks from a list.')
    expect(guidance.switch.instead).toBe('Part of a form that’s saved with a button? Checkbox.')
    expect(itemReference('checkbox')).toMatchObject({ exportName: 'Checkbox', kind: 'component', since: '1.2.0' })
  })

  it('shows a lone box, its states, and Get code that follows them', async () => {
    const user = userEvent.setup()
    const page = renderPage(<CheckboxLibrary />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Checkbox')
    const preview = screen.getByRole('region', { name: 'Checkbox preview' })
    const box = within(preview).getByRole('checkbox', { name: 'I agree to the Terms of Service' }) as HTMLInputElement
    expect(within(preview).queryByRole('group')).toBeNull()
    expect(description(box)).toBe('You can read them any time from your account.')
    await user.click(box)
    expect(box.checked).toBe(true)
    expect(snippetFor('checkbox', page.read()).code).toBe(`import { Checkbox } from '@idyeah/diya'

<Checkbox
  label="I agree to the Terms of Service"
  checked={agreed}
  onCheckedChange={setAgreed}
  helperText="You can read them any time from your account."
/>`)

    await user.click(screen.getByRole('radio', { name: 'Error' }))
    expect(box.getAttribute('aria-invalid')).toBe('true')
    expect(description(box)).toMatch(/Agree to the terms to create your account\./)

    await user.click(screen.getByRole('radio', { name: 'Disabled' }))
    expect(box.disabled).toBe(true)
    expect(description(box)).toBe('Already agreed when your team signed up.')
    expect(snippetFor('checkbox', page.read()).code).toContain('helperText="Already agreed when your team signed up."')
  })

  // UX-SITE3-01: the select-all stays a select-all when clicked: mixed, then all, then none, then all.
  it('Mixed becomes a select-all box that chooses all, then none, and Get code gives that pattern', async () => {
    const user = userEvent.setup()
    const page = renderPage(<CheckboxLibrary />)
    const mixed = screen.getByRole('checkbox', { name: 'Mixed' }) as HTMLInputElement
    await user.click(mixed)
    const preview = screen.getByRole('region', { name: 'Checkbox preview' })
    const box = () => within(preview).getByRole('checkbox', { name: 'Select all 4 files' }) as HTMLInputElement
    expect([box().indeterminate, box().checked, description(box())]).toEqual([true, false, '2 of 4 chosen.'])
    await user.click(box())
    expect([box().indeterminate, box().checked, description(box())]).toEqual([false, true, '4 of 4 chosen.'])
    await user.click(box())
    expect([box().indeterminate, box().checked, description(box())]).toEqual([false, false, '0 of 4 chosen.'])
    await user.click(box())
    expect(box().checked).toBe(true)
    expect(mixed.checked).toBe(true)
    const { code, file } = snippetFor('checkbox', page.read())
    expect(code).toBe(`import { Checkbox } from '@idyeah/diya'

<Checkbox
  label="Select all 4 files"
  checked={chosen.length === files.length}
  indeterminate={chosen.length > 0 && chosen.length < files.length}
  onCheckedChange={(checked) => setChosen(checked ? files : [])}
  helperText={\`\${chosen.length} of \${files.length} chosen.\`}
/>`)
    expect(file).toContain("const files = ['Brief.pdf', 'Budget.xlsx', 'Logo.svg', 'Plan.docx']")
    expect(file).toContain("const [chosen, setChosen] = useState<string[]>(['Brief.pdf', 'Budget.xlsx'])")
  })
})

describe('the Spinner page', () => {
  it('is a component page with its Customize item (frontend.md step 11), guidance and api.json reference', () => {
    expect(resolveCatalogRoute({ area: 'components', component: 'spinner' })).toEqual({ area: 'components', id: 'spinner' })
    expect(customizeItems.spinner).toEqual({
      id: 'spinner',
      title: 'Spinner',
      kind: 'component',
      text: 'The ring takes the color of the words beside it',
      roles: {},
      note: 'Its color follows the text; set `color` to change it.',
    })
    expect(guidance.progress.instead).toContain('Spinner')
    expect(itemReference('spinner')).toMatchObject({ exportName: 'Spinner', kind: 'component', since: '1.2.0' })
  })

  it('waits 400ms before it shows, says its label, and Get code follows Size and Show label', async () => {
    const user = userEvent.setup()
    const page = renderPage(<SpinnerLibrary />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Spinner')
    const preview = screen.getByRole('region', { name: 'Spinner preview' })
    expect(await within(preview).findByText('Loading invoices', {}, { timeout: 2000 })).toBeTruthy()
    expect(snippetFor('spinner', page.read()).code).toBe(`import { Spinner } from '@idyeah/diya'

<Spinner label="Loading invoices" />`)
    // Start again shows the wait: the status words come only at the 400ms beat.
    await user.click(screen.getByRole('button', { name: 'Start again' }))
    expect(within(preview).queryByText('Loading invoices')).toBeNull()
    expect(await within(preview).findByText('Loading invoices', {}, { timeout: 2000 })).toBeTruthy()
    await user.click(screen.getByRole('radio', { name: 'Large' }))
    await user.click(screen.getByRole('checkbox', { name: 'Show label' }))
    expect(snippetFor('spinner', page.read()).code).toContain('<Spinner label="Loading invoices" size="large" showLabel />')
  })
})

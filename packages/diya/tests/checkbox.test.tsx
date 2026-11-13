// Checkbox (1.2): a lone yes-or-no box sent with a form, shaped like Switch (api.md §3). React 18
// and 19; react-hook-form on React 18, as the package's own form test runs.
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState, version } from 'react'
import { renderToString } from 'react-dom/server'
import { useForm } from 'react-hook-form'
import { Checkbox, Choice, DiyaProvider, Switch, TextLink } from '../dist/index.js'

const react18 = version.startsWith('18')

describe('Checkbox', () => {
  it('has Switch’s field props: label, help, error, hideLabel, disabled, size, id, className and style on the wrapper, the ref on the input', () => {
    const ref = createRef<HTMLInputElement>()
    render(<DiyaProvider><Checkbox ref={ref} id="terms" label="I agree to the Terms" helperText="Read them first." size="large" className="mine" style={{ marginTop: 3 }} /><Switch label="Email me" helperText="Weekly." /></DiyaProvider>)
    const box = screen.getByRole('checkbox', { name: 'I agree to the Terms' })
    expect(ref.current).toBe(box)
    expect(box.id).toBe('terms')
    expect(box.getAttribute('aria-describedby')).toBe('terms-description')
    expect(screen.getByText('Read them first.').id).toBe('terms-description')
    const field = box.closest('.diya-checkbox-field') as HTMLElement
    expect(field.className).toBe('diya-checkbox-field mine')
    expect(field.style.marginTop).toBe('3px')
    expect(field.getAttribute('data-size')).toBe('large')
    // The same description id scheme as Switch.
    const toggle = screen.getByRole('switch')
    expect(toggle.getAttribute('aria-describedby')).toBe(`${toggle.id}-description`)
  })

  it('hides the label visually and keeps the name; disabled dims the field and blocks the box', () => {
    render(<DiyaProvider><Checkbox label="Remember me" hideLabel disabled /></DiyaProvider>)
    const box = screen.getByRole('checkbox', { name: 'Remember me' }) as HTMLInputElement
    expect(box.disabled).toBe(true)
    expect(document.querySelector('label')!.className).toBe('diya-sr-only')
    expect(box.closest('.diya-checkbox-field')!.getAttribute('data-disabled')).toBe('true')
  })

  it("posts 'on', or its value, only while checked", () => {
    render(<form data-testid="form"><Checkbox name="terms" label="Terms" /><Checkbox name="news" value="yes" label="News" defaultChecked /></form>)
    const form = screen.getByTestId('form') as HTMLFormElement
    expect([...new FormData(form).entries()]).toEqual([['news', 'yes']])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Terms' }))
    expect([...new FormData(form).entries()]).toEqual([['terms', 'on'], ['news', 'yes']])
  })

  // K7 (QA-S78-01): no value attribute unless one is given, so react-hook-form reads a checked box
  // as true, as for a native checkbox and Switch (with value="on" it read "on"). A plain form post
  // still sends "on", the browser's own default (above).
  it('renders no value attribute unless given one', () => {
    render(<><Checkbox label="Terms" /><Checkbox label="News" value="yes" /></>)
    expect(screen.getByRole('checkbox', { name: 'Terms' }).hasAttribute('value')).toBe(false)
    expect(screen.getByRole('checkbox', { name: 'News' }).getAttribute('value')).toBe('yes')
  })

  it.runIf(react18)('register() works without a Controller', async () => {
    const user = userEvent.setup()
    const saved = vi.fn()
    function Form() {
      const { register, handleSubmit } = useForm<{ terms: boolean }>({ defaultValues: { terms: false } })
      return <form onSubmit={handleSubmit(saved)}><Checkbox label="I agree" {...register('terms')} /><button type="submit">Save</button></form>
    }
    render(<DiyaProvider><Form /></DiyaProvider>)
    await user.click(screen.getByRole('checkbox', { name: 'I agree' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(saved.mock.calls[0][0]).toEqual({ terms: true })
  })

  it('a form reset returns to defaultChecked', () => {
    render(<form><Checkbox label="Remember me" defaultChecked /><button type="reset">Reset</button></form>)
    const box = screen.getByRole('checkbox', { name: 'Remember me' }) as HTMLInputElement
    fireEvent.click(box)
    expect(box.checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(box.checked).toBe(true)
  })

  it('indeterminate renders unchecked and mixed, and the next click reports true', () => {
    const changed = vi.fn()
    function Parent() {
      const [mixed, setMixed] = useState(true)
      const [all, setAll] = useState(true)
      return <Checkbox label="All 4 projects" checked={all} indeterminate={mixed} onCheckedChange={(on) => { changed(on); setMixed(false); setAll(on) }} />
    }
    render(<Parent />)
    const box = screen.getByRole('checkbox', { name: 'All 4 projects' }) as HTMLInputElement
    expect(box.checked).toBe(false)
    expect(box.indeterminate).toBe(true)
    expect(box.getAttribute('data-indeterminate')).toBe('true')
    fireEvent.click(box)
    expect(changed).toHaveBeenCalledWith(true)
    expect(box.indeterminate).toBe(false)
    expect(box.checked).toBe(true)
    expect(box.hasAttribute('data-indeterminate')).toBe(false)
  })

  it('Space toggles; Enter doesn’t (it’s the form’s, unlike Switch)', async () => {
    const user = userEvent.setup()
    render(<Checkbox label="Remember me" />)
    const box = screen.getByRole('checkbox', { name: 'Remember me' }) as HTMLInputElement
    box.focus()
    await user.keyboard(' ')
    expect(box.checked).toBe(true)
    await user.keyboard('{Enter}')
    expect(box.checked).toBe(true)
  })

  // A link in the label opening without toggling the box is the browser's own label rule; the
  // unit DOM doesn't model it, so checkbox.spec.ts checks it in 3 engines.

  it('error sets aria-invalid and describedby, and replaces the help', () => {
    render(<DiyaProvider><Checkbox label="I agree" helperText="Required to continue." error="Agree to the Terms to continue." /></DiyaProvider>)
    const box = screen.getByRole('checkbox', { name: 'I agree' })
    expect(box.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(box.getAttribute('aria-describedby')!)!.textContent).toBe('!Agree to the Terms to continue.')
    expect(screen.queryByText('Required to continue.')).toBeNull()
    expect(box.closest('.diya-checkbox-field')!.getAttribute('data-invalid')).toBe('true')
  })

  it('switching between controlled and uncontrolled warns as a native input does', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const view = render(<Checkbox label="Remember me" checked onCheckedChange={() => {}} />)
    view.rerender(<Checkbox label="Remember me" />)
    expect(errors.mock.calls.some((call) => /controlled/i.test(call.map(String).join(' ')))).toBe(true)
    errors.mockRestore()
  })

  it('server HTML carries data-indeterminate, for Checkbox and Choice’s Select all', () => {
    const html = renderToString(<DiyaProvider><Checkbox label="All" indeterminate /><Choice label="Teams" multiple selectAll options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} defaultValue={['a']} /></DiyaProvider>)
    expect(html.match(/data-indeterminate="true"/g)).toHaveLength(2)
  })

  it('announces a blur error once, with its label’s text', async () => {
    function Host() {
      const [error, setError] = useState<string>()
      return <><Checkbox label={<>I agree to the <TextLink href="#t" inline>Terms</TextLink></>} error={error} /><button type="button" onClick={() => setError('Agree to the Terms to continue.')}>Check</button></>
    }
    render(<DiyaProvider><Host /></DiyaProvider>)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    await act(async () => { await new Promise((done) => setTimeout(done, 30)); await new Promise((done) => requestAnimationFrame(() => done(null))) })
    expect(document.querySelector('.diya-toast-host > [aria-live=polite]')!.textContent).toBe('I agree to the Terms: Agree to the Terms to continue.')
  })
})

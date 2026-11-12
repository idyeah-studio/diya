// Field's announcing and its held error (api.md §2, ux.md §1, MOT-1.2-04): one polite "Label:
// error" when an error appears on a field you've just left; nothing for a submit's several; the
// error from a blur by click waits for the press to end. React 18 and 19.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, useState } from 'react'
import { Dialog, DiyaProvider, Field } from '../dist/index.js'

const polite = () => document.querySelector('.diya-toast-host > [aria-live=polite]')?.textContent ?? ''
const settled = () => act(async () => { await new Promise((done) => setTimeout(done, 30)); await new Promise((done) => requestAnimationFrame(() => done(null))) })
afterEach(() => { vi.restoreAllMocks() })

/** A field that's validated when you leave it, beside a Pay button. */
function Card({ label = 'Card number', error: start, onPay }: { label?: string; error?: string; onPay?: () => void }) {
  const [error, setError] = useState(start)
  return (
    <>
      <Field label={label} error={error}><input onBlur={() => setError('Enter all 16 digits from the front of your card.')} onChange={() => setError(undefined)} /></Field>
      <button type="button" onClick={onPay}>Pay</button>
    </>
  )
}

describe("Field's error announcement", () => {
  it("a blur error is announced once, politely, as 'Label: error'", async () => {
    render(<DiyaProvider><Card /></DiyaProvider>)
    const input = screen.getByLabelText('Card number')
    act(() => { input.focus() })
    act(() => { screen.getByRole('button', { name: 'Pay' }).focus() })
    await settled()
    expect(polite()).toBe('Card number: Enter all 16 digits from the front of your card.')
    expect(document.querySelectorAll('.diya-toast-host > [aria-live=assertive]')[0].textContent).toBe('')
    // The same error again (a second blur) isn't said again.
    act(() => { input.focus() })
    act(() => { screen.getByRole('button', { name: 'Pay' }).focus() })
    await settled()
    expect(polite()).toBe('Card number: Enter all 16 digits from the front of your card.')
  })

  it('several errors in one task say nothing', async () => {
    function Form() {
      const [errors, setErrors] = useState<Record<string, string>>({})
      return (
        <>
          <Field label="Name" error={errors.name}><input /></Field>
          <Field label="Email" error={errors.email}><input /></Field>
          <button type="button" onClick={() => setErrors({ name: 'Enter your name.', email: 'Enter your email.' })}>Send</button>
        </>
      )
    }
    render(<DiyaProvider><Form /></DiyaProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await settled()
    expect(screen.getAllByText('Enter your name.')).toHaveLength(1)
    expect(polite()).toBe('')
  })

  it("the focused field's error isn't announced", async () => {
    function Live() {
      const [error, setError] = useState<string>()
      return <Field label="Username" error={error}><input onChange={() => setError('That name is taken.')} /></Field>
    }
    render(<DiyaProvider><Live /></DiyaProvider>)
    const input = screen.getByLabelText('Username')
    act(() => { input.focus() })
    fireEvent.change(input, { target: { value: 'ada' } })
    await settled()
    expect(screen.getByText('That name is taken.')).toBeTruthy()
    expect(polite()).toBe('')
  })

  it('an unreachable control announces on focus arrival, once per arrival', async () => {
    render(<DiyaProvider><Field label="Card number" error="Enter your card number."><div className="mount"><button type="button">inside</button></div></Field><button type="button">elsewhere</button></DiyaProvider>)
    const inside = screen.getByRole('button', { name: 'inside' })
    // The error was there from the start, while focus was elsewhere: said when focus arrives.
    act(() => { inside.focus() })
    await settled()
    expect(polite()).toBe('Card number: Enter your card number.')
    act(() => { inside.blur() })
    act(() => { screen.getByRole('button', { name: 'elsewhere' }).focus() })
    await new Promise((done) => setTimeout(done, 5100))
    expect(polite()).toBe('')
    act(() => { inside.focus() })
    await settled()
    expect(polite()).toBe('Card number: Enter your card number.')
  }, 10000)

  it('error text inside a held press appears after pointerup, then announces', async () => {
    const paid = vi.fn()
    render(<DiyaProvider><Card onPay={paid} /></DiyaProvider>)
    const input = screen.getByLabelText('Card number')
    const pay = screen.getByRole('button', { name: 'Pay' })
    act(() => { input.focus() })
    // The press starts on Pay, which takes focus: the field's blur sets the error.
    fireEvent.pointerDown(pay)
    act(() => { pay.focus() })
    await settled()
    expect(screen.queryByText('Enter all 16 digits from the front of your card.')).toBeNull()
    expect(input.hasAttribute('aria-invalid')).toBe(false)
    expect(document.querySelector('.diya-field')!.hasAttribute('data-invalid')).toBe(false)
    fireEvent.pointerUp(pay)
    fireEvent.click(pay)
    expect(paid).toHaveBeenCalledTimes(1)
    await settled()
    expect(screen.getByText('Enter all 16 digits from the front of your card.')).toBeTruthy()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    await waitFor(() => expect(polite()).toBe('Card number: Enter all 16 digits from the front of your card.'))
  })

  it('a clear is never held', async () => {
    function Clearing() {
      const [error, setError] = useState<string | undefined>('Enter your card number.')
      return <><Field label="Card number" error={error}><input /></Field><button type="button" onPointerDown={() => setError(undefined)}>Clear</button></>
    }
    render(<DiyaProvider><Clearing /></DiyaProvider>)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.queryByText('Enter your card number.')).toBeNull()
    expect(screen.getByLabelText('Card number').hasAttribute('aria-invalid')).toBe(false)
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Clear' }))
  })

  it('a keyboard blur shows at once', () => {
    render(<DiyaProvider><Card /></DiyaProvider>)
    act(() => { screen.getByLabelText('Card number').focus() })
    act(() => { screen.getByRole('button', { name: 'Pay' }).focus() })
    expect(screen.getByText('Enter all 16 digits from the front of your card.')).toBeTruthy()
  })
  afterEach(() => settled())

  it('getByText(error) finds exactly one element', async () => {
    render(<DiyaProvider><Card /></DiyaProvider>)
    act(() => { screen.getByLabelText('Card number').focus() })
    act(() => { screen.getByRole('button', { name: 'Pay' }).focus() })
    await settled()
    expect(polite()).toContain('Enter all 16 digits')
    expect(screen.getAllByText('Enter all 16 digits from the front of your card.')).toHaveLength(1)
  })

  it("inside an open Dialog the announcement lands in the Dialog's live region", async () => {
    render(<DiyaProvider><Dialog title="Pay" open onOpenChange={() => {}}><Card /></Dialog></DiyaProvider>)
    await settled()
    act(() => { screen.getByLabelText('Card number').focus() })
    act(() => { screen.getByRole('button', { name: 'Pay' }).focus() })
    await settled()
    const region = document.querySelector('dialog .diya-toast-host > [aria-live=polite]')
    expect(region?.textContent).toBe('Card number: Enter all 16 digits from the front of your card.')
  })

  it('without a provider, nothing is said and nothing breaks', async () => {
    render(<Card />)
    act(() => { screen.getByLabelText('Card number').focus() })
    act(() => { screen.getByRole('button', { name: 'Pay' }).focus() })
    await settled()
    expect(screen.getByText('Enter all 16 digits from the front of your card.')).toBeTruthy()
    expect(document.querySelector('[aria-live]')).toBeNull()
  })

  it('StrictMode: one pair of press listeners per document, removed when the last field goes', () => {
    const added = vi.spyOn(document, 'addEventListener')
    const removed = vi.spyOn(document, 'removeEventListener')
    const view = render(<StrictMode><DiyaProvider><Card /><Card label="Expiry" /></DiyaProvider></StrictMode>)
    const presses = (spy: typeof added) => spy.mock.calls.filter(([type, , capture]) => type === 'pointerdown' && capture === true).length
    expect(presses(added) - presses(removed)).toBe(1)
    view.unmount()
    expect(presses(added) - presses(removed)).toBe(0)
  })
})

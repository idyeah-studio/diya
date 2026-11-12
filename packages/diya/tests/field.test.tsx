// Field (1.2): a label, helper text and error around a control DIYA doesn't make. How it wires
// each kind of child (api.md §2), its warnings, `framed`, and refs. React 18 and 19.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createRef, forwardRef, version, type ComponentProps } from 'react'
import { DiyaProvider, Field, TextInput, type FieldControlProps } from '../dist/index.js'

afterEach(() => { vi.restoreAllMocks() })
const inProvider = (node: React.ReactNode) => render(<DiyaProvider>{node}</DiyaProvider>)

describe('Field', () => {
  it('merges id, describedby (joined), invalid, required, disabled into an input', () => {
    inProvider(<Field label="Card number" helperText="16 digits" error="Enter your card number." required disabled><input aria-describedby="hint" /></Field>)
    const input = screen.getByLabelText('Card number')
    expect(input.tagName).toBe('INPUT')
    const description = document.querySelector('.diya-field .diya-text-field-description')!
    expect(input.getAttribute('aria-describedby')).toBe(`hint ${description.id}`)
    expect(description.textContent).toBe('!Enter your card number.')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-required')).toBe('true')
    expect((input as HTMLInputElement).disabled).toBe(true)
    const field = document.querySelector('.diya-field')!
    expect(field.getAttribute('data-invalid')).toBe('true')
    expect(field.getAttribute('data-disabled')).toBe('true')
    expect(screen.getAllByText('Enter your card number.')).toHaveLength(1)
  })

  it("the child's own id wins", () => {
    inProvider(<Field label="Expiry" id="field-id"><input id="their-id" /></Field>)
    expect(screen.getByLabelText('Expiry').id).toBe('their-id')
    inProvider(<Field label="Code" id="field-id"><input /></Field>)
    expect(screen.getByLabelText('Code').id).toBe('field-id')
  })

  it('a component child also gets aria-labelledby unless it names itself', () => {
    const Custom = forwardRef<HTMLDivElement, ComponentProps<'div'>>(function Custom(props, ref) { return <div ref={ref} role="textbox" tabIndex={0} {...props} /> })
    inProvider(<><Field label="Notes"><Custom /></Field><Field label="Other"><Custom aria-label="Named" /></Field></>)
    const [first, second] = screen.getAllByRole('textbox')
    const label = document.querySelectorAll('.diya-field > label')[0]
    expect(first.getAttribute('aria-labelledby')).toBe(label.id)
    expect(first.id).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Notes' })).toBe(first)
    expect(second.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('an iframe child gets only aria-labelledby; the label has no `for`', () => {
    inProvider(<Field label="Card number" error="Enter your card number."><iframe title="Card number input" /></Field>)
    const frame = document.querySelector('iframe')!
    const label = document.querySelector('.diya-field > label')!
    expect(frame.getAttribute('aria-labelledby')).toBe(label.id)
    expect(label.hasAttribute('for')).toBe(false)
    for (const name of ['id', 'aria-describedby', 'aria-invalid', 'aria-required', 'disabled']) expect(frame.hasAttribute(name), name).toBe(false)
  })

  it('a div child gets nothing; a label click focuses the first iframe in it', () => {
    inProvider(<Field label="Card number" framed><div className="provider-mount"><iframe title="Card number input" /></div></Field>)
    const mount = document.querySelector('.provider-mount')!
    expect([...mount.attributes].map((attribute) => attribute.name)).toEqual(['class'])
    const label = document.querySelector('.diya-field > label')!
    expect(label.hasAttribute('for')).toBe(false)
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    label.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(document.querySelector('iframe'))
  })

  it('a function child receives every FieldControlProps key', () => {
    const seen: FieldControlProps[] = []
    inProvider(<Field label="Amount" helperText="In dollars" error="Enter an amount." required disabled>{(control) => { seen.push(control); return <input {...control} /> }}</Field>)
    const control = seen.at(-1)!
    expect(Object.keys(control).sort()).toEqual(['aria-describedby', 'aria-invalid', 'aria-labelledby', 'aria-required', 'disabled', 'id'])
    const label = document.querySelector('.diya-field > label')!
    expect(control).toEqual({ id: label.getAttribute('for'), 'aria-labelledby': label.id, 'aria-describedby': document.querySelector('.diya-text-field-description')!.id, 'aria-invalid': true, 'aria-required': true, disabled: true })
    expect(screen.getByLabelText('Amount')).toBeTruthy()
  })

  it.runIf(Number(version.split('.')[0]) >= 19)('a Server Component element child works (a lazy element on React 19)', () => {
    const element = <input />
    const thenable = Object.assign(Promise.resolve(element), { status: 'fulfilled', value: element })
    const lazy = { $$typeof: Symbol.for('react.lazy'), _payload: thenable, _init: (payload: { value: unknown }) => payload.value }
    inProvider(<Field label="Name">{lazy as unknown as React.ReactElement}</Field>)
    expect(screen.getByLabelText('Name').tagName).toBe('INPUT')
  })

  it('warns when wrapping a TextInput', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    inProvider(<Field label="Name"><TextInput label="Name" /></Field>)
    expect(warn.mock.calls.map(([message]) => String(message))).toContain('DIYA: Field is wrapping a TextInput, which has its own label. Pass label, helperText and error to TextInput and remove the Field, or screen readers will hear two labels.')
  })

  it('warns without a valid child', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    inProvider(<Field label="Nothing">{'just text' as unknown as React.ReactElement}</Field>)
    expect(warn.mock.calls.map(([message]) => String(message))).toContain('DIYA: Field needs one control element, or a function that renders it.')
  })

  it('framed renders .diya-field-frame, the field box, and a raw input fills it', () => {
    inProvider(<Field label="Start time" framed size="small"><input type="time" /></Field>)
    const frame = document.querySelector('.diya-field > .diya-field-frame')!
    expect(frame.classList.contains('diya-text-field-control')).toBe(true)
    expect(frame.firstElementChild).toBe(screen.getByLabelText('Start time'))
    expect(document.querySelector('.diya-field')!.getAttribute('data-size')).toBe('small')
    inProvider(<Field label="Unframed"><input /></Field>)
    expect(screen.getByLabelText('Unframed').parentElement!.classList.contains('diya-field')).toBe(true)
  })

  it('the child keeps its ref, and the wrapper takes Field’s', () => {
    const input = createRef<HTMLInputElement>()
    const wrapper = createRef<HTMLDivElement>()
    inProvider(<Field ref={wrapper} label="Name" className="mine" data-test="x"><input ref={input} /></Field>)
    expect(input.current).toBe(screen.getByLabelText('Name'))
    expect(wrapper.current?.classList.contains('diya-field')).toBe(true)
    expect(wrapper.current?.classList.contains('mine')).toBe(true)
    expect(wrapper.current?.getAttribute('data-test')).toBe('x')
  })

  it('hideLabel keeps the name and hides the label visually', () => {
    inProvider(<Field label="Search" hideLabel><input /></Field>)
    expect(screen.getByLabelText('Search')).toBeTruthy()
    expect(document.querySelector('.diya-field > label')!.className).toBe('diya-sr-only')
  })

  it('a label click on a reachable control is the browser’s own (label for)', () => {
    inProvider(<Field label="Name"><input /></Field>)
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    document.querySelector('.diya-field > label')!.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(false)
    fireEvent.click(document.querySelector('.diya-field > label')!)
  })
})

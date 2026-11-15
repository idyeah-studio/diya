// A loading Button keeps focus and does nothing: aria-disabled, not disabled, so a focused Send or Save
// doesn't drop focus to <body> while it works. Plain `disabled` is still the native attribute.
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Button, Dialog, DiyaProvider, Form, TextInput, Wizard } from '../dist/index.js'

const noop = () => {}
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}

describe('Button loading', () => {
  it('stays focusable and named, with aria-disabled and aria-busy, and keeps native disabled for disabled', () => {
    const view = render(<DiyaProvider><Button loading>Send</Button></DiyaProvider>)
    const button = screen.getByRole('button', { name: /Send/ }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.getAttribute('aria-busy')).toBe('true')
    // 1.2 (E3): the spinner replaces 1.1's "···".
    expect(button.querySelector('.diya-spinner[aria-hidden="true"] svg')).not.toBeNull()
    view.rerender(<DiyaProvider><Button disabled>Send</Button></DiyaProvider>)
    expect(button.disabled).toBe(true)
    expect(button.hasAttribute('aria-disabled')).toBe(false)
    view.rerender(<DiyaProvider><Button disabled loading>Send</Button></DiyaProvider>)
    expect(button.disabled).toBe(true)
  })

  it('ignores clicks, Enter and Space, and never submits its form, even from a field', async () => {
    const user = userEvent.setup()
    const click = vi.fn()
    const submit = vi.fn()
    render(<DiyaProvider><form onSubmit={event => { event.preventDefault(); submit() }}>
      <input aria-label="Title" />
      <Button type="submit" loading onClick={click}>Save</Button>
    </form></DiyaProvider>)
    const button = screen.getByRole('button', { name: /Save/ })
    await user.click(button)
    expect(document.activeElement).toBe(button)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    await user.click(screen.getByRole('textbox', { name: 'Title' }))
    await user.keyboard('{Enter}')
    expect(click).not.toHaveBeenCalled()
    expect(submit).not.toHaveBeenCalled()
  })

  it('keeps focus on the button through a loading cycle', async () => {
    const user = userEvent.setup()
    const work = deferred()
    const done = vi.fn()
    function Send() {
      const [busy, setBusy] = useState(false)
      return <Button loading={busy} onClick={async () => { setBusy(true); await work.promise; setBusy(false); done() }}>Send</Button>
    }
    render(<DiyaProvider><Send /></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Send' })
    await user.tab()
    expect(document.activeElement).toBe(button)
    await user.keyboard('{Enter}')
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(document.activeElement).toBe(button)
    // A second press while it works does nothing.
    await user.keyboard('{Enter}')
    await act(async () => work.resolve())
    expect(done).toHaveBeenCalledOnce()
    expect(button.hasAttribute('aria-busy')).toBe(false)
    expect(document.activeElement).toBe(button)
  })
})

describe('Patterns that use Button loading still block a second submit', () => {
  it('Form', async () => {
    const user = userEvent.setup()
    const submit = vi.fn()
    render(<DiyaProvider><Form title="Project" loading onSubmit={submit}><TextInput label="Name" value="Atlas" onValueChange={noop} /></Form></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: /Submit/ }))
    await user.click(screen.getByRole('textbox', { name: 'Name' }))
    await user.keyboard('{Enter}')
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Submit/ }).getAttribute('aria-disabled')).toBe('true')
  })

  it('Wizard', async () => {
    const user = userEvent.setup()
    const step = vi.fn()
    const steps = [{ id: 'a', label: 'Details', content: 'One' }, { id: 'b', label: 'Review', content: 'Two' }]
    render(<DiyaProvider><Wizard steps={steps} activeStep={0} onStepChange={step} onComplete={noop} loading /></DiyaProvider>)
    const next = screen.getByRole('button', { name: /Continue/ })
    await user.click(next)
    next.focus()
    await user.keyboard('{Enter}')
    expect(step).not.toHaveBeenCalled()
    expect(next.getAttribute('aria-disabled')).toBe('true')
  })

  it('Dialog confirm', async () => {
    const user = userEvent.setup()
    const work = deferred()
    const confirm = vi.fn(() => work.promise)
    render(<DiyaProvider><Dialog trigger={<Button>Delete chat</Button>} title="Delete this chat?" confirmLabel="Delete" onConfirm={confirm}>Gone for good.</Dialog></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Delete chat' }))
    const button = screen.getByRole('button', { name: 'Delete' })
    await user.click(button)
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(document.activeElement).toBe(button)
    await user.click(button)
    await user.keyboard('{Enter}')
    expect(confirm).toHaveBeenCalledOnce()
    await act(async () => work.resolve())
  })
})

// 1.2 (E3, B2): the spinner replaces "···" on every path; the rest of loading is unchanged.
describe('Button loading shows a spinner', () => {
  const spinnerOf = (node: Element) => node.querySelector(':scope > .diya-spinner')

  it('renders an aria-hidden spinner, not "···": small in small and medium Buttons, medium in large ones', () => {
    render(<DiyaProvider>
      <Button size="small" loading>Small</Button><Button loading>Medium</Button><Button size="large" loading>Large</Button>
    </DiyaProvider>)
    const sizes = ['Small', 'Medium', 'Large'].map((name) => {
      const button = screen.getByRole('button', { name })
      expect(button.textContent).toBe(name)
      expect(button.textContent).not.toContain('···')
      const spinner = spinnerOf(button)!
      expect(spinner.getAttribute('aria-hidden')).toBe('true')
      expect(spinner.hasAttribute('role')).toBe(false)
      return [spinner.getAttribute('data-size'), spinner.querySelector('svg')!.getAttribute('width')]
    })
    expect(sizes).toEqual([['small', '16'], ['small', '16'], ['medium', '20']])
    // The label is the Button's whole accessible name: nothing from the spinner.
    expect(screen.getByRole('button', { name: 'Medium' })).toBeTruthy()
  })

  it('aria-busy and aria-disabled unchanged, and no spinner when not loading', () => {
    const view = render(<DiyaProvider><Button>Send</Button></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Send' })
    expect(spinnerOf(button)).toBeNull()
    view.rerender(<DiyaProvider><Button loading>Send</Button></DiyaProvider>)
    expect([button.getAttribute('aria-busy'), button.getAttribute('aria-disabled'), (button as HTMLButtonElement).disabled]).toEqual(['true', 'true', false])
    view.rerender(<DiyaProvider><Button>Send</Button></DiyaProvider>)
    expect(spinnerOf(button)).toBeNull()
    expect(button.hasAttribute('aria-busy')).toBe(false)
  })

  it('Enter and Space do nothing while loading', async () => {
    const user = userEvent.setup()
    const click = vi.fn()
    render(<DiyaProvider><Button loading onClick={click}>Send</Button></DiyaProvider>)
    screen.getByRole('button', { name: 'Send' }).focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(click).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Send' }))
  })

  it('asChild and href paths too', async () => {
    const user = userEvent.setup()
    const click = vi.fn()
    render(<DiyaProvider>
      <Button href="/report" loading onClick={click}>Open report</Button>
      <Button asChild loading><a href="/child" onClick={click}>Child link</a></Button>
    </DiyaProvider>)
    for (const name of ['Open report', 'Child link']) {
      const link = screen.getByRole('link', { name })
      expect(spinnerOf(link)!.getAttribute('aria-hidden')).toBe('true')
      expect(link.getAttribute('aria-busy')).toBe('true')
      expect(link.getAttribute('aria-disabled')).toBe('true')
      expect(link.textContent).toBe(name)
      await user.click(link)
    }
    expect(click).not.toHaveBeenCalled()
  })

  it('iconOnly keeps its icon until the beat: the icon stays mounted beside the spinner', () => {
    const icon = <svg data-icon="plus" aria-hidden="true" />
    const view = render(<DiyaProvider><Button iconOnly aria-label="Add">{icon}</Button></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Add' })
    const before = button.querySelector('[data-icon="plus"]')
    view.rerender(<DiyaProvider><Button iconOnly aria-label="Add" loading>{icon}</Button></DiyaProvider>)
    // The same icon node (not remounted), with the spinner first; CSS swaps them on the beat.
    expect(button.querySelector('[data-icon="plus"]')).toBe(before)
    expect(button.firstElementChild!.classList.contains('diya-spinner')).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
  })
})

// F12, M1 and M3. The DOM: a label holding elements is wrapped from the first render whenever
// `loading` is given (L1); a label of plain text only while loading (M3). The first element of
// a label of more than one part is held apart (span.diya-button-leading), and CSS decides whether it's
// a leading icon (M1). The Button's spinner is there whenever the wrappers are, hidden at rest (M5).
// (These replace the F12 and L1/L3/L4 DOM tests: M1 and M3 changed the markup they asserted. N6
// gives the Button's own spinner its own class, diya-button-spinner.)
describe('Button loading markup (F12, L1, M1, M3)', () => {
  function Counter() {
    const [count, setCount] = useState(0)
    return <span data-testid="count" onClick={() => setCount((value) => value + 1)}>{count}</span>
  }
  const kids = (node: Element) => [...node.children].map((child) => child.className || child.tagName.toLowerCase())

  // O5 (named edit of M3's version): a plain-text label is never wrapped; its words stay the same
  // text node in every phase, and the spinner comes and goes after them.
  it('a plain-text label is never wrapped, so getByText finds the button in every phase, and its text node stays (M3, O5)', () => {
    const view = render(<DiyaProvider><Button loading={false}>Delete</Button></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button.innerHTML).toBe('Delete')
    expect(screen.getByText('Delete')).toBe(button)
    const words = button.firstChild
    view.rerender(<DiyaProvider><Button loading>Delete</Button></DiyaProvider>)
    expect(kids(button)).toEqual(['diya-spinner diya-button-spinner'])
    expect(button.firstChild).toBe(words)
    expect(screen.getByText('Delete')).toBe(button)
    // Ended before the beat (happy-dom runs no animations), so nothing fades back: the spinner goes at once.
    view.rerender(<DiyaProvider><Button loading={false}>Delete</Button></DiyaProvider>)
    expect(button.innerHTML).toBe('Delete')
    expect(button.firstChild).toBe(words)
  })

  it('Dialog\'s confirm, Form\'s Submit and Wizard\'s Continue are found by their text at rest, as in 1.1.1 (M3)', async () => {
    const user = userEvent.setup()
    const steps = [{ id: 'a', label: 'Details', content: 'One' }, { id: 'b', label: 'Review', content: 'Two' }]
    render(<DiyaProvider>
      <Dialog trigger={<Button>Delete chat</Button>} title="Delete this chat?" confirmLabel="Delete" onConfirm={noop}>Gone for good.</Dialog>
      <Form title="Project" onSubmit={noop}><TextInput label="Name" value="Atlas" onValueChange={noop} /></Form>
      <Wizard steps={steps} activeStep={0} onStepChange={noop} onComplete={noop} />
    </DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Delete chat' }))
    for (const name of ['Delete', 'Submit', 'Continue']) expect(screen.getByText(name), name).toBe(screen.getByRole('button', { name }))
  })

  it('a label holding elements is wrapped from the first render when loading is given, with the spinner there and hidden (L1, M5)', () => {
    render(<DiyaProvider><Button loading={false}>Saved <Counter /></Button><Button>Kept <Counter /></Button></DiyaProvider>)
    const given = screen.getByRole('button', { name: 'Saved 0' })
    expect(kids(given)).toEqual(['diya-spinner diya-button-spinner', 'diya-button-label'])
    expect(given.getAttribute('aria-busy')).toBeNull()
    // Without a loading prop: 1.1.1's markup.
    expect(screen.getByRole('button', { name: 'Kept 0' }).innerHTML).toBe('Kept <span data-testid="count">0</span>')
  })

  it('the first element of a label of more than one part is held apart, with the spinner beside it (M1)', () => {
    render(<DiyaProvider><Button loading><svg data-icon="plus" aria-hidden="true" />Add member</Button></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Add member' })
    expect(kids(button)).toEqual(['diya-button-leading', 'diya-button-label'])
    const lead = button.querySelector(':scope > .diya-button-leading')!
    expect(kids(lead)).toEqual(['diya-button-leading-content', 'diya-spinner diya-button-spinner'])
    expect(lead.querySelector('.diya-button-leading-content > svg')!.getAttribute('data-icon')).toBe('plus')
    expect(button.querySelector(':scope > .diya-button-label')!.textContent).toBe('Add member')
  })

  it('an icon and words in one fragment are two parts (M1)', () => {
    render(<DiyaProvider><Button loading={false}><><svg data-icon="send" aria-hidden="true" /> Send</></Button></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Send' })
    expect(button.querySelector('.diya-button-leading-content > svg')!.getAttribute('data-icon')).toBe('send')
    // P6 (named edit): the space after the leading part is the Button's own text node, between the spans.
    expect(button.querySelector('.diya-button-label')!.textContent).toBe('Send')
    expect(button.querySelector('.diya-button-label')!.previousSibling!.textContent).toBe(' ')
  })

  it('a stateful child keeps its state through loading on and off when loading is given from the start (L1)', () => {
    const view = render(<DiyaProvider><Button loading={false}>Saved <Counter /></Button></DiyaProvider>)
    fireEvent.click(screen.getByTestId('count'))
    fireEvent.click(screen.getByTestId('count'))
    for (const loading of [true, false, true, false]) {
      view.rerender(<DiyaProvider><Button loading={loading}>Saved <Counter /></Button></DiyaProvider>)
      expect(screen.getByTestId('count').textContent).toBe('2')
    }
  })

  it('asChild keeps the wrapper of a label holding elements when loading ends (L4)', () => {
    const view = render(<DiyaProvider><Button asChild loading><a href="/billing">Open <b>billing</b></a></Button></DiyaProvider>)
    const link = screen.getByRole('link', { name: 'Open billing' })
    view.rerender(<DiyaProvider><Button asChild loading={false}><a href="/billing">Open <b>billing</b></a></Button></DiyaProvider>)
    expect(kids(link)).toEqual(['diya-spinner diya-button-spinner', 'diya-button-label'])
  })
})

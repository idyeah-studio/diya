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

// F12: on the beat the spinner takes the place of the leading icon, or else of the label. The label
// (or icon) gets a wrapper when loading first starts and keeps it, so it can fade back.
describe('Button loading takes the place of the label or the leading icon (F12)', () => {
  it('wraps the label while loading, and keeps the wrapper after', () => {
    const view = render(<DiyaProvider><Button>Save</Button></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.innerHTML).toBe('Save')
    view.rerender(<DiyaProvider><Button loading>Save</Button></DiyaProvider>)
    expect([...button.children].map((node) => node.className)).toEqual(['diya-spinner', 'diya-button-label'])
    expect(button.querySelector('.diya-button-label')!.textContent).toBe('Save')
    view.rerender(<DiyaProvider><Button>Save</Button></DiyaProvider>)
    expect([...button.children].map((node) => node.className)).toEqual(['diya-button-label'])
    expect(screen.getByRole('button', { name: 'Save' })).toBe(button)
  })

  it('with a leading icon, the spinner joins the icon and the label stays as it is', () => {
    render(<DiyaProvider><Button loading><svg data-icon="plus" aria-hidden="true" />Add member</Button></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Add member' })
    const lead = button.querySelector(':scope > .diya-button-lead')!
    expect([...lead.children].map((node) => node.getAttribute('data-icon') ?? node.className)).toEqual(['plus', 'diya-spinner'])
    expect(button.querySelector('.diya-button-label')).toBeNull()
    expect(button.lastChild!.textContent).toBe('Add member')
  })
})

// Round 2 (L1, L3, L4).
describe('Button loading keeps its children (L1, L3, L4)', () => {
  function Counter() {
    const [count, setCount] = useState(0)
    return <span data-testid="count" onClick={() => setCount((value) => value + 1)}>{count}</span>
  }

  it('a stateful child keeps its state through loading on and off when loading is given from the start (L1)', () => {
    const view = render(<DiyaProvider><Button loading={false}>Saved <Counter /></Button></DiyaProvider>)
    fireEvent.click(screen.getByTestId('count'))
    fireEvent.click(screen.getByTestId('count'))
    expect(screen.getByTestId('count').textContent).toBe('2')
    view.rerender(<DiyaProvider><Button loading>Saved <Counter /></Button></DiyaProvider>)
    expect(screen.getByTestId('count').textContent).toBe('2')
    view.rerender(<DiyaProvider><Button loading={false}>Saved <Counter /></Button></DiyaProvider>)
    expect(screen.getByTestId('count').textContent).toBe('2')
  })

  it('a Button without a loading prop renders exactly as 1.1.1 did; with loading={false} its label is wrapped from the start (L1)', () => {
    render(<DiyaProvider><Button>Save</Button><Button loading={false}>Send</Button></DiyaProvider>)
    expect(screen.getByRole('button', { name: 'Save' }).innerHTML).toBe('Save')
    expect(screen.getByRole('button', { name: 'Send' }).innerHTML).toBe('<span class="diya-button-label">Send</span>')
  })

  it('only an svg (or DIYA\'s icon) leads: markup before the text stays in the label (L3)', () => {
    render(<DiyaProvider><Button loading><strong>Save</strong> draft</Button></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Save draft' })
    expect(button.querySelector('.diya-button-lead')).toBeNull()
    expect(button.querySelector(':scope > .diya-button-label')!.innerHTML).toBe('<strong>Save</strong> draft')
  })

  it('asChild keeps its wrapper when loading ends, so the label can fade back (L4)', () => {
    const view = render(<DiyaProvider><Button asChild loading><a href="/billing">Open billing</a></Button></DiyaProvider>)
    const link = screen.getByRole('link', { name: 'Open billing' })
    view.rerender(<DiyaProvider><Button asChild loading={false}><a href="/billing">Open billing</a></Button></DiyaProvider>)
    expect(link.innerHTML).toBe('<span class="diya-button-label">Open billing</span>')
  })
})

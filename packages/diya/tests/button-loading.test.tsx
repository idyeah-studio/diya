// A loading Button keeps focus and does nothing: aria-disabled, not disabled, so a focused Send or Save
// doesn't drop focus to <body> while it works. Plain `disabled` is still the native attribute.
import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
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
    expect(button.querySelector('.diya-button-progress')).not.toBeNull()
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

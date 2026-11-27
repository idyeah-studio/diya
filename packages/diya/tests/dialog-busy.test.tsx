// 1.3: a Dialog whose confirm action runs can't be dismissed (dismissible, loadingLabel and the
// "Working…" announcement), Drawer's dismissible, the aria-describedby merge, block descriptions,
// and the siblings they lean on: Button's aria-disabled is inert, and Form's Cancel and Wizard's Back
// use it while loading. Real Escape handling, the backdrop and layout are in the browser checks.
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useId, useState } from 'react'
import { Button, Dialog, DiyaProvider, Drawer, Form, Wizard } from '../dist/index.js'

const polite = () => document.querySelector('dialog .diya-toast-host > [aria-live=polite]')?.textContent ?? ''
const wait = (ms: number) => act(() => new Promise((done) => setTimeout(done, ms)))

/** A Dialog opened by its trigger, whose confirm action the test settles. */
function setup(props: Partial<Parameters<typeof Dialog>[0]> = {}) {
  let settle: { resolve: (value?: boolean) => void; reject: (error: Error) => void } = { resolve: () => {}, reject: () => {} }
  const confirm = vi.fn(() => new Promise<void | boolean>((resolve, reject) => { settle = { resolve, reject } }))
  const changes = vi.fn()
  const dismissed = vi.fn()
  render(<DiyaProvider><Dialog trigger={<Button>Remove workspace</Button>} title="Remove this workspace?" description="This removes its projects and files."
    confirmLabel="Remove" confirmVariant="destructive" onConfirm={confirm} onOpenChange={changes} onDismiss={dismissed} {...props}>Nothing else changes.</Dialog></DiyaProvider>)
  return { confirm, changes, dismissed, settle: () => settle }
}

async function openAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Remove workspace' }))
  const dialog = screen.getByRole('dialog', { name: 'Remove this workspace?' }) as HTMLDialogElement
  await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
  return dialog
}

/** Escape's keydown as the browser sends it, from `target`; whether DIYA prevented it. */
function escape(target: Element, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event.defaultPrevented
}

/** A click on the dimmed page around the dialog: it lands on the dialog element, outside its box. */
function clickOutside(dialog: HTMLElement) {
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({ left: 500, right: 980, top: 200, bottom: 600, x: 500, y: 200, width: 480, height: 400, toJSON: () => ({}) })
  fireEvent.click(dialog, { clientX: 10, clientY: 10 })
}

describe('Dialog while its confirm action runs', () => {
  it('refuses Escape, the close button, Cancel and a click outside, and keeps both buttons focusable', async () => {
    const user = userEvent.setup()
    const { changes, dismissed } = setup()
    const dialog = await openAndConfirm(user)
    const close = within(dialog).getByRole('button', { name: 'Close dialog' })
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' })
    expect(within(dialog).getByRole('button', { name: 'Remove' }).getAttribute('aria-busy')).toBe('true')
    for (const button of [close, cancel]) {
      expect(button.getAttribute('aria-disabled')).toBe('true')
      expect(button.hasAttribute('disabled')).toBe(false)
    }
    // Found by role as unavailable, as Testing Library reads aria-disabled.
    expect(within(dialog).getByRole('button', { name: 'Cancel', disabled: true } as never)).toBe(cancel)
    // Escape: its keydown is prevented at the window, and a close request that gets through anyway
    // (a cancelable cancel) is refused.
    expect(escape(within(dialog).getByRole('button', { name: 'Remove' }))).toBe(true)
    expect(escape(document.body)).toBe(true)
    expect(fireEvent(dialog, new Event('cancel', { cancelable: true }))).toBe(false)
    await user.click(close)
    await user.click(cancel)
    act(() => cancel.focus())
    expect(document.activeElement).toBe(cancel)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    act(() => close.focus())
    expect(document.activeElement).toBe(close)
    await user.keyboard('{Enter}')
    clickOutside(dialog)
    expect(dialog.open).toBe(true)
    expect(changes).not.toHaveBeenCalledWith(false)
    expect(dismissed).not.toHaveBeenCalled()
  })

  it('closes when the work succeeds and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    const { settle, changes } = setup()
    const dialog = await openAndConfirm(user)
    await act(async () => settle().resolve())
    expect(dialog.open).toBe(false)
    expect(changes).toHaveBeenLastCalledWith(false)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove workspace' }))
  })

  it('shows a failure and makes the close button and Cancel available again', async () => {
    const user = userEvent.setup()
    const { settle, dismissed } = setup()
    const dialog = await openAndConfirm(user)
    await act(async () => settle().reject(new Error('The workspace is in use. Try again in a minute.')))
    expect(within(dialog).getByRole('alert').textContent).toBe('The workspace is in use. Try again in a minute.')
    for (const name of ['Close dialog', 'Cancel']) expect(within(dialog).getByRole('button', { name }).hasAttribute('aria-disabled')).toBe(false)
    expect(escape(document.body)).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(dialog.open).toBe(false)
    expect(dismissed).toHaveBeenCalledOnce()
  })

  it('stays open and available when the action returns false', async () => {
    const user = userEvent.setup()
    const { settle } = setup()
    const dialog = await openAndConfirm(user)
    await act(async () => settle().resolve(false))
    expect(dialog.open).toBe(true)
    expect(within(dialog).getByRole('button', { name: 'Cancel' }).hasAttribute('aria-disabled')).toBe(false)
  })

  it('loading alone locks a controlled dialog, and turning it off unlocks it', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    const view = (loading: boolean) => <DiyaProvider><Dialog open title="Rename chat" loading={loading} onOpenChange={changes}
      footer={<Button variant="quiet" aria-disabled={loading}>Cancel</Button>}>Body</Dialog></DiyaProvider>
    const { rerender } = render(view(true))
    const dialog = screen.getByRole('dialog', { name: 'Rename chat' }) as HTMLDialogElement
    expect(escape(dialog)).toBe(true)
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
    clickOutside(dialog)
    expect(changes).not.toHaveBeenCalled()
    rerender(view(false))
    expect(escape(dialog)).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
    expect(changes).toHaveBeenCalledWith(false)
  })

  it('dismissible lets people dismiss work in progress, whose result is then ignored', async () => {
    const user = userEvent.setup()
    const { settle, dismissed, changes } = setup({ dismissible: true })
    const dialog = await openAndConfirm(user)
    expect(within(dialog).getByRole('button', { name: 'Cancel' }).hasAttribute('aria-disabled')).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(dialog.open).toBe(false)
    expect(dismissed).toHaveBeenCalledOnce()
    const calls = changes.mock.calls.length
    await act(async () => settle().resolve())
    expect(dialog.open).toBe(false)
    expect(changes.mock.calls.length).toBe(calls)
  })

  it('dismissible={false} keeps an idle dialog open until the app closes it', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    const view = (open: boolean) => <DiyaProvider><Dialog open={open} dismissible={false} title="Accept the terms" onOpenChange={changes}>Body</Dialog></DiyaProvider>
    const { rerender } = render(view(true))
    const dialog = screen.getByRole('dialog', { name: 'Accept the terms' }) as HTMLDialogElement
    const close = within(dialog).getByRole('button', { name: 'Close dialog' })
    const done = within(dialog).getByRole('button', { name: 'Close' })
    expect(close.getAttribute('aria-disabled')).toBe('true')
    expect(done.getAttribute('aria-disabled')).toBe('true')
    // Not working, so nothing waits for the beat.
    expect(dialog.querySelector('.diya-dialog-layout')!.hasAttribute('data-busy')).toBe(false)
    expect(escape(dialog)).toBe(true)
    await user.click(close)
    await user.click(done)
    clickOutside(dialog)
    expect(dialog.open).toBe(true)
    expect(changes).not.toHaveBeenCalled()
    rerender(view(false))
    expect(dialog.open).toBe(false)
  })

  it('honors the app closing it while it works', async () => {
    const user = userEvent.setup()
    let settle: () => void = () => {}
    function Example() {
      const [open, setOpen] = useState(false)
      return <DiyaProvider><Button onClick={() => setOpen(true)}>Open</Button><Button onClick={() => setOpen(false)}>Elsewhere</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Export" confirmLabel="Export" onConfirm={() => new Promise<void>((done) => { settle = done })}>Body</Dialog></DiyaProvider>
    }
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog', { name: 'Export' }) as HTMLDialogElement
    await user.click(within(dialog).getByRole('button', { name: 'Export' }))
    act(() => screen.getByRole('button', { name: 'Elsewhere', hidden: true }).click())
    expect(dialog.open).toBe(false)
    await act(async () => settle())
    expect(dialog.open).toBe(false)
  })

  it("runs the app's onCancel first, and its preventDefault still wins", () => {
    const changes = vi.fn()
    const cancel = vi.fn((event: Event) => event.preventDefault())
    render(<DiyaProvider><Dialog open title="Settings" onOpenChange={changes} onCancel={cancel as never}>Body</Dialog></DiyaProvider>)
    fireEvent(screen.getByRole('dialog', { name: 'Settings' }), new Event('cancel', { cancelable: true }))
    expect(cancel).toHaveBeenCalledOnce()
    expect(changes).not.toHaveBeenCalled()
  })

  it('never prevents an Escape that is composing text, or one a popup inside already handled', async () => {
    const user = userEvent.setup()
    setup()
    const dialog = await openAndConfirm(user)
    expect(escape(dialog, { isComposing: true })).toBe(false)
    // A popup's own Escape (it prevents it, then closes): left alone, so nothing else happens.
    const handled = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    handled.preventDefault()
    dialog.dispatchEvent(handled)
    expect(dialog.open).toBe(true)
  })

  it('shows itself again after a close request the browser would not let it stop', async () => {
    const user = userEvent.setup()
    const { changes } = setup()
    const dialog = await openAndConfirm(user)
    const confirm = within(dialog).getByRole('button', { name: 'Remove' })
    act(() => confirm.focus())
    // Android's back gesture: a cancel that can't be prevented, then the browser closes it.
    fireEvent(dialog, new Event('cancel', { cancelable: false }))
    act(() => dialog.close())
    expect(dialog.open).toBe(true)
    expect(document.activeElement).toBe(confirm)
    expect(changes).not.toHaveBeenCalledWith(false)
  })

  it('announces "Working…" politely on the beat, once, and takes it back on success', async () => {
    const user = userEvent.setup()
    const { settle } = setup()
    await openAndConfirm(user)
    await wait(250)
    expect(polite()).toBe('')
    await waitFor(() => expect(polite()).toBe('Working…'), { timeout: 1000 })
    await act(async () => settle().resolve())
    expect(document.querySelector('.diya-toast-host > [aria-live=polite]')?.textContent ?? '').toBe('')
  })

  it('says nothing when the work settles before the beat', async () => {
    const user = userEvent.setup()
    const { settle } = setup()
    await openAndConfirm(user)
    await wait(100)
    await act(async () => settle().resolve(false))
    await wait(500)
    expect(polite()).toBe('')
  })

  it('says loadingLabel instead', async () => {
    const user = userEvent.setup()
    const { settle } = setup({ loadingLabel: 'Removing the workspace…' })
    await openAndConfirm(user)
    await waitFor(() => expect(polite()).toBe('Removing the workspace…'), { timeout: 1000 })
    await act(async () => settle().resolve(false))
  })

  it('says nothing for an empty loadingLabel', async () => {
    const user = userEvent.setup()
    setup({ loadingLabel: '' })
    await openAndConfirm(user)
    await wait(700)
    expect(polite()).toBe('')
  })
})

describe('Drawer dismissible', () => {
  it('false refuses Escape, the close button and a click outside, and the close button says so', async () => {
    const user = userEvent.setup()
    const change = vi.fn()
    render(<DiyaProvider><Drawer open dismissible={false} onOpenChange={change} title="Edit profile" data-testid="drawer"><p>Body</p></Drawer></DiyaProvider>)
    const drawer = screen.getByTestId('drawer') as HTMLDialogElement
    const close = within(drawer).getByRole('button', { name: 'Close drawer' })
    expect(close.getAttribute('aria-disabled')).toBe('true')
    expect(close.hasAttribute('disabled')).toBe(false)
    expect(escape(close)).toBe(true)
    fireEvent(drawer, new Event('cancel', { cancelable: true }))
    await user.click(close)
    act(() => close.focus())
    await user.keyboard('{Enter}')
    clickOutside(drawer)
    expect(change).not.toHaveBeenCalled()
    expect(drawer.open).toBe(true)
  })

  it('true, the default, closes as before', async () => {
    const user = userEvent.setup()
    const change = vi.fn()
    render(<DiyaProvider><Drawer open onOpenChange={change} title="Filters"><p>Body</p></Drawer></DiyaProvider>)
    const close = screen.getByRole('button', { name: 'Close drawer' })
    expect(close.hasAttribute('aria-disabled')).toBe(false)
    expect(escape(close)).toBe(false)
    await user.click(close)
    expect(change).toHaveBeenCalledWith(false)
  })

  it('shows itself again after a close request the browser would not let it stop', () => {
    const change = vi.fn()
    render(<DiyaProvider><Drawer open dismissible={false} onOpenChange={change} title="Edit profile" data-testid="drawer"><p>Body</p></Drawer></DiyaProvider>)
    const drawer = screen.getByTestId('drawer') as HTMLDialogElement
    fireEvent(drawer, new Event('cancel', { cancelable: false }))
    act(() => drawer.close())
    expect(drawer.open).toBe(true)
    expect(change).not.toHaveBeenCalled()
  })
})

describe('aria-describedby and the description', () => {
  function Described({ kind, description }: { kind: 'dialog' | 'drawer'; description?: string }) {
    const note = useId()
    const body = <p id={note}>Billing records stay for seven years.</p>
    return <DiyaProvider>{kind === 'dialog'
      ? <Dialog open title="Remove" description={description} aria-describedby={note}>{body}</Dialog>
      : <Drawer open onOpenChange={() => {}} title="Remove" description={description} aria-describedby={note}>{body}</Drawer>}</DiyaProvider>
  }

  for (const kind of ['dialog', 'drawer'] as const) {
    it(`${kind}: adds yours after the description, keeps yours without one, and adds nothing when none is given`, () => {
      const { unmount } = render(<Described kind={kind} description="This removes its projects." />)
      const modal = screen.getByRole('dialog', { name: 'Remove' })
      const note = screen.getByText('Billing records stay for seven years.')
      const description = screen.getByText('This removes its projects.')
      expect(modal.getAttribute('aria-describedby')).toBe(`${description.id} ${note.id}`)
      unmount()
      render(<Described kind={kind} />)
      expect(screen.getByRole('dialog', { name: 'Remove' }).getAttribute('aria-describedby')).toBe(screen.getByText('Billing records stay for seven years.').id)
    })
  }

  it('adds nothing when there is neither', () => {
    render(<DiyaProvider><Dialog open title="Plain" /><Drawer open onOpenChange={() => {}} title="Plainer">Body</Drawer></DiyaProvider>)
    expect(screen.getByRole('dialog', { name: 'Plain' }).hasAttribute('aria-describedby')).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Plainer' }).hasAttribute('aria-describedby')).toBe(false)
  })

  it('a block description renders in a div and is all read; a string stays a paragraph', () => {
    const block = <><p>This removes its projects.</p><p>Billing records stay.</p></>
    render(<DiyaProvider>
      <Dialog open title="Block" description={block} />
      <Drawer open onOpenChange={() => {}} title="Drawer block" description={block}>Body</Drawer>
      <Dialog open title="Text" description="Just words." />
      <Drawer open onOpenChange={() => {}} title="Drawer text" description="Just words too.">Body</Drawer>
    </DiyaProvider>)
    for (const name of ['Block', 'Drawer block']) {
      const modal = screen.getByRole('dialog', { name })
      const description = document.getElementById(modal.getAttribute('aria-describedby')!)!
      expect(description.tagName).toBe('DIV')
      expect(description.textContent).toBe('This removes its projects.Billing records stay.')
      expect(description.querySelectorAll(':scope > p')).toHaveLength(2)
      // No paragraph inside a paragraph.
      expect(modal.querySelector('p p')).toBeNull()
    }
    for (const [name, text] of [['Text', 'Just words.'], ['Drawer text', 'Just words too.']]) {
      const description = document.getElementById(screen.getByRole('dialog', { name }).getAttribute('aria-describedby')!)!
      expect(description.tagName).toBe('P')
      expect(description.textContent).toBe(text)
    }
  })

  it('the close button sits in the title row; Dialog\'s description starts its scrolling body, Drawer\'s stays in the header', () => {
    render(<DiyaProvider><Dialog open title="Order" description="Placed today.">Body</Dialog><Drawer open onOpenChange={() => {}} title="Details" description="Edit it.">Body</Drawer></DiyaProvider>)
    const heading = document.querySelector('.diya-dialog-heading')!
    expect([...heading.children].map((node) => node.className)).toEqual(['diya-dialog-title', 'diya-dialog-close'])
    const layout = heading.parentElement!
    expect([...layout.children].map((node) => node.className)).toEqual(['diya-dialog-heading', 'diya-dialog-scroll', 'diya-dialog-actions'])
    expect([...layout.children[1].children].map((node) => node.className)).toEqual(['diya-dialog-description', 'diya-dialog-content'])
    const header = document.querySelector('.diya-drawer-modal > header')!
    expect([...header.children].map((node) => node.className.split(' ')[0])).toEqual(['diya-drawer-title', 'diya-drawer-description', 'diya-button'])
  })
})

describe('Button aria-disabled', () => {
  for (const value of [true, 'true'] as const) {
    it(`aria-disabled=${JSON.stringify(value)} blocks click, Enter and Space, and keeps focus`, async () => {
      const user = userEvent.setup()
      const click = vi.fn()
      const submit = vi.fn((event: Event) => event.preventDefault())
      render(<form onSubmit={submit as never}><Button aria-disabled={value} onClick={click}>Cancel</Button><Button type="submit" aria-disabled={value}>Send</Button></form>)
      const cancel = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancel)
      act(() => cancel.focus())
      await user.keyboard('{Enter}')
      await user.keyboard(' ')
      expect(document.activeElement).toBe(cancel)
      const send = screen.getByRole('button', { name: 'Send' })
      await user.click(send)
      act(() => send.focus())
      await user.keyboard('{Enter}')
      expect(click).not.toHaveBeenCalled()
      expect(submit).not.toHaveBeenCalled()
      expect(cancel.getAttribute('aria-disabled')).toBe('true')
      expect(cancel.hasAttribute('disabled')).toBe(false)
    })
  }

  it('a plain Button, or aria-disabled={false}, still acts', async () => {
    const user = userEvent.setup()
    const click = vi.fn()
    const keys = vi.fn()
    render(<><Button onClick={click}>One</Button><Button aria-disabled={false} onClick={click} onKeyDown={keys}>Two</Button></>)
    await user.click(screen.getByRole('button', { name: 'One' }))
    act(() => screen.getByRole('button', { name: 'Two' }).focus())
    await user.keyboard('{Enter}')
    expect(click).toHaveBeenCalledTimes(2)
    expect(keys).toHaveBeenCalled()
  })

  it("still runs the app's own onKeyDown while unavailable", async () => {
    const user = userEvent.setup()
    const keys = vi.fn()
    render(<Button aria-disabled onKeyDown={keys}>Cancel</Button>)
    act(() => screen.getByRole('button', { name: 'Cancel' }).focus())
    await user.keyboard('{ArrowDown}')
    expect(keys).toHaveBeenCalledOnce()
  })
})

describe('Form and Wizard while loading', () => {
  it("Form's Cancel is unavailable but focusable, and does nothing", async () => {
    const user = userEvent.setup()
    const cancel = vi.fn()
    render(<DiyaProvider><Form title="Project" loading onSubmit={() => {}} onCancel={cancel}><input aria-label="Name" /></Form></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Cancel' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.hasAttribute('disabled')).toBe(false)
    act(() => button.focus())
    expect(document.activeElement).toBe(button)
    await user.keyboard('{Enter}')
    await user.click(button)
    expect(cancel).not.toHaveBeenCalled()
  })

  it("Wizard's Back is unavailable but focusable while loading; on the first step it stays disabled", async () => {
    const user = userEvent.setup()
    const step = vi.fn()
    const steps = [{ id: 'a', label: 'Details', content: 'One' }, { id: 'b', label: 'Review', content: 'Two' }]
    const { rerender } = render(<DiyaProvider><Wizard steps={steps} activeStep={1} onStepChange={step} onComplete={() => {}} loading /></DiyaProvider>)
    const back = screen.getByRole('button', { name: 'Back' })
    expect(back.getAttribute('aria-disabled')).toBe('true')
    expect(back.hasAttribute('disabled')).toBe(false)
    act(() => back.focus())
    await user.keyboard('{Enter}')
    await user.click(back)
    expect(step).not.toHaveBeenCalled()
    rerender(<DiyaProvider><Wizard steps={steps} activeStep={0} onStepChange={step} onComplete={() => {}} loading /></DiyaProvider>)
    expect(screen.getByRole('button', { name: 'Back' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Back' }).hasAttribute('aria-disabled')).toBe(false)
  })
})

it('keeps the ref and other attributes on the dialog element', () => {
  const ref = createRef<HTMLDialogElement>()
  render(<DiyaProvider><Dialog ref={ref} open title="Ref" dismissible={false} data-testid="ref" /></DiyaProvider>)
  expect(ref.current).toBe(screen.getByTestId('ref'))
  expect(ref.current!.hasAttribute('dismissible')).toBe(false)
})

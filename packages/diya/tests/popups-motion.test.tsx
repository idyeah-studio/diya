// Popups that animate: what a closing popup does while its exit plays, the Tooltip hover delay
// and the Toast exit. HappyDOM has no Web Animations, so exits are synchronous by default; these
// tests stand in a running exit where they need one. Runs on React 18 and 19.
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, Combobox, Dialog, DiyaProvider, Drawer, Menu, Toast, Tooltip } from '../dist/index.js'

/** Makes elements with `className` report one running exit, which the test settles. */
function holdExits(className: string) {
  const settles: (() => void)[] = []
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    writable: true,
    value(this: Element) {
      if (!this.classList.contains(className)) return []
      let settle!: () => void
      const finished = new Promise<void>((resolve) => { settle = resolve })
      settles.push(settle)
      return [{ effect: { target: this, pseudoElement: null }, finished }]
    },
  })
  return { finish: () => act(async () => { settles.splice(0).forEach((settle) => settle()); await new Promise((resolve) => setTimeout(resolve, 0)) }) }
}
afterEach(() => {
  delete (Element.prototype as { getAnimations?: unknown }).getAnimations
  delete (Element.prototype as { animate?: unknown }).animate
})

describe('a closing popup', () => {
  it('stays in its dialog’s portal, inert, until its exit ends', async () => {
    const exits = holdExits('diya-floating')
    const user = userEvent.setup()
    render(<DiyaProvider><Dialog trigger={<Button>Open settings</Button>} title="Settings">
      <Menu label="Project actions" items={[{ id: 'rename', label: 'Rename' }]} />
    </Dialog></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    const trigger = within(dialog).getByRole('button', { name: 'Project actions' })
    await user.click(trigger)
    const panel = screen.getByRole('menu', { name: 'Project actions' })
    expect(panel.parentElement).toBe(dialog)
    expect(panel.inert).toBe(false)
    await user.keyboard('{Escape}')
    // Still there for its exit: the same node, in the same outlet, and out of reach.
    expect(panel.isConnected).toBe(true)
    expect(panel.parentElement).toBe(dialog)
    expect(panel.getAttribute('data-exiting')).toBe('true')
    expect(panel.inert).toBe(true)
    expect(panel.hasAttribute('inert')).toBe(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
    await exits.finish()
    expect(panel.isConnected).toBe(false)
  })

  it('skips its exit when it closes because the page scrolled', async () => {
    holdExits('diya-floating')
    const user = userEvent.setup()
    render(<DiyaProvider><Combobox label="Team" options={[{ value: 'design', label: 'Design' }]} value="" onValueChange={() => {}} /></DiyaProvider>)
    await user.click(screen.getByRole('combobox', { name: 'Team' }))
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.scroll(window)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('Combobox keeps its last options while closing', async () => {
    const exits = holdExits('diya-floating')
    const user = userEvent.setup()
    const options = ['Design', 'Build', 'Research'].map((label) => ({ value: label.toLowerCase(), label }))
    function Field() {
      const [value, setValue] = useState('')
      return <Combobox label="Team" options={options} value={value} onValueChange={setValue} />
    }
    render(<DiyaProvider><Field /></DiyaProvider>)
    await user.type(screen.getByRole('combobox', { name: 'Team' }), 'Res')
    const list = screen.getByRole('listbox')
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual(['Research'])
    await user.keyboard('{Enter}')
    // Closing resets the query, but the leaving list still shows the one row it showed.
    expect(list.getAttribute('data-exiting')).toBe('true')
    expect(Array.from(list.querySelectorAll('li')).map((option) => option.textContent)).toEqual(['Research✓'])
    await exits.finish()
    expect(list.isConnected).toBe(false)
  })
})

describe('Dialog and Drawer while closing', () => {
  it('Dialog confirm runs once when clicked twice', async () => {
    const confirmed = vi.fn()
    render(<DiyaProvider><Dialog trigger={<Button>Delete</Button>} title="Delete project?" onConfirm={confirmed} confirmLabel="Delete" /></DiyaProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const confirm = within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' })
    await act(async () => { fireEvent.click(confirm) })
    // Safari still delivers a click to a dialog during its exit; it must confirm nothing.
    await act(async () => { fireEvent.click(confirm) })
    expect(confirmed).toHaveBeenCalledOnce()
  })

  it('is inert while its exit plays, and reopens usable', async () => {
    const exits = holdExits('diya-dialog')
    function Host() {
      const [open, setOpen] = useState(true)
      return <><Button onClick={() => setOpen(!open)}>Toggle</Button><Dialog open={open} onOpenChange={setOpen} title="Settings" /></>
    }
    render(<DiyaProvider><Host /></DiyaProvider>)
    const dialog = document.querySelector('dialog')!
    expect(dialog.inert).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(dialog.open).toBe(false)
    expect(dialog.inert).toBe(true)
    await exits.finish()
    expect(dialog.inert).toBe(false)
    // Reopened mid-exit, it's usable at once.
    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(dialog.inert).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle', hidden: true }))
    expect(dialog.open).toBe(true)
    expect(dialog.inert).toBe(false)
  })

  it('Drawer is inert while its exit plays', async () => {
    const exits = holdExits('diya-drawer-modal')
    function Host() {
      const [open, setOpen] = useState(true)
      return <Drawer open={open} onOpenChange={setOpen} title="Details">Body</Drawer>
    }
    render(<DiyaProvider><Host /></DiyaProvider>)
    const drawer = document.querySelector('dialog')!
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close drawer' }))
    expect(drawer.inert).toBe(true)
    await exits.finish()
    expect(drawer.inert).toBe(false)
  })
})

describe('Tooltip hover delay', () => {
  function cold() {
    vi.useFakeTimers()
    // Start cold: no tooltip shown in the last moments.
    vi.advanceTimersByTime(1000)
  }
  const tip = () => screen.queryByRole('tooltip')
  const mouse = { pointerType: 'mouse' }
  const hover = (element: Element) => fireEvent.pointerEnter(element, mouse)
  const unhover = (element: Element) => fireEvent.pointerLeave(element, mouse)
  const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
  const help = () => screen.getByRole('button', { name: 'Billing help' })

  it('waits 300ms on a mouse hover', () => {
    cold()
    render(<DiyaProvider><Tooltip label="Billing help" content="Charged monthly">?</Tooltip></DiyaProvider>)
    hover(help())
    expect(tip()).toBeNull()
    wait(299)
    expect(tip()).toBeNull()
    wait(1)
    expect(tip()?.textContent).toBe('Charged monthly')
  })

  it('shows nothing when the pointer passes over', () => {
    cold()
    render(<DiyaProvider><Tooltip label="Billing help" content="Charged monthly">?</Tooltip></DiyaProvider>)
    hover(help())
    wait(200)
    unhover(help())
    wait(1000)
    expect(tip()).toBeNull()
  })

  it('shows at once on keyboard focus or a tap, and not on a mouse click by itself', () => {
    cold()
    render(<DiyaProvider><Tooltip label="Billing help" content="Charged monthly">?</Tooltip></DiyaProvider>)
    fireEvent.focus(help())
    expect(tip()?.textContent).toBe('Charged monthly')
    fireEvent.blur(help())
    expect(tip()).toBeNull()
    wait(1000)
    // A mouse press: focus and the click wait for the hover.
    fireEvent.pointerDown(help(), mouse)
    fireEvent.focus(help())
    fireEvent.click(help(), { detail: 1 })
    expect(tip()).toBeNull()
    fireEvent.blur(help())
    wait(1000)
    // A tap.
    fireEvent.pointerEnter(help(), { pointerType: 'touch' })
    expect(tip()).not.toBeNull()
  })

  it('shows the next tooltip at once while one is warm', () => {
    cold()
    render(<DiyaProvider>
      <Tooltip label="Bold" content="Bold text">B</Tooltip>
      <Tooltip label="Italic" content="Italic text">I</Tooltip>
    </DiyaProvider>)
    hover(screen.getByRole('button', { name: 'Bold' }))
    wait(300)
    expect(tip()?.textContent).toBe('Bold text')
    unhover(screen.getByRole('button', { name: 'Bold' }))
    hover(screen.getByRole('button', { name: 'Italic' }))
    expect(screen.getAllByRole('tooltip').map((node) => node.textContent)).toContain('Italic text')
    // Still warm just after the last one closed.
    unhover(screen.getByRole('button', { name: 'Italic' }))
    wait(200)
    expect(tip()).toBeNull()
    hover(screen.getByRole('button', { name: 'Bold' }))
    expect(tip()?.textContent).toBe('Bold text')
  })

  it('shows at once with motion="off", as in 1.0', () => {
    cold()
    render(<DiyaProvider motion="off"><Tooltip label="Billing help" content="Charged monthly">?</Tooltip></DiyaProvider>)
    hover(help())
    expect(tip()?.textContent).toBe('Charged monthly')
  })

  it('stays up while the pointer rests on the bubble', () => {
    cold()
    render(<DiyaProvider><Tooltip label="Billing help" content="Charged monthly">?</Tooltip></DiyaProvider>)
    hover(help())
    wait(300)
    const bubble = tip()!
    unhover(help())
    fireEvent.mouseEnter(bubble)
    wait(1000)
    expect(tip()).toBe(bubble)
    fireEvent.mouseLeave(bubble)
    wait(200)
    expect(tip()).toBeNull()
  })

  it('clears its timers when it unmounts', () => {
    cold()
    const errors = vi.spyOn(console, 'error')
    const { unmount } = render(<DiyaProvider><Tooltip label="Billing help" content="Charged monthly">?</Tooltip></DiyaProvider>)
    hover(help())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    wait(1000)
    expect(errors).not.toHaveBeenCalled()
  })

  it('closes at once, with no exit, when the page scrolls', () => {
    holdExits('diya-floating')
    render(<DiyaProvider><Tooltip label="Billing help" content="Charged monthly">?</Tooltip></DiyaProvider>)
    fireEvent.focus(help())
    expect(tip()).not.toBeNull()
    fireEvent.scroll(window)
    expect(tip()).toBeNull()
  })
})

describe('Toast exit', () => {
  /** A browser's Web Animations and computed exit timing, enough for the toast's leaving copy. */
  function webAnimations(duration = '0.16s') {
    const animations: { keyframes: Keyframe[]; options: KeyframeAnimationOptions; finish: () => void }[] = []
    Object.defineProperty(Element.prototype, 'animate', {
      configurable: true,
      writable: true,
      value(keyframes: Keyframe[], options: KeyframeAnimationOptions) {
        let finish!: () => void
        const finished = new Promise<void>((resolve) => { finish = resolve })
        animations.push({ keyframes, options, finish })
        return { finished, cancel() {} }
      },
    })
    const real = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element, pseudo?: string | null) => {
      const style = real(element, pseudo)
      if (!(element as HTMLElement).classList?.contains('diya-toast-region')) return style
      return new Proxy(style, {
        get(target, property) {
          if (property === 'animationDuration') return duration
          if (property === 'animationTimingFunction') return 'cubic-bezier(0.4, 0, 1, 1)'
          if (property === 'getPropertyValue') return (name: string) => name === '--diya-internal-motion-distance-edge' ? '12px' : target.getPropertyValue(name)
          const value = Reflect.get(target, property)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    })
    return animations
  }
  function Host() {
    const [toast, setToast] = useState<string | undefined>()
    // The keyless pattern many apps use: raising the same message again is the same state.
    return <>
      <Button onClick={() => setToast('Saved')}>Save</Button>
      {toast && <Toast duration={0} onDismiss={() => setToast(undefined)}>{toast}</Toast>}
    </>
  }
  const copies = () => Array.from(document.querySelectorAll<HTMLElement>('.diya-toast-region[aria-hidden="true"]'))

  it('calls onDismiss at once, and plays the exit on a copy', async () => {
    const animations = webAnimations()
    const dismissed = vi.fn()
    render(<DiyaProvider><Toast duration={0} onDismiss={dismissed}>Saved</Toast></DiyaProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }))
    expect(dismissed).toHaveBeenCalledOnce()
    expect(copies()).toHaveLength(1)
    expect(animations).toHaveLength(1)
    expect(animations[0].options).toMatchObject({ duration: 160, easing: 'cubic-bezier(0.4, 0, 1, 1)' })
    expect(animations[0].keyframes.at(-1)).toMatchObject({ opacity: 0, translate: '0 12px' })
  })

  it('a new toast raised at once is not cleared', async () => {
    const animations = webAnimations()
    vi.useFakeTimers()
    render(<DiyaProvider><Host /></DiyaProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('status').textContent).toContain('Saved')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }))
    expect(screen.queryByRole('status')).toBeNull()
    // Saved again while the first one is still leaving.
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('status').textContent).toContain('Saved')
    await act(async () => { animations.forEach((animation) => animation.finish()); vi.advanceTimersByTime(2000) })
    expect(screen.getByRole('status').textContent).toContain('Saved')
    expect(copies()).toHaveLength(0)
  })

  it('never announces the copy or lets it take focus or clicks', () => {
    webAnimations()
    render(<DiyaProvider><Toast duration={0} onDismiss={() => {}} action={{ label: 'Undo', onClick: () => {} }}>Archived</Toast></DiyaProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }))
    const [copy] = copies()
    expect(copy.inert).toBe(true)
    expect(copy.style.pointerEvents).toBe('none')
    for (const element of [copy, ...Array.from(copy.querySelectorAll('*'))]) {
      const names = Array.from(element.attributes).map((attribute) => attribute.name)
      expect(names.filter((name) => name === 'id' || name === 'role' || (name.startsWith('aria-') && !(element === copy && name === 'aria-hidden')))).toEqual([])
    }
    // Only the real toast is announced; the host keeps it mounted here.
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Undo' })).toHaveLength(1)
  })

  it('removes the copy when its exit ends, or after a second at most', async () => {
    const animations = webAnimations()
    vi.useFakeTimers()
    const { unmount } = render(<DiyaProvider><Toast duration={0} onDismiss={() => {}}>Saved</Toast></DiyaProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }))
    expect(copies()).toHaveLength(1)
    await act(async () => { animations[0].finish() })
    expect(copies()).toHaveLength(0)
    unmount()
    render(<DiyaProvider><Toast duration={0} onDismiss={() => {}}>Saved</Toast></DiyaProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }))
    expect(copies()).toHaveLength(1)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(copies()).toHaveLength(0)
  })

  it('makes no copy when the exit takes no time, or without Web Animations', () => {
    webAnimations('0s')
    render(<DiyaProvider><Toast duration={0} onDismiss={() => {}}>Saved</Toast></DiyaProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }))
    expect(copies()).toHaveLength(0)
    delete (Element.prototype as { animate?: unknown }).animate
    render(<DiyaProvider><Toast duration={0} onDismiss={() => {}}>Again</Toast></DiyaProvider>)
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss alert' })[1])
    expect(copies()).toHaveLength(0)
  })
})

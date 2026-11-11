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

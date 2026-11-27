// 1.3: a long Dialog keeps its title row and buttons pinned, and only the description and body
// scroll between them. HappyDOM has no layout, so sizes are stubbed here; the browser checks
// (tests/browser/dialog-busy.spec.ts) measure the real thing. Also: Button's aria-disabled holds
// with href and asChild.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Alert, Button, Dialog, DiyaProvider } from '../dist/index.js'

/** Gives the scroller a size: `content` tall inside a `view` tall box. */
function size(scroller: HTMLElement, content: number, view: number) {
  Object.defineProperty(scroller, 'scrollHeight', { configurable: true, get: () => content })
  Object.defineProperty(scroller, 'clientHeight', { configurable: true, get: () => view })
}
const scroller = () => document.querySelector<HTMLElement>('.diya-dialog-scroll')!
const layout = () => document.querySelector<HTMLElement>('.diya-dialog-layout')!

describe('a long Dialog', () => {
  it('scrolls the description and body between the title row and the buttons; the description is still read', () => {
    render(<DiyaProvider><Dialog open title="Terms" description="Read them before you accept." onConfirm={() => {}}><p>Body</p></Dialog></DiyaProvider>)
    const dialog = screen.getByRole('dialog', { name: 'Terms' })
    const description = scroller().querySelector('.diya-dialog-description')!
    expect(description.textContent).toBe('Read them before you accept.')
    expect(dialog.getAttribute('aria-describedby')).toBe(description.id)
    expect(scroller().querySelector('.diya-dialog-content')!.textContent).toBe('Body')
    expect(dialog.querySelector('.diya-dialog-heading')!.contains(description)).toBe(false)
  })

  it("pins DIYA's own error between the scroller and the buttons", async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Dialog open title="Export" onConfirm={() => { throw new Error('The export failed. Try again.') }} confirmLabel="Export"><p>Body</p></Dialog></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect([...layout().children].map((node) => node.className)).toEqual(['diya-dialog-heading', 'diya-dialog-scroll', 'diya-workflow-error', 'diya-dialog-actions'])
    expect(screen.getByRole('alert').textContent).toBe('The export failed. Try again.')
  })

  it('opens at the top every time', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Dialog trigger={<Button>Read terms</Button>} title="Terms"><p>Long terms.</p></Dialog></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Read terms' }))
    scroller().scrollTop = 300
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'Read terms' }))
    expect(scroller().scrollTop).toBe(0)
  })

  it('marks scrolled and more-below for the hairlines', () => {
    render(<DiyaProvider><Dialog open title="Terms"><p>Long terms.</p></Dialog></DiyaProvider>)
    size(scroller(), 900, 300)
    act(() => { fireEvent.scroll(scroller()) })
    expect(layout().hasAttribute('data-scrolled')).toBe(false)
    expect(layout().hasAttribute('data-more')).toBe(true)
    scroller().scrollTop = 600
    act(() => { fireEvent.scroll(scroller()) })
    expect(layout().hasAttribute('data-scrolled')).toBe(true)
    expect(layout().hasAttribute('data-more')).toBe(false)
  })

  it('is a Tab stop only when it overflows and holds nothing focusable', () => {
    const { rerender } = render(<DiyaProvider><Dialog open title="Terms" showClose={false}><p>Long terms.</p></Dialog></DiyaProvider>)
    size(scroller(), 300, 300)
    act(() => { fireEvent.scroll(scroller()) })
    expect(scroller().hasAttribute('tabindex')).toBe(false)
    size(scroller(), 900, 300)
    act(() => { fireEvent.scroll(scroller()) })
    expect(scroller().getAttribute('tabindex')).toBe('0')
    rerender(<DiyaProvider><Dialog open title="Terms" showClose={false}><p>Long terms.</p><a href="#more">More</a></Dialog></DiyaProvider>)
    act(() => { fireEvent.scroll(scroller()) })
    expect(scroller().hasAttribute('tabindex')).toBe(false)
  })

  it("scrolls an alert your code adds to the body into view, and doesn't move focus", async () => {
    const scrolled = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value: scrolled })
    function Example() {
      const [failed, setFailed] = useState(false)
      return <DiyaProvider><Dialog open title="Book a room" footer={<Button onClick={() => setFailed(true)}>Book</Button>}>
        {failed && <Alert tone="error" title="That room was just taken" urgent>Pick another time.</Alert>}
        <p>Long details.</p>
      </Dialog></DiyaProvider>
    }
    render(<Example />)
    const book = screen.getByRole('button', { name: 'Book' })
    act(() => book.focus())
    await act(async () => { book.click(); await Promise.resolve() })
    expect(scrolled).toHaveBeenCalledWith({ block: 'nearest' })
    expect(scrolled.mock.contexts[0]).toBe(screen.getByRole('alert'))
    expect(document.activeElement).toBe(book)
    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView
  })

  it('without a description or a body, there is nothing to scroll', () => {
    render(<DiyaProvider><Dialog open title="Sign out?" onConfirm={() => {}} /></DiyaProvider>)
    expect(document.querySelector('.diya-dialog-scroll')).toBeNull()
  })
})

describe("Button's aria-disabled holds on every path", () => {
  it('with href: clicks and Enter do nothing, and it stays a focusable link', async () => {
    const user = userEvent.setup()
    const clicked = vi.fn()
    render(<Button href="/billing" aria-disabled onClick={clicked}>Billing</Button>)
    const link = screen.getByRole('link', { name: 'Billing' })
    expect(link.getAttribute('aria-disabled')).toBe('true')
    expect(link.getAttribute('href')).toBe('/billing')
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    act(() => link.focus())
    expect(document.activeElement).toBe(link)
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    link.dispatchEvent(enter)
    expect(enter.defaultPrevented).toBe(true)
    await user.click(link)
    expect(clicked).not.toHaveBeenCalled()
  })

  it('with asChild: a Button-level aria-disabled reaches the child and blocks it', async () => {
    const user = userEvent.setup()
    const clicked = vi.fn()
    render(<Button asChild aria-disabled onClick={clicked}><a href="/reports">Reports</a></Button>)
    const link = screen.getByRole('link', { name: 'Reports' })
    expect(link.getAttribute('aria-disabled')).toBe('true')
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    await user.click(link)
    act(() => link.focus())
    await user.keyboard('{Enter}')
    expect(clicked).not.toHaveBeenCalled()
  })

  it('with asChild: the child\'s own aria-disabled blocks it too', async () => {
    const user = userEvent.setup()
    const clicked = vi.fn()
    render(<Button asChild onClick={clicked}><button type="button" aria-disabled="true">Archive</button></Button>)
    const button = screen.getByRole('button', { name: 'Archive' })
    await user.click(button)
    act(() => button.focus())
    await user.keyboard('{Enter}')
    expect(clicked).not.toHaveBeenCalled()
  })

  it('without aria-disabled, href and asChild Buttons still act', async () => {
    const user = userEvent.setup()
    const clicked = vi.fn((event: Event) => event.preventDefault())
    render(<><Button href="/a" onClick={clicked as never}>A</Button><Button asChild onClick={clicked as never}><a href="/b">B</a></Button></>)
    await user.click(screen.getByRole('link', { name: 'A' }))
    await user.click(screen.getByRole('link', { name: 'B' }))
    expect(clicked).toHaveBeenCalledTimes(2)
    expect(within(document.body).getByRole('link', { name: 'A' }).hasAttribute('aria-disabled')).toBe(false)
  })
})

// The visual review's second pass (VIS-06 to VIS-11), read from the stylesheet; the browser checks
// measure them in Chromium, WebKit and Firefox.
describe('the stylesheet', () => {
  const css = readFileSync(resolve(process.cwd(), 'dist/styles.css'), 'utf8').replace(/\s+/g, ' ')

  it('VIS-06: the line under the title stops short of the focused close button', () => {
    expect(css).toContain(".diya-root .diya-dialog-heading:has(> .diya-dialog-close:focus-visible)::after { inset-inline-end: 36px; }")
  })

  it('VIS-07: only a Button in DIYA\'s own colors trades its opacity for dimmed colors when focused', () => {
    const focused = css.match(/[^{}]*\.diya-button[^{}]*\[aria-disabled='true'\][^{}]*:focus-visible \{[^}]*opacity: 1;/g) ?? []
    expect(focused).toHaveLength(1)
    expect(focused[0]).toContain(":is([class='diya-button']):not([aria-busy='true'], [style*='color'], [style*='background'], [style*='border'])")
  })

  it('VIS-08: the beat is a transition, so a button already unavailable has nothing to change', () => {
    expect(css).not.toMatch(/@keyframes diya-(button|dialog)-unavailable/)
    expect(css).toContain("@property --diya-internal-unavailable { syntax: '<number>'; inherits: false; initial-value: 0; }")
    expect(css.match(/transition: --diya-internal-unavailable var\(--diya-internal-duration-medium\) var\(--diya-ease-enter\) var\(--diya-internal-beat, 400ms\);/g)).toHaveLength(2)
  })

  it('VIS-09: a focused scroller has rounded corners and hides the hairlines', () => {
    expect(css).toMatch(/\.diya-dialog-scroll:focus-visible \{[^}]*border-radius: var\(--diya-radius-control/)
    expect(css).toContain('.diya-root .diya-dialog-layout:has(> .diya-dialog-scroll:focus-visible) > .diya-dialog-heading::after')
  })

  it('VIS-11: a phone on its side takes the phone padding', () => {
    expect(css).toContain('@media (max-width: 600px), (max-height: 480px) { .diya-root .diya-dialog-layout { --diya-internal-dialog-pad: 24px; } }')
  })
})

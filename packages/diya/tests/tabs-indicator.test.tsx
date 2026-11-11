// The Tabs indicator: measured on the client, never trusted on the server, gone with motion off.
// HappyDOM has no layout, so the tests give each tab a box.
import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { DiyaProvider, Tabs, type TabItem } from '../dist/index.js'

const items: TabItem[] = [
  { value: 'overview', label: 'Overview', content: 'One' },
  { value: 'activity', label: 'Activity', content: 'Two' },
  { value: 'settings', label: 'Settings', content: 'Three' },
]
/** Tabs 100px wide and 40px tall, 8px apart from 4px in, or 0 wide when `hidden`. */
function layout({ hidden = false } = {}) {
  const box = (element: HTMLElement) => element.getAttribute('role') === 'tab' ? Array.from(element.parentElement!.querySelectorAll('[role="tab"]')).indexOf(element) : -1
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) { return box(this) >= 0 && !hidden ? 100 : 0 })
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) { return box(this) >= 0 && !hidden ? 40 : 0 })
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) { return box(this) >= 0 ? 4 + box(this) * 108 : 0 })
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) { return box(this) >= 0 ? 4 : 0 })
}
/** A ResizeObserver the test can fire. */
function observers() {
  const made: { callback: () => void; observed: Element[]; disconnected: boolean }[] = []
  vi.stubGlobal('ResizeObserver', class {
    record: (typeof made)[number]
    constructor(callback: () => void) { this.record = { callback, observed: [], disconnected: false }; made.push(this.record) }
    observe(element: Element) { this.record.observed.push(element) }
    disconnect() { this.record.disconnected = true }
  })
  return made
}
function Host({ variant = 'underline' as 'underline' | 'pill', motion }: { variant?: 'underline' | 'pill'; motion?: 'off' }) {
  const [value, setValue] = useState('overview')
  return <DiyaProvider motion={motion}><Tabs label="Project" items={items} value={value} onValueChange={setValue} variant={variant} /></DiyaProvider>
}
const tablist = () => screen.getByRole('tablist')
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('Tabs indicator', () => {
  it('server HTML keeps the per-tab mark and no data-indicator', () => {
    const html = renderToString(<DiyaProvider><Tabs label="Project" items={items} value="activity" onValueChange={() => {}} variant="pill" /></DiyaProvider>)
    expect(html).not.toContain('data-indicator')
    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*>.*Activity/)
    // The indicator is there, but its CSS shows it only once the list has data-indicator.
    expect(html).toContain('class="diya-tab-indicator" aria-hidden="true"')
  })

  it('measures before paint and sets data-indicator, placing it at once the first time', () => {
    layout()
    observers()
    render(<Host />)
    const list = tablist()
    expect(list.dataset.indicator).toBe('still')
    expect(list.style.getPropertyValue('--diya-internal-tab-indicator-x')).toBe('4px')
    expect(list.style.getPropertyValue('--diya-internal-tab-indicator-width')).toBe('100px')
  })

  it('slides for a selection just made, and moves at once for a resize later', () => {
    layout()
    const made = observers()
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    render(<Host />)
    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }))
    const list = tablist()
    expect(list.dataset.indicator).toBe('move')
    expect(list.style.getPropertyValue('--diya-internal-tab-indicator-x')).toBe('220px')
    now += 400
    act(() => { made.at(-1)!.callback() })
    return new Promise<void>((done) => requestAnimationFrame(() => {
      expect(list.dataset.indicator).toBe('still')
      done()
    }))
  })

  it('shows the per-tab mark while the tabs measure 0 wide, as in a hidden panel', () => {
    layout({ hidden: true })
    observers()
    render(<Host />)
    expect(tablist().hasAttribute('data-indicator')).toBe(false)
  })

  it('observes the list and every tab, and stops when it unmounts', () => {
    layout()
    const made = observers()
    const { unmount } = render(<Host />)
    const observer = made.at(-1)!
    expect(observer.observed).toContain(tablist())
    expect(observer.observed.filter((element) => element.getAttribute('role') === 'tab')).toHaveLength(3)
    unmount()
    expect(observer.disconnected).toBe(true)
  })

  it('puts a copy of each pill label over its tab, out of the accessibility tree', () => {
    layout()
    observers()
    render(<Host variant="pill" />)
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    const copies = Array.from(document.querySelectorAll<HTMLElement>('.diya-tab-indicator-labels > .diya-tab'))
    expect(copies.map((copy) => copy.textContent)).toEqual(['Overview', 'Activity', 'Settings'])
    expect(copies.map((copy) => copy.style.left)).toEqual(['4px', '112px', '220px'])
    expect(copies[0].closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('swaps the selected tab\'s own mark for the indicator without a fade', async () => {
    const { readFileSync } = await import('node:fs')
    const css = readFileSync('src/styles.css', 'utf8')
    expect(css).toMatch(/\.diya-root \.diya-tab-list\[data-indicator\] \.diya-tab\[aria-selected='true'\] \{\s*transition-duration: 0s;\s*\}/)
  })

  it('motion off renders no indicator and no observer', () => {
    layout()
    const made = observers()
    render(<Host motion="off" variant="pill" />)
    expect(document.querySelector('.diya-tab-indicator')).toBeNull()
    expect(tablist().hasAttribute('data-indicator')).toBe(false)
    expect(made).toHaveLength(0)
  })
})

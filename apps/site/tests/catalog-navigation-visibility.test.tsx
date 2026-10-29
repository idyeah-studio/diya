import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { useActiveCatalogItem } from '../components/useActiveCatalogItem'

const observers: MockResizeObserver[] = []
class MockResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  constructor(public callback: ResizeObserverCallback) {
    observers.push(this)
  }
}

const layout = { height: 500 }
function Navigation({ current = 'chart', query = '' }: { current?: string; query?: string }) {
  const nav = useRef<HTMLElement>(null)
  useActiveCatalogItem(nav, current, query)
  return <nav ref={nav} aria-label="Catalog items">
    <a href="#chart" aria-current={current === 'chart' ? 'page' : undefined} data-offset="280">Data Viz</a>
    <a href="#empty" aria-current={current === 'empty' ? 'page' : undefined} data-offset="900">Content State</a>
  </nav>
}

function nav() {
  return screen.getByRole('navigation', { name: 'Catalog items' })
}
function resize(height: number) {
  layout.height = height
  const observer = observers.at(-1)!
  act(() => observer.callback([], observer as unknown as ResizeObserver))
}
function expectActiveVisible() {
  const container = nav().getBoundingClientRect()
  const item = nav().querySelector<HTMLElement>('[aria-current="page"]')!.getBoundingClientRect()
  expect(item.top).toBeGreaterThanOrEqual(container.top)
  expect(item.bottom).toBeLessThanOrEqual(container.bottom)
}

beforeEach(() => {
  observers.length = 0
  layout.height = 500
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
  // Model the link's position inside a real scrolling content area, including scrollTop.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const container = this.closest<HTMLElement>('nav')
    if (this.tagName === 'NAV') return new DOMRect(0, 100, 260, layout.height)
    if (this.hasAttribute('data-offset') && container)
      return new DOMRect(16, 100 + Number(this.dataset.offset) - container.scrollTop, 228, 40)
    return new DOMRect()
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('active catalog navigation visibility', () => {
  it('reveals the selected row when a desktop navigation area shrinks to phone height', () => {
    render(<Navigation />)
    expect(nav().scrollTop).toBe(0)
    expectActiveVisible()
    resize(80)
    expectActiveVisible()
    expect(nav().scrollTop).toBe(260)
  })

  it('reveals an active row clipped above the viewport when the navigation area grows', () => {
    layout.height = 80
    render(<Navigation />)
    nav().scrollTop = 350
    resize(500)
    expectActiveVisible()
    expect(nav().scrollTop).toBe(50)
  })

  it('keeps the existing scroll position when the active row is already visible', () => {
    render(<Navigation />)
    nav().scrollTop = 200
    resize(200)
    expectActiveVisible()
    expect(nav().scrollTop).toBe(200)
    resize(500)
    expectActiveVisible()
    expect(nav().scrollTop).toBe(200)
  })

  it('resets new searches to the first result and never moves search browsing on resize', () => {
    layout.height = 80
    const { rerender } = render(<Navigation />)
    expect(nav().scrollTop).toBe(260)
    rerender(<Navigation query="chart" />)
    expect(nav().scrollTop).toBe(0)
    nav().scrollTop = 75
    resize(40)
    expect(nav().scrollTop).toBe(75)
    rerender(<Navigation query="charts" />)
    expect(nav().scrollTop).toBe(0)
    rerender(<Navigation />)
    expect(nav().scrollTop).toBe(0)
    // The observer's initial notification must not undo the explicit query reset.
    resize(40)
    expect(nav().scrollTop).toBe(0)
    resize(80)
    expectActiveVisible()
  })

  it('reveals a matching selected result on remount with a retained nonempty query', () => {
    layout.height = 80
    const first = render(<Navigation current="empty" query="state" />)
    expectActiveVisible()
    first.unmount()
    render(<Navigation current="empty" query="state" />)
    expectActiveVisible()
    expect(nav().scrollTop).toBe(880)
  })

  it('reveals a newly selected matching result while the retained query stays the same', () => {
    layout.height = 80
    const { rerender } = render(<Navigation query="navigation" />)
    expectActiveVisible()
    const previousScroll = nav().scrollTop
    rerender(<Navigation current="empty" query="navigation" />)
    expectActiveVisible()
    expect(nav().scrollTop).toBeGreaterThan(previousScroll)
  })

  it('reveals a newly selected clipped row and disconnects old observers', () => {
    const { rerender, unmount } = render(<Navigation />)
    const original = observers[0]
    expect(original.observe).toHaveBeenCalledWith(nav())
    rerender(<Navigation current="empty" />)
    expect(original.disconnect).toHaveBeenCalledOnce()
    expectActiveVisible()
    const replacement = observers.at(-1)!
    unmount()
    expect(replacement.disconnect).toHaveBeenCalledOnce()
  })

  it('uses window resize when ResizeObserver is unavailable and removes its listener', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<Navigation />)
    layout.height = 80
    act(() => window.dispatchEvent(new Event('resize')))
    expectActiveVisible()
    unmount()
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Button, DiyaProvider, SiteHeader, type SiteHeaderItem } from '../dist/index.js'

const items: SiteHeaderItem[] = [
  { value: 'projects', label: 'Projects', href: '#projects' },
  { value: 'activity', label: 'Activity', href: '#activity' },
  { value: 'people', label: 'People', disabled: true },
]
let fixtureStyles: HTMLStyleElement | undefined

// Model measurable content and container resizing. The assertions exercise the
// resulting interaction/layout mode; real browser screenshots still verify geometry.
function geometry(initialWidth: number) {
  let width = initialWidth
  const observers = new Set<{ callback: ResizeObserverCallback }>()
  class Observer {
    constructor(readonly callback: ResizeObserverCallback) { observers.add(this) }
    observe() {}
    unobserve() {}
    disconnect() { observers.delete(this) }
  }
  vi.stubGlobal('ResizeObserver', Observer)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    font: '', measureText: (text: string) => ({ width: text.length * 8 }),
  } as unknown as CanvasRenderingContext2D)
  const original = HTMLElement.prototype.getBoundingClientRect
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    let size: number | undefined
    if (this.classList.contains('diya-site-header-container')) size = width
    else if (this.classList.contains('diya-site-brand')) size = 80
    else if (this.classList.contains('diya-button')) size = 40
    if (size === undefined) return original.call(this)
    return { x: 0, y: 0, top: 0, bottom: 40, left: 0, right: size, width: size, height: 40, toJSON() {} }
  })
  fixtureStyles = document.createElement('style')
  fixtureStyles.textContent = `
    .diya-site-nav, .diya-site-mobile-nav { gap: 4px; }
    [data-navigation-value] { font: 400 14px Arial; padding: 10px 12px; }
    .diya-site-tools { gap: 4px; }
    [hidden] { display: none !important; }
  `
  document.head.append(fixtureStyles)
  return (next: number) => act(() => {
    width = next
    Array.from(observers).forEach(observer => observer.callback([], observer as unknown as ResizeObserver))
  })
}

function Example({ navigation = items, search = true, tools = 1, account = true, navigate = () => {}, utility = () => {}, submit = () => {} }: {
  navigation?: SiteHeaderItem[]; search?: boolean; tools?: number; account?: boolean
  navigate?: (value: string) => void; utility?: () => void; submit?: (value: string) => void
}) {
  const [value, setValue] = useState('projects')
  const [query, setQuery] = useState('')
  return <DiyaProvider><SiteHeader brand="Veylo" brandLabel="Veylo home"
    onBrandClick={() => setValue('projects')} items={navigation} value={value}
    onValueChange={next => { setValue(next); navigate(next) }}
    search={search ? { label: 'Search projects', value: query, onValueChange: setQuery, onSubmit: submit } : undefined}
    utilities={tools ? <>{['Notifications', 'Settings', 'Support'].slice(0, tools).map(label => <Button key={label} iconOnly aria-label={label} onClick={utility}>{label}</Button>)}</> : undefined}
    avatar={account ? <Button iconOnly aria-label="Account" onClick={utility}>ML</Button> : undefined} />
    <Button>After header</Button>
  </DiyaProvider>
}
function header() { return document.querySelector<HTMLElement>('.diya-site-header-container')! }

afterEach(() => { fixtureStyles?.remove(); vi.unstubAllGlobals() })

describe('Site Header disclosure and content fit', () => {
  it('uses ordinary navigation with a valid collapsed relationship and Escape from its toggle or search', async () => {
    geometry(390)
    const user = userEvent.setup()
    render(<Example />)
    const toggle = screen.getByRole('button', { name: 'Open navigation' })
    const nav = document.getElementById(toggle.getAttribute('aria-controls')!)!
    expect(nav.hidden).toBe(true)
    expect(nav.classList.contains('diya-site-nav')).toBe(true)
    expect(nav.classList.contains('diya-site-mobile-nav')).toBe(true)
    expect(header().querySelectorAll('nav')).toHaveLength(1)
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).toBeNull()
    await user.click(toggle)
    expect(nav.hidden).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(toggle)
    await user.keyboard('{Escape}')
    expect(nav.hidden).toBe(true)
    expect(document.activeElement).toBe(toggle)
    await user.keyboard(' ')
    act(() => screen.getByRole('searchbox', { name: 'Search projects' }).focus())
    await user.keyboard('{Escape}')
    expect(nav.hidden).toBe(true)
    expect(document.activeElement).toBe(toggle)
    expect(header().querySelector('[role="menu"], [role="menubar"]')).toBeNull()
  })

  it('closes on focus leaving or an outside pointer without trapping or stealing focus', async () => {
    geometry(390)
    const user = userEvent.setup()
    render(<Example />)
    const toggle = screen.getByRole('button', { name: 'Open navigation' })
    await user.click(toggle)
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    act(() => within(nav).getByRole('link', { name: 'Activity' }).focus())
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After header' }))
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'After header' }))
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After header' }))
  })

  it('preserves link semantics and modified clicks, while normal navigation closes and restores its disclosure', async () => {
    geometry(390)
    const navigate = vi.fn()
    const user = userEvent.setup()
    render(<Example navigate={navigate} />)
    const toggle = screen.getByRole('button', { name: 'Open navigation' })
    await user.click(toggle)
    const link = screen.getByRole('link', { name: 'Activity' })
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
    act(() => link.dispatchEvent(modified))
    expect(modified.defaultPrevented).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: 'People' }) as HTMLButtonElement).disabled).toBe(true)
    await user.click(link)
    expect(navigate).toHaveBeenCalledExactlyOnceWith('activity')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle)
    await user.click(toggle)
    expect(screen.getByRole('link', { name: 'Activity' }).getAttribute('aria-current')).toBe('page')
  })

  it('reports the chosen item through onValueChange and marks it current', async () => {
    geometry(1100)
    const navigate = vi.fn()
    const user = userEvent.setup()
    render(<Example navigate={navigate} />)
    expect(screen.getByRole('link', { name: 'Projects' }).getAttribute('aria-current')).toBe('page')
    await user.click(screen.getByRole('link', { name: 'Activity' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith('activity')
    expect(screen.getByRole('link', { name: 'Activity' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Projects' }).hasAttribute('aria-current')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'People' }))
    expect(navigate).toHaveBeenCalledOnce()
  })

  it('reflows by container fit, allows Search to shrink, and accounts for long labels and omitted slots', () => {
    const resize = geometry(720)
    const view = render(<Example />)
    expect(header().dataset.compact).toBe('false')
    resize(700)
    expect(header().dataset.compact).toBe('true')
    expect(header().dataset.stacked).toBe('false')
    resize(900)
    expect(header().dataset.compact).toBe('false')
    view.rerender(<Example navigation={items.map(item => ({ ...item, label: item.label + ' and detailed reporting' }))} />)
    expect(header().dataset.compact).toBe('true')
    expect(header().dataset.stacked).toBe('false')
    view.rerender(<Example search={false} tools={0} account={false} />)
    resize(650)
    expect(header().dataset.compact).toBe('false')
    expect(header().querySelector('.diya-site-utilities')).toBeNull()
    expect(screen.queryByRole('search')).toBeNull()
    expect(header().querySelectorAll('nav')).toHaveLength(1)
  })

  it('keeps default compact actions before Search and wraps caller tools only when their measured content needs it', async () => {
    const resize = geometry(320)
    const user = userEvent.setup()
    const view = render(<Example />)
    expect(header().dataset.stacked).toBe('true')
    expect(header().dataset.toolsWrap).toBe('false')
    const order: string[] = []
    for (let index = 0; index < 5; index += 1) {
      await user.tab()
      order.push(document.activeElement?.getAttribute('aria-label') ?? '')
    }
    expect(order).toEqual(['Veylo home', 'Notifications', 'Account', 'Open navigation', ''])
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Search projects' }))
    view.rerender(<Example tools={3} />)
    expect(header().dataset.toolsWrap).toBe('true')
    expect(header().querySelector('.diya-site-utilities')?.firstElementChild?.className).toBe('diya-site-avatar')
    resize(350)
    expect(header().dataset.toolsWrap).toBe('false')
    resize(390)
    expect(header().dataset.toolsWrap).toBe('false')
  })

  it('recovers keyboard focus as a focused navigation branch collapses or expands and resets its old open state', async () => {
    const resize = geometry(1100)
    const user = userEvent.setup()
    render(<Example />)
    act(() => screen.getByRole('link', { name: 'Activity' }).focus())
    resize(390)
    const toggle = screen.getByRole('button', { name: 'Open navigation' })
    expect(document.activeElement).toBe(toggle)
    await user.keyboard('{Enter}')
    act(() => screen.getByRole('link', { name: 'Activity' }).focus())
    resize(1100)
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Activity' }))
    expect(screen.queryByRole('button', { name: 'Close navigation' })).toBeNull()
    resize(390)
    expect(screen.getByRole('button', { name: 'Open navigation' }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).toBeNull()
  })

  it('preserves the controlled Search, focus, and caller-owned action behavior through a layout change', async () => {
    const resize = geometry(1100)
    const submit = vi.fn(), utility = vi.fn()
    const user = userEvent.setup()
    render(<Example submit={submit} utility={utility} />)
    const search = screen.getByRole('searchbox', { name: 'Search projects' }) as HTMLInputElement
    await user.type(search, 'veylo')
    resize(390)
    expect(screen.getByRole('searchbox', { name: 'Search projects' })).toBe(search)
    expect(document.activeElement).toBe(search)
    expect(search.value).toBe('veylo')
    await user.keyboard('{Enter}')
    expect(submit).toHaveBeenCalledExactlyOnceWith('veylo')
    await user.click(screen.getByRole('button', { name: 'Clear search projects' }))
    expect(search.value).toBe('')
    expect(document.activeElement).toBe(search)
    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    await user.click(screen.getByRole('button', { name: 'Account' }))
    expect(utility).toHaveBeenCalledTimes(2)
  })

  it('removes a deleted navigation set without leaving focus on detached controls or reopening later', async () => {
    geometry(390)
    const user = userEvent.setup()
    const view = render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    act(() => screen.getByRole('link', { name: 'Activity' }).focus())
    view.rerender(<Example navigation={[]} />)
    expect(header().querySelector('nav')).toBeNull()
    expect(screen.queryByRole('button', { name: /navigation/ })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Veylo home' }))
    view.rerender(<Example />)
    expect(screen.getByRole('button', { name: 'Open navigation' }).getAttribute('aria-expanded')).toBe('false')
  })

  it.each([true, false])('recovers a removed navigation set with a static brand and remaining Search=%s', async search => {
    geometry(390)
    const user = userEvent.setup()
    const props = { brand: 'Veylo', search: search ? { label: 'Search projects', value: '', onValueChange: () => {} } : undefined }
    const view = render(<DiyaProvider><SiteHeader {...props} items={items} /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    act(() => screen.getByRole('link', { name: 'Activity' }).focus())
    view.rerender(<DiyaProvider><SiteHeader {...props} items={[]} /></DiyaProvider>)
    expect(document.activeElement).toBe(search
      ? screen.getByRole('searchbox', { name: 'Search projects' })
      : header().querySelector('header'))
    expect(document.activeElement).not.toBe(header().querySelector('.diya-site-brand'))
  })
})

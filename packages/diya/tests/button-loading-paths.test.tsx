// Round M of Button loading: L1 on every path (M4), the beat and its end (M6, M8), an href Button
// with a provider's linkComponent (M7) and the prop doc (M9). React 18 and 19.
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, forwardRef, useState, version, type ReactNode } from 'react'
import { Button, DiyaProvider, Spinner } from '../dist/index.js'

let mounts = 0
function Counter() {
  const [count, setCount] = useState(() => { mounts++; return 0 })
  return <span data-k="count" onClick={() => setCount((value) => value + 1)}>{count}</span>
}
const RouterLink = forwardRef<HTMLAnchorElement, Record<string, unknown>>(function RouterLink(props, ref) { return <a ref={ref} data-router="" {...props} /> })
const LibraryIcon = forwardRef<SVGSVGElement, Record<string, unknown>>(function Plus(props, ref) { return <svg ref={ref} data-k="icon" width="18" height="18" {...props}><path d="M5 12h14" /></svg> })

type Path = 'button' | 'href' | 'href-router' | 'aschild' | 'lead-svg' | 'lead-component' | 'lead-fragment'
function Probe({ path, loading, strict }: { path: Path; loading?: boolean; strict?: boolean }) {
  const body: ReactNode = <>Saved <Counter /><input data-k="input" aria-label="x" defaultValue="" /></>
  const pass = loading === undefined ? {} : { loading }
  let node: ReactNode
  if (path === 'button') node = <Button {...pass}>{body}</Button>
  else if (path === 'href' || path === 'href-router') node = <Button href="/x" {...pass}>{body}</Button>
  else if (path === 'aschild') node = <Button asChild {...pass}><a href="/x">{body}</a></Button>
  else if (path === 'lead-svg') node = <Button {...pass}><svg data-k="svg" /> Saved <Counter /></Button>
  else if (path === 'lead-component') node = <Button {...pass}><LibraryIcon /> Saved <Counter /></Button>
  else node = <Button {...pass}><><LibraryIcon /> Saved <Counter /></></Button>
  const tree = <DiyaProvider linkComponent={path === 'href-router' ? RouterLink as never : undefined}>{node}</DiyaProvider>
  return strict ? <StrictMode>{tree}</StrictMode> : tree
}
const paths: Path[] = ['button', 'href', 'href-router', 'aschild', 'lead-svg', 'lead-component', 'lead-fragment']

describe(`L1 on every path (React ${version})`, () => {
  for (const strict of [false, true]) for (const path of paths) {
    it(`${path}${strict ? ' (StrictMode)' : ''}: loading given from the start, nothing remounts over false, true, false, true`, () => {
      const view = render(<Probe path={path} loading={false} strict={strict} />)
      const count = view.container.querySelector('[data-k="count"]') as HTMLElement
      act(() => { count.click(); count.click() })
      const input = view.container.querySelector('[data-k="input"]') as HTMLInputElement | null
      if (input) input.value = 'typed'
      for (const loading of [true, false, true, false]) {
        view.rerender(<Probe path={path} loading={loading} strict={strict} />)
        const now = view.container.querySelector('[data-k="count"]') as HTMLElement
        expect(now === count && now.textContent === '2', `${path} loading=${loading}: counter`).toBe(true)
        if (input) expect(view.container.querySelector('[data-k="input"]') === input && input.value === 'typed', `${path} loading=${loading}: input`).toBe(true)
      }
    })
  }
})

describe('the beat and the fade back (M6, M8)', () => {
  const end = (node: Element, animationName: string) => fireEvent(node, Object.assign(new Event('animationend', { bubbles: true }), { animationName }))

  it('a Spinner inside the label doesn\'t mark the beat; only the Button\'s own spinner does (M6)', () => {
    const view = render(<DiyaProvider><Button loading>Sync <Spinner size="small" /></Button></DiyaProvider>)
    const button = screen.getByRole('button')
    const nested = button.querySelector('.diya-button-label .diya-spinner')!
    act(() => { end(nested, 'diya-spinner-arrive') })
    view.rerender(<DiyaProvider><Button loading={false}>Sync <Spinner size="small" /></Button></DiyaProvider>)
    expect(button.hasAttribute('data-returning')).toBe(false)
    view.rerender(<DiyaProvider><Button loading>Sync <Spinner size="small" /></Button></DiyaProvider>)
    act(() => { end(button.querySelector(':scope > .diya-spinner')!, 'diya-spinner-arrive') })
    view.rerender(<DiyaProvider><Button loading={false}>Sync <Spinner size="small" /></Button></DiyaProvider>)
    expect(button.getAttribute('data-returning')).toBe('true')
  })

  it('data-returning clears when the fade back ends, and a plain-text label is unwrapped then (M8, M3)', () => {
    const view = render(<DiyaProvider><Button loading>Save</Button></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Save' })
    act(() => { end(button.querySelector(':scope > .diya-spinner')!, 'diya-spinner-arrive') })
    view.rerender(<DiyaProvider><Button loading={false}>Save</Button></DiyaProvider>)
    expect(button.getAttribute('data-returning')).toBe('true')
    expect(button.querySelector('.diya-button-label')).not.toBeNull()
    act(() => { end(button.querySelector('.diya-button-label')!, 'diya-button-return-text') })
    expect(button.hasAttribute('data-returning')).toBe(false)
    expect(button.innerHTML).toBe('Save')
  })
})

describe('an href Button with a provider linkComponent while loading (M7)', () => {
  it('keeps the same Link, focused and aria-disabled, and blocks every click and Enter', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn((event: Event) => event.defaultPrevented ? undefined : 'went')
    const view = render(<DiyaProvider linkComponent={RouterLink as never}><Button href="/report" loading={false} onClick={() => navigate}>Open report</Button></DiyaProvider>)
    const link = screen.getByRole('link', { name: 'Open report' })
    link.focus()
    view.rerender(<DiyaProvider linkComponent={RouterLink as never}><Button href="/report" loading onClick={() => navigate}>Open report</Button></DiyaProvider>)
    expect(screen.getByRole('link', { name: 'Open report' })).toBe(link)
    expect(link.hasAttribute('data-router')).toBe(true)
    expect(link.getAttribute('href')).toBe('/report')
    expect(link.getAttribute('aria-disabled')).toBe('true')
    expect(document.activeElement).toBe(link)
    const events = [new MouseEvent('click', { bubbles: true, cancelable: true }), new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }), new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }), new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 })]
    for (const event of events) { link.dispatchEvent(event); expect(event.defaultPrevented, `${event.type} ${event.metaKey ? 'meta' : event.ctrlKey ? 'ctrl' : ''}`).toBe(true) }
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    act(() => { link.dispatchEvent(enter) })
    expect(enter.defaultPrevented).toBe(true)
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(link)
  })
})

it('loading\'s doc says to pass it from the start, and that undefined counts as not passed (M9)', async () => {
  const { readFileSync } = await import('node:fs')
  const { resolve } = await import('node:path')
  const api = JSON.parse(readFileSync(resolve(process.cwd(), 'dist/api.json'), 'utf8'))
  expect(api.components.Button.props.loading.description).toContain('If the label holds something with its own state, pass `loading` from the start (`loading={false}`); `undefined` counts as not passed.')
})

// Real lucide-react (the site's copy, React 19 only: see vitest.config.mjs), alone and in a fragment.
it.runIf(version.startsWith('19'))('real lucide icons, alone and in a fragment, are held apart as the leading part (M1)', async () => {
  const { Plus, Send } = await import('lucide-react')
  render(<DiyaProvider><Button loading={false}><Plus size={18} /> Add member</Button><Button loading><><Send size={18} /> Send</></Button></DiyaProvider>)
  for (const name of ['Add member', 'Send']) {
    const button = screen.getByRole('button', { name })
    expect(button.querySelector(':scope > .diya-button-lead > .diya-button-lead-item > svg.lucide'), name).not.toBeNull()
    expect(button.querySelector(':scope > .diya-button-label')!.textContent!.trim()).toBe(name)
  }
})

describe('round N', () => {
  it('a plain label of several parts given loading is one text node, at rest and while loading (N2)', () => {
    const count = 3
    const view = render(<DiyaProvider><Button loading={false}>Delete {count} files</Button><Button>Keep {count} files</Button></DiyaProvider>)
    const given = screen.getByRole('button', { name: 'Delete 3 files' })
    expect(given.childNodes).toHaveLength(1)
    expect(screen.getByText('Delete 3 files')).toBe(given)
    // No loading prop: 1.1.1's three text nodes.
    expect(screen.getByRole('button', { name: 'Keep 3 files' }).childNodes).toHaveLength(3)
    view.rerender(<DiyaProvider><Button loading>Delete {count} files</Button><Button>Keep {count} files</Button></DiyaProvider>)
    expect(given.querySelector('.diya-button-label')!.childNodes).toHaveLength(1)
  })

  it('the Button\'s own spinner has its own class; a Spinner you put in a Button doesn\'t (N6)', () => {
    render(<DiyaProvider><Button loading>Sync <Spinner size="small" /></Button></DiyaProvider>)
    const button = screen.getByRole('button')
    const spinners = [...button.querySelectorAll('.diya-spinner')]
    expect(spinners.map((node) => node.classList.contains('diya-button-spinner'))).toEqual([true, false])
  })

  it('a loading href Button still calls your onKeyDown, with Enter stopped (N7)', () => {
    const keys: string[] = []
    render(<DiyaProvider><Button href="/report" loading onKeyDown={(event) => keys.push(`${event.key}${event.defaultPrevented ? ' stopped' : ''}`)}>Open report</Button></DiyaProvider>)
    const link = screen.getByRole('link', { name: 'Open report' })
    fireEvent.keyDown(link, { key: 'ArrowRight' })
    fireEvent.keyDown(link, { key: 'Enter' })
    expect(keys).toEqual(['ArrowRight', 'Enter stopped'])
  })
})

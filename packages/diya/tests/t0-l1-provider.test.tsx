import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { DiyaProvider, Inline, Stack, useDiyaAppearance } from '../dist/index.js'
import { DIYA_DEFAULT_BRAND, resolveBrand } from '../dist/internal/brand.js'

function Report() {
  const { theme, brand } = useDiyaAppearance()
  return <output>{theme} {brand.accent} {brand.accentText}</output>
}

/** A matchMedia stand-in whose dark-scheme answer the test can flip. */
function mockScheme(dark: boolean) {
  const listeners = new Set<() => void>()
  const query = { matches: dark, media: '(prefers-color-scheme: dark)', addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) }
  vi.stubGlobal('matchMedia', vi.fn(() => query))
  return (next: boolean) => { query.matches = next; listeners.forEach(fn => fn()) }
}
afterEach(() => vi.unstubAllGlobals())

describe('DiyaProvider theme', () => {
  it('defaults to system and paints its surface', () => {
    const { container } = render(<DiyaProvider>Text</DiyaProvider>)
    const root = container.querySelector('.diya-root')!
    expect(root.getAttribute('data-theme')).toBe('system')
    expect(root.getAttribute('data-surface')).toBe('true')
  })

  it('opts out of the surface with surface={false}', () => {
    const { container } = render(<DiyaProvider surface={false}>Text</DiyaProvider>)
    expect(container.querySelector('.diya-root')!.getAttribute('data-surface')).toBe('false')
  })

  it('reports the OS scheme for theme="system" and follows changes', () => {
    const flip = mockScheme(true)
    render(<DiyaProvider><Report /></DiyaProvider>)
    expect(screen.getByRole('status').textContent).toBe('dark #e8e8e8 #1c1c1c')
    act(() => flip(false))
    expect(screen.getByRole('status').textContent).toBe('light #262626 #fafafa')
  })

  it('reports a fixed theme without asking the OS', () => {
    mockScheme(true)
    render(<DiyaProvider theme="light"><Report /></DiyaProvider>)
    expect(screen.getByRole('status').textContent).toBe('light #262626 #fafafa')
  })

  it('passes attributes and the ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<DiyaProvider ref={ref} id="app" data-testid="root" className="mine">Text</DiyaProvider>)
    expect(ref.current).toBe(screen.getByTestId('root'))
    expect(ref.current!.id).toBe('app')
    expect(ref.current!.className).toBe('diya-root mine')
  })
})

describe('DiyaProvider motion', () => {
  function Motion() {
    return <output>{useDiyaAppearance().motion}</output>
  }
  /** A matchMedia stand-in that answers only the Reduce Motion query, which the test can flip. */
  function mockReduceMotion(reduce: boolean) {
    const listeners = new Set<() => void>()
    const state = { reduce }
    vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
      get matches() { return media === '(prefers-reduced-motion: reduce)' && state.reduce },
      media,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    })))
    return (next: boolean) => { state.reduce = next; listeners.forEach(fn => fn()) }
  }
  const roots = (container: HTMLElement) => [...container.querySelectorAll('.diya-root')].map(root => root.getAttribute('data-motion'))

  it('defaults to system, and reports full motion', () => {
    mockReduceMotion(false)
    const { container } = render(<DiyaProvider><Motion /></DiyaProvider>)
    expect(roots(container)).toEqual(['system'])
    expect(screen.getByRole('status').textContent).toBe('full')
  })

  it('follows the reader’s Reduce Motion setting under system', () => {
    const flip = mockReduceMotion(true)
    render(<DiyaProvider><Motion /></DiyaProvider>)
    expect(screen.getByRole('status').textContent).toBe('reduced')
    act(() => flip(false))
    expect(screen.getByRole('status').textContent).toBe('full')
    act(() => flip(true))
    expect(screen.getByRole('status').textContent).toBe('reduced')
  })

  it('reports reduced and off as set, whatever the OS says', () => {
    mockReduceMotion(false)
    const { container } = render(<><DiyaProvider motion="reduced"><Motion /></DiyaProvider><DiyaProvider motion="off"><Motion /></DiyaProvider></>)
    expect(roots(container)).toEqual(['reduced', 'off'])
    expect(screen.getAllByRole('status').map(node => node.textContent)).toEqual(['reduced', 'off'])
  })

  it('inherits the parent’s setting, and a nested motion wins inside it', () => {
    mockReduceMotion(true)
    const { container } = render(
      <DiyaProvider motion="off">
        <DiyaProvider theme="dark"><Motion /></DiyaProvider>
        <DiyaProvider motion="system"><Motion /></DiyaProvider>
      </DiyaProvider>,
    )
    expect(roots(container)).toEqual(['off', 'off', 'system'])
    expect(screen.getAllByRole('status').map(node => node.textContent)).toEqual(['off', 'reduced'])
  })

  it('renders data-motion over a passed-through attribute', () => {
    const { container } = render(<DiyaProvider {...{ 'data-motion': 'off' }}>Text</DiyaProvider>)
    expect(roots(container)).toEqual(['system'])
  })

  it('hydrates without a mismatch when the reader asks for less motion', async () => {
    const { renderToString } = await import('react-dom/server')
    const { hydrateRoot } = await import('react-dom/client')
    const app = <DiyaProvider><DiyaProvider motion="reduced"><Motion /></DiyaProvider><Motion /></DiyaProvider>
    const host = document.createElement('div')
    host.innerHTML = renderToString(app)
    expect(roots(host)).toEqual(['system', 'reduced'])
    expect([...host.querySelectorAll('output')].map(node => node.textContent)).toEqual(['reduced', 'full'])
    document.body.append(host)
    mockReduceMotion(true)
    const errors = vi.spyOn(console, 'error')
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => { root = hydrateRoot(host, app) })
    expect(errors).not.toHaveBeenCalled()
    expect([...host.querySelectorAll('output')].map(node => node.textContent)).toEqual(['reduced', 'reduced'])
    act(() => root!.unmount())
    host.remove()
  })
})

describe('DiyaProvider brandColor', () => {
  const vars = (root: Element) => Object.fromEntries(['accent', 'accent-text', 'accent-soft', 'accent-ink'].flatMap(name =>
    (['light', 'dark'] as const).map(theme => [`${name}-${theme}`, (root as HTMLElement).style.getPropertyValue(`--diya-internal-${name}-${theme}`)])))

  it('sets both themes from DIYA’s default when unset', () => {
    const { container } = render(<DiyaProvider>Text</DiyaProvider>)
    const set = vars(container.querySelector('.diya-root')!)
    expect(set['accent-light']).toBe(DIYA_DEFAULT_BRAND.light)
    expect(set['accent-dark']).toBe(DIYA_DEFAULT_BRAND.dark)
    expect(set['accent-text-light']).toBe('#fafafa')
    expect(set['accent-text-dark']).toBe('#1c1c1c')
  })

  it('applies one string to both themes, and an object per theme', () => {
    const one = render(<DiyaProvider brandColor="#2F6FEB">Text</DiyaProvider>)
    const a = vars(one.container.querySelector('.diya-root')!)
    expect([a['accent-light'], a['accent-dark']]).toEqual(['#2f6feb', '#2f6feb'])
    expect(a['accent-text-light']).toBe('#ffffff')
    one.unmount()
    const two = render(<DiyaProvider brandColor={{ light: '#7a5c1e', dark: '#d8b46a' }}>Text</DiyaProvider>)
    const b = vars(two.container.querySelector('.diya-root')!)
    expect([b['accent-light'], b['accent-dark']]).toEqual(['#7a5c1e', '#d8b46a'])
    expect(b).toEqual(Object.fromEntries(Object.entries(resolveBrand({ light: '#7a5c1e', dark: '#d8b46a' })).flatMap(([theme, t]) => [
      [`accent-${theme}`, t.accent], [`accent-text-${theme}`, t.accentText], [`accent-soft-${theme}`, t.accentSoft], [`accent-ink-${theme}`, t.accentInk]])))
  })

  it('lets style override a token', () => {
    const { container } = render(<DiyaProvider style={{ '--diya-color-accent': 'red' } as React.CSSProperties}>Text</DiyaProvider>)
    expect((container.querySelector('.diya-root') as HTMLElement).style.getPropertyValue('--diya-color-accent')).toBe('red')
  })
})

describe('Stack and Inline', () => {
  it('render a column and a wrapping row with scale gaps', () => {
    render(<Stack data-testid="stack" gap={5}><span>A</span></Stack>)
    render(<Inline data-testid="inline"><span>B</span></Inline>)
    const stack = screen.getByTestId('stack')
    expect(stack.className).toBe('diya-stack')
    expect(stack.dataset).toMatchObject({ gap: '5' })
    expect(stack.dataset.wrap).toBeUndefined()
    expect(screen.getByTestId('inline').dataset).toMatchObject({ gap: '2', align: 'center', wrap: 'true' })
  })

  it('take a CSS length, an element, a class and a ref', () => {
    const ref = createRef<HTMLElement>()
    render(<Stack ref={ref} as="section" gap="10px" justify="between" className="mine" style={{ color: 'red' }} aria-label="Settings">x</Stack>)
    const section = screen.getByRole('region', { name: 'Settings' })
    expect(ref.current).toBe(section)
    expect(section.className).toBe('diya-stack mine')
    expect(section.dataset).toMatchObject({ gap: 'custom', justify: 'between' })
    expect(section.style.getPropertyValue('--diya-internal-gap')).toBe('10px')
    expect(section.style.color).toBe('red')
  })
})

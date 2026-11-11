// The preview's slow-motion switch: a session setting, scoped to the preview stage, with a loop
// that runs only while it's on.
import { type ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Appearance, AppearanceProvider } from '../app/Appearance'
import { ButtonLibrary } from '../components/ButtonLibrary'
import { CatalogProvider } from '../components/CatalogProvider'
import { resetSlowMotionForTests } from '../components/customize/SlowMotion'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

/** Each element reports one animation of its own, so the test can see which ones were slowed. */
const made = new Map<Element, { playbackRate: number }>()
beforeEach(() => {
  window.sessionStorage.clear()
  resetSlowMotionForTests()
  made.clear()
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList)
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    writable: true,
    value(this: Element) {
      if (!made.has(this)) made.set(this, { playbackRate: 1 })
      return [made.get(this)]
    },
  })
})
afterEach(() => { delete (Element.prototype as { getAnimations?: unknown }).getAnimations })

function Catalog() {
  return (
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <header className="site-header"><Appearance /></header>
      <CatalogProvider><ButtonLibrary /></CatalogProvider>
    </AppearanceProvider>
  )
}
const frame = () => act(() => new Promise<void>((done) => requestAnimationFrame(() => done())))

describe('Slow motion', () => {
  it('plays the preview at a quarter speed while on, and says so', async () => {
    const user = userEvent.setup()
    render(<Catalog />)
    const toggle = screen.getByRole('switch', { name: 'Slow motion (¼ speed)' })
    expect(toggle.getAttribute('aria-checked') ?? String((toggle as HTMLInputElement).checked)).toMatch(/false/)
    await user.click(toggle)
    await frame()
    const stage = document.querySelector('.component-preview-stage')!
    expect(made.get(stage)?.playbackRate).toBe(0.25)
    expect(screen.getByText('Slow motion is on: the preview plays at a quarter of its speed.')).toBeTruthy()
    // Site chrome and the page around the stage keep their speed.
    for (const outside of [document.querySelector('header.site-header')!, document.querySelector('.component-document-heading')!])
      expect(made.get(outside)?.playbackRate ?? 1).toBe(1)
    expect(window.sessionStorage.getItem('diya:slow-motion')).toBe('on')
  })

  it('stops its loop and restores full speed when turned off', async () => {
    const user = userEvent.setup()
    const loops = vi.spyOn(window, 'requestAnimationFrame')
    render(<Catalog />)
    const before = loops.mock.calls.length
    await frame()
    await frame()
    // Off: nothing scans the stage each frame.
    expect(loops.mock.calls.length - before).toBeLessThanOrEqual(3)
    const toggle = screen.getByRole('switch', { name: 'Slow motion (¼ speed)' })
    await user.click(toggle)
    await frame()
    const stage = document.querySelector('.component-preview-stage')!
    expect(made.get(stage)?.playbackRate).toBe(0.25)
    await user.click(toggle)
    expect(made.get(stage)?.playbackRate).toBe(1)
    expect(window.sessionStorage.getItem('diya:slow-motion')).toBeNull()
    expect(screen.queryByText(/Slow motion is on/)).toBeNull()
  })

  it('lasts for the session only, not across visits', () => {
    window.sessionStorage.setItem('diya:slow-motion', 'on')
    render(<Catalog />)
    expect((screen.getByRole('switch', { name: 'Slow motion (¼ speed)' }) as HTMLInputElement).checked).toBe(true)
    expect(window.localStorage.getItem('diya:slow-motion')).toBeNull()
  })
})

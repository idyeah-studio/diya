// usePresence keeps a closing surface mounted while its own exit runs, and only then. The suite
// runs on React 18 and React 19 (see vitest.config.mjs).
import { StrictMode, useRef, version } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { usePresence } from '../dist/internal/presence.js'

function Panel({ open, immediate }: { open: boolean; immediate?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const { present, closing } = usePresence(open, ref, immediate)
  return present ? <div ref={ref} role="dialog" aria-label="Panel" data-closing={closing ? 'true' : undefined}>Panel</div> : null
}
const panel = () => screen.queryByRole('dialog', { name: 'Panel' })

/** A Web Animations stand-in: an animation on `target` whose `finished` the test settles. */
function exit(target: Element, pseudoElement: string | null = null) {
  let settle!: { resolve: () => void; reject: () => void }
  const finished = new Promise<void>((resolve, reject) => { settle = { resolve, reject: () => reject(new DOMException('cancelled', 'AbortError')) } })
  return { animation: { effect: { target, pseudoElement }, finished }, ...settle }
}
/** Makes every element report the animations `make` returns, as a browser does mid-transition. */
function stubAnimations(make: (node: Element) => { animation: object }[]) {
  const made: ReturnType<typeof exit>[] = []
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    writable: true,
    value(this: Element) {
      const list = make(this) as ReturnType<typeof exit>[]
      made.push(...list)
      return list.map(item => item.animation)
    },
  })
  return made
}
/** Lets promise callbacks run inside act, so their state updates are flushed. */
const settled = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

beforeEach(() => {
  // happy-dom, like jsdom, has no Element.getAnimations: the synchronous path is the default.
  expect(Object.hasOwn(Element.prototype, 'getAnimations')).toBe(false)
})
afterEach(() => {
  delete (Element.prototype as { getAnimations?: unknown }).getAnimations
})

describe(`usePresence on React ${version.split('.')[0]}`, () => {
  it('unmounts synchronously where getAnimations is missing', () => {
    expect(typeof document.body.getAnimations).toBe('undefined')
    const { rerender } = render(<Panel open />)
    expect(panel()).not.toBeNull()
    rerender(<Panel open={false} />)
    expect(panel()).toBeNull()
  })

  it('unmounts synchronously when nothing is running, as with motion off', () => {
    stubAnimations(() => [])
    const { rerender } = render(<Panel open />)
    rerender(<Panel open={false} />)
    expect(panel()).toBeNull()
  })

  it('waits for a running exit, then unmounts', async () => {
    const made = stubAnimations(node => [exit(node)])
    const { rerender } = render(<Panel open />)
    rerender(<Panel open={false} />)
    const node = panel()!
    expect(node).not.toBeNull()
    expect(node.getAttribute('data-closing')).toBe('true')
    expect(node.inert).toBe(true)
    await act(async () => { made[0].resolve() })
    await settled()
    expect(panel()).toBeNull()
  })

  it('waits only for the node’s own animations, not a pseudo-element’s or a child’s', async () => {
    const made = stubAnimations(node => [exit(node), exit(node, '::before'), exit(document.body)])
    const { rerender } = render(<Panel open />)
    rerender(<Panel open={false} />)
    expect(panel()).not.toBeNull()
    await act(async () => { made[0].resolve() })
    await settled()
    // The other two never finish.
    expect(panel()).toBeNull()
  })

  it('reopening mid-exit keeps the same node', async () => {
    const made = stubAnimations(node => [exit(node)])
    const { rerender } = render(<Panel open />)
    const before = panel()
    rerender(<Panel open={false} />)
    expect(panel()).toBe(before)
    rerender(<Panel open />)
    expect(panel()).toBe(before)
    expect(before!.inert).toBe(false)
    expect(before!.hasAttribute('data-closing')).toBe(false)
    // Close again. The browser cancels the exit the reopen replaced, and that late rejection
    // must not cut the second exit short.
    rerender(<Panel open={false} />)
    expect(panel()).toBe(before)
    await act(async () => { made[0].reject() })
    await settled()
    expect(panel()).toBe(before)
    expect(before!.inert).toBe(true)
    await act(async () => { made[1].resolve() })
    await settled()
    expect(panel()).toBeNull()
  })

  it('immediate skips the exit', () => {
    stubAnimations(node => [exit(node)])
    const { rerender } = render(<Panel open />)
    rerender(<Panel open={false} immediate />)
    expect(panel()).toBeNull()
  })

  it('stops waiting after a second, even if the exit never settles', () => {
    vi.useFakeTimers()
    stubAnimations(node => [exit(node)])
    const { rerender } = render(<Panel open />)
    rerender(<Panel open={false} />)
    act(() => { vi.advanceTimersByTime(999) })
    expect(panel()).not.toBeNull()
    act(() => { vi.advanceTimersByTime(1) })
    expect(panel()).toBeNull()
  })

  it('unmounts at once when the page is hidden mid-exit', () => {
    stubAnimations(node => [exit(node)])
    const { rerender } = render(<Panel open />)
    rerender(<Panel open={false} />)
    expect(panel()).not.toBeNull()
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(panel()).toBeNull()
    hidden.mockRestore()
  })

  it('no warnings in StrictMode', async () => {
    const errors = vi.spyOn(console, 'error')
    const warnings = vi.spyOn(console, 'warn')
    const strict = (open: boolean, immediate = false) => <StrictMode><Panel open={open} immediate={immediate} /></StrictMode>
    // Synchronous path.
    const { rerender, unmount } = render(strict(false))
    expect(panel()).toBeNull()
    rerender(strict(true))
    rerender(strict(false))
    expect(panel()).toBeNull()
    // Waiting path, with a reopen and an unmount mid-exit.
    const made = stubAnimations(node => [exit(node)])
    rerender(strict(true))
    rerender(strict(false))
    expect(panel()).not.toBeNull()
    rerender(strict(true))
    rerender(strict(false))
    for (const item of made) item.resolve()
    await settled()
    expect(panel()).toBeNull()
    rerender(strict(true))
    rerender(strict(false))
    unmount()
    await settled()
    expect(errors).not.toHaveBeenCalled()
    expect(warnings).not.toHaveBeenCalled()
  })
})

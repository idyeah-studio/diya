// Motion in components that sit in the page: Button press and hover, the theme switch, and (in
// later sections) Tabs, Accordion, toggles, Progress and Chatbot. HappyDOM has no layout or Web
// Animations; tests supply what they need.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Button, DiyaProvider } from '../dist/index.js'

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const nextFrame = () => act(() => new Promise<void>((done) => requestAnimationFrame(() => done())))
afterEach(() => vi.restoreAllMocks())

describe('Button press and hover', () => {
  it('writes a press floor so a wide button shrinks at most about 2px a side', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(368)
    const pointerDown = vi.fn()
    render(<DiyaProvider><Button onPointerDownCapture={pointerDown}>Sign in</Button></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Sign in' })
    fireEvent.pointerDown(button)
    const floor = Number(button.style.getPropertyValue('--diya-internal-button-press-floor'))
    expect(floor).toBeCloseTo(1 - 4 / 368, 6)
    // 368px at max(0.98, floor) loses 4px in all: 2px a side.
    expect(368 * (1 - Math.max(0.98, floor)) / 2).toBeCloseTo(2, 6)
    expect(pointerDown).toHaveBeenCalledOnce()
  })

  it('writes the floor on a keyboard press too, and for a link Button', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(120)
    render(<DiyaProvider><Button href="/plans">Plans</Button></DiyaProvider>)
    const link = screen.getByRole('link', { name: 'Plans' })
    fireEvent.keyDown(link, { key: 'Enter' })
    expect(Number(link.style.getPropertyValue('--diya-internal-button-press-floor'))).toBeCloseTo(1 - 4 / 120, 6)
  })

  it('presses with scale, landing at once, and hovers with a darker fill, not a filter', () => {
    expect(css).toMatch(/\.diya-button:not\(:disabled, \[aria-disabled='true'\], \[aria-busy='true'\]\):active \{\s*scale: max\(var\(--diya-internal-motion-scale-press\), var\(--diya-internal-button-press-floor, 0\)\);\s*transition-duration: 0s;/)
    expect(css).toMatch(/\.diya-button:not\(:disabled, \[aria-disabled='true'\]\):hover \{\s*background-color: color-mix\(in srgb, var\(--diya-internal-button-fill, var\(--diya-color-accent\)\) 88%, #000\);\s*\}/)
    expect(css).not.toMatch(/filter:\s*brightness/)
  })

  it('under reduced motion, darkens a pressed Solid or Destructive button instead', () => {
    const reduced = /\.diya-root\[data-motion='(reduced|system)'\] \.diya-button:is\(\[data-variant='solid'\], \[data-variant='destructive'\]\):not\(:disabled, \[aria-disabled='true'\]\):active \{\s*background-color: color-mix\(in srgb, var\(--diya-internal-button-fill, var\(--diya-color-accent\)\) 76%, #000\);/g
    expect([...css.matchAll(reduced)].map((match) => match[1])).toEqual(['reduced', 'system'])
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.diya-root\[data-motion='system'\] \.diya-button/)
  })
})

describe('theme changes', () => {
  it('pause transitions for the frame that paints a new theme', async () => {
    const { container, rerender } = render(<DiyaProvider theme="light">Text</DiyaProvider>)
    const root = container.querySelector('.diya-root')!
    expect(root.hasAttribute('data-theme-change')).toBe(false)
    rerender(<DiyaProvider theme="dark">Text</DiyaProvider>)
    expect(root.hasAttribute('data-theme-change')).toBe(true)
    await nextFrame()
    await nextFrame()
    await nextFrame()
    expect(root.hasAttribute('data-theme-change')).toBe(false)
    // The pause closes the same gate motion="off" does.
    expect(css).toMatch(/\.diya-root\[data-theme-change\] \{\s*--diya-internal-motion: 0;\s*\}/)
  })
})

describe('Switch and Choice', () => {
  it('slides the Switch thumb with translate, mirrored right to left without relying on :dir()', () => {
    expect(css).toMatch(/\.diya-switch:checked \{\s*justify-content: start;\s*\}/)
    expect(css).toMatch(/\.diya-switch:checked::before \{\s*translate: var\(--diya-internal-switch-travel\) 0;/)
    // The attribute rule stands alone, so an engine that drops :dir() keeps it.
    expect(css).toMatch(/\.diya-root\[dir='rtl'\] \.diya-switch:checked::before,\s*\.diya-root \[dir='rtl'\] \.diya-switch:checked::before \{\s*translate: calc\(-1 \* var\(--diya-internal-switch-travel\)\) 0;/)
    expect(css).toMatch(/\n\.diya-root \.diya-switch:checked:dir\(rtl\)::before \{/)
  })

  it('keeps the Choice mark always present, grown in by a transition, never a keyframe', () => {
    expect(css).toMatch(/\.diya-choice-option input::before \{\s*content: '';\s*opacity: 0;/)
    expect(css).toMatch(/\.diya-choice-option input:is\(:checked, :indeterminate\)::before \{\s*opacity: 1;\s*scale: 1;\s*transition-duration: var\(--diya-internal-duration-fast\);/)
    // No animation hangs off a checked, indeterminate or selected state anywhere.
    const stateful = [...css.matchAll(/([^{}]*:(?:checked|indeterminate)[^{}]*)\{([^}]*)\}/g)]
    expect(stateful.length).toBeGreaterThan(5)
    for (const [, selector, body] of stateful) expect(body, selector.trim()).not.toMatch(/(^|[;\s])animation/)
  })
})

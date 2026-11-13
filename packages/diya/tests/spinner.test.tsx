// Spinner (1.2, api.md §4): decorative without a label; with one, a status region that starts
// empty and takes its words on the 400ms beat, so a quick load is neither seen nor heard.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { DiyaProvider, Spinner } from '../dist/index.js'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

const root = (container: HTMLElement) => container.querySelector('.diya-spinner') as HTMLElement

describe('Spinner', () => {
  it('no label: aria-hidden, a ring at its exact size, and no status', () => {
    const { container } = render(<DiyaProvider><Spinner size="small" /></DiyaProvider>)
    const node = root(container)
    expect(node.getAttribute('aria-hidden')).toBe('true')
    expect(node.hasAttribute('role')).toBe(false)
    expect(node.getAttribute('data-size')).toBe('small')
    const svg = node.querySelector('svg')!
    expect([svg.getAttribute('width'), svg.getAttribute('height'), svg.getAttribute('stroke-width')]).toEqual(['16', '16', '1.75'])
    expect(node.querySelector('.diya-spinner-arc')!.getAttribute('stroke-dashoffset')).toBe('72')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('sizes: 16, 20 and 24px with strokes of 1.75, 2 and 2.25, inscribed in the box', () => {
    const { container } = render(<DiyaProvider><Spinner size="small" /><Spinner /><Spinner size="large" /></DiyaProvider>)
    const rings = [...container.querySelectorAll('.diya-spinner')].map((node) => {
      const svg = node.querySelector('svg')!
      const arc = node.querySelector('.diya-spinner-arc')!
      return [node.getAttribute('data-size'), svg.getAttribute('width'), svg.getAttribute('stroke-width'), arc.getAttribute('r')]
    })
    expect(rings).toEqual([['small', '16', '1.75', '7.125'], ['medium', '20', '2', '9'], ['large', '24', '2.25', '10.875']])
  })

  it('label: role=status from mount and empty, then the label at 400ms', () => {
    render(<DiyaProvider><Spinner label="Loading older invoices" /></DiyaProvider>)
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-hidden')).toBeNull()
    expect(status.textContent).toBe('')
    act(() => { vi.advanceTimersByTime(399) })
    expect(status.textContent).toBe('')
    act(() => { vi.advanceTimersByTime(1) })
    expect(status.textContent).toBe('Loading older invoices')
    // Hidden words, read and not seen.
    const words = status.querySelector('span[style]') as HTMLElement
    expect(words.style.position).toBe('absolute')
    expect(words.style.clipPath).toBe('inset(50%)')
  })

  it('unmount before 400ms: nothing heard, and the timer is gone', () => {
    const view = render(<DiyaProvider><Spinner label="Loading" /></DiyaProvider>)
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByRole('status').textContent).toBe('')
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('StrictMode: one timer, words once', () => {
    render(<StrictMode><DiyaProvider><Spinner label="Loading" /></DiyaProvider></StrictMode>)
    act(() => { vi.advanceTimersByTime(400) })
    expect(screen.getByRole('status').textContent).toBe('Loading')
  })

  // K1 (DS-S78-01): one copy of the words, so getByText finds one element. Before, the visible
  // words were in the page from mount (aria-hidden) and a hidden copy joined them at the beat.
  it('showLabel: one copy of the words, shown and heard, put in on the beat', () => {
    const { container } = render(<DiyaProvider><Spinner label="Loading older invoices" showLabel /></DiyaProvider>)
    const status = screen.getByRole('status')
    expect(root(container).getAttribute('data-show-label')).toBe('true')
    expect(screen.queryAllByText('Loading older invoices')).toHaveLength(0)
    expect(status.textContent).toBe('')
    act(() => { vi.advanceTimersByTime(400) })
    const words = screen.getByText('Loading older invoices')
    expect(words.classList.contains('diya-spinner-words')).toBe(true)
    expect(words.hasAttribute('aria-hidden')).toBe(false)
    expect(words.hasAttribute('style')).toBe(false)
    expect(status.textContent).toBe('Loading older invoices')
  })

  it('showLabel without a label warns, and shows no words', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<DiyaProvider><Spinner showLabel /></DiyaProvider>)
    expect(warn.mock.calls.flat().join(' ')).toContain('Spinner has showLabel but no label')
    expect(container.querySelector('.diya-spinner-words')).toBeNull()
    expect(root(container).getAttribute('aria-hidden')).toBe('true')
    warn.mockRestore()
  })

  it('motion off keeps the 400ms', () => {
    render(<DiyaProvider motion="off"><Spinner label="Loading" /></DiyaProvider>)
    act(() => { vi.advanceTimersByTime(399) })
    expect(screen.getByRole('status').textContent).toBe('')
    act(() => { vi.advanceTimersByTime(1) })
    expect(screen.getByRole('status').textContent).toBe('Loading')
  })

  it('a remount restarts the beat (keep one Spinner mounted across a retry)', () => {
    const view = render(<DiyaProvider><Spinner key="a" label="Loading" /></DiyaProvider>)
    act(() => { vi.advanceTimersByTime(400) })
    expect(screen.getByRole('status').textContent).toBe('Loading')
    view.rerender(<DiyaProvider><Spinner key="b" label="Loading" /></DiyaProvider>)
    expect(screen.getByRole('status').textContent).toBe('')
    act(() => { vi.advanceTimersByTime(400) })
    expect(screen.getByRole('status').textContent).toBe('Loading')
  })

  it('passes attributes and the ref through to the root', () => {
    let node: HTMLSpanElement | null = null
    render(<DiyaProvider><Spinner ref={(element) => { node = element }} id="busy" className="mine" data-test="x" /></DiyaProvider>)
    expect(node!.id).toBe('busy')
    expect(node!.className).toBe('diya-spinner mine')
    expect(node!.getAttribute('data-test')).toBe('x')
  })
})

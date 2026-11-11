// Popups are placed from their layout size. While one scales in from 0.97 its rectangle is 3%
// smaller, and nothing re-places it afterwards, so a rectangle read then would leave it off-center
// or past the screen's 12px margin. HappyDOM has no layout: the test supplies it.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DiyaProvider, Popover, Tooltip } from '../dist/index.js'

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} }) as DOMRect

/** A 200×100 popup caught mid-enter at 0.97, and a 40×32 trigger at (left, top), in a 1024×768 window. */
function layout(trigger: { left: number; top: number }) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('diya-floating')) return rect(0, 0, 194, 97)
    if (this.getAttribute('aria-haspopup') || this.classList.contains('diya-tooltip-trigger')) return rect(trigger.left, trigger.top, 40, 32)
    return rect(0, 0, 0, 0)
  })
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('diya-floating') ? 200 : 0
  })
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('diya-floating') ? 100 : 0
  })
}
afterEach(() => vi.restoreAllMocks())

describe('place() uses layout size, not a scaled rect', () => {
  it('keeps a panel at the right edge 12px in, centered on its trigger’s side', () => {
    layout({ left: 960, top: 100 })
    render(<DiyaProvider><Popover label="Preferences">Content</Popover></DiyaProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }))
    const panel = screen.getByRole('dialog', { name: 'Preferences' })
    // 1024 - 200 - 12, not 1024 - 194 - 12.
    expect(panel.style.left).toBe('812px')
    expect(panel.style.top).toBe('142px')
    expect(panel.getAttribute('data-side')).toBe('bottom')
    // It grows from the trigger's center (980 - 812), on its top edge.
    expect(panel.style.getPropertyValue('--diya-internal-overlay-origin')).toBe('168px 0')
  })

  it('flips above a trigger near the bottom by its full height', () => {
    layout({ left: 400, top: 700 })
    render(<DiyaProvider><Popover label="Preferences">Content</Popover></DiyaProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }))
    const panel = screen.getByRole('dialog', { name: 'Preferences' })
    expect(panel.style.top).toBe('590px')
    expect(panel.style.left).toBe('320px')
    expect(panel.getAttribute('data-side')).toBe('top')
    expect(panel.style.getPropertyValue('--diya-internal-overlay-origin')).toBe('100px 100%')
  })

})

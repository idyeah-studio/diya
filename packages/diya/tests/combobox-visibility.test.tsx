import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Combobox, DiyaProvider } from '../dist/index.js'

const options = Array.from({ length: 20 }, (_, index) => ({
  value: String(index),
  label: `Team ${index + 1}`,
  disabled: index === 7 || index === 19,
}))

// HappyDOM has no layout. Model a bordered, scrollable list whose option rectangles
// move with scrollTop, rather than merely asserting that a scrolling API was called.
function listGeometry() {
  const originalRect = HTMLElement.prototype.getBoundingClientRect
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    if (this.getAttribute('role') === 'listbox') {
      return { x: 20, y: 100, top: 100, bottom: 204, left: 20, right: 220, width: 200, height: 104, toJSON() {} }
    }
    if (this.getAttribute('role') === 'option') {
      const list = this.parentElement!
      const index = Array.from(list.children).indexOf(this)
      const top = 106 + index * 30 - list.scrollTop
      return { x: 26, y: top, top, bottom: top + 30, left: 26, right: 214, width: 188, height: 30, toJSON() {} }
    }
    return originalRect.call(this)
  })
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function () {
    return this.getAttribute('role') === 'listbox' ? 100 : 0
  })
  vi.spyOn(HTMLElement.prototype, 'clientTop', 'get').mockImplementation(function () {
    return this.getAttribute('role') === 'listbox' ? 2 : 0
  })
}

function expectVisible(input: HTMLElement, list: HTMLElement) {
  const active = document.getElementById(input.getAttribute('aria-activedescendant')!)!
  const row = active.getBoundingClientRect()
  const top = list.getBoundingClientRect().top + list.clientTop
  expect(row.top).toBeGreaterThanOrEqual(top)
  expect(row.bottom).toBeLessThanOrEqual(top + list.clientHeight)
  expect(document.activeElement).toBe(input)
  return active
}

describe('Combobox keyboard option visibility', () => {
  it('reveals enabled options with minimal list scrolling and keeps its popup open on that scroll', async () => {
    listGeometry()
    const user = userEvent.setup()
    render(<DiyaProvider><Combobox label="Teams" options={options} value="" onValueChange={() => {}} /></DiyaProvider>)
    const input = screen.getByRole('combobox', { name: 'Teams' })
    await user.tab()
    await user.keyboard('{ArrowDown}')
    const list = screen.getByRole('listbox', { name: 'Teams' })
    const host = list.closest<HTMLElement>('.diya-root')!
    host.scrollTop = 64
    const pageScroll = vi.spyOn(window, 'scrollTo')
    expect(list.scrollTop).toBe(0)
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(list.scrollTop).toBe(0)
    await user.keyboard('{ArrowDown}')
    expect(list.scrollTop).toBe(24)
    expectVisible(input, list)
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}')
    expect(expectVisible(input, list).textContent).toBe('Team 9')
    expect(list.scrollTop).toBe(174)
    fireEvent.scroll(list)
    expect(screen.getByRole('listbox', { name: 'Teams' })).toBe(list)
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}')
    expect(expectVisible(input, list).textContent).toBe('Team 5')
    expect(list.scrollTop).toBe(124)
    expect(host.scrollTop).toBe(64)
    expect(pageScroll).not.toHaveBeenCalled()
  })

  it('reveals the last enabled option on initial ArrowUp after the native popover is shown', async () => {
    listGeometry()
    const native = vi.fn(function (this: HTMLElement) { this.setAttribute('data-native-opened', 'true') })
    Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, writable: true, value: native })
    const user = userEvent.setup()
    render(<DiyaProvider><Combobox label="Teams" options={options} value="" onValueChange={() => {}} /></DiyaProvider>)
    const input = screen.getByRole('combobox', { name: 'Teams' })
    await user.tab()
    await user.keyboard('{ArrowUp}')
    const list = screen.getByRole('listbox', { name: 'Teams' })
    expect(list.getAttribute('data-native-opened')).toBe('true')
    expect(expectVisible(input, list).textContent).toBe('Team 19')
    expect(list.scrollTop).toBe(474)
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('reveals a keyboard option after manual scrolling, including an unchanged boundary index and a new query', async () => {
    listGeometry()
    const user = userEvent.setup()
    render(<DiyaProvider><Combobox label="Teams" options={options} value="" onValueChange={() => {}} /></DiyaProvider>)
    const input = screen.getByRole('combobox', { name: 'Teams' })
    await user.tab()
    await user.keyboard('{ArrowDown}')
    const list = screen.getByRole('listbox', { name: 'Teams' })
    list.scrollTop = 180
    fireEvent.scroll(list)
    await user.keyboard('{ArrowUp}')
    expect(expectVisible(input, list).textContent).toBe('Team 1')
    expect(list.scrollTop).toBe(4)
    list.scrollTop = 180
    await user.type(input, 'T', { skipClick: true })
    expect(expectVisible(input, list).textContent).toBe('Team 1')
    expect(list.scrollTop).toBe(4)
  })

  it('leaves manual scroll position alone when hovering a partially visible option', async () => {
    listGeometry()
    const user = userEvent.setup()
    render(<DiyaProvider><Combobox label="Teams" options={options} value="" onValueChange={() => {}} /></DiyaProvider>)
    await user.tab()
    await user.keyboard('{ArrowDown}')
    const list = screen.getByRole('listbox', { name: 'Teams' })
    list.scrollTop = 300
    fireEvent.mouseEnter(screen.getByRole('option', { name: 'Team 10' }))
    expect(list.scrollTop).toBe(300)
    expect(screen.getByRole('combobox', { name: 'Teams' }).getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Team 10' }).id)
  })
})

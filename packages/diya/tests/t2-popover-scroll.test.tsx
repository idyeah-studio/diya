import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, DiyaProvider, Menu, Popover } from '../dist/index.js'

// HappyDOM has no layout, so the trigger's rectangle is set by hand and moved the way a page scroll would.
function placeTrigger(trigger: HTMLElement, top: number) {
  const rect = () => ({ top, bottom: top + 40, left: 200, right: 320, width: 120, height: 40, x: 200, y: top, toJSON: () => ({}) }) as DOMRect
  trigger.getBoundingClientRect = rect
}
const nextFrame = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
const scrollPage = () => fireEvent(window, new Event('scroll'))

function renderPopover() {
  render(<DiyaProvider><Button>Before</Button><Popover label="Connect your editor"><Button>Copy command</Button></Popover></DiyaProvider>)
  const trigger = screen.getByRole('button', { name: 'Connect your editor' })
  placeTrigger(trigger, 300)
  return trigger
}

afterEach(() => vi.restoreAllMocks())

describe('Popover and Menu follow an outside scroll', () => {
  it('stays open through a scroll in the same frame as opening, even with the trigger still out of view', async () => {
    const user = userEvent.setup()
    const trigger = renderPopover()
    act(() => trigger.focus())
    await user.keyboard('{Enter}')
    // The browser is still bringing the focused trigger into view.
    placeTrigger(trigger, -60)
    scrollPage()
    await nextFrame()
    expect(screen.getByRole('dialog', { name: 'Connect your editor' })).toBeDefined()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Copy command' }))
  })

  it('moves with its trigger when the page scrolls, then closes once the trigger has left the viewport', async () => {
    const user = userEvent.setup()
    const trigger = renderPopover()
    await user.click(trigger)
    const panel = screen.getByRole('dialog', { name: 'Connect your editor' })
    expect(panel.style.top).toBe('350px')
    placeTrigger(trigger, 180)
    scrollPage()
    await nextFrame()
    expect(panel.style.top).toBe('230px')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    // Past the settling moment, the trigger scrolls fully off the top of the screen.
    const opened = performance.now()
    vi.spyOn(performance, 'now').mockReturnValue(opened + 1000)
    placeTrigger(trigger, -80)
    scrollPage()
    await nextFrame()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    // Focus was in the panel, so it goes back to the trigger instead of the page.
    expect(document.activeElement).toBe(trigger)
  })

  it('ignores scrolling inside its own panel', async () => {
    const user = userEvent.setup()
    const trigger = renderPopover()
    await user.click(trigger)
    vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 1000)
    placeTrigger(trigger, -80)
    fireEvent.scroll(screen.getByRole('dialog'))
    await nextFrame()
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('still closes a Popover on Escape and on an outside click', async () => {
    const user = userEvent.setup()
    const trigger = renderPopover()
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Before' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps a Menu open through a page scroll and closes it on Escape, an outside click or focus leaving', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Button>Outside</Button><Menu label="Actions" items={[{ id: 'edit', label: 'Edit project', onSelect: () => {} }]} /></DiyaProvider>)
    const trigger = screen.getByRole('button', { name: 'Actions' })
    placeTrigger(trigger, 300)
    await user.click(trigger)
    scrollPage()
    await nextFrame()
    expect(screen.getByRole('menu')).toBeDefined()
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit project' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('menu')).toBeNull()
    await user.click(trigger)
    act(() => screen.getByRole('button', { name: 'Outside' }).focus())
    expect(screen.queryByRole('menu')).toBeNull()
  })
})

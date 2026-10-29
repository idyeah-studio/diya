import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { Avatar } from '../dist/index.js'

describe('Avatar image completion and hydration', () => {
  it('recovers an image that failed before hydration without waiting for another error event', async () => {
    const container = document.createElement('div')
    const avatar = <Avatar name="Alex Morgan" src="/missing-avatar.svg" status="online" />
    container.innerHTML = renderToString(avatar)
    document.body.append(container)
    const image = container.querySelector('img')!
    Object.defineProperties(image, {
      complete: { configurable: true, value: true },
      naturalWidth: { configurable: true, value: 0 },
    })
    let root: Root | undefined
    try {
      await act(async () => { root = hydrateRoot(container, avatar) })
      expect(container.querySelector('img')).toBeNull()
      expect(screen.getByRole('img', { name: 'Alex Morgan, online' }).textContent).toBe('AM')
    } finally {
      await act(async () => root?.unmount())
      container.remove()
    }
  })

  it('keeps pending and successfully completed images and checks a replacement source independently', () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false)
    const width = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0)
    const view = render(<Avatar name="Alex Morgan" src="/pending.svg" />)
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/pending.svg')
    complete.mockReturnValue(true)
    width.mockReturnValue(96)
    view.rerender(<Avatar name="Alex Morgan" src="/loaded.svg" />)
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/loaded.svg')
    width.mockReturnValue(0)
    view.rerender(<Avatar name="Alex Morgan" src="/failed-replacement.svg" />)
    expect(view.container.querySelector('img')).toBeNull()
    expect(screen.getByRole('img', { name: 'Alex Morgan' }).textContent).toBe('AM')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import NotFound from '../app/not-found'

// The countdown's 404, so before launch whatever day the tests run; the
// library's own way back takes over with the catalog.
beforeEach(() => {
  vi.stubEnv('DIYA_CATALOG_PREVIEW', '')
  vi.stubEnv('DIYA_NOW', '2026-11-01T12:00:00Z')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('unavailable-page recovery', () => {
  it('provides one named main landmark and a focusable skip-link target', () => {
    render(<NotFound />)

    const heading = screen.getByRole('heading', { name: 'This page isn’t available', level: 1 })
    const main = screen.getByRole('main', { name: 'This page isn’t available' })
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(main.contains(heading)).toBe(true)
    expect(main.id).toBe('content')
    expect(document.querySelectorAll('#content')).toHaveLength(1)
    expect(main.tabIndex).toBe(-1)
    main.focus()
    expect(document.activeElement).toBe(main)
  })

  it('offers a named real home link without relying on the inert public header', () => {
    render(<NotFound />)

    const main = screen.getByRole('main')
    const link = within(main).getByRole('link', { name: 'Return to DIYA home' })
    expect(link.getAttribute('href')).toBe('/')
    expect(link.textContent).toBe('Return to DIYA home')
    expect(link.closest('[inert]')).toBeNull()
    expect(within(main).getAllByRole('link')).toHaveLength(1)
    expect(main.textContent).toContain('The address may be incorrect')
  })
})

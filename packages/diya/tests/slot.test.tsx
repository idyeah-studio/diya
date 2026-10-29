import { createRef, forwardRef, type AnchorHTMLAttributes } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { renderSlot } from '../src/internal/slot.js'

const RouterLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(function RouterLink(props, ref) {
  return <a ref={ref} data-router="yes" {...props} />
})

describe('renderSlot', () => {
  it('merges classes, styles and handlers into the child and reaches both refs', () => {
    const ours = createRef<HTMLAnchorElement>()
    const theirs = createRef<HTMLAnchorElement>()
    const order: string[] = []
    render(<>{renderSlot(
      <RouterLink ref={theirs} href="/billing" className="mine" style={{ color: 'red' }} onClick={() => order.push('child')}>Billing</RouterLink>,
      { className: 'diya-button', style: { padding: 4 }, 'data-variant': 'solid', onClick: () => order.push('diya') },
      ours,
    )}</>)
    const link = screen.getByRole('link', { name: 'Billing' })
    expect(link.className).toBe('diya-button mine')
    expect(link.getAttribute('data-variant')).toBe('solid')
    expect(link.getAttribute('data-router')).toBe('yes')
    expect(link.style.color).toBe('red')
    expect(link.style.padding).toBe('4px')
    fireEvent.click(link)
    expect(order).toEqual(['child', 'diya'])
    expect(ours.current).toBe(link)
    expect(theirs.current).toBe(link)
  })
  it("lets the child's handler stop DIYA's", () => {
    const diya = vi.fn()
    render(<>{renderSlot(<a href="#x" onClick={(e) => e.preventDefault()}>Stop</a>, { onClick: diya })}</>)
    fireEvent.click(screen.getByRole('link', { name: 'Stop' }))
    expect(diya).not.toHaveBeenCalled()
  })
})

// VisuallyHidden (1.2, api.md §4): a span read by screen readers and not shown, with no provider.
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisuallyHidden } from '../dist/index.js'

describe('VisuallyHidden', () => {
  it('style merges after the hiding style', () => {
    let node: HTMLSpanElement | null = null
    render(<p>3<VisuallyHidden ref={(element) => { node = element }} id="unread" style={{ color: 'red', margin: 0 }}> unread messages</VisuallyHidden></p>)
    expect(node!.tagName).toBe('SPAN')
    expect(node!.id).toBe('unread')
    const style = node!.style
    expect([style.position, style.width, style.height, style.padding, style.overflow, style.clipPath, style.whiteSpace, style.borderWidth || style.border])
      .toEqual(['absolute', '1px', '1px', '0px', 'hidden', 'inset(50%)', 'nowrap', expect.stringMatching(/^0(px)?/)])
    // The reader's style comes last.
    expect(style.color).toBe('red')
    expect(style.margin).toBe('0px')
    expect(screen.getByText('3', { exact: false }).textContent).toBe('3 unread messages')
  })

  it('needs no provider, and uses the one hiding style when given none', () => {
    const { container } = render(<VisuallyHidden>Filters</VisuallyHidden>)
    const node = container.firstElementChild as HTMLElement
    expect(node.style.margin).toBe('-1px')
    expect(node.textContent).toBe('Filters')
  })

  it('warns on a button child', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<VisuallyHidden>Skip <button type="button">here</button></VisuallyHidden>)
    expect(warn).toHaveBeenCalledWith('DIYA: VisuallyHidden contains a focusable element, which keyboard users would land on without seeing it.')
    warn.mockRestore()
  })

  it('stays quiet for plain words and for elements a keyboard skips', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<>
      <VisuallyHidden>Sorted by <strong>date</strong></VisuallyHidden>
      <VisuallyHidden><a>no href</a><span tabIndex={-1}>skipped</span><button type="button" disabled>off</button></VisuallyHidden>
    </>)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

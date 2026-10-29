import { createElement, forwardRef } from 'react'
import { cx } from '../internal/cx.js'
import { layoutAttributes, type LayoutProps } from './layout.js'

export type InlineProps = LayoutProps
/** Lays children out side by side, centered on one line, wrapping onto the next when they run out of room. */
export const Inline = forwardRef<HTMLElement, InlineProps>(function Inline({ as = 'div', gap = 2, align = 'center', justify, wrap = true, className, style, children, ...rest }, ref) {
  return createElement(as, { ...rest, ref, className: cx('diya-inline', className), ...layoutAttributes(gap, align, justify, wrap, style) }, children)
})

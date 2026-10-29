import { createElement, forwardRef } from 'react'
import { cx } from '../internal/cx.js'
import { layoutAttributes, type LayoutProps } from './layout.js'

export type StackProps = LayoutProps
/** Lays children out top to bottom with even space between them. */
export const Stack = forwardRef<HTMLElement, StackProps>(function Stack({ as = 'div', gap = 4, align, justify, wrap = false, className, style, children, ...rest }, ref) {
  return createElement(as, { ...rest, ref, className: cx('diya-stack', className), ...layoutAttributes(gap, align, justify, wrap, style) }, children)
})

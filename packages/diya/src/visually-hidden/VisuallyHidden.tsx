import { Children, forwardRef, isValidElement, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { warnOnce } from '../internal/warn.js'

export type VisuallyHiddenProps = HTMLAttributes<HTMLSpanElement> & {
  /** Words for screen readers that complete what's on screen, such as " unread messages" after a count. Never anything focusable. */
  children: ReactNode
}

// The one hiding style: 1px, clipped to nothing and out of the flow, yet still read. The
// `.diya-sr-only` class in styles.css carries the same declarations.
export const visuallyHiddenStyle: CSSProperties = Object.freeze({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
})

// A shallow look at the children for host elements a keyboard can land on. It can't see inside
// components, which render later.
function focusable(children: ReactNode): boolean {
  return Children.toArray(children).some(child => {
    if (!isValidElement(child) || typeof child.type !== 'string') return false
    const props = child.props as { href?: unknown, tabIndex?: unknown, disabled?: unknown, children?: ReactNode }
    if (typeof props.tabIndex === 'number') return props.tabIndex >= 0 || focusable(props.children)
    if (child.type === 'a' && props.href !== undefined) return true
    if (['button', 'input', 'select', 'textarea'].includes(child.type) && !props.disabled) return true
    return focusable(props.children)
  })
}

/** Text that screen readers read and the screen doesn't show. To name a control with no text, use `aria-label` instead. Needs no provider; works in a Server Component. */
export const VisuallyHidden = forwardRef<HTMLSpanElement, VisuallyHiddenProps>(function VisuallyHidden({ style, children, ...props }, ref) {
  if (process.env.NODE_ENV !== 'production' && focusable(children)) warnOnce('DIYA: VisuallyHidden contains a focusable element, which keyboard users would land on without seeing it.')
  return <span {...props} ref={ref} style={style ? { ...visuallyHiddenStyle, ...style } : visuallyHiddenStyle}>{children}</span>
})

import { Children, cloneElement, forwardRef, isValidElement, type AnchorHTMLAttributes, type ReactElement, type ReactNode } from 'react'
import { cx } from '../internal/cx.js'
import { renderSlot } from '../internal/slot.js'
/** Native anchor attributes (href, target, rel…) pass through to the link. */
export type TextLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** Decorative icon before the text; hidden from assistive tech. */
  leadingIcon?: ReactNode
  /** Decorative icon after the text; hidden from assistive tech. */
  trailingIcon?: ReactNode
  /** Flows inside a sentence and inherits its type size; off, it is a standalone body-size link. */
  inline?: boolean
  /** Styles your single child element as the link instead of rendering an anchor, such as a router `Link`; the icons go inside it. */
  asChild?: boolean
}
/** A styled anchor; its children are the visible link text. Needs no provider, so it renders in server components. */
export const TextLink = forwardRef<HTMLAnchorElement, TextLinkProps>(function TextLink({ children, leadingIcon, trailingIcon, inline = false, asChild = false, className, ...props }, ref) {
  const icons = (inner: ReactNode) => <>{leadingIcon && <span aria-hidden="true">{leadingIcon}</span>}{inner}{trailingIcon && <span aria-hidden="true">{trailingIcon}</span>}</>
  if (asChild) {
    const child = Children.only(children)
    if (!isValidElement(child)) return null
    const own = child as ReactElement<{ children?: ReactNode }>
    const filled = leadingIcon || trailingIcon ? cloneElement(own, undefined, icons(own.props.children)) : own
    return renderSlot(filled, { ...props, className: cx('diya-text-link', className), 'data-inline': inline }, ref)
  }
  return <a {...props} ref={ref} className={cx('diya-text-link', className)} data-inline={inline}>{icons(children)}</a>
})

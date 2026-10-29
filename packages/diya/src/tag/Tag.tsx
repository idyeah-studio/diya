'use client'
import { Children, forwardRef, isValidElement, type HTMLAttributes, type ReactNode } from 'react'
import { useDiyaMessages } from '../DiyaProvider.js'
import { Badge, type Tone } from '../badge/Badge.js'
import { cx } from '../internal/cx.js'
import { tagMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    tag: typeof tagMessages
  }
}
export type TagProps = HTMLAttributes<HTMLSpanElement> & {
  /** Visible tag text. */
  children: ReactNode
  /** 'dot' shows a small dot in the tag's tone; any other node is a decorative icon. Both are hidden from screen readers. */
  leading?: 'dot' | ReactNode
  /** Color meaning: 'neutral' plain, 'brand' a soft tint of your brand color, 'success' done, 'warning' needs care, 'error' failed, 'info' for information. Defaults to 'neutral'. */
  tone?: Tone
  /** Tag height and text size. Defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** When given, shows a remove button that calls it. */
  onRemove?: () => void
  /** Plain-text name for the tag, not shown; the remove button is announced as "Remove {label}". Defaults to the text of `children`. */
  label?: string
}
/** The plain text inside a node tree, such as "Design" from <strong>Design</strong>. */
function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => (typeof child === 'string' || typeof child === 'number' ? String(child) : isValidElement<{ children?: ReactNode }>(child) ? textOf(child.props.children) : ''))
    .join('')
    .trim()
}
/** A compact label for a category, status or filter, optionally removable. */
export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag({ children, leading, tone = 'neutral', size = 'medium', onRemove, label, className, ...props }, ref) {
  const t = useDiyaMessages('tag', tagMessages)
  const name = label ?? textOf(children)
  return <span {...props} ref={ref} className={cx('diya-tag', className)} data-size={size} data-color={tone}>
    {leading === 'dot' ? <span aria-hidden="true"><Badge variant="dot" tone={tone} label={name} /></span> : leading && <span className="diya-tag-icon" aria-hidden="true">{leading}</span>}
    <span>{children}</span>
    {onRemove && <button type="button" aria-label={t.remove(name)} onClick={onRemove}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>}
  </span>
})

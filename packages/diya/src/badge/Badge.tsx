'use client'
import { forwardRef, type HTMLAttributes } from 'react'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { countLabel } from './badge-utils.js'
import { badgeMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    badge: typeof badgeMessages
  }
}
/** Status vocabulary shared by Badge, Tag, Alert and Toast: 'neutral' plain, 'brand' your brand color, 'success' done, 'warning' needs care, 'error' failed, 'info' for information. */
export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'info'
export type BadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  /** Required, so a Badge never guesses: 'count' shows `count` as a number; 'dot' is a small dot with no text. */
  variant: 'count' | 'dot'
  /** Badge size. Defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** Color meaning; see `Tone`. 'brand' follows the provider's brand color. Defaults to 'neutral'. */
  tone?: Tone
  /** Whole number shown by a 'count' badge; a count of 0 hides the badge unless `showZero` is set. */
  count?: number
  /** Highest number shown; larger counts show as '{max}+', such as '99+', while the accessible name keeps the real count. Defaults to 99. */
  max?: number
  /** Keeps a 'count' badge visible at 0. */
  showZero?: boolean
  /** Accessible name, never shown: what the dot means, or what is counted, read after the number ("3 unread messages"). For visible text, use Tag. */
  label: string
}
/** A small count (`variant="count"`) or dot (`variant="dot"`) that flags status or new items. Its `label` is announced, never shown. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant, size = 'medium', tone = 'neutral', count = 0, max = 99, showZero = false, label, className, ...props },
  ref
) {
  const t = useDiyaMessages('badge', badgeMessages)
  const dot = variant === 'dot'
  const value = countLabel(count, max)
  if (!dot && value.count === 0 && !showZero) return null
  return (
    <span
      role="img"
      {...props}
      ref={ref}
      className={cx('diya-badge', className)}
      data-variant={dot ? 'dot' : 'count'}
      data-size={size}
      data-color={tone}
      data-multiple={!dot && value.text.length > 1 ? true : undefined}
      aria-label={dot ? label : t.count(value.count, label)}
    >
      {!dot && <span aria-hidden="true">{value.text}</span>}
    </span>
  )
})

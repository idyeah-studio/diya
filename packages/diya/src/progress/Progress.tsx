'use client'
import { forwardRef, type HTMLAttributes } from 'react'
import { useDiyaLocale, useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { progressMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    progress: typeof progressMessages
  }
}
/** Without a `value`, progress is indeterminate: working, amount unknown. */
export type ProgressProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Percent complete, 0–100 (clamped); omit it for indeterminate progress. */
  value?: number
  /** 'linear' is a bar; 'circular' is a ring. Defaults to 'linear'. */
  variant?: 'linear' | 'circular'
  /** Forces indeterminate progress even when `value` is set. */
  indeterminate?: boolean
  /** Shows the rounded percentage beside the meter, visually only; hidden while indeterminate. Defaults to true. */
  showValue?: boolean
  /** Accessible name for the progress bar, such as 'Uploading report'; not shown. */
  label: string
}
/** A bar or ring showing how much of a task is done, or that work is under way. */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress({ value, variant = 'linear', indeterminate: forced = false, showValue = true, label, className, ...props }, ref) {
  const t = useDiyaMessages('progress', progressMessages)
  const locale = useDiyaLocale()
  const indeterminate = forced || value === undefined || !Number.isFinite(value)
  const amount = indeterminate ? 0 : Math.min(100, Math.max(0, value as number))
  return <div {...props} ref={ref} className={cx('diya-progress', className)} data-variant={variant} data-indeterminate={indeterminate}>
    <div className="diya-progress-meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={indeterminate ? undefined : amount} aria-valuetext={indeterminate ? t.inProgress : undefined}>
      {variant === 'linear' ? <div className="diya-progress-track"><span style={{width: indeterminate ? '35%' : `${amount}%`}} /></div> : <svg viewBox="0 0 100 100" aria-hidden="true"><circle className="diya-progress-track-circle" cx="50" cy="50" r="42" /><circle className="diya-progress-fill-circle" cx="50" cy="50" r="42" pathLength="100" strokeDasharray="100" strokeDashoffset={indeterminate ? 72 : 100 - amount} /></svg>}
    </div>
    {showValue && !indeterminate && <span className="diya-progress-value" aria-hidden="true">{new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(Math.round(amount) / 100)}</span>}
  </div>
})

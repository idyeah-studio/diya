'use client'
import { forwardRef, type HTMLAttributes } from 'react'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { metricMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    metric: typeof metricMessages
  }
}
export type MetricChange = {
  /** Visible change text, already formatted, such as '+12%'. */
  value: string
  /** Draws an up, down or flat arrow and is announced as increased, decreased or unchanged. */
  direction: 'up' | 'down' | 'flat'
  /** Whether the change is good ('positive', green), bad ('negative', red) or neither; independent of direction, and announced. */
  meaning: 'positive' | 'negative' | 'neutral'
  /** Visible context after the change, such as 'vs last month'. */
  comparison?: string
}
export type MetricProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** The headline figure as visible text, already formatted, such as '2,481'. */
  value: string
  /** Visible caption above the figure. */
  label?: string
  /** Visible unit after the figure, such as 'ms' or '%'. */
  unit?: string
  /** Figure size. Defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** A change against an earlier value, shown under the figure. */
  change?: MetricChange
}
/** One headline number with an optional caption, unit and change. */
export const Metric = forwardRef<HTMLDivElement, MetricProps>(function Metric({ value, label, unit, change, size = 'medium', className, ...props }, ref) {
  const t = useDiyaMessages('metric', metricMessages)
  return <div {...props} ref={ref} className={cx('diya-metric', className)} data-size={size}>
    {label && <span className="diya-metric-label">{label}</span>}
    <div className="diya-metric-number">{value}{unit && <span className="diya-metric-unit">{unit}</span>}</div>
    {change && <div className="diya-metric-comparison"><span className="diya-metric-change" data-meaning={change.meaning}><span aria-hidden="true">{change.direction === 'flat' ? '→' : change.direction === 'up' ? '↑' : '↓'}</span><span className="diya-metric-sr">{change.direction === 'flat' ? t.unchanged : change.direction === 'up' ? t.increased : t.decreased}: </span>{change.value}<span className="diya-metric-sr"> ({t[change.meaning]})</span></span>{change.comparison && <span>{change.comparison}</span>}</div>}
  </div>
})

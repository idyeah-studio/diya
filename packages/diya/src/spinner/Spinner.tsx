'use client'
import { forwardRef, useEffect, useState, type HTMLAttributes } from 'react'
import { cx } from '../internal/cx.js'
import { warnOnce } from '../internal/warn.js'
import { visuallyHiddenStyle } from '../visually-hidden/VisuallyHidden.js'

export type SpinnerProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'role'> & {
  /** 16, 20 or 24px: small beside caption and body text, medium beside large text, large beside titles or alone in a panel. Defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** What's loading, such as "Loading older invoices"; said politely once, when the spinner appears. Leave it out only when words beside it, or `aria-busy` on the region, already say so. */
  label?: string
  /** Shows `label` beside the ring, at the same moment (the one copy screen readers hear); defaults to false. */
  showLabel?: boolean
}

// Drawn at its exact pixel size, so the stroke never thins: box, stroke and radius per size.
const rings = {
  small: { box: 16, stroke: 1.75 },
  medium: { box: 20, stroke: 2 },
  large: { box: 24, stroke: 2.25 },
} as const

/** The ring alone, in `currentColor`: a faint track under a 28% arc. Button draws its spinner with it. */
export function renderSpinnerRing(size: keyof typeof rings) {
  const { box, stroke } = rings[size]
  const center = box / 2
  const r = center - stroke / 2
  return <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden="true" focusable="false">
    <circle className="diya-spinner-track" cx={center} cy={center} r={r} />
    <circle className="diya-spinner-arc" cx={center} cy={center} r={r} pathLength={100} strokeDasharray={100} strokeDashoffset={72} strokeLinecap="round" transform={`rotate(-90 ${center} ${center})`} />
  </svg>
}

// The spinner waits 400ms before it shows (CSS, so server HTML waits too); its label goes in on the same beat.
const beat = 400

/** A small ring in the text color for one busy part of a page. It appears after 400ms, so a quick load shows nothing. For a button use Button `loading`; for known progress, Progress. */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner({ size = 'medium', label, showLabel = false, className, ...props }, ref) {
  const [said, setSaid] = useState(false)
  const named = !!label
  useEffect(() => {
    if (!named) return
    // Live regions that arrive already full are missed by some screen readers; this one starts
    // empty and takes its words at the beat. Unmounted before then, nothing is heard.
    const timer = setTimeout(() => setSaid(true), beat)
    return () => clearTimeout(timer)
  }, [named])
  if (process.env.NODE_ENV !== 'production' && showLabel && !named) warnOnce('DIYA: Spinner has showLabel but no label, so there are no words to show. Add a label.')
  const words = showLabel && named
  // One copy of the words, put in on the beat: shown beside the ring with showLabel, else hidden.
  return <span {...props} ref={ref} className={cx('diya-spinner', className)} data-size={size} data-show-label={words || undefined}
    role={named ? 'status' : undefined} aria-hidden={named ? props['aria-hidden'] : true}>
    {renderSpinnerRing(size)}
    {named && said && (words ? <span className="diya-spinner-words">{label}</span> : <span style={visuallyHiddenStyle}>{label}</span>)}
  </span>
})

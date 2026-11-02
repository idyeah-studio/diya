'use client'
import { forwardRef, useId, useMemo, useRef, useState, type HTMLAttributes } from 'react'
import { useDiyaLocale, useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { calendarMessages } from './messages.js'
import { iso, monthOf, useClientLayoutEffect, useMonthGrid, type DateRange } from './month.js'

declare module '../messages.js' {
  interface DiyaMessages {
    calendar: typeof calendarMessages
  }
}

type CalendarBase = Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'children'> & {
  /** Visible label above the calendar; also names it for assistive tech. Hide it with hideLabel. */
  label: string
  /** Hides the label visually but keeps it as the calendar's accessible name. */
  hideLabel?: boolean
  /** Day height and type size, matching fields of the same size; defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** Earliest date that can be chosen, as ISO YYYY-MM-DD; earlier days show as unavailable. */
  min?: string
  /** Latest date that can be chosen, as ISO YYYY-MM-DD; later days show as unavailable. */
  max?: string
  /** Called with each ISO YYYY-MM-DD day on show; return true to mark the day unavailable (announced, and it can't be chosen), as with `min` and `max`. */
  isDateUnavailable?: (date: string) => boolean
  /** Dims the calendar and stops every day and month button. */
  disabled?: boolean
  /** The month on show as ISO YYYY-MM, when controlled; pair it with `onMonthChange`. Left out, the calendar starts on the chosen date's month, or today's. */
  month?: string
  /** Called with the ISO YYYY-MM month to show: from the month buttons, from the keyboard moving into another month, or when `value` changes to a date in another month. */
  onMonthChange?: (month: string) => void
}
/** One ISO date (YYYY-MM-DD), '' for none. */
export type CalendarSingleProps = CalendarBase & {
  /** Single-date mode (the default): leave unset or false. */
  range?: false
  /** The chosen date as ISO YYYY-MM-DD, or '' for none, when controlled; pair it with `onValueChange`. */
  value?: string
  /** The initially chosen ISO date when uncontrolled. */
  defaultValue?: string
  /** Called with the chosen ISO YYYY-MM-DD date. */
  onValueChange?: (value: string) => void
}
/** A start and end date. */
export type CalendarRangeProps = CalendarBase & {
  /** Range mode: the first click sets the start, the second the end (swapped if earlier); the next click starts a new range. */
  range: true
  /** The chosen range as ISO YYYY-MM-DD dates, a bound '' while unset, when controlled; pair it with `onValueChange`. */
  value?: DateRange
  /** The initially chosen range when uncontrolled. */
  defaultValue?: DateRange
  /** Called with the new range after each click; `end` is '' until the second date is chosen. */
  onValueChange?: (value: DateRange) => void
}
/** One ISO date ('' for none) by default; `range` takes and returns a DateRange. Other attributes and the ref go on the outer element. */
export type CalendarProps = CalendarSingleProps | CalendarRangeProps

const toMonth = (date: Date) => iso(date).slice(0, 7)
const fromMonth = (text: string | undefined) => text && /^\d{4}-(0[1-9]|1[0-2])$/.test(text) ? new Date(Number(text.slice(0, 4)), Number(text.slice(5)) - 1, 1) : undefined

/** A labeled month calendar that stays on the page; picks one ISO date, or a start and end date with `range`. */
export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(props, ref) {
  const {
    label, hideLabel = false, size = 'medium', min, max, isDateUnavailable, disabled = false, month: monthProp, onMonthChange, className,
    range: _range, value: _value, defaultValue: _defaultValue, onValueChange: _onValueChange, ...rest
  } = props
  const t = useDiyaMessages('calendar', calendarMessages)
  const locale = useDiyaLocale()
  const id = useId()
  const range = props.range === true
  const controlled = props.value !== undefined
  const [uncontrolled, setUncontrolled] = useState<DateRange>(() => props.range ? props.defaultValue ?? { start: '', end: '' } : { start: props.defaultValue ?? '', end: '' })
  // Internally a value is always a range; a single date is { start: date, end: '' }.
  const value: DateRange = !controlled ? uncontrolled : props.range ? props.value ?? { start: '', end: '' } : { start: props.value ?? '', end: '' }
  // A start without an end means the next day chosen ends the range.
  const choosingEnd = range && !!value.start && !value.end

  const [ownMonth, setOwnMonth] = useState(() => monthOf(value.start, min, max))
  const shownKey = fromMonth(monthProp) ? monthProp! : toMonth(ownMonth)
  const month = useMemo(() => fromMonth(shownKey)!, [shownKey])
  function changeMonth(next: Date) {
    if (monthProp === undefined) setOwnMonth(next)
    onMonthChange?.(toMonth(next))
  }
  // A new value in another month (a "Next day" button, say) turns the page to it.
  const lastStart = useRef(value.start)
  useClientLayoutEffect(() => {
    if (value.start === lastStart.current) return
    lastStart.current = value.start
    if (!value.start) return
    const target = monthOf(value.start, min, max)
    if (toMonth(target) !== shownKey) changeMonth(target)
  }, [value.start])

  function choose(day: string) {
    if (disabled || monthGrid.isBlocked(day)) return
    const next: DateRange = !range ? { start: day, end: '' }
      : !choosingEnd ? { start: day, end: '' }
      : { start: day < value.start ? day : value.start, end: day < value.start ? value.start : day }
    if (!controlled) setUncontrolled(next)
    if (props.range) props.onValueChange?.(next)
    else props.onValueChange?.(next.start)
  }
  const monthGrid = useMonthGrid({ locale, month, onMonthChange: changeMonth, value, range, choosingEnd, min, max, isDateUnavailable, disabled, active: true, strings: t, onChoose: choose })

  return <div {...rest} ref={ref} role="group" aria-labelledby={`${id}-label`} aria-disabled={disabled || undefined}
    className={cx('diya-inline-calendar', className)} data-size={size} data-disabled={disabled || undefined}>
    <span id={`${id}-label`} className={hideLabel ? 'diya-sr-only' : 'diya-calendar-label'}>{label}</span>
    {monthGrid.render()}
  </div>
})

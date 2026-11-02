'use client'
import { forwardRef, useEffect, useId, useMemo, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { display, iso, monthOf, outsideLimits, useMonthGrid, type DateRange } from '../calendar/month.js'
import { adjacentTabStop, useAnchoredPopover } from '../combobox/useAnchoredPopover.js'
import { useDiyaLocale, useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { useFormReset, useMergedRef } from '../text-input/native-field.js'
import { datePickerMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    datePicker: typeof datePickerMessages
  }
}

export type { DateRange }
type DatePickerBase = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'defaultValue' | 'type' | 'name' | 'onChange' | 'children'> & {
  /** Visible label above the field; also names the trigger for assistive tech. Hide it with hideLabel. */
  label: string
  /** Prevents opening the calendar and dims the field. */
  disabled?: boolean
  /** Visible error message below the field; marks it invalid while set. */
  error?: string
  /** Hides the label visually but keeps it as the trigger's accessible name. */
  hideLabel?: boolean
  /** Visible hint below the field, announced with it; `error` replaces it while set. */
  helperText?: string
  /** Trigger height and type size; defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** Earliest date that can be chosen, as ISO YYYY-MM-DD; earlier days show as unavailable. */
  min?: string
  /** Latest date that can be chosen, as ISO YYYY-MM-DD; later days show as unavailable. */
  max?: string
  /** Called with each ISO YYYY-MM-DD day on show; return true to mark the day unavailable (announced, and it can't be chosen), as with `min` and `max`. */
  isDateUnavailable?: (date: string) => boolean
  /** Form field name: the chosen date is sent with the form under it (in range mode, the start and then the end). */
  name?: string
}
/** One ISO date (YYYY-MM-DD), '' for none. */
export type DatePickerSingleProps = DatePickerBase & {
  /** Single-date mode (the default): leave unset or false. */
  range?: false
  /** The chosen date as ISO YYYY-MM-DD, or '' for none, when controlled; pair it with `onValueChange`. */
  value?: string
  /** The initially chosen ISO date when uncontrolled; a form reset returns to it. */
  defaultValue?: string
  /** Called with the chosen ISO YYYY-MM-DD date, or '' when cleared. */
  onValueChange?: (value: string) => void
}
/** A start and end date. */
export type DatePickerRangeProps = DatePickerBase & {
  /** Range mode: the first click sets the start, the second the end (swapped if earlier). */
  range: true
  /** The chosen range as ISO YYYY-MM-DD dates, a bound '' while unset, when controlled; pair it with `onValueChange`. */
  value?: DateRange
  /** The initially chosen range when uncontrolled; a form reset returns to it. */
  defaultValue?: DateRange
  /** Called with the new range after each click; `end` is '' until the second date is chosen. */
  onValueChange?: (value: DateRange) => void
}
/** One ISO date ('' for none) by default; `range` takes and returns a DateRange. Native button attributes and the ref go on the trigger; `className` and `style` go on the outer field wrapper. */
export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps

/** A labeled date field that opens a calendar popup; picks one ISO date, or a start and end date with `range`. */
export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(props, ref) {
  const {
    label, disabled = false, error, hideLabel = false, helperText, size = 'medium', min, max, isDateUnavailable, name, className, style,
    onClick: onTriggerClick, onKeyDown: onTriggerKeyDown, 'aria-describedby': describedBy,
    range: _range, value: _value, defaultValue: _defaultValue, onValueChange: _onValueChange, ...rest
  } = props
  const t = useDiyaMessages('datePicker', datePickerMessages)
  const locale = useDiyaLocale()
  const range = props.range === true
  const controlled = props.value !== undefined
  const initial = (): DateRange => props.range ? props.defaultValue ?? { start: '', end: '' } : { start: props.defaultValue ?? '', end: '' }
  const [uncontrolled, setUncontrolled] = useState<DateRange>(initial)
  // Internally a value is always a range; a single date is { start: date, end: '' }.
  const value: DateRange = !controlled ? uncontrolled : props.range ? props.value ?? { start: '', end: '' } : { start: props.value ?? '', end: '' }
  const onChange = (next: DateRange) => {
    if (!controlled) setUncontrolled(next)
    if (props.range) props.onValueChange?.(next)
    else props.onValueChange?.(next.start)
  }
  const outside = (day: string) => outsideLimits(day, min, max) || !!isDateUnavailable?.(day)
  const monthFor = (day: string) => monthOf(day, min, max)
  const id = useId()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => monthFor(value.start))
  const [choosingEnd, setChoosingEnd] = useState(false)
  const field = useRef<HTMLDivElement | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const triggerRef = useMergedRef(ref, trigger)
  const calendar = useRef<HTMLDivElement | null>(null)
  const isOpen = open && !disabled
  const popupContent = useMemo(() => ({ month, range, size }), [month, range, size])
  const portal = useAnchoredPopover(isOpen, trigger, calendar, 300, popupContent)
  useFormReset(trigger, () => { if (!controlled) setUncontrolled(initial()) })
  const monthGrid = useMonthGrid({ locale, month, onMonthChange: setMonth, value, range, choosingEnd, min, max, isDateUnavailable, active: isOpen, strings: t, onChoose: choose })
  function close() { setOpen(false); setChoosingEnd(false) }
  function escape(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape' || !isOpen) return
    event.preventDefault()
    event.stopPropagation()
    close()
    trigger.current?.focus()
  }
  useEffect(() => { if (disabled) close() }, [disabled])
  useEffect(() => {
    if (!isOpen) return
    const outside = (event: Event) => {
      if (!field.current?.contains(event.target as Node) && !calendar.current?.contains(event.target as Node)) close()
    }
    const resize = () => {
      if (calendar.current?.contains(document.activeElement)) trigger.current?.focus()
      close()
    }
    const scroll = (event: Event) => { if (!calendar.current?.contains(event.target as Node)) resize() }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [isOpen])
  const today = iso(new Date())
  function choose(day: string) {
    if (disabled || outside(day)) return
    if (range && (!choosingEnd || !value.start)) {
      onChange({ start: day, end: '' })
      setChoosingEnd(true)
    } else {
      onChange(range ? { start: day < value.start ? day : value.start, end: day < value.start ? value.start : day } : { start: day, end: '' })
      close()
      trigger.current?.focus()
    }
  }
  // Tab moves through the calendar's controls: the month buttons, one day, then Today and Clear.
  const tabStops = () => Array.from(calendar.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []).filter((button) => button.tabIndex >= 0)

  return <div ref={field} className={cx('diya-date-field', className)} style={style} data-size={size} data-invalid={!!error} onBlur={(event) => {
    const next = event.relatedTarget as Node | null
    if (!field.current?.contains(next) && !calendar.current?.contains(next)) close()
  }}>
    <label id={`${id}-label`} className={hideLabel ? 'diya-sr-only' : ''}>{label}</label>
    {name && (range ? [value.start, value.end] : [value.start]).map((entry, index) => <input key={index} type="hidden" name={name} value={entry} disabled={disabled} />)}
    <button {...rest} ref={triggerRef} type="button" className="diya-date-trigger" disabled={disabled} aria-labelledby={`${id}-label ${id}-value`}
      aria-expanded={isOpen} aria-controls={isOpen ? `${id}-calendar` : undefined} aria-describedby={[describedBy, error || helperText ? `${id}-help` : undefined].filter(Boolean).join(' ') || undefined} aria-invalid={!!error}
      onClick={(event) => {
        onTriggerClick?.(event)
        if (event.defaultPrevented) return
        if (isOpen) close()
        else if (!disabled) { setMonth(monthFor(value.start)); monthGrid.resetCursor(); setChoosingEnd(range && !!value.start && !value.end); setOpen(true) }
      }} onKeyDown={(event) => {
        onTriggerKeyDown?.(event)
        if (event.defaultPrevented) return
        escape(event)
        if (isOpen && event.key === 'Tab' && !event.shiftKey) {
          const firstControl = tabStops()[0]
          if (firstControl) { event.preventDefault(); firstControl.focus() }
        }
      }}>
      <span id={`${id}-value`}>{value.start ? `${display(value.start, locale)}${range ? ` – ${value.end ? display(value.end, locale) : t.endDate}` : ''}` : range ? t.chooseRange : t.chooseDate} </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 10h18" /></svg>
    </button>
    {(error || helperText) && <p id={`${id}-help`} className="diya-field-help">{error && <span aria-hidden="true">!</span>}{error || helperText}</p>}
    {isOpen && portal && createPortal(<div ref={calendar} id={`${id}-calendar`} className="diya-calendar"
      role="group" aria-label={t.chooseDate} onKeyDown={(event) => {
        escape(event)
        if (event.key !== 'Tab') return
        const controls = tabStops()
        if (event.shiftKey && event.target === controls[0]) {
          event.preventDefault()
          trigger.current?.focus()
        } else if (!event.shiftKey && event.target === controls[controls.length - 1]) {
          const destination = trigger.current && adjacentTabStop(trigger.current, calendar.current, false)
          close()
          if (destination) {
            destination.focus()
            if (destination.ownerDocument.activeElement === destination) event.preventDefault()
          }
        }
      }} style={{ position: 'fixed', inset: 'auto', margin: 0 }}>
      {monthGrid.render()}
      <div className="diya-calendar-footer">
        <button type="button" disabled={outside(today)} onClick={() => { setMonth(monthFor(today)); choose(today) }}>{t.today}</button>
        <button type="button" onClick={() => { if (!disabled) { onChange({ start: '', end: '' }); setChoosingEnd(false) } }}>{t.clear}</button>
      </div>
    </div>, portal)}
  </div>
})

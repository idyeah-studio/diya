'use client'
import { forwardRef, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
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

/** A date range as ISO dates (YYYY-MM-DD); '' while a bound is unset. */
export type DateRange = { start: string; end: string }
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
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const parse = (value: string) => new Date(`${value}T12:00:00`)
const display = (value: string, locale: string) => value ? parse(value).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
// Where Intl has no week data (older Firefox), CLDR's first day by region; everywhere else Monday.
const sundayFirst = new Set('AG AS BD BR BS BT BW BZ CA CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW'.split(' '))
const saturdayFirst = new Set('AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY'.split(' '))
type WeekLocale = Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } }
/** The locale's first day of the week, 0 (Sunday) to 6 (Saturday). */
function weekStartFor(locale: string) {
  try {
    const intl = new Intl.Locale(locale) as WeekLocale
    const info = typeof intl.getWeekInfo === 'function' ? intl.getWeekInfo() : intl.weekInfo
    if (info && info.firstDay >= 1 && info.firstDay <= 7) return info.firstDay % 7
    const region = intl.region ?? intl.maximize().region ?? ''
    return sundayFirst.has(region) ? 0 : saturdayFirst.has(region) ? 6 : region === 'MV' ? 5 : 1
  } catch {
    return 0
  }
}
// Headings start on the locale's first day. Two letters where that keeps all seven distinct (Mo Tu We… in English), else the locale's short name.
const weekdaysFor = (locale: string, start: number) => {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 1 January 2023 was a Sunday.
  const names = Array.from({ length: 7 }, (_, index) => format.format(new Date(2023, 0, 1 + ((start + index) % 7))))
  const short = names.map((name) => Array.from(name).slice(0, 2).join(''))
  return new Set(short).size === 7 ? short : names
}
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** A labelled date field that opens a calendar popup; picks one ISO date, or a start and end date with `range`. */
export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(props, ref) {
  const {
    label, disabled = false, error, hideLabel = false, helperText, size = 'medium', min, max, name, className, style,
    onClick: onTriggerClick, onKeyDown: onTriggerKeyDown, 'aria-describedby': describedBy,
    range: _range, value: _value, defaultValue: _defaultValue, onValueChange: _onValueChange, ...rest
  } = props
  const t = useDiyaMessages('datePicker', datePickerMessages)
  const locale = useDiyaLocale()
  const weekStart = useMemo(() => weekStartFor(locale), [locale])
  const weekdays = useMemo(() => weekdaysFor(locale, weekStart), [locale, weekStart])
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
  const outside = (day: string) => (!!min && day < min) || (!!max && day > max)
  const clampDay = (day: string) => min && day < min ? min : max && day > max ? max : day
  const monthFor = (day: string) => {
    const date = day ? parse(day) : new Date()
    const valid = Number.isFinite(date.getTime()) ? date : new Date()
    const shown = parse(clampDay(iso(valid)))
    return new Date(shown.getFullYear(), shown.getMonth(), 1)
  }
  const id = useId()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => monthFor(value.start))
  const [choosingEnd, setChoosingEnd] = useState(false)
  const [cursor, setCursor] = useState('')
  const field = useRef<HTMLDivElement | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const triggerRef = useMergedRef(ref, trigger)
  const calendar = useRef<HTMLDivElement | null>(null)
  const focusDate = useRef<string | null>(null)
  const isOpen = open && !disabled
  const popupContent = useMemo(() => ({ month, range, size }), [month, range, size])
  const portal = useAnchoredPopover(isOpen, trigger, calendar, 300, popupContent)
  useFormReset(trigger, () => { if (!controlled) setUncontrolled(initial()) })
  useClientLayoutEffect(() => {
    if (!isOpen || !focusDate.current) return
    calendar.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate.current}"]`)?.focus()
    focusDate.current = null
  }, [month, isOpen])
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
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const monthDays = Array.from({ length: days }, (_, index) => iso(new Date(month.getFullYear(), month.getMonth(), index + 1)))
  const today = iso(new Date())
  // Roving tabindex: one day in the grid is a Tab stop; arrows move it.
  const tabbable = cursor && monthDays.includes(cursor) ? cursor
    : [value.start, value.end, today].find((day) => monthDays.includes(day) && !outside(day)) ?? monthDays.find((day) => !outside(day)) ?? monthDays[0]
  const previousDisabled = !!min && iso(new Date(month.getFullYear(), month.getMonth(), 0)) < min
  const nextDisabled = !!max && iso(new Date(month.getFullYear(), month.getMonth() + 1, 1)) > max
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
  function moveDay(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const date = parse(day)
    const fromStart = (date.getDay() - weekStart + 7) % 7
    const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7, Home: -fromStart, End: 6 - fromStart }
    if (event.key in offsets) date.setDate(date.getDate() + offsets[event.key])
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const delta = event.key === 'PageUp' ? -1 : 1
      const nextMonth = date.getMonth() + delta
      const lastDay = new Date(date.getFullYear(), nextMonth + 1, 0).getDate()
      date.setDate(1)
      date.setMonth(nextMonth)
      date.setDate(Math.min(parse(day).getDate(), lastDay))
    } else return
    event.preventDefault()
    const target = clampDay(iso(date))
    setCursor(target)
    const shown = parse(target)
    if (shown.getMonth() !== month.getMonth() || shown.getFullYear() !== month.getFullYear()) {
      focusDate.current = target
      setMonth(new Date(shown.getFullYear(), shown.getMonth(), 1))
    } else calendar.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus()
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
        else if (!disabled) { setMonth(monthFor(value.start)); setCursor(''); setChoosingEnd(range && !!value.start && !value.end); setOpen(true) }
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
    {(error || helperText) && <p id={`${id}-help`} className="diya-field-help">{error || helperText}</p>}
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
      <div className="diya-calendar-heading">
        <button type="button" aria-label={t.previousMonth} disabled={previousDisabled} onClick={() => { setCursor(''); setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)) }}>‹</button>
        <strong aria-live="polite">{month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</strong>
        <button type="button" aria-label={t.nextMonth} disabled={nextDisabled} onClick={() => { setCursor(''); setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)) }}>›</button>
      </div>
      {range && <p className="diya-calendar-hint">{choosingEnd ? t.chooseEnd : t.chooseStart}</p>}
      <div className="diya-calendar-grid">
        {weekdays.map((day, index) => <span key={index} className="diya-calendar-weekday">{day}</span>)}
        {Array.from({ length: (first.getDay() - weekStart + 7) % 7 }, (_, index) => <span key={`space-${index}`} />)}
        {monthDays.map((day, index) => {
          const unavailable = outside(day)
          return <button type="button" key={day} data-date={day} aria-label={display(day, locale)} aria-pressed={day === value.start || day === value.end}
            aria-disabled={unavailable || undefined} tabIndex={day === tabbable ? 0 : -1}
            data-between={!!value.end && day > value.start && day < value.end} data-today={day === today} onClick={() => choose(day)}
            onFocus={() => setCursor(day)} onKeyDown={(event) => moveDay(event, day)}>{index + 1}</button>
        })}
      </div>
      <div className="diya-calendar-footer">
        <button type="button" disabled={outside(today)} onClick={() => { setMonth(monthFor(today)); choose(today) }}>{t.today}</button>
        <button type="button" onClick={() => { if (!disabled) { onChange({ start: '', end: '' }); setChoosingEnd(false) } }}>{t.clear}</button>
      </div>
    </div>, portal)}
  </div>
})

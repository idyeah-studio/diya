'use client'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'

/** A date range as ISO dates (YYYY-MM-DD); '' while a bound is unset. */
export type DateRange = { start: string; end: string }

export const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const parse = (value: string) => new Date(`${value}T12:00:00`)
export const display = (value: string, locale: string) => value ? parse(value).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
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
export const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Whether `day` falls before `min` or after `max`. */
export const outsideLimits = (day: string, min?: string, max?: string) => (!!min && day < min) || (!!max && day > max)
/** `day` moved inside `min` and `max`. */
export const clampToLimits = (day: string, min?: string, max?: string) => min && day < min ? min : max && day > max ? max : day
/** The first of the month that shows `day` (today when it is '' or invalid), kept inside `min` and `max`. */
export function monthOf(day: string, min?: string, max?: string) {
  const date = day ? parse(day) : new Date()
  const valid = Number.isFinite(date.getTime()) ? date : new Date()
  const shown = parse(clampToLimits(iso(valid), min, max))
  return new Date(shown.getFullYear(), shown.getMonth(), 1)
}

const subscribeNever = () => () => {}
/** Today as an ISO date; '' while hydrating server HTML, so a server in another time zone never marks the wrong day. */
const useToday = () => useSyncExternalStore(subscribeNever, () => iso(new Date()), () => '')

export type MonthGridStrings = { previousMonth: string; nextMonth: string; chooseStart: string; chooseEnd: string }
type MonthGridOptions = {
  locale: string
  /** The first of the month on show. */
  month: Date
  /** Asks to show another month: the month buttons, or the keyboard crossing into it. */
  onMonthChange: (month: Date) => void
  value: DateRange
  range: boolean
  /** In range mode, whether the next choice sets the end. */
  choosingEnd: boolean
  min?: string
  max?: string
  isDateUnavailable?: (date: string) => boolean
  /** Disables every button in the grid (Calendar's `disabled`). */
  disabled?: boolean
  /** Whether the grid is on screen; focus follows the keyboard into a new month only then. */
  active: boolean
  strings: MonthGridStrings
  onChoose: (day: string) => void
}

/**
 * The month grid DatePicker shows in its popup and Calendar shows on the page: the
 * month heading with its buttons, the range hint, the weekday headings and the days.
 * One day is a Tab stop; arrows, Home/End and PageUp/PageDown move it, kept inside
 * min and max. Days outside them, or unavailable, are announced and can't be chosen.
 */
export function useMonthGrid(options: MonthGridOptions) {
  const { locale, month, onMonthChange, value, range, choosingEnd, min, max, isDateUnavailable, disabled, active, strings: t, onChoose } = options
  const weekStart = useMemo(() => weekStartFor(locale), [locale])
  const weekdays = useMemo(() => weekdaysFor(locale, weekStart), [locale, weekStart])
  const [cursor, setCursor] = useState('')
  const grid = useRef<HTMLDivElement | null>(null)
  const focusDate = useRef<string | null>(null)
  const today = useToday()
  useClientLayoutEffect(() => {
    if (!active || !focusDate.current) return
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate.current}"]`)?.focus()
    focusDate.current = null
  }, [month, active])
  const blocked = (day: string) => outsideLimits(day, min, max) || !!isDateUnavailable?.(day)

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
    const target = clampToLimits(iso(date), min, max)
    setCursor(target)
    const shown = parse(target)
    if (shown.getMonth() !== month.getMonth() || shown.getFullYear() !== month.getFullYear()) {
      focusDate.current = target
      onMonthChange(new Date(shown.getFullYear(), shown.getMonth(), 1))
    } else grid.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus()
  }

  function render() {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const monthDays = Array.from({ length: days }, (_, index) => iso(new Date(month.getFullYear(), month.getMonth(), index + 1)))
    // Roving tabindex: one day in the grid is a Tab stop; arrows move it.
    const tabbable = cursor && monthDays.includes(cursor) ? cursor
      : [value.start, value.end, today].find((day) => monthDays.includes(day) && !blocked(day)) ?? monthDays.find((day) => !blocked(day)) ?? monthDays[0]
    const previousDisabled = !!min && iso(new Date(month.getFullYear(), month.getMonth(), 0)) < min
    const nextDisabled = !!max && iso(new Date(month.getFullYear(), month.getMonth() + 1, 1)) > max
    return <>
      <div className="diya-calendar-heading">
        <button type="button" aria-label={t.previousMonth} disabled={disabled || previousDisabled} onClick={() => { setCursor(''); onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1)) }}>‹</button>
        <strong aria-live="polite">{month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</strong>
        <button type="button" aria-label={t.nextMonth} disabled={disabled || nextDisabled} onClick={() => { setCursor(''); onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1)) }}>›</button>
      </div>
      {range && <p className="diya-calendar-hint">{choosingEnd ? t.chooseEnd : t.chooseStart}</p>}
      <div ref={grid} className="diya-calendar-grid">
        {weekdays.map((day, index) => <span key={index} className="diya-calendar-weekday">{day}</span>)}
        {Array.from({ length: (first.getDay() - weekStart + 7) % 7 }, (_, index) => <span key={`space-${index}`} />)}
        {monthDays.map((day, index) => {
          const unavailable = blocked(day)
          return <button type="button" key={day} data-date={day} aria-label={display(day, locale)} aria-pressed={day === value.start || day === value.end}
            aria-disabled={unavailable || undefined} disabled={disabled || undefined} tabIndex={day === tabbable ? 0 : -1}
            data-between={!!value.end && day > value.start && day < value.end} data-today={day === today} onClick={() => onChoose(day)}
            onFocus={() => setCursor(day)} onKeyDown={(event) => moveDay(event, day)}>{index + 1}</button>
        })}
      </div>
    </>
  }

  return { render, resetCursor: () => setCursor(''), isBlocked: blocked }
}

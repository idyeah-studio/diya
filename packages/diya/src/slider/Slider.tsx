'use client'
import { forwardRef, useRef, type CSSProperties, type InputHTMLAttributes } from 'react'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { setNativeValue, useFormReset, useMergedRef, useNativeMirror } from '../text-input/native-field.js'
import { sliderMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    slider: typeof sliderMessages
  }
}
type SliderBase = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'value' | 'defaultValue' | 'min' | 'max' | 'step' | 'disabled' | 'children'> & {
  /** Prevents dragging and dims the slider. */
  disabled?: boolean
  /** Shows the current numbers above the track (the minimum and the value, or start and end in range mode); defaults to true. */
  showValues?: boolean
  /** Shows a visible scale of five evenly spaced numbers from `min` to `max` under the track. */
  showMarks?: boolean
  /** Formats every number the slider shows (its values and marks) and what screen readers announce for each handle, such as `(value) => '$' + value`. Defaults to the plain number. */
  formatValue?: (value: number) => string
  /** Lowest value; defaults to 0. Numeric strings work too, so react-hook-form's register() spreads cleanly. */
  min?: number | string
  /** Highest value; defaults to 100. Numeric strings work too. */
  max?: number | string
  /** Increment between values, greater than 0; defaults to 1. Numeric strings work too. */
  step?: number | string
  /** Visible label above the slider; also names the inputs for assistive tech. Hide it with hideLabel. */
  label: string
  /** Hides the visible label; the inputs keep it as their accessible name. */
  hideLabel?: boolean
}
/** One number. */
export type SliderSingleProps = SliderBase & {
  /** Single mode (the default): one handle, leave unset or false. */
  range?: false
  /** The current value when controlled; out-of-range numbers are clamped. Pair it with `onValueChange`. */
  value?: number
  /** The starting value when uncontrolled; defaults to `min`, and a form reset returns to it. */
  defaultValue?: number
  /** Called with the new value while dragging or on a track click. */
  onValueChange?: (value: number) => void
}
/** Two numbers, [start, end]. */
export type SliderRangeProps = SliderBase & {
  /** Range mode: two handles for a start and end; the handles cannot cross. */
  range: true
  /** The current [start, end] when controlled, with start ≤ end. Pair it with `onValueChange`. */
  value?: [number, number]
  /** The starting [start, end] when uncontrolled; defaults to [min, max], and a form reset returns to it. */
  defaultValue?: [number, number]
  /** Called with the new [start, end] while dragging or on a track click. */
  onValueChange?: (value: [number, number]) => void
}
/** One number by default; `range` takes and returns [start, end]. Native attributes and the ref reach the (start) input; `name`, `onChange` and `onBlur` reach both inputs in range mode. */
export type SliderProps = SliderSingleProps | SliderRangeProps
const numberOr = (value: number | string | undefined, fallback: number) => {
  const number = typeof value === 'string' ? Number.parseFloat(value) : value
  return number !== undefined && Number.isFinite(number) ? number : fallback
}
const decimalsOf = (value: number) => (String(value).split('.')[1] ?? '').length
const samePair = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1]
/** A labelled slider with one handle, or two for a start and end with `range`; 0–100 unless `min` and `max` say otherwise. */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(props, ref) {
  const {
    disabled = false,
    showValues = true,
    showMarks = false,
    formatValue,
    min = 0,
    max = 100,
    step = 1,
    label,
    hideLabel = false,
    className,
    style,
    name,
    form,
    onChange,
    onBlur,
    range: _range,
    value: _value,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    ...rest
  } = props
  const t = useDiyaMessages('slider', sliderMessages)
  const range = props.range === true
  const lowest = numberOr(min, 0)
  const highest = Math.max(lowest + Number.EPSILON, numberOr(max, 100))
  const span = highest - lowest
  const rawStep = numberOr(step, 1)
  const increment = rawStep > 0 ? Math.min(rawStep, span) : 1
  const decimals = Math.max(decimalsOf(increment), decimalsOf(lowest))
  const clamp = (value: number) => Math.max(lowest, Math.min(highest, value))
  const snap = (value: number) => clamp(Number((Math.round((value - lowest) / increment) * increment + lowest).toFixed(decimals)))
  const first = useRef<HTMLInputElement | null>(null)
  const second = useRef<HTMLInputElement | null>(null)
  const firstRef = useMergedRef(ref, first)
  const controlled = props.value !== undefined
  const fallback: [number, number] = props.range ? props.defaultValue ?? [lowest, highest] : [props.defaultValue ?? lowest, props.defaultValue ?? lowest]
  const readDom = (): [number, number] | undefined => {
    if (!first.current) return undefined
    const start = Number(first.current.value)
    return [start, range && second.current ? Number(second.current.value) : start]
  }
  const [current, sync] = useNativeMirror(readDom, fallback, samePair)
  useFormReset(first, sync)
  // Internally the slider always tracks [low, high]; a single value is [value, value].
  const value: [number, number] = controlled ? props.range ? props.value ?? fallback : [props.value ?? lowest, props.value ?? lowest] : current
  const report = (next: [number, number]) => props.range ? props.onValueChange?.(next) : props.onValueChange?.(next[0])
  const low = Number.isFinite(value[0]) ? clamp(value[0]) : lowest
  const high = Number.isFinite(value[1]) ? Math.max(low, clamp(value[1])) : low
  const percent = (number: number) => `${((number - lowest) / span) * 100}%`
  const marks = Array.from({ length: 5 }, (_, index) => Number((lowest + (span * index) / 4).toFixed(Math.max(decimals, 2))))
  const shared = { name, form, disabled, onBlur }
  const show = (number: number) => (formatValue ? formatValue(number) : String(number))
  return (
    <div className={cx('diya-slider', className)} style={style} data-disabled={disabled}>
      {/* The inputs carry the accessible name; this is the visible label. */}
      {!hideLabel && <span className="diya-slider-label" aria-hidden="true">{label}</span>}
      {showValues && (
        <div className="diya-slider-values" aria-hidden="true">
          <span>{show(range ? low : lowest)}</span>
          <span>{show(range ? high : low)}</span>
        </div>
      )}
      <div
        className="diya-slider-inputs"
        onPointerDown={(event) => {
          if (disabled || event.target instanceof HTMLInputElement) return
          const box = event.currentTarget.getBoundingClientRect()
          const clicked = snap(lowest + ((event.clientX - box.left - 9) / (box.width - 18)) * span)
          const target = range && Math.abs(clicked - high) < Math.abs(clicked - low) ? second.current : first.current
          if (!target) return
          // Moves the handle through the input itself, so onChange and form libraries see it.
          setNativeValue(target, String(clicked))
          target.focus()
        }}
        style={
          {
            '--diya-internal-slider-start': percent(range ? low : lowest),
            '--diya-internal-slider-end': percent(range ? high : low),
          } as CSSProperties
        }
      >
        <div className="diya-slider-rail" aria-hidden="true">
          <span />
        </div>
        <input
          {...rest}
          {...shared}
          ref={firstRef}
          type="range"
          min={lowest}
          max={highest}
          step={increment}
          {...(controlled ? { value: low } : { defaultValue: fallback[0] })}
          aria-label={range ? t.minimum(label) : label}
          aria-valuemax={range ? high : undefined}
          aria-valuetext={formatValue ? formatValue(low) : rest['aria-valuetext']}
          onChange={(event) => {
            const pair = controlled ? [low, high] : readDom() ?? [low, high]
            let start = Number(event.target.value)
            // The handles cannot cross.
            if (range && start > pair[1]) {
              start = pair[1]
              if (!controlled) event.target.value = String(start)
            }
            onChange?.(event)
            if (!controlled) sync()
            report([start, range ? pair[1] : start])
          }}
        />
        {range && (
          <input
            {...shared}
            ref={second}
            type="range"
            min={lowest}
            max={highest}
            step={increment}
            {...(controlled ? { value: high } : { defaultValue: fallback[1] })}
            aria-label={t.maximum(label)}
            aria-valuemin={low}
            aria-valuetext={formatValue ? formatValue(high) : undefined}
            onChange={(event) => {
              const pair = controlled ? [low, high] : readDom() ?? [low, high]
              let end = Number(event.target.value)
              if (end < pair[0]) {
                end = pair[0]
                if (!controlled) event.target.value = String(end)
              }
              onChange?.(event)
              if (!controlled) sync()
              report([pair[0], end])
            }}
          />
        )}
      </div>
      {showMarks && (
        <div className="diya-slider-marks" aria-hidden="true">
          {marks.map((mark) => (
            <span key={mark}>{show(mark)}</span>
          ))}
        </div>
      )}
    </div>
  )
})

'use client'
import { forwardRef, useMemo, useRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../internal/cx.js'
import { markField, renderDescription, useErrorAnnouncement, useFieldIds, useShownError } from '../internal/field-parts.js'
import { useClientLayoutEffect } from '../internal/layout-effect.js'
import { composeRefs } from '../internal/slot.js'

/** Native checkbox attributes, including `name`, `required`, `onChange`, `onBlur` and the ref, go on the input; `className` and `style` go on the outer field wrapper. */
export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'size' | 'value' | 'checked' | 'defaultChecked' | 'children'> & {
  /** Whether the box is checked, when controlled; pair it with `onCheckedChange`. */
  checked?: boolean
  /** Whether the box starts checked when uncontrolled; a form reset returns to it. */
  defaultChecked?: boolean
  /** Called with the new checked state when the box is toggled. */
  onCheckedChange?: (checked: boolean) => void
  /** Shows a dash for "some chosen" and is announced as mixed; `checked` is set aside while it's on, so a click reports true. Use it for a box that chooses all of a list of your own. Defaults to false. */
  indeterminate?: boolean
  /** The value sent with the form under `name` while the box is checked; defaults to "on", like a native checkbox. */
  value?: string
  /** Visible statement beside the box, in the reader's voice ("I agree to the Terms"); also its accessible name. It can hold inline TextLinks, which open without toggling the box. Hide it with hideLabel. */
  label: ReactNode
  /** Visible hint below the label, announced with the box; `error` replaces it while set. */
  helperText?: string
  /** Visible error message below the label; marks the box invalid while set. */
  error?: string
  /** Hides the label visually but keeps it as the box's accessible name. */
  hideLabel?: boolean
  /** Prevents toggling and dims the field. */
  disabled?: boolean
  /** Box and type size; defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
}
/** A lone yes-or-no box sent with a form, such as agreeing to terms, with a label and optional helper text or error. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ checked, defaultChecked, onCheckedChange, onChange, indeterminate = false, value = 'on', label, helperText, error, hideLabel = false, disabled = false, size = 'medium', id, className, style, 'aria-describedby': describedBy, ...props }, ref) {
  const { id: inputId, descriptionId } = useFieldIds(id, 'description')
  const wrapper = useRef<HTMLDivElement | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const labelRef = useRef<HTMLLabelElement | null>(null)
  const setInput = useMemo(() => composeRefs<HTMLInputElement>(input, ref), [ref])
  const shown = useShownError(error, wrapper)
  useErrorAnnouncement(() => labelRef.current?.textContent?.trim() ?? '', shown, wrapper)
  const description = shown || helperText
  // Mixed: the property is what assistive tech reads ("mixed", "half checked"); the look keys off
  // data-indeterminate, which is in the server HTML, so nothing grows in at hydration (MOT-1.2-05).
  // While mixed the box is unchecked, so the next click reports true.
  useClientLayoutEffect(() => {
    const node = input.current
    if (!node) return
    node.indeterminate = indeterminate
    if (indeterminate) node.checked = false
  }, [indeterminate])
  const state = checked !== undefined ? { checked: indeterminate ? false : checked } : { defaultChecked: indeterminate ? false : defaultChecked }
  return <div ref={wrapper} className={cx('diya-checkbox-field', className)} style={style} data-size={size} data-disabled={disabled || undefined} data-invalid={!!shown || undefined}>
    <input {...props} ref={setInput} id={inputId} type="checkbox" className="diya-checkbox" value={value} {...state}
      data-indeterminate={indeterminate ? 'true' : undefined}
      aria-describedby={[describedBy, description ? descriptionId : undefined].filter(Boolean).join(' ') || undefined}
      aria-invalid={shown ? true : props['aria-invalid']} disabled={disabled}
      onChange={(event) => { onChange?.(event); onCheckedChange?.(event.target.checked) }} />
    <div><label ref={labelRef} htmlFor={inputId} className={hideLabel ? 'diya-sr-only' : 'diya-checkbox-label'}>{label}</label>{renderDescription({ id: descriptionId, className: 'diya-text-field-description', error: shown, helperText })}</div>
  </div>
})
// Field warns when it wraps one of DIYA's own fields, which have their own label.
markField(Checkbox, 'Checkbox')

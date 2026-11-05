'use client'
import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cx } from '../internal/cx.js'
/** Native checkbox attributes, including `name`, `onChange`, `onBlur` and the ref, go on the switch input; `className` and `style` go on the outer field wrapper. */
export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'size' | 'value' | 'checked' | 'defaultChecked' | 'children'> & {
  /** Whether the switch is on, when controlled; pair it with `onCheckedChange`. */
  checked?: boolean
  /** Whether the switch starts on when uncontrolled; a form reset returns to it. */
  defaultChecked?: boolean
  /** Called with the new on/off state when the switch is toggled. */
  onCheckedChange?: (checked: boolean) => void
  /** The value sent with the form under `name` while the switch is on; defaults to "on", like a checkbox. */
  value?: string
  /** Visible label beside the switch; also its accessible name. Hide it with hideLabel. */
  label: string
  /** Visible hint below the label, announced with the switch; `error` replaces it while set. */
  helperText?: string
  /** Visible error message below the label; marks the switch invalid while set. */
  error?: string
  /** Hides the label visually but keeps it as the switch's accessible name. */
  hideLabel?: boolean
  /** Prevents toggling and dims the switch. */
  disabled?: boolean
  /** Track and thumb size; defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
}
/** An on/off toggle (a native checkbox with role="switch") with a label and optional helper text or error. */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch({ checked, defaultChecked, onCheckedChange, onChange, onKeyDown, label, helperText, error, hideLabel = false, disabled = false, size = 'medium', id, className, style, 'aria-describedby': describedBy, ...props }, ref) {
  const description = error || helperText
  const generatedId = useId()
  const inputId = id ?? generatedId
  return <div className={cx('diya-switch-field', className)} style={style} data-size={size} data-disabled={disabled}>
    <input {...props} ref={ref} id={inputId} type="checkbox" role="switch" className="diya-switch"
      {...(checked !== undefined ? { checked } : { defaultChecked })}
      aria-describedby={[describedBy, description ? `${inputId}-description` : undefined].filter(Boolean).join(' ') || undefined}
      aria-invalid={error ? true : props['aria-invalid']} disabled={disabled}
      onChange={(event) => { onChange?.(event); onCheckedChange?.(event.target.checked) }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        // A switch toggles with Enter as well as Space.
        if (event.key === 'Enter' && !event.defaultPrevented && !disabled) { event.preventDefault(); event.currentTarget.click() }
      }} />
    <div><label htmlFor={inputId} className={hideLabel ? 'diya-sr-only' : 'diya-switch-label'}>{label}</label>{description && <p id={`${inputId}-description`} className="diya-switch-description" data-invalid={error ? true : undefined}>{error && <span aria-hidden="true">!</span>}{description}</p>}</div>
  </div>
})

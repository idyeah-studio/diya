'use client'
import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { selectMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    select: typeof selectMessages
  }
}
export type SelectOption = {
  /** The value reported when this option is chosen; unique within the list. */
  value: string
  /** Visible option text. */
  label: string
  /** Shows the option but stops it being chosen. */
  disabled?: boolean
}
/** A native single select. Native attributes, including `name`, `onChange(event)`, `onBlur` and the ref, go on the select; `className` and `style` go on the outer field wrapper. */
export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'size' | 'children' | 'multiple' | 'value' | 'defaultValue'
> & {
  /** Visible label above the select; also its accessible name. Hide it with hideLabel. */
  label: string
  /** Hides the label visually but keeps it as the select's accessible name. */
  hideLabel?: boolean
  /** Visible hint below the select, announced with it; `error` replaces it while set. */
  helperText?: string
  /** Visible error message below the select; marks the field invalid while set. */
  error?: string
  /** Control height and type size; defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** Visible text of the empty, unselectable first option, shown while value is ''; defaults to the `select.placeholder` message. */
  placeholder?: string
  /** Decorative icon inside the select's start edge; hidden from assistive tech. */
  leadingIcon?: ReactNode
  /** The chosen option's value, or '' for none, when controlled; pair it with `onValueChange`. */
  value?: string
  /** The initially chosen value when uncontrolled; defaults to '' (the placeholder), and a form reset returns to it. */
  defaultValue?: string
  /** The choices, in display order. */
  options: SelectOption[]
  /** Called with the chosen option's value, like every other DIYA field. The native `onChange` still works. */
  onValueChange?: (value: string) => void
}
/** A labeled native dropdown for choosing one option; pair `value` with `onValueChange`. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({
  label,
  hideLabel = false,
  helperText,
  error,
  size = 'medium',
  placeholder,
  leadingIcon,
  options,
  id,
  disabled,
  className,
  style,
  value,
  defaultValue,
  onChange,
  onValueChange,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
  ...props
}, ref) {
  const generated = useId()
  const t = useDiyaMessages('select', selectMessages)
  const fieldId = id ?? generated
  const description = error || helperText
  const descriptionId = `${fieldId}-description`
  return (
    <div
      className={cx('diya-text-field diya-select-field', className)}
      style={style}
      data-size={size}
      data-disabled={disabled || undefined}
      data-invalid={!!error || undefined}
    >
      <label htmlFor={fieldId} className={hideLabel ? 'diya-sr-only' : undefined}>
        {label}
      </label>
      <div className="diya-select-control">
        {leadingIcon && (
          <span className="diya-select-leading" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <select
          {...props}
          ref={ref}
          id={fieldId}
          {...(value !== undefined ? { value } : { defaultValue: defaultValue ?? '' })}
          disabled={disabled}
          onChange={(event) => {
            onChange?.(event)
            onValueChange?.(event.target.value)
          }}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={
            [describedBy, description ? descriptionId : undefined].filter(Boolean).join(' ') ||
            undefined
          }
        >
          <option value="" disabled>
            {placeholder ?? t.placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="diya-select-chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      {description && (
        <p id={descriptionId} className="diya-text-field-description">
          {error && <span aria-hidden="true">!</span>}
          {description}
        </p>
      )}
    </div>
  )
})

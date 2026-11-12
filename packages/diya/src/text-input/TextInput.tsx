'use client'
import { forwardRef, useRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { markField, renderDescription, useErrorAnnouncement, useFieldIds, useShownError } from '../internal/field-parts.js'
import { Icon } from '../Icon.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { textInputMessages } from './messages.js'
import { setNativeValue, useFormReset, useMergedRef, useNativeMirror } from './native-field.js'

declare module '../messages.js' {
  interface DiyaMessages {
    textInput: typeof textInputMessages
  }
}
/** Native input attributes, including `name`, `onChange`, `onBlur` and the ref, go on the input; `className` and `style` go on the outer field wrapper. */
export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'value' | 'defaultValue'
> & {
  /** Visible label above the input; also its accessible name. Hide it with hideLabel. */
  label: string
  /** Hides the label visually but keeps it as the input's accessible name. */
  hideLabel?: boolean
  /** Visible hint below the input, announced with it; `error` replaces it while set. */
  helperText?: string
  /** Visible error message below the input; marks the field invalid while set. */
  error?: string
  /** Control height and type size; defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** Decorative icon inside the input's start edge; hidden from assistive tech. */
  leadingIcon?: ReactNode
  /** Shows a clear button while there is text; it empties the value and refocuses the input. */
  clearable?: boolean
  /** The current text when controlled; pair it with `onValueChange`. */
  value?: string
  /** The starting text when uncontrolled; a form reset returns to it. */
  defaultValue?: string
  /** Called with the new text on every edit and when cleared. */
  onValueChange?: (value: string) => void
}
/** A single-line labeled text field with optional helper text, error, icon and clear button. */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput({
  label,
  hideLabel = false,
  helperText,
  error,
  size = 'medium',
  leadingIcon,
  clearable = false,
  value,
  defaultValue,
  onValueChange,
  onChange,
  id,
  disabled,
  readOnly,
  className,
  style,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
  ...props
}, ref) {
  const { id: inputId, descriptionId } = useFieldIds(id, 'description')
  const wrapper = useRef<HTMLDivElement | null>(null)
  const shown = useShownError(error, wrapper)
  useErrorAnnouncement(label, shown, wrapper)
  const description = shown || helperText
  const input = useRef<HTMLInputElement | null>(null)
  const inputRef = useMergedRef(ref, input)
  const controlled = value !== undefined
  const [current, sync] = useNativeMirror(() => input.current?.value, value ?? defaultValue ?? '')
  useFormReset(input, sync)
  const text = controlled ? value : current
  const t = useDiyaMessages('textInput', textInputMessages)
  return (
    <div
      ref={wrapper}
      className={cx('diya-text-field', className)}
      style={style}
      data-size={size}
      data-disabled={disabled || undefined}
      data-invalid={!!shown || undefined}
    >
      <label htmlFor={inputId} className={hideLabel ? 'diya-sr-only' : undefined}>
        {label}
      </label>
      <div className="diya-text-field-control">
        {leadingIcon && (
          <span className="diya-text-field-leading" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          {...props}
          ref={inputRef}
          id={inputId}
          {...(controlled ? { value } : { defaultValue })}
          onChange={(event) => {
            onChange?.(event)
            if (!controlled) sync()
            onValueChange?.(event.target.value)
          }}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={shown ? true : ariaInvalid}
          aria-describedby={
            [describedBy, description ? descriptionId : undefined].filter(Boolean).join(' ') ||
            undefined
          }
        />
        {clearable && text.length > 0 && (
          <button
            type="button"
            className="diya-text-field-clear"
            aria-label={t.clear(label)}
            disabled={disabled || readOnly || !text}
            onClick={() => {
              if (!input.current) return
              // Clearing goes through the input itself, so onChange and form libraries see it.
              setNativeValue(input.current, '')
              input.current.focus()
            }}
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
      {renderDescription({ id: descriptionId, className: 'diya-text-field-description', error: shown, helperText })}
    </div>
  )
})
// Field warns when it wraps one of DIYA's own fields, which have their own label.
markField(TextInput, 'TextInput')

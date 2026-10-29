'use client'
import { forwardRef, useId, useRef, type TextareaHTMLAttributes } from 'react'
import { cx } from '../internal/cx.js'
import { useFormReset, useMergedRef, useNativeMirror } from '../text-input/native-field.js'
/** Native textarea attributes, including `name`, `onChange`, `onBlur` and the ref, go on the textarea; `className` and `style` go on the outer field wrapper. */
export type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue'> & {
  /** Visible label above the textarea; also its accessible name. Hide it with hideLabel. */
  label: string
  /** Hides the label visually but keeps it as the textarea's accessible name. */
  hideLabel?: boolean
  /** Visible hint below the textarea, announced with it; `error` replaces it while set. */
  helperText?: string
  /** Visible error message below the textarea; marks the field invalid while set. */
  error?: string
  /** Type size and padding; defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** The current text when controlled; pair it with `onValueChange`. */
  value?: string
  /** The starting text when uncontrolled; a form reset returns to it. */
  defaultValue?: string
  /** Called with the new text on every edit. */
  onValueChange?: (value: string) => void
  /** Shows a visible character count below the textarea, as "n / maxLength" when maxLength is set. */
  showCount?: boolean
  /** Lets people drag the textarea taller; defaults to true. */
  resizable?: boolean
}
/** A multi-line labelled text field with optional helper text, error and character count. */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ label, hideLabel, helperText, error, size = 'medium', value, defaultValue, onValueChange, onChange, showCount, resizable = true, id, maxLength, className, style, 'aria-invalid': ariaInvalid, 'aria-describedby': describedBy, ...props }, ref) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const description = error || helperText
  const textarea = useRef<HTMLTextAreaElement | null>(null)
  const textareaRef = useMergedRef(ref, textarea)
  const controlled = value !== undefined
  const [current, sync] = useNativeMirror(() => textarea.current?.value, value ?? defaultValue ?? '')
  useFormReset(textarea, sync)
  const text = controlled ? value : current
  return <div className={cx('diya-text-field diya-textarea', className)} style={style} data-size={size} data-invalid={!!error} data-disabled={props.disabled}>
    <label htmlFor={inputId} className={hideLabel ? 'diya-sr-only' : undefined}>{label}</label>
    <textarea {...props} ref={textareaRef} id={inputId} {...(controlled ? { value } : { defaultValue })} maxLength={maxLength} onChange={(event) => { onChange?.(event); if (!controlled) sync(); onValueChange?.(event.target.value) }} aria-invalid={error ? true : ariaInvalid} aria-describedby={[describedBy, description ? `${inputId}-description` : undefined, showCount ? `${inputId}-count` : undefined].filter(Boolean).join(' ') || undefined} style={{ resize: resizable ? 'vertical' : 'none' }} />
    <div className="diya-textarea-footer">{description && <p className="diya-text-field-description" id={`${inputId}-description`}>{error && <span aria-hidden="true">!</span>}{description}</p>}{showCount && <span className="diya-textarea-count" id={`${inputId}-count`}>{text.length}{maxLength ? ` / ${maxLength}` : ''}</span>}</div>
  </div>
})

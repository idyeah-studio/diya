'use client'
import { forwardRef, useId, useRef, type ChangeEventHandler, type FieldsetHTMLAttributes, type FocusEventHandler, type ReactNode } from 'react'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { useFormReset, useNativeMirror } from '../text-input/native-field.js'
import { choiceMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    choice: typeof choiceMessages
  }
}
export type ChoiceOption = {
  /** The value reported when this option is chosen; unique within the group. */
  value: string
  /** Visible option text beside the radio or checkbox: a string, or a node such as text with links ("I agree to the <a>Terms</a>") or a color swatch before a name. A link inside opens without toggling the option, and the option is named by the label's text, so give a swatch `aria-hidden` and visible words. */
  label: ReactNode
  /** Visible secondary line under the label, announced as the option's description; shown whenever present. */
  description?: string
  /** Shows the option but stops it being chosen. */
  disabled?: boolean
}
type ChoiceBase = Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange' | 'onBlur' | 'defaultValue' | 'name' | 'disabled' | 'children'> & {
  /** Visible group label (the fieldset legend); also names the group for assistive tech. Hide it with hideLabel. */
  label: string
  /** The choices, in display order. */
  options: ChoiceOption[]
  /** Control and type size; defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** Hides the group label visually but keeps it as the group's accessible name. */
  hideLabel?: boolean
  /** Disables every option in the group. */
  disabled?: boolean
  /** Visible hint below the options, announced with the group; `error` replaces it while set. */
  helperText?: string
  /** Visible error message below the options; marks the group invalid while set. */
  error?: string
  /** Form field name shared by the inputs; defaults to a generated id. */
  name?: string
  /** Native change event from the radio or checkbox that changed, as react-hook-form's register() expects; `onValueChange` still fires. */
  onChange?: ChangeEventHandler<HTMLInputElement>
  /** Called when one of the inputs loses focus. */
  onBlur?: FocusEventHandler<HTMLInputElement>
  /** Asks the browser to require a choice before the form submits; radios only. */
  required?: boolean
}
/** Radios: one value. */
export type ChoiceSingleProps = ChoiceBase & {
  /** Single mode (the default): radios, leave unset or false. */
  multiple?: false
  /** The chosen option's value, or '' for none, when controlled; pair it with `onValueChange`. */
  value?: string
  /** The initially chosen value when uncontrolled; a form reset returns to it. */
  defaultValue?: string
  /** Called with the chosen option's value. */
  onValueChange?: (value: string) => void
  /** Only for `multiple`. */
  selectAll?: never
}
/** Checkboxes: an array of values, with an optional "Select all". */
export type ChoiceMultipleProps = ChoiceBase & {
  /** Multiple mode: checkboxes, any number chosen. */
  multiple: true
  /** The chosen options' values, when controlled; pair it with `onValueChange`. */
  value?: string[]
  /** The initially chosen values when uncontrolled; a form reset returns to them. */
  defaultValue?: string[]
  /** Called with the full new array of chosen values. */
  onValueChange?: (value: string[]) => void
  /** Adds a visible "Select all" checkbox first that toggles every enabled option and shows a mixed state when some are chosen. */
  selectAll?: boolean
}
/** Radios by default (one string); `multiple` gives checkboxes and an array. */
export type ChoiceProps = ChoiceSingleProps | ChoiceMultipleProps
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((value, index) => value === b[index])
/** A labeled group of radios for one choice, or checkboxes for several with `multiple`. The ref reaches the inputs: a callback ref gets each one, an object ref the first. */
export const Choice = forwardRef<HTMLInputElement, ChoiceProps>(function Choice(props, ref) {
  const id = useId()
  const t = useDiyaMessages('choice', choiceMessages)
  const {
    label,
    options,
    size = 'medium',
    hideLabel = false,
    disabled = false,
    helperText,
    error,
    name = id,
    onChange,
    onBlur,
    required,
    className,
    multiple: _multiple,
    value: _value,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    selectAll: _selectAll,
    'aria-describedby': describedBy,
    ...rest
  } = props
  const multiple = props.multiple === true
  const description = error || helperText
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const first = useRef<HTMLInputElement | null>(null)
  const controlled = props.value !== undefined
  const fromDom = () => inputs.current.filter((input): input is HTMLInputElement => !!input?.checked).map((input) => input.value)
  const initial = props.multiple === true ? props.value ?? props.defaultValue ?? [] : (props.value ?? props.defaultValue) ? [props.value ?? props.defaultValue ?? ''] : []
  const [current, sync] = useNativeMirror(() => inputs.current.some(Boolean) ? fromDom() : undefined, initial, sameList)
  useFormReset(first, sync)
  // Internally a selection is always a list; the public value matches the mode.
  const selected = controlled ? props.multiple === true ? props.value ?? [] : props.value ? [props.value] : [] : current
  const report = (next: string[]) => props.multiple === true ? props.onValueChange?.(next) : props.onValueChange?.(next[0] ?? '')
  const enabled = options.filter((option) => !option.disabled)
  const allChosen = enabled.length > 0 && enabled.every((option) => selected.includes(option.value))
  const someChosen = enabled.some((option) => selected.includes(option.value))
  function attach(index: number) {
    return (node: HTMLInputElement | null) => {
      inputs.current[index] = node
      if (index === 0) first.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref && index === 0) ref.current = node
    }
  }
  function toggleAll(on: boolean) {
    const values = enabled.map((option) => option.value)
    if (controlled) {
      report(on ? Array.from(new Set([...selected, ...values])) : selected.filter((value) => !values.includes(value)))
      return
    }
    // Uncontrolled: set the boxes, then click the last one so onChange (and any form library) sees one real change.
    const changing = inputs.current.filter((input): input is HTMLInputElement => !!input && !input.disabled && values.includes(input.value) && input.checked !== on)
    const last = changing.pop()
    for (const input of changing) input.checked = on
    last?.click()
  }
  return (
    <fieldset
      {...rest}
      className={cx('diya-choice', className)}
      data-size={size}
      disabled={disabled}
      aria-invalid={error ? true : props['aria-invalid']}
      aria-describedby={[describedBy, description ? `${id}-help` : undefined].filter(Boolean).join(' ') || undefined}
    >
      <legend className={hideLabel ? 'diya-sr-only' : undefined}>{label}</legend>
      <div className="diya-choice-items">
        {multiple && props.selectAll && <label className="diya-choice-option">
          <input type="checkbox" aria-label={t.selectAll} disabled={disabled || !enabled.length}
            ref={node => { if (node) node.indeterminate = someChosen && !allChosen }}
            checked={allChosen}
            onChange={event => toggleAll(event.target.checked)} />
          <span className="diya-choice-label">{t.selectAll}</span>
        </label>}
        {options.map((option, index) => (
          <label
            key={option.value}
            className="diya-choice-option"
            data-disabled={disabled || option.disabled || undefined}
          >
            <input
              ref={attach(index)}
              type={multiple ? 'checkbox' : 'radio'}
              name={name}
              value={option.value}
              disabled={option.disabled}
              required={!multiple ? required : undefined}
              {...(controlled
                ? { checked: selected.includes(option.value) }
                : { defaultChecked: initial.includes(option.value) })}
              aria-describedby={
                option.description ? `${id}-option-${index}-description` : undefined
              }
              onBlur={onBlur}
              onChange={(event) => {
                onChange?.(event)
                if (!controlled) { sync(); report(fromDom()); return }
                if (!multiple) report([option.value])
                else report(event.target.checked ? [...selected, option.value] : selected.filter((value) => value !== option.value))
              }}
            />
            <span>
              <span className="diya-choice-label">{option.label}</span>
              {option.description && (
                <span className="diya-choice-description" id={`${id}-option-${index}-description`}>
                  {option.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      {description && (
        <p id={`${id}-help`} className="diya-text-field-description">
          {error && <span aria-hidden="true">!</span>}
          {description}
        </p>
      )}
    </fieldset>
  )
})

'use client'
import { forwardRef, useEffect, useId, useMemo, useRef, useState, type InputHTMLAttributes } from 'react'
import { useClientLayoutEffect } from '../internal/layout-effect.js'
import { usePresence } from '../internal/presence.js'
import { createPortal } from 'react-dom'
import { Icon } from '../Icon.js'
import { useAnchoredPopover } from './useAnchoredPopover.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { useFormReset, useMergedRef } from '../text-input/native-field.js'
import { comboboxMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    combobox: typeof comboboxMessages
  }
}

export type ComboboxOption = {
  /** The value reported when this option is chosen; unique within the list. */
  value: string
  /** Visible option text; typing filters options by it. */
  label: string
  /** Shows the option but stops it being chosen. */
  disabled?: boolean
}
type ComboboxBase = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'size' | 'type' | 'role' | 'multiple' | 'disabled' | 'name' | 'children'> & {
  /** Visible label above the field; also names the input and the option list for assistive tech. Hide it with hideLabel. */
  label: string
  /** The choices, in display order; typing filters them by label. */
  options: ComboboxOption[]
  /** Prevents typing and choosing, and dims the field. */
  disabled?: boolean
  /** Visible error message below the field; marks it invalid while set. */
  error?: string
  /** Visible hint below the field, announced with it; `error` replaces it while set. */
  helperText?: string
  /** Hides the label visually but keeps it as the input's accessible name. */
  hideLabel?: boolean
  /** Control height and type size; defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** Form field name: the chosen value, or each chosen value in `multiple` mode, is sent with the form under it. */
  name?: string
}
/** One option: a string, '' for none. */
export type ComboboxSingleProps = ComboboxBase & {
  /** Single mode (the default): leave unset or false. Choosing an option closes the list. */
  multiple?: false
  /** The chosen option's value, or '' for none, when controlled; pair it with `onValueChange`. */
  value?: string
  /** The initially chosen value when uncontrolled; a form reset returns to it. */
  defaultValue?: string
  /** Called with the chosen option's value. */
  onValueChange?: (value: string) => void
}
/** Several options: an array of values. */
export type ComboboxMultipleProps = ComboboxBase & {
  /** Multiple mode: choices show as removable chips, choosing toggles an option and the list stays open. */
  multiple: true
  /** The chosen options' values, in the order they were picked, when controlled; pair it with `onValueChange`. */
  value?: string[]
  /** The initially chosen values when uncontrolled; a form reset returns to them. */
  defaultValue?: string[]
  /** Called with the full new array of chosen values. */
  onValueChange?: (value: string[]) => void
}
/** One option is a string ('' for none); `multiple` takes and returns an array. Native input attributes and the ref go on the text input; `className` and `style` go on the outer field wrapper. */
export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps

/** A labeled text field that filters a list of options as you type; picks one value, or several with `multiple`. */
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(props, ref) {
  const {
    label, options, disabled = false, error, helperText, hideLabel = false, size = 'medium', name, className, style, id: idProp,
    placeholder, onChange: onInputChange, onClick: onInputClick, onKeyDown: onInputKeyDown, 'aria-describedby': describedBy,
    multiple: _multiple, value: _value, defaultValue: _defaultValue, onValueChange: _onValueChange, ...rest
  } = props
  const t = useDiyaMessages('combobox', comboboxMessages)
  const multiple = props.multiple === true
  const controlled = props.value !== undefined
  const initial = () => props.multiple ? props.defaultValue ?? [] : props.defaultValue ? [props.defaultValue] : []
  const [uncontrolled, setUncontrolled] = useState<string[]>(initial)
  // Internally a selection is always a list; the public value matches the mode.
  const value = useMemo(() => !controlled ? uncontrolled : props.multiple ? props.value ?? [] : props.value ? [props.value] : [], [controlled, uncontrolled, props.multiple, props.value])
  const onChange = (next: string[]) => {
    if (!controlled) setUncontrolled(next)
    if (props.multiple) props.onValueChange?.(next)
    else props.onValueChange?.(next[0] ?? '')
  }
  const generatedId = useId()
  const id = idProp ?? generatedId
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [revealRequest, setRevealRequest] = useState(0)
  const keyboardNavigation = useRef(true)
  const field = useRef<HTMLDivElement | null>(null)
  const control = useRef<HTMLDivElement | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const inputRef = useMergedRef(ref, input)
  useFormReset(input, () => { if (!controlled) setUncontrolled(initial()) })
  const panel = useRef<HTMLUListElement | null>(null)
  const filtered = useMemo(() => options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())), [options, query])
  const enabled = filtered.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0)
  const activeIndex = filtered[active] && !filtered[active].disabled ? active : enabled[0] ?? -1
  const isOpen = open && !disabled
  const popupContent = useMemo(() => ({ filtered, value, size }), [filtered, value, size])
  const portal = useAnchoredPopover(isOpen, control, panel, 'anchor', popupContent)
  // Closes the reader didn't cause in place (a scroll, a resize, being disabled) skip the exit.
  const quiet = useRef(false)
  const { present, closing } = usePresence(isOpen, panel, quiet.current || disabled)
  // While the list leaves, it keeps showing what it showed, not every option again.
  const shown = useRef(filtered)
  if (isOpen) shown.current = filtered
  const rows = isOpen ? filtered : shown.current

  function revealActive() {
    keyboardNavigation.current = true
    // A boundary key must still reveal its option after the list was scrolled manually.
    setRevealRequest(previous => previous + 1)
  }
  useClientLayoutEffect(() => {
    const list = panel.current
    const option = list?.querySelector<HTMLElement>('[data-active="true"]')
    if (!keyboardNavigation.current || !isOpen || !list || !option || !list.clientHeight) return
    // The anchoring hook runs first, including showing a native popover. Scroll only
    // this list: scrollIntoView could move the host page and dismiss the popup. Layout
    // offsets, not rectangles, which are smaller while the list scales in.
    const top = option.offsetTop
    const height = option.offsetHeight
    if (top < list.scrollTop || height > list.clientHeight) list.scrollTop = top
    else if (top + height > list.scrollTop + list.clientHeight) list.scrollTop = top + height - list.clientHeight
  }, [isOpen, activeIndex, filtered, portal, size, revealRequest])

  function close(quietly = false) { quiet.current = quietly; setOpen(false); setQuery(''); setActive(-1) }
  useEffect(() => { if (disabled) close() }, [disabled])
  useEffect(() => {
    if (!isOpen) return
    const outside = (event: Event) => {
      if (!field.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) close()
    }
    const resize = () => close(true)
    const scroll = (event: Event) => { if (!panel.current?.contains(event.target as Node)) close(true) }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [isOpen])
  function choose(option: ComboboxOption) {
    if (disabled || option.disabled) return
    onChange(multiple ? value.includes(option.value) ? value.filter((entry) => entry !== option.value) : [...value, option.value] : [option.value])
    setQuery('')
    setActive(options.findIndex((entry) => entry.value === option.value && !entry.disabled))
    input.current?.focus()
    if (!multiple) setOpen(false)
  }

  return <div ref={field} className={cx('diya-combobox', className)} style={style} data-size={size} data-invalid={!!error} onBlur={(event) => {
    const next = event.relatedTarget as Node | null
    if (!field.current?.contains(next) && !panel.current?.contains(next)) close()
  }}>
    <label htmlFor={id} className={hideLabel ? 'diya-sr-only' : ''}>{label}</label>
    {name && (multiple ? value : [value[0] ?? '']).map((entry, index) => <input key={`${index}-${entry}`} type="hidden" name={name} value={entry} disabled={disabled} />)}
    <div ref={control} className="diya-combobox-control">
      {multiple && value.map((entry) => <span className="diya-combobox-chip" key={entry}>
        {options.find((option) => option.value === entry)?.label}
        <button type="button" disabled={disabled} aria-label={t.remove(options.find((option) => option.value === entry)?.label ?? entry)} onClick={() => { if (!disabled) { input.current?.focus(); onChange(value.filter((item) => item !== entry)) } }}>×</button>
      </span>)}
      <input {...rest} ref={inputRef} id={id} role="combobox" aria-expanded={isOpen} aria-controls={isOpen ? `${id}-options` : undefined} aria-autocomplete="list"
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        aria-invalid={!!error} aria-describedby={[describedBy, error || helperText ? `${id}-help` : undefined].filter(Boolean).join(' ') || undefined} disabled={disabled}
        placeholder={placeholder ?? (multiple && value.length ? t.addAnother : t.placeholder)}
        value={!multiple && !isOpen && value.length ? options.find((option) => option.value === value[0])?.label || '' : query}
        onClick={(event) => { onInputClick?.(event); if (!disabled && !event.defaultPrevented) { revealActive(); setOpen(true); setActive(enabled[0] ?? -1) } }}
        onChange={(event) => {
          onInputChange?.(event)
          const next = event.target.value
          revealActive()
          setQuery(next)
          setActive(options.filter((option) => option.label.toLowerCase().includes(next.toLowerCase())).findIndex((option) => !option.disabled))
          setOpen(true)
        }}
        onKeyDown={(event) => {
          onInputKeyDown?.(event)
          if (disabled || event.defaultPrevented || event.nativeEvent.isComposing) return
          if (event.key === 'Escape' && isOpen) { event.preventDefault(); event.stopPropagation(); close(); return }
          if (event.key === 'Backspace' && multiple && !query && value.length) onChange(value.slice(0, -1))
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            revealActive()
            setOpen(true)
            if (!isOpen) { setActive(event.key === 'ArrowDown' ? enabled[0] ?? -1 : enabled[enabled.length - 1] ?? -1); return }
            const position = enabled.indexOf(activeIndex)
            const next = position + (event.key === 'ArrowDown' ? 1 : -1)
            setActive(enabled[next] ?? activeIndex)
          }
          if (event.key === 'Enter' && isOpen && activeIndex >= 0) { event.preventDefault(); choose(filtered[activeIndex]) }
        }} />
      <button type="button" className="diya-combobox-toggle" disabled={disabled} tabIndex={-1} aria-label={isOpen ? t.closeOptions : t.openOptions}
        onMouseDown={(event) => event.preventDefault()} onClick={() => {
          if (disabled) return
          revealActive()
          input.current?.focus()
          setQuery('')
          setActive(options.findIndex((option) => !option.disabled))
          setOpen(!isOpen)
        }}><Icon name="chevron-down" size={14} /></button>
    </div>
    {(error || helperText) && <p id={`${id}-help`} className="diya-field-help">{error && <span aria-hidden="true">!</span>}{error || helperText}</p>}
    {present && portal && createPortal(<ul ref={panel} id={`${id}-options`} className="diya-combobox-options diya-floating"
      role="listbox" aria-label={label} aria-multiselectable={multiple || undefined} style={{ position: 'fixed', inset: 'auto', margin: 0 }}
      data-side="bottom" data-exiting={closing ? 'true' : undefined}>
      {rows.length ? rows.map((option, index) => <li id={`${id}-option-${index}`} role="option" key={option.value}
        aria-selected={value.includes(option.value)} aria-disabled={option.disabled} data-active={index === activeIndex}
        onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => { if (!option.disabled) { keyboardNavigation.current = false; setActive(index) } }} onClick={() => choose(option)}>
        <span>{option.label}</span>{value.includes(option.value) && <span aria-hidden="true">✓</span>}
      </li>) : <li role="presentation">{t.noResults}</li>}
    </ul>, portal)}
  </div>
})

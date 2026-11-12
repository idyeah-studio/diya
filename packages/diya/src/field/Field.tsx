'use client'
import { cloneElement, forwardRef, isValidElement, useEffect, useId, useMemo, useRef, useState, type HTMLAttributes, type ReactElement, type ReactNode } from 'react'
import { cx } from '../internal/cx.js'
import { DIYA_FIELD, renderDescription, useErrorAnnouncement, useShownError } from '../internal/field-parts.js'
import { watchFocus } from '../internal/frame-focus.js'
import { composeRefs, onlyChild } from '../internal/slot.js'
import { warnOnce } from '../internal/warn.js'

/** What Field passes to a function child, to spread onto the control or route to it. */
export type FieldControlProps = {
  /** The control's id; the label points at it. */
  id: string
  /** The label's id, for a control the label can't point at by `id`, such as a custom widget or an iframe. */
  'aria-labelledby': string
  /** The helper text or error's id while either is shown, plus any ids the child already had. */
  'aria-describedby': string | undefined
  /** true while `error` is set. */
  'aria-invalid': true | undefined
  /** true with `required`. */
  'aria-required': true | undefined
  /** true with `disabled`. */
  disabled: true | undefined
}
/** Other attributes, `className`, `style` and the ref go on the outer wrapper; `id` is the control's. */
export type FieldProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'id'> & {
  /** Visible label above the control; also its accessible name. Hide it with hideLabel. */
  label: string
  /** Hides the label visually but keeps it as the control's accessible name. */
  hideLabel?: boolean
  /** Visible hint below the control, announced with it; `error` replaces it while set. */
  helperText?: string
  /** Visible error message below the control; marks the field invalid while set. */
  error?: string
  /** Tells assistive tech the control is required (`aria-required`) and draws nothing. Mark the few optional fields with "(optional)" in their label instead. */
  required?: boolean
  /** Dims the field and passes `disabled` to the control; put the reason in `helperText`. */
  disabled?: boolean
  /** With `framed`, the frame's height and text size; defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** Draws DIYA's field box (fill, edge, corner, height and focus ring) around a control that has none, such as a payment provider's card iframe or a native time input. A label click focuses the iframe; if your provider needs its own `focus()` to reach its input (Stripe, Braintree), call it from the label: `onClick={(event) => { if ((event.target as Element).closest('label')) card.focus() }}`. Defaults to false. */
  framed?: boolean
  /** The control's id; defaults to the child's own `id`, then a generated one. */
  id?: string
  /** One control element, which gets the ids and states merged in; or a function that receives them, for a control that takes them somewhere else. */
  children: ReactElement | ((control: FieldControlProps) => ReactNode)
}

type AnyProps = Record<string, unknown>
const reachableTags = new Set(['input', 'select', 'textarea'])
const focusable = 'iframe, input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'

/** A label, helper text and error around a control DIYA doesn't make: your own input, a native one DIYA doesn't wrap, or a third-party or hosted control. */
export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field({ label, hideLabel = false, helperText, error, required, disabled, size = 'medium', framed = false, id, children, className, ...rest }, ref) {
  const generated = useId()
  const wrapper = useRef<HTMLDivElement | null>(null)
  const setWrapper = useMemo(() => composeRefs<HTMLDivElement>(wrapper, ref), [ref])
  const shown = useShownError(error, wrapper)
  const child = typeof children === 'function' ? null : (() => { try { return onlyChild(children) } catch { return null } })()
  const element = isValidElement(child) ? (child as ReactElement<AnyProps>) : null
  const tag = typeof element?.type === 'string' ? element.type : null
  // How Field reaches the control (api.md §2): a native input, select or textarea, or a
  // component, by id; an iframe by aria-labelledby only; any other element not at all.
  const kind: 'control' | 'component' | 'iframe' | 'other' | 'function' | 'none' = typeof children === 'function' ? 'function' : !element ? 'none' : tag === null ? 'component' : reachableTags.has(tag) ? 'control' : tag === 'iframe' ? 'iframe' : 'other'
  const reachable = kind === 'control' || kind === 'component' || kind === 'function'
  const controlId = (element?.props.id as string | undefined) ?? id ?? generated
  const labelId = `${controlId}-label`
  const descriptionId = `${controlId}-description`
  const describedBy = (theirs: unknown) => [theirs, shown || helperText ? descriptionId : undefined].filter(Boolean).join(' ') || undefined

  if (process.env.NODE_ENV !== 'production') {
    const name = element && (element.type as unknown as Record<symbol, string> | undefined)?.[DIYA_FIELD]
    if (name) warnOnce(`DIYA: Field is wrapping a ${name}, which has its own label. Pass label, helperText and error to ${name} and remove the Field, or screen readers will hear two labels.`)
    if (kind === 'none') warnOnce('DIYA: Field needs one control element, or a function that renders it.')
  }

  // Focus in the field, as a signal the frame can show and an unreachable control can announce
  // on: focusin and focusout, and, for a control in an iframe, the shared focus watcher (focus
  // that moves into a frame barely reaches the page's focus events).
  const [focused, setFocusedState] = useState(false)
  const [arrived, setArrived] = useState(0)
  const isFocused = useRef(false)
  const setFocused = (next: boolean) => {
    if (isFocused.current === next) return
    isFocused.current = next
    setFocusedState(next)
    if (next && !reachable) setArrived((count) => count + 1)
  }
  const hasFrame = kind === 'iframe' || kind === 'other'
  useEffect(() => {
    const node = wrapper.current
    if (!node) return
    // A control in an iframe: the shared focus watcher tells this field whether focus is in it,
    // including between two hosted frames and out to blank page (G5).
    if (hasFrame) return watchFocus(node.ownerDocument, (active) => setFocused(!!active && node.contains(active)))
    const enter = () => setFocused(true)
    const leave = (event: FocusEvent) => { if (!node.contains(event.relatedTarget as Node | null)) setFocused(false) }
    node.addEventListener('focusin', enter)
    node.addEventListener('focusout', leave)
    return () => {
      node.removeEventListener('focusin', enter)
      node.removeEventListener('focusout', leave)
    }
  }, [hasFrame, reachable])
  useErrorAnnouncement(label, shown, wrapper, reachable ? 0 : arrived)

  const control: FieldControlProps = {
    id: controlId,
    'aria-labelledby': labelId,
    'aria-describedby': describedBy(undefined),
    'aria-invalid': shown ? true : undefined,
    'aria-required': required ? true : undefined,
    disabled: disabled ? true : undefined,
  }
  let content: ReactNode = null
  if (typeof children === 'function') content = children(control)
  else if (element && (kind === 'control' || kind === 'component')) {
    const own = element.props
    const merged: AnyProps = {
      id: controlId,
      'aria-describedby': describedBy(own['aria-describedby']),
      'aria-invalid': shown ? true : own['aria-invalid'],
      'aria-required': required ? true : own['aria-required'],
      disabled: disabled ? true : own.disabled,
    }
    if (kind === 'component' && !own['aria-label'] && !own['aria-labelledby']) merged['aria-labelledby'] = labelId
    // cloneElement keeps the child's own ref, on React 18 and 19.
    content = cloneElement(element, merged)
  } else if (element && kind === 'iframe') content = cloneElement(element, { 'aria-labelledby': (element.props['aria-labelledby'] as string | undefined) ?? labelId })
  else content = element

  return (
    <div
      {...rest}
      ref={setWrapper}
      className={cx('diya-field', className)}
      data-size={size}
      data-disabled={disabled || undefined}
      data-invalid={!!shown || undefined}
    >
      <label
        id={labelId}
        htmlFor={reachable ? controlId : undefined}
        className={hideLabel ? 'diya-sr-only' : undefined}
        onClick={reachable ? undefined : (event) => {
          // No control to point at: the label moves focus into the first iframe or focusable inside.
          event.preventDefault()
          wrapper.current?.querySelector<HTMLElement>(focusable)?.focus()
        }}
      >
        {label}
      </label>
      {framed ? <div className="diya-field-frame diya-text-field-control" data-focused={focused ? '' : undefined}>{content}</div> : content}
      {renderDescription({ id: descriptionId, className: 'diya-text-field-description', error: shown, helperText })}
    </div>
  )
})

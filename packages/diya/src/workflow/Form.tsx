'use client'
import { forwardRef, useId, type FormHTMLAttributes, type FormEvent, type ReactNode } from 'react'
import { Button } from '../button/Button.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { formMessages } from './form-messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    form: typeof formMessages
  }
}

export type FormProps = Omit<FormHTMLAttributes<HTMLFormElement>, 'title' | 'onSubmit' | 'children'> & {
  /** Visible heading; it is also the form's accessible name. Leave it out when the page already has a heading, and name the form with `aria-label` instead. */
  title?: string
  /** Heading level of the title, 1–6; defaults to 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Supporting text under the title. */
  description?: ReactNode
  /** The form's fields. */
  children: ReactNode
  /** Replaces the default Cancel and Submit buttons; pass null for no footer. */
  actions?: ReactNode
  /** Called on submit with the event (default already prevented); not called while loading. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  /** Shows a Cancel button that calls this. */
  onCancel?: () => void
  /** Submit button text; defaults to "Submit". */
  submitLabel?: string
  /** Cancel button text; defaults to "Cancel". */
  cancelLabel?: string
  /** Shows a spinner on Submit, disables Cancel and blocks resubmission; defaults to false. */
  loading?: boolean
}

/** A form with an optional title, Submit and optional Cancel. Composes caller-owned fields and validation; it never invents a successful submission. */
export const Form = forwardRef<HTMLFormElement, FormProps>(function Form({ title, headingLevel = 3, description, children, actions, onSubmit, onCancel, submitLabel, cancelLabel, loading = false, className, ...props }, ref) {
  const t = useDiyaMessages('form', formMessages)
  const id = useId()
  const Heading = `h${headingLevel}` as const
  const footer = actions === undefined ? <>{onCancel && <Button variant="quiet" disabled={loading} onClick={onCancel}>{cancelLabel ?? t.cancel}</Button>}<Button type="submit" loading={loading}>{submitLabel ?? t.submit}</Button></> : actions
  return <form {...props} ref={ref} className={cx('diya-workflow-surface diya-project-form', className)} aria-labelledby={title ? id : props['aria-labelledby']} aria-busy={loading || undefined} onSubmit={event => { event.preventDefault(); if (!loading) onSubmit(event) }}>
    {(title || description) && <header>{title && <Heading id={id} className="diya-project-form-title">{title}</Heading>}{description && <p>{description}</p>}</header>}
    {children}
    {footer && <footer>{footer}</footer>}
  </form>
})

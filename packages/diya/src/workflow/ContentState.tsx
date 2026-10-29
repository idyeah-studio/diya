'use client'
import { forwardRef, useId, type HTMLAttributes, type ReactNode } from 'react'
import { Button } from '../button/Button.js'
import { cx } from '../internal/cx.js'

export type ContentStateProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> & {
  /** Visible heading that says what happened, e.g. "No projects yet". */
  title: string
  /** Heading level of the title, h1 to h6. Defaults to 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Supporting text that says what to do next. */
  description?: ReactNode
  /** Decorative icon above the title; hidden from assistive technology. */
  icon?: ReactNode
  /** One pill button under the text. */
  action?: {
    /** Visible button text. */
    label: string
    /** Called when the button is pressed. */
    onClick: () => void
    /** Disables the button. */
    disabled?: boolean
  }
  /** Announce immediately (an error), rather than politely; defaults to false. */
  urgent?: boolean
}

/** An empty, error or finished state for a region, with an optional next-step button. */
export const ContentState = forwardRef<HTMLElement, ContentStateProps>(function ContentState({ title, headingLevel = 3, description, icon, action, urgent = false, className, ...props }, ref) {
  const id = useId()
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return <section aria-labelledby={id} {...props} ref={ref} className={cx('diya-workflow-surface diya-content-state', className)}>
    {icon && <span className="diya-workflow-symbol" aria-hidden="true">{icon}</span>}
    <div role={urgent ? 'alert' : 'status'} aria-atomic="true"><Heading id={id} className="diya-content-state-title">{title}</Heading>{description && <p>{description}</p>}</div>
    {action && <Button disabled={action.disabled} onClick={action.onClick}>{action.label}</Button>}
  </section>
})

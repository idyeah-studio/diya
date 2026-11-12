'use client'
import { forwardRef, useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react'
import { Button } from '../button/Button.js'
import { Icon } from '../Icon.js'
import { cx } from '../internal/cx.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { wizardMessages } from './wizard-messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    wizard: typeof wizardMessages
  }
}

export type WizardStep = {
  /** Stable key for the step. */
  id: string
  /** Short name shown in the step list. */
  label: string
  /** Heading above the step's content; defaults to `label`. */
  title?: string
  /** Supporting text under the step heading. */
  description?: ReactNode
  /** The step's fields; plain fields, not a nested form. */
  content: ReactNode
}
export type WizardProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  /** The steps, in order. */
  steps: readonly WizardStep[]
  /** Zero-based index of the current step; the caller owns this state. */
  activeStep: number
  /** Called with the requested zero-based step index on Back or Continue; set `activeStep` to accept it. */
  onStepChange: (step: number) => void
  /** Called when the last step is submitted. */
  onComplete: () => void
  /** Step list above the content ('horizontal', the default) or beside it ('vertical'). */
  orientation?: 'horizontal' | 'vertical'
  /** Shows "Step N of M" above the buttons; defaults to true. */
  showStepCount?: boolean
  /** Shows the forward button's working indicator and blocks navigation; defaults to false. */
  loading?: boolean
  /** Accessible name for the whole wizard (not shown); defaults to "Wizard". */
  label?: string
  /** Back button text; defaults to "Back". */
  backLabel?: string
  /** Forward button text on every step but the last; defaults to "Continue". */
  nextLabel?: string
  /** Forward button text on the last step; defaults to "Complete". */
  completeLabel?: string
  /** Skips the browser's built-in field validation on submit; defaults to true. */
  noValidate?: boolean
  /** Heading level of each step's title, h1 to h6. Defaults to 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
}

/** A multi-step flow with a step list, Back and Continue. Step content contains fields, not nested forms. The caller accepts or rejects navigation. */
export const Wizard = forwardRef<HTMLElement, WizardProps>(function Wizard({ steps, activeStep, onStepChange, onComplete, orientation = 'horizontal', showStepCount = true, loading = false, label, backLabel, nextLabel, completeLabel, noValidate = true, headingLevel = 3, className, ...props }, ref) {
  const t = useDiyaMessages('wizard', wizardMessages)
  const index = Math.max(0, Math.min(Math.max(0, steps.length - 1), Number.isFinite(activeStep) ? Math.floor(activeStep) : 0))
  const heading = useRef<HTMLHeadingElement>(null)
  const previousStep = useRef(index)
  useEffect(() => {
    if (previousStep.current !== index) heading.current?.focus()
    previousStep.current = index
  }, [index])
  if (!steps.length) return null
  const step = steps[index]
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  const last = index === steps.length - 1
  return <section aria-label={label ?? t.label} {...props} ref={ref} className={cx('diya-workflow-surface diya-wizard', className)} data-orientation={orientation} aria-busy={loading || undefined}>
    <ol className="diya-wizard-steps" aria-label={t.progress}>{steps.map((item, position) => <li key={item.id} aria-current={index === position ? 'step' : undefined} data-complete={position < index}>
      <span>{position < index ? <Icon name="check" size={14} /> : position + 1}</span><strong>{item.label}</strong>
    </li>)}</ol>
    <div className="diya-wizard-body"><form noValidate={noValidate} onSubmit={event => { event.preventDefault(); if (!loading) { if (last) onComplete(); else onStepChange(index + 1) } }}>
      <header><Heading ref={heading} tabIndex={-1} className="diya-wizard-title">{step.title ?? step.label}</Heading>{step.description && <p>{step.description}</p>}</header>
      {step.content}
      {showStepCount && <small className="diya-wizard-summary">{t.step(index + 1, steps.length)}</small>}
      <footer><Button variant="quiet" disabled={index === 0 || loading} onClick={() => onStepChange(index - 1)}>{backLabel ?? t.back}</Button><Button type="submit" loading={loading}>{last ? completeLabel ?? t.complete : nextLabel ?? t.next}</Button></footer>
    </form></div>
  </section>
})

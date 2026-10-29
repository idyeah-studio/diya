import type { ReactNode, Ref } from 'react'

/** One numbered step: the number, a heading row (with anything that belongs beside it), then the body. */
export function Step({
  n,
  title,
  titleId,
  titleRef,
  aside,
  tabs = false,
  children,
}: {
  n: number
  title: ReactNode
  titleId: string
  titleRef?: Ref<HTMLHeadingElement>
  aside?: ReactNode
  /** The body starts with package-manager tabs, which sit in the heading row. */
  tabs?: boolean
  children: ReactNode
}) {
  return (
    <section className="code-step" aria-labelledby={titleId}>
      <span className="code-step-n" aria-hidden="true">
        {n}
      </span>
      <div className="code-step-body" data-tabs={tabs || undefined}>
        <div className="code-step-head">
          <h4 className="code-step-title" id={titleId} ref={titleRef} tabIndex={-1}>
            <span className="code-sr">Step {n}: </span>
            {title}
          </h4>
          {aside}
        </div>
        {children}
      </div>
    </section>
  )
}

export function NoteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </svg>
  )
}

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../internal/cx.js'
export type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> & {
  /** Visible card heading; it is also the card's accessible name. */
  title: string
  /** Heading level of the title, h1 to h6. Defaults to 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Supporting text under the title. */
  description?: string
  /** Slot above the title for Tag or Badge elements. */
  tags?: ReactNode
  /** Slot in the top corner, usually a Menu or a quiet icon button. */
  actions?: ReactNode
  /** Image or illustration shown edge to edge above the body. */
  media?: ReactNode
  /** Main card content, under the header. */
  children?: ReactNode
  /** Content pinned to the bottom, such as buttons or metadata. */
  footer?: ReactNode
  /** Draws a line above the footer; defaults to false. */
  divided?: boolean
  /** Lifts the card with a shadow instead of a flat border; defaults to false. */
  shadow?: boolean
}
/** A titled content container with optional media, tags, corner actions and a footer. */
export const Card = forwardRef<HTMLElement, CardProps>(function Card({ title, headingLevel = 3, description, tags, actions, media, children, footer, divided = false, shadow = false, className, ...props }, ref) {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return <article aria-label={title} {...props} ref={ref} className={cx('diya-card', className)} data-shadow={shadow}>
    {media && <div className="diya-card-media">{media}</div>}
    <div className="diya-card-body">
      <header className="diya-card-header"><div>{tags && <div className="diya-card-tag">{tags}</div>}<Heading className="diya-card-title">{title}</Heading>{description && <p>{description}</p>}</div>{actions && <div className="diya-card-menu">{actions}</div>}</header>
      {children && <div className="diya-card-content">{children}</div>}
      {footer && <footer className="diya-card-footer" data-divider={divided}>{footer}</footer>}
    </div>
  </article>
})

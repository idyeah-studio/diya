'use client'
import { forwardRef, useId, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../internal/cx.js'
export type PageHeaderProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  /** The page heading; it also names the section for assistive technology. */
  title: ReactNode
  /** Heading element level, h1 to h6; defaults to 2. Use 1 for the page's only top heading. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Slot above the heading, usually a Breadcrumbs element. */
  breadcrumbs?: ReactNode
  /** Supporting text under the heading. */
  description?: ReactNode
  /** Slot under the description for Tag or Badge elements. */
  tags?: ReactNode
  /** Slot beside the heading for page-level buttons. */
  actions?: ReactNode
  /** Slot along the bottom edge, usually Tabs for sub-pages. */
  navigation?: ReactNode
  /** Draws the header on its own panel; defaults to true. Pass false to set it straight on the page, as an app screen's title. */
  surface?: boolean
}
/** A page's heading block with optional breadcrumbs, description, tags, actions and tabs. Data and actions belong to the host app. Optional slots reserve no empty space. */
export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(function PageHeader({ title, headingLevel = 2, breadcrumbs, description, tags, actions, navigation, surface = true, className, ...props }, ref) {
  const headingId = useId()
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return <section {...props} ref={ref} className={cx('diya-page-header', className)} data-surface={surface} aria-labelledby={props['aria-labelledby'] ?? headingId}>
    {breadcrumbs && <div className="diya-page-header-breadcrumbs">{breadcrumbs}</div>}
    <div className="diya-page-header-main">
      <div className="diya-page-header-copy"><Heading id={headingId}>{title}</Heading>
        {description && <div className="diya-page-header-description">{description}</div>}
        {tags && <div className="diya-page-header-tags">{tags}</div>}
      </div>
      {actions && <div className="diya-page-header-actions">{actions}</div>}
    </div>
    {navigation && <div className="diya-page-header-navigation">{navigation}</div>}
  </section>
})

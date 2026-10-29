import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../internal/cx.js'

export type ProseProps = HTMLAttributes<HTMLDivElement> & {
  /** Your own HTML content: headings, paragraphs, links, lists, quotes, code, tables and images. Rendered HTML can come in through `dangerouslySetInnerHTML` instead. */
  children?: ReactNode
  /** Text size, with headings, tables and captions in step: 'small' (15px) for writing inside an app, such as a drawer or a card; 'medium' (17px) for articles and docs pages; 'large' (20px) for long reads. Defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
}

/** Gives the plain HTML inside it DIYA's type and rhythm, for articles, docs pages, changelogs and legal pages. DIYA components placed inside keep their own styles. Needs no provider context, so it renders in Server Components. */
export const Prose = forwardRef<HTMLDivElement, ProseProps>(function Prose({ size = 'medium', className, children, ...props }, ref) {
  return <div {...props} ref={ref} className={cx('diya-prose', className)} data-size={size}>{children}</div>
})

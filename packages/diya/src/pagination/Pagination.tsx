'use client'
import { forwardRef, type HTMLAttributes } from 'react'
import { Select } from '../select/Select.js'
import { Button } from '../button/Button.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { paginationMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    pagination: typeof paginationMessages
  }
}
export type PaginationProps = HTMLAttributes<HTMLDivElement> & {
  /** Current page, starting at 1; clamped to the pages that exist. */
  page: number
  /** Total number of items across all pages, not the number of pages. */
  total: number
  /** Items per page. */
  pageSize: number
  /** Called with the 1-based page a person picks. */
  onPageChange: (page: number) => void
  /** When given, shows a "Per page" select and is called with the new size. */
  onPageSizeChange?: (size: number) => void
  /** Sizes offered by the "Per page" select; the current `pageSize` is always included. Defaults to `[10, 25, 50]`. */
  pageSizeOptions?: number[]
  /** Shows the visible range, such as "11–20 of 42", announced as a status. Defaults to true. */
  showCount?: boolean
  /** Shows numbered page buttons between Previous and Next, with gaps for long runs. Defaults to true. */
  showNumbers?: boolean
}
const chevron = (path: string) => <svg className="diya-pagination-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={path} /></svg>

/** Previous / Next page controls with optional page numbers, a range count and a page-size select; narrow spaces get arrow buttons. The ref, `className`, `style` and other attributes go to the outer element. */
export const Pagination = forwardRef<HTMLDivElement, PaginationProps>(function Pagination({ page, total, pageSize, onPageChange, onPageSizeChange, pageSizeOptions = [10, 25, 50], showCount = true, showNumbers = true, className, ...props }, ref) {
  const t = useDiyaMessages('pagination', paginationMessages)
  const count = Math.max(0, Math.floor(total))
  const size = Math.max(1, Math.floor(pageSize))
  const pages = Math.max(1, Math.ceil(count / size))
  const current = Math.max(1, Math.min(pages, page))
  const visible = Array.from(new Set([1, pages, current - 1, current, current + 1].filter((n) => n >= 1 && n <= pages))).sort((a,b) => a-b)
  const cells: (number | string)[] = []
  visible.forEach((n,i) => { if (i && n - visible[i-1] > 1) { if (n - visible[i-1] === 2) cells.push(n-1); else cells.push(`gap-${n}`) }; cells.push(n) })
  return <div {...props} ref={ref} className={cx('diya-pagination', className)}>
    {showCount && <p className="diya-pagination-count" role="status">{count ? t.range((current-1)*size+1, Math.min(current*size,count), count) : t.noResults}</p>}
    <nav aria-label={t.label} data-cells={showNumbers ? cells.length : undefined}><Button size="small" variant="quiet" shape="pill" disabled={current === 1 || count === 0} onClick={() => onPageChange(current-1)}>{chevron('m15 5-7 7 7 7')}<span className="diya-pagination-step">{t.previous}</span></Button>
      {showNumbers && cells.map((cell) => typeof cell === 'string' ? <span className="diya-pagination-gap" key={cell} aria-hidden="true">…</span> : <Button key={cell} size="small" variant={current === cell ? 'solid' : 'quiet'} shape="pill" aria-label={t.page(cell)} aria-current={current === cell ? 'page' : undefined} data-far={Math.abs(cell - current) > 1 || undefined} disabled={count === 0} onClick={() => onPageChange(cell)}>{cell}</Button>)}
      <Button size="small" variant="quiet" shape="pill" disabled={current === pages || count === 0} onClick={() => onPageChange(current+1)}><span className="diya-pagination-step">{t.next}</span>{chevron('m9 5 7 7-7 7')}</Button>
    </nav>
    {onPageSizeChange && <div className="diya-pagination-size"><span>{t.perPage}</span><Select label={t.resultsPerPage} hideLabel size="small" value={String(size)} onValueChange={value=>onPageSizeChange(Number(value))} options={Array.from(new Set([...pageSizeOptions,size])).sort((a,b)=>a-b).map(n=>({value:String(n),label:String(n)}))}/></div>}
  </div>
})

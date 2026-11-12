'use client'
import { forwardRef, useId, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../internal/cx.js'
import { useClientLayoutEffect } from '../internal/layout-effect.js'
export type AccordionItem = {
  /** Unique key for the section. */
  id: string
  /** Visible heading text on the button that opens and closes the section. */
  label: string
  /** Content shown while the section is open. */
  content: ReactNode
}
export type AccordionProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** The sections, in order; all start closed. */
  items: AccordionItem[]
  /** Lets several sections stay open at once; by default opening one closes the others. */
  multiple?: boolean
  /** Draws lines between sections. Defaults to true. */
  divided?: boolean
  /** Disables every section's button. */
  disabled?: boolean
  /** Heading level of each section's button, h1 to h6. Defaults to 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
}
/** Stacked sections that open and close under their headings. */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion({ items, multiple = false, divided = true, disabled = false, headingLevel = 3, className, ...props }, ref) {
  const id = useId()
  const [expanded, setExpanded] = useState<string[]>([])
  const visible = multiple ? expanded : expanded.slice(-1)
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  // A closed section stays laid out while it shrinks away, so it's inert from the moment it
  // closes: no focus, clicks or screen reader. A DOM property, as React 18 and 19 differ.
  const contents = useRef<(HTMLDivElement | null)[]>([])
  useClientLayoutEffect(() => {
    items.forEach((item, index) => {
      const node = contents.current[index]
      if (node) node.inert = !visible.includes(item.id)
    })
  })
  return <div {...props} ref={ref} className={cx('diya-accordion', className)} data-divided={divided}>{items.map((item, index) => {
    const open = visible.includes(item.id)
    return <section className="diya-accordion-item" key={item.id}><Heading className="diya-accordion-heading"><button type="button" disabled={disabled} id={`${id}-trigger-${index}`} aria-expanded={open} aria-controls={`${id}-panel-${index}`} onClick={() => setExpanded(open ? visible.filter((key) => key !== item.id) : multiple ? [...visible, item.id] : [item.id])}>{item.label}<svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 8l5 5 5-5" /></svg></button></Heading><div role="region" ref={(node) => { contents.current[index] = node }} id={`${id}-panel-${index}`} aria-labelledby={`${id}-trigger-${index}`} hidden={!open} className="diya-accordion-content"><div className="diya-accordion-body">{item.content}</div></div></section>
  })}</div>
})

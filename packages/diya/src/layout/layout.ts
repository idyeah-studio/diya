import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

/** A step on DIYA's spacing scale (0 is none; 1 is 4px, 2 is 8px, 3 is 12px, 4 is 16px, 5 is 24px, 6 is 32px, 7 is 48px, 8 is 64px), or any CSS length such as '10px' or '1.5rem'. */
export type DiyaSpace = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | (string & {})
/** Cross-axis alignment of the children. */
export type DiyaAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
/** Main-axis distribution of the children. */
export type DiyaJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
/** Elements a layout primitive can render as. */
export type DiyaLayoutElement = 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'main' | 'nav' | 'form' | 'fieldset' | 'ul' | 'ol' | 'li' | 'span'

/** Props shared by Stack and Inline. An interface, so declaration files keep these docs. */
export interface LayoutProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** What to lay out. */
  children?: ReactNode
  /** Space between children: a scale step from 0 to 8, or a CSS length. */
  gap?: DiyaSpace
  /** Cross-axis alignment of the children. */
  align?: DiyaAlign
  /** Main-axis distribution of the children. */
  justify?: DiyaJustify
  /** Whether children move onto a new line when they run out of room. */
  wrap?: boolean
  /** The element to render, such as 'section' or 'ul'. Defaults to 'div'. */
  as?: DiyaLayoutElement
}

const STEPS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8'])

/** Data attributes and the custom gap for a Stack or Inline root. */
export function layoutAttributes(gap: DiyaSpace, align: DiyaAlign | undefined, justify: DiyaJustify | undefined, wrap: boolean, style: CSSProperties | undefined) {
  const step = STEPS.has(String(gap))
  return {
    'data-gap': step ? String(gap) : 'custom',
    'data-align': align,
    'data-justify': justify,
    'data-wrap': wrap ? 'true' : undefined,
    style: step ? style : ({ '--diya-internal-gap': String(gap), ...style } as CSSProperties),
  }
}

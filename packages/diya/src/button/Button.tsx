'use client'
import { Children, Fragment, cloneElement, forwardRef, isValidElement, useRef, useState, type AnimationEvent, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactElement, type ReactNode, type Ref } from 'react'
import { cx } from '../internal/cx.js'
import { useDiyaLinkComponent } from '../internal/link.js'
import { renderSpinnerRing } from '../spinner/Spinner.js'
import { onlyChild, renderSlot } from '../internal/slot.js'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 'solid' for the main action, 'outline' for secondary ones, 'quiet' for low-emphasis ones, 'destructive' for an action that deletes or can't be undone. Defaults to 'solid'. */
  variant?: 'solid' | 'outline' | 'quiet' | 'destructive'
  /** Button height and text size. Defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** 'pill' is fully round; 'rounded' uses the shared control corner, like fields. Defaults to 'pill'. */
  shape?: 'pill' | 'rounded'
  /** Square button for a single icon child; give it an `aria-label`, since the icon is its only content. */
  iconOnly?: boolean
  /** Shows a small spinner and sets `aria-busy`: after 400ms it takes the place of the leading icon, or else of the label, which keeps its width. If the label holds something with its own state, pass `loading` from the start (`loading={false}`); `undefined` counts as not passed. The button stays focusable, so focus isn't lost while it works, but it is inert: `aria-disabled="true"`, and clicks, Enter and Space do nothing, so it can't submit twice. */
  loading?: boolean
  /** Renders a link to this URL that looks like a Button, through the provider's `linkComponent` (a plain anchor by default). */
  href?: string
  /** With `href`, where the link opens, such as '_blank'. */
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target']
  /** With `href`, the link's relationship to this page, such as 'noopener'. */
  rel?: string
  /** With `href`, downloads the target instead of opening it; a string names the saved file. */
  download?: AnchorHTMLAttributes<HTMLAnchorElement>['download']
  /** Styles your single child element as the Button instead of rendering one, such as a router `Link`; DIYA's classes, attributes and handlers merge into it. */
  asChild?: boolean
}

// A link can't be disabled natively, so its clicks stop here, before the link or a router sees them.
function stopClick(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}

// A press shrinks a Button to 0.98, but a wide one by at most about 2px a side: the floor for
// this width goes on the element as it's pressed, by pointer or by Enter and Space.
function pressFloor(event: { currentTarget: EventTarget }) {
  const node = event.currentTarget as HTMLElement
  if (node.offsetWidth > 0) node.style.setProperty('--diya-internal-button-press-floor', String(1 - 4 / node.offsetWidth))
}

// A loading button keeps focus but must not act: Enter and Space would activate it, so they stop here too.
function stopActivation(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') event.preventDefault()
}

// The label's parts, with fragments opened up (an icon and words in one fragment are two parts).
function labelParts(node: ReactNode, prefix = ''): ReactNode[] {
  return Children.toArray(node).flatMap((part) => {
    if (!isValidElement(part)) return [part]
    const key = `${prefix}${part.key ?? ''}`
    if (part.type === Fragment) return labelParts((part.props as { children?: ReactNode }).children, `${key}/`)
    return [prefix ? cloneElement(part, { key }) : part]
  })
}

// Text holds no state, so a label of plain text needn't keep a wrapper at rest (M3).
const plainText = (node: ReactNode) => Children.toArray(node).every((part) => typeof part === 'string' || typeof part === 'number')

/** A native button in DIYA's styles, or a link that looks like one with `href` or `asChild`; other button attributes pass through, and `type` defaults to 'button'. */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(buttonProps, ref) {
  const { variant = 'solid', size = 'medium', shape = 'pill', iconOnly = false, loading = false, disabled, children, className, type = 'button', href, target, rel, download, asChild = false, ...props } = buttonProps
  const Link = useDiyaLinkComponent()
  const inactive = !!disabled || loading
  // The label (or icon) fades back when loading ends only if the beat came and hid it: the
  // Button's own spinner arriving (an animation) marks the beat, and the fade back ending clears
  // the mark (L2, M6, M8). A load that ends sooner changes nothing.
  const beat = useRef(false)
  const [returning, setReturning] = useState(false)
  const [was, setWas] = useState(loading)
  if (loading !== was) {
    setWas(loading)
    setReturning(!loading && beat.current)
    if (loading) beat.current = false
  }
  // Loading (F12): on the Spinner's 400ms beat the spinner takes the place of the first thing in
  // the button, in one frame: a leading icon (the label stays), or else the label, which keeps its
  // place, so nothing moves. When loading ends the spinner goes and they fade back.
  // - The wrappers have no box of their own (display: contents), so the Button lays out as
  //   without them (M2). A leading part gets a box only when CSS sees it render a single svg,
  //   as every icon library's icon does (M1): the spinner then sits on it.
  // - A label holding elements is wrapped from the first render whenever `loading` is given, even
  //   as false, so nothing in it remounts (L1); a Button without `loading` keeps 1.1.1's markup
  //   until it first loads. A label of plain text is wrapped only while loading and its fade back
  //   (M3). The spinner is there whenever the wrappers are, hidden at rest, so loading that stops
  //   and restarts within a frame never blanks the Button (M5).
  const given = buttonProps.loading !== undefined
  const [loaded, setLoaded] = useState(loading)
  if (loading && !loaded) setLoaded(true)
  const own = asChild && isValidElement(onlyChild(children)) ? (onlyChild(children) as ReactElement<{ children?: ReactNode }>).props.children : children
  const wrapped = loading || returning || (!plainText(own) && (given || loaded))
  // The words are hidden from the Button, which stays put when loading stops and restarts within
  // one frame; a new spinner (a plain label's comes and goes with its wrapper) waits a full beat. So
  // each new spinner flips the turn, and the Button's hide restarts with it (N1, M5).
  const [turn, setTurn] = useState(false)
  const [hadSpinner, setHadSpinner] = useState(wrapped)
  if (wrapped !== hadSpinner) {
    setHadSpinner(wrapped)
    if (wrapped) setTurn((value) => !value)
  }
  const spinner = wrapped && <span className="diya-spinner diya-button-spinner" data-size={size === 'large' ? 'medium' : 'small'} aria-hidden="true">{renderSpinnerRing(size === 'large' ? 'medium' : 'small')}</span>
  const shared = {
    className: cx('diya-button', className), 'data-variant': variant, 'data-size': size, 'data-shape': shape, 'data-icon-only': iconOnly || undefined, 'aria-busy': loading || undefined,
    'data-returning': returning || undefined,
    'data-busy-turn': loading ? (turn ? 'b' : 'a') : undefined,
    onAnimationEnd: (event: AnimationEvent<HTMLElement>) => {
      // Only the Button's own spinner marks the beat (a Spinner inside the label doesn't), and only
      // its own fade back ends it (M6, M8).
      const target = event.target as Element
      const button = event.currentTarget
      const ownSpinner = target.classList?.contains('diya-button-spinner') && target.closest('.diya-button') === button
      if (loading && ownSpinner && event.animationName === 'diya-spinner-arrive') beat.current = true
      if (!loading && returning && event.animationName.startsWith('diya-button-return') && target.closest?.('.diya-button') === button) setReturning(false)
      props.onAnimationEnd?.(event as never)
    },
    onPointerDownCapture: (event: PointerEvent<HTMLElement>) => { pressFloor(event); props.onPointerDownCapture?.(event as never) },
    onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => { pressFloor(event); props.onKeyDownCapture?.(event as never) },
  }
  const content = (raw: ReactNode) => {
    // A plain-text label given `loading` is one string, so React sets it as text content and never
    // removes text nodes a page translator may have replaced (N2).
    const inner = given && !iconOnly && plainText(raw) ? Children.toArray(raw).join('') : raw
    if (iconOnly) return <>{spinner}{inner}</>
    if (!wrapped) return inner
    const parts = labelParts(inner)
    if (parts.length > 1 && isValidElement(parts[0])) return <><span className="diya-button-lead"><span className="diya-button-lead-item">{parts[0]}</span>{spinner}</span><span className="diya-button-label">{parts.slice(1)}</span></>
    return <>{spinner}<span className="diya-button-label">{inner}</span></>
  }
  if (asChild) {
    const child = onlyChild(children)
    if (!isValidElement(child)) return null
    const own = child as ReactElement<{ children?: ReactNode }>
    const filled = wrapped || given ? cloneElement(own, undefined, content(own.props.children)) : own
    return renderSlot(filled, { ...props, ...shared, 'aria-disabled': inactive || undefined, onClickCapture: inactive ? stopClick : undefined, onAuxClickCapture: inactive ? stopClick : undefined }, ref)
  }
  if (href !== undefined) {
    const anchor = props as AnchorHTMLAttributes<HTMLAnchorElement>
    const anchorRef = ref as Ref<HTMLAnchorElement>
    // Disabled: without its href the anchor leaves the tab order and can't be followed, as a
    // disabled button. Loading: the same Link stays, so nothing in it remounts and focus stays on it,
    // but every click (modified and middle ones too) and Enter do nothing (M7).
    if (disabled) return <a {...anchor} {...shared} ref={anchorRef} role="link" aria-disabled="true" onClickCapture={stopClick}>{content(children)}</a>
    return <Link {...anchor} {...shared} ref={anchorRef} href={href} target={target} rel={rel} download={download}
      aria-disabled={loading ? true : anchor['aria-disabled']}
      onClickCapture={loading ? stopClick : anchor.onClickCapture}
      onAuxClickCapture={loading ? stopClick : anchor.onAuxClickCapture}
      onKeyDown={loading ? (event: KeyboardEvent<HTMLAnchorElement>) => { stopActivation(event); anchor.onKeyDown?.(event) } : anchor.onKeyDown}>{content(children)}</Link>
  }
  // Loading keeps the button in the tab order with focus on it, unlike disabled; aria-disabled and the
  // blocked click (which Enter, Space and a form's implicit submission all go through) make it inert.
  const busy = loading && !disabled
  const button = props as ButtonHTMLAttributes<HTMLButtonElement>
  return <button {...button} {...shared} ref={ref as Ref<HTMLButtonElement>} type={type} disabled={!!disabled}
    aria-disabled={busy ? true : button['aria-disabled']}
    onClickCapture={busy ? stopClick : button.onClickCapture}
    onKeyDown={busy ? stopActivation : button.onKeyDown}>
    {content(children)}
  </button>
})

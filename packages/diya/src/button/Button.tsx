'use client'
import { Children, cloneElement, forwardRef, isValidElement, useRef, useState, type AnimationEvent, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactElement, type ReactNode, type Ref } from 'react'
import { Icon } from '../Icon.js'
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
  /** Shows a small spinner and sets `aria-busy`: after 400ms it takes the place of the leading icon, or else of the label, which keeps its width. The button stays focusable, so focus isn't lost while it works, but it is inert: `aria-disabled="true"`, and clicks, Enter and Space do nothing, so it can't submit twice. */
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

// A leading icon is an svg, or DIYA's own Icon, before the label (L3): not any element, so
// `<strong>Save</strong> draft` stays one label.
function isLeadingIcon(node: ReactNode) {
  return isValidElement(node) && (node.type === 'svg' || node.type === Icon)
}

/** A native button in DIYA's styles, or a link that looks like one with `href` or `asChild`; other button attributes pass through, and `type` defaults to 'button'. */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button({ variant = 'solid', size = 'medium', shape = 'pill', iconOnly = false, loading: loadingProp, disabled, children, className, type = 'button', href, target, rel, download, asChild = false, ...props }, ref) {
  const Link = useDiyaLinkComponent()
  const loading = !!loadingProp
  const inactive = !!disabled || loading
  // The label (or icon) fades back when loading ends only if the beat came and hid it: the
  // spinner's arrival (an animation) marks the beat. A load that ends sooner changes nothing (L2).
  const beat = useRef(false)
  const [returning, setReturning] = useState(false)
  const [was, setWas] = useState(loading)
  if (loading !== was) {
    setWas(loading)
    setReturning(!loading && beat.current)
    if (loading) beat.current = false
  }
  const shared = {
    className: cx('diya-button', className), 'data-variant': variant, 'data-size': size, 'data-shape': shape, 'data-icon-only': iconOnly || undefined, 'aria-busy': loading || undefined,
    'data-returning': returning || undefined,
    onAnimationEnd: (event: AnimationEvent<HTMLElement>) => { if (loading && event.animationName === 'diya-spinner-arrive') beat.current = true; props.onAnimationEnd?.(event as never) },
    onPointerDownCapture: (event: PointerEvent<HTMLElement>) => { pressFloor(event); props.onPointerDownCapture?.(event as never) },
    onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => { pressFloor(event); props.onKeyDownCapture?.(event as never) },
  }
  // Loading (F12): on the Spinner's 400ms beat the spinner takes the place of the first thing in
  // the button, in one frame: a leading icon (an svg, the label stays), or else the label, which
  // keeps its box so nothing moves. When loading ends the spinner goes and they fade back. The
  // label (or leading icon) has a wrapper from the first render whenever `loading` is given, even
  // as false, so its children never remount (L1); a Button without it renders as 1.1.1 did, until
  // it first loads.
  const [loaded, setLoaded] = useState(loading)
  if (loading && !loaded) setLoaded(true)
  const wrapped = loadingProp !== undefined || loaded
  const spinner = loading && <span className="diya-spinner" data-size={size === 'large' ? 'medium' : 'small'} aria-hidden="true">{renderSpinnerRing(size === 'large' ? 'medium' : 'small')}</span>
  const content = (inner: ReactNode) => {
    if (iconOnly) return <>{spinner}{inner}</>
    if (!wrapped) return inner
    const parts = Children.toArray(inner)
    if (parts.length > 1 && isLeadingIcon(parts[0])) return <><span className="diya-button-lead">{parts[0]}{spinner}</span>{parts.slice(1)}</>
    return <>{spinner}<span className="diya-button-label">{inner}</span></>
  }
  if (asChild) {
    const child = onlyChild(children)
    if (!isValidElement(child)) return null
    const own = child as ReactElement<{ children?: ReactNode }>
    const filled = wrapped ? cloneElement(own, undefined, content(own.props.children)) : own
    return renderSlot(filled, { ...props, ...shared, 'aria-disabled': inactive || undefined, onClickCapture: inactive ? stopClick : undefined }, ref)
  }
  if (href !== undefined) {
    const anchor = props as AnchorHTMLAttributes<HTMLAnchorElement>
    const anchorRef = ref as Ref<HTMLAnchorElement>
    // Without its href the anchor leaves the tab order and can't be followed, like a disabled button.
    if (inactive) return <a {...anchor} {...shared} ref={anchorRef} role="link" aria-disabled="true" onClickCapture={stopClick}>{content(children)}</a>
    return <Link {...anchor} {...shared} ref={anchorRef} href={href} target={target} rel={rel} download={download}>{content(children)}</Link>
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

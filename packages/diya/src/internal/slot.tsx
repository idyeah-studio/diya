import { Children, cloneElement, isValidElement, version, type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { cx } from './cx.js'

type AnyProps = Record<string, unknown>

/** Points every ref at the same node. */
export function composeRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as { current: T | null }).current = node
    }
  }
}

// React 19 keeps an element's ref in props; React 18 keeps it on the element.
const refInProps = Number(version.split('.')[0]) >= 19
function childRef(child: ReactElement): Ref<unknown> | undefined {
  return refInProps ? ((child.props as AnyProps).ref as Ref<unknown> | undefined) : (child as unknown as { ref?: Ref<unknown> }).ref
}

/** Merges DIYA's props into the caller's own element: classes join, styles merge, handlers both run (the child's first, and it can call preventDefault to stop DIYA's). */
export function mergeSlotProps(slot: AnyProps, child: AnyProps): AnyProps {
  const merged: AnyProps = { ...slot, ...child }
  for (const key of Object.keys(slot)) {
    const ours = slot[key]
    const theirs = child[key]
    if (/^on[A-Z]/.test(key) && typeof ours === 'function' && typeof theirs === 'function') {
      merged[key] = (event: { defaultPrevented?: boolean }, ...rest: unknown[]) => {
        ;(theirs as (...args: unknown[]) => void)(event, ...rest)
        if (!event?.defaultPrevented) (ours as (...args: unknown[]) => void)(event, ...rest)
      }
    }
  }
  merged.className = cx(slot.className as string | undefined, child.className as string | undefined) || undefined
  if (slot.style || child.style) merged.style = { ...(slot.style as CSSProperties), ...(child.style as CSSProperties) }
  return merged
}

/**
 * Renders the caller's single child element with DIYA's props merged in; powers `asChild`.
 * `<Button asChild><Link href="/billing">Billing</Link></Button>` renders the Link, styled as a Button.
 * A function, not a component, so a forwarded ref reaches the child on React 18 too.
 */
export function renderSlot(children: ReactNode, slotProps: AnyProps, ref?: Ref<unknown>): ReactElement | null {
  const child = Children.only(children)
  if (!isValidElement(child)) return null
  const merged = mergeSlotProps(slotProps, child.props as AnyProps)
  const theirRef = childRef(child)
  const combined = ref && theirRef ? composeRefs(ref, theirRef) : (ref ?? theirRef)
  if (combined) merged.ref = combined
  return cloneElement(child, merged)
}

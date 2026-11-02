import * as React from 'react'
import { Children, cloneElement, isValidElement, version, type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { cx } from './cx.js'

type AnyProps = Record<string, unknown>

// In development, a Server Component hands elements to a client component as
// lazy references, which Children.only rejects; React 19's `use` unwraps them.
// The name is looked up at run time so React 18 builds don't expect the export.
const use = (React as unknown as AnyProps)[' use '.trim()] as (<T>(usable: PromiseLike<T>) => T) | undefined
const lazyType = Symbol.for('react.lazy')

/** The caller's single child element, unwrapped first if it arrived lazily from a Server Component. */
export function onlyChild(children: ReactNode): ReactNode {
  const node = children as { $$typeof?: symbol; _payload?: PromiseLike<ReactNode> } | null
  if (use && node && typeof node === 'object' && node.$$typeof === lazyType && typeof node._payload?.then === 'function') return Children.only(use(node._payload))
  return Children.only(children)
}

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
  const child = onlyChild(children)
  if (!isValidElement(child)) return null
  const merged = mergeSlotProps(slotProps, child.props as AnyProps)
  const theirRef = childRef(child)
  const combined = ref && theirRef ? composeRefs(ref, theirRef) : (ref ?? theirRef)
  if (combined) merged.ref = combined
  return cloneElement(child, merged)
}

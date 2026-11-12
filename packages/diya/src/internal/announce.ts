// A field's error announcement goes through the page's toast stack, whose polite live region
// follows an open modal. It reaches the stack by the store's protocol (toast/queue.ts): this
// React's store, its optional `say`, set by the active stack. Without a stack, nothing is said.
import { createElement } from 'react'

const KEY = Symbol.for('@idyeah/diya/toast@1')

/** Says `text` politely through the page stack's live region; with no stack, nothing. `node` is the field it's about: inside the app's own modal dialog, the region follows it there. */
export function announcePolite(text: string, node?: Element | null) {
  if (typeof window === 'undefined') return
  const stores = (globalThis as unknown as Record<symbol, unknown>)[KEY]
  const store = stores instanceof WeakMap ? (stores.get(createElement) as { say?: ((text: string, options?: { node?: Element | null }) => void) | null } | undefined) : undefined
  store?.say?.(text, { node })
}

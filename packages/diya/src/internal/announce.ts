// A field's error announcement goes through the page's toast stack, whose polite live region
// follows an open modal. It reaches the stack by the store's protocol (toast/queue.ts): this
// React's store, its optional `say`, set by the active stack. Without a stack, nothing is said.
import { createElement } from 'react'

const KEY = Symbol.for('@idyeah/diya/toast@1')

type Voice = { say?: ((text: string, options?: { node?: Element | null; key?: string }) => void) | null; unsay?: ((key: string) => void) | null }
function voice() {
  if (typeof window === 'undefined') return undefined
  const stores = (globalThis as unknown as Record<symbol, unknown>)[KEY]
  return stores instanceof WeakMap ? (stores.get(createElement) as Voice | undefined) : undefined
}

/** Says `text` politely through the page stack's live region; with no stack, nothing. `node` is the field it's about (inside the app's own modal dialog, the region follows it there); `key` names the words, to take them back. */
export function announcePolite(text: string, node?: Element | null, key?: string) {
  voice()?.say?.(text, { node, key })
}

/** Takes the words said under `key` out of the region, if they're still there (G10). */
export function forgetPolite(key: string) {
  voice()?.unsay?.(key)
}

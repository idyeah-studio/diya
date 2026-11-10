import { track } from '@vercel/analytics'
import { componentIds, patternIds } from './catalog-route'

/*
 * "Code taken": one Vercel Web Analytics event each time someone copies or
 * downloads code for a component, pattern or screen, so we see which ones
 * people use. Two properties (the Pro plan's limit), both from our own
 * catalog: what it was and how it was taken. No free text, nothing personal.
 * The privacy page says so.
 */

export const CODE_TAKEN = 'Code taken'

export type CodeAction = 'copy' | 'download'

/** `component/button`, `pattern/table`, `screen/dashboard`, `install/npm` or `install/create-diya`. */
const ITEM = /^(component|pattern|screen|install)\/[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The event's `item` for a catalog component or pattern id, or null for anything else. */
export function catalogItem(id: string): string | null {
  if ((componentIds as readonly string[]).includes(id)) return `component/${id}`
  if ((patternIds as readonly string[]).includes(id)) return `pattern/${id}`
  return null
}

/**
 * Counts one copy or download. Call it after the code is on the clipboard or
 * saved; it never throws and never waits, so it can't break or slow either.
 */
export function codeTaken(item: string | null | undefined, action: CodeAction) {
  if (!item || !ITEM.test(item)) return
  try {
    track(CODE_TAKEN, { item, action })
  } catch {
    // Counting is a nicety; the copy has already happened.
  }
}

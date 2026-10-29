/**
 * Built-in strings, by component. Each component that has strings adds its
 * own entry (see its messages module), so a bundle types exactly the
 * components it contains. Values are strings, or functions for strings that
 * interpolate values.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DiyaMessages {}
/** Override any subset: `{ table: { emptyTitle: 'Nothing here' } }`. */
export type DiyaMessagesInput = { [K in keyof DiyaMessages]?: Partial<DiyaMessages[K]> }

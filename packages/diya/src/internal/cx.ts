/** Joins class names, skipping empty ones, so a caller's className never leaves stray spaces. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}

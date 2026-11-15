// DIYA's developer warnings: plain English in the console, never message keys. Every call site
// sits behind `process.env.NODE_ENV !== 'production'`, which bundlers replace, so production
// builds carry neither the check nor the words. (Not a `typeof process` guard: after a bundler's
// define, `typeof process` is still 'undefined' in the browser and the warning would never show.)

const said = new Set<string>()

/** Prints a development warning. */
export function warn(message: string) {
  if (process.env.NODE_ENV !== 'production') console.warn(message)
}

/** Prints a development warning once per page load. */
export function warnOnce(message: string) {
  if (process.env.NODE_ENV !== 'production') {
    if (said.has(message)) return
    said.add(message)
    console.warn(message)
  }
}

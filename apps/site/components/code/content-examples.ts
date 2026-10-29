/** The code Prose and Code Block show in the catalog and in Get code: one helper, with a line long enough to scroll. */
export const FORMAT_FILE = 'lib/format.ts'
export const FORMAT_SOURCE = `export const formatAmount = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)`
export const INSTALL_COMMAND = 'npm install @idyeah/diya'

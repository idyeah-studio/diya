import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { accounts, initialTransactions, type DateRange } from './finance'

const october = { start: '2026-10-01', end: '2026-10-31' }
const september = { start: '2026-09-01', end: '2026-09-30' }
const popoverDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const usd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
const centsFromCell = (value: string | null) => Math.round(Number((value ?? '').replace(/[^\d.-]/g, '')) * 100)

function csvRecords(text: string) {
  const rows: string[][] = []
  let cells: string[] = [], cell = '', quoted = false
  for (let index = 0; index < text.length; index++) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index++ }
      else quoted = !quoted
    } else if (character === ',' && !quoted) { cells.push(cell); cell = '' }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index++
      cells.push(cell); rows.push(cells); cells = []; cell = ''
    } else cell += character
  }
  if (cell || cells.length) { cells.push(cell); rows.push(cells) }
  expect(quoted).toBe(false)
  return rows
}

// Independent oracle over raw fixture records, rather than production selectors.
function expectedReport(range: DateRange, accountId = 'all') {
  const scoped = initialTransactions.filter(row => accountId === 'all' || row.accountId === accountId)
  const rows = scoped.filter(row => row.date >= range.start && row.date <= range.end)
  const settled = rows.filter(row => row.status === 'settled')
  const incoming = settled.filter(row => row.type === 'incoming').reduce((sum, row) => sum + row.amountCents, 0)
  const outgoing = settled.filter(row => row.type === 'outgoing').reduce((sum, row) => sum + row.amountCents, 0)
  const closing = accounts.filter(account => accountId === 'all' || account.id === accountId).reduce((sum, account) => sum + account.openingBalanceCents, 0)
    + scoped.filter(row => row.status === 'settled' && row.date <= range.end).reduce((sum, row) => sum + (row.type === 'incoming' ? row.amountCents : -row.amountCents), 0)
  const receivables = scoped.filter(row => row.type === 'incoming' && row.status !== 'settled' && row.date <= range.end).reduce((sum, row) => sum + row.amountCents, 0)
  return { rows, incoming, outgoing, closing, receivables }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  window.localStorage.clear()
  // Give the real installed SVG chart engine a measurable host. HappyDOM has no layout;
  // the assertions below reconcile actual public DataViz data tables, not SVG pixels.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('diya-data-viz') ? 640 : 0 })
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('diya-data-viz') ? 240 : 0 })
  Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, writable: true, value: undefined })
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
    this.open = true
    this.setAttribute('open', '')
    this.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')?.focus()
  })
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (this: HTMLDialogElement) {
    this.open = false
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  if (popoverDescriptor) Object.defineProperty(HTMLElement.prototype, 'showPopover', popoverDescriptor)
  else delete (HTMLElement.prototype as unknown as { showPopover?: unknown }).showPopover
})

function ledger(name = 'Transactions') { return screen.getByRole('table', { name }) }
function ledgerRows(name = 'Transactions') {
  return within(ledger(name)).getAllByRole('row').filter(row => within(row).queryByRole('checkbox', { name: /^Select / }) && !within(row).queryByRole('checkbox', { name: 'Select this page' }))
}
function metric(name: string) { return screen.getByRole('region', { name }) }
function reportText() { return ['Cash balance', 'Money in', 'Money out', 'Receivables due'].map(name => metric(name).textContent) }
function expectReport(range: DateRange, accountId = 'all') {
  const expected = expectedReport(range, accountId)
  for (const [label, cents] of [['Cash balance', expected.closing], ['Money in', expected.incoming], ['Money out', expected.outgoing], ['Receivables due', expected.receivables]] as const) expect(metric(label).textContent).toContain(usd(cents))
  expect(ledgerRows()).toHaveLength(expected.rows.length)
  return expected
}
async function showChartData(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: 'Cash flow' })
  for (const button of screen.queryAllByRole('button', { name: 'Show data table' })) await user.click(button)
}
function expectChartTotals(range: DateRange, accountId = 'all') {
  const expected = expectedReport(range, accountId)
  const flowRows = within(screen.getByRole('table', { name: 'Cash flow values' })).getAllByRole('row').slice(1)
  const totals = flowRows.reduce((sum, row) => {
    const cells = within(row).getAllByRole('cell')
    return [sum[0] + centsFromCell(cells[0].textContent), sum[1] + centsFromCell(cells[1].textContent)]
  }, [0, 0])
  expect(totals).toEqual([expected.incoming, expected.outgoing])
  const expenseRows = within(screen.getByRole('table', { name: 'Expense category values' })).getAllByRole('row').slice(1)
  expect(expenseRows.reduce((sum, row) => sum + centsFromCell(within(row).getByRole('cell').textContent), 0)).toBe(expected.outgoing)
}
async function chooseFilter(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const trigger = screen.getAllByRole('button', { name: new RegExp(`^${label}(?::|$)`) }).find(button => button.getAttribute('aria-haspopup') === 'menu')
  expect(trigger).toBeTruthy()
  await user.click(trigger!)
  await user.click(screen.getByRole('menuitemradio', { name: value }))
}
async function searchReference(user: ReturnType<typeof userEvent.setup>, value: string) {
  const search = screen.getByRole('searchbox', { name: 'Search transactions' })
  await user.clear(search)
  if (value) await user.type(search, value)
}
async function details(user: ReturnType<typeof userEvent.setup>, row: HTMLElement) {
  await user.click(within(row).getByRole('button', { name: /^Actions for / }))
  await user.click(screen.getByRole('menuitem', { name: 'Transaction details' }))
  return screen.getByRole('dialog', { name: 'Transaction details' })
}
async function navigate(user: ReturnType<typeof userEvent.setup>, name: string) {
  const destination = within(screen.getByRole('navigation', { name: 'Finance navigation' })).getByRole('button', { name })
  await user.click(destination)
  expect(destination.getAttribute('aria-current')).toBe('page')
}
async function octoberCalendar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Reporting date range/ }))
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const target = 2026 * 12 + 9
  let calendar = screen.getByRole('group', { name: 'Choose date' })
  const [month, year] = calendar.querySelector('.diya-calendar-heading strong')!.textContent!.split(' ')
  let current = Number(year) * 12 + monthNames.indexOf(month)
  // The real DatePicker starts at the browser's month. Navigate from its visible
  // heading so these fixed-fixture tests do not silently depend on the live clock.
  while (current !== target) {
    const forward = current < target
    await user.click(within(calendar).getByRole('button', { name: forward ? 'Next month' : 'Previous month' }))
    current += forward ? 1 : -1
    calendar = screen.getByRole('group', { name: 'Choose date' })
  }
  return calendar
}

describe('financial dashboard using the installed SDK', () => {
  it('reconciles dense report rows, KPIs and accessible charts through account and period changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    expectReport(october)
    await showChartData(user)
    expectChartTotals(october)
    expect(within(screen.getByRole('table', { name: 'Cash flow values' })).getAllByRole('row')).toHaveLength(24)
    expect(document.querySelectorAll('.diya-data-viz svg').length).toBeGreaterThanOrEqual(2)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Account' }), 'operating')
    expectReport(october, 'operating')
    await showChartData(user)
    expectChartTotals(october, 'operating')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reporting period' }), '2026-09')
    expectReport(september, 'operating')
    await showChartData(user)
    expectChartTotals(september, 'operating')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Account' }), 'all')
    expectReport(september)
    await showChartData(user)
    expectChartTotals(september)
    await user.click(screen.getByRole('button', { name: 'Weekly' }))
    expectChartTotals(september)
    expect(within(screen.getByRole('table', { name: 'Cash flow values' })).getAllByRole('row')).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: 'Daily' }))
    expectChartTotals(september)
    expect(within(screen.getByRole('table', { name: 'Cash flow values' })).getAllByRole('row')).toHaveLength(31)
  })

  it('applies a complete custom range atomically and keeps a partial calendar choice out of the report', async () => {
    const user = userEvent.setup()
    render(<App />)
    const before = reportText()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reporting period' }), 'custom')
    let calendar = await octoberCalendar(user)
    await user.click(within(calendar).getByRole('button', { name: 'Oct 10, 2026' }))
    expect(reportText()).toEqual(before)
    expect(ledgerRows()).toHaveLength(26)
    calendar = screen.getByRole('group', { name: 'Choose date' })
    await user.click(within(calendar).getByRole('button', { name: 'Oct 16, 2026' }))
    await user.click(screen.getByRole('button', { name: 'Apply range' }))
    expectReport({ start: '2026-10-10', end: '2026-10-16' })
    await showChartData(user)
    expectChartTotals({ start: '2026-10-10', end: '2026-10-16' })
  })

  it('projects historical due-state consistently in the ledger and details at the labeled cutoff', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(metric('Cash balance').textContent).toContain('as of Oct 23')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reporting period' }), '2026-09')
    expectReport(september)
    expect(metric('Cash balance').textContent).toContain('as of Sep 30')
    const invoice = ledgerRows().find(row => row.textContent?.includes('INV-260923'))!
    expect(invoice.textContent).toContain('Pending')
    expect(invoice.textContent).not.toContain('Overdue')
    const drawer = await details(user, invoice)
    expect(within(drawer).getByText('Pending')).toBeTruthy()
    expect(within(drawer).queryByText('Overdue')).toBeNull()
    await user.click(within(drawer).getByRole('button', { name: 'Close' }))
    await navigate(user, 'Receivables')
    expect(screen.getByText('All unpaid invoices issued through Sep 30, including earlier periods.')).toBeTruthy()
    expect(ledgerRows('Receivables')).toHaveLength(1)
    expect(ledgerRows('Receivables')[0].textContent).toContain('Pending')
    await navigate(user, 'Overview')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reporting period' }), '2026-10')
    expect(metric('Cash balance').textContent).toContain('as of Oct 23')
    expectReport(october)
  })

  it('renders future-only ranges without invented points or movement while retaining the known snapshot balance', async () => {
    const user = userEvent.setup()
    render(<App />)
    const known = expectedReport(october)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reporting period' }), 'custom')
    let calendar = await octoberCalendar(user)
    await user.click(within(calendar).getByRole('button', { name: 'Oct 24, 2026' }))
    calendar = screen.getByRole('group', { name: 'Choose date' })
    await user.click(within(calendar).getByRole('button', { name: 'Oct 31, 2026' }))
    await user.click(screen.getByRole('button', { name: 'Apply range' }))
    expect(ledgerRows()).toHaveLength(0)
    expect(screen.getByText('No matching transactions')).toBeTruthy()
    expect(metric('Cash balance').textContent).toContain(usd(known.closing))
    expect(metric('Cash balance').textContent).toContain('as of Oct 23')
    expect(metric('Money in').textContent).toContain('$0.00')
    expect(metric('Money out').textContent).toContain('$0.00')
    expect(metric('Receivables due').textContent).toContain(usd(known.receivables))
    await showChartData(user)
    for (const name of ['Cash flow values', 'Expense category values']) expect(within(screen.getByRole('table', { name })).getAllByRole('row')).toHaveLength(1)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reporting period' }), '2026-10')
    expectReport(october)
    expectChartTotals(october)
  })

  it('searches, filters, sorts and opens details from the actual ledger without changing overview totals', async () => {
    const user = userEvent.setup()
    render(<App />)
    const before = reportText()
    await searchReference(user, 'INV-261014')
    expect((screen.getByRole('searchbox', { name: 'Search transactions' }) as HTMLInputElement).value).toBe('INV-261014')
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Search transactions' }))
    expect(ledgerRows()).toHaveLength(1)
    expect(ledgerRows()[0].textContent).toContain('Juniper Health')
    const drawer = await details(user, ledgerRows()[0])
    expect(drawer.textContent).toContain('INV-261014')
    expect(drawer.textContent).toContain('Engineering')
    fireEvent(drawer, new Event('cancel', { bubbles: false, cancelable: true }))
    await searchReference(user, '')
    await chooseFilter(user, 'Status', 'Overdue')
    expect(ledgerRows()).toHaveLength(4)
    await chooseFilter(user, 'Type', 'Money out')
    expect(ledgerRows()).toHaveLength(2)
    expect(ledgerRows().every(row => row.textContent?.includes('Overdue'))).toBe(true)
    await chooseFilter(user, 'Status', 'All')
    await chooseFilter(user, 'Type', 'All')
    await user.click(within(ledger()).getByRole('button', { name: 'Amount' }))
    const actual = ledgerRows().map(row => {
      const cells = within(row).getAllByRole('cell')
      const amount = cells.find(cell => /^[+−-]?\$[\d,.]+$/.test(cell.textContent?.trim() ?? ''))
      return centsFromCell(amount?.textContent ?? null)
    })
    expect(actual).toEqual([...actual].sort((a, b) => a - b))
    expect(new Set(actual).size).toBeGreaterThan(10)
    await navigate(user, 'Overview')
    expect(reportText()).toEqual(before)
  })

  it('moves from details to one memo editor, saves real local data and updates search and reopened details', async () => {
    const user = userEvent.setup()
    render(<App />)
    const before = reportText()
    await searchReference(user, 'INV-261014')
    const drawer = await details(user, ledgerRows()[0])
    expect(drawer.textContent).toContain('INV-261014')
    await user.click(within(drawer).getByRole('button', { name: 'Edit memo' }))
    const editor = await screen.findByRole('dialog', { name: 'Edit transaction' })
    expect(document.querySelectorAll('dialog[open]')).toHaveLength(1)
    const memo = within(editor).getByRole('textbox', { name: 'Memo' })
    await user.clear(memo)
    await user.type(memo, 'Client reviewed the patient portal delivery.')
    await user.click(within(editor).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit transaction' })).toBeNull())
    expect(initialTransactions.find(row => row.invoiceRef === 'INV-261014')?.notes).toBe('')
    expect(document.activeElement?.isConnected).toBe(true)
    expect(document.activeElement?.closest('dialog:not([open])')).toBeNull()
    await searchReference(user, 'Client reviewed the patient portal delivery.')
    expect(ledgerRows()).toHaveLength(1)
    expect(ledgerRows()[0].textContent).toContain('Client reviewed the patient portal delivery.')
    const reopened = await details(user, ledgerRows()[0])
    expect(reopened.textContent).toContain('Client reviewed the patient portal delivery.')
    fireEvent(reopened, new Event('cancel', { bubbles: false, cancelable: true }))
    expect(screen.queryByRole('dialog', { name: 'Transaction details' })).toBeNull()
    await navigate(user, 'Overview')
    expect(reportText()).toEqual(before)
    expect(document.querySelector('button button, button a[href], a[href] a[href], form form')).toBeNull()
  })

  it('marks selected rows reviewed through the real Table callback and keeps cash amounts unchanged', async () => {
    const user = userEvent.setup()
    render(<App />)
    const before = reportText()
    const initiallyReviewed = ledgerRows().filter(row => within(row).queryByText('Reviewed')).length
    const rows = ledgerRows().filter(row => within(row).queryByText('Needs review')).slice(0, 2)
    expect(rows).toHaveLength(2)
    for (const row of rows) await user.click(within(row).getByRole('checkbox', { name: /^Select / }))
    await user.click(screen.getByRole('button', { name: 'Mark reviewed' }))
    expect(screen.queryByRole('button', { name: 'Mark reviewed' })).toBeNull()
    expect(screen.queryByText('2 selected', { exact: true })).toBeNull()
    expect(ledgerRows().filter(row => within(row).queryByText('Reviewed'))).toHaveLength(initiallyReviewed + 2)
    expect(reportText()).toEqual(before)
    const drawer = await details(user, ledgerRows().find(row => row.textContent?.includes('Reviewed'))!)
    expect(drawer.textContent).toContain('Reviewed')
  })

  it('counts review notifications in the selected account/period and opens its ledger with search cleared', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reporting period' }), '2026-09')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Account' }), 'operating')
    const scoped = initialTransactions.filter(row => row.accountId === 'operating' && row.date >= september.start && row.date <= september.end)
    // Stable unreviewed fixture references, independent of the App's initial flag calculation.
    const needsReview = ['INV-260901', 'INV-260911', 'PAY-260917', 'INV-260923', 'WB-260925']
    const actualNeedsReview = ledgerRows().filter(row => within(row).queryByText('Needs review')).map(row => scoped.find(record => row.textContent?.includes(record.invoiceRef))!.invoiceRef)
    expect(actualNeedsReview.sort()).toEqual([...needsReview].sort())
    await searchReference(user, 'INV-260923')
    expect(ledgerRows()).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    const drawer = screen.getByRole('dialog', { name: 'Notifications' })
    expect(drawer.textContent).toContain('As of Sep 30, 2026')
    const reviewAction = within(drawer).getByRole('button', { name: /^5 transactions need review/ })
    expect(reviewAction.textContent).toContain('In the selected reporting period.')
    await user.click(reviewAction)
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).toBeNull()
    expect((screen.getByRole('searchbox', { name: 'Search transactions' }) as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('heading', { name: 'Transactions', level: 1 })).toBeTruthy()
    expect(ledgerRows()).toHaveLength(scoped.length)
    expect(ledgerRows()).toHaveLength(9)
    for (const record of scoped) expect(within(ledger()).getByRole('checkbox', { name: `Select ${record.invoiceRef}` })).toBeTruthy()
  })

  it('changes actual scoped appearance from settings while preserving USD and dashboard state', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const before = reportText()
    await navigate(user, 'Settings')
    const provider = container.querySelector<HTMLElement>('.diya-root')!
    expect(provider.dataset.theme).toBe('light')
    expect(provider.dataset.glass).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    expect(provider.dataset.theme).toBe('dark')
    await user.click(screen.getByRole('switch', { name: /Glass/ }))
    expect(provider.dataset.glass).toBe('false')
    await user.click(screen.getByRole('switch', { name: /Glass/ }))
    expect(provider.dataset.glass).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Light' }))
    expect(provider.dataset.theme).toBe('light')
    expect(provider.dataset.glass).toBe('true')
    expect((screen.getByRole('textbox', { name: 'Base currency' }) as HTMLInputElement).value).toBe('USD · US Dollar')
    await navigate(user, 'Overview')
    expect(reportText()).toEqual(before)
    expectReport(october)
    expect(provider.dataset.glass).toBe('true')
  })

  it('reconciles outstanding views with carried unpaid invoices instead of losing prior-month receivables', async () => {
    const user = userEvent.setup()
    render(<App />)
    const outstanding = initialTransactions.filter(row => row.status !== 'settled' && row.date <= october.end)
    await navigate(user, 'Receivables')
    expect(ledgerRows('Receivables')).toHaveLength(outstanding.filter(row => row.type === 'incoming').length)
    expect(within(ledger('Receivables')).getByRole('checkbox', { name: /INV-260923/ })).toBeTruthy()
    await navigate(user, 'Payables')
    expect(ledgerRows('Payables')).toHaveLength(outstanding.filter(row => row.type === 'outgoing').length)
    expect(within(ledger('Payables')).getByRole('checkbox', { name: /WB-260925/ })).toBeTruthy()
    await navigate(user, 'Overview')
    expectReport(october)
  })

  it('keeps edited data on restore cancellation and replaces it only after explicit local-data confirmation', async () => {
    const user = userEvent.setup()
    render(<App />)
    await searchReference(user, 'INV-261014')
    await user.click(within(ledgerRows()[0]).getByRole('button', { name: /^Actions for / }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit memo' }))
    let editor = await screen.findByRole('dialog', { name: 'Edit transaction' })
    await user.type(within(editor).getByRole('textbox', { name: 'Memo' }), 'Retain this local memo until restoration is confirmed.')
    await user.click(within(editor).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit transaction' })).toBeNull())
    await navigate(user, 'Settings')
    await user.click(screen.getByRole('button', { name: 'Restore sample data' }))
    let confirmation = screen.getByRole('dialog', { name: /^Restore sample data/ })
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
    await navigate(user, 'Transactions')
    await searchReference(user, 'Retain this local memo until restoration is confirmed.')
    expect(ledgerRows()).toHaveLength(1)
    await navigate(user, 'Settings')
    await user.click(screen.getByRole('button', { name: 'Restore sample data' }))
    confirmation = screen.getByRole('dialog', { name: /^Restore sample data/ })
    expect(document.querySelectorAll('dialog[open]')).toHaveLength(1)
    await user.click(within(confirmation).getByRole('button', { name: /^Restore/ }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Restore sample data/ })).toBeNull())
    await navigate(user, 'Transactions')
    await searchReference(user, 'Retain this local memo until restoration is confirmed.')
    expect(ledgerRows()).toHaveLength(0)
    await searchReference(user, 'INV-261014')
    expect(ledgerRows()).toHaveLength(1)
    await searchReference(user, '')
    await navigate(user, 'Overview')
    expectReport(october)
  })

  it('exports the actual account-scoped ledger with negative numeric amounts and safely quoted caller memo text', async () => {
    const user = userEvent.setup()
    render(<App />)
    await searchReference(user, 'INV-261014')
    await user.click(within(ledgerRows()[0]).getByRole('button', { name: /^Actions for / }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit memo' }))
    const editor = await screen.findByRole('dialog', { name: 'Edit transaction' })
    await user.type(within(editor).getByRole('textbox', { name: 'Memo' }), '=1+1, "caller note"')
    await user.click(within(editor).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit transaction' })).toBeNull())
    await user.selectOptions(screen.getByRole('combobox', { name: 'Account' }), 'operating')
    let exported: Blob | undefined
    let filename = ''
    vi.spyOn(URL, 'createObjectURL').mockImplementation(value => { exported = value as Blob; return 'blob:dashboard-contract' })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { filename = this.download })
    await user.click(screen.getByRole('button', { name: 'Export statement' }))
    expect(exported).toBeDefined()
    expect(filename).toContain('2026-10-01-2026-10-31.csv')
    const [headers, ...records] = csvRecords(await exported!.text())
    expect(headers).toEqual(['Date', 'Reference', 'Counterparty', 'Description', 'Account', 'Category', 'Status', 'Amount (USD)', 'Memo'])
    const expected = expectedReport(october, 'operating').rows
    // The statement follows report scope, independently of the still-visible invoice search.
    expect(records).toHaveLength(expected.length)
    for (const row of expected) {
      const record = records.find(record => record[1] === row.invoiceRef)!
      expect(record).toBeDefined()
      expect(record[7]).toMatch(/^-?\d+\.\d{2}$/)
      expect(Number(record[7])).toBe((row.type === 'incoming' ? row.amountCents : -row.amountCents) / 100)
    }
    expect(records.some(record => record[7].startsWith('-'))).toBe(true)
    expect(records.find(record => record[1] === 'INV-261014')![8]).toBe('\'=1+1, "caller note"')
    expect(initialTransactions.find(row => row.invoiceRef === 'INV-261014')?.notes).toBe('')
  })
})

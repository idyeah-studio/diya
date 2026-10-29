/** Deterministic cash-basis sample ledger. No bank, payment or accounting service is connected. */
export type TransactionType = 'incoming' | 'outgoing'
export type TransactionStatus = 'settled' | 'pending' | 'overdue'
export type DateRange = { start: string; end: string }
export type Account = { id: string; name: string; description: string; openingBalanceCents: number; currency: 'USD' }
export type Counterparty = { id: string; name: string; kind: 'customer' | 'vendor' }
export type Department = { id: string; name: string }
export type Category = { id: string; name: string; type: TransactionType }
export type FinanceTransaction = {
  id: string
  date: string
  postedAt: string
  dueDate?: string
  invoiceRef: string
  description: string
  notes: string
  amountCents: number
  type: TransactionType
  status: TransactionStatus
  accountId: string
  counterpartyId: string
  departmentId: string
  categoryId: string
}
export type Transaction = FinanceTransaction

export const ledgerStart = '2026-01-01'
export const ledgerAsOf = '2026-10-23'
export const selectedPeriod: DateRange = { start: '2026-10-01', end: '2026-10-31' }

export const accounts: readonly Account[] = [
  { id: 'operating', name: 'Operating account', description: 'Primary receipts and operating costs', openingBalanceCents: 6_850_000, currency: 'USD' },
  { id: 'reserve', name: 'Reserve account', description: 'Retainer and consulting receipts', openingBalanceCents: 3_200_000, currency: 'USD' },
  { id: 'clearing', name: 'Payment clearing', description: 'Card receipts, software and fees', openingBalanceCents: 950_000, currency: 'USD' },
]
export const counterparties: readonly Counterparty[] = [
  { id: 'atlas', name: 'Atlas Robotics', kind: 'customer' },
  { id: 'juniper', name: 'Juniper Health', kind: 'customer' },
  { id: 'cinder', name: 'Cinder Coffee', kind: 'customer' },
  { id: 'harbor', name: 'Harbor Tools', kind: 'customer' },
  { id: 'oriel', name: 'Oriel Learning', kind: 'customer' },
  { id: 'folio', name: 'Folio Software', kind: 'vendor' },
  { id: 'gather', name: 'Gather Workspace', kind: 'vendor' },
  { id: 'westbridge', name: 'Westbridge Design', kind: 'vendor' },
  { id: 'cloudline', name: 'Cloudline Hosting', kind: 'vendor' },
  { id: 'transit', name: 'Transit Travel', kind: 'vendor' },
  { id: 'signal', name: 'Signal Telecom', kind: 'vendor' },
  { id: 'papertrail', name: 'Papertrail Office', kind: 'vendor' },
  { id: 'studio-team', name: 'Studio team', kind: 'vendor' },
  { id: 'mosaic', name: 'Mosaic Payments', kind: 'vendor' },
]
export const departments: readonly Department[] = [
  { id: 'design', name: 'Design' }, { id: 'engineering', name: 'Engineering' },
  { id: 'operations', name: 'Operations' }, { id: 'sales', name: 'Sales' },
]
export const categories: readonly Category[] = [
  { id: 'project', name: 'Project revenue', type: 'incoming' },
  { id: 'retainer', name: 'Retainer revenue', type: 'incoming' },
  { id: 'consulting', name: 'Consulting revenue', type: 'incoming' },
  { id: 'software', name: 'Software', type: 'outgoing' },
  { id: 'workspace', name: 'Workspace', type: 'outgoing' },
  { id: 'contractors', name: 'Contractors', type: 'outgoing' },
  { id: 'hosting', name: 'Hosting', type: 'outgoing' },
  { id: 'travel', name: 'Travel', type: 'outgoing' },
  { id: 'telecom', name: 'Telecom', type: 'outgoing' },
  { id: 'office', name: 'Office supplies', type: 'outgoing' },
  { id: 'payroll', name: 'Payroll', type: 'outgoing' },
  { id: 'fees', name: 'Payment fees', type: 'outgoing' },
]
export const accountById = Object.fromEntries(accounts.map(item => [item.id, item])) as Record<string, Account>
export const counterpartyById = Object.fromEntries(counterparties.map(item => [item.id, item])) as Record<string, Counterparty>
export const departmentById = Object.fromEntries(departments.map(item => [item.id, item])) as Record<string, Department>
export const categoryById = Object.fromEntries(categories.map(item => [item.id, item])) as Record<string, Category>

type Seed = [id: string, date: string, time: string, type: TransactionType, status: TransactionStatus, account: string, party: string, category: string, department: string, cents: number, reference: string, description: string, due?: string]
const seeds: Seed[] = [
  ['jan-001', '2026-01-08', '09:42', 'incoming', 'settled', 'operating', 'atlas', 'project', 'design', 920_000, 'INV-260108', 'Product discovery milestone'],
  ['jan-002', '2026-01-19', '14:18', 'outgoing', 'settled', 'operating', 'westbridge', 'contractors', 'design', 245_000, 'WB-260119', 'Discovery workshop support'],
  ['feb-001', '2026-02-10', '10:26', 'incoming', 'settled', 'reserve', 'juniper', 'retainer', 'design', 780_000, 'INV-260210', 'Design support retainer'],
  ['feb-002', '2026-02-18', '11:35', 'outgoing', 'settled', 'operating', 'gather', 'workspace', 'operations', 187_500, 'GW-260218', 'Workspace and meeting rooms'],
  ['mar-001', '2026-03-09', '13:14', 'incoming', 'settled', 'operating', 'cinder', 'project', 'design', 1_260_000, 'INV-260309', 'Storefront design milestone'],
  ['mar-002', '2026-03-21', '15:07', 'outgoing', 'settled', 'operating', 'westbridge', 'contractors', 'design', 315_000, 'WB-260321', 'Storefront illustration work'],
  ['apr-001', '2026-04-07', '09:52', 'incoming', 'settled', 'reserve', 'oriel', 'consulting', 'sales', 890_000, 'INV-260407', 'Research and product strategy'],
  ['apr-002', '2026-04-20', '12:22', 'outgoing', 'settled', 'operating', 'gather', 'workspace', 'operations', 192_000, 'GW-260420', 'Workspace and meeting rooms'],
  ['may-001', '2026-05-11', '11:43', 'incoming', 'settled', 'operating', 'harbor', 'project', 'engineering', 1_475_000, 'INV-260511', 'Portal implementation milestone'],
  ['may-002', '2026-05-22', '16:12', 'outgoing', 'settled', 'operating', 'westbridge', 'contractors', 'engineering', 422_000, 'WB-260522', 'Portal development support'],
  ['jun-001', '2026-06-08', '10:08', 'incoming', 'settled', 'operating', 'atlas', 'project', 'design', 1_030_000, 'INV-260608', 'Product design milestone'],
  ['jun-002', '2026-06-19', '14:46', 'outgoing', 'settled', 'operating', 'gather', 'workspace', 'operations', 236_000, 'GW-260619', 'Workspace and event room'],
  ['jul-001', '2026-07-09', '13:38', 'incoming', 'settled', 'operating', 'juniper', 'project', 'engineering', 1_390_000, 'INV-260709', 'Patient portal milestone'],
  ['jul-002', '2026-07-23', '09:23', 'outgoing', 'settled', 'operating', 'studio-team', 'payroll', 'operations', 510_000, 'PAY-260723', 'Team payroll'],
  ['aug-001', '2026-08-10', '11:17', 'incoming', 'settled', 'clearing', 'cinder', 'project', 'design', 1_145_000, 'INV-260810', 'Campaign design milestone'],
  ['aug-002', '2026-08-21', '15:44', 'outgoing', 'settled', 'operating', 'westbridge', 'contractors', 'design', 378_000, 'WB-260821', 'Campaign production support'],
  ['sep-001', '2026-09-01', '09:18', 'incoming', 'settled', 'operating', 'juniper', 'retainer', 'design', 650_000, 'INV-260901', 'September support retainer'],
  ['sep-002', '2026-09-02', '10:24', 'outgoing', 'settled', 'clearing', 'folio', 'software', 'design', 8_900, 'FS-260902', 'Design software licenses'],
  ['sep-003', '2026-09-03', '13:42', 'incoming', 'settled', 'operating', 'atlas', 'project', 'engineering', 1_245_000, 'INV-260903', 'Dashboard implementation milestone'],
  ['sep-004', '2026-09-04', '11:08', 'outgoing', 'settled', 'operating', 'gather', 'workspace', 'operations', 260_000, 'GW-260904', 'September workspace'],
  ['sep-005', '2026-09-05', '16:13', 'outgoing', 'settled', 'clearing', 'cloudline', 'hosting', 'engineering', 6_800, 'CH-260905', 'Application hosting'],
  ['sep-006', '2026-09-07', '14:37', 'outgoing', 'settled', 'operating', 'westbridge', 'contractors', 'design', 325_000, 'WB-260907', 'Design system support'],
  ['sep-007', '2026-09-08', '09:46', 'incoming', 'settled', 'reserve', 'oriel', 'consulting', 'sales', 420_000, 'INV-260908', 'Learning platform research'],
  ['sep-008', '2026-09-09', '12:06', 'outgoing', 'settled', 'clearing', 'mosaic', 'fees', 'operations', 14_320, 'MP-260909', 'Processing fees'],
  ['sep-009', '2026-09-11', '10:52', 'incoming', 'settled', 'operating', 'cinder', 'project', 'design', 875_000, 'INV-260911', 'Campaign review milestone'],
  ['sep-010', '2026-09-12', '15:29', 'outgoing', 'settled', 'clearing', 'signal', 'telecom', 'operations', 12_900, 'ST-260912', 'Team connectivity'],
  ['sep-011', '2026-09-14', '13:17', 'outgoing', 'settled', 'clearing', 'transit', 'travel', 'sales', 48_560, 'TT-260914', 'Client workshop travel'],
  ['sep-012', '2026-09-16', '11:48', 'incoming', 'settled', 'reserve', 'harbor', 'retainer', 'engineering', 590_000, 'INV-260916', 'Portal support retainer'],
  ['sep-013', '2026-09-17', '09:12', 'outgoing', 'settled', 'operating', 'studio-team', 'payroll', 'operations', 615_000, 'PAY-260917', 'Team payroll'],
  ['sep-014', '2026-09-19', '14:23', 'incoming', 'settled', 'operating', 'atlas', 'consulting', 'sales', 310_000, 'INV-260919', 'Product strategy review'],
  ['sep-015', '2026-09-22', '16:05', 'outgoing', 'settled', 'clearing', 'folio', 'software', 'engineering', 26_500, 'FS-260922', 'Engineering software licenses'],
  ['sep-016', '2026-09-23', '10:34', 'incoming', 'overdue', 'operating', 'juniper', 'project', 'engineering', 960_000, 'INV-260923', 'Patient portal review milestone', '2026-09-30'],
  ['sep-017', '2026-09-25', '15:51', 'outgoing', 'pending', 'operating', 'westbridge', 'contractors', 'design', 185_000, 'WB-260925', 'September production support', '2026-10-25'],
  ['sep-018', '2026-09-28', '11:26', 'incoming', 'settled', 'clearing', 'cinder', 'consulting', 'sales', 390_000, 'INV-260928', 'Campaign strategy session'],
  ['oct-001', '2026-10-01', '09:16', 'incoming', 'settled', 'operating', 'juniper', 'retainer', 'design', 650_000, 'INV-261001', 'October support retainer'],
  ['oct-002', '2026-10-01', '11:47', 'outgoing', 'settled', 'clearing', 'folio', 'software', 'design', 8_900, 'FS-261001', 'Design software licenses'],
  ['oct-003', '2026-10-02', '10:29', 'outgoing', 'settled', 'operating', 'gather', 'workspace', 'operations', 260_000, 'GW-261002', 'October workspace'],
  ['oct-004', '2026-10-03', '13:08', 'incoming', 'settled', 'operating', 'atlas', 'project', 'engineering', 1_485_000, 'INV-261003', 'Dashboard delivery milestone'],
  ['oct-005', '2026-10-04', '15:34', 'outgoing', 'settled', 'clearing', 'cloudline', 'hosting', 'engineering', 7_200, 'CH-261004', 'Application hosting'],
  ['oct-006', '2026-10-05', '12:53', 'outgoing', 'settled', 'operating', 'westbridge', 'contractors', 'design', 412_500, 'WB-261005', 'Design system production'],
  ['oct-007', '2026-10-06', '10:18', 'incoming', 'settled', 'operating', 'cinder', 'project', 'design', 935_000, 'INV-261006', 'Storefront delivery milestone'],
  ['oct-008', '2026-10-07', '14:42', 'outgoing', 'settled', 'clearing', 'mosaic', 'fees', 'operations', 18_420, 'MP-261007', 'Processing fees'],
  ['oct-009', '2026-10-08', '09:27', 'incoming', 'settled', 'reserve', 'oriel', 'consulting', 'sales', 515_000, 'INV-261008', 'Learning platform strategy'],
  ['oct-010', '2026-10-09', '16:14', 'outgoing', 'settled', 'clearing', 'signal', 'telecom', 'operations', 12_900, 'ST-261009', 'Team connectivity'],
  ['oct-011', '2026-10-10', '11:09', 'incoming', 'settled', 'reserve', 'harbor', 'retainer', 'engineering', 625_000, 'INV-261010', 'Portal support retainer'],
  ['oct-012', '2026-10-11', '13:46', 'outgoing', 'settled', 'clearing', 'transit', 'travel', 'sales', 76_350, 'TT-261011', 'Client workshop travel'],
  ['oct-013', '2026-10-12', '10:57', 'incoming', 'settled', 'operating', 'atlas', 'consulting', 'sales', 375_000, 'INV-261012', 'Product strategy review'],
  ['oct-014', '2026-10-13', '09:21', 'outgoing', 'settled', 'operating', 'studio-team', 'payroll', 'operations', 680_000, 'PAY-261013', 'Team payroll'],
  ['oct-015', '2026-10-14', '12:32', 'incoming', 'settled', 'operating', 'juniper', 'project', 'engineering', 1_175_000, 'INV-261014', 'Patient portal delivery milestone'],
  ['oct-016', '2026-10-15', '15:18', 'outgoing', 'settled', 'clearing', 'papertrail', 'office', 'operations', 28_750, 'PO-261015', 'Workshop and office supplies'],
  ['oct-017', '2026-10-16', '11:43', 'incoming', 'pending', 'operating', 'cinder', 'consulting', 'sales', 295_000, 'INV-261016', 'Campaign strategy session', '2026-10-28'],
  ['oct-018', '2026-10-17', '14:06', 'outgoing', 'pending', 'operating', 'westbridge', 'contractors', 'design', 230_000, 'WB-261017', 'Release asset production', '2026-10-27'],
  ['oct-019', '2026-10-18', '10:14', 'incoming', 'overdue', 'operating', 'oriel', 'project', 'design', 860_000, 'INV-261018', 'Learning platform design milestone', '2026-10-21'],
  ['oct-020', '2026-10-19', '16:24', 'outgoing', 'settled', 'clearing', 'folio', 'software', 'engineering', 31_200, 'FS-261019', 'Engineering software licenses'],
  ['oct-021', '2026-10-20', '09:38', 'incoming', 'overdue', 'reserve', 'harbor', 'consulting', 'sales', 445_000, 'INV-261020', 'Portal accessibility review', '2026-10-22'],
  ['oct-022', '2026-10-21', '13:12', 'outgoing', 'overdue', 'operating', 'gather', 'workspace', 'operations', 195_000, 'GW-261021', 'Workshop room reservation', '2026-10-22'],
  ['oct-023', '2026-10-22', '10:45', 'incoming', 'pending', 'operating', 'juniper', 'retainer', 'design', 720_000, 'INV-261022', 'Additional support retainer', '2026-10-30'],
  ['oct-024', '2026-10-22', '15:53', 'outgoing', 'pending', 'clearing', 'transit', 'travel', 'sales', 52_400, 'TT-261022', 'Upcoming client workshop travel', '2026-10-29'],
  ['oct-025', '2026-10-23', '11:28', 'incoming', 'settled', 'operating', 'atlas', 'project', 'engineering', 985_000, 'INV-261023', 'Reporting module milestone'],
  ['oct-026', '2026-10-20', '16:35', 'outgoing', 'overdue', 'clearing', 'mosaic', 'fees', 'operations', 20_650, 'MP-261020', 'Additional processing fees', '2026-10-21'],
]
export const initialTransactions: readonly Transaction[] = seeds.map(([id, date, time, type, status, accountId, counterpartyId, categoryId, departmentId, amountCents, invoiceRef, description, dueDate]) => ({ id, date, postedAt: `${date}T${time}:00Z`, dueDate, invoiceRef, description, notes: '', amountCents, type, status, accountId, counterpartyId, categoryId, departmentId })).sort((a, b) => a.postedAt.localeCompare(b.postedAt))

export function signedAmountCents(row: Transaction): number { return row.type === 'incoming' ? row.amountCents : -row.amountCents }
export function formatMoney(cents: number, { signed = false, compact = false }: { signed?: boolean; compact?: boolean } = {}): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', signDisplay: signed ? 'exceptZero' : 'auto', notation: compact ? 'compact' : 'standard', minimumFractionDigits: compact ? 0 : 2, maximumFractionDigits: compact ? 1 : 2 }).format(cents / 100)
}
export function transactionLabel(row: Transaction): string {
  return [row.description, row.invoiceRef, row.notes, counterpartyById[row.counterpartyId]?.name, accountById[row.accountId]?.name, categoryById[row.categoryId]?.name, departmentById[row.departmentId]?.name, row.type, row.status, row.date].filter(Boolean).join(' ')
}
export type TransactionFilters = { dateRange?: DateRange; search?: string; accountId?: string; type?: TransactionType | 'all'; status?: TransactionStatus | 'all' }
export function filterTransactions<T extends Transaction>(rows: readonly T[], filters: TransactionFilters = {}): T[] {
  const query = filters.search?.trim().toLocaleLowerCase('en-US') || ''
  return rows.filter(row => (!filters.dateRange || row.date >= filters.dateRange.start && row.date <= filters.dateRange.end)
    && (!filters.accountId || filters.accountId === 'all' || row.accountId === filters.accountId)
    && (!filters.type || filters.type === 'all' || row.type === filters.type)
    && (!filters.status || filters.status === 'all' || row.status === filters.status)
    && (!query || transactionLabel(row).toLocaleLowerCase('en-US').includes(query)))
}

const dayMs = 86_400_000
function dayNumber(value: string): number {
  const time = Date.parse(`${value}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new RangeError(`Invalid calendar date: ${value}`)
  return time / dayMs
}
function isoDay(value: number): string { return new Date(value * dayMs).toISOString().slice(0, 10) }
function validateRange(range: DateRange): DateRange {
  if (dayNumber(range.end) < dayNumber(range.start)) throw new RangeError('The end date must not precede the start date.')
  return { ...range }
}
export function monthRange(month: string): DateRange {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new RangeError(`Invalid month: ${month}`)
  const start = month + '-01'
  dayNumber(start)
  const date = new Date(start + 'T00:00:00Z')
  return { start, end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10) }
}
/** Full calendar months compare with the previous month; other ranges compare with equal days. */
export function previousPeriod(range: DateRange): DateRange {
  validateRange(range)
  if (range.start.endsWith('-01') && monthRange(range.start.slice(0, 7)).end === range.end) {
    const date = new Date(range.start + 'T00:00:00Z')
    const month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)).toISOString().slice(0, 7)
    return monthRange(month)
  }
  const start = dayNumber(range.start), end = dayNumber(range.end)
  return { start: isoDay(start - (end - start + 1)), end: isoDay(start - 1) }
}

export type PeriodTotals = { incomingCents: number; outgoingCents: number; revenueCents: number; expensesCents: number; netCents: number; settledCount: number; pendingCount: number; overdueCount: number; transactionCount: number }
function totals(rows: readonly Transaction[]): PeriodTotals {
  let incomingCents = 0, outgoingCents = 0, settledCount = 0, pendingCount = 0, overdueCount = 0
  for (const row of rows) {
    if (!Number.isSafeInteger(row.amountCents) || row.amountCents <= 0) throw new RangeError(`Transaction ${row.id} must contain positive integer cents.`)
    if (row.status === 'settled') { settledCount++; if (row.type === 'incoming') incomingCents += row.amountCents; else outgoingCents += row.amountCents }
    else if (row.status === 'pending') pendingCount++
    else overdueCount++
  }
  return { incomingCents, outgoingCents, revenueCents: incomingCents, expensesCents: outgoingCents, netCents: incomingCents - outgoingCents, settledCount, pendingCount, overdueCount, transactionCount: rows.length }
}
export type MetricComparison = { valueCents: number; priorCents: number; deltaCents: number; changePercent: number | null }
function compare(valueCents: number, priorCents: number): MetricComparison {
  return { valueCents, priorCents, deltaCents: valueCents - priorCents, changePercent: priorCents === 0 ? null : (valueCents - priorCents) / Math.abs(priorCents) * 100 }
}
export type FlowPoint = { date: string; endDate: string; label: string; incomingCents: number; outgoingCents: number; netCents: number; cumulativeNetCents: number }
const shortDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'))
export function dailyFlow(rows: readonly Transaction[], range: DateRange): FlowPoint[] {
  validateRange(range)
  const grouped = new Map<string, Transaction[]>()
  for (const row of filterTransactions(rows, { dateRange: range })) grouped.set(row.date, [...(grouped.get(row.date) ?? []), row])
  let cumulativeNetCents = 0
  return Array.from({ length: dayNumber(range.end) - dayNumber(range.start) + 1 }, (_, index) => {
    const date = isoDay(dayNumber(range.start) + index)
    const sum = totals(grouped.get(date) ?? [])
    cumulativeNetCents += sum.netCents
    return { date, endDate: date, label: shortDate(date), incomingCents: sum.incomingCents, outgoingCents: sum.outgoingCents, netCents: sum.netCents, cumulativeNetCents }
  })
}
/** Consecutive seven-day buckets starting at the chosen range, including its final partial week. */
export function weeklyFlow(points: readonly FlowPoint[]): FlowPoint[] {
  const weeks: FlowPoint[] = []
  for (let index = 0; index < points.length; index += 7) {
    const slice = points.slice(index, index + 7), first = slice[0], last = slice[slice.length - 1]
    const incomingCents = slice.reduce((sum, point) => sum + point.incomingCents, 0)
    const outgoingCents = slice.reduce((sum, point) => sum + point.outgoingCents, 0)
    weeks.push({ date: first.date, endDate: last.endDate, label: shortDate(first.date) + ' to ' + shortDate(last.endDate), incomingCents, outgoingCents, netCents: incomingCents - outgoingCents, cumulativeNetCents: last.cumulativeNetCents })
  }
  return weeks
}
export type FlowChartData = { categories: string[]; series: { name: string; values: number[] }[] }
/** ECharts values are dollars; every aggregate remains in integer cents until this boundary. */
export function flowChartData(points: readonly FlowPoint[]): FlowChartData {
  return { categories: points.map(point => point.label), series: [{ name: 'Incoming', values: points.map(point => point.incomingCents / 100) }, { name: 'Outgoing', values: points.map(point => point.outgoingCents / 100) }, { name: 'Net cashflow', values: points.map(point => point.netCents / 100) }] }
}
export type ExpenseCategory = { id: string; name: string; valueCents: number; value: number }
export function expenseByCategory(rows: readonly Transaction[]): ExpenseCategory[] {
  return categories.filter(category => category.type === 'outgoing').map(category => {
    const valueCents = rows.filter(row => row.status === 'settled' && row.type === 'outgoing' && row.categoryId === category.id).reduce((sum, row) => sum + row.amountCents, 0)
    return { id: category.id, name: category.name, valueCents, value: valueCents / 100 }
  }).filter(category => category.valueCents > 0).sort((a, b) => b.valueCents - a.valueCents || a.id.localeCompare(b.id))
}
export type AccountBalance = Account & { accountId: string; balanceCents: number; incomingCents: number; outgoingCents: number; periodOpeningCents: number; periodClosingCents: number; currentBalanceCents: number; periodMovementCents: number; priorClosingCents: number }
export type Outstanding = { receivablesCents: number; payablesCents: number; overdueReceivablesCents: number; overduePayablesCents: number; receivableCount: number; payableCount: number }
export type FinanceScope = { dateRange?: DateRange; accountId?: string }
export function deriveFinance(rows: readonly Transaction[], { dateRange = selectedPeriod, accountId }: FinanceScope = {}) {
  const range = validateRange(dateRange), priorRange = previousPeriod(range)
  const asOfDate = range.end < ledgerAsOf ? range.end : ledgerAsOf
  // Validate the whole caller-owned ledger, including pending rows outside the active view.
  totals(rows)
  // Posted dates are the fixture's settlement dates. Unpaid due-state can be projected
  // at the report cutoff, but this snapshot does not reconstruct earlier payment history.
  const projected = rows.filter(row => row.date <= ledgerAsOf).map(row => ({ ...row, status: row.status === 'settled' || !row.dueDate ? row.status : row.dueDate < asOfDate ? 'overdue' as const : 'pending' as const }))
  const scoped = filterTransactions(projected, { accountId })
  const transactions = filterTransactions(scoped, { dateRange: { start: range.start, end: asOfDate } })
  const period = totals(transactions), prior = totals(filterTransactions(scoped, { dateRange: { start: priorRange.start, end: priorRange.end < asOfDate ? priorRange.end : asOfDate } }))
  const chosenAccounts = accounts.filter(account => !accountId || accountId === 'all' || account.id === accountId)
  const balances: AccountBalance[] = chosenAccounts.map(account => {
    const settled = scoped.filter(row => row.accountId === account.id && row.status === 'settled')
    const movement = (predicate: (date: string) => boolean) => settled.filter(row => predicate(row.date)).reduce((sum, row) => sum + signedAmountCents(row), 0)
    const periodTotals = totals(filterTransactions(settled, { dateRange: range }))
    const periodOpeningCents = account.openingBalanceCents + movement(date => date < range.start && date <= asOfDate)
    const periodClosingCents = account.openingBalanceCents + movement(date => date <= asOfDate)
    return { ...account, accountId: account.id, balanceCents: periodClosingCents, incomingCents: periodTotals.incomingCents, outgoingCents: periodTotals.outgoingCents, periodOpeningCents, periodClosingCents, periodMovementCents: periodClosingCents - periodOpeningCents, currentBalanceCents: account.openingBalanceCents + movement(date => date <= ledgerAsOf), priorClosingCents: account.openingBalanceCents + movement(date => date <= priorRange.end && date <= asOfDate) }
  })
  const outstandingRows = scoped.filter(row => row.date <= asOfDate && row.status !== 'settled')
  const outstanding: Outstanding = { receivablesCents: 0, payablesCents: 0, overdueReceivablesCents: 0, overduePayablesCents: 0, receivableCount: 0, payableCount: 0 }
  for (const row of outstandingRows) {
    if (row.type === 'incoming') { outstanding.receivablesCents += row.amountCents; outstanding.receivableCount++; if (row.status === 'overdue') outstanding.overdueReceivablesCents += row.amountCents }
    else { outstanding.payablesCents += row.amountCents; outstanding.payableCount++; if (row.status === 'overdue') outstanding.overduePayablesCents += row.amountCents }
  }
  const balanceCents = balances.reduce((sum, account) => sum + account.periodClosingCents, 0)
  const priorBalanceCents = balances.reduce((sum, account) => sum + account.priorClosingCents, 0)
  const daily = range.start <= asOfDate ? dailyFlow(scoped, { start: range.start, end: asOfDate }) : [], weekly = weeklyFlow(daily)
  const monthly: FlowPoint[] = []
  for (let month = range.start.slice(0, 7); month <= asOfDate.slice(0, 7) && range.start <= asOfDate;) {
    const monthDates = monthRange(month)
    const start = monthDates.start > range.start ? monthDates.start : range.start
    const end = monthDates.end < asOfDate ? monthDates.end : asOfDate
    const sum = totals(filterTransactions(scoped, { dateRange: { start, end } }))
    monthly.push({ date: start, endDate: end, label: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(monthDates.start + 'T00:00:00Z')), incomingCents: sum.incomingCents, outgoingCents: sum.outgoingCents, netCents: sum.netCents, cumulativeNetCents: (monthly.at(-1)?.cumulativeNetCents ?? 0) + sum.netCents })
    const date = new Date(monthDates.start + 'T00:00:00Z')
    month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString().slice(0, 7)
  }
  const expenseCategories = expenseByCategory(transactions)
  const dailyChart = flowChartData(daily), weeklyChart = flowChartData(weekly), monthlyChart = flowChartData(monthly)
  return {
    dateRange: range, asOfDate, priorRange, transactions, period, prior, balances, balanceCents, outstanding, outstandingRows,
    metrics: { cashBalanceCents: balanceCents, incomingCents: period.incomingCents, outgoingCents: period.outgoingCents, netCents: period.netCents, receivablesCents: outstanding.receivablesCents, payablesCents: outstanding.payablesCents },
    comparisons: { revenue: compare(period.revenueCents, prior.revenueCents), expenses: compare(period.expensesCents, prior.expensesCents), net: compare(period.netCents, prior.netCents), balance: compare(balanceCents, priorBalanceCents) },
    daily, weekly, monthly, dailyChart, weeklyChart, monthlyChart, cashFlow: { daily: dailyChart, weekly: weeklyChart, monthly: monthlyChart }, expenseCategories,
    expenseChart: expenseCategories.map(({ name, value }) => ({ name, value })),
  }
}
export type FinanceSummary = ReturnType<typeof deriveFinance>

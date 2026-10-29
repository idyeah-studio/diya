import { describe, expect, it } from 'vitest'
import { accounts, accountById, categoryById, counterpartyById, departmentById, deriveFinance, filterTransactions, formatMoney, initialTransactions, ledgerAsOf, monthRange, previousPeriod, selectedPeriod, signedAmountCents, type Transaction } from './finance'

describe('finance ledger fixture', () => {
  it('has 60 stable, categorized rows with integer cents and 26 in October', () => {
    expect(initialTransactions).toHaveLength(60)
    expect(new Set(initialTransactions.map(row => row.id)).size).toBe(60)
    expect(filterTransactions(initialTransactions, { dateRange: selectedPeriod })).toHaveLength(26)
    expect(accounts).toHaveLength(3)
    for (const row of initialTransactions) {
      expect(Number.isSafeInteger(row.amountCents)).toBe(true)
      expect(row.amountCents).toBeGreaterThan(0)
      expect(row.date).toMatch(/^2026-\d{2}-\d{2}$/)
      expect(row.postedAt.slice(0, 10)).toBe(row.date)
      expect(Number.isFinite(Date.parse(row.postedAt))).toBe(true)
      expect(row.date <= ledgerAsOf).toBe(true)
      expect(accountById[row.accountId]).toBeDefined()
      expect(departmentById[row.departmentId]).toBeDefined()
      expect(categoryById[row.categoryId].type).toBe(row.type)
      expect(counterpartyById[row.counterpartyId].kind).toBe(row.type === 'incoming' ? 'customer' : 'vendor')
      if (row.status === 'overdue') expect(row.dueDate! < ledgerAsOf).toBe(true)
      if (row.status === 'pending') expect(row.dueDate! >= ledgerAsOf).toBe(true)
    }
  })

  it('derives exact cash-basis period totals, excluding all unpaid rows', () => {
    const finance = deriveFinance(initialTransactions)
    expect(finance.period).toMatchObject({ revenueCents: 6_745_000, expensesCents: 1_536_220, netCents: 5_208_780, settledCount: 18, pendingCount: 4, overdueCount: 4, transactionCount: 26 })
    expect(finance.prior).toMatchObject({ revenueCents: 4_480_000, expensesCents: 1_317_980, netCents: 3_162_020 })
    expect(finance.priorRange).toEqual({ start: '2026-09-01', end: '2026-09-30' })
    expect(finance.comparisons.revenue.deltaCents).toBe(2_265_000)
    expect(finance.comparisons.expenses.deltaCents).toBe(218_240)
    expect(finance.comparisons.net.deltaCents).toBe(2_046_760)
    expect(finance.comparisons.revenue.changePercent).toBeCloseTo(2_265_000 / 4_480_000 * 100)
    expect(finance.metrics).toEqual({ cashBalanceCents: 25_775_300, incomingCents: 6_745_000, outgoingCents: 1_536_220, netCents: 5_208_780, receivablesCents: 3_280_000, payablesCents: 683_050 })
  })

  it('reconciles opening and current balances with settled movement', () => {
    const finance = deriveFinance(initialTransactions)
    const opening = accounts.reduce((sum, account) => sum + account.openingBalanceCents, 0)
    const movement = initialTransactions.filter(row => row.status === 'settled').reduce((sum, row) => sum + signedAmountCents(row), 0)
    expect(opening).toBe(11_000_000)
    expect(finance.balanceCents).toBe(25_775_300)
    expect(finance.balanceCents).toBe(opening + movement)
    expect(finance.balances.reduce((sum, account) => sum + account.periodOpeningCents, 0)).toBe(20_566_520)
    expect(finance.balances.reduce((sum, account) => sum + account.periodMovementCents, 0)).toBe(finance.period.netCents)
    for (const account of finance.balances) expect(account.periodClosingCents - account.periodOpeningCents).toBe(account.periodMovementCents)
    const september = deriveFinance(initialTransactions, { dateRange: monthRange('2026-09') })
    expect(september.balanceCents).toBe(20_566_520)
    expect(september.balances.reduce((sum, account) => sum + account.currentBalanceCents, 0)).toBe(25_775_300)
  })

  it('counts outstanding items through period end, including previous-month unpaid invoices', () => {
    expect(deriveFinance(initialTransactions).outstanding).toEqual({ receivablesCents: 3_280_000, payablesCents: 683_050, overdueReceivablesCents: 2_265_000, overduePayablesCents: 215_650, receivableCount: 5, payableCount: 5 })
    const throughSeptember = deriveFinance(initialTransactions, { dateRange: monthRange('2026-09') })
    expect(throughSeptember.outstanding.receivablesCents).toBe(960_000)
    expect(throughSeptember.outstanding.payablesCents).toBe(185_000)
  })

  it('reconciles daily, weekly, monthly and expense chart values exactly to integer totals', () => {
    const finance = deriveFinance(initialTransactions)
    expect(finance.daily).toHaveLength(23)
    expect(finance.weekly).toHaveLength(4)
    expect(finance.monthly).toHaveLength(1)
    for (const points of [finance.daily, finance.weekly, finance.monthly]) {
      expect(points.reduce((sum, point) => sum + point.incomingCents, 0)).toBe(finance.period.revenueCents)
      expect(points.reduce((sum, point) => sum + point.outgoingCents, 0)).toBe(finance.period.expensesCents)
      expect(points.at(-1)!.cumulativeNetCents).toBe(finance.period.netCents)
    }
    expect(finance.monthly.at(-1)).toMatchObject({ incomingCents: finance.period.revenueCents, outgoingCents: finance.period.expensesCents })
    expect(finance.expenseCategories.reduce((sum, category) => sum + category.valueCents, 0)).toBe(finance.period.expensesCents)
    expect(Math.round(finance.expenseChart.reduce((sum, category) => sum + category.value, 0) * 100)).toBe(finance.period.expensesCents)
    expect(finance.weeklyChart.series[0].values.map(value => Math.round(value * 100)).reduce((sum, value) => sum + value, 0)).toBe(finance.period.revenueCents)
  })

  it('applies inclusive date, account, type, status and searchable reference/note filters', () => {
    expect(filterTransactions(initialTransactions, { dateRange: { start: '2026-10-01', end: '2026-10-01' } })).toHaveLength(2)
    const rows = filterTransactions(initialTransactions, { dateRange: selectedPeriod, accountId: 'operating', type: 'incoming', status: 'overdue' })
    expect(rows.map(row => row.id)).toEqual(['oct-019'])
    expect(filterTransactions(initialTransactions, { search: '  INV-261023  ' }).map(row => row.id)).toEqual(['oct-025'])
    expect(filterTransactions(initialTransactions, { search: 'Juniper Health' }).every(row => row.counterpartyId === 'juniper')).toBe(true)
    const edited = initialTransactions.map(row => row.id === 'oct-019' ? { ...row, notes: 'Reviewed with client' } : row)
    expect(filterTransactions(edited, { search: 'reviewed with client' }).map(row => row.id)).toEqual(['oct-019'])
    const operating = deriveFinance(initialTransactions, { accountId: 'operating' })
    expect(operating.transactions.every(row => row.accountId === 'operating')).toBe(true)
    expect(operating.balances.map(account => account.id)).toEqual(['operating'])
    expect(operating.daily.reduce((sum, point) => sum + point.netCents, 0)).toBe(operating.period.netCents)
  })

  it('updates totals, balances, outstanding and charts from an actual caller status edit', () => {
    const before = deriveFinance(initialTransactions)
    const edited: Transaction[] = initialTransactions.map(row => row.id === 'oct-019' ? { ...row, status: 'settled', notes: 'Receipt reviewed' } : { ...row })
    const after = deriveFinance(edited)
    expect(after.period.revenueCents - before.period.revenueCents).toBe(860_000)
    expect(after.balanceCents - before.balanceCents).toBe(860_000)
    expect(before.outstanding.receivablesCents - after.outstanding.receivablesCents).toBe(860_000)
    expect(after.daily.find(point => point.date === '2026-10-18')?.incomingCents).toBe(860_000)
    expect(initialTransactions.find(row => row.id === 'oct-019')?.status).toBe('overdue')
  })

  it('keeps every chart grouping inside the same cross-month/custom reporting scope', () => {
    const range = { start: '2026-09-10', end: '2026-10-05' }
    const finance = deriveFinance(initialTransactions, { dateRange: range, accountId: 'operating' })
    const settled = initialTransactions.filter(row => row.status === 'settled' && row.accountId === 'operating' && row.date >= range.start && row.date <= range.end)
    const incoming = settled.filter(row => row.type === 'incoming').reduce((sum, row) => sum + row.amountCents, 0)
    const outgoing = settled.filter(row => row.type === 'outgoing').reduce((sum, row) => sum + row.amountCents, 0)
    expect(finance.monthly.map(point => [point.date, point.endDate])).toEqual([['2026-09-10', '2026-09-30'], ['2026-10-01', '2026-10-05']])
    for (const points of [finance.daily, finance.weekly, finance.monthly]) {
      expect(points.reduce((sum, point) => sum + point.incomingCents, 0)).toBe(incoming)
      expect(points.reduce((sum, point) => sum + point.outgoingCents, 0)).toBe(outgoing)
      expect(points.at(-1)!.cumulativeNetCents).toBe(incoming - outgoing)
    }
  })

  it('projects unpaid due-state at the report cutoff without dropping caller metadata', () => {
    const rows = initialTransactions.map(row => ({ ...row, reviewed: row.id === 'sep-016', notes: row.id === 'sep-016' ? 'Caller memo' : row.notes }))
    const september = deriveFinance(rows, { dateRange: monthRange('2026-09') })
    expect(september.asOfDate).toBe('2026-09-30')
    expect(september.transactions.find(row => row.id === 'sep-016')).toMatchObject({ status: 'pending', reviewed: true, notes: 'Caller memo' })
    expect(september.outstanding.overdueReceivablesCents).toBe(0)
    expect(september.outstanding.receivablesCents).toBe(960_000)
    const early = deriveFinance(rows, { dateRange: { start: '2026-10-17', end: '2026-10-20' } })
    expect(early.outstandingRows.find(row => row.id === 'oct-019')?.status).toBe('pending')
    expect(early.outstandingRows.find(row => row.id === 'oct-021')?.status).toBe('pending')
    expect(early.outstandingRows.find(row => row.id === 'sep-016')?.status).toBe('overdue')
    expect(rows.find(row => row.id === 'sep-016')?.status).toBe('overdue')
    expect(deriveFinance(rows).outstandingRows.find(row => row.id === 'oct-019')?.status).toBe('overdue')
  })

  it('caps records, balances, outstanding and chart dates at the known snapshot', () => {
    const future: Transaction[] = [{ ...initialTransactions[0], id: 'future-receipt', date: '2026-10-25', postedAt: '2026-10-25T10:00:00Z', amountCents: 123_456 }, { ...initialTransactions.find(row => row.id === 'oct-017')!, id: 'future-invoice', date: '2026-10-26', postedAt: '2026-10-26T11:00:00Z', dueDate: '2026-10-28', amountCents: 654_321 }]
    const known = deriveFinance(initialTransactions), finance = deriveFinance([...initialTransactions, ...future])
    expect(finance.asOfDate).toBe(ledgerAsOf)
    expect(finance.metrics).toEqual(known.metrics)
    expect(finance.transactions).toHaveLength(26)
    expect(finance.daily.at(-1)!.endDate).toBe(ledgerAsOf)
    expect(finance.weekly.at(-1)!.endDate).toBe(ledgerAsOf)
    expect(finance.monthly.at(-1)!.endDate).toBe(ledgerAsOf)
    const unavailable = deriveFinance(initialTransactions, { dateRange: { start: '2026-10-24', end: '2026-10-31' } })
    expect(unavailable.period.transactionCount).toBe(0)
    expect(unavailable.daily).toEqual([])
    expect(unavailable.weekly).toEqual([])
    expect(unavailable.monthly).toEqual([])
    expect(unavailable.balanceCents).toBe(known.balanceCents)
    expect(unavailable.outstanding).toEqual(known.outstanding)
    expect(unavailable.balances.every(account => account.periodMovementCents === 0)).toBe(true)
  })

  it('reclassifies actual expenses without changing money, and preserves exact category reconciliation', () => {
    const before = deriveFinance(initialTransactions)
    const edited = initialTransactions.map(row => row.id === 'oct-014' ? { ...row, categoryId: 'contractors', notes: 'Reclassified locally' } : row)
    const after = deriveFinance(edited)
    expect(after.metrics).toEqual(before.metrics)
    expect(after.expenseCategories.find(category => category.id === 'payroll')).toBeUndefined()
    expect(after.expenseCategories.find(category => category.id === 'contractors')?.valueCents).toBe(1_092_500)
    expect(after.expenseCategories.reduce((sum, category) => sum + category.valueCents, 0)).toBe(after.metrics.outgoingCents)
    expect(after.transactions.find(row => row.id === 'oct-014')?.notes).toBe('Reclassified locally')
  })

  it('uses calendar comparisons without a live clock and guards invalid cents/dates', () => {
    expect(previousPeriod({ start: '2026-10-10', end: '2026-10-16' })).toEqual({ start: '2026-10-03', end: '2026-10-09' })
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(deriveFinance([], { dateRange: selectedPeriod }).comparisons.revenue.changePercent).toBeNull()
    expect(() => deriveFinance(initialTransactions, { dateRange: { start: '2026-02-30', end: '2026-03-01' } })).toThrow(RangeError)
    expect(() => deriveFinance([{ ...initialTransactions[0], amountCents: 12.5 }])).toThrow(/integer cents/)
    expect(() => deriveFinance([{ ...initialTransactions[0], amountCents: -100 }])).toThrow(/integer cents/)
    expect(formatMoney(123_456)).toBe('$1,234.56')
    expect(formatMoney(-123_456)).toBe('-$1,234.56')
    expect(formatMoney(123_456, { signed: true })).toBe('+$1,234.56')
  })
})

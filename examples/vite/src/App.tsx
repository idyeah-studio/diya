import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  Alert, Avatar, Button, Card, DatePicker, Dialog, DiyaProvider, Drawer, List,
  Metric, PageHeader, Progress, Select, SideNavigation, SiteHeader, Switch,
  Table, Tag, TextArea, TextInput, Toast, type DiyaMessagesInput, type MetricChange, type TableColumn,
} from '@idyeah/diya'
import { DashboardIcon } from './dashboard-icons'
import {
  accounts, accountById, categories, categoryById, counterpartyById,
  departmentById, deriveFinance, filterTransactions, formatMoney,
  initialTransactions, monthRange, selectedPeriod, signedAmountCents,
  type FinanceTransaction, type DateRange, type MetricComparison,
} from './finance'
import { diyaTheme } from './theme'

const DashboardCharts = lazy(() => import('./DashboardCharts'))
type View = 'overview' | 'transactions' | 'receivables' | 'payables' | 'accounts' | 'settings'
export type LedgerRow = FinanceTransaction & { reviewed: boolean }
const destinations = [
  { value: 'overview', label: 'Overview', icon: <DashboardIcon name="overview" /> },
  { value: 'transactions', label: 'Transactions', icon: <DashboardIcon name="transactions" /> },
  { value: 'receivables', label: 'Receivables', icon: <DashboardIcon name="incoming" /> },
  { value: 'payables', label: 'Payables', icon: <DashboardIcon name="outgoing" /> },
  { value: 'accounts', label: 'Accounts', icon: <DashboardIcon name="bank" /> },
  { value: 'settings', label: 'Settings', icon: <DashboardIcon name="settings" /> },
] as const
const statusLabels = { settled: 'Settled', pending: 'Pending', overdue: 'Overdue' } as const
// Workspace wording for every DIYA component; per-instance label props still win.
const dashboardMessages: DiyaMessagesInput = {
  table: { noMatches: 'No matching transactions' },
}
const statusTones = { settled: 'success', pending: 'warning', overdue: 'error' } as const

function freshLedger(): LedgerRow[] {
  return initialTransactions.map((row, index) => ({ ...row, reviewed: row.status === 'settled' && index % 4 !== 0 }))
}
function dateLabel(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}
function changeFor(comparison: MetricComparison, lowerIsBetter = false): MetricChange | undefined {
  if (comparison.changePercent === null) return undefined
  const direction = comparison.deltaCents === 0 ? 'flat' : comparison.deltaCents > 0 ? 'up' : 'down'
  return {
    value: `${Math.abs(comparison.changePercent).toFixed(1)}%`, direction,
    meaning: direction === 'flat' ? 'neutral' : (comparison.deltaCents > 0) !== lowerIsBetter ? 'positive' : 'negative',
    comparison: 'vs. prior period',
  }
}
function startingView(): View {
  const requested = new URLSearchParams(window.location.search).get('view')
  return destinations.some(item => item.value === requested) ? requested as View : 'overview'
}
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

export function App() {
  const [rows, setRows] = useState(freshLedger)
  const [view, setView] = useState<View>(startingView)
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light')
  const [glass, setGlass] = useState(true)
  const [accountId, setAccountId] = useState('all')
  const [period, setPeriod] = useState('2026-10')
  const [dateRange, setDateRange] = useState<DateRange>(selectedPeriod)
  const [dateDraft, setDateDraft] = useState<DateRange>(selectedPeriod)
  const [dateError, setDateError] = useState('')
  const [query, setQuery] = useState('')
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('daily')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [inspectedId, setInspectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [memo, setMemo] = useState('')
  const [category, setCategory] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [showReceivableAlert, setShowReceivableAlert] = useState(true)
  const heading = useRef<HTMLDivElement>(null)
  const previousView = useRef(view)
  useEffect(() => {
    if (previousView.current !== view) heading.current?.focus()
    previousView.current = view
  }, [view])

  const finance = deriveFinance(rows, { accountId, dateRange })
  const inspected = [...finance.transactions, ...finance.outstandingRows].find(row => row.id === inspectedId) as LedgerRow | undefined
  const editing = rows.find(row => row.id === editingId)
  const receivables = finance.outstandingRows.filter(row => row.type === 'incoming') as LedgerRow[]
  const payables = finance.outstandingRows.filter(row => row.type === 'outgoing') as LedgerRow[]
  const overdueReceivables = receivables.filter(row => row.status === 'overdue')
  const scopeRows = view === 'receivables' ? receivables : view === 'payables' ? payables : finance.transactions as LedgerRow[]
  const ledgerRows = filterTransactions(scopeRows, { search: query }) as LedgerRow[]
  const ledgerLabel = view === 'receivables' ? 'Receivables' : view === 'payables' ? 'Payables' : 'Transactions'
  const chartData = finance.cashFlow[granularity]
  const rangeLabel = `${dateLabel(dateRange.start)} – ${dateLabel(dateRange.end)}, 2026`
  const unreviewed = (finance.transactions as LedgerRow[]).filter(row => !row.reviewed)

  function navigate(value: string, focusHeading = true) {
    if (!destinations.some(item => item.value === value)) return
    // Searching may switch views while the user is typing; keep focus in that field.
    if (!focusHeading) previousView.current = value as View
    setView(value as View)
    setSelectedIds([])
    const url = new URL(window.location.href)
    url.searchParams.set('view', value)
    url.searchParams.delete('item')
    window.history.replaceState(null, '', url)
  }
  function choosePeriod(value: string) {
    setPeriod(value)
    setDateError('')
    setSelectedIds([])
    if (value === 'custom') { setDateDraft(dateRange); return }
    const next = monthRange(value)
    setDateRange(next)
    setDateDraft(next)
  }
  function applyRange() {
    if (!dateDraft.start || !dateDraft.end || dateDraft.end < dateDraft.start || dateDraft.start < '2026-01-01' || dateDraft.end > '2026-10-31') {
      setDateError('Choose a complete range between January 1 and October 31, 2026.')
      return
    }
    setDateRange({ ...dateDraft })
    setDateError('')
    setSelectedIds([])
  }
  function openEdit(row: LedgerRow) {
    setInspectedId(null)
    setMemo(row.notes)
    setCategory(row.categoryId)
    setEditingId(row.id)
  }
  function saveEdit() {
    if (!editing) return false
    setRows(current => current.map(row => row.id === editing.id ? { ...row, notes: memo.trim(), categoryId: category } : row))
    setNotice(`Updated ${editing.invoiceRef}.`)
    setEditingId(null)
    return true
  }
  function markReviewed(ids: string[]) {
    const changed = rows.filter(row => ids.includes(row.id) && !row.reviewed).length
    setRows(current => current.map(row => ids.includes(row.id) ? { ...row, reviewed: true } : row))
    setSelectedIds([])
    setNotice(changed ? `${changed} transaction${changed === 1 ? '' : 's'} marked reviewed.` : 'These transactions were already reviewed.')
  }
  function exportStatement() {
    const data = [
      ['Date', 'Reference', 'Counterparty', 'Description', 'Account', 'Category', 'Status', 'Amount (USD)', 'Memo'],
      ...finance.transactions.map(row => [row.date, row.invoiceRef, counterpartyById[row.counterpartyId].name, row.description, accountById[row.accountId].name, categoryById[row.categoryId].name, statusLabels[row.status], (signedAmountCents(row) / 100).toFixed(2), row.notes]),
    ].map((record, index) => record.map((cell, column) => index > 0 && column === 7 ? cell : csvCell(cell)).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `veylo-statement-${dateRange.start}-${dateRange.end}.csv`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice(`Exported ${finance.transactions.length} statement transactions.`)
  }

  const columns: TableColumn<LedgerRow>[] = [
    { key: 'counterparty', label: 'Counterparty', width: 230, sortValue: row => counterpartyById[row.counterpartyId].name,
      render: row => <div className="dashboard-counterparty"><Avatar name={counterpartyById[row.counterpartyId].name} size="small" /><Button variant="quiet" size="small" aria-label={counterpartyById[row.counterpartyId].name} onClick={() => setInspectedId(row.id)}><span className="dashboard-cell-copy"><span>{counterpartyById[row.counterpartyId].name}</span><small>{row.invoiceRef}</small></span></Button></div> },
    { key: 'date', label: 'Date', width: 95, sortValue: row => row.date, render: row => dateLabel(row.date) },
    { key: 'amount', label: 'Amount', width: 140, numeric: true, sortValue: signedAmountCents, render: row => <strong className="dashboard-amount" data-direction={row.type}>{formatMoney(signedAmountCents(row), { signed: true })}</strong> },
    { key: 'status', label: 'Status', width: 112, sortValue: row => statusLabels[row.status], render: row => <Tag label={statusLabels[row.status]} tone={statusTones[row.status]} size="small" leading="dot">{statusLabels[row.status]}</Tag> },
    { key: 'description', label: 'Description', width: 240, sortValue: row => row.description, render: row => <div className="dashboard-cell-copy"><span>{row.description}</span><small>{row.notes}</small></div> },
    { key: 'category', label: 'Category', width: 160, sortValue: row => categoryById[row.categoryId].name, render: row => categoryById[row.categoryId].name },
    { key: 'account', label: 'Account', width: 180, sortValue: row => accountById[row.accountId].name, render: row => accountById[row.accountId].name },
    { key: 'review', label: 'Review', width: 116, sortValue: row => Number(row.reviewed), render: row => <span className="dashboard-reviewed" data-reviewed={row.reviewed}>{row.reviewed && <DashboardIcon name="check" size={14} />}{row.reviewed ? 'Reviewed' : 'Needs review'}</span> },
  ]
  function ledger() {
    return <section className="dashboard-table" aria-label={`${ledgerLabel} ledger`}>
      <Table key={`${view}:${accountId}:${dateRange.start}:${dateRange.end}`} label={ledgerLabel} rows={ledgerRows} columns={columns}
        rowLabel={row => row.invoiceRef} density="compact" sticky pagination={false}
        filterOptions={[
          { key: 'status', label: 'Status', options: ['Settled', 'Pending', 'Overdue'], getValue: row => statusLabels[row.status] },
          { key: 'type', label: 'Type', options: ['Money in', 'Money out'], getValue: row => row.type === 'incoming' ? 'Money in' : 'Money out' },
        ]}
        selectedIds={selectedIds} onSelectionChange={setSelectedIds} bulkActions={[{ label: 'Mark reviewed', onAction: markReviewed }]}
        rowActions={row => [
          { id: 'details', label: 'Transaction details', onSelect: () => setInspectedId(row.id) },
          { id: 'edit', label: 'Edit memo', onSelect: () => openEdit(row) },
          { id: 'review', label: 'Mark reviewed', disabled: row.reviewed, onSelect: () => markReviewed([row.id]) },
        ]}
        emptyTitle="No matching transactions" emptyDescription="Try another search, account or reporting period." />
      <div className="dashboard-ledger-footer"><span>{ledgerRows.length} transactions in scope · USD</span><span>Cash flow includes settled transactions only.</span></div>
    </section>
  }

  return <DiyaProvider theme={appearance} glass={glass} brandColor={diyaTheme.brandColor} fontFamily={diyaTheme.fontFamily} locale="en-US" messages={dashboardMessages} style={diyaTheme.tokens[appearance]} className="dashboard-app">
    <div className="dashboard-shell">
      <SideNavigation className="dashboard-sidebar" label="Finance navigation" value={view} onValueChange={navigate}
        brand={<span className="dashboard-brand"><span className="dashboard-brand-mark">v.</span>veylo</span>}
        groups={[{ id: 'finance', label: 'Finance', items: destinations.slice(0, 5) }, { id: 'workspace', label: 'Workspace', items: destinations.slice(5) }]} />
      <div className="dashboard-main">
        <SiteHeader className="dashboard-topbar" brand={<strong className="dashboard-workspace-name">Finance workspace</strong>}
          search={{ label: 'Search transactions', placeholder: 'Search', value: query, onValueChange: value => { setQuery(value); if (value.trim() && view !== 'transactions') navigate('transactions', false) } }}
          utilities={<div className="dashboard-utility-icons"><Button variant="quiet" size="medium" iconOnly aria-label="Notifications" onClick={() => setNotificationsOpen(true)}><DashboardIcon name="bell" size={20} />{overdueReceivables.length > 0 && <span className="dashboard-notification-dot" />}</Button><Button variant="quiet" size="medium" iconOnly aria-label="Settings" onClick={() => navigate('settings')}><DashboardIcon name="settings" size={20} /></Button><Button variant="quiet" size="medium" iconOnly aria-label="Help" onClick={() => setHelpOpen(true)}><DashboardIcon name="help" size={20} /></Button></div>}
          avatar={<Button className="dashboard-avatar-slot" variant="quiet" iconOnly aria-label="Alex Morgan account" onClick={() => navigate('settings')}><Avatar name="Alex Morgan" size="small" /></Button>} />
        <main className="dashboard-content">
          <div className="dashboard-mobile-nav"><Select label="Finance view" value={view} onValueChange={navigate} options={destinations.map(item => ({ value: item.value, label: item.label }))} /></div>
          <div ref={heading} tabIndex={-1} className="dashboard-heading-focus">
            <PageHeader className="dashboard-heading" headingLevel={1} title={view === 'overview' ? 'Financial overview' : destinations.find(item => item.value === view)!.label}
              description={view === 'settings' ? 'Workspace preferences' : `${rangeLabel} · USD`}
              actions={view !== 'settings' && <div className="dashboard-scope-controls"><Select label="Account" hideLabel value={accountId} onValueChange={value => { setAccountId(value); setSelectedIds([]) }} options={[{ value: 'all', label: 'All accounts' }, ...accounts.map(account => ({ value: account.id, label: account.name }))]} /><Select label="Reporting period" hideLabel value={period} onValueChange={choosePeriod} options={[{ value: '2026-10', label: 'October 2026' }, { value: '2026-09', label: 'September 2026' }, { value: 'custom', label: 'Custom range' }]} /><Button variant="solid" shape="pill" onClick={exportStatement}><DashboardIcon name="download" size={16} />Export statement</Button></div>} />
          </div>
          {period === 'custom' && view !== 'settings' && <div className="dashboard-custom-range"><DatePicker label="Reporting date range" range value={dateDraft} onValueChange={value => { setDateDraft(value); setDateError('') }} error={dateError} /><Button onClick={applyRange}>Apply range</Button></div>}
          {view === 'overview' && <>
            <div className="dashboard-metrics">
              <section className="dashboard-metric-card" aria-label="Cash balance"><Metric label="Cash balance" value={formatMoney(finance.metrics.cashBalanceCents)} size="medium" change={changeFor(finance.comparisons.balance)} /><span className="dashboard-notes">{finance.balances.length} accounts · as of {dateLabel(finance.asOfDate)}</span></section>
              <section className="dashboard-metric-card" aria-label="Money in"><Metric label="Money in" value={formatMoney(finance.metrics.incomingCents)} size="medium" change={changeFor(finance.comparisons.revenue)} /><span className="dashboard-notes">Settled customer payments</span></section>
              <section className="dashboard-metric-card" aria-label="Money out"><Metric label="Money out" value={formatMoney(finance.metrics.outgoingCents)} size="medium" change={changeFor(finance.comparisons.expenses, true)} /><span className="dashboard-notes">Settled operating expenses</span></section>
              <section className="dashboard-metric-card" aria-label="Receivables due"><Metric label="Receivables due" value={formatMoney(finance.metrics.receivablesCents)} size="medium" /><div className="dashboard-metric-tail"><Tag label="Overdue invoices" tone="warning" size="medium">{overdueReceivables.length} overdue</Tag><Button variant="quiet" size="medium" onClick={() => navigate('receivables')}>View invoices<DashboardIcon name="arrow" size={14} /></Button></div></section>
            </div>
            <Suspense fallback={<div className="dashboard-chart-loading" role="status">Loading financial charts…</div>}><DashboardCharts appearance={appearance} categories={chartData.categories} series={chartData.series.slice(0, 2)} expenses={finance.expenseChart} netCents={finance.metrics.netCents} expenseTotalCents={finance.metrics.outgoingCents} granularity={granularity} onGranularityChange={setGranularity} /></Suspense>
            {ledger()}
          </>}
          {(view === 'transactions' || view === 'receivables' || view === 'payables') && <>
            {view === 'receivables' && showReceivableAlert && overdueReceivables.length > 0 && <Alert layout="banner" tone="warning" title={`${overdueReceivables.length} overdue invoices`} onDismiss={() => setShowReceivableAlert(false)}>{formatMoney(finance.outstanding.overdueReceivablesCents)} is awaiting collection.</Alert>}
            {view !== 'transactions' && <div className="dashboard-obligation-summary"><Metric label={view === 'receivables' ? 'Receivables due' : 'Payables due'} value={formatMoney(view === 'receivables' ? finance.metrics.receivablesCents : finance.metrics.payablesCents)} size="medium" /><p className="dashboard-notes">All unpaid invoices issued through {dateLabel(finance.asOfDate)}, including earlier periods.</p></div>}
            {query && <div className="dashboard-search-summary"><span>Search results for “{query}”</span><Button variant="quiet" size="small" onClick={() => setQuery('')}>Clear search</Button></div>}
            {ledger()}
          </>}
          {view === 'accounts' && <div className="dashboard-account-cards">{finance.balances.map(account => <Card key={account.id} title={account.name} description={account.description} tags={<Tag label="USD" size="small">USD</Tag>} divided footer={<Button variant="quiet" size="small" onClick={() => { setAccountId(account.id); navigate('transactions') }}>View transactions<DashboardIcon name="arrow" size={14} /></Button>}><Metric label="Closing balance" value={formatMoney(account.periodClosingCents)} size="medium" /><dl className="dashboard-account-totals"><div><dt>Opening balance</dt><dd>{formatMoney(account.periodOpeningCents)}</dd></div><div><dt>Money in</dt><dd>{formatMoney(account.incomingCents)}</dd></div><div><dt>Money out</dt><dd>{formatMoney(account.outgoingCents)}</dd></div></dl><Progress label="Share of cash balance" value={finance.balanceCents > 0 ? Math.max(0, Math.min(100, Math.round(account.periodClosingCents / finance.balanceCents * 100))) : 0} /></Card>)}</div>}
          {view === 'settings' && <div className="dashboard-settings">
            <Card title="Appearance" description="Applies to every component in this workspace."><div className="dashboard-appearance"><div role="group" aria-label="Appearance">{(['light', 'dark'] as const).map(value => <Button key={value} shape="pill" variant={appearance === value ? 'solid' : 'quiet'} size="small" aria-pressed={appearance === value} onClick={() => setAppearance(value)}>{value === 'light' ? 'Light' : 'Dark'}</Button>)}</div><Switch label="Glass" checked={glass} onCheckedChange={setGlass} /></div></Card>
            <Card title="Workspace" description="The example uses one currency to keep its totals meaningful."><div className="dashboard-form-row"><TextInput label="Account holder" value="Alex Morgan" onValueChange={() => {}} readOnly /><TextInput label="Base currency" value="USD · US Dollar" onValueChange={() => {}} readOnly /></div></Card>
            <Card title="Sample records" description="Edits and review marks stay in this browser session. Refreshing restores the original records."><Button variant="outline" onClick={() => setResetOpen(true)}>Restore sample data</Button></Card>
          </div>}
          <p className="dashboard-footer-note">Sample workspace · Records as of October 23, 2026 · No bank connection</p>
        </main>
      </div>
    </div>
    <Drawer open={!!inspected} onOpenChange={open => { if (!open) setInspectedId(null) }} title="Transaction details" description={inspected?.invoiceRef}
      footer={inspected && <><Button variant="quiet" onClick={() => setInspectedId(null)}>Close</Button><Button onClick={() => openEdit(inspected)}>Edit memo</Button></>}>
      {inspected && <div className="dashboard-detail"><div className="dashboard-detail-heading"><Avatar name={counterpartyById[inspected.counterpartyId].name} size="large" /><h3>{counterpartyById[inspected.counterpartyId].name}</h3></div><Metric label="Amount" value={formatMoney(signedAmountCents(inspected), { signed: true })} /><Tag label={statusLabels[inspected.status]} tone={statusTones[inspected.status]} leading="dot">{statusLabels[inspected.status]}</Tag><dl className="dashboard-detail-list">{[
        ['Description', inspected.description], ['Date', dateLabel(inspected.date)], ['Account', accountById[inspected.accountId].name], ['Category', categoryById[inspected.categoryId].name], ['Department', departmentById[inspected.departmentId].name], ['Due date', inspected.dueDate ? dateLabel(inspected.dueDate) : 'Not applicable'], ['Review', inspected.reviewed ? 'Reviewed' : 'Needs review'], ['Memo', inspected.notes || 'No memo'],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>}
    </Drawer>
    <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditingId(null) }} title="Edit transaction" description={editing?.invoiceRef} confirmLabel="Save changes" onConfirm={saveEdit}>
      {editing && <div className="dashboard-form-fields"><TextInput label="Counterparty" value={counterpartyById[editing.counterpartyId].name} onValueChange={() => {}} readOnly /><Select label="Category" value={category} onValueChange={setCategory} options={categories.filter(item => item.type === editing.type).map(item => ({ value: item.id, label: item.name }))} /><TextArea label="Memo" value={memo} onValueChange={setMemo} rows={4} maxLength={240} showCount helperText="A note for your finance team. Amounts and payment status stay unchanged." /></div>}
    </Dialog>
    <Drawer open={notificationsOpen} onOpenChange={setNotificationsOpen} title="Notifications" description={`As of ${dateLabel(finance.asOfDate)}, 2026`}>
      <List label="Financial notifications" divided items={[
        { id: 'overdue', label: `${overdueReceivables.length} overdue invoices`, description: `${formatMoney(finance.outstanding.overdueReceivablesCents)} awaiting collection`, leading: <DashboardIcon name="incoming" />, onSelect: () => { setNotificationsOpen(false); setQuery(''); navigate('receivables') } },
        { id: 'review', label: `${unreviewed.length} transactions need review`, description: 'In the selected reporting period. Check the memo and category.', leading: <DashboardIcon name="transactions" />, onSelect: () => { setNotificationsOpen(false); setQuery(''); navigate('transactions') } },
        { id: 'payables', label: `${payables.length} unpaid supplier invoices`, description: formatMoney(finance.metrics.payablesCents), leading: <DashboardIcon name="outgoing" />, onSelect: () => { setNotificationsOpen(false); setQuery(''); navigate('payables') } },
      ]} />
    </Drawer>
    <Dialog open={helpOpen} onOpenChange={setHelpOpen} title="About this workspace"><p>This is a working financial dashboard built with the installed DIYA download. Account and date filters update the balances, charts and statement together.</p><p>Search, sorting, invoice filters, transaction details, memo edits and review marks work locally. All companies and records are sample data. Nothing connects to a bank or processes a payment.</p></Dialog>
    <Dialog open={resetOpen} onOpenChange={setResetOpen} title="Restore sample data?" description="This removes your memo edits, category changes and review marks." confirmLabel="Restore records" onConfirm={() => { setRows(freshLedger()); setSelectedIds([]); setNotice('Sample records restored.'); return true }} />
    {notice && <Toast key={notice} title={notice} duration={5000} onDismiss={() => setNotice('')}>{null}</Toast>}
  </DiyaProvider>
}

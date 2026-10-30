'use client'
// Analytics dashboard: a DIYA screen. Install: npm i @idyeah/diya lucide-react echarts@6
// Next.js: save as app/dashboard/page.tsx. Vite: save as src/Dashboard.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState } from 'react'
import {
  Avatar, Button, Card, ContentState, Drawer, Menu, Metric, Select, SideNavigation, Table, Tag, TextLink, Toast, Tooltip,
  type MetricChange, type SideNavigationGroup, type TableColumn, type Tone,
} from '@idyeah/diya'
import { DataViz } from '@idyeah/diya/charts'
import {
  Building, CalendarDays, ChartLine, CircleAlert, CreditCard, Download, Layers, LayoutDashboard, LucideProvider, Menu as MenuIcon,
  PanelLeftClose, PanelLeftOpen, Plug, Settings, TrendingDown, Users,
} from 'lucide-react'

// Your product, who's signed in, and their workspaces. The Sandbox has no data yet.
const PRODUCT = 'Tideline'
const USER = { name: 'Jonah Adeyemi', email: 'jonah@example.com' }
const WORKSPACES = [
  { id: 'brightwork', name: 'Brightwork' },
  { id: 'sandbox', name: 'Sandbox' },
]

// One figure a month, from the first month (April 2024) to this one (November 2026).
const MRR = [9040, 10720, 11980, 14260, 15890, 17870, 20880, 24200, 26300, 29130, 34250, 37590, 41140, 48360, 52350, 56280,
  65210, 68980, 73730, 84570, 93650, 98100, 103730, 103730, 124340, 134260, 137760, 152420, 156290, 170850, 174280, 184320]
const SUBSCRIBERS = [81, 91, 106, 118, 134, 154, 170, 193, 218, 240, 271, 298, 331, 371, 400, 443, 491, 525, 577, 627, 672, 732,
  776, 834, 902, 939, 1004, 1072, 1110, 1175, 1228, 1284]
const CHURN = [3.9, 4.0, 3.6, 3.5, 3.8, 3.5, 3.2, 3.5, 3.4, 3.0, 3.2, 3.3, 2.8, 2.8, 3.1, 2.8, 2.5, 2.9, 2.7, 2.3, 2.6, 2.6, 2.2,
  2.2, 2.5, 2.1, 1.9, 2.3, 2.0, 1.7, 2.0, 1.8]
const PLANS = [
  { name: 'Starter', value: 17748 },
  { name: 'Team', value: 44352 },
  { name: 'Business', value: 78204 },
  { name: 'Enterprise', value: 44016 },
]

type Status = 'active' | 'past-due' | 'at-risk'
type Customer = { id: string; name: string; contact: string; email: string; plan: string; seats: number; mrr: number; since: string; status: Status }

const CUSTOMERS: Customer[] = [
  { id: 'ostara-health', name: 'Ostara Health', contact: 'Amara Okafor', email: 'amara.okafor@example.com', plan: 'Enterprise', seats: 240, mrr: 4320, since: 'May 2024', status: 'active' },
  { id: 'lumen-freight', name: 'Lumen Freight', contact: 'Nadia Karimi', email: 'nadia@example.com', plan: 'Enterprise', seats: 180, mrr: 3240, since: 'Sep 2024', status: 'active' },
  { id: 'halvorsen-dental', name: 'Halvorsen Dental Group', contact: 'Ingrid Halvorsen', email: 'ingrid@example.com', plan: 'Enterprise', seats: 150, mrr: 2700, since: 'Jan 2025', status: 'past-due' },
  { id: 'bluefin-robotics', name: 'Bluefin Robotics', contact: 'Kenji Watanabe', email: 'kenji@example.com', plan: 'Business', seats: 96, mrr: 2112, since: 'Jun 2025', status: 'active' },
  { id: 'saffron-table', name: 'Saffron Table', contact: 'Leila Haddad', email: 'leila@example.com', plan: 'Business', seats: 84, mrr: 1848, since: 'Feb 2025', status: 'at-risk' },
  { id: 'corvid-security', name: 'Corvid Security', contact: 'Daniel Mensah', email: 'daniel@example.com', plan: 'Business', seats: 72, mrr: 1584, since: 'Mar 2026', status: 'active' },
]
const STATUS: Record<Status, { text: string; tone: Tone }> = {
  active: { text: 'Active', tone: 'success' },
  'past-due': { text: 'Past due', tone: 'error' },
  'at-risk': { text: 'At risk', tone: 'warning' },
}

const RANGES = [
  { value: '6m', label: 'Last 6 months', months: 6 },
  { value: '12m', label: 'Last 12 months', months: 12 },
  { value: 'ytd', label: 'This year', months: 11 },
  { value: 'all', label: 'All time', months: MRR.length },
] as const
type Range = (typeof RANGES)[number]['value']

type Kpi = { label: string; value: string; change: MetricChange }
type Summary = { kpis: Kpi[]; since: string; customers: Customer[]; failed: number; atRisk: number }
type Trend = { categories: string[]; values: number[] }

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Replace with your API calls. Each waits a moment. The Sandbox has no data
// until you connect billing, and All time's chart times out until you retry.
async function getSummary(workspace: string, range: Range, connected: boolean): Promise<Summary | null> {
  await wait(900)
  return workspace === 'sandbox' && !connected ? null : summarize(range)
}
async function getTrend(range: Range, retry: boolean): Promise<Trend> {
  await wait(1300)
  if (range === 'all' && !retry) throw new Error('timeout')
  const first = MRR.length - months(range)
  const yearly = new Date(2024, 3 + first).getFullYear() !== 2026
  return { categories: MRR.slice(first).map((_, i) => monthName(first + i, yearly ? 'axis' : 'short')), values: MRR.slice(first) }
}
async function exportCsv(workspace: string, range: string) {
  await wait(900)
  return `${workspace}-${range.toLowerCase().replaceAll(' ', '-')}.csv`
}
async function connectBilling(workspace: string) {
  // A real connection sends the browser to your billing provider here.
  await wait(1200)
  return workspace
}

const months = (range: Range) => RANGES.find((r) => r.value === range)!.months
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format
const count = new Intl.NumberFormat('en-US').format
// The chart's axis and tooltips: $184.3k. Zero stays unlabeled, so the axis's
// lowest figure never crowds the first month under it.
const usdK = (value: number) => (value === 0 ? '' : `$${count(Math.round(value / 100) / 10)}k`)
function monthName(index: number, style: 'short' | 'axis' | 'long') {
  const date = new Date(2024, 3 + index)
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  if (style === 'short') return month
  return style === 'axis' ? `${month} ’${String(date.getFullYear()).slice(2)}` : `${month} ${date.getFullYear()}`
}
function change(diff: number, text: string, goodWhenUp = true): MetricChange {
  const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  const meaning = diff === 0 ? 'neutral' : diff > 0 === goodWhenUp ? 'positive' : 'negative'
  return { value: text, direction, meaning }
}
const signed = (value: number, digits = 0) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`

function summarize(range: Range): Summary {
  const first = MRR.length - months(range)
  const last = MRR.length - 1
  const percent = (from: number, to: number) => (to / from - 1) * 100
  const grew = percent(MRR[first], MRR[last])
  const arpa = (i: number) => MRR[i] / SUBSCRIBERS[i]
  const arpaGrew = percent(arpa(first), arpa(last))
  const churned = CHURN[last] - CHURN[first]
  return {
    kpis: [
      { label: 'MRR', value: usd(MRR[last]), change: change(grew, `${signed(grew, grew >= 100 ? 0 : 1)}%`) },
      { label: 'Subscribers', value: count(SUBSCRIBERS[last]), change: change(1, signed(SUBSCRIBERS[last] - SUBSCRIBERS[first])) },
      { label: 'Net revenue churn', value: `${CHURN[last]}%`, change: change(churned, `${signed(churned, 1)} pts`, false) },
      { label: 'Revenue per account', value: usdCents(arpa(last)), change: change(arpaGrew, `${signed(arpaGrew, 1)}%`) },
    ],
    since: monthName(first, 'long'),
    customers: CUSTOMERS,
    failed: 3,
    atRisk: 12,
  }
}

type Load<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T }
type Notice = { id: number; title: string; text: string }

export default function DashboardScreen() {
  const [workspace, setWorkspace] = useState(WORKSPACES[0].id)
  const [connected, setConnected] = useState<string[]>([])
  const [range, setRange] = useState<Range>('12m')
  const [summary, setSummary] = useState<Load<Summary | null>>({ status: 'loading' })
  const [trend, setTrend] = useState<Load<Trend>>({ status: 'loading' })
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [peek, setPeek] = useState<Customer>()
  const [busy, setBusy] = useState<'export' | 'connect'>()
  const [notice, setNotice] = useState<Notice>()
  const [counts, setCounts] = useState<{ failed?: number; atRisk?: number }>({})
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [titleFocus, focusTitle] = useState(0)
  const isConnected = connected.includes(workspace)

  useEffect(() => {
    let live = true
    setSummary({ status: 'loading' })
    setTrend({ status: 'loading' })
    getSummary(workspace, range, isConnected).then((data) => {
      if (!live) return
      setSummary({ status: 'ready', data })
      setCounts({ failed: data?.failed, atRisk: data?.atRisk })
    })
    getTrend(range, false).then(
      (data) => live && setTrend({ status: 'ready', data }),
      () => live && setTrend({ status: 'error' }),
    )
    return () => {
      live = false
    }
  }, [workspace, range, isConnected])

  // After a menu or drawer hands focus back to its button, move it to the page's heading.
  useEffect(() => {
    if (titleFocus) requestAnimationFrame(() => titleRef.current?.focus())
  }, [titleFocus])

  async function retryTrend() {
    setTrend({ status: 'loading' })
    setTrend({ status: 'ready', data: await getTrend(range, true) })
  }

  function switchWorkspace(id: string) {
    setWorkspace(id)
    setMenuOpen(false)
    focusTitle(Date.now())
  }

  async function runExport() {
    setBusy('export')
    const file = await exportCsv(workspace, rangeLabel)
    setBusy(undefined)
    setNotice({ id: Date.now(), title: 'Export on its way', text: `We’ll email ${file} to ${USER.email} in a minute or two.` })
  }

  async function connect() {
    setBusy('connect')
    await connectBilling(workspace)
    setBusy(undefined)
    setConnected([...connected, workspace])
    setNotice({ id: Date.now(), title: 'Billing connected', text: 'Your history is in. Every chart below is now real.' })
    focusTitle(Date.now())
  }

  const name = WORKSPACES.find((w) => w.id === workspace)!.name
  const data = summary.status === 'ready' ? summary.data : undefined
  const empty = summary.status === 'ready' && summary.data === null
  const loading = summary.status === 'loading'
  const rangeLabel = RANGES.find((r) => r.value === range)!.label
  const trendText = { title: 'Monthly recurring revenue', description: `${rangeLabel}, at the end of each month.` }
  const planText = { title: 'MRR by plan', description: `Today, across ${count(SUBSCRIBERS[SUBSCRIBERS.length - 1])} subscribers.` }

  const groups: SideNavigationGroup[] = [
    { id: 'analytics', label: 'Analytics', items: [
      { value: 'overview', label: 'Overview', href: '/dashboard', icon: <LayoutDashboard /> },
      { value: 'revenue', label: 'Revenue', href: '/revenue', icon: <ChartLine /> },
      { value: 'subscribers', label: 'Subscribers', href: '/subscribers', icon: <Users /> },
      { value: 'churn', label: 'Churn', href: '/churn', icon: <TrendingDown /> },
      { value: 'cohorts', label: 'Cohorts', href: '/cohorts', icon: <Layers /> },
    ] },
    { id: 'customers', label: 'Customers', items: [
      { value: 'customers', label: 'All customers', href: '/customers', icon: <Building /> },
      { value: 'failed', label: 'Failed payments', href: '/customers?status=past-due', icon: <CreditCard />, count: counts.failed },
      { value: 'risk', label: 'At risk', href: '/customers?status=at-risk', icon: <CircleAlert />, count: counts.atRisk },
    ] },
    { id: 'workspace', label: 'Workspace', items: [
      { value: 'integrations', label: 'Integrations', href: '/integrations', icon: <Plug /> },
      { value: 'settings', label: 'Settings', href: '/settings', icon: <Settings /> },
    ] },
  ]

  const brand = (
    <span className="dashboard-brand">
      <span className="dashboard-mark" aria-hidden="true">{PRODUCT[0]}</span>
      <span>{PRODUCT}</span>
    </span>
  )

  const account = (
    <Menu
      label="Account and workspaces"
      trigger={
        <button type="button" className="dashboard-account" aria-label={`${USER.name}, ${name}: account and workspaces`}>
          <Avatar name={USER.name} size="small" />
          {!collapsed && (
            <span className="dashboard-account-text">
              <strong>{USER.name}</strong>
              <span>{name}</span>
            </span>
          )}
        </button>
      }
      items={[
        ...WORKSPACES.map((w) => ({ id: w.id, type: 'radio' as const, label: w.name, checked: w.id === workspace, onSelect: () => switchWorkspace(w.id) })),
        { id: 'settings', label: 'Account settings', href: '/settings/account', separatorBefore: true },
        { id: 'sign-out', label: 'Sign out', href: '/sign-out' },
      ]}
    />
  )

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="dashboard">
        <style>{css}</style>
        <a className="dashboard-skip" href="#dashboard-main">Skip to content</a>

        <aside className="dashboard-side" aria-label="Sidebar">
          <SideNavigation className="dashboard-nav" brand={brand} collapsedBrand={<span className="dashboard-mark" aria-hidden="true">{PRODUCT[0]}</span>}
            collapsed={collapsed} value="overview" groups={groups} footer={
              <div className="dashboard-foot" data-collapsed={collapsed}>
                {account}
                <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
                  <Button variant="quiet" iconOnly size="small" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)}>
                    {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                  </Button>
                </Tooltip>
              </div>
            } />
        </aside>

        <header className="dashboard-bar">
          {brand}
          <Button variant="quiet" iconOnly aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <MenuIcon />
          </Button>
        </header>
        <Drawer open={menuOpen} onOpenChange={setMenuOpen} side="right" title={PRODUCT}>
          <SideNavigation className="dashboard-drawer-nav" value="overview" groups={groups} />
          <div className="dashboard-drawer-foot">{account}</div>
        </Drawer>

        <main className="dashboard-main" id="dashboard-main" tabIndex={-1}>
          <header className="dashboard-head">
            <div className="dashboard-heading">
              <h1 className="dashboard-title" ref={titleRef} tabIndex={-1}>Overview</h1>
              <p className="dashboard-lede">{empty ? `${name} is ready when your data is.` : data ? `${name} · Changes since ${data.since} · Updated 9:41\u00a0AM` : `${name} · Loading…`}</p>
            </div>
            <div className="dashboard-actions">
              <Select label="Date range" hideLabel leadingIcon={<CalendarDays />} options={[...RANGES]} value={range} className="dashboard-range"
                onValueChange={(value) => setRange(value as Range)} disabled={empty} />
              <Button loading={busy === 'export'} disabled={empty || loading} onClick={runExport}>
                <Download /> Export
              </Button>
            </div>
          </header>

          <p className="dashboard-sr" role="status">{loading ? `Loading ${rangeLabel.toLowerCase()}…` : empty ? '' : `Showing ${rangeLabel.toLowerCase()}.`}</p>

          {empty ? (
            <ContentState
              className="dashboard-empty"
              headingLevel={2}
              icon={<ChartLine />}
              title="No data yet"
              description={`${PRODUCT} fills this page in once it can see your subscriptions. Connect your billing system and we’ll bring in your history, usually in under five minutes.`}
              action={{ label: busy === 'connect' ? 'Connecting…' : 'Connect billing', onClick: connect, disabled: busy === 'connect' }}
            />
          ) : (
            <>
              <section className="dashboard-kpis" aria-label="Key figures" aria-busy={loading}>
                {data
                  ? data.kpis.map((kpi) => <Metric key={kpi.label} className="dashboard-kpi" size="large" label={kpi.label} value={kpi.value} change={kpi.change} />)
                  : [0, 1, 2, 3].map((i) => (
                      <div key={i} className="dashboard-kpi" aria-hidden="true">
                        <span className="dashboard-bone dashboard-bone-label" />
                        <span className="dashboard-bone dashboard-bone-figure" />
                        <span className="dashboard-bone dashboard-bone-change" />
                      </div>
                    ))}
              </section>

              <div className="dashboard-charts">
                {trend.status === 'ready' ? (
                  <DataViz {...trendText} headingLevel={2}
                    type="area" variant="smooth" legend={false} categories={trend.data.categories}
                    series={[{ name: 'MRR', values: trend.data.values }]} formatValue={usdK} height={280} />
                ) : trend.status === 'error' ? (
                  <ContentState className="dashboard-panel-error" headingLevel={2} urgent icon={<CircleAlert />} title="Revenue didn’t load"
                    description={`That’s ${months(range)} months of revenue, and the request ran out of time. A second try usually does it.`}
                    action={{ label: 'Retry', onClick: retryTrend }} />
                ) : (
                  <Placeholder {...trendText} />
                )}
                {data ? (
                  <DataViz {...planText} headingLevel={2} type="donut" variant="thin" data={PLANS} centerLabel="MRR" formatValue={usd} height={280} />
                ) : (
                  <Placeholder {...planText} />
                )}
              </div>

              <div className="dashboard-table">
                <Table label="Top customers" headingLevel={2} rows={data?.customers ?? []} loading={loading} columns={COLUMNS(setPeek)}
                  rowLabel={(c) => c.name} onRowOpen={setPeek} openLabel="Quick look" density="compact" pagination={false} />
                <TextLink href="/customers" className="dashboard-more">See all customers</TextLink>
              </div>
            </>
          )}
        </main>

        <Drawer open={peek !== undefined} onOpenChange={(open) => !open && setPeek(undefined)} title={peek?.name ?? ''}
          description={peek && `${peek.plan} plan, customer since ${peek.since}`}
          footer={peek && (
            <div className="dashboard-peek-actions">
              <Button href={`/customers/${peek.id}`}>Open customer</Button>
              <Button variant="outline" href={`mailto:${peek.email}`}>Email {peek.contact.split(' ')[0]}</Button>
            </div>
          )}>
          {peek && (
            <div className="dashboard-peek">
              <Metric label="MRR" value={usd(peek.mrr)} size="large" />
              <dl className="dashboard-facts">
                {([
                  ['Status', <Tag label="Status" tone={STATUS[peek.status].tone} leading="dot" size="small">{STATUS[peek.status].text}</Tag>],
                  ['Contact', peek.contact],
                  ['Seats', count(peek.seats)],
                  ['Per seat', usd(peek.mrr / peek.seats)],
                ] as const).map(([term, value]) => (
                  <div key={term} className="dashboard-fact"><dt>{term}</dt><dd>{value}</dd></div>
                ))}
              </dl>
            </div>
          )}
        </Drawer>

        {notice && (
          <Toast key={notice.id} tone="success" title={notice.title} onDismiss={() => setNotice(undefined)} duration={6000}>
            {notice.text}
          </Toast>
        )}
      </div>
    </LucideProvider>
  )
}

const COLUMNS = (open: (customer: Customer) => void): TableColumn<Customer>[] => [
  { key: 'name', label: 'Customer', width: 240, sortValue: (c) => c.name, render: (c) => (
    <span className="dashboard-who">
      <button type="button" className="dashboard-who-name" onClick={() => open(c)}>{c.name}</button>
      <span className="dashboard-who-contact">{c.plan} · {c.contact}</span>
    </span>
  ) },
  { key: 'mrr', label: 'MRR', width: 110, numeric: true, render: (c) => usd(c.mrr), sortValue: (c) => c.mrr },
  { key: 'status', label: 'Status', width: 130, render: (c) => (
    <Tag label="Status" tone={STATUS[c.status].tone} leading="dot" size="small">{STATUS[c.status].text}</Tag>
  ) },
]

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <Card title={title} description={description} headingLevel={2} aria-busy="true">
      <span className="dashboard-bone dashboard-bone-chart" />
    </Card>
  )
}

const css = `
.dashboard { min-height: 100dvh; display: grid; grid-template-columns: auto minmax(0, 1fr); align-content: start; color: var(--diya-color-text); }
.dashboard-skip { position: absolute; left: 16px; top: 12px; z-index: 50; padding: 10px 16px; border-radius: var(--diya-radius-control);
  background: var(--diya-color-raised); color: var(--diya-color-text); font-size: var(--diya-text-body); box-shadow: var(--diya-shadow-raised); }
.dashboard-skip:not(:focus) { clip-path: inset(50%); width: 1px; height: 1px; overflow: hidden; white-space: nowrap; padding: 0; }
.dashboard-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; margin: 0; }

.dashboard-side { position: sticky; top: 0; height: 100dvh; display: flex; }
.dashboard-nav { height: 100%; overflow-y: auto; }
.dashboard-brand { display: inline-flex; align-items: center; gap: 10px; font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; color: var(--diya-color-text); }
.dashboard-mark {
  display: inline-grid; place-items: center; width: 28px; height: 28px; flex: none;
  border-radius: calc(8px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text);
  font-size: var(--diya-text-body); font-weight: 650; line-height: 1;
}
.dashboard-foot { display: flex; align-items: center; gap: 2px; margin-inline: -6px; }
.dashboard-foot[data-collapsed='true'] { flex-direction: column; margin-inline: 0; }
.dashboard-account {
  display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; padding: 6px; border: 0; border-radius: calc(10px * var(--diya-corner-scale, 1));
  background: none; color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.dashboard-account:hover { background: var(--diya-color-hover); }
.dashboard-account:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 2px; }
.dashboard-account-text { display: grid; min-width: 0; font-size: var(--diya-text-caption); line-height: 1.3; }
.dashboard-account-text strong { font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dashboard-account-text span { color: var(--diya-color-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.dashboard-bar { display: none; }
.dashboard-drawer-nav { width: auto; margin-inline: calc(-1 * var(--diya-space-3)); border: 0; padding: 0; background: none; }
.dashboard-drawer-foot { display: flex; margin: var(--diya-space-5) -6px 0; padding-top: var(--diya-space-4); border-top: 1px solid var(--diya-color-line); }

.dashboard-main { min-width: 0; width: 100%; max-width: calc(1200px + 2 * var(--diya-space-7)); display: grid; align-content: start; gap: var(--diya-space-7);
  padding: var(--diya-space-7) var(--diya-space-7) var(--diya-space-8); }
.dashboard-main:focus { outline: none; }
.dashboard-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--diya-space-4) var(--diya-space-5); }
.dashboard-heading { display: grid; gap: var(--diya-space-1); }
.dashboard-title { margin: 0; font-size: 28px; font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; }
.dashboard-title:focus { outline: none; }
.dashboard-lede { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.dashboard-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-3); }
.dashboard-range { width: 200px; }

.dashboard-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); padding-block: var(--diya-space-2); }
.dashboard-kpi { display: grid; align-content: start; gap: var(--diya-space-2); min-width: 0; padding-inline: var(--diya-space-5); border-left: 1px solid var(--diya-color-line); }
.dashboard-kpi:first-child { padding-left: 0; border-left: 0; }
.dashboard-charts { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr); gap: var(--diya-space-5); align-items: stretch; }
.dashboard-panel-error { max-width: none; margin: 0; display: grid; place-content: center; justify-items: center; }
.dashboard-empty { margin: var(--diya-space-5) auto 0; padding-block: var(--diya-space-7); }

.dashboard-bone { display: block; border-radius: calc(6px * var(--diya-corner-scale, 1)); background: color-mix(in srgb, var(--diya-color-text) 7%, transparent); animation: dashboard-pulse 1.4s ease-in-out infinite; }
.dashboard-bone-label { width: 60%; height: 16px; }
.dashboard-bone-figure { width: 75%; height: 40px; }
.dashboard-bone-change { width: 45%; height: 24px; }
.dashboard-bone-chart { height: 337px; }
@keyframes dashboard-pulse { 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) { .dashboard-bone { animation: none; } }

.dashboard-table { display: grid; gap: var(--diya-space-4); justify-items: start; }
.dashboard-table > :first-child { width: 100%; }
.dashboard-more { font-size: var(--diya-text-body); }
.dashboard-who { display: grid; gap: 2px; }
.dashboard-who-name { padding: 0; border: 0; border-radius: 4px; background: none; color: inherit; font: inherit; font-weight: 550; text-align: left; cursor: pointer; justify-self: start; }
.dashboard-who-name:hover { text-decoration: underline; text-underline-offset: 3px; }
.dashboard-who-name:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 2px; }
.dashboard-who-contact { color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.dashboard-peek { display: grid; gap: var(--diya-space-5); }
.dashboard-facts { display: grid; margin: 0; }
.dashboard-fact { display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-4); min-height: 48px; border-top: 1px solid var(--diya-color-line); font-size: var(--diya-text-body); }
.dashboard-fact:last-child { border-bottom: 1px solid var(--diya-color-line); }
.dashboard-fact dt { color: var(--diya-color-muted); font-weight: 400; }
.dashboard-fact dd { margin: 0; color: var(--diya-color-text); font-weight: 500; font-variant-numeric: tabular-nums; }
.dashboard-peek-actions { display: flex; flex-wrap: wrap; gap: var(--diya-space-3); }

@media (max-width: 1180px) {
  .dashboard-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: var(--diya-space-5); }
  .dashboard-kpi:nth-child(3) { padding-left: 0; border-left: 0; }
  .dashboard-charts { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 860px) {
  .dashboard { grid-template-columns: minmax(0, 1fr); }
  .dashboard-side { display: none; }
  .dashboard-bar {
    display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-2); position: sticky; top: 0; z-index: 10;
    height: 56px; box-sizing: border-box; padding: 0 var(--diya-space-2) 0 var(--diya-space-4);
    border-bottom: 1px solid var(--diya-color-line);
    background: color-mix(in srgb, var(--diya-color-surface) 82%, transparent); backdrop-filter: blur(20px) saturate(1.4);
  }
  .dashboard-main { padding: var(--diya-space-5) var(--diya-space-4) var(--diya-space-7); }
}
@media (max-width: 520px) {
  .dashboard-actions { width: 100%; }
  .dashboard-actions > :first-child { flex: 1; }
  .dashboard-kpi { padding-inline: 0 var(--diya-space-3); }
  .dashboard-kpi:nth-child(even) { padding-left: var(--diya-space-4); }
}
@media (max-width: 380px) {
  .dashboard-actions > :first-child { flex-basis: 100%; }
  .dashboard-kpis { grid-template-columns: minmax(0, 1fr); }
  .dashboard-kpis .dashboard-kpi { padding: 0; border: 0; }
}
`

'use client'
// Resource table: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/orders/page.tsx. Vite: save as src/ResourceTable.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState } from 'react'
import {
  Button, Choice, ContentState, Dialog, Drawer, Inline, List, Metric, PageHeader, Select, Stack, Table, Tag, TextArea, TextInput, TextLink, Toast,
  type TableColumn, type Tone,
} from '@idyeah/diya'
import { CloudAlert, LucideProvider, Pencil, Plus, ShoppingBag } from 'lucide-react'

// Your shop, its products and customers. Replace with your own.
const SHOP = 'Tidewell Coffee'
const NOW = '2026-11-06T07:12'
const PRODUCTS = {
  mt: { name: 'Morning Tide blend, 340 g', price: 18 },
  gu: { name: 'Ethiopia Guji, 250 g', price: 21 },
  nh: { name: 'Night Harbor decaf, 340 g', price: 19 },
  hu: { name: 'Colombia Huila, 250 g', price: 20 },
  kit: { name: 'Pour-over starter kit', price: 48 },
  mug: { name: 'Tidewell mug', price: 16 },
  sub: { name: 'Subscription, 2 bags a month', price: 34 },
}
const CITIES: Record<string, string> = {
  'Amara Okafor': 'Portland, OR', 'Diego Hernández': 'Austin, TX', 'Mei Tanaka': 'Seattle, WA', 'Priya Raman': 'Chicago, IL',
  'Jonas Lindqvist': 'Minneapolis, MN', 'Fatima Al-Sayed': 'Brooklyn, NY', 'Kwame Mensah': 'Atlanta, GA', 'Sofia Rossi': 'Boston, MA',
  'Liam O’Connor': 'Denver, CO', 'Hana Kim': 'Oakland, CA', 'Mateo Silva': 'Miami, FL', 'Aisha Bello': 'Raleigh, NC',
  'Noah Goldberg': 'Philadelphia, PA', 'Leilani Kahale': 'Honolulu, HI', 'Ravi Patel': 'Columbus, OH', 'Ingrid Berg': 'Burlington, VT',
}
// Order number, placed, customer, items and how many, payment, fulfillment.
const ORDERS: [number, string, string, Partial<Record<Product, number>>, Payment, Fulfillment][] = [
  [1052, '2026-11-05T16:48', 'Amara Okafor', { mt: 2 }, 'Paid', 'Unfulfilled'], [1051, '2026-11-05T11:02', 'Diego Hernández', { kit: 1, gu: 1 }, 'Paid', 'Unfulfilled'],
  [1050, '2026-11-05T08:15', 'Mei Tanaka', { sub: 1 }, 'Paid', 'Unfulfilled'], [1049, '2026-11-04T19:37', 'Priya Raman', { nh: 1 }, 'Paid', 'Unfulfilled'],
  [1048, '2026-11-04T09:41', 'Jonas Lindqvist', { mt: 1, mug: 2 }, 'Pending', 'Unfulfilled'], [1047, '2026-11-03T14:20', 'Fatima Al-Sayed', { gu: 2 }, 'Paid', 'Shipped'],
  [1046, '2026-11-03T07:55', 'Kwame Mensah', { hu: 1, mt: 1 }, 'Paid', 'Shipped'], [1045, '2026-11-02T18:10', 'Sofia Rossi', { sub: 1 }, 'Paid', 'Shipped'],
  [1044, '2026-11-01T10:26', 'Liam O’Connor', { kit: 1 }, 'Paid', 'Shipped'], [1043, '2026-10-31T15:03', 'Hana Kim', { mt: 3 }, 'Paid', 'Delivered'],
  [1042, '2026-10-30T12:47', 'Mateo Silva', { nh: 2 }, 'Paid', 'Delivered'], [1041, '2026-10-29T09:12', 'Aisha Bello', { gu: 1, hu: 1 }, 'Refunded', 'Delivered'],
  [1040, '2026-10-28T20:30', 'Noah Goldberg', { mug: 1 }, 'Paid', 'Delivered'], [1039, '2026-10-27T13:58', 'Leilani Kahale', { sub: 1 }, 'Paid', 'Delivered'],
  [1038, '2026-10-26T08:44', 'Ravi Patel', { mt: 2, nh: 1 }, 'Paid', 'Delivered'], [1037, '2026-10-24T17:21', 'Ingrid Berg', { kit: 1, mt: 1 }, 'Paid', 'Delivered'],
  [1036, '2026-10-23T11:39', 'Amara Okafor', { gu: 1 }, 'Paid', 'Delivered'], [1035, '2026-10-22T09:05', 'Diego Hernández', { mt: 6 }, 'Pending', 'Delivered'],
  [1034, '2026-10-20T15:50', 'Mei Tanaka', { hu: 2 }, 'Paid', 'Delivered'], [1033, '2026-10-19T10:18', 'Priya Raman', { sub: 1 }, 'Paid', 'Delivered'],
  [1032, '2026-10-17T19:02', 'Kwame Mensah', { mt: 1, mug: 1 }, 'Paid', 'Delivered'], [1031, '2026-10-16T12:33', 'Fatima Al-Sayed', { nh: 1 }, 'Paid', 'Delivered'],
  [1030, '2026-10-15T08:27', 'Sofia Rossi', { kit: 1, gu: 1 }, 'Paid', 'Delivered'], [1029, '2026-10-13T16:14', 'Jonas Lindqvist', { mt: 2 }, 'Paid', 'Delivered'],
  [1028, '2026-10-12T09:49', 'Hana Kim', { sub: 1 }, 'Paid', 'Delivered'], [1027, '2026-10-10T14:06', 'Liam O’Connor', { gu: 1 }, 'Refunded', 'Delivered'],
  [1026, '2026-10-09T11:25', 'Mateo Silva', { hu: 1, mt: 1 }, 'Paid', 'Delivered'], [1025, '2026-10-08T18:40', 'Aisha Bello', { mt: 1 }, 'Paid', 'Delivered'],
  [1024, '2026-10-05T10:11', 'Noah Goldberg', { kit: 1 }, 'Paid', 'Delivered'], [1023, '2026-10-03T13:30', 'Ravi Patel', { gu: 2 }, 'Paid', 'Delivered'],
  [1022, '2026-10-01T09:02', 'Leilani Kahale', { mt: 1, nh: 1 }, 'Paid', 'Delivered'], [1021, '2026-09-28T15:45', 'Ingrid Berg', { sub: 1 }, 'Paid', 'Delivered'],
  [1020, '2026-09-26T12:12', 'Amara Okafor', { mug: 2 }, 'Paid', 'Delivered'], [1019, '2026-09-24T08:38', 'Diego Hernández', { hu: 1 }, 'Paid', 'Delivered'],
]
const NOTES: Record<number, string> = { 1048: 'A gift. Please leave the receipt out of the box.' }

type Product = keyof typeof PRODUCTS
type Payment = 'Paid' | 'Pending' | 'Refunded'
type Fulfillment = 'Unfulfilled' | 'Shipped' | 'Delivered'
type Order = {
  id: string; number: number; placed: string; name: string; email: string; city: string
  lines: { product: Product; qty: number }[]; payment: Payment; fulfillment: Fulfillment; tracking: string; note: string
}
type Period = 'today' | '7d' | '30d' | 'all'

const CSV_NAME = `${SHOP.split(' ')[0].toLowerCase()}-orders.csv`

const PERIODS = [
  { value: 'today', label: 'Today', since: '2026-11-06', phrase: 'today' },
  { value: '7d', label: 'Last 7 days', since: '2026-10-30', phrase: 'in the last 7 days' },
  { value: '30d', label: 'Last 30 days', since: '2026-10-07', phrase: 'in the last 30 days' },
  { value: 'all', label: 'All time', since: '', phrase: 'since you opened the shop' },
] as const
const periodOf = (value: Period) => PERIODS.find((period) => period.value === value)!

// Replace with your API calls. Each stub waits a moment. Loading All time times
// out every other try, the way a big query can; Try again works.
let database: Order[] = ORDERS.map(([number, placed, name, items, payment, fulfillment]) => ({
  id: String(number), number, placed, name, email: `${name.split(' ')[0].toLowerCase()}@example.com`, city: CITIES[name],
  lines: Object.entries(items).map(([product, qty]) => ({ product: product as Product, qty })),
  payment, fulfillment, note: NOTES[number] ?? '',
  tracking: fulfillment === 'Unfulfilled' ? '' : `9400 1118 2026 ${number} ${String(number % 97).padStart(2, '0')}`,
}))
let allTimeTries = 0
const wait = (ms = 800) => new Promise((resolve) => setTimeout(resolve, ms))
const api = {
  async orders(period: Period) {
    await wait(900)
    if (period === 'all' && allTimeTries++ % 2 === 0) throw new Error('timeout')
    return database.filter((order) => order.placed >= periodOf(period).since)
  },
  async create(order: Omit<Order, 'id' | 'number'>) {
    await wait()
    const number = Math.max(...database.map((item) => item.number)) + 1
    const created = { ...order, id: String(number), number }
    database = [created, ...database]
    return created
  },
  async save(order: Order) {
    await wait()
    database = database.map((item) => (item.id === order.id ? order : item))
    return order
  },
  async archive(ids: string[]) {
    await wait()
    database = database.filter((item) => !ids.includes(item.id))
  },
}

const money = (amount: number) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const placedAt = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const subtotal = (order: Pick<Order, 'lines'>) => order.lines.reduce((sum, line) => sum + PRODUCTS[line.product].price * line.qty, 0)
const shipping = (order: Pick<Order, 'lines'>) => (subtotal(order) >= 50 ? 0 : 6)
const total = (order: Pick<Order, 'lines'>) => subtotal(order) + shipping(order)
const itemCount = (order: Order) => order.lines.reduce((sum, line) => sum + line.qty, 0)
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
const toneOf: Record<Payment | Fulfillment, Tone> = { Paid: 'neutral', Pending: 'warning', Refunded: 'neutral', Unfulfilled: 'warning', Shipped: 'info', Delivered: 'neutral' }

type Notice = { title: string; text: string }

export default function ResourceTableScreen() {
  const [period, setPeriod] = useState<Period>('30d')
  const [orders, setOrders] = useState<Order[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [openId, setOpenId] = useState<string>()
  const [creating, setCreating] = useState(false)
  const [toArchive, setToArchive] = useState<string[]>([])
  const [notice, setNotice] = useState<Notice>()

  useEffect(() => {
    let current = true
    setStatus('loading')
    api.orders(period).then(
      (rows) => {
        if (!current) return
        setOrders(rows)
        setStatus('ready')
      },
      () => current && setStatus('error'),
    )
    return () => { current = false }
  }, [period, attempt])

  const open = orders.find((order) => order.id === openId)
  const archiving = orders.filter((order) => toArchive.includes(order.id))
  const { phrase } = periodOf(period)

  function exportCsv(ids: string[]) {
    const rows = orders.filter((order) => ids.includes(order.id))
    const lines = [['Order', 'Placed', 'Customer', 'Email', 'Items', 'Payment', 'Fulfillment', 'Total']]
    for (const o of rows) lines.push([`#${o.number}`, o.placed, o.name, o.email, String(itemCount(o)), o.payment, o.fulfillment, total(o).toFixed(2)])
    const csv = lines.map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    Object.assign(document.createElement('a'), { href: url, download: CSV_NAME }).click()
    URL.revokeObjectURL(url)
    setNotice({ title: `Exported ${plural(rows.length, 'order')}`, text: `${CSV_NAME} is in your downloads.` })
  }

  const columns: TableColumn<Order>[] = [
    {
      key: 'number', label: 'Order', width: 112, sortValue: (o) => o.number,
      render: (o) => (
        <TextLink asChild>
          <button type="button" className="resource-table-open" onClick={() => setOpenId(o.id)}>#{o.number}</button>
        </TextLink>
      ),
    },
    { key: 'placed', label: 'Placed', width: 168, sortValue: (o) => o.placed, render: (o) => <span className="resource-table-muted">{placedAt(o.placed)}</span> },
    { key: 'customer', label: 'Customer', width: 200, sortValue: (o) => o.name, render: (o) => o.name },
    { key: 'items', label: 'Items', width: 96, numeric: true, sortValue: itemCount, render: (o) => itemCount(o) },
    { key: 'payment', label: 'Payment', width: 136, render: (o) => <Tag label="Payment" tone={toneOf[o.payment]} leading="dot" size="small">{o.payment}</Tag> },
    { key: 'fulfillment', label: 'Fulfillment', width: 148, render: (o) => <Tag label="Fulfillment" tone={toneOf[o.fulfillment]} leading="dot" size="small">{o.fulfillment}</Tag> },
    { key: 'total', label: 'Total', width: 112, numeric: true, sortValue: total, render: (o) => <span className="resource-table-figure">{money(total(o))}</span> },
  ]

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <main className="resource-table">
        <style>{css}</style>
        <PageHeader
          surface={false}
          headingLevel={1}
          title="Orders"
          description={status === 'loading' ? 'Counting orders…' : status === 'error' ? `Every order ${phrase}` : `${plural(orders.length, 'order')} ${phrase}`}
          actions={
            <Inline gap={3}>
              <Select className="resource-table-period" label="Period" hideLabel options={PERIODS.map(({ value, label }) => ({ value, label }))} value={period}
                onValueChange={(value) => setPeriod(value as Period)} />
              <Button onClick={() => setCreating(true)}><Plus /> New order</Button>
            </Inline>
          }
        />

        {status === 'error' ? (
          <ContentState
            headingLevel={2}
            urgent
            className="resource-table-state"
            icon={<CloudAlert />}
            title="Orders didn’t load"
            description="All time is a lot of coffee, and the request ran out of time. Your orders are safe; give it another go."
            action={{ label: 'Try again', onClick: () => setAttempt(attempt + 1) }}
          />
        ) : status === 'ready' && orders.length === 0 ? (
          <ContentState
            headingLevel={2}
            className="resource-table-state"
            icon={<ShoppingBag />}
            title={period === 'today' ? 'No orders yet today' : 'No orders yet'}
            description={`${period === 'today' ? 'It’s 7:12 in the morning. ' : ''}Orders land here the moment someone checks out. Selling by phone or at the counter? Add it by hand.`}
            action={{ label: 'New order', onClick: () => setCreating(true) }}
          />
        ) : (
          <>
            <Figures orders={orders} loading={status === 'loading'} />
            {/* Search, filters, sort and paging run in the browser on the rows you
                pass, which suits a few thousand orders. Beyond that, keep the query,
                filters, sort and page in state, send them to your API, and pass back
                one page of rows with pagination={false} and DIYA's Pagination. */}
            <Table
              label="Orders"
              showTitle={false}
              rows={orders}
              columns={columns}
              density="compact"
              loading={status === 'loading'}
              loadingLabel="Loading orders…"
              defaultPageSize={25}
              pageSizeOptions={[25, 50, 100]}
              rowLabel={(o) => `Order ${o.number}, ${o.name}`}
              searchText={(o) => `#${o.number} ${o.number} ${o.name} ${o.email} ${o.city} ${o.lines.map((line) => PRODUCTS[line.product].name).join(' ')}`}
              filterOptions={[
                { key: 'payment', label: 'Payment', options: ['Paid', 'Pending', 'Refunded'], getValue: (o) => o.payment },
                { key: 'fulfillment', label: 'Fulfillment', options: ['Unfulfilled', 'Shipped', 'Delivered'], getValue: (o) => o.fulfillment },
              ]}
              onRowOpen={(o) => setOpenId(o.id)}
              openLabel="Open order"
              bulkActions={[
                { label: 'Export', onAction: exportCsv },
                { label: 'Archive', onAction: setToArchive },
              ]}
            />
          </>
        )}

        <OrderDrawer
          order={open}
          onClose={() => setOpenId(undefined)}
          onSaved={(saved) => {
            setOrders(orders.map((order) => (order.id === saved.id ? saved : order)))
            setNotice({ title: `Order #${saved.number} saved`, text: saved.fulfillment === 'Shipped' ? `${saved.name.split(' ')[0]} gets the tracking link by email.` : 'Your changes are in.' })
          }}
        />
        <NewOrderDialog
          open={creating}
          onClose={() => setCreating(false)}
          onCreated={(order) => {
            setOrders([order, ...orders])
            setNotice({ title: `Order #${order.number} created`, text: `It’s at the top of the list, and ${order.name.split(' ')[0]} gets ${order.payment === 'Paid' ? 'a receipt' : 'a payment link'} by email.` })
          }}
        />
        <Dialog
          open={toArchive.length > 0}
          onOpenChange={(next) => !next && setToArchive([])}
          size="small"
          headingLevel={2}
          title={archiving.length === 1 ? `Archive order #${archiving[0].number}?` : `Archive ${archiving.length} orders?`}
          description="Archived orders leave this list but stay in your reports and your customers’ history."
          confirmLabel={archiving.length === 1 ? 'Archive order' : `Archive ${archiving.length} orders`}
          dismissLabel="Keep them"
          onConfirm={async () => {
            await api.archive(toArchive)
            setOrders(orders.filter((order) => !toArchive.includes(order.id)))
            setNotice({ title: `Archived ${plural(toArchive.length, 'order')}`, text: 'They’re out of the way, and still in your reports.' })
            setToArchive([])
          }}
        >
          <List label="Orders to archive" size="small"
            items={archiving.map((o) => ({ id: o.id, label: `#${o.number} · ${o.name}`, trailing: money(total(o)) }))} />
        </Dialog>
        {notice && (
          <Toast key={notice.title} tone="success" title={notice.title} onDismiss={() => setNotice(undefined)}>{notice.text}</Toast>
        )}
      </main>
    </LucideProvider>
  )
}

function Figures({ orders, loading }: { orders: Order[]; loading: boolean }) {
  const paid = orders.filter((o) => o.payment !== 'Refunded')
  const sales = paid.reduce((sum, o) => sum + total(o), 0)
  const figures = [
    { label: 'Sales', value: money(sales) },
    { label: 'Average order', value: money(paid.length ? sales / paid.length : 0) },
    { label: 'To ship', value: String(orders.filter((o) => o.fulfillment === 'Unfulfilled').length) },
    { label: 'Refunded', value: money(orders.filter((o) => o.payment === 'Refunded').reduce((sum, o) => sum + total(o), 0)) },
  ]
  return (
    <section className="resource-table-figures" aria-label="Summary" aria-busy={loading}>
      {figures.map((figure) => (
        <Metric key={figure.label} className="resource-table-figure-cell" label={figure.label} value={loading ? '—' : figure.value} />
      ))}
    </section>
  )
}

function OrderDrawer({ order, onClose, onSaved }: { order?: Order; onClose: () => void; onSaved: (order: Order) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ fulfillment: 'Unfulfilled' as Fulfillment, tracking: '', note: '' })
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const trackingField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditing(false)
    setError(undefined)
  }, [order?.id])

  function edit() {
    if (!order) return
    setDraft({ fulfillment: order.fulfillment, tracking: order.tracking, note: order.note })
    setEditing(true)
  }

  async function save() {
    if (!order) return
    if (draft.fulfillment !== 'Unfulfilled' && !draft.tracking.trim()) {
      setError('Add the tracking number before you mark it shipped.')
      return trackingField.current?.focus()
    }
    setBusy(true)
    const saved = await api.save({ ...order, ...draft, tracking: draft.tracking.trim(), note: draft.note.trim() })
    setBusy(false)
    setEditing(false)
    onSaved(saved)
  }

  return (
    <Drawer
      open={!!order}
      onOpenChange={(next) => !next && onClose()}
      headingLevel={2}
      title={order ? `Order #${order.number}` : 'Order'}
      description={order ? `Placed ${placedAt(order.placed)}` : undefined}
      footer={order && (editing ? (
        <Inline gap={2} justify="end">
          <Button variant="quiet" onClick={() => setEditing(false)}>Cancel</Button>
          <Button loading={busy} onClick={save}>Save changes</Button>
        </Inline>
      ) : (
        <Inline gap={2} justify="end">
          <Button variant="outline" onClick={edit}><Pencil /> Edit order</Button>
        </Inline>
      ))}
    >
      {order ? (
        <Stack gap={6}>
          <Inline gap={3} justify="between" align="end">
            <Metric label="Total" value={money(total(order))} size="large" />
            <Inline gap={2}>
              <Tag label="Payment" tone={toneOf[order.payment]} leading="dot">{order.payment}</Tag>
              <Tag label="Fulfillment" tone={toneOf[order.fulfillment]} leading="dot">{order.fulfillment}</Tag>
            </Inline>
          </Inline>
          <section className="resource-table-section">
            <h3 className="resource-table-section-title">Customer</h3>
            <p className="resource-table-line"><strong className="resource-table-strong">{order.name}</strong></p>
            <p className="resource-table-line"><TextLink href={`mailto:${order.email}`} inline>{order.email}</TextLink></p>
            <p className="resource-table-line resource-table-muted">{order.city ? `Ships to ${order.city}` : 'Picked up at the shop'}</p>
          </section>
          <section className="resource-table-section">
            <h3 className="resource-table-section-title">Items</h3>
            <List label={`Items in order ${order.number}`} divided size="small"
              items={[
                ...order.lines.map((line, index) => ({
                  id: `${index}`, label: PRODUCTS[line.product].name,
                  description: `${line.qty} × ${money(PRODUCTS[line.product].price)}`, trailing: money(PRODUCTS[line.product].price * line.qty),
                })),
                { id: 'shipping', label: 'Shipping', trailing: shipping(order) ? money(shipping(order)) : 'Free' },
              ]} />
          </section>
          {editing ? (
            <Stack gap={4}>
              <Select label="Fulfillment" options={['Unfulfilled', 'Shipped', 'Delivered'].map((value) => ({ value, label: value }))} value={draft.fulfillment}
                onValueChange={(value) => { setDraft({ ...draft, fulfillment: value as Fulfillment }); setError(undefined) }} />
              <TextInput ref={trackingField} label="Tracking number" autoComplete="off" spellCheck={false} value={draft.tracking} error={error}
                onValueChange={(tracking) => { setDraft({ ...draft, tracking }); setError(undefined) }} />
              <TextArea label="Note" rows={3} maxLength={240} showCount helperText="Only your team sees this." value={draft.note}
                onValueChange={(note) => setDraft({ ...draft, note })} />
            </Stack>
          ) : (
            <section className="resource-table-section">
              <h3 className="resource-table-section-title">Delivery</h3>
              <p className="resource-table-line">{order.tracking ? <>Tracking <span className="resource-table-figure">{order.tracking}</span></> : 'Not shipped yet'}</p>
              {order.note && <p className="resource-table-line resource-table-muted">{order.note}</p>}
            </section>
          )}
        </Stack>
      ) : <span />}
    </Drawer>
  )
}

const BLANK = { name: '', email: '', product: 'mt' as Product, qty: '1', payment: 'paid' }

function NewOrderDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (order: Order) => void }) {
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const nameField = useRef<HTMLInputElement>(null)
  const emailField = useRef<HTMLInputElement>(null)
  const lines = [{ product: form.product, qty: Number(form.qty) }]
  const set = (patch: Partial<typeof BLANK>) => setForm({ ...form, ...patch })

  async function create() {
    const found = {
      name: form.name.trim() ? undefined : 'Enter the customer’s name.',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? undefined : 'Enter an email like name@example.com, for the receipt.',
    }
    setErrors(found)
    if (found.name || found.email) {
      const field = found.name ? nameField : emailField
      field.current?.focus()
      return false
    }
    const order = await api.create({
      placed: NOW, name: form.name.trim(), email: form.email.trim(), city: '', lines,
      payment: form.payment === 'paid' ? 'Paid' : 'Pending', fulfillment: 'Unfulfilled', tracking: '', note: '',
    })
    onCreated(order)
    setForm(BLANK)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) { onClose(); setErrors({}) } }}
      headingLevel={2}
      title="New order"
      description="For sales by phone, at the counter or wholesale."
      confirmLabel="Create order"
      onConfirm={create}
    >
      <Stack gap={4}>
        <TextInput ref={nameField} label="Customer name" autoComplete="off" value={form.name} error={errors.name}
          onValueChange={(name) => { set({ name }); setErrors({ ...errors, name: undefined }) }} />
        <TextInput ref={emailField} label="Email" type="email" autoComplete="off" value={form.email} error={errors.email}
          onValueChange={(email) => { set({ email }); setErrors({ ...errors, email: undefined }) }} />
        <div className="resource-table-pair">
          <Select label="Product" value={form.product} onValueChange={(product) => set({ product: product as Product })}
            options={Object.entries(PRODUCTS).map(([value, product]) => ({ value, label: `${product.name}, ${money(product.price)}` }))} />
          <Select label="Quantity" value={form.qty} onValueChange={(qty) => set({ qty })}
            options={['1', '2', '3', '4', '5', '6'].map((value) => ({ value, label: value }))} />
        </div>
        <Choice label="Payment" value={form.payment} onValueChange={(payment) => set({ payment })}
          options={[{ value: 'paid', label: 'Paid already' }, { value: 'pending', label: 'Email a payment link' }]} />
        <p className="resource-table-total" aria-live="polite">
          Total <strong className="resource-table-strong resource-table-figure">{money(total({ lines }))}</strong>
          {shipping({ lines }) ? ` with ${money(shipping({ lines }))} shipping` : ', ships free'}
        </p>
      </Stack>
    </Dialog>
  )
}

const css = `
.resource-table {
  min-height: 100dvh;
  box-sizing: border-box;
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--diya-space-7) var(--diya-space-7) var(--diya-space-8);
  display: flex;
  flex-direction: column;
  gap: var(--diya-space-6);
  color: var(--diya-color-text);
}
.resource-table-period { width: 168px; }
.resource-table-figures {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding-block: var(--diya-space-5);
  border-block: 1px solid var(--diya-color-line);
}
.resource-table-figure-cell { padding-inline: var(--diya-space-5); }
.resource-table-figure-cell:first-child { padding-inline-start: 0; }
.resource-table-figure-cell + .resource-table-figure-cell { border-inline-start: 1px solid var(--diya-color-line); }
.resource-table-figures[aria-busy='true'] { color: var(--diya-color-muted); }
.resource-table-state { margin-block: var(--diya-space-7); }
.resource-table-open {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.resource-table-muted { color: var(--diya-color-muted); }
.resource-table-figure { font-variant-numeric: tabular-nums; }
.resource-table-strong { font-weight: 600; color: var(--diya-color-text); }
.resource-table-section { display: grid; gap: var(--diya-space-2); }
.resource-table-section-title {
  margin: 0 0 var(--diya-space-1);
  font-size: var(--diya-text-caption);
  font-weight: 600;
  color: var(--diya-color-muted);
}
.resource-table-line { margin: 0; font-size: var(--diya-text-body); line-height: var(--diya-leading-body); overflow-wrap: anywhere; }
.resource-table-pair { display: grid; grid-template-columns: minmax(0, 1fr) 112px; gap: var(--diya-space-4); }
.resource-table-total { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); }
@media (max-width: 960px) {
  .resource-table { padding: var(--diya-space-6) var(--diya-space-5) var(--diya-space-7); }
  .resource-table-period { width: 168px; }
.resource-table-figures { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: var(--diya-space-5); }
  .resource-table-figure-cell:nth-child(3) { padding-inline-start: 0; border-inline-start: 0; }
}
@media (max-width: 520px) {
  .resource-table { padding: var(--diya-space-5) var(--diya-space-4) var(--diya-space-7); gap: var(--diya-space-5); }
  .resource-table-figure-cell { padding-inline: var(--diya-space-4); }
  .resource-table-pair { grid-template-columns: minmax(0, 1fr); }
}
`

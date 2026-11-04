'use client'
// Record detail: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/customers/[id]/page.tsx. Vite: save as src/RecordDetail.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Avatar, Breadcrumbs, Button, Card, ContentState, Dialog, List, Menu, Metric, Progress, Select, Table, Tabs, Tag, TextArea, TextLink, Toast,
  type ListItem, type Tone,
} from '@idyeah/diya'
import { ChevronLeft, CircleCheck, Copy, CreditCard, Download, Ellipsis, Headset, LucideProvider, Mail, Pencil, Receipt, Trash, UserPlus, UserRound } from 'lucide-react'

// The customer this page shows. In your app, load it by the id in the URL.
const CUSTOMER = {
  id: 'ostara-health',
  name: 'Ostara Health',
  plan: 'Enterprise',
  seats: 240,
  seatLimit: 250,
  mrr: 4320,
  lifetime: 71640,
  since: 'May 13, 2024',
  nextInvoice: 'Dec 1, 2026',
  payment: 'Card ending 0417',
  owner: 'Diego Fernández',
  ref: 'cus_7Q2LK9',
  contact: { name: 'Amara Okafor', role: 'Head of operations', email: 'amara.okafor@example.com' },
}

type Kind = 'billing' | 'seats' | 'account' | 'support'
type Event = { id: string; kind: Kind; title: string; detail: string; date: string; amount?: string }

const ACTIVITY: Event[] = [
  { id: 'e7', kind: 'billing', title: 'Invoice INV-1187 sent', detail: 'Due Nov 15', date: 'Nov 1', amount: '$4,320' },
  { id: 'e6', kind: 'seats', title: 'Added 30 seats', detail: '210 to 240 seats, by Amara Okafor', date: 'Oct 14', amount: '+$540 MRR' },
  { id: 'e5', kind: 'billing', title: 'Invoice INV-1129 paid', detail: 'Card ending 0417', date: 'Oct 3', amount: '$3,780' },
  { id: 'e4', kind: 'account', title: 'Amara Okafor is the billing contact', detail: 'Changed by Diego Fernández', date: 'Sep 22' },
  { id: 'e3', kind: 'billing', title: 'Invoice INV-1071 paid', detail: 'Card ending 0417', date: 'Sep 2', amount: '$3,780' },
  { id: 'e2', kind: 'seats', title: 'Added 30 seats', detail: '180 to 210 seats, by Amara Okafor', date: 'Aug 3', amount: '+$540 MRR' },
  { id: 'e1', kind: 'account', title: 'Payment card updated', detail: 'Card ending 0417, expires 09/29', date: 'Jul 28' },
]
const KINDS = [
  { value: 'all', label: 'All activity' },
  { value: 'billing', label: 'Billing' },
  { value: 'seats', label: 'Seats' },
  { value: 'account', label: 'Account' },
  { value: 'support', label: 'Support' },
]
const ICONS: Record<Kind, ReactNode> = { billing: <Receipt />, seats: <UserPlus />, account: <UserRound />, support: <Headset /> }

type Invoice = { id: string; date: string; amount: number; status: 'open' | 'paid'; paidOn?: string }
const INVOICES: Invoice[] = [
  { id: 'INV-1187', date: 'Nov 1, 2026', amount: 4320, status: 'open' },
  { id: 'INV-1129', date: 'Oct 1, 2026', amount: 3780, status: 'paid', paidOn: 'Oct 3' },
  { id: 'INV-1071', date: 'Sep 1, 2026', amount: 3780, status: 'paid', paidOn: 'Sep 2' },
  { id: 'INV-1016', date: 'Aug 1, 2026', amount: 3240, status: 'paid', paidOn: 'Aug 4' },
  { id: 'INV-0962', date: 'Jul 1, 2026', amount: 3240, status: 'paid', paidOn: 'Jul 2' },
  { id: 'INV-0905', date: 'Jun 1, 2026', amount: 3240, status: 'paid', paidOn: 'Jun 3' },
]
const NOTES = {
  text: 'Renewal call is booked for January 12. They want single sign-on for the clinical team before adding the next 60 seats, so bring Tomás from engineering.\n\nAmara prefers email to calls and answers fastest before 10 AM.',
  by: 'Diego Fernández',
  on: 'Oct 20',
}

type Tab = 'overview' | 'activity' | 'invoices' | 'notes'
type Route = `/customers/${string}`

// Replace with your API calls. Each waits a moment, then goes through.
async function api(request: { route: Route; method?: 'PUT' | 'DELETE'; body?: Record<string, string> }) {
  await new Promise((resolve) => setTimeout(resolve, request.method ? 900 : 700))
  return true
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format
const first = (name: string) => name.split(' ')[0]

export default function RecordDetailScreen() {
  const [tab, setTab] = useState<Tab>('overview')
  const [loaded, setLoaded] = useState<Tab[]>(['overview'])
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [notice, setNotice] = useState<{ id: number; title: string; text: string; tone?: 'info' }>()
  const headingRef = useRef<HTMLDivElement>(null)
  const [moved, moveFocus] = useState(0)
  const c = CUSTOMER

  // On a tab's first visit, load its data.
  useEffect(() => {
    if (loaded.includes(tab)) return
    let live = true
    api({ route: `/customers/${c.id}/${tab}` }).then(() => live && setLoaded((done) => [...done, tab]))
    return () => {
      live = false
    }
  }, [tab, loaded, c.id])

  // When the page swaps between the customer and "deleted", move focus to its heading.
  useEffect(() => {
    if (!moved) return
    requestAnimationFrame(() => {
      const heading = headingRef.current?.querySelector('h1')
      heading?.setAttribute('tabindex', '-1')
      heading?.focus()
    })
  }, [moved])

  async function remove() {
    await api({ route: `/customers/${c.id}`, method: 'DELETE' })
    setDeleted(true)
    setNotice(undefined)
    moveFocus(Date.now())
  }

  function undo() {
    setDeleted(false)
    setNotice({ id: Date.now(), title: `${c.name} is back`, text: 'Notes, activity and all.' })
    moveFocus(Date.now())
  }

  const notify = (title: string, text: string, tone?: 'info') => setNotice({ id: Date.now(), title, text, tone })
  const copyId = () =>
    (navigator.clipboard ? navigator.clipboard.writeText(c.ref) : Promise.reject(new Error('No clipboard'))).then(
      () => notify('Customer ID copied', c.ref),
      () => notify('Here’s the customer ID', `Your browser blocked copying, so here it is: ${c.ref}`, 'info'),
    )
  const ready = loaded.includes(tab)

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="record-detail">
        <style>{css}</style>
        <header className="record-detail-bar">
          <a className="record-detail-back" href="/customers"><ChevronLeft /> Customers</a>
          <Menu label="Account" items={[{ id: 'settings', label: 'Account settings', href: '/settings' }, { id: 'sign-out', label: 'Sign out', href: '/sign-out' }]}
            trigger={<button type="button" className="record-detail-account" aria-label={`${c.owner}: account`}><Avatar name={c.owner} size="small" /></button>} />
        </header>
        <main className="record-detail-page" ref={headingRef}>
          <div className="record-detail-crumbs">
            <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: c.name, href: `/customers/${c.id}` }]} />
          </div>

          {deleted ? (
            <ContentState className="record-detail-gone" headingLevel={1} icon={<Trash />} title={`${c.name} was deleted`}
              description={<>Its subscription and invoices are still in your billing system. Changed your mind? Undo it now, or go <TextLink href="/customers" inline>back to customers</TextLink>.</>}
              action={{ label: 'Undo', onClick: undo }} />
          ) : (
            <>
              <header className="record-detail-head">
                <Avatar name={c.name} size="large" shape="rounded" aria-hidden="true" />
                <div className="record-detail-heading">
                  <h1 className="record-detail-title" tabIndex={-1}>{c.name}</h1>
                  <div className="record-detail-meta">
                    <Tag label="Status" tone="success" leading="dot" size="small">Active</Tag>
                    <span>{c.plan} · {c.seats} seats · Customer since May 2024</span>
                  </div>
                </div>
                <div className="record-detail-actions">
                  <Button variant="outline" href={`mailto:${c.contact.email}`}><Mail /> Email {first(c.contact.name)}</Button>
                  <Menu label={`More actions for ${c.name}`} trigger={<Button variant="outline" iconOnly aria-label={`More actions for ${c.name}`}><Ellipsis /></Button>} items={[
                    { id: 'copy', label: 'Copy customer ID', icon: <Copy />, onSelect: copyId },
                    { id: 'billing', label: 'Open in billing system', icon: <CreditCard />, href: `/billing/customers/${c.ref}` },
                    { id: 'export', label: 'Export history', icon: <Download />, onSelect: () => notify('Export on its way', `We’ll email ${c.id}-history.csv to you in a minute.`) },
                    { id: 'delete', label: 'Delete customer', icon: <Trash />, destructive: true, separatorBefore: true, onSelect: () => setDeleting(true) },
                  ]} />
                </div>
              </header>

              <div className="record-detail-body">
                <Tabs className="record-detail-tabs" label={`${c.name} sections`} value={tab} onValueChange={(value) => setTab(value as Tab)} items={[
                  { value: 'overview', label: 'Overview', content: tab === 'overview' && <Overview onAll={() => setTab('activity')} /> },
                  { value: 'activity', label: 'Activity', content: tab === 'activity' && (ready ? <Activity /> : <Loading title="Activity" label="Loading activity" />) },
                  { value: 'invoices', label: 'Invoices', badge: { variant: 'count', count: 1, label: 'unpaid invoice' },
                    content: tab === 'invoices' && <Invoices loading={!ready} onRemind={(id) => notify('Reminder sent', `${first(c.contact.name)} will get a nudge about ${id} within the hour.`)} /> },
                  { value: 'notes', label: 'Notes', content: tab === 'notes' && (ready ? <Notes onSaved={() => notify('Notes saved', 'Everyone on the account can see them now.')} /> : <Loading title="Account notes" label="Loading notes" />) },
                ]} />

                <aside className="record-detail-side" aria-label="About this customer">
                  <Card title="Details" headingLevel={2}>
                    <div className="record-detail-contact">
                      <Avatar name={c.contact.name} size="small" />
                      <span className="record-detail-contact-text">
                        <span className="record-detail-strong">{c.contact.name}</span>
                        <span className="record-detail-sub">{c.contact.role}</span>
                        <TextLink href={`mailto:${c.contact.email}`} inline className="record-detail-email">{c.contact.email}</TextLink>
                      </span>
                    </div>
                    <dl className="record-detail-facts">
                      {([
                        ['Plan', `${c.plan}, monthly`],
                        ['Seats', `${c.seats} of ${c.seatLimit}`],
                        ['MRR', usd(c.mrr)],
                        ['Next invoice', c.nextInvoice],
                        ['Payment', c.payment],
                        ['Customer since', c.since],
                        ['Account owner', c.owner],
                        ['Customer ID', c.ref],
                      ] as const).map(([term, value]) => <div key={term} className="record-detail-fact"><dt>{term}</dt><dd>{value}</dd></div>)}
                    </dl>
                  </Card>
                </aside>
              </div>
            </>
          )}
        </main>

        <Dialog open={deleting} onOpenChange={setDeleting} title={`Delete ${c.name}?`} size="small"
          description="Its notes, activity and usage history leave Tideline for good. The subscription and invoices stay in your billing system."
          confirmLabel="Delete customer" confirmVariant="destructive" onConfirm={remove} />

        {notice && (
          <Toast key={notice.id} tone={notice.tone ?? 'success'} title={notice.title} onDismiss={() => setNotice(undefined)} duration={6000}>
            {notice.text}
          </Toast>
        )}
      </div>
    </LucideProvider>
  )
}

const eventItems = (events: Event[]): ListItem[] =>
  events.map((e) => ({ id: e.id, label: e.title, description: `${e.date} · ${e.detail}`, leading: <span className="record-detail-glyph">{ICONS[e.kind]}</span>, trailing: e.amount }))

function Overview({ onAll }: { onAll: () => void }) {
  const c = CUSTOMER
  return (
    <div className="record-detail-panel">
      <section className="record-detail-figures" aria-label="Key figures">
        <Metric label="MRR" value={usd(c.mrr)} change={{ value: '+$540', direction: 'up', meaning: 'positive', comparison: 'since Oct 14' }} />
        <Metric label="Lifetime revenue" value={usd(c.lifetime)} />
        <div className="record-detail-seats">
          <Metric label="Seats in use" value={String(c.seats)} unit={`of ${c.seatLimit}`} />
          <Progress label="Seats in use" value={(c.seats / c.seatLimit) * 100} />
        </div>
      </section>
      <Card title="Recent activity" headingLevel={2} actions={<TextLink asChild><button type="button" className="record-detail-see-all" onClick={onAll}>See all</button></TextLink>}>
        <List label="Recent activity" divided items={eventItems(ACTIVITY.slice(0, 3))} />
      </Card>
    </div>
  )
}

function Activity() {
  const [kind, setKind] = useState('all')
  const shown = ACTIVITY.filter((e) => kind === 'all' || e.kind === kind)
  const label = KINDS.find((k) => k.value === kind)!.label
  const summary = `${shown.length} ${shown.length === 1 ? 'event' : 'events'}, newest first`
  return (
    <div className="record-detail-panel">
      <p className="record-detail-sr" role="status">{shown.length ? `${label}: ${summary}` : ''}</p>
      {shown.length ? (
        <Card title="Activity" headingLevel={2} description={summary}
          actions={<Select label="Show" hideLabel size="small" options={KINDS} value={kind} onValueChange={setKind} className="record-detail-filter" />}>
          <List label={label} divided items={eventItems(shown)} />
        </Card>
      ) : (
        <ContentState headingLevel={2} icon={<Headset />} title="No support conversations"
          description="Ostara Health hasn’t opened a ticket since they joined. Either everything works, or they’re very polite."
          action={{ label: 'Show all activity', onClick: () => setKind('all') }} />
      )}
    </div>
  )
}

function Invoices({ loading, onRemind }: { loading: boolean; onRemind: (id: string) => void }) {
  return (
    <Table label="Invoices" showTitle={false} rows={INVOICES} loading={loading} rowLabel={(i) => i.id} density="compact" pagination={false}
      rowActions={(i) => [
        { id: 'pdf', label: 'Download PDF', icon: <Download />, href: `/invoices/${i.id}.pdf` },
        ...(i.status === 'open' ? [{ id: 'remind', label: 'Send a reminder', icon: <Mail />, onSelect: () => onRemind(i.id) }] : []),
      ]}
      columns={[
        { key: 'id', label: 'Invoice', width: 190, render: (i) => (
          <span className="record-detail-invoice">
            <span className="record-detail-strong">{i.id}</span>
            <span className="record-detail-sub">{i.status === 'open' ? `${i.date}, due Nov 15` : `${i.date}, paid ${i.paidOn}`}</span>
          </span>
        ) },
        { key: 'amount', label: 'Amount', width: 110, numeric: true, render: (i) => usd(i.amount), sortValue: (i) => i.amount },
        { key: 'status', label: 'Status', width: 110, render: (i) => <InvoiceStatus invoice={i} /> },
      ]} />
  )
}

function InvoiceStatus({ invoice }: { invoice: Invoice }) {
  const [tone, text]: [Tone, string] = invoice.status === 'open' ? ['info', 'Open'] : ['success', 'Paid']
  return <Tag label="Status" tone={tone} leading={invoice.status === 'open' ? 'dot' : <CircleCheck />} size="small">{text}</Tag>
}

function Notes({ onSaved }: { onSaved: () => void }) {
  const [saved, setSaved] = useState(NOTES)
  const [draft, setDraft] = useState<string>()
  const [saving, setSaving] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const editing = draft !== undefined

  useEffect(() => {
    if (!editing || !field.current) return
    field.current.focus()
    field.current.setSelectionRange(field.current.value.length, field.current.value.length)
  }, [editing])

  async function save() {
    setSaving(true)
    await api({ route: `/customers/${CUSTOMER.id}/notes`, method: 'PUT', body: { text: draft ?? '' } })
    setSaved({ text: (draft ?? '').trim(), by: 'You', on: 'just now' })
    setSaving(false)
    setDraft(undefined)
    onSaved()
    requestAnimationFrame(() => editButton.current?.focus())
  }

  return (
    <Card title="Account notes" headingLevel={2} description={saved.text ? `Last edited by ${saved.by}, ${saved.on}` : undefined}
      actions={!editing && <Button ref={editButton} variant="outline" size="small" onClick={() => setDraft(saved.text)}><Pencil /> Edit</Button>}>
      {editing ? (
        <form className="record-detail-notes-form" onSubmit={(event) => { event.preventDefault(); void save() }}>
          <TextArea ref={field} className="record-detail-notes-field" label="Notes" hideLabel rows={7} maxLength={2000} showCount value={draft} onValueChange={setDraft}
            helperText="Only your team sees these." />
          <div className="record-detail-notes-actions">
            <Button variant="quiet" disabled={saving} onClick={() => setDraft(undefined)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save notes</Button>
          </div>
        </form>
      ) : saved.text ? (
        <div className="record-detail-notes">{saved.text.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}</div>
      ) : (
        <p className="record-detail-muted">No notes yet. Write down what the next person on this account should know.</p>
      )}
    </Card>
  )
}

function Loading({ title, label }: { title: string; label: string }) {
  return (
    <div className="record-detail-panel" aria-busy="true">
      <Card title={title} headingLevel={2}>
        <Progress label={label} className="record-detail-progress" />
        {[64, 48, 56, 40].map((width) => (
          <div key={width} className="record-detail-bone-row" aria-hidden="true">
            <span className="record-detail-bone record-detail-bone-dot" />
            <span className="record-detail-bone-lines">
              <span className="record-detail-bone record-detail-bone-line" style={{ width: `${width}%` }} />
              <span className="record-detail-bone record-detail-bone-line record-detail-bone-sub" />
            </span>
          </div>
        ))}
      </Card>
    </div>
  )
}

const css = `
.record-detail { min-height: 100dvh; color: var(--diya-color-text); }
.record-detail-bar { display: none; }
.record-detail-back { display: inline-flex; align-items: center; gap: var(--diya-space-1); margin-left: -6px; padding: 6px; border-radius: var(--diya-radius-control);
  color: var(--diya-color-text); font-size: var(--diya-text-body); font-weight: 500; text-decoration: none; }
.record-detail-back:focus-visible,
.record-detail-account:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 2px; }
.record-detail-account { display: grid; padding: 4px; margin-right: -4px; border: 0; border-radius: 50%; background: none; cursor: pointer; }
.record-detail-page { box-sizing: border-box; width: 100%; max-width: calc(1200px + 2 * var(--diya-space-7)); display: grid; gap: var(--diya-space-6);
  padding: var(--diya-space-7) var(--diya-space-7) var(--diya-space-8); }
.record-detail-tabs [role='tablist'] { width: 100%; }
.record-detail-see-all { padding: 0; border: 0; background: none; font: inherit; font-size: var(--diya-text-body); line-height: 30px; cursor: pointer; }
.record-detail-contact { display: flex; gap: var(--diya-space-3); align-items: flex-start; padding-bottom: var(--diya-space-4); }
.record-detail-contact-text { display: grid; gap: 2px; min-width: 0; font-size: var(--diya-text-body); }
.record-detail-email { font-size: var(--diya-text-caption); overflow-wrap: anywhere; }
.record-detail-facts { display: grid; margin: 0; }
.record-detail-fact { display: flex; justify-content: space-between; gap: var(--diya-space-4); padding-block: 11px; border-top: 1px solid var(--diya-color-line); font-size: var(--diya-text-body); }
.record-detail-fact dt { color: var(--diya-color-muted); font-weight: 400; }
.record-detail-fact dd { margin: 0; color: var(--diya-color-text); font-weight: 500; text-align: right; }
.record-detail-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-4) var(--diya-space-5); }
.record-detail-heading { display: grid; gap: var(--diya-space-2); flex: 1 1 180px; min-width: 0; }
.record-detail-title { margin: 0; font-size: 28px; font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; }
.record-detail-title:focus,
.record-detail h1:focus { outline: none; }
.record-detail-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; margin: 0; }
.record-detail-meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-2) var(--diya-space-3); color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.record-detail-actions { display: flex; align-items: center; gap: var(--diya-space-2); }
.record-detail-body { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: var(--diya-space-7); align-items: start; }
.record-detail-tabs { min-width: 0; }
.record-detail-panel { display: grid; gap: var(--diya-space-5); padding-top: var(--diya-space-5); }
.record-detail-figures { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--diya-space-5); padding-block: var(--diya-space-2); }
.record-detail-figures > * + * { padding-left: var(--diya-space-5); border-left: 1px solid var(--diya-color-line); }
.record-detail-seats { display: grid; gap: var(--diya-space-3); align-content: start; }
.record-detail-glyph { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: var(--diya-color-recessed); color: var(--diya-color-muted); }
.record-detail-filter { width: 160px; }
.record-detail-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.record-detail-strong { font-weight: 550; font-variant-numeric: tabular-nums; }
.record-detail-invoice { display: grid; gap: 2px; }
.record-detail-sub { color: var(--diya-color-muted); font-size: var(--diya-text-caption); white-space: nowrap; }
.record-detail-side { display: grid; gap: var(--diya-space-6); }
.record-detail-notes { display: grid; gap: var(--diya-space-3); max-width: 64ch; font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.record-detail-notes p { margin: 0; }
.record-detail-notes-form { display: grid; gap: var(--diya-space-4); }
.record-detail-notes-field { max-width: none; }
.record-detail-notes-actions { display: flex; justify-content: flex-end; gap: var(--diya-space-2); }
.record-detail-gone { margin: var(--diya-space-7) auto 0; }
.record-detail-progress { margin-bottom: var(--diya-space-2); }
.record-detail-bone-row { display: flex; align-items: center; gap: var(--diya-space-4); padding-block: var(--diya-space-3); }
.record-detail-bone { display: block; background: color-mix(in srgb, var(--diya-color-text) 7%, transparent); animation: record-detail-pulse 1.4s ease-in-out infinite; }
.record-detail-bone-dot { width: 36px; height: 36px; flex: none; border-radius: 50%; }
.record-detail-bone-lines { display: grid; gap: var(--diya-space-2); flex: 1; }
.record-detail-bone-line { height: 14px; border-radius: 6px; }
.record-detail-bone-sub { width: 28%; height: 12px; }
@keyframes record-detail-pulse { 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) { .record-detail-bone { animation: none; } }
@media (max-width: 1020px) {
  .record-detail-body { grid-template-columns: minmax(0, 1fr); }
  .record-detail-side { max-width: 560px; }
}
@media (max-width: 720px) {
  .record-detail-bar {
    display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-3); position: sticky; top: 0; z-index: 10;
    height: 56px; box-sizing: border-box; padding: 0 var(--diya-space-4); border-bottom: 1px solid var(--diya-color-line);
    background: color-mix(in srgb, var(--diya-color-surface) 82%, transparent); backdrop-filter: blur(20px) saturate(1.4);
  }
  .record-detail-crumbs { display: none; }
}
@media (max-width: 640px) {
  .record-detail-page { padding: var(--diya-space-5) var(--diya-space-4) var(--diya-space-7); gap: var(--diya-space-5); }
  .record-detail-head { align-items: flex-start; column-gap: var(--diya-space-4); }
  .record-detail-actions { width: 100%; }
  .record-detail-actions > :first-child { flex: 1; }
  .record-detail-figures { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); row-gap: var(--diya-space-4); }
  .record-detail-seats { grid-column: 1 / -1; padding: var(--diya-space-4) 0 0; border-left: 0; border-top: 1px solid var(--diya-color-line); }
}
`

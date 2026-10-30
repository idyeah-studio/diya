'use client'
// Notifications & audit log: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/activity/page.tsx. Vite: save as src/Activity.tsx and render it inside your DiyaProvider.
import { useEffect, useState } from 'react'
import {
  Alert, Avatar, Button, ContentState, DatePicker, List, Select, Table, Tabs, Toast,
  type DateRange, type ListItem, type TableColumn,
} from '@idyeah/diya'
import { BellOff, CheckCheck, CircleCheck, Download, LucideProvider, SearchX, Settings2 } from 'lucide-react'

// Your workspace, and the moment the demo calls "now", so it reads the same on any day.
const PRODUCT = 'Fernhill'
const USER = 'Sam Rivera'
const NOW = '2026-11-04T10:24'
const EXPORT_DAYS = 31

type Kind = 'mention' | 'comment' | 'assigned' | 'status' | 'review'
type Note = { id: string; kind: Kind; actor: string; action: string; object: string; href: string; detail: string; at: string; unread: boolean }

// Your notifications. `href` is where a row takes the reader.
const NOTES: Note[] = [
  { id: 'n1', kind: 'mention', actor: 'Amara Okafor', action: 'mentioned you in', object: 'Q4 launch plan', href: '/docs/q4-launch-plan', detail: '“@Sam, can you check the pricing table before Thursday?”', at: '2026-11-04T10:02', unread: true },
  { id: 'n2', kind: 'comment', actor: 'Wen Zhao', action: 'commented on', object: 'Homepage hero, round 3', href: '/designs/homepage-hero', detail: '“The darker photo reads better on phones. Ship it?”', at: '2026-11-04T09:41', unread: true },
  { id: 'n3', kind: 'assigned', actor: 'Diego Fernández', action: 'assigned you', object: 'Fix the typo in the welcome email', href: '/tasks/412', detail: 'Due Nov 6 · Website', at: '2026-11-04T08:15', unread: true },
  { id: 'n4', kind: 'status', actor: 'Priya Raman', action: 'approved', object: 'Pricing page copy', href: '/docs/pricing-copy', detail: 'In review → Approved', at: '2026-11-03T17:48', unread: true },
  { id: 'n5', kind: 'comment', actor: 'Jonah Reyes', action: 'replied to you on', object: 'Brand voice guide', href: '/docs/brand-voice', detail: '“Agreed. Fewer exclamation points, more verbs.”', at: '2026-11-03T14:10', unread: false },
  { id: 'n6', kind: 'mention', actor: 'Hana Sato', action: 'mentioned you in', object: 'Weekly sync notes', href: '/docs/weekly-sync', detail: '“Sam owns the launch checklist from here.”', at: '2026-11-03T11:30', unread: true },
  { id: 'n7', kind: 'assigned', actor: 'Amara Okafor', action: 'assigned you', object: 'Review the Q4 budget', href: '/tasks/398', detail: 'Due Nov 10 · Finance', at: '2026-10-30T16:20', unread: false },
  { id: 'n8', kind: 'status', actor: 'Wen Zhao', action: 'closed', object: 'Dark mode contrast bug', href: '/tasks/377', detail: 'Open → Done', at: '2026-10-29T12:05', unread: false },
  { id: 'n9', kind: 'comment', actor: 'Priya Raman', action: 'commented on', object: 'Q4 launch plan', href: '/docs/q4-launch-plan', detail: '“Can we cut the FAQ to five questions? Nobody reads question nine.”', at: '2026-10-27T10:48', unread: false },
]

const SHOW = [
  { value: 'all', label: 'All notifications' },
  { value: 'unread', label: 'Unread' },
  { value: 'mention', label: 'Mentions' },
  { value: 'comment', label: 'Comments' },
  { value: 'assigned', label: 'Assigned to you' },
  { value: 'status', label: 'Status changes' },
  { value: 'review', label: 'Review requests' },
]

type Event = { id: string; actor: string; action: string; target: string; ip: string; place: string; at: string }

// Your audit log. IPs come from the ranges reserved for documentation, so none is real.
const EVENTS: Event[] = [
  { id: 'e22', actor: 'Sam Rivera', action: 'Signed in', target: 'Chrome on macOS', ip: '203.0.113.24', place: 'Austin, US', at: '2026-11-04T09:58' },
  { id: 'e21', actor: 'Amara Okafor', action: 'Shared a doc publicly', target: 'Q4 launch plan', ip: '198.51.100.7', place: 'Lagos, Nigeria', at: '2026-11-04T09:12' },
  { id: 'e20', actor: 'Diego Fernández', action: 'Created an API key', target: 'Calendar sync', ip: '192.0.2.81', place: 'Madrid, Spain', at: '2026-11-03T18:40' },
  { id: 'e19', actor: 'Priya Raman', action: 'Downloaded a file', target: 'Customer list.csv', ip: '198.51.100.142', place: 'Pune, India', at: '2026-11-03T16:02' },
  { id: 'e18', actor: 'Fernhill', action: 'Blocked sign-in', target: 'hana.sato@example.com', ip: '192.0.2.200', place: 'Unknown', at: '2026-11-03T03:17' },
  { id: 'e17', actor: 'Sam Rivera', action: 'Changed a role', target: 'Priya Raman: Member → Admin', ip: '203.0.113.24', place: 'Austin, US', at: '2026-11-02T15:30' },
  { id: 'e16', actor: 'Wen Zhao', action: 'Deleted a file', target: 'Q3 budget draft.xlsx', ip: '203.0.113.90', place: 'Singapore', at: '2026-11-02T11:08' },
  { id: 'e15', actor: 'Hana Sato', action: 'Turned on two-step sign-in', target: 'Her account', ip: '198.51.100.33', place: 'Osaka, Japan', at: '2026-11-01T08:44' },
  { id: 'e14', actor: 'Sam Rivera', action: 'Invited a member', target: 'jonah.reyes@example.com', ip: '203.0.113.24', place: 'Austin, US', at: '2026-10-31T17:20' },
  { id: 'e13', actor: 'Diego Fernández', action: 'Revoked an API key', target: 'Old deploy token', ip: '192.0.2.81', place: 'Madrid, Spain', at: '2026-10-31T10:02' },
  { id: 'e12', actor: 'Amara Okafor', action: 'Exported data', target: 'Tasks, October', ip: '198.51.100.7', place: 'Lagos, Nigeria', at: '2026-10-30T14:55' },
  { id: 'e11', actor: 'Sam Rivera', action: 'Changed a setting', target: 'Two-step sign-in: required', ip: '203.0.113.24', place: 'Austin, US', at: '2026-10-29T09:30' },
  { id: 'e10', actor: 'Wen Zhao', action: 'Signed in', target: 'Safari on iPhone', ip: '203.0.113.90', place: 'Singapore', at: '2026-10-28T22:14' },
  { id: 'e9', actor: 'Priya Raman', action: 'Removed a guest', target: 'contractor@example.com', ip: '198.51.100.142', place: 'Pune, India', at: '2026-10-27T13:41' },
  { id: 'e8', actor: 'Hana Sato', action: 'Changed billing', target: 'Plan: Team → Business', ip: '198.51.100.33', place: 'Osaka, Japan', at: '2026-10-26T10:10' },
  { id: 'e7', actor: 'Fernhill', action: 'Rotated signing keys', target: 'Single sign-on', ip: '192.0.2.1', place: 'Fernhill', at: '2026-10-25T02:00' },
  { id: 'e6', actor: 'Diego Fernández', action: 'Created a team', target: 'Website', ip: '192.0.2.81', place: 'Madrid, Spain', at: '2026-10-23T15:22' },
  { id: 'e5', actor: 'Amara Okafor', action: 'Signed in', target: 'Firefox on Windows', ip: '198.51.100.7', place: 'Lagos, Nigeria', at: '2026-10-22T08:03' },
  { id: 'e4', actor: 'Sam Rivera', action: 'Changed a role', target: 'Wen Zhao: Guest → Member', ip: '203.0.113.24', place: 'Austin, US', at: '2026-10-20T16:45' },
  { id: 'e3', actor: 'Wen Zhao', action: 'Accepted an invite', target: 'Fernhill workspace', ip: '203.0.113.90', place: 'Singapore', at: '2026-10-20T16:50' },
  { id: 'e2', actor: 'Priya Raman', action: 'Connected an app', target: 'Expense reports', ip: '198.51.100.142', place: 'Pune, India', at: '2026-10-16T12:30' },
  { id: 'e1', actor: 'Hana Sato', action: 'Changed a setting', target: 'Session length: 14 days', ip: '198.51.100.33', place: 'Osaka, Japan', at: '2026-10-12T09:15' },
]
const PEOPLE = ['Amara Okafor', 'Diego Fernández', 'Hana Sato', 'Jonah Reyes', 'Priya Raman', 'Sam Rivera', 'Wen Zhao', 'Fernhill']

// Replace with your API calls. Each waits a moment. The export turns down a
// date range longer than 31 days, or no range at all, the way many audit logs do.
async function api(route: '/notifications/read-all' | '/audit-log' | '/audit-log/export', range?: DateRange) {
  await new Promise((resolve) => setTimeout(resolve, route === '/audit-log' ? 1200 : 800))
  if (route === '/audit-log/export' && (!range?.start || !range.end || days(range.start, range.end) > EXPORT_DAYS))
    throw new Error(`Exports cover up to ${EXPORT_DAYS} days at a time. Narrow the dates, then export again.`)
  return true
}

const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format
const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format
const stamp = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format
const at = (iso: string) => new Date(iso)
const days = (start: string, end: string) => Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1
const dayOf = (iso: string) => iso.slice(0, 10)
const YESTERDAY = new Date(Date.parse(dayOf(NOW)) - 86_400_000).toISOString().slice(0, 10)

export default function ActivityScreen() {
  const [tab, setTab] = useState('notifications')
  const [notes, setNotes] = useState(NOTES)
  const unread = notes.filter((n) => n.unread).length

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="activity">
        <style>{css}</style>
        <header className="activity-bar">
          <a className="activity-brand" href="/">
            <span className="activity-mark" aria-hidden="true">{PRODUCT[0]}</span>
            {PRODUCT}
          </a>
          <Avatar name={USER} size="small" />
        </header>
        <main className="activity-page">
          <header className="activity-header">
            <h1 className="activity-title">Activity</h1>
            <p className="activity-lede">What changed in {PRODUCT}, and who changed it.</p>
          </header>
          <Tabs className="activity-tabs" label="Activity" value={tab} onValueChange={setTab} items={[
            { value: 'notifications', label: 'Notifications', badge: { variant: 'count', count: unread, tone: 'brand', label: 'unread' },
              content: tab === 'notifications' && <Notifications notes={notes} setNotes={setNotes} unread={unread} /> },
            { value: 'audit', label: 'Audit log', content: tab === 'audit' && <AuditLog /> },
          ]} />
        </main>
      </div>
    </LucideProvider>
  )
}

function Notifications({ notes, setNotes, unread }: { notes: Note[]; setNotes: (notes: Note[]) => void; unread: number }) {
  const [show, setShow] = useState('all')
  const [kept, setKept] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [said, say] = useState('')

  // In the Unread view, a row you open stays put until you change the view.
  const shown = notes.filter((n) => show === 'all' || (show === 'unread' ? n.unread || kept.includes(n.id) : n.kind === show))
  const groups = [
    { id: 'today', label: 'Today', notes: shown.filter((n) => dayOf(n.at) === dayOf(NOW)) },
    { id: 'yesterday', label: 'Yesterday', notes: shown.filter((n) => dayOf(n.at) === YESTERDAY) },
    { id: 'earlier', label: 'Earlier', notes: shown.filter((n) => dayOf(n.at) < YESTERDAY) },
  ].filter((group) => group.notes.length)

  function open(note: Note) {
    setNotes(notes.map((n) => (n.id === note.id ? { ...n, unread: false } : n)))
    setKept([...kept, note.id])
    // Open the object here, for example router.push(note.href).
  }

  async function readAll() {
    setBusy(true)
    await api('/notifications/read-all')
    setNotes(notes.map((n) => ({ ...n, unread: false })))
    setKept([])
    setBusy(false)
    say(`Marked ${unread} ${unread === 1 ? 'notification' : 'notifications'} as read. You’re all caught up.`)
  }

  const items = (list: Note[]): ListItem[] =>
    list.map((n) => ({
      id: n.id,
      label: `${n.actor} ${n.action} ${n.object}`,
      description: n.detail,
      leading: <Avatar name={n.actor} size="small" />,
      trailing: <span className="activity-time">{dayOf(n.at) < YESTERDAY ? day(at(n.at)) : time(at(n.at))}</span>,
      unread: n.unread,
      onSelect: () => open(n),
    }))

  const picked = SHOW.find((option) => option.value === show)!
  return (
    <div className="activity-panel">
      <div className="activity-toolbar">
        <Select className="activity-show" label="Show" hideLabel size="small" options={SHOW} value={show}
          onValueChange={(value) => { setShow(value); setKept([]) }} />
        <p className="activity-summary">
          {unread ? `${unread} unread` : <><CircleCheck className="activity-check" /> You’re all caught up</>}
        </p>
        <Button className="activity-end" variant="outline" size="small" loading={busy} disabled={!unread} onClick={readAll}>
          <CheckCheck /> Mark all as read
        </Button>
      </div>
      <p className="activity-sr" role="status">{said}</p>

      {groups.length ? (
        groups.map((group) => (
          <section key={group.id} className="activity-group" aria-labelledby={`activity-${group.id}`}>
            <h2 id={`activity-${group.id}`} className="activity-day">{group.label}</h2>
            <List className="activity-list" label={`${group.label}’s notifications`} divided items={items(group.notes)} />
          </section>
        ))
      ) : show === 'unread' || !notes.length ? (
        <ContentState className="activity-state" headingLevel={2} icon={<CircleCheck />} title="You’re all caught up"
          description="Nothing new since you last looked. Mentions, replies and anything assigned to you will land here."
          action={notes.length ? { label: 'Show all notifications', onClick: () => setShow('all') } : undefined} />
      ) : (
        <ContentState className="activity-state" headingLevel={2} icon={<BellOff />} title={`No ${picked.label.toLowerCase()}`}
          description={show === 'review' ? 'When someone asks you to review a doc or design, it shows up here.' : 'None in the last two weeks.'}
          action={{ label: 'Show all notifications', onClick: () => setShow('all') }} />
      )}
    </div>
  )
}

const columns: TableColumn<Event>[] = [
  { key: 'actor', label: 'Person', width: 180, sortValue: (e) => e.actor, render: (e) => (
    <span className="activity-actor">
      {e.actor === PRODUCT ? <span className="activity-system" aria-hidden="true"><Settings2 /></span> : <Avatar name={e.actor} size="small" aria-hidden="true" />}
      <span>{e.actor === PRODUCT ? `${PRODUCT} (automatic)` : e.actor}</span>
    </span>
  ) },
  { key: 'action', label: 'Action', width: 180, sortValue: (e) => e.action, render: (e) => e.action },
  { key: 'target', label: 'Target', width: 200, render: (e) => <span className="activity-target">{e.target}</span> },
  { key: 'where', label: 'IP and location', width: 160, render: (e) => (
    <span className="activity-stacked"><span className="activity-ip">{e.ip}</span><span className="activity-muted">{e.place}</span></span>
  ) },
  { key: 'at', label: 'Time', width: 140, sortValue: (e) => e.at, render: (e) => <span className="activity-ip">{stamp(at(e.at))}</span> },
]

function AuditLog() {
  const [loading, setLoading] = useState(true)
  const [person, setPerson] = useState('')
  const [range, setRange] = useState<DateRange>({ start: '2026-10-06', end: dayOf(NOW) })
  const [exporting, setExporting] = useState(false)
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState<{ id: number; text: string }>()

  useEffect(() => {
    let live = true
    api('/audit-log').then(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [])

  const rows = EVENTS.filter((e) => (!person || e.actor === person) && (!range.start || dayOf(e.at) >= range.start) && (!range.end || dayOf(e.at) <= range.end))
  const filtered = person !== '' || range.start !== '2026-10-06' || range.end !== dayOf(NOW)

  async function exportCsv() {
    setExporting(true)
    setProblem('')
    try {
      await api('/audit-log/export', range)
      const cell = (value: string) => `"${value.replace(/"/g, '""')}"`
      const lines = [['Time', 'Person', 'Action', 'Target', 'IP address', 'Location'].join(',')]
      for (const e of rows) lines.push([e.at, e.actor, e.action, e.target, e.ip, e.place].map(cell).join(','))
      const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
      Object.assign(document.createElement('a'), { href: url, download: `${PRODUCT.toLowerCase()}-audit-log-${range.start}-to-${range.end}.csv` }).click()
      URL.revokeObjectURL(url)
      setNotice({ id: Date.now(), text: `${rows.length} ${rows.length === 1 ? 'event' : 'events'} from ${day(at(range.start))} to ${day(at(range.end))} are in your downloads.` })
    } catch (error) {
      setProblem((error as Error).message)
    }
    setExporting(false)
  }

  function clear() {
    setPerson('')
    setRange({ start: '2026-10-06', end: dayOf(NOW) })
    setProblem('')
  }

  return (
    <div className="activity-panel">
      <div className="activity-toolbar activity-filters">
        <Select className="activity-person" label="Person" size="small" placeholder="Anyone" disabled={loading}
          options={[{ value: '', label: 'Anyone' }, ...PEOPLE.map((name) => ({ value: name, label: name }))]} value={person} onValueChange={setPerson} />
        <DatePicker className="activity-dates" label="Dates" size="small" range max={dayOf(NOW)} disabled={loading} value={range}
          onValueChange={(value) => { setRange(value); setProblem('') }} />
        <Button className="activity-end" variant="outline" size="small" loading={exporting} disabled={loading || !rows.length} onClick={exportCsv}>
          <Download /> Export CSV
        </Button>
      </div>
      <p className="activity-sr" role="status">{loading ? '' : `${rows.length} ${rows.length === 1 ? 'event' : 'events'}`}</p>
      {problem && (
        <Alert tone="error" urgent title="That export didn’t start" onDismiss={() => setProblem('')}>{problem}</Alert>
      )}

      {loading || rows.length ? (
        <Table className="activity-table" label="Audit log" showTitle={false} rows={rows} columns={columns} loading={loading} loadingLabel="Loading the audit log…"
          rowLabel={(e) => `${e.actor}, ${e.action}, ${stamp(at(e.at))}`} density="compact" pageSizeOptions={[10, 25, 50]} />
      ) : (
        <ContentState className="activity-state" headingLevel={2} icon={<SearchX />} title="Nothing matches these filters"
          description={person === 'Jonah Reyes' ? 'Jonah joined on Oct 31 and hasn’t done anything yet. Give him time.' : 'Try someone else, or widen the dates.'}
          action={filtered ? { label: 'Clear filters', onClick: clear } : undefined} />
      )}

      {notice && (
        <Toast key={notice.id} tone="success" title="Audit log exported" onDismiss={() => setNotice(undefined)} duration={6000}>{notice.text}</Toast>
      )}
    </div>
  )
}

const css = `
.activity { min-height: 100dvh; color: var(--diya-color-text); }
.activity-bar,
.activity-page { box-sizing: border-box; width: 100%; max-width: 976px; margin: 0 auto; padding-inline: var(--diya-space-7); }
.activity-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-4); min-height: 56px; padding-block: var(--diya-space-5); }
.activity-brand { display: inline-flex; align-items: center; gap: 10px; border-radius: 8px; color: inherit; font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; text-decoration: none; }
.activity-brand:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 4px; }
.activity-mark { display: grid; place-items: center; width: 28px; height: 28px; border-radius: calc(8px * var(--diya-corner-scale, 1)); background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-body); font-weight: 650; line-height: 1; }
.activity-page { display: grid; gap: var(--diya-space-6); padding-block: var(--diya-space-7) var(--diya-space-8); }
.activity-header { display: grid; gap: var(--diya-space-2); }
.activity-title { margin: 0; font-size: 28px; font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.025em; }
.activity-lede { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-large); line-height: var(--diya-leading-body); }
.activity-tabs { min-width: 0; }
.activity-tabs [role='tablist'] { width: 100%; }
.activity-panel { display: grid; gap: var(--diya-space-5); padding-top: var(--diya-space-5); min-width: 0; }
.activity-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-3) var(--diya-space-4); }
.activity-filters { align-items: flex-end; }
.activity-end { margin-inline-start: auto; }
.activity-show { width: 200px; }
.activity-person { width: 200px; }
.activity-dates { width: 260px; }
.activity-summary { display: inline-flex; align-items: center; gap: var(--diya-space-2); margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); font-variant-numeric: tabular-nums; }
.activity-check { color: var(--diya-color-success); }
.activity-sr { position: absolute; width: 1px; height: 1px; margin: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.activity-group { display: grid; gap: var(--diya-space-1); }
.activity-day { margin: 0; padding-inline: 14px; color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-weight: 600; letter-spacing: 0.01em; }
.activity-list { max-width: none; }
.activity-time { white-space: nowrap; font-variant-numeric: tabular-nums; }
.activity-state { margin-block: var(--diya-space-6); }
.activity-actor { display: inline-flex; align-items: center; gap: var(--diya-space-3); font-weight: 500; }
.activity-system { display: grid; place-items: center; width: 32px; height: 32px; flex: none; border-radius: 50%; background: var(--diya-color-recessed);
  color: var(--diya-color-muted); box-shadow: inset 0 0 0 1px var(--diya-color-line); }
.activity-target { overflow-wrap: anywhere; }
.activity-stacked { display: grid; gap: 2px; }
.activity-ip { font-variant-numeric: tabular-nums; white-space: nowrap; }
.activity-muted { color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
@media (max-width: 720px) {
  .activity-bar { padding: 0 var(--diya-space-4); }
  .activity-page { padding: var(--diya-space-5) var(--diya-space-4) var(--diya-space-7); gap: var(--diya-space-5); }
  .activity-lede { font-size: var(--diya-text-body); }
  .activity-panel { gap: var(--diya-space-5); padding-top: var(--diya-space-5); }
  .activity-show, .activity-person, .activity-dates { width: 100%; }
  .activity-person, .activity-dates { flex: 1 1 100%; }
  .activity-filters .activity-end { width: 100%; }
}
`

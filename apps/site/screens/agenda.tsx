'use client'
// Bookings agenda: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/bookings/page.tsx. Vite: save as src/Agenda.tsx and render it inside your DiyaProvider.
import { useState, type ReactNode } from 'react'
import {
  Alert, Avatar, Button, Calendar, ContentState, DatePicker, Dialog, Drawer, List, Select, SiteHeader, Stack, Tag, TextArea, TextInput, Toast,
  useDiyaAppearance, type Tone,
} from '@idyeah/diya'
import { CalendarCheck, CalendarX2, ChevronLeft, ChevronRight, LucideProvider, Plus, UserCheck } from 'lucide-react'

// Your salon, its people and services, and who is booked when.
const PLACE = 'Kestrel'
const ME = 'Lucía Fernández'
const TODAY = '2026-11-12'
const CLOSED = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay() === 0 || day === '2026-11-26'
const NAV = ['Bookings', 'Clients', 'Services', 'Team', 'Reports'].map((label) => ({ value: label.toLowerCase(), label, href: `/${label.toLowerCase()}` }))
const STAFF = [
  { value: 'ana', label: 'Ana Lima' },
  { value: 'kofi', label: 'Kofi Mensah' },
  { value: 'mei', label: 'Mei Tanaka' },
  { value: 'rafa', label: 'Rafael Ortiz' },
]
const SERVICES = [
  { value: 'cut', label: 'Cut and finish', minutes: 60 },
  { value: 'color', label: 'Color, full head', minutes: 120 },
  { value: 'gloss', label: 'Gloss and blowout', minutes: 45 },
  { value: 'trim', label: 'Beard trim', minutes: 30 },
  { value: 'consult', label: 'Color consultation', minutes: 15 },
]
const OPEN = { from: 9 * 60, to: 19 * 60 }

type Status = 'confirmed' | 'arrived' | 'canceled' | 'no-show'
type Booking = { id: string; day: string; start: number; service: string; staff: string; client: string; phone: string; status: Status; notes: string }
const STATUS: Record<Status, { label: string; tone: Tone }> = {
  confirmed: { label: 'Confirmed', tone: 'neutral' },
  arrived: { label: 'Checked in', tone: 'success' },
  canceled: { label: 'Canceled', tone: 'neutral' },
  'no-show': { label: 'No-show', tone: 'warning' },
}
const row = (id: string, day: string, time: string, service: string, staff: string, client: string, status: Status = 'confirmed', notes = ''): Booking =>
  ({ id, day, start: toMinutes(time), service, staff, client, phone: `(555) 010-${String(2000 + Number(id) * 137).slice(-4)}`, status, notes })
const BOOKINGS: Booking[] = [
  row('1', '2026-11-12', '9:00', 'cut', 'ana', 'Maya Chen', 'arrived', 'Likes it short at the back. Oat milk in the coffee.'),
  row('2', '2026-11-12', '9:30', 'color', 'mei', 'Priya Nair', 'arrived', 'Patch test done Nov 5. Going two shades warmer.'),
  row('3', '2026-11-12', '10:00', 'trim', 'kofi', 'Daniel Okoro', 'no-show'),
  row('4', '2026-11-12', '10:30', 'gloss', 'rafa', 'Hannah Becker'),
  row('5', '2026-11-12', '11:30', 'cut', 'ana', 'Tomás Rivera', 'canceled', 'Canceled by text on Tuesday. Wants to rebook next week.'),
  row('6', '2026-11-12', '12:00', 'consult', 'mei', 'Aisha Rahman'),
  row('7', '2026-11-12', '13:00', 'cut', 'kofi', 'Jonah Park'),
  row('8', '2026-11-12', '14:00', 'color', 'ana', 'Sofia Rossi', 'confirmed', 'First visit. Box dye underneath, so allow extra time.'),
  row('9', '2026-11-12', '15:30', 'gloss', 'mei', 'Grace Mensah'),
  row('10', '2026-11-12', '17:00', 'cut', 'rafa', 'Leo Alvarez'),
  row('11', '2026-11-09', '10:00', 'cut', 'ana', 'Nora Lindqvist', 'arrived'),
  row('12', '2026-11-09', '13:00', 'trim', 'kofi', 'Samuel Adeyemi', 'arrived'),
  row('13', '2026-11-10', '9:30', 'color', 'mei', 'Elena Petrova', 'arrived'),
  row('14', '2026-11-10', '11:00', 'cut', 'rafa', 'Marcus Webb', 'arrived'),
  row('15', '2026-11-10', '16:00', 'gloss', 'ana', 'Chloe Martin', 'no-show'),
  row('16', '2026-11-11', '10:00', 'cut', 'kofi', 'Ravi Shah', 'arrived'),
  row('17', '2026-11-13', '9:00', 'color', 'ana', 'Isabel Cruz'),
  row('18', '2026-11-13', '11:00', 'cut', 'rafa', 'Kenji Watanabe'),
  row('19', '2026-11-13', '15:00', 'trim', 'kofi', 'Omar Haddad'),
  row('20', '2026-11-14', '10:00', 'gloss', 'mei', 'Zoe Laurent'),
  row('21', '2026-11-14', '10:00', 'cut', 'ana', 'Femi Adebayo'),
  row('22', '2026-11-14', '12:30', 'color', 'rafa', 'Lena Novak'),
  row('23', '2026-11-19', '14:00', 'cut', 'ana', 'Tomás Rivera'),
]

type Route = '/bookings' | '/bookings/move' | '/bookings/cancel' | '/bookings/check-in' | '/bookings/notes'

// Replace with your API call. The stub waits a moment and saves everything.
// Overlaps are caught on the page first; your server should check them too.
async function api(route: Route, body: Record<string, unknown>) {
  await new Promise((resolve) => setTimeout(resolve, 700))
  return { route, body }
}

function toMinutes(time: string) { const [h, m] = time.split(':').map(Number); return h * 60 + m }
const noon = (day: string) => Date.parse(`${day}T12:00:00Z`)
const shift = (day: string, by: number) => new Date(noon(day) + by * 86400000).toISOString().slice(0, 10)
const dateText = (day: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(noon(day))
const longDay = (day: string) => dateText(day, { weekday: 'long', month: 'long', day: 'numeric' })
const shortDay = (day: string) => dateText(day, { weekday: 'short', month: 'short', day: 'numeric' })
const weekday = (day: string) => dateText(day, { weekday: 'long' })
const clockFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
const at = (minutes: number) => Date.UTC(2026, 0, 1, 0, minutes)
const clock = (minutes: number) => clockFormat.format(at(minutes))
const span = (start: number, length: number) => clockFormat.formatRange(at(start), at(start + length))
const service = (id: string) => SERVICES.find((s) => s.value === id)!
const person = (id: string) => STAFF.find((s) => s.value === id)!.label
const first = (name: string) => name.split(' ')[0]
const TIMES = Array.from({ length: (OPEN.to - OPEN.from) / 15 }, (_, i) => OPEN.from + i * 15).map((m) => ({ value: String(m), label: clock(m) }))
const stepOpen = (day: string, by: number) => { let next = shift(day, by); while (CLOSED(next)) next = shift(next, by); return next }

// Another live booking for the same stylist that overlaps this time, if any.
function clash(bookings: Booking[], draft: Pick<Booking, 'day' | 'start' | 'service' | 'staff'>, except?: string) {
  const end = draft.start + service(draft.service).minutes
  return bookings.find((b) => b.id !== except && b.status !== 'canceled' && b.day === draft.day && b.staff === draft.staff
    && b.start < end && b.start + service(b.service).minutes > draft.start)
}
const clashText = (b: Booking) => `${first(person(b.staff))} is with ${b.client} from ${span(b.start, service(b.service).minutes)}. Pick another time or another stylist.`

type Notice = { id: number; title: string; text: string }

export default function AgendaScreen() {
  const { glass } = useDiyaAppearance()
  const [bookings, setBookings] = useState(BOOKINGS)
  const [day, setDay] = useState(TODAY)
  const [staff, setStaff] = useState('all')
  const [openId, setOpenId] = useState<string>()
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState<Notice>()

  const say = (title: string, text: string) => setNotice({ id: Date.now(), title, text })
  const update = (id: string, change: Partial<Booking>) => setBookings((now) => now.map((b) => (b.id === id ? { ...b, ...change } : b)))
  const onDay = bookings.filter((b) => b.day === day).sort((a, b) => a.start - b.start)
  const shown = onDay.filter((b) => staff === 'all' || b.staff === staff)
  const live = shown.filter((b) => b.status !== 'canceled')
  const hours = live.reduce((sum, b) => sum + service(b.service).minutes, 0) / 60
  const monday = shift(day, -((new Date(noon(day)).getUTCDay() + 6) % 7))
  const week = Array.from({ length: 6 }, (_, i) => shift(monday, i))
  const open = bookings.find((b) => b.id === openId)

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="agenda" data-glass={glass || undefined}>
        <style>{css}</style>
        <SiteHeader brand={<span className="agenda-brand"><span className="agenda-mark" aria-hidden="true">{PLACE[0]}</span>{PLACE}</span>}
          brandHref="/" brandLabel={`${PLACE}, home`} items={NAV} value="bookings" avatar={<Avatar name={ME} size="small" />} />
        <main className="agenda-main">
          <header className="agenda-header">
            <div className="agenda-stack">
              <h1 className="agenda-title">Bookings</h1>
              <p className="agenda-lede">{PLACE} Salon. Four stylists, one very good espresso machine.</p>
            </div>
            <Button onClick={() => setAdding(true)}><Plus /> New booking</Button>
          </header>
          <div className="agenda-layout">
            <section className="agenda-day agenda-panel" aria-labelledby="agenda-day-title">
              <div className="agenda-day-head">
                <div className="agenda-stack">
                  <h2 id="agenda-day-title" className="agenda-day-title">
                    {longDay(day)}
                    {day === TODAY && <Tag size="small" tone="brand">Today</Tag>}
                  </h2>
                  <p className="agenda-muted" role="status">
                    {live.length ? `${live.length} ${live.length === 1 ? 'booking' : 'bookings'}, ${hours.toLocaleString('en-US')} ${hours === 1 ? 'hour' : 'hours'} in the chair` : staff === 'all' ? 'Nothing booked yet' : `Nothing booked for ${first(person(staff))}`}
                    {shown.length > live.length && `, ${shown.length - live.length} canceled`}
                  </p>
                </div>
                <div className="agenda-tools">
                  <Button variant="outline" iconOnly aria-label="Previous day" onClick={() => setDay(stepOpen(day, -1))}><ChevronLeft /></Button>
                  <Button variant="outline" iconOnly aria-label="Next day" onClick={() => setDay(stepOpen(day, 1))}><ChevronRight /></Button>
                  <Button variant="outline" disabled={day === TODAY} onClick={() => setDay(TODAY)}>Today</Button>
                  <Select className="agenda-staff" label="Staff" hideLabel options={[{ value: 'all', label: 'Everyone' }, ...STAFF]} value={staff} onValueChange={setStaff} />
                </div>
              </div>
              {shown.length ? (
                <ol className="agenda-list" aria-label={`Bookings on ${longDay(day)}`}>
                  {shown.map((b) => (
                    <li key={b.id}>
                      <button type="button" className="agenda-row" data-status={b.status} aria-haspopup="dialog" onClick={() => setOpenId(b.id)}>
                        <strong className="agenda-clock">{clock(b.start)}</strong>
                        <span className="agenda-muted agenda-length">{service(b.service).minutes} min</span>
                        <strong className="agenda-client">{b.client}</strong>
                        <span className="agenda-muted agenda-service">{service(b.service).label} with {first(person(b.staff))}</span>
                        <span className="agenda-avatar" aria-hidden="true"><Avatar name={person(b.staff)} size="small" /></span>
                        <span className="agenda-status"><Tag size="small" tone={STATUS[b.status].tone} leading="dot">{STATUS[b.status].label}</Tag></span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : staff !== 'all' && onDay.length ? (
                <ContentState className="agenda-empty" headingLevel={3} icon={<CalendarCheck />} title={`${first(person(staff))} has nothing on ${weekday(day)}`}
                  description="Their chair is free all day." action={{ label: 'Show everyone', onClick: () => setStaff('all') }} />
              ) : (
                <ContentState className="agenda-empty" headingLevel={3} icon={<CalendarCheck />} title={`Nothing booked on ${weekday(day)}`}
                  description="A quiet day so far. Walk-ins welcome." action={{ label: 'New booking', onClick: () => setAdding(true) }} />
              )}
            </section>

            <aside className="agenda-rail" aria-label="Pick a day">
              <Calendar label="Jump to a day" value={day} onValueChange={setDay} isDateUnavailable={CLOSED} />
              <div className="agenda-stack agenda-week">
                <h2 className="agenda-rail-title">Week of {dateText(monday, { month: 'long', day: 'numeric' })}</h2>
                <List className="agenda-week-list" label={`Bookings each day, week of ${dateText(monday, { month: 'long', day: 'numeric' })}`} size="small"
                  items={week.map((d) => {
                    const count = bookings.filter((b) => b.day === d && b.status !== 'canceled').length
                    return { id: d, label: shortDay(d), current: d === day, onSelect: () => setDay(d), disabled: CLOSED(d),
                      trailing: <span className="agenda-muted">{CLOSED(d) ? 'Closed' : count ? `${count} booked` : 'Open'}</span> }
                  })} />
              </div>
            </aside>
          </div>
        </main>

        {open && (
          <BookingDrawer key={open.id} booking={open} bookings={bookings} onClose={() => setOpenId(undefined)}
            onSaved={(change, title, text) => { update(open.id, change); say(title, text) }} />
        )}
        {adding && (
          <NewBooking day={day} bookings={bookings} onClose={() => setAdding(false)}
            onAdded={(b) => { setBookings((now) => [...now, b]); setDay(b.day); setStaff('all'); say('Booked', `${b.client}, ${shortDay(b.day)} at ${clock(b.start)} with ${first(person(b.staff))}.`) }} />
        )}
        {notice && <Toast key={notice.id} tone="success" title={notice.title} onDismiss={() => setNotice(undefined)} duration={6000}>{notice.text}</Toast>}
      </div>
    </LucideProvider>
  )
}

type DrawerProps = { booking: Booking; bookings: Booking[]; onClose: () => void; onSaved: (change: Partial<Booking>, title: string, text: string) => void }

function BookingDrawer({ booking: b, bookings, onClose, onSaved }: DrawerProps) {
  const [mode, setMode] = useState<'view' | 'move' | 'cancel'>('view')
  const [busy, setBusy] = useState<Route>()
  const [date, setDate] = useState(b.day < TODAY ? TODAY : b.day)
  const [time, setTime] = useState(String(b.start))
  const [timeError, setTimeError] = useState<string>()
  const [notes, setNotes] = useState(b.notes)
  const s = service(b.service)
  const canceled = b.status === 'canceled'
  const checkIn = b.status === 'confirmed' && b.day === TODAY

  async function run(route: Route, change: Partial<Booking>, title: string, text: string) {
    setBusy(route)
    await api(route, { id: b.id, ...change })
    setBusy(undefined)
    setMode('view')
    onSaved(change, title, text)
  }

  function move() {
    const draft = { day: date, start: Number(time), service: b.service, staff: b.staff }
    const other = clash(bookings, draft, b.id)
    if (other) return setTimeError(clashText(other))
    run('/bookings/move', { day: date, start: draft.start, status: 'confirmed' }, canceled ? 'Rebooked' : 'Moved',
      `${b.client} is now ${shortDay(date)} at ${clock(draft.start)} with ${first(person(b.staff))}.`)
  }

  const footer: ReactNode = mode === 'cancel' ? (
    <div className="agenda-confirm" role="group" aria-labelledby="agenda-confirm-text">
      <p id="agenda-confirm-text" className="agenda-text">Cancel {first(b.client)}’s {clock(b.start)} booking? We text them that it’s off.</p>
      <div className="agenda-actions">
        <Button variant="destructive" loading={busy === '/bookings/cancel'}
          onClick={() => run('/bookings/cancel', { status: 'canceled' }, 'Booking canceled', `${b.client}’s ${clock(b.start)} slot is open again.`)}>Cancel booking</Button>
        <Button variant="quiet" disabled={busy !== undefined} onClick={() => setMode('view')}>Keep it</Button>
      </div>
    </div>
  ) : mode === 'move' ? (
    <div className="agenda-actions">
      <Button loading={busy === '/bookings/move'} onClick={move}>{canceled ? 'Rebook' : 'Move booking'}</Button>
      <Button variant="quiet" disabled={busy !== undefined} onClick={() => { setMode('view'); setTimeError(undefined) }}>Never mind</Button>
    </div>
  ) : (
    <div className="agenda-actions">
      {checkIn && (
        <Button loading={busy === '/bookings/check-in'} onClick={() => run('/bookings/check-in', { status: 'arrived' }, 'Checked in', `${first(b.client)} is here. ${first(person(b.staff))} gets a ping.`)}>
          <UserCheck /> Check in
        </Button>
      )}
      <Button variant={checkIn ? 'outline' : 'solid'} onClick={() => setMode('move')}>{canceled ? 'Rebook' : 'Reschedule'}</Button>
      {!canceled && <Button variant="quiet" onClick={() => setMode('cancel')}><CalendarX2 /> Cancel booking</Button>}
    </div>
  )

  return (
    <Drawer open onOpenChange={(next) => !next && !busy && onClose()} title={b.client} headingLevel={2}
      description={`${s.label}, ${s.minutes} minutes`} footer={footer}>
      <Stack gap={6}>
        <dl className="agenda-facts">
          <div><dt>Status</dt><dd><Tag size="small" tone={STATUS[b.status].tone} leading="dot">{STATUS[b.status].label}</Tag></dd></div>
          <div><dt>When</dt><dd>{longDay(b.day)}, {span(b.start, s.minutes)}</dd></div>
          <div><dt>With</dt><dd>{person(b.staff)}</dd></div>
          <div><dt>Phone</dt><dd>{b.phone}</dd></div>
        </dl>
        {mode === 'move' && (
          <section className="agenda-stack agenda-gap" aria-labelledby="agenda-move-title">
            <h3 id="agenda-move-title" className="agenda-rail-title">{canceled ? 'Rebook for' : 'Move to'}</h3>
            <div className="agenda-pair">
              <DatePicker label="Date" value={date} min={TODAY} isDateUnavailable={CLOSED} onValueChange={(value) => { setDate(value || date); setTimeError(undefined) }} />
              <Select label="Time" options={TIMES} value={time} onValueChange={(value) => { setTime(value); setTimeError(undefined) }}
                error={timeError ? 'Overlaps another booking.' : undefined} />
            </div>
            {timeError && <Alert tone="error" urgent title="That time overlaps">{timeError}</Alert>}
          </section>
        )}
        <section className="agenda-stack agenda-gap" aria-labelledby="agenda-notes-title">
          <h3 id="agenda-notes-title" className="agenda-rail-title">Notes</h3>
          <TextArea label="Notes for the team" hideLabel rows={4} value={notes} onValueChange={setNotes} placeholder="Allergies, preferences, the dog’s name…" />
          <Button variant="outline" size="small" className="agenda-start" disabled={notes === b.notes} loading={busy === '/bookings/notes'}
            onClick={() => run('/bookings/notes', { notes }, 'Notes saved', `The team sees them on ${first(b.client)}’s booking.`)}>Save notes</Button>
        </section>
      </Stack>
    </Drawer>
  )
}

type NewProps = { day: string; bookings: Booking[]; onClose: () => void; onAdded: (booking: Booking) => void }

function NewBooking({ day, bookings, onClose, onAdded }: NewProps) {
  const [draft, setDraft] = useState({ client: '', phone: '', service: 'cut', staff: 'ana', day: day < TODAY ? TODAY : day, start: '', notes: '' })
  const [errors, setErrors] = useState<{ client?: string; start?: string; clash?: string }>({})
  const [busy, setBusy] = useState(false)
  const edit = (key: keyof typeof draft, value: string) => {
    setDraft({ ...draft, [key]: value })
    setErrors(key === 'client' ? { ...errors, client: undefined } : { client: errors.client })
  }

  async function add() {
    const other = draft.start ? clash(bookings, { ...draft, start: Number(draft.start) }) : undefined
    const found = {
      client: draft.client.trim() ? undefined : 'Enter the client’s name.',
      start: !draft.start ? 'Pick a time.' : other ? 'Overlaps another booking.' : undefined,
      clash: other && clashText(other),
    }
    setErrors(found)
    if (found.client || found.start) return false
    setBusy(true)
    await api('/bookings', draft)
    onAdded({ id: String(Date.now()), day: draft.day, start: Number(draft.start), service: draft.service, staff: draft.staff, client: draft.client.trim(),
      phone: draft.phone.trim() || 'Not given', status: 'confirmed', notes: draft.notes })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title="New booking" description="We text the client a confirmation."
      confirmLabel="Add booking" loading={busy} onConfirm={add} divided>
      <Stack gap={4}>
        {errors.clash && <Alert tone="error" urgent title="That time overlaps">{errors.clash}</Alert>}
        <div className="agenda-pair">
          <TextInput label="Client" autoComplete="off" value={draft.client} error={errors.client} onValueChange={(v) => edit('client', v)} />
          <TextInput label="Phone (optional)" type="tel" inputMode="tel" autoComplete="off" value={draft.phone} onValueChange={(v) => edit('phone', v)} />
        </div>
        <div className="agenda-pair">
          <Select label="Service" options={SERVICES.map(({ value, label, minutes }) => ({ value, label: `${label}, ${minutes} min` }))} value={draft.service} onValueChange={(v) => edit('service', v)} />
          <Select label="Stylist" options={STAFF} value={draft.staff} onValueChange={(v) => edit('staff', v)} />
        </div>
        <div className="agenda-pair">
          <DatePicker label="Date" value={draft.day} min={TODAY} isDateUnavailable={CLOSED} onValueChange={(v) => edit('day', v || draft.day)} />
          <Select label="Time" placeholder="Choose" options={TIMES} value={draft.start} error={errors.start} onValueChange={(v) => edit('start', v)} />
        </div>
        <TextArea label="Notes (optional)" rows={2} value={draft.notes} onValueChange={(v) => edit('notes', v)} />
      </Stack>
    </Dialog>
  )
}

const css = `
.agenda { min-height: 100dvh; color: var(--diya-color-text); }
.agenda:not([data-glass]) { background: var(--diya-color-recessed); }
.agenda-brand { display: inline-flex; align-items: center; gap: var(--diya-space-3); font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; }
.agenda-mark {
  display: grid; place-items: center; width: 28px; height: 28px;
  border-radius: calc(9px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text);
  font-size: var(--diya-text-body); font-weight: 650; line-height: 1;
}
.agenda-main { display: grid; gap: var(--diya-space-6); width: 100%; max-width: calc(1176px + 2 * var(--diya-space-7)); margin: 0 auto; padding: var(--diya-space-7) var(--diya-space-7) var(--diya-space-8); }
.agenda-header { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--diya-space-4); }
.agenda-title { margin: 0; font-size: 28px; font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; }
.agenda-lede { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.agenda-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: var(--diya-space-6); align-items: start; }
.agenda-panel { border: 1px solid var(--diya-color-line); border-radius: var(--diya-radius-surface); background: var(--diya-color-raised); }
.agenda[data-glass] .agenda-panel {
  background: color-mix(in srgb, var(--diya-color-raised) 64%, transparent);
  backdrop-filter: blur(28px) saturate(1.15);
}
.agenda-day { min-width: 0; padding: var(--diya-space-5) 0 var(--diya-space-3); }
.agenda-day-head { display: flex; flex-wrap: wrap; align-items: start; justify-content: space-between; gap: var(--diya-space-4); padding: 0 var(--diya-space-5) var(--diya-space-5); border-bottom: 1px solid var(--diya-color-line); }
.agenda-stack { display: grid; gap: var(--diya-space-1); min-width: 0; }
.agenda-gap { gap: var(--diya-space-3); }
.agenda-day-title { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-3); margin: 0; font-size: var(--diya-text-title); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.015em; }
.agenda-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: var(--diya-leading-body); }
.agenda-tools { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-2); }
.agenda-staff { flex: none; width: 176px; }
.agenda-list { display: grid; margin: 0; padding: var(--diya-space-2) var(--diya-space-3) 0; list-style: none; }
.agenda-list li + li { border-top: 1px solid var(--diya-color-line); }
.agenda-row {
  display: grid; grid-template-columns: 96px minmax(0, 1fr) auto auto; grid-template-areas: 'clock client avatar status' 'length service avatar status';
  align-items: center; gap: 0 var(--diya-space-4);
  width: 100%; padding: var(--diya-space-3); border: 0; border-radius: var(--diya-radius-control);
  background: none; color: inherit; font: inherit; font-size: var(--diya-text-body); text-align: start; cursor: pointer;
}
.agenda-row:hover { background: var(--diya-color-hover); }
.agenda-row:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 2px; }
.agenda-row > * { min-width: 0; line-height: var(--diya-leading-body); }
.agenda-clock { grid-area: clock; font-weight: 600; font-variant-numeric: tabular-nums; }
.agenda-length { grid-area: length; }
.agenda-client { grid-area: client; font-weight: 500; overflow-wrap: anywhere; }
.agenda-service { grid-area: service; }
.agenda-status { grid-area: status; display: inline-flex; justify-self: end; }
.agenda-row[data-status='canceled'] .agenda-client,
.agenda-row[data-status='canceled'] .agenda-clock { color: var(--diya-color-muted); text-decoration: line-through; }
.agenda-avatar { grid-area: avatar; display: inline-flex; }
.agenda-empty { max-width: none; margin: 0; padding: var(--diya-space-8) var(--diya-space-5); border: 0; background: none; }
.agenda-rail { display: grid; gap: var(--diya-space-6); position: sticky; top: var(--diya-space-5); }
.agenda-rail-title { margin: 0; font-size: var(--diya-text-body); font-weight: 600; line-height: var(--diya-leading-tight); }
.agenda-week { gap: var(--diya-space-3); }
.agenda-week-list { max-width: none; }
.agenda-facts { display: grid; margin: 0; font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.agenda-facts div { display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: var(--diya-space-4); align-items: center; padding-block: var(--diya-space-3); border-top: 1px solid var(--diya-color-line); }
.agenda-facts div:last-child { border-bottom: 1px solid var(--diya-color-line); }
.agenda-facts dt { color: var(--diya-color-muted); }
.agenda-facts dd { margin: 0; justify-self: start; font-weight: 500; }
.agenda-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--diya-space-4); align-items: start; }
.agenda-text { margin: 0; font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.agenda-confirm { display: grid; gap: var(--diya-space-3); }
.agenda-actions { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); }
.agenda-start { justify-self: start; }
@media (prefers-reduced-transparency: reduce) {
  .agenda[data-glass] .agenda-panel { background: var(--diya-color-raised); backdrop-filter: none; }
}
@media (max-width: 960px) {
  .agenda-main { padding: var(--diya-space-5) var(--diya-space-4) var(--diya-space-7); gap: var(--diya-space-5); }
  .agenda-layout { grid-template-columns: minmax(0, 1fr); }
  .agenda-rail { position: static; grid-template-columns: minmax(0, 320px) minmax(0, 1fr); align-items: start; }
}
@media (max-width: 640px) {
  .agenda-rail { grid-template-columns: minmax(0, 1fr); }
  .agenda-day-head { padding-inline: var(--diya-space-4); }
  .agenda-tools { width: 100%; }
  .agenda-staff { flex: 1; width: auto; min-width: 0; }
  .agenda-list { padding-inline: var(--diya-space-2); }
  .agenda-row { grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: 'clock client client' 'service service status'; gap: 2px var(--diya-space-3); padding-inline: var(--diya-space-2); }
  .agenda-avatar,
  .agenda-length { display: none; }
  .agenda-pair { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 380px) {
  .agenda-staff { flex-basis: 100%; }
}
`

'use client'
// Book a time: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/book/page.tsx. Vite: save as src/Booking.tsx and render it inside your DiyaProvider.
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode, type Ref } from 'react'
import { Alert, Avatar, Button, Calendar, Choice, ContentState, Dialog, Select, Tag, TextArea, TextInput, Toast, useDiyaAppearance } from '@idyeah/diya'
import { ArrowLeft, CalendarDays, CalendarPlus, CalendarX2, CircleCheck, Clock, Globe, LucideProvider, Phone, Video } from 'lucide-react'

// Who people book, and when they're free. Hours and busy times are in the
// host's time zone; the page shows every time in the visitor's own.
const HOST = { name: 'Inés Moreau', first: 'Inés', role: 'Founder, Larkspur Studio' }
const MEETING = {
  title: 'Project intro call',
  about: 'Tell me what you’re making and where it’s stuck. We’ll see if Larkspur is the right fit, and you’ll leave with a next step either way.',
  file: 'larkspur-intro-call.ics',
}
const HOST_ZONE = 'America/New_York'
const FIRST_DAY = '2026-11-10'
const LAST_DAY = '2026-12-18'
const HOURS = { open: 9 * 60, close: 17 * 60, step: 30 }
const LENGTHS = ['15', '30', '45']
// Busy host time on weekdays, as "9:00-10:30". A day that's busy 9 to 5 is fully booked.
const BUSY: Record<string, string> = {
  '2026-11-10': '9:00-17:00',
  '2026-11-11': '9:00-11:00 13:00-14:30',
  '2026-11-12': '9:00-10:00 12:00-13:00 15:30-17:00',
  '2026-11-13': '9:00-10:00 10:30-12:00 12:30-14:00 14:30-16:00 16:30-17:00',
  '2026-11-16': '11:00-12:00 14:00-15:00',
  '2026-11-17': '9:00-12:30',
  '2026-11-18': '9:00-17:00',
  '2026-11-19': '13:00-17:00',
  '2026-11-24': '9:00-17:00',
  '2026-11-25': '9:00-17:00',
  '2026-11-26': '9:00-17:00',
  '2026-11-27': '9:00-17:00',
}
const ZONES = [
  ['America/Los_Angeles', 'Pacific Time'], ['America/Denver', 'Mountain Time'], ['America/Chicago', 'Central Time'],
  ['America/New_York', 'Eastern Time'], ['Europe/London', 'London'], ['Europe/Berlin', 'Central Europe'],
  ['Asia/Kolkata', 'India'], ['Asia/Tokyo', 'Japan'], ['Australia/Sydney', 'Sydney'],
]

// Replace with your API call. The stub waits a moment, then says the first
// time on Thursday, November 12 (10:00 AM in New York) was just taken.
// Every other booking, move and cancellation goes through.
async function api(route: '/bookings' | '/bookings/cancel', body: { start?: number }) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return !(route === '/bookings' && body.start === moment('2026-11-12', 10 * 60, HOST_ZONE))
}

type Step = 'pick' | 'details' | 'booked' | 'canceled'
type Where = 'video' | 'phone'
type Details = { name: string; email: string; phone: string; notes: string; guests: string[]; guest: string }
type Booking = Details & { start: number; length: number; where: Where; zone: string; moved: boolean }
const EMPTY: Details = { name: '', email: '', phone: '', notes: '', guests: [], guest: '' }

const formats = new Map<string, Intl.DateTimeFormat>()
function format(zone: string, options: Intl.DateTimeFormatOptions) {
  const key = zone + JSON.stringify(options)
  if (!formats.has(key)) formats.set(key, new Intl.DateTimeFormat('en-US', { ...options, timeZone: zone }))
  return formats.get(key)!
}
function wall(zone: string, at: number) {
  const parts = format(zone, { hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(at)
  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}
// The moment a wall-clock time (minutes after midnight) happens in a zone.
function moment(day: string, minutes: number, zone: string) {
  const guess = Date.parse(`${day}T00:00:00Z`) + minutes * 60000
  const p = wall(zone, guess)
  return guess - (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - guess)
}
const dayIn = (zone: string, at: number) => { const p = wall(zone, at); return `${p.year}-${p.month}-${p.day}` }
const noon = (day: string) => Date.parse(`${day}T12:00:00Z`)
const nextDay = (day: string) => new Date(noon(day) + 86400000).toISOString().slice(0, 10)
const longDay = (day: string) => format('UTC', { weekday: 'long', month: 'long', day: 'numeric' }).format(noon(day))
const weekday = (day: string) => format('UTC', { weekday: 'long' }).format(noon(day))
const clock = (zone: string, at: number) => format(zone, { hour: 'numeric', minute: '2-digit' }).format(at)
const span = (zone: string, at: number, length: number) => format(zone, { hour: 'numeric', minute: '2-digit' }).formatRange(at, at + length * 60000)
const zoneName = (zone: string) => ZONES.find(([value]) => value === zone)?.[1] ?? zone.split('/').pop()!.replace(/_/g, ' ')
const gmt = (zone: string) => (format(zone, { timeZoneName: 'shortOffset' }).formatToParts(noon(FIRST_DAY)).find((p) => p.type === 'timeZoneName')?.value ?? '').replace('-', '−')
const toMinutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m }

// Every open start time for a call of this length, grouped by the visitor's day.
function openings(length: number, taken: number[], zone: string) {
  const days = new Map<string, number[]>()
  for (let day = FIRST_DAY; day <= LAST_DAY; day = nextDay(day)) {
    if ([0, 6].includes(new Date(noon(day)).getUTCDay())) continue
    const busy = (BUSY[day] ?? '').split(' ').filter(Boolean).map((range) => range.split('-').map(toMinutes))
    for (let start = HOURS.open; start + length <= HOURS.close; start += HOURS.step) {
      if (busy.some(([from, to]) => start < to && start + length > from)) continue
      const at = moment(day, start, HOST_ZONE)
      if (taken.includes(at)) continue
      const local = dayIn(zone, at)
      days.set(local, [...(days.get(local) ?? []), at])
    }
  }
  return days
}

const emailProblem = (email: string) =>
  !email.trim() ? 'Enter your email address.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : 'Enter an email address like name@example.com.'

export default function BookingScreen() {
  const { glass } = useDiyaAppearance()
  const [step, setStep] = useState<Step>('pick')
  const [length, setLength] = useState('30')
  const [where, setWhere] = useState<Where>('video')
  const [zone, setZone] = useState(HOST_ZONE)
  const [day, setDay] = useState('')
  const [slot, setSlot] = useState(0)
  const [taken, setTaken] = useState<number[]>([])
  const [details, setDetails] = useState(EMPTY)
  const [booking, setBooking] = useState<Booking>()
  const [moving, setMoving] = useState(false)
  const [notice, setNotice] = useState<{ id: number; text: string }>()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const shown = useRef(step)

  useEffect(() => {
    // The server can't know the visitor's time zone, so it's picked up after the first render.
    setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || HOST_ZONE)
  }, [])
  useEffect(() => {
    if (shown.current === step) return
    shown.current = step
    titleRef.current?.focus()
  }, [step])

  // A day is open when the shortest call still fits.
  const open = useMemo(() => openings(Number(LENGTHS[0]), taken, zone), [taken, zone])
  const times = useMemo(() => openings(Number(length), taken, zone), [length, taken, zone])
  const picked = open.has(day) ? day : [...open.keys()].sort()[0] ?? FIRST_DAY
  const zones = (ZONES.some(([value]) => value === zone) ? ZONES : [...ZONES, [zone, zoneName(zone)]]).map(([value, name]) => ({ value, label: `${name} (${gmt(value)})` }))

  function choose(at: number) {
    setSlot(at)
    setStep('details')
  }

  function booked(next: Booking) {
    setBooking(next)
    setMoving(false)
    setStep('booked')
  }

  function addToCalendar(b: Booking) {
    // Replace with a link to your server's .ics if it makes one. This builds the file right here.
    const stamp = (at: number) => new Date(at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Larkspur Studio//Booking//EN', 'BEGIN:VEVENT',
      `UID:${b.start}-intro@example.com`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(b.start)}`, `DTEND:${stamp(b.start + b.length * 60000)}`,
      `SUMMARY:${MEETING.title} with ${HOST.name}`,
      `LOCATION:${b.where === 'video' ? 'Video call (the link is in your invite)' : `Phone: ${HOST.first} calls ${b.phone}`}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    link.download = MEETING.file
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    setNotice({ id: Date.now(), text: `Open ${MEETING.file} from your downloads to add the call to your calendar.` })
  }

  const done = step === 'booked' || step === 'canceled'
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <main className="book" data-glass={glass || undefined}>
        <style>{css}</style>
        {moving && booking && !done && (
          <Alert className="book-moving" tone="info" title="Rescheduling" action={{ label: 'Keep my time', onClick: () => booked({ ...booking }) }}>
            Your call on {longDay(dayIn(booking.zone, booking.start))} at {clock(booking.zone, booking.start)} stays booked until you choose a new time.
          </Alert>
        )}
        {step === 'booked' && booking && (
          <Confirmation titleRef={titleRef} booking={booking} onAdd={() => addToCalendar(booking)}
            onMove={() => { setMoving(true); setStep('pick') }} onCanceled={() => setStep('canceled')} />
        )}
        {step === 'canceled' && (
          <section className="book-panel book-done">
            <CalendarX2 className="book-done-icon" size={40} strokeWidth={1.4} />
            <h1 ref={titleRef} tabIndex={-1} className="book-title">Call canceled</h1>
            <p className="book-lede">We let {HOST.first} know, and the time is open again. Whenever you’re ready, another one is waiting.</p>
            <Button size="large" className="book-cta" onClick={() => { setBooking(undefined); setStep('pick') }}>Book a new time</Button>
          </section>
        )}
        {!done && (
          <div className="book-panel book-grid" data-step={step}>
            <header className="book-host">
              <div className="book-who">
                <Avatar name={HOST.name} size="large" />
                <span className="book-stack">
                  <strong className="book-strong">{HOST.name}</strong>
                  <span className="book-muted">{HOST.role}</span>
                </span>
              </div>
              <h1 className="book-title">{MEETING.title}</h1>
              <p className="book-about">{MEETING.about}</p>
              {step === 'pick' ? (
                <div className="book-choices">
                  <Choice label="How long?" value={length} onValueChange={setLength} options={LENGTHS.map((value) => ({ value, label: `${value} minutes` }))} />
                  <Choice label="Where?" value={where} onValueChange={(value) => setWhere(value as Where)} options={[
                    { value: 'video', label: 'Video call', description: 'The link comes with your invite.' },
                    { value: 'phone', label: 'Phone call', description: `${HOST.first} calls you.` },
                  ]} />
                </div>
              ) : (
                <ul className="book-meta" aria-label="Your call">
                  <Meta icon={<CalendarDays />}><strong>{longDay(picked)}</strong>{span(zone, slot, Number(length))}</Meta>
                  <Meta icon={<Clock />}>{length} minutes</Meta>
                  <Meta icon={where === 'video' ? <Video /> : <Phone />}>{where === 'video' ? 'Video call' : 'Phone call'}</Meta>
                  <Meta icon={<Globe />}>{zoneName(zone)}</Meta>
                </ul>
              )}
            </header>

            {step === 'pick' ? (
              <>
                <section className="book-pick" aria-label="Day and time zone">
                  <Calendar label="Pick a day" size="large" value={picked} onValueChange={setDay} min={FIRST_DAY} max={LAST_DAY}
                    isDateUnavailable={(date) => !open.has(date)} />
                  <Select className="book-zone" label="Time zone" leadingIcon={<Globe />} options={zones} value={zone} onValueChange={setZone} />
                </section>
                <Times titleRef={titleRef} day={picked} zone={zone} length={length} list={times.get(picked) ?? []} onChoose={choose} onLength={setLength} />
              </>
            ) : (
              <DetailsForm titleRef={titleRef} details={details} setDetails={setDetails} where={where} moving={moving}
                slot={slot} zone={zone} onBack={() => setStep('pick')}
                onTaken={() => setTaken([...taken, slot])}
                onBooked={(guests) => booked({ ...details, guests, guest: '', start: slot, length: Number(length), where, zone, moved: moving })} />
            )}
          </div>
        )}
        {notice && (
          <Toast key={notice.id} tone="success" title="Downloaded" onDismiss={() => setNotice(undefined)} duration={6000}>{notice.text}</Toast>
        )}
      </main>
    </LucideProvider>
  )
}

function Meta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <li className="book-meta-row">{icon}<span>{children}</span></li>
}

type TimesProps = { titleRef: Ref<HTMLHeadingElement>; day: string; zone: string; length: string; list: number[]; onChoose: (at: number) => void; onLength: (length: string) => void }

function Times({ titleRef, day, zone, length, list, onChoose, onLength }: TimesProps) {
  const id = useId()
  const shorter = LENGTHS.filter((value) => Number(value) < Number(length)).pop()
  return (
    <section className="book-times" aria-labelledby={id}>
      <div className="book-stack">
        <h2 id={id} ref={titleRef} tabIndex={-1} className="book-day">{longDay(day)}</h2>
        <p className="book-muted">{list.length ? `${list.length} ${list.length === 1 ? 'time' : 'times'}, ${zoneName(zone)}` : 'Fully booked for this length'}</p>
      </div>
      {list.length ? (
        <ul className="book-slots">
          {list.map((at) => (
            <li key={at}><Button variant="outline" className="book-slot" onClick={() => onChoose(at)}>{clock(zone, at)}</Button></li>
          ))}
        </ul>
      ) : (
        <ContentState className="book-empty" headingLevel={3} icon={<CalendarX2 />} title={`No ${length}-minute times on ${weekday(day)}`}
          description={`Shorter calls still fit${shorter ? `, so try ${shorter} minutes` : ''}, or pick another day.`}
          action={shorter ? { label: `Switch to ${shorter} minutes`, onClick: () => onLength(shorter) } : undefined} />
      )}
    </section>
  )
}

type DetailsProps = {
  titleRef: Ref<HTMLHeadingElement>; details: Details; setDetails: (details: Details) => void; where: Where; moving: boolean
  slot: number; zone: string; onBack: () => void; onTaken: () => void; onBooked: (guests: string[]) => void
}

function DetailsForm({ titleRef, details, setDetails, where, moving, slot, zone, onBack, onTaken, onBooked }: DetailsProps) {
  const id = useId()
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'phone' | 'guest', string>>>({})
  const [busy, setBusy] = useState(false)
  const [taken, setTaken] = useState(false)
  const fields = { name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), phone: useRef<HTMLInputElement>(null), guest: useRef<HTMLInputElement>(null) }
  const alertRef = useRef<HTMLDivElement>(null)
  const [focusNext, setFocusNext] = useState<{ node: HTMLElement | null }>()
  useEffect(() => focusNext?.node?.focus(), [focusNext])

  const edit = (key: keyof Details, value: string) => {
    setDetails({ ...details, [key]: value })
    setErrors({ ...errors, [key]: undefined })
  }

  function addGuest() {
    const email = details.guest.trim().replace(/,$/, '')
    if (!email) return true
    const problem = emailProblem(email) ?? (details.guests.includes(email) ? `${email} is already invited.` : details.guests.length >= 10 ? 'You can invite up to 10 guests.' : undefined)
    if (problem) {
      setErrors({ ...errors, guest: problem })
      return false
    }
    setDetails({ ...details, guests: [...details.guests, email], guest: '' })
    return true
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const guest = details.guest.trim()
    const found = {
      name: details.name.trim() ? undefined : 'Enter your name.',
      email: emailProblem(details.email),
      phone: where === 'phone' && details.phone.replace(/\D/g, '').length < 7 ? `Enter the number ${HOST.first} should call.` : undefined,
      guest: guest && emailProblem(guest) ? 'Enter a guest’s email like name@example.com, or clear it.' : undefined,
    }
    setErrors(found)
    setTaken(false)
    const first = (['name', 'email', 'phone', 'guest'] as const).find((key) => found[key])
    if (first) return setFocusNext({ node: fields[first].current })
    setBusy(true)
    const ok = await api('/bookings', { start: slot })
    setBusy(false)
    if (ok) return onBooked(guest ? [...details.guests, guest] : details.guests)
    setTaken(true)
    onTaken()
    setFocusNext({ node: alertRef.current })
  }

  return (
    <form className="book-form" noValidate aria-labelledby={id} onSubmit={submit}>
      <div className="book-form-head">
        <Button variant="quiet" size="small" className="book-back" onClick={onBack}><ArrowLeft /> All times</Button>
        <h2 id={id} ref={titleRef} tabIndex={-1} className="book-day">Your details</h2>
      </div>
      {taken && (
        <Alert ref={alertRef} tabIndex={-1} tone="error" urgent title="That time was just taken" action={{ label: 'Pick another time', onClick: onBack }}>
          Someone booked {clock(zone, slot)} a moment before you. Your details are still here.
        </Alert>
      )}
      <TextInput ref={fields.name} className="book-field" label="Name" autoComplete="name" value={details.name} error={errors.name} onValueChange={(value) => edit('name', value)} />
      <TextInput ref={fields.email} className="book-field" label="Email" type="email" inputMode="email" autoComplete="email" spellCheck={false} helperText="Your invite goes here."
        value={details.email} error={errors.email} onValueChange={(value) => edit('email', value)} />
      {where === 'phone' && (
        <TextInput ref={fields.phone} className="book-field" label="Phone number" type="tel" inputMode="tel" autoComplete="tel" helperText={`${HOST.first} calls you on this number.`}
          value={details.phone} error={errors.phone} onValueChange={(value) => edit('phone', value)} />
      )}
      <TextArea className="book-field" label={`Anything that helps ${HOST.first} prepare? (optional)`} rows={3} maxLength={500} value={details.notes} onValueChange={(value) => edit('notes', value)} />
      <div className="book-stack book-gap">
        <div className="book-guest-row">
          <TextInput ref={fields.guest} className="book-grow" label="Add guests (optional)" type="email" inputMode="email" autoComplete="off" spellCheck={false}
            helperText="Press Enter after each email. They get the invite too." value={details.guest} error={errors.guest}
            onValueChange={(value) => edit('guest', value)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addGuest() } }} />
          <Button variant="outline" className="book-add" onClick={() => { if (addGuest()) fields.guest.current?.focus() }}>Add</Button>
        </div>
        {details.guests.length > 0 && (
          <ul className="book-tags" aria-label="Guests">
            {details.guests.map((guest) => (
              <li key={guest}>
                <Tag label={guest} onRemove={() => { setDetails({ ...details, guests: details.guests.filter((g) => g !== guest) }); fields.guest.current?.focus() }}>{guest}</Tag>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="book-stack book-gap">
        <Button type="submit" size="large" className="book-wide" loading={busy}>{moving ? 'Move my call' : 'Book it'}</Button>
        <p className="book-muted book-center">You can reschedule or cancel any time from your invite.</p>
      </div>
    </form>
  )
}

type ConfirmationProps = { titleRef: Ref<HTMLHeadingElement>; booking: Booking; onAdd: () => void; onMove: () => void; onCanceled: () => void }

function Confirmation({ titleRef, booking: b, onAdd, onMove, onCanceled }: ConfirmationProps) {
  const [canceling, setCanceling] = useState(false)
  const [reason, setReason] = useState('')
  const day = longDay(dayIn(b.zone, b.start))
  return (
    <section className="book-panel book-done">
      <CircleCheck className="book-done-icon" size={40} strokeWidth={1.4} />
      <h1 ref={titleRef} tabIndex={-1} className="book-title">{b.moved ? 'Your call moved.' : 'You’re booked.'}</h1>
      <p className="book-lede" role="status">
        {HOST.first} will see you on {day}. An invite is on its way to <strong className="book-strong">{b.email.trim()}</strong>.
      </p>
      <dl className="book-facts">
        <div><dt>What</dt><dd>{MEETING.title} with {HOST.name}</dd></div>
        <div><dt>When</dt><dd>{day}, {span(b.zone, b.start, b.length)}<span className="book-muted">{zoneName(b.zone)}</span></dd></div>
        <div><dt>Where</dt><dd>{b.where === 'video' ? 'Video call. The link is in your invite.' : `${HOST.first} calls you on ${b.phone.trim()}.`}</dd></div>
        {b.guests.length > 0 && <div><dt>Guests</dt><dd>{b.guests.join(', ')}</dd></div>}
      </dl>
      <div className="book-actions">
        <Button onClick={onAdd}><CalendarPlus /> Add to calendar</Button>
        <Button variant="outline" onClick={onMove}>Reschedule</Button>
        <Button variant="quiet" onClick={() => setCanceling(true)}>Cancel</Button>
      </div>
      <Dialog open={canceling} onOpenChange={setCanceling} size="small" title="Cancel this call?"
        description={`${HOST.first} gets a note, and the time opens up for someone else.`}
        confirmLabel="Cancel call" confirmVariant="destructive" dismissLabel="Keep it"
        onConfirm={async () => { await api('/bookings/cancel', { start: b.start }); onCanceled() }}>
        <TextArea label={`Anything ${HOST.first} should know? (optional)`} rows={3} value={reason} onValueChange={setReason} />
      </Dialog>
    </section>
  )
}

const css = `
.book {
  min-height: 100dvh;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--diya-space-5);
  padding: var(--diya-space-8) var(--diya-space-5);
  color: var(--diya-color-text);
}
.book:not([data-glass]) { background: var(--diya-color-recessed); }
.book-panel {
  width: 100%;
  border: 1px solid var(--diya-color-line);
  border-radius: calc(24px * var(--diya-corner-scale, 1));
  background: var(--diya-color-raised);
  box-shadow: 0 calc(24px * var(--diya-elevation, 1)) 64px -32px color-mix(in srgb, var(--diya-color-text) 22%, transparent);
}
.book[data-glass] .book-panel {
  background: color-mix(in srgb, var(--diya-color-raised) 64%, transparent);
  backdrop-filter: blur(28px) saturate(1.15);
}
.book-grid {
  max-width: 1120px;
  display: grid;
  grid-template-columns: minmax(0, 300px) minmax(0, 354px) minmax(0, 1fr);
  align-items: start;
  gap: var(--diya-space-7);
  padding: var(--diya-space-7);
}
.book-host { display: grid; gap: var(--diya-space-4); align-content: start; padding-inline-end: var(--diya-space-7); border-inline-end: 1px solid var(--diya-color-line); min-height: 100%; }
.book-who { display: flex; align-items: center; gap: var(--diya-space-3); margin-bottom: var(--diya-space-2); }
.book-stack { display: grid; gap: var(--diya-space-1); min-width: 0; }
.book-gap { gap: var(--diya-space-3); }
.book-strong { color: var(--diya-color-text); font-weight: 600; overflow-wrap: anywhere; }
.book-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: var(--diya-leading-body); }
.book-title { margin: 0; font-size: var(--diya-text-heading); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; text-wrap: balance; }
.book-title:focus,
.book-day:focus { outline: none; }
.book-about,
.book-lede { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.book-choices { display: grid; gap: var(--diya-space-5); margin-top: var(--diya-space-3); padding-top: var(--diya-space-5); border-top: 1px solid var(--diya-color-line); }
.book-meta { display: grid; gap: var(--diya-space-3); margin: var(--diya-space-3) 0 0; padding: var(--diya-space-5) 0 0; border-top: 1px solid var(--diya-color-line); list-style: none; }
.book-meta-row { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: var(--diya-space-3); align-items: start; font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.book-meta-row svg { margin-top: 2px; color: var(--diya-color-muted); }
.book-meta-row > span { display: grid; }
.book-meta-row strong { font-weight: 600; }
.book-pick { display: grid; gap: var(--diya-space-5); }
.book-zone { max-width: 354px; }
.book-times { display: grid; gap: var(--diya-space-5); align-content: start; }
.book-day { margin: 0; font-size: var(--diya-text-title); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.015em; }
.book-slots { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--diya-space-2); margin: 0; padding: 0; list-style: none; }
.book-slot,
.book-wide { width: 100%; }
.book-slot { font-variant-numeric: tabular-nums; }
.book-empty { max-width: none; margin: 0; padding: var(--diya-space-6) 0; border: 0; background: none; }
.book-field { width: 100%; max-width: none; }
.book-form { grid-column: span 2; display: grid; gap: var(--diya-space-5); width: 100%; max-width: 520px; }
.book-form-head { display: grid; justify-items: start; gap: var(--diya-space-3); }
.book-back { margin-inline-start: calc(-1 * var(--diya-space-3)); }
.book-guest-row { display: flex; align-items: start; gap: var(--diya-space-2); }
.book-grow { flex: 1; min-width: 0; max-width: none; }
.book-add { margin-top: 30px; }
.book-tags { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); margin: 0; padding: 0; list-style: none; }
.book-center { text-align: center; }
.book-moving { width: 100%; max-width: 1120px; }
.book-done { max-width: 560px; display: grid; justify-items: start; gap: var(--diya-space-4); padding: var(--diya-space-7); }
.book-done-icon { color: var(--diya-color-success); margin-bottom: var(--diya-space-2); }
.book-done .book-title { font-size: var(--diya-text-display); letter-spacing: -0.03em; }
.book-cta { margin-top: var(--diya-space-3); }
.book-facts { display: grid; width: 100%; margin: var(--diya-space-3) 0; font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.book-facts div { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: var(--diya-space-4); padding-block: var(--diya-space-3); border-top: 1px solid var(--diya-color-line); }
.book-facts div:last-child { border-bottom: 1px solid var(--diya-color-line); }
.book-facts dt { color: var(--diya-color-muted); }
.book-facts dd { display: grid; margin: 0; overflow-wrap: anywhere; }
.book-actions { display: flex; flex-wrap: wrap; gap: var(--diya-space-3); margin-top: var(--diya-space-2); }
@media (prefers-reduced-transparency: reduce) {
  .book[data-glass] .book-panel { background: var(--diya-color-raised); backdrop-filter: none; }
}
@media (max-width: 1120px) {
  .book-grid { max-width: 820px; grid-template-columns: minmax(0, 354px) minmax(0, 1fr); }
  .book-host { grid-column: 1 / -1; padding: 0 0 var(--diya-space-6); border-inline-end: 0; border-bottom: 1px solid var(--diya-color-line); }
  .book-choices { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .book-meta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .book { align-content: start; padding: var(--diya-space-5) var(--diya-space-4) var(--diya-space-7); }
  .book-grid { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-6); padding: var(--diya-space-6) var(--diya-space-5); }
  .book-form { grid-column: auto; }
  .book-choices,
  .book-meta { grid-template-columns: minmax(0, 1fr); }
  .book-zone { max-width: none; }
  .book-grid[data-step='details'] .book-about { display: none; }
  .book-done { padding: var(--diya-space-6) var(--diya-space-5); }
  .book-done .book-title { font-size: var(--diya-text-heading); }
}
@media (max-width: 520px) {
  .book { padding: 0; gap: 0; }
  .book-panel { border: 0; border-radius: 0; box-shadow: none; }
  .book-moving { border-radius: 0; }
  .book-done { max-width: none; min-height: 100dvh; align-content: start; }
  .book-facts div { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-1); }
}
`

'use client'
// Status page: a DIYA screen. Install: npm i @idyeah/diya lucide-react echarts@6
// Next.js: save as app/status/page.tsx. Vite: save as src/Status.tsx and render it inside your DiyaProvider.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type Ref } from 'react'
import { Alert, Badge, Button, List, Metric, Popover, Select, Tag, TextInput, useDiyaAppearance, type Tone } from '@idyeah/diya'
import { DataViz } from '@idyeah/diya/charts'
import { ArrowLeft, CircleCheck, LucideProvider, TriangleAlert, Wrench } from 'lucide-react'

// Your company, and the time zone the page shows.
const PRODUCT = 'Corvane'
const TIME_ZONE = 'America/Los_Angeles'
const DAYS = 90
const PHONE_DAYS = 30

// Right now: 'operational', or 'degraded' while the current incident below is open.
type Now = 'operational' | 'degraded'
const NOW_STATE: Now = 'operational'

type Health = 'operational' | 'degraded' | 'partial' | 'major' | 'maintenance'
const HEALTH: Record<Health, { label: string; tone: Tone }> = {
  operational: { label: 'Operational', tone: 'success' },
  degraded: { label: 'Degraded performance', tone: 'warning' },
  partial: { label: 'Partial outage', tone: 'warning' },
  major: { label: 'Major outage', tone: 'error' },
  maintenance: { label: 'Under maintenance', tone: 'info' },
}

// Each service's usual median response time, in milliseconds.
const SERVICES = [
  { id: 'api', name: 'Payments API', ms: 182 },
  { id: 'dashboard', name: 'Dashboard', ms: 246 },
  { id: 'checkout', name: 'Hosted checkout', ms: 214 },
  { id: 'webhooks', name: 'Webhooks', ms: 128 },
  { id: 'payouts', name: 'Payouts', ms: 304 },
  { id: 'email', name: 'Email receipts', ms: 96 },
]

// Sample history. It counts back from today so the demo never goes stale; your monitoring brings real times.
// `ago` is days before today, each update's time is UTC, and downtime is minutes per affected service.
type Update = { at: number; label: string; text: string }
type Incident = { id: string; title: string; impact: 'Minor' | 'Major'; services: string[]; downtime: number; updates: Update[] }
type Sample = Omit<Incident, 'updates'> & { ago: number; updates: { time: string; label: string; text: string }[] }

const INCIDENTS: Sample[] = [
  {
    id: 'webhook-retries', title: 'Delayed webhook retries', impact: 'Minor', services: ['webhooks'], downtime: 38, ago: 7, updates: [
      { time: '17:14', label: 'Resolved', text: 'Retries are back on schedule, and every delayed event has been delivered.' },
      { time: '16:58', label: 'Monitoring', text: 'A fix is out. We’re watching the retry queue drain.' },
      { time: '16:49', label: 'Identified', text: 'A configuration change slowed the retry worker. We’re rolling it back.' },
      { time: '16:36', label: 'Investigating', text: 'Some webhook retries are arriving late. First attempts are not affected.' },
    ],
  },
  {
    id: 'dashboard-sign-in', title: 'Dashboard sign-in errors', impact: 'Major', services: ['dashboard'], downtime: 22, ago: 19, updates: [
      { time: '15:31', label: 'Resolved', text: 'Sign-in works again for everyone. Payments were never affected.' },
      { time: '15:18', label: 'Identified', text: 'An expired certificate on our sign-in service. We’re replacing it now.' },
      { time: '15:09', label: 'Investigating', text: 'People can’t sign in to the Dashboard. The API and checkout are working.' },
    ],
  },
  {
    id: 'api-latency', title: 'Slower API responses in US West', impact: 'Minor', services: ['api', 'checkout'], downtime: 12, ago: 32, updates: [
      { time: '21:02', label: 'Resolved', text: 'Response times are back to normal in every region.' },
      { time: '20:21', label: 'Identified', text: 'A busy database node in US West. We moved traffic to a healthy one.' },
      { time: '20:11', label: 'Investigating', text: 'Some API requests in US West are taking several seconds.' },
    ],
  },
  {
    id: 'payouts-late', title: 'Some payouts arrived a day late', impact: 'Minor', services: ['payouts'], downtime: 0, ago: 53, updates: [
      { time: '19:40', label: 'Resolved', text: 'All affected payouts have landed. We’ve added a check so a bank holiday file can’t be skipped again.' },
      { time: '14:05', label: 'Identified', text: 'A bank holiday schedule wasn’t applied. Payouts due today will arrive tomorrow.' },
    ],
  },
]

// Shown while NOW_STATE is 'degraded'. Times are minutes ago.
const CURRENT = {
  id: 'webhooks-now', title: 'Webhooks are arriving late', impact: 'Minor', services: ['webhooks'], downtime: 0, updates: [
    { minutesAgo: 11, label: 'Identified', text: 'A slow database replica is holding up the delivery queue. We’re moving traffic off it. Events are 5 to 10 minutes late, and none have been lost.' },
    { minutesAgo: 30, label: 'Investigating', text: 'Webhook deliveries are slower than usual. Payments and the API are working normally.' },
  ],
} as const

// Days from today, and UTC hours.
const MAINTENANCE = { title: 'Database upgrade', inDays: 6, from: 10, hours: 3, text: 'The Dashboard may be read-only for up to 10 minutes. Payments keep working.' }

// Replace with your API call. The stub waits a moment; offline@example.com fails as if the network dropped.
async function api(route: '/subscribe', email: string) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return route === '/subscribe' && email !== 'offline@example.com'
}

// The reader's clock, to the minute. The server can't know it, so it renders 0 and the board fills in once the page loads.
const subscribeNever = () => () => {}
const minuteNow = () => Math.floor(Date.now() / 60000) * 60000
const useNow = () => useSyncExternalStore(subscribeNever, minuteNow, () => 0)

const DAY = 86_400_000
const HOUR = 3_600_000
const midnight = (now: number) => Math.floor(now / DAY) * DAY
const resolve = (sample: Sample, now: number): Incident => ({
  ...sample,
  updates: sample.updates.map(({ time, ...update }) => {
    const [h, m] = time.split(':').map(Number)
    return { ...update, at: midnight(now) - sample.ago * DAY + h * HOUR + m * 60000 }
  }),
})
const when = (at: number, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, ...options }).format(at)
// "10:42 AM PST", held together so it never breaks across lines.
const clock = (at: number) => when(at, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).replace(/ /g, ' ')
const date = (at: number) => when(at, { month: 'long', day: 'numeric', year: 'numeric' })
const monthKey = (at: number) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit' }).formatToParts(at).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}`
}
const minutes = (incident: Incident) => Math.round((incident.updates[0].at - incident.updates.at(-1)!.at) / 60000)
const duration = (total: number) => (total < 60 ? `${total} minutes` : `${Math.floor(total / 60)} h ${total % 60} min`)
const percent = (value: number) => `${(Math.floor(value * 100) / 100).toFixed(2)}`
const nameOf = (id: string) => SERVICES.find((service) => service.id === id)?.name ?? id

// What each of the last DAYS days looked like for one service, oldest first.
type Day = 'operational' | 'minor' | 'major'
function daysFor(service: string, degraded: boolean): Day[] {
  const days = Array<Day>(DAYS).fill('operational')
  for (const incident of INCIDENTS) if (incident.services.includes(service)) days[DAYS - 1 - incident.ago] = incident.impact === 'Major' ? 'major' : 'minor'
  if (degraded && (CURRENT.services as readonly string[]).includes(service)) days[DAYS - 1] = 'minor'
  return days
}
const uptimeFor = (service: string, days = DAYS) =>
  100 * (1 - INCIDENTS.reduce((sum, incident) => sum + (incident.services.includes(service) && incident.ago < days ? incident.downtime : 0), 0) / (days * 1440))
// Daily median response time: the service's usual speed, a little day-to-day drift, and slow days when something went wrong.
function responseFor(service: string) {
  const { ms } = SERVICES.find((item) => item.id === service)!
  const seed = service.length
  return daysFor(service, false).map((day, i) =>
    Math.round(ms * (1 + 0.05 * Math.sin(i * 1.7 + seed) + 0.03 * Math.sin(i * 0.37 + seed * 2)) * (day === 'major' ? 2.6 : day === 'minor' ? 1.7 : 1)))
}
// The axis starts at 0, and its 0 label would sit on the first date, so 0 stays unlabeled. No day is ever 0 ms.
const formatMs = (value: number) => (value ? `${value} ms` : '')

export default function StatusScreen() {
  const { glass } = useDiyaAppearance()
  const [now, setNow] = useState<Now>(NOW_STATE)
  const [open, setOpen] = useState<Incident>()
  const clockNow = useNow()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const view = open?.id ?? 'board'
  const shown = useRef(view)

  useEffect(() => {
    if (shown.current === view) return
    shown.current = view
    titleRef.current?.focus()
  }, [view])

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="status" data-glass={glass || undefined}>
        <style>{css}</style>
        <header className="status-header">
          <a className="status-brand" href="/"><span className="status-mark" aria-hidden="true">{PRODUCT[0]}</span>{PRODUCT}<span className="status-muted">Status</span></a>
          <Subscribe />
        </header>
        <main className="status-main">
          {open ? (
            <Detail incident={open} titleRef={titleRef} onBack={() => setOpen(undefined)} />
          ) : (
            <Board now={now} at={clockNow} titleRef={titleRef} onOpen={setOpen} />
          )}
        </main>
        <footer className="status-footer">
          <p>Times in Pacific time. Checked every minute from six regions.</p>
          {/* Demo only: remove this switcher and set NOW_STATE from your monitoring. */}
          <div className="status-demo" role="group" aria-label="Demo state">
            <span aria-hidden="true">Demo</span>
            {(['operational', 'degraded'] as const).map((option) => (
              <Button key={option} size="small" variant={now === option ? 'outline' : 'quiet'} aria-pressed={now === option}
                onClick={() => { setNow(option); setOpen(undefined) }}>
                {option === 'operational' ? 'Operational' : 'Degraded'}
              </Button>
            ))}
          </div>
        </footer>
      </div>
    </LucideProvider>
  )
}

type BoardProps = { now: Now; at: number; titleRef: Ref<HTMLHeadingElement>; onOpen: (incident: Incident) => void }

function Board({ now, at, titleRef, onOpen }: BoardProps) {
  const [service, setService] = useState('api')
  const degraded = now === 'degraded'
  const health = (id: string): Health => (degraded && (CURRENT.services as readonly string[]).includes(id) ? 'degraded' : 'operational')
  const history = useMemo(() => (at ? INCIDENTS.map((sample) => resolve(sample, at)) : []), [at])
  const months = at ? [...new Set(Array.from({ length: DAYS }, (_, back) => monthKey(at - back * DAY)))] : []
  const categories = useMemo(() => Array.from({ length: DAYS }, (_, i) => (at ? when(at - (DAYS - 1 - i) * DAY, { month: 'short', day: 'numeric' }) : '')), [at])
  const response = useMemo(() => responseFor(service), [service])
  const maintenance = midnight(at) + MAINTENANCE.inDays * DAY + MAINTENANCE.from * HOUR

  return (
    <>
      <section className="status-banner" aria-labelledby="status-title" data-state={now}>
        <span className="status-banner-icon" aria-hidden="true">{degraded ? <TriangleAlert /> : <CircleCheck />}</span>
        <h1 id="status-title" ref={titleRef} tabIndex={-1} className="status-h1">
          {degraded ? 'Webhooks are running late' : 'All systems operational'}
        </h1>
        <p className="status-lede">
          {degraded ? 'Payments and the API are working. We’re on it, and we’ll post here as things change.' : 'Payments, payouts and everything around them are working normally.'}
          {at > 0 && <> Updated {clock(at)}.</>}
        </p>
      </section>

      {degraded && at > 0 && (
        <section className="status-section status-current" aria-labelledby="status-current">
          <div className="status-row">
            <h2 id="status-current" className="status-h2">{CURRENT.title}</h2>
            <Tag tone="warning" leading="dot">{CURRENT.updates[0].label}</Tag>
          </div>
          <p className="status-muted">Affects {CURRENT.services.map(nameOf).join(', ')} · Started {clock(at - CURRENT.updates.at(-1)!.minutesAgo * 60000)}</p>
          <Timeline updates={CURRENT.updates.map(({ minutesAgo, ...update }) => ({ ...update, at: at - minutesAgo * 60000 }))} />
        </section>
      )}

      <section className="status-section" aria-labelledby="status-services">
        <div className="status-row">
          <h2 id="status-services" className="status-h2">Services</h2>
          <p className="status-legend" aria-hidden="true">
            <span data-day="operational">No issues</span><span data-day="minor">Minor incident</span><span data-day="major">Major outage</span>
          </p>
        </div>
        <ul className="status-services">
          {SERVICES.map((item) => {
            const days = daysFor(item.id, degraded)
            const bad = (list: Day[], kind: Day) => list.filter((day) => day === kind).length
            const summary = (list: Day[]) => {
              const minor = bad(list, 'minor'), major = bad(list, 'major')
              return [major && `${major} with a major outage`, minor && `${minor} with a minor incident`].filter(Boolean).join(', ') || 'no incidents'
            }
            return (
              <li key={item.id} className="status-service">
                <div className="status-row">
                  <h3 className="status-h3">{item.name}</h3>
                  <HealthLabel health={health(item.id)} />
                </div>
                <div className="status-strip" role="img" data-days={DAYS}
                  aria-label={`${item.name}, last ${DAYS} days: ${summary(days)}. Last ${PHONE_DAYS} days: ${summary(days.slice(-PHONE_DAYS))}.`}>
                  {days.map((day, i) => <span key={i} data-day={day} />)}
                </div>
                <p className="status-strip-scale" aria-hidden="true">
                  <span><span className="status-wide">{DAYS}</span><span className="status-narrow">{PHONE_DAYS}</span> days ago</span>
                  <span><span className="status-wide">{percent(uptimeFor(item.id))}</span><span className="status-narrow">{percent(uptimeFor(item.id, PHONE_DAYS))}</span>% uptime</span>
                  <span>Today</span>
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="status-section" aria-label="Response time">
        <DataViz
          title="Response time, last 90 days"
          headingLevel={2}
          description="The median time to answer a request, each day. Slow days line up with the incidents below."
          type="line"
          categories={categories}
          series={[{ name: 'Median response', values: response }]}
          legend={false}
          height={220}
          formatValue={formatMs}
          actions={<Select label="Service" hideLabel options={SERVICES.map((item) => ({ value: item.id, label: item.name }))} value={service} onValueChange={setService} />}
          summary={<span className="status-summary"><Metric label={`${nameOf(service)}, median today`} value={String(response.at(-1))} unit="ms" size="large" /></span>}
        />
      </section>

      {at > 0 && (
        <section className="status-section" aria-labelledby="status-scheduled">
          <h2 id="status-scheduled" className="status-h2">Scheduled maintenance</h2>
          <div className="status-planned">
            <span className="status-planned-icon" aria-hidden="true"><Wrench /></span>
            <div>
              <h3 className="status-h3">{MAINTENANCE.title}</h3>
              <p className="status-muted">
                {when(maintenance, { weekday: 'long', month: 'long', day: 'numeric' })}, {when(maintenance, { hour: 'numeric', minute: '2-digit' })} to {clock(maintenance + MAINTENANCE.hours * HOUR)}. {MAINTENANCE.text}
              </p>
            </div>
          </div>
        </section>
      )}

      {at > 0 && (
        <section className="status-section" aria-labelledby="status-history">
          <h2 id="status-history" className="status-h2">Past incidents</h2>
          {months.map((month) => {
            const found = history.filter((incident) => monthKey(incident.updates[0].at) === month)
            const name = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(Date.parse(`${month}-15T12:00:00Z`))
            return (
              <div key={month} className="status-month">
                <h3 className="status-h3">{name({ month: 'long', year: 'numeric' })}</h3>
                {found.length ? (
                  <List label={`Incidents in ${name({ month: 'long' })}`} divided className="status-list"
                    items={found.map((incident) => ({
                      id: incident.id,
                      label: incident.title,
                      description: `${date(incident.updates[0].at)} · Resolved in ${duration(minutes(incident))}`,
                      trailing: <Tag tone={incident.impact === 'Major' ? 'error' : 'warning'} size="small">{incident.impact}</Tag>,
                      onSelect: () => onOpen(incident),
                    }))} />
                ) : (
                  <p className="status-muted">No incidents reported.</p>
                )}
              </div>
            )
          })}
        </section>
      )}
    </>
  )
}

function Detail({ incident, titleRef, onBack }: { incident: Incident; titleRef: Ref<HTMLHeadingElement>; onBack: () => void }) {
  return (
    <article className="status-detail" aria-labelledby="status-detail-title">
      <Button variant="quiet" className="status-back" onClick={onBack}><ArrowLeft /> All incidents</Button>
      <div className="status-detail-head">
        <Tag tone={incident.impact === 'Major' ? 'error' : 'warning'}>{incident.impact} incident</Tag>
        <h1 id="status-detail-title" ref={titleRef} tabIndex={-1} className="status-h1">{incident.title}</h1>
        <dl className="status-facts">
          <div><dt>Status</dt><dd><HealthLabel health="operational" text="Resolved" /></dd></div>
          <div><dt>Date</dt><dd>{date(incident.updates[0].at)}</dd></div>
          <div><dt>Lasted</dt><dd>{duration(minutes(incident))}</dd></div>
          <div><dt>Affected</dt><dd>{incident.services.map(nameOf).join(', ')}</dd></div>
        </dl>
      </div>
      <section className="status-section" aria-labelledby="status-updates">
        <h2 id="status-updates" className="status-h2">Updates</h2>
        <Timeline updates={incident.updates} />
      </section>
    </article>
  )
}

function Timeline({ updates }: { updates: Update[] }) {
  return (
    <ol className="status-timeline">
      {updates.map((update) => (
        <li key={update.at}>
          <p className="status-timeline-head"><strong>{update.label}</strong><time dateTime={new Date(update.at).toISOString()}>{clock(update.at)}</time></p>
          <p className="status-muted">{update.text}</p>
        </li>
      ))}
    </ol>
  )
}

function HealthLabel({ health, text }: { health: Health; text?: string }) {
  return (
    <span className="status-health" data-health={health}>
      <span aria-hidden="true"><Badge variant="dot" tone={HEALTH[health].tone} label={HEALTH[health].label} /></span>
      {text ?? HEALTH[health].label}
    </span>
  )
}

function Subscribe() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle')

  async function subscribe(event: FormEvent) {
    event.preventDefault()
    const problem = !email.trim() ? 'Enter your email address.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : 'Enter an email address like name@example.com.'
    setError(problem)
    if (problem || state === 'busy') return
    setState('busy')
    setState((await api('/subscribe', email.trim())) ? 'done' : 'failed')
  }

  return (
    <Popover label="Subscribe to updates" trigger={<Button variant="outline">Subscribe to updates</Button>}>
      {(close) => (
        <form className="status-subscribe" noValidate aria-label="Subscribe to updates" onSubmit={subscribe}>
          <div role="status">
            {state === 'done' && <p className="status-muted">Subscribed. We’ll email <strong>{email.trim()}</strong> when an incident starts and when it ends.</p>}
          </div>
          {state === 'done' ? (
            <Button onClick={close}>Done</Button>
          ) : (
            <>
              <p className="status-muted">Get an email when something breaks, and another when it’s fixed.</p>
              {state === 'failed' && <Alert tone="error" urgent>That didn’t go through. Try again in a moment.</Alert>}
              <TextInput label="Email" type="email" autoComplete="email" value={email} error={error} onValueChange={(value) => { setEmail(value); setError(undefined) }} />
              <Button type="submit" loading={state === 'busy'}>Subscribe</Button>
            </>
          )}
        </form>
      )}
    </Popover>
  )
}

const css = `
.status { min-height: 100dvh; display: flex; flex-direction: column; color: var(--diya-color-text); }
.status-header {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-3);
  width: 100%; max-width: 880px; margin: 0 auto; padding: var(--diya-space-5);
}
.status-brand { display: inline-flex; align-items: center; gap: 10px; color: inherit; font-size: var(--diya-text-large); font-weight: 650; letter-spacing: -0.02em; text-decoration: none; border-radius: 8px; }
.status-brand .status-muted { font-weight: 400; }
.status-brand:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: 4px; }
.status-mark {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: calc(8px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-body); font-weight: 700;
}
.status-main { flex: 1; width: 100%; max-width: 880px; margin: 0 auto; padding: 0 var(--diya-space-5) var(--diya-space-8); }
.status-banner { display: grid; justify-items: center; gap: var(--diya-space-4); padding: clamp(48px, 9vh, 96px) 0 var(--diya-space-8); text-align: center; }
.status-banner-icon { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: var(--diya-color-success-surface); color: var(--diya-color-success); }
.status-banner[data-state='degraded'] .status-banner-icon { background: var(--diya-color-warning-surface); color: var(--diya-color-warning); }
.status-banner-icon svg { width: 30px; height: 30px; }
.status-h1 { max-width: 16ch; margin: 0; font-size: clamp(40px, 5.4vw, 72px); font-weight: 650; line-height: 1.04; letter-spacing: -0.03em; text-wrap: balance; }
.status-h1:focus { outline: none; }
.status-h2 { margin: 0; font-size: var(--diya-text-title); font-weight: 650; letter-spacing: -0.02em; }
.status-h3 { margin: 0; font-size: var(--diya-text-body); font-weight: 600; }
.status-lede { max-width: 540px; margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-large); line-height: 1.5; text-wrap: pretty; }
.status-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.status-muted strong { color: var(--diya-color-text); font-weight: 600; overflow-wrap: anywhere; }
.status-section { display: grid; gap: var(--diya-space-4); padding: var(--diya-space-7) 0 0; }
.status-current { padding: var(--diya-space-6); border-radius: var(--diya-radius-surface); background: var(--diya-color-warning-surface); }
.status-current + .status-section { padding-top: var(--diya-space-7); }
.status-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-3); }
.status-list { max-width: none; }
.status-legend { display: flex; flex-wrap: wrap; gap: var(--diya-space-2) var(--diya-space-4); margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.status-legend span { display: inline-flex; align-items: center; gap: var(--diya-space-2); }
.status-legend span::before { content: ''; width: 8px; height: 16px; border-radius: 2px; background: var(--status-day); }
.status [data-day='operational'] { --status-day: var(--diya-color-success-fill); }
.status [data-day='minor'] { --status-day: var(--diya-color-warning-fill); }
.status [data-day='major'] { --status-day: var(--diya-color-error-fill); }
.status-services { display: grid; gap: var(--diya-space-6); margin: var(--diya-space-2) 0 0; padding: 0; list-style: none; }
.status-service { display: grid; gap: var(--diya-space-3); }
.status-strip { display: grid; grid-template-columns: repeat(90, minmax(0, 1fr)); gap: 2px; height: 32px; }
.status-strip > span { border-radius: 2px; background: var(--status-day); }
.status-strip > [data-day='operational'] { opacity: 0.72; }
.status-strip-scale { display: flex; justify-content: space-between; gap: var(--diya-space-3); margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-variant-numeric: tabular-nums; }
.status-narrow { display: none; }
.status-summary { display: block; letter-spacing: normal; }
.status:not([data-glass]) .status-list { width: calc(100% + 28px); margin-inline: -14px; }
.status-health { display: inline-flex; align-items: center; gap: var(--diya-space-2); color: var(--diya-color-text); font-size: var(--diya-text-body); white-space: nowrap; }
.status-health > span { display: inline-flex; }
.status-planned { display: flex; gap: var(--diya-space-4); align-items: flex-start; }
.status-planned > div { display: grid; gap: var(--diya-space-1); }
.status-planned-icon { display: grid; flex-shrink: 0; place-items: center; width: 40px; height: 40px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--diya-color-line); color: var(--diya-color-muted); }
.status-month { display: grid; gap: var(--diya-space-2); padding-top: var(--diya-space-3); }
.status-timeline { display: grid; margin: var(--diya-space-2) 0 0; padding: 0; list-style: none; }
.status-timeline li { position: relative; display: grid; gap: var(--diya-space-1); padding: 0 0 var(--diya-space-5) var(--diya-space-6); }
.status-timeline li::before {
  content: ''; position: absolute; left: 4px; top: 7px; width: 9px; height: 9px; border-radius: 50%;
  background: var(--diya-color-surface); box-shadow: inset 0 0 0 2px var(--diya-color-muted);
}
.status-timeline li:first-child::before { background: var(--diya-color-text); box-shadow: none; }
.status-timeline li::after { content: ''; position: absolute; left: 8px; top: 22px; bottom: 4px; width: 1px; background: var(--diya-color-line); }
.status-timeline li:last-child { padding-bottom: 0; }
.status-timeline li:last-child::after { display: none; }
.status-timeline-head { display: flex; flex-wrap: wrap; gap: var(--diya-space-3); align-items: baseline; margin: 0; font-size: var(--diya-text-body); }
.status-timeline-head time { color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-variant-numeric: tabular-nums; }
.status-detail { display: grid; gap: var(--diya-space-2); padding-top: var(--diya-space-5); }
.status-back { justify-self: start; margin-inline-start: calc(-1 * var(--diya-space-3)); }
.status-detail-head { display: grid; justify-items: start; gap: var(--diya-space-4); padding-top: var(--diya-space-6); }
.status-facts { display: grid; grid-template-columns: repeat(4, minmax(0, auto)); gap: var(--diya-space-3) var(--diya-space-7); margin: var(--diya-space-3) 0 0; }
.status-facts div { display: grid; gap: var(--diya-space-1); }
.status-facts dt { color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.status-facts dd { margin: 0; font-size: var(--diya-text-body); font-weight: 500; }
.status-subscribe { display: grid; gap: var(--diya-space-4); }
.status-footer {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-3) var(--diya-space-5);
  width: calc(100% - 2 * var(--diya-space-5)); max-width: 832px; margin: 0 auto; padding: var(--diya-space-5) 0;
  border-top: 1px solid var(--diya-color-line); color: var(--diya-color-muted); font-size: var(--diya-text-caption);
}
.status-footer p { margin: 0; }
.status-demo { display: inline-flex; align-items: center; gap: var(--diya-space-1); }
.status-demo > span { margin-inline-end: var(--diya-space-2); }
@media (max-width: 640px) {
  .status-header, .status-main { padding-inline: var(--diya-space-4); }
  .status-footer { width: calc(100% - 2 * var(--diya-space-4)); }
  .status-current { padding: var(--diya-space-5); }
  .status-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--diya-space-4); }
  .status-strip { grid-template-columns: repeat(30, minmax(0, 1fr)); }
  .status-strip > :nth-child(-n + 60) { display: none; }
  .status-wide { display: none; }
  .status-narrow { display: inline; }
}
`

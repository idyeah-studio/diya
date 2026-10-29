'use client'
// Status page: a DIYA screen. Install: npm i @idyeah/diya lucide-react echarts@6
// Next.js: save as app/status/page.tsx. Vite: save as src/Status.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, type FormEvent, type Ref } from 'react'
import { Alert, Badge, Button, List, Metric, Popover, Select, Tag, TextInput, useDiyaAppearance, type Tone } from '@idyeah/diya'
import { DataViz } from '@idyeah/diya/charts'
import { ArrowLeft, CircleCheck, LucideProvider, TriangleAlert, Wrench } from 'lucide-react'

// Your company, the time this page was built, and the time zone it shows.
const PRODUCT = 'Corvane'
const NOW = '2026-11-09T18:42:00Z'
const TIME_ZONE = 'America/Los_Angeles'
const DAYS = 90

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

const SERVICES = [
  { id: 'api', name: 'Payments API' },
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'checkout', name: 'Hosted checkout' },
  { id: 'webhooks', name: 'Webhooks' },
  { id: 'payouts', name: 'Payouts' },
  { id: 'email', name: 'Email receipts' },
]

type Update = { at: string; label: string; text: string }
type Incident = { id: string; title: string; impact: 'Minor' | 'Major'; services: string[]; downtime: number; updates: Update[] }

// Newest first. Each update's time is UTC; downtime is minutes per affected service.
const INCIDENTS: Incident[] = [
  {
    id: 'webhook-retries', title: 'Delayed webhook retries', impact: 'Minor', services: ['webhooks'], downtime: 38, updates: [
      { at: '2026-11-02T17:14:00Z', label: 'Resolved', text: 'Retries are back on schedule, and every delayed event has been delivered.' },
      { at: '2026-11-02T16:58:00Z', label: 'Monitoring', text: 'A fix is out. We’re watching the retry queue drain.' },
      { at: '2026-11-02T16:49:00Z', label: 'Identified', text: 'A configuration change slowed the retry worker. We’re rolling it back.' },
      { at: '2026-11-02T16:36:00Z', label: 'Investigating', text: 'Some webhook retries are arriving late. First attempts are not affected.' },
    ],
  },
  {
    id: 'dashboard-sign-in', title: 'Dashboard sign-in errors', impact: 'Major', services: ['dashboard'], downtime: 22, updates: [
      { at: '2026-10-21T15:31:00Z', label: 'Resolved', text: 'Sign-in works again for everyone. Payments were never affected.' },
      { at: '2026-10-21T15:18:00Z', label: 'Identified', text: 'An expired certificate on our sign-in service. We’re replacing it now.' },
      { at: '2026-10-21T15:09:00Z', label: 'Investigating', text: 'People can’t sign in to the Dashboard. The API and checkout are working.' },
    ],
  },
  {
    id: 'api-latency', title: 'Slower API responses in US West', impact: 'Minor', services: ['api', 'checkout'], downtime: 12, updates: [
      { at: '2026-10-08T21:02:00Z', label: 'Resolved', text: 'Response times are back to normal in every region.' },
      { at: '2026-10-08T20:21:00Z', label: 'Identified', text: 'A busy database node in US West. We moved traffic to a healthy one.' },
      { at: '2026-10-08T20:11:00Z', label: 'Investigating', text: 'Some API requests in US West are taking several seconds.' },
    ],
  },
  {
    id: 'payouts-late', title: 'Some payouts arrived a day late', impact: 'Minor', services: ['payouts'], downtime: 0, updates: [
      { at: '2026-09-17T19:40:00Z', label: 'Resolved', text: 'All affected payouts have landed. We’ve added a check so a bank holiday file can’t be skipped again.' },
      { at: '2026-09-17T14:05:00Z', label: 'Identified', text: 'A bank holiday schedule wasn’t applied. Payouts due today will arrive tomorrow.' },
    ],
  },
]

// Shown while NOW_STATE is 'degraded'.
const CURRENT: Incident = {
  id: 'webhooks-now', title: 'Webhooks are arriving late', impact: 'Minor', services: ['webhooks'], downtime: 0, updates: [
    { at: '2026-11-09T18:31:00Z', label: 'Identified', text: 'A slow database replica is holding up the delivery queue. We’re moving traffic off it. Events are 5 to 10 minutes late, and none have been lost.' },
    { at: '2026-11-09T18:12:00Z', label: 'Investigating', text: 'Webhook deliveries are slower than usual. Payments and the API are working normally.' },
  ],
}

const MAINTENANCE = { title: 'Database upgrade', start: '2026-11-15T09:00:00Z', end: '2026-11-15T12:00:00Z', text: 'The Dashboard may be read-only for up to 10 minutes. Payments keep working.' }

// Replace with your API call. The stub waits a moment; offline@example.com fails as if the network dropped.
async function api(route: '/subscribe', email: string) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return route === '/subscribe' && email !== 'offline@example.com'
}

const DAY = 86_400_000
const first = Date.parse(NOW.slice(0, 10)) - (DAYS - 1) * DAY
const dayIndex = (iso: string) => Math.floor((Date.parse(iso.slice(0, 10)) - first) / DAY)
const when = (iso: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, ...options }).format(new Date(iso))
const clock = (iso: string) => when(iso, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
const date = (iso: string) => when(iso, { month: 'long', day: 'numeric', year: 'numeric' })
const minutes = (incident: Incident) => Math.round((Date.parse(incident.updates[0].at) - Date.parse(incident.updates.at(-1)!.at)) / 60000)
const duration = (total: number) => (total < 60 ? `${total} minutes` : `${Math.floor(total / 60)} h ${total % 60} min`)
const percent = (value: number) => `${(Math.floor(value * 100) / 100).toFixed(2)}`
const nameOf = (id: string) => SERVICES.find((service) => service.id === id)?.name ?? id
const CATEGORIES = Array.from({ length: DAYS }, (_, index) => when(new Date(first + index * DAY + 12 * 3600000).toISOString(), { month: 'short', day: 'numeric' }))

function downtimeFor(service: string) {
  const values = Array<number>(DAYS).fill(0)
  for (const incident of INCIDENTS) if (incident.services.includes(service)) values[dayIndex(incident.updates[0].at)] += incident.downtime
  return values
}
const uptimeFor = (service: string) => 100 * (1 - downtimeFor(service).reduce((sum, value) => sum + value, 0) / (DAYS * 1440))
const formatMinutes = (value: number) => `${value} min`

export default function StatusScreen() {
  const { glass } = useDiyaAppearance()
  const [now, setNow] = useState<Now>(NOW_STATE)
  const [open, setOpen] = useState<Incident>()
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
            <Board now={now} titleRef={titleRef} onOpen={setOpen} />
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

function Board({ now, titleRef, onOpen }: { now: Now; titleRef: Ref<HTMLHeadingElement>; onOpen: (incident: Incident) => void }) {
  const [service, setService] = useState('api')
  const degraded = now === 'degraded'
  const health = (id: string): Health => (degraded && CURRENT.services.includes(id) ? 'degraded' : 'operational')
  const months = [...new Set(CATEGORIES.map((_, index) => new Date(first + (DAYS - 1 - index) * DAY + 12 * 3600000).toISOString().slice(0, 7)))]

  return (
    <>
      <section className="status-banner" aria-labelledby="status-title" data-state={now}>
        <span className="status-banner-icon" aria-hidden="true">{degraded ? <TriangleAlert /> : <CircleCheck />}</span>
        <h1 id="status-title" ref={titleRef} tabIndex={-1} className="status-h1">
          {degraded ? 'Webhooks are running late' : 'All systems operational'}
        </h1>
        <p className="status-lede">
          {degraded ? 'Payments and the API are working. We’re on it, and we’ll post here as things change.' : 'Payments, payouts and everything around them are working normally.'}{' '}
          Updated {clock(NOW)}.
        </p>
      </section>

      {degraded && (
        <section className="status-section status-current" aria-labelledby="status-current">
          <div className="status-row">
            <h2 id="status-current" className="status-h2">{CURRENT.title}</h2>
            <Tag tone="warning" leading="dot">{CURRENT.updates[0].label}</Tag>
          </div>
          <p className="status-muted">Affects {CURRENT.services.map(nameOf).join(', ')} · Started {clock(CURRENT.updates.at(-1)!.at)}</p>
          <Timeline updates={CURRENT.updates} />
        </section>
      )}

      <section className="status-section" aria-labelledby="status-services">
        <h2 id="status-services" className="status-h2">Services</h2>
        <List label="Services" divided className="status-list"
          items={SERVICES.map((item) => ({
            id: item.id,
            label: item.name,
            description: `${percent(uptimeFor(item.id))}% uptime, last ${DAYS} days`,
            trailing: <HealthLabel health={health(item.id)} />,
          }))} />
      </section>

      <section className="status-section" aria-label="Uptime">
        <DataViz
          title="Uptime, last 90 days"
          headingLevel={2}
          description="Minutes of downtime each day. Most days have none."
          type="bar"
          categories={CATEGORIES}
          series={[{ name: 'Downtime', values: downtimeFor(service) }]}
          legend={false}
          height={220}
          formatValue={formatMinutes}
          actions={<Select label="Service" hideLabel options={SERVICES.map((item) => ({ value: item.id, label: item.name }))} value={service} onValueChange={setService} />}
          summary={<Metric label={`${nameOf(service)} uptime`} value={percent(uptimeFor(service))} unit="%" size="large" />}
        />
      </section>

      <section className="status-section" aria-labelledby="status-scheduled">
        <h2 id="status-scheduled" className="status-h2">Scheduled maintenance</h2>
        <div className="status-planned">
          <span className="status-planned-icon" aria-hidden="true"><Wrench /></span>
          <div>
            <h3 className="status-h3">{MAINTENANCE.title}</h3>
            <p className="status-muted">
              {when(MAINTENANCE.start, { weekday: 'long', month: 'long', day: 'numeric' })}, {when(MAINTENANCE.start, { hour: 'numeric', minute: '2-digit' })} to {clock(MAINTENANCE.end)}. {MAINTENANCE.text}
            </p>
          </div>
        </div>
      </section>

      <section className="status-section" aria-labelledby="status-history">
        <h2 id="status-history" className="status-h2">Past incidents</h2>
        {months.map((month) => {
          const found = INCIDENTS.filter((incident) => incident.updates[0].at.startsWith(month))
          return (
            <div key={month} className="status-month">
              <h3 className="status-h3">{when(`${month}-15T12:00:00Z`, { month: 'long', year: 'numeric' })}</h3>
              {found.length ? (
                <List label={`Incidents in ${when(`${month}-15T12:00:00Z`, { month: 'long' })}`} divided className="status-list"
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
          <p className="status-timeline-head"><strong>{update.label}</strong><time dateTime={update.at}>{clock(update.at)}</time></p>
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
.status-h1 { max-width: 16ch; margin: 0; font-size: clamp(36px, 5.4vw, 64px); font-weight: 650; line-height: 1.04; letter-spacing: -0.045em; text-wrap: balance; }
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
}
`

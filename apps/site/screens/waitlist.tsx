'use client'
// Waitlist & coming soon: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/waitlist/page.tsx. Vite: save as src/Waitlist.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type Ref } from 'react'
import { Accordion, Alert, Avatar, Button, List, Tag, TextInput, TextLink, Toast, useDiyaAppearance } from '@idyeah/diya'
import { ArrowLeft, ArrowRight, CalendarRange, Check, Copy, LucideProvider, MapPinned, Vote, WifiOff } from 'lucide-react'

// Which page this is: 'waitlist' before you launch, 'maintenance' during planned downtime.
type Kind = 'waitlist' | 'maintenance'
const KIND: Kind = 'waitlist'

// Your product, the line so far, and the maintenance window.
const PRODUCT = 'Fernway'
const IN_LINE = 1283
const EARLY = [{ name: 'Amara Okafor' }, { name: 'Mateo Silva' }, { name: 'Priya Natarajan' }, { name: 'Lin Zhou' }]
const INVITE_URL = 'https://fernway.example.com/join?ref='
const MAINTENANCE = { start: '2026-11-15T09:00:00Z', end: '2026-11-15T12:00:00Z', timeZone: 'America/Los_Angeles', statusUrl: '/status' }
const STEPS = [
  { id: 'backup', label: 'Back up every trip', status: 'Done' },
  { id: 'move', label: 'Move to the new servers', status: 'In progress' },
  { id: 'check', label: 'Check everything twice', status: 'Up next' },
]

const POINTS = [
  { icon: <MapPinned />, title: 'One plan, everyone edits', text: 'Flights, stays and that one restaurant, in a day-by-day plan the whole group can change.' },
  { icon: <Vote />, title: 'Votes, not arguments', text: 'Can’t agree on the hike or the beach? Put it to a vote and let the trip decide.' },
  { icon: <WifiOff />, title: 'Works without signal', text: 'Your plan, tickets and maps stay on your phone for the mountain pass with no bars.' },
]

const FAQ = [
  { id: 'when', label: 'When do I get in?', content: 'We’re letting people in a few hundred at a time this winter, in the order they joined. Inviting friends moves you up.' },
  { id: 'cost', label: 'Will it cost anything?', content: 'Planning trips is free. Later we’ll add a paid plan for big groups, and early members get their first year of it on us.' },
  { id: 'email', label: 'What will you do with my email?', content: 'Write to you once when it’s your turn, and that’s it. No newsletter, and you can leave the line from the link in that email.' },
]

type Joined = { place: number; email: string; already: boolean; code: string }

// Replace with your API call. The stub waits a moment; joined@example.com is already in line,
// offline@example.com fails as if the network dropped, and everyone else gets the next place.
async function api(route: '/waitlist', email: string): Promise<Joined> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  if (route !== '/waitlist' || email === 'offline@example.com') throw new Error('offline')
  if (email === 'joined@example.com') return { place: 318, email, already: true, code: 'k7p2' }
  return { place: IN_LINE + 1, email, already: false, code: 'r4m9' }
}

const number = (value: number) => new Intl.NumberFormat('en-US').format(value)
const emailProblem = (email: string) =>
  !email.trim() ? 'Enter your email address.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : 'Enter an email address like name@example.com.'

export default function WaitlistScreen() {
  const { glass } = useDiyaAppearance()
  const [kind, setKind] = useState<Kind>(KIND)
  const [joined, setJoined] = useState<Joined>()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const view = kind === 'maintenance' ? 'maintenance' : joined ? (joined.already ? 'already' : 'joined') : 'join'
  const shown = useRef(view)

  useEffect(() => {
    if (shown.current === view) return
    shown.current = view
    titleRef.current?.focus()
  }, [view])

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="waitlist" data-glass={glass || undefined}>
        <style>{css}</style>
        <header className="waitlist-header">
          <a className="waitlist-brand" href="/"><span className="waitlist-mark" aria-hidden="true">{PRODUCT[0]}</span>{PRODUCT}</a>
        </header>

        <main className="waitlist-main">
          <section className="waitlist-hero">
            {!glass && <Backdrop />}
            {view === 'join' && <Join titleRef={titleRef} onJoined={setJoined} />}
            {view === 'joined' && joined && <Placed titleRef={titleRef} joined={joined} />}
            {view === 'already' && joined && <Already titleRef={titleRef} joined={joined} onBack={() => setJoined(undefined)} />}
            {view === 'maintenance' && <Maintenance titleRef={titleRef} />}
          </section>

          {kind === 'waitlist' && (
            <>
              <section className="waitlist-section" aria-label={`What ${PRODUCT} does`}>
                <ul className="waitlist-points">
                  {POINTS.map((point) => (
                    <li key={point.title}>
                      <span className="waitlist-point-icon" aria-hidden="true">{point.icon}</span>
                      <h2 className="waitlist-h3">{point.title}</h2>
                      <p className="waitlist-muted">{point.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="waitlist-section waitlist-faq" aria-labelledby="waitlist-faq">
                <h2 id="waitlist-faq" className="waitlist-h2">Good questions</h2>
                <Accordion className="waitlist-accordion" items={FAQ.map((item) => ({ ...item, content: <p className="waitlist-muted">{item.content}</p> }))} />
              </section>
            </>
          )}
        </main>

        <footer className="waitlist-footer">
          <p>© 2026 {PRODUCT} · <TextLink href="/privacy" inline>Privacy</TextLink> · <TextLink href="/terms" inline>Terms</TextLink></p>
          {/* Demo only: remove this switcher and keep KIND at the top of the file. */}
          <div className="waitlist-demo" role="group" aria-label="Demo page">
            <span aria-hidden="true">Demo</span>
            {(['waitlist', 'maintenance'] as const).map((option) => (
              <Button key={option} size="small" variant={kind === option ? 'outline' : 'quiet'} aria-pressed={kind === option} onClick={() => setKind(option)}>
                {option === 'waitlist' ? 'Waitlist' : 'Maintenance'}
              </Button>
            ))}
          </div>
        </footer>
      </div>
    </LucideProvider>
  )
}

type ViewProps = { titleRef: Ref<HTMLHeadingElement> }

function Join({ titleRef, onJoined }: ViewProps & { onJoined: (joined: Joined) => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const field = useRef<HTMLInputElement>(null)

  async function join(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const problem = emailProblem(email)
    setError(problem)
    setFailed(false)
    if (problem) return field.current?.focus()
    setBusy(true)
    try {
      onJoined(await api('/waitlist', email.trim().toLowerCase()))
    } catch {
      setBusy(false)
      setFailed(true)
    }
  }

  return (
    <Intro titleRef={titleRef} tag={<Tag tone="brand" leading="dot">Early access</Tag>} title="Trips planned together, minus the group chat."
      lede={`${PRODUCT} turns everyone’s ideas into one day-by-day plan. We’re letting people in a few hundred at a time this winter.`}>
      <form className="waitlist-form" noValidate aria-label="Join the waitlist" onSubmit={join}>
        {failed && (
          <Alert tone="error" urgent className="waitlist-alert">
            We couldn’t add you just now. Check your connection and try again; your email is still here.
          </Alert>
        )}
        <div className="waitlist-row">
          <TextInput ref={field} label="Email address" hideLabel placeholder="you@example.com" type="email" autoComplete="email" size="large"
            className="waitlist-field" value={email} error={error} onValueChange={(value) => { setEmail(value); setError(undefined) }} />
          <Button type="submit" size="large" loading={busy}>Join the waitlist</Button>
        </div>
        <p className="waitlist-fine">One email when it’s your turn. Nothing else, promise.</p>
      </form>
      <div className="waitlist-proof">
        <span className="waitlist-faces" aria-hidden="true">
          {EARLY.map((person) => <Avatar key={person.name} name={person.name} size="small" />)}
        </span>
        <span>{number(IN_LINE)} people are already in line</span>
      </div>
    </Intro>
  )
}

function Placed({ titleRef, joined }: ViewProps & { joined: Joined }) {
  const [toast, setToast] = useState<string>()
  const link = INVITE_URL + joined.code

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setToast('Link copied. Paste it anywhere your friends will see it.')
    } catch {
      setToast('Couldn’t copy. Select the link and copy it yourself.')
    }
  }

  return (
    <Intro titleRef={titleRef} icon={<Check />} title={`You’re #${number(joined.place)}.`}
      lede={<>We’ll write to <strong className="waitlist-strong">{joined.email}</strong> when it’s your turn. Most people get in within a few weeks.</>}>
      <div className="waitlist-share">
        <p className="waitlist-share-title">Want to skip ahead? Every friend who joins with your link moves you up 25 places.</p>
        <div className="waitlist-row">
          <TextInput label="Your invite link" hideLabel readOnly size="large" className="waitlist-field" value={link} onFocus={(event) => event.currentTarget.select()} />
          <Button size="large" variant="outline" onClick={copy}><Copy /> Copy link</Button>
        </div>
      </div>
      {toast && <Toast tone="success" onDismiss={() => setToast(undefined)}>{toast}</Toast>}
    </Intro>
  )
}

function Already({ titleRef, joined, onBack }: ViewProps & { joined: Joined; onBack: () => void }) {
  return (
    <Intro titleRef={titleRef} icon={<CalendarRange />} title="You’re already in line."
      lede={<><strong className="waitlist-strong">{joined.email}</strong> is #{number(joined.place)}, so no need to join twice. We’ll write when it’s your turn.</>}>
      <Button variant="outline" size="large" onClick={onBack}><ArrowLeft /> Use a different email</Button>
    </Intro>
  )
}

function Maintenance({ titleRef }: ViewProps) {
  const at = (iso: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { timeZone: MAINTENANCE.timeZone, ...options }).format(new Date(iso))
  const time = { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } as const

  return (
    <Intro titleRef={titleRef} tag={<Tag tone="warning" leading="dot">Planned maintenance</Tag>} title="We’re tuning things up."
      lede={`${PRODUCT} is moving to faster servers. Your trips are safe, and there’s nothing you need to do.`}>
      <dl className="waitlist-facts">
        <div>
          <dt>Back by</dt>
          <dd className="waitlist-big">{at(MAINTENANCE.end, time)}</dd>
          <dd>{at(MAINTENANCE.end, { weekday: 'long', month: 'long', day: 'numeric' })}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd className="waitlist-big">{at(MAINTENANCE.start, time)}</dd>
          <dd>About {(Date.parse(MAINTENANCE.end) - Date.parse(MAINTENANCE.start)) / 3600000} hours of work</dd>
        </div>
      </dl>
      <List label="Maintenance progress" divided className="waitlist-steps"
        items={STEPS.map((step) => ({ id: step.id, label: step.label, trailing: <span className="waitlist-muted" data-state={step.status}>{step.status}</span> }))} />
      <Button size="large" href={MAINTENANCE.statusUrl}>See live status <ArrowRight /></Button>
    </Intro>
  )
}

function Intro(props: ViewProps & { tag?: ReactNode; icon?: ReactNode; title: string; lede: ReactNode; children: ReactNode }) {
  return (
    <div className="waitlist-intro">
      {props.tag}
      {props.icon && <span className="waitlist-icon" aria-hidden="true">{props.icon}</span>}
      <h1 ref={props.titleRef} tabIndex={-1} className="waitlist-h1">{props.title}</h1>
      <p className="waitlist-lede" role="status">{props.lede}</p>
      {props.children}
    </div>
  )
}

// A quiet route drawn behind the hero; it hides on Glass, where the provider paints a backdrop.
function Backdrop() {
  return (
    <svg className="waitlist-backdrop" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <path d="M-40 520 C 120 470, 200 590, 330 560 S 520 610, 700 585 S 980 500, 1240 560" />
      <circle cx="330" cy="560" r="6" />
      <circle cx="1010" cy="518" r="6" />
    </svg>
  )
}

const css = `
.waitlist { min-height: 100dvh; display: flex; flex-direction: column; color: var(--diya-color-text); }
.waitlist-header { position: relative; z-index: 1; display: flex; align-items: center; padding: var(--diya-space-5) clamp(16px, 4vw, 48px); }
.waitlist-brand { display: inline-flex; align-items: center; gap: 10px; color: inherit; font-size: var(--diya-text-large); font-weight: 650; letter-spacing: -0.02em; text-decoration: none; border-radius: 8px; }
.waitlist-brand:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: 4px; }
.waitlist-mark {
  display: grid; place-items: center; width: 28px; height: 28px;
  border-radius: calc(8px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-body); font-weight: 700;
}
.waitlist-main { flex: 1; display: flex; flex-direction: column; }
.waitlist-hero {
  position: relative; display: grid; place-items: center; min-height: min(680px, calc(100dvh - 80px));
  padding: var(--diya-space-7) var(--diya-space-5) var(--diya-space-8); overflow: hidden; isolation: isolate;
}
.waitlist:not([data-glass]) .waitlist-hero {
  background: radial-gradient(ellipse 70% 60% at 50% 40%, color-mix(in srgb, var(--diya-color-text) 4%, transparent), transparent 70%);
}
.waitlist-backdrop { position: absolute; inset: 0; z-index: -1; width: 100%; height: 100%; }
.waitlist-backdrop path { fill: none; stroke: var(--diya-color-line); stroke-width: 1.5; stroke-dasharray: 2 10; stroke-linecap: round; }
.waitlist-backdrop circle { fill: var(--diya-color-surface); stroke: var(--diya-color-line); stroke-width: 1.5; }
.waitlist-intro { display: grid; justify-items: center; gap: var(--diya-space-5); width: 100%; max-width: 720px; text-align: center; }
.waitlist-icon {
  display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%;
  background: var(--diya-color-raised); box-shadow: 0 0 0 1px var(--diya-color-line); color: var(--diya-color-text);
}
.waitlist-icon svg { width: 26px; height: 26px; }
.waitlist-h1 {
  max-width: 15ch; margin: 0;
  font-size: clamp(40px, 6.4vw, 80px); font-weight: 650; line-height: 1.02; letter-spacing: -0.045em; text-wrap: balance;
}
.waitlist-h1:focus { outline: none; }
.waitlist-h2 { margin: 0; font-size: clamp(30px, 3.8vw, 48px); font-weight: 650; line-height: 1.06; letter-spacing: -0.035em; }
.waitlist-h3 { margin: 0; font-size: var(--diya-text-title); font-weight: 600; letter-spacing: -0.015em; }
.waitlist-lede {
  max-width: 560px; margin: 0; color: var(--diya-color-muted);
  font-size: clamp(var(--diya-text-large), 1.5vw, var(--diya-text-title)); line-height: 1.45; letter-spacing: -0.01em; text-wrap: pretty;
}
.waitlist-strong { color: var(--diya-color-text); font-weight: 600; overflow-wrap: anywhere; }
.waitlist-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.waitlist-form, .waitlist-share { display: grid; gap: var(--diya-space-3); width: 100%; max-width: 520px; margin-top: var(--diya-space-3); }
.waitlist-alert { text-align: start; }
.waitlist-row { display: flex; gap: var(--diya-space-3); align-items: flex-start; text-align: start; }
.waitlist-field { flex: 1; min-width: 0; }
.waitlist-fine { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.waitlist-share-title { margin: 0; font-size: var(--diya-text-body); font-weight: 500; text-wrap: balance; }
.waitlist-proof { display: inline-flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: var(--diya-space-3); color: var(--diya-color-muted); font-size: var(--diya-text-body); font-variant-numeric: tabular-nums; }
.waitlist-faces { display: inline-flex; }
.waitlist-faces > * { margin-inline-start: -5px; border-radius: 50%; box-shadow: 0 0 0 2px var(--diya-color-surface); }
.waitlist-faces > :first-child { margin-inline-start: 0; }
.waitlist-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--diya-space-5); width: 100%; max-width: 520px; margin: var(--diya-space-3) 0 0; }
.waitlist-facts div { display: grid; gap: var(--diya-space-1); }
.waitlist-facts dt { color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-weight: 500; }
.waitlist-facts dd { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.waitlist-facts .waitlist-big { color: var(--diya-color-text); font-size: clamp(28px, 3vw, 36px); font-weight: 650; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.waitlist-steps { width: 100%; max-width: 520px; text-align: start; }
.waitlist-steps [data-state='Done'] { color: var(--diya-color-success); }
.waitlist-steps [data-state='In progress'] { color: var(--diya-color-text); font-weight: 600; }
.waitlist-section { width: 100%; max-width: 1080px; margin: 0 auto; padding: var(--diya-space-8) var(--diya-space-5); }
.waitlist-points { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--diya-space-7); margin: 0; padding: 0; list-style: none; }
.waitlist-points li { display: grid; align-content: start; gap: var(--diya-space-3); }
.waitlist-point-icon { display: inline-grid; place-items: center; width: 40px; height: 40px; margin-bottom: var(--diya-space-2); border-radius: 50%; box-shadow: 0 0 0 1px var(--diya-color-line); }
.waitlist-faq { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: var(--diya-space-7); align-items: start; border-top: 1px solid var(--diya-color-line); }
.waitlist-accordion { max-width: none; }
.waitlist-footer {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-3) var(--diya-space-5);
  padding: var(--diya-space-5) clamp(16px, 4vw, 48px); color: var(--diya-color-muted); font-size: var(--diya-text-caption);
}
.waitlist-footer p { margin: 0; }
.waitlist-demo { display: inline-flex; align-items: center; gap: var(--diya-space-1); }
.waitlist-demo > span { margin-inline-end: var(--diya-space-2); }
@media (max-width: 800px) {
  .waitlist-points, .waitlist-faq { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-6); }
}
@media (max-width: 520px) {
  .waitlist-hero { place-items: start center; min-height: 0; padding: var(--diya-space-6) var(--diya-space-4) var(--diya-space-7); }
  .waitlist-row { flex-direction: column; align-items: stretch; }
  .waitlist-section { padding: var(--diya-space-7) var(--diya-space-4); }
  .waitlist-facts { grid-template-columns: minmax(0, 1fr); }
}
`

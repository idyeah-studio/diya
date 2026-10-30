'use client'
// SaaS landing page: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/page.tsx. Vite: save as src/Landing.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type MouseEvent, type Ref } from 'react'
import { Accordion, Alert, Avatar, Button, SiteHeader, Tag, TextInput, TextLink, useDiyaAppearance } from '@idyeah/diya'
import { ArrowLeft, ArrowRight, CornerUpLeft, Inbox, LucideProvider, MailCheck, Moon, Paperclip, Search, Smile, Sparkles } from 'lucide-react'

// Your product and its navigation. Each nav link jumps to the heading with that id.
const PRODUCT = 'Transom'
const NAV = [
  { value: 'product', label: 'Product', href: '#product' },
  { value: 'customers', label: 'Customers', href: '#customers' },
  { value: 'pricing', label: 'Pricing', href: '#pricing' },
  { value: 'changelog', label: 'Changelog', href: '#changelog' },
]

// What the product shot shows. It's a picture made of DIYA parts, so it never takes clicks.
const CONVERSATIONS = [
  { name: 'Imani Brooks', subject: 'Charged twice for the annual plan', preview: 'Hi! I upgraded on Monday and see two charges…', time: '9:41', unread: true, current: true },
  { name: 'Tomás Herrera', subject: 'Export to CSV stops at 10,000 rows', preview: 'Is there a way to get the whole year out?', time: '9:12', unread: true },
  { name: 'Wen Zhao', subject: 'Adding a second workspace', preview: 'We’re opening an office in Lisbon and…', time: '8:57' },
  { name: 'Aaliyah Grant', subject: 'Thank you!', preview: 'That fixed it. You all are the best.', time: 'Yesterday' },
  { name: 'Rohan Mehta', subject: 'SSO with our identity provider', preview: 'Our IT team asked whether you support…', time: 'Yesterday' },
]

// Invented customers, drawn as monograms. Never real logos.
const CUSTOMERS = [
  { name: 'Fernhill', mark: 'circle' },
  { name: 'Oakmoor', mark: 'square' },
  { name: 'Bramble & Co.', mark: 'pair' },
  { name: 'Northgate', mark: 'diamond' },
  { name: 'Juniper Health', mark: 'arch' },
  { name: 'Cobalt Mile', mark: 'ring' },
]

const FEATURES = [
  { icon: <Inbox />, title: 'Every channel, one inbox', text: 'Email, chat and messages from inside your app land in one list, threaded by customer instead of by channel.' },
  { icon: <Sparkles />, title: 'Drafts that sound like you', text: `${PRODUCT} learns from your best replies and drafts the routine ones. You read, adjust a word or two, and send.` },
  { icon: <Moon />, title: 'Quiet hours, kept', text: 'Routing respects time zones and days off, so nobody gets paged at dinner over a password reset.' },
]

const QUOTE = {
  text: 'Mondays used to start with 300 unread. Now the routine ones are answered before standup, and we spend the morning on the people who actually need us.',
  name: 'Marisol Ortega',
  role: 'Head of Support, Juniper Health',
}
const RESULTS: { value: string; unit?: string; label: string }[] = [
  { value: '38%', label: 'fewer tickets need a person' },
  { value: '4 min', label: 'median first reply, down from 3 hours' },
  { value: '4.8', unit: 'of 5', label: 'customer rating after a reply' },
]

const PLANS = [
  { name: 'Free', price: '$0', per: 'for up to 3 people', text: 'Every channel and 500 drafts a month.' },
  { name: 'Team', price: '$19', per: 'per person, per month', text: 'Unlimited drafts, routing and quiet hours.' },
  { name: 'Business', price: '$39', per: 'per person, per month', text: 'Single sign-on, an audit log and a named person to call.' },
]

// Sample notes, dated a few weeks back from today so the section never goes stale. Your changelog brings real dates.
const UPDATES = [
  { daysAgo: 2, title: 'Replies in 40 languages', text: 'Write in English. Your customer reads it in Portuguese, and their answer comes back in English.' },
  { daysAgo: 16, title: 'Quiet hours for whole teams', text: 'Set a team’s hours once, and routing waits for the next person who’s actually awake.' },
  { daysAgo: 30, title: 'CSV export with no row limit', text: 'Export a whole year of conversations in one file. Sorry it took us this long, Tomás.' },
]

const FAQ = [
  { id: 'three', label: 'Who counts toward the three free seats?', content: 'Only people who answer customers. Teammates who read along or leave internal notes are free on every plan.' },
  { id: 'send', label: 'Will drafts ever send themselves?', content: 'Only if you say so. Drafts wait for a person by default. You can let routine topics, like password resets, send on their own, and turn that off anytime.' },
  { id: 'import', label: 'Can we bring our old conversations?', content: `Yes. Import from a mailbox or a CSV in a few minutes, and ${PRODUCT} learns your tone from replies you’ve already written.` },
  { id: 'data', label: 'Where does our data live?', content: 'In the US or the EU, your pick, encrypted at rest and in transit. We never train shared models on your conversations.' },
  { id: 'leave', label: 'What if it isn’t for us?', content: 'Export everything to CSV, then cancel from Settings. No call with sales, no exit survey with 14 questions.' },
]

const FOOTER = [
  { title: 'Product', links: [['Inbox', '/inbox'], ['Drafts', '/drafts'], ['Routing', '/routing'], ['Pricing', '/pricing']] },
  { title: 'Company', links: [['About', '/about'], ['Customers', '/customers'], ['Careers', '/careers'], ['Press', '/press']] },
  { title: 'Resources', links: [['Help center', '/help'], ['Changelog', '/changelog'], ['Status', '/status'], ['Privacy', '/privacy']] },
]

// Replace with your API call. The stub waits a moment; fail@example.com fails the way
// a busy server would, and every other address gets a sign-up link by email.
async function api(route: '/sign-up', body: { email: string }) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  if (route !== '/sign-up' || body.email === 'fail@example.com') throw new Error('unavailable')
}

const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

// Today's date in the reader's browser. The server can't know it, so it renders '' and the dates fill in once the page loads.
const subscribeNever = () => () => {}
function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
const useToday = () => useSyncExternalStore(subscribeNever, todayIso, () => '')
const daysBefore = (today: string, days: number) => new Date(Date.parse(`${today}T12:00:00Z`) - days * 86400000).toISOString().slice(0, 10)
const emailProblem = (email: string) =>
  !email.trim() ? 'Enter your work email.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : 'Enter an email address like name@example.com.'

export default function LandingScreen() {
  const { glass } = useDiyaAppearance()
  const today = useToday()
  const start = useRef<HTMLElement>(null)

  // Every "Start free" glides to the sign-up and puts the cursor in the email field.
  function startFree(event: MouseEvent) {
    const section = start.current
    if (!section) return
    event.preventDefault()
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    section.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' })
    ;(section.querySelector('input') ?? section.querySelector('h2'))?.focus({ preventScroll: true })
  }

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div id="top" className="landing" data-glass={glass || undefined}>
        <style>{css}</style>
        <SiteHeader
          className="landing-header"
          brand={<Brand />}
          brandLabel={`${PRODUCT} home`}
          brandHref="#top"
          items={NAV}
          utilities={
            <>
              <Button variant="quiet" href="/sign-in" className="landing-sign-in">Sign in</Button>
              <Button variant="outline" href="#start" onClick={startFree}>Start free</Button>
            </>
          }
        />

        <main>
          <section className="landing-hero" aria-labelledby="landing-title">
            <a className="landing-eyebrow" href="#changelog">
              New: replies in 40 languages <ArrowRight />
            </a>
            <h1 id="landing-title" className="landing-h1">Support, minus the noise.</h1>
            <p className="landing-lede">
              {PRODUCT} gathers email, chat and in-app messages into one calm inbox, drafts the routine replies, and
              leaves the human ones to you.
            </p>
            <div className="landing-actions">
              <Button size="large" href="#start" onClick={startFree}>Start free <ArrowRight /></Button>
              <Button size="large" variant="quiet" href="#product">See how it works</Button>
            </div>
            <p className="landing-fine">Free for teams of three. No card needed.</p>
          </section>

          <ProductShot />

          <section className="landing-logos" aria-labelledby="landing-logos">
            <h2 id="landing-logos" className="landing-logos-title">2,400 support teams answer with {PRODUCT}</h2>
            <ul className="landing-marks">
              {CUSTOMERS.map((customer) => (
                <li key={customer.name} className="landing-mark" data-mark={customer.mark}>
                  <i aria-hidden="true" />
                  {customer.name}
                </li>
              ))}
            </ul>
          </section>

          <section className="landing-section" aria-labelledby="product">
            <h2 id="product" className="landing-h2">Fewer tabs. Faster answers.</h2>
            <p className="landing-section-lede">Everything a support team needs, in the order they need it.</p>
            <ul className="landing-features">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="landing-feature">
                  <span className="landing-icon" aria-hidden="true">{feature.icon}</span>
                  <h3 className="landing-h3">{feature.title}</h3>
                  <p className="landing-muted">{feature.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="landing-section landing-customers" aria-labelledby="customers">
            <h2 id="customers" className="landing-kicker">Customers</h2>
            <figure className="landing-quote">
              <blockquote>
                <p>“{QUOTE.text}”</p>
              </blockquote>
              <figcaption>
                <Avatar name={QUOTE.name} />
                <span><b>{QUOTE.name}</b>{QUOTE.role}</span>
              </figcaption>
            </figure>
            <dl className="landing-results">
              {RESULTS.map((result) => (
                <div key={result.label}>
                  <dt>{result.label}</dt>
                  <dd>{result.value}{result.unit && <span> {result.unit}</span>}</dd>
                </div>
              ))}
            </dl>
            <p className="landing-fine">Juniper Health’s first 90 days, compared with the 90 days before.</p>
          </section>

          <section className="landing-section" aria-labelledby="pricing">
            <h2 id="pricing" className="landing-h2">Free for three. Fair after that.</h2>
            <p className="landing-section-lede">Start free and add seats as the team grows. Every plan gets every channel.</p>
            <ul className="landing-plans">
              {PLANS.map((plan) => (
                <li key={plan.name} className="landing-plan">
                  <h3 className="landing-h3">{plan.name}</h3>
                  <p className="landing-price">{plan.price} <span>{plan.per}</span></p>
                  <p className="landing-muted">{plan.text}</p>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="large" href="/pricing">Compare plans <ArrowRight /></Button>
          </section>

          <section className="landing-section landing-split" aria-labelledby="changelog">
            <div className="landing-split-head">
              <h2 id="changelog" className="landing-h2">Fresh from the team.</h2>
              <TextLink href="/changelog" trailingIcon={<ArrowRight />}>Read the changelog</TextLink>
            </div>
            <ol className="landing-updates">
              {UPDATES.map((update) => (
                <li key={update.title} className="landing-update">
                  <time dateTime={today ? daysBefore(today, update.daysAgo) : undefined}>{today && day.format(Date.parse(`${daysBefore(today, update.daysAgo)}T12:00:00Z`))}</time>
                  <div>
                    <h3 className="landing-h3">{update.title}</h3>
                    <p className="landing-muted">{update.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="landing-section landing-split" aria-labelledby="landing-faq">
            <div className="landing-split-head">
              <h2 id="landing-faq" className="landing-h2">Questions, answered.</h2>
              <p className="landing-muted">Something else? <TextLink href="/help" inline>Ask a person</TextLink>. They use {PRODUCT}, so it’s quick.</p>
            </div>
            <Accordion className="landing-accordion" items={FAQ.map((item) => ({ ...item, content: <p className="landing-muted">{item.content}</p> }))} />
          </section>

          <SignUp sectionRef={start} />
        </main>

        <footer className="landing-footer">
          <div className="landing-footer-brand">
            <Brand />
            <p className="landing-muted">The calm inbox for support teams.</p>
          </div>
          {FOOTER.map((column) => (
            <nav key={column.title} aria-label={column.title} className="landing-footer-column">
              <h2>{column.title}</h2>
              <ul>
                {column.links.map(([label, href]) => (
                  <li key={label}><a className="landing-footer-link" href={href}>{label}</a></li>
                ))}
              </ul>
            </nav>
          ))}
          <p className="landing-legal">©{today && ` ${today.slice(0, 4)}`} {PRODUCT}, Inc. Made for the people who answer.</p>
        </footer>
      </div>
    </LucideProvider>
  )
}

function SignUp({ sectionRef }: { sectionRef: Ref<HTMLElement> }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string>()
  const field = useRef<HTMLInputElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const shown = useRef(sent)

  useEffect(() => {
    if (shown.current === sent) return
    shown.current = sent
    ;(sent ? title.current : field.current)?.focus()
  }, [sent])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const problem = emailProblem(email)
    setError(problem)
    setFailed(false)
    if (problem) return field.current?.focus()
    setBusy(true)
    try {
      await api('/sign-up', { email: email.trim().toLowerCase() })
      setSent(email.trim())
    } catch {
      setFailed(true)
    }
    setBusy(false)
  }

  return (
    <section ref={sectionRef} className="landing-start" aria-labelledby="start">
      {sent ? (
        <>
          <span className="landing-done" aria-hidden="true"><MailCheck /></span>
          <h2 id="start" ref={title} tabIndex={-1} className="landing-h2">Check your inbox.</h2>
          <p className="landing-start-lede" role="status">
            We sent a link to <strong className="landing-strong">{sent}</strong>. It opens your new workspace and works for
            the next 24 hours.
          </p>
          <Button variant="outline" size="large" onClick={() => setSent(undefined)}><ArrowLeft /> Use a different email</Button>
        </>
      ) : (
        <>
          <h2 id="start" ref={title} tabIndex={-1} className="landing-h2">Bring your noisiest inbox.</h2>
          <p className="landing-start-lede">
            Connect email and chat in about five minutes. {PRODUCT} drafts replies to last week’s tickets, so you hear how
            it sounds as you before anyone else does.
          </p>
          <form className="landing-form" noValidate aria-label={`Start free with ${PRODUCT}`} onSubmit={submit}>
            {failed && (
              <Alert tone="error" urgent className="landing-alert">
                We couldn’t set up your workspace just now. Your email is still here, so try again in a moment.
              </Alert>
            )}
            <div className="landing-row">
              <TextInput ref={field} label="Work email" hideLabel placeholder="you@example.com" type="email" autoComplete="email"
                size="large" className="landing-field" value={email} error={error}
                onValueChange={(value) => { setEmail(value); setError(undefined) }} />
              <Button type="submit" size="large" loading={busy}>Start free</Button>
            </div>
            <p className="landing-fine">
              Free for teams of three. No card needed. Already on {PRODUCT}? <TextLink href="/sign-in" inline>Sign in</TextLink>
            </p>
          </form>
        </>
      )}
    </section>
  )
}

function ProductShot() {
  return (
    <figure className="landing-shot">
      <div className="landing-window" inert>
        <div className="landing-chrome">
          <span className="landing-dots"><i /><i /><i /></span>
          <span className="landing-find"><Search /> <span>Search conversations</span></span>
          <span className="landing-team"><Avatar name="Dara Okonkwo" size="small" status="online" /></span>
        </div>
        <div className="landing-panes">
          <div className="landing-list">
            <p className="landing-list-head">Inbox <span>12 open</span></p>
            {CONVERSATIONS.map((item) => (
              <div key={item.name} className="landing-convo" data-current={item.current || undefined}>
                <Avatar name={item.name} size="small" />
                <div className="landing-convo-text">
                  <p className="landing-convo-top"><b data-unread={item.unread || undefined}>{item.name}</b><span>{item.time}</span></p>
                  <p>{item.subject}</p>
                  <p className="landing-convo-preview">{item.preview}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="landing-thread">
            <div className="landing-thread-head">
              <p className="landing-thread-title">Charged twice for the annual plan</p>
              <span className="landing-tags">
                <Tag size="small">Billing</Tag>
                <Tag size="small" tone="warning" leading="dot">Waiting on you</Tag>
              </span>
            </div>
            <div className="landing-message">
              <Avatar name="Imani Brooks" size="small" />
              <div>
                <p className="landing-message-meta"><b>Imani Brooks</b> · imani@example.com · 9:41 AM</p>
                <p>Hi! I upgraded to the annual plan on Monday and I see two charges of $480 on my card. Could you refund one of them? Thanks so much.</p>
              </div>
            </div>
            <div className="landing-draft">
              <p className="landing-draft-label"><Sparkles /> Suggested reply · follows your refund policy</p>
              <p>Hi Imani, sorry about that. The second charge was a duplicate, and I’ve refunded it just now. You’ll see $480 back on your card in 3 to 5 business days.</p>
              <div className="landing-draft-actions">
                <Button size="small"><CornerUpLeft /> Send reply</Button>
                <Button size="small" variant="quiet">Edit</Button>
              </div>
            </div>
            <div className="landing-composer">
              <span>Reply to Imani, or type / for a saved reply</span>
              <span className="landing-composer-tools"><Paperclip /><Smile /></span>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="landing-sr">
        The {PRODUCT} inbox: five of twelve open conversations, with a duplicate-charge question open and a suggested
        reply that refunds it, ready to send.
      </figcaption>
    </figure>
  )
}

function Brand() {
  return (
    <span className="landing-brand">
      <span className="landing-logo" aria-hidden="true" />
      {PRODUCT}
    </span>
  )
}

const css = `
.landing { --landing-gutter: clamp(16px, 4vw, 48px); --landing-width: min(1180px, calc(100% - 2 * var(--landing-gutter))); min-height: 100dvh; color: var(--diya-color-text); }
@media (prefers-reduced-motion: no-preference) { html:has(.landing) { scroll-behavior: smooth; } }
.landing-header { position: sticky; top: 0; z-index: 2; }
.landing-brand { display: inline-flex; align-items: center; gap: 10px; font-size: var(--diya-text-large); font-weight: 650; letter-spacing: -0.02em; }
.landing-logo {
  width: 22px; height: 22px; border-radius: 7px 7px 3px 3px;
  background: linear-gradient(var(--diya-color-accent), var(--diya-color-accent)) center 7px / 100% 2px no-repeat, linear-gradient(var(--diya-color-accent), var(--diya-color-accent)) center / 2px 100% no-repeat;
  box-shadow: inset 0 0 0 2px var(--diya-color-accent);
}
.landing-sr { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.landing h2[id], .landing-h1 { scroll-margin-top: 104px; }
.landing-h2:focus { outline: none; }

.landing-h1 { max-width: 14ch; margin: 0; font-size: clamp(40px, 7.2vw, 96px); font-weight: 650; line-height: 0.98; letter-spacing: -0.03em; text-wrap: balance; }
.landing-h2 { max-width: 18ch; margin: 0; font-size: clamp(34px, 4.6vw, 60px); font-weight: 650; line-height: 1.03; letter-spacing: -0.042em; text-wrap: balance; }
.landing-h3 { margin: 0; font-size: var(--diya-text-title); font-weight: 600; line-height: 1.25; letter-spacing: -0.015em; text-wrap: balance; }
.landing-kicker { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; }
.landing-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-large); line-height: 1.5; text-wrap: pretty; }
.landing-strong { color: var(--diya-color-text); font-weight: 600; overflow-wrap: anywhere; }
.landing-fine { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); text-wrap: balance; }
.landing-lede,
.landing-section-lede,
.landing-start-lede { max-width: 600px; margin: 0; color: var(--diya-color-muted); font-size: clamp(var(--diya-text-large), 1.6vw, 22px); line-height: 1.45; letter-spacing: -0.01em; text-wrap: balance; }

.landing-hero { display: grid; justify-items: center; padding: clamp(56px, 10vh, 112px) var(--landing-gutter) clamp(48px, 7vw, 80px); text-align: center; }
.landing-eyebrow {
  display: inline-flex; align-items: center; gap: 6px; margin-bottom: var(--diya-space-6); padding: 6px 14px; border: 1px solid var(--diya-color-line);
  border-radius: 999px; color: inherit; font-size: var(--diya-text-caption); font-weight: 500; text-decoration: none;
}
.landing-eyebrow:hover { border-color: var(--diya-color-muted); }
.landing-eyebrow svg { width: 15px; height: 15px; color: var(--diya-color-muted); }
.landing-eyebrow:focus-visible,
.landing-footer-link:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: 3px; }
.landing-hero .landing-lede { margin-top: var(--diya-space-5); }
.landing-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--diya-space-3); margin-top: var(--diya-space-7); }
.landing-hero .landing-fine { margin-top: var(--diya-space-4); }

.landing-shot {
  position: relative; width: var(--landing-width); margin: 0 auto; padding: clamp(20px, 4.4vw, 64px) clamp(14px, 4.4vw, 64px) 0; overflow: hidden;
  border-radius: calc(28px * var(--diya-corner-scale, 1));
  background: radial-gradient(70% 60% at 50% 0%, color-mix(in srgb, var(--diya-color-surface) 55%, transparent), transparent 75%), linear-gradient(180deg, color-mix(in srgb, var(--diya-color-text) 14%, var(--diya-color-surface)), color-mix(in srgb, var(--diya-color-text) 30%, var(--diya-color-surface)));
}
.landing-shot::before,
.landing-shot::after {
  content: ''; position: absolute; bottom: -12%; width: 24%; height: 92%; border-radius: 999px 999px 0 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--diya-color-surface) 92%, transparent), color-mix(in srgb, var(--diya-color-surface) 30%, transparent));
}
.landing-shot::before { left: 3%; }
.landing-shot::after { right: 3%; height: 74%; }
.landing-window {
  position: relative; z-index: 1; overflow: hidden; border: 1px solid color-mix(in srgb, var(--diya-color-raised) 60%, var(--diya-color-line)); border-bottom: 0;
  border-radius: calc(16px * var(--diya-corner-scale, 1)) calc(16px * var(--diya-corner-scale, 1)) 0 0;
  background: color-mix(in srgb, var(--diya-color-raised) 74%, transparent); backdrop-filter: blur(28px) saturate(1.2);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--diya-color-raised) 80%, transparent), 0 30px 70px -30px color-mix(in srgb, black 45%, transparent);
  font-size: var(--diya-text-body); text-align: start; user-select: none;
}
@media (prefers-reduced-transparency: reduce) { .landing-window { background: var(--diya-color-raised); backdrop-filter: none; } }
.landing-window p { margin: 0; }
.landing-chrome { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--diya-space-4); padding: var(--diya-space-3) var(--diya-space-4); border-bottom: 1px solid var(--diya-color-line); }
.landing-dots { display: flex; gap: 7px; }
.landing-dots i { width: 11px; height: 11px; border-radius: 50%; background: color-mix(in srgb, var(--diya-color-text) 18%, transparent); }
.landing-find {
  display: inline-flex; align-items: center; gap: var(--diya-space-2); width: min(360px, 40vw); height: 32px; padding-inline: var(--diya-space-3);
  border-radius: var(--diya-radius-control); background: color-mix(in srgb, var(--diya-color-text) 6%, transparent); color: var(--diya-color-muted);
  font-size: var(--diya-text-caption); white-space: nowrap;
}
.landing-find svg { width: 15px; height: 15px; flex-shrink: 0; }
.landing-find { min-width: 0; }
.landing-find span { overflow: hidden; text-overflow: ellipsis; }
.landing-team { display: flex; justify-content: flex-end; }
.landing-panes { display: grid; grid-template-columns: 340px minmax(0, 1fr); min-height: 520px; }
.landing-list { padding: var(--diya-space-3); border-right: 1px solid var(--diya-color-line); }
.landing-list-head { display: flex; justify-content: space-between; align-items: baseline; padding: var(--diya-space-2) var(--diya-space-3) var(--diya-space-3); font-size: var(--diya-text-large); font-weight: 650; letter-spacing: -0.015em; }
.landing-list-head span { color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-weight: 400; letter-spacing: 0; }
.landing-convo { display: flex; gap: var(--diya-space-3); padding: var(--diya-space-3); border-radius: calc(10px * var(--diya-corner-scale, 1)); font-size: var(--diya-text-caption); }
.landing-convo[data-current] { background: var(--diya-color-selected); }
.landing-convo-text { display: grid; gap: 2px; flex: 1; min-width: 0; }
.landing-convo-text p { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.landing-convo-top { display: flex; justify-content: space-between; gap: var(--diya-space-2); font-size: var(--diya-text-body); }
.landing-convo-top b { min-width: 0; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
.landing-convo-top span { flex-shrink: 0; }
.landing-convo-top b[data-unread] { font-weight: 650; }
.landing-convo-top b[data-unread]::after { content: ''; display: inline-block; width: 7px; height: 7px; margin-left: 8px; vertical-align: 2px; border-radius: 50%; background: var(--diya-color-accent); }
.landing-convo-top span,
.landing-convo-preview { color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.landing-thread { display: grid; grid-template-rows: auto auto auto 1fr; gap: var(--diya-space-5); padding: var(--diya-space-5) var(--diya-space-6); }
.landing-thread-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-3); padding-bottom: var(--diya-space-4); border-bottom: 1px solid var(--diya-color-line); }
.landing-thread-title { font-size: var(--diya-text-title); font-weight: 600; letter-spacing: -0.015em; }
.landing-tags { display: flex; gap: var(--diya-space-2); }
.landing-message { display: flex; gap: var(--diya-space-3); max-width: 620px; line-height: 1.55; }
.landing-message-meta { margin-bottom: var(--diya-space-1) !important; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.landing-message-meta b { color: var(--diya-color-text); font-weight: 600; }
.landing-draft {
  display: grid; gap: var(--diya-space-3); max-width: 620px; margin-left: 44px; padding: var(--diya-space-4) var(--diya-space-5);
  border: 1px solid var(--diya-color-line); border-radius: calc(14px * var(--diya-corner-scale, 1));
  background: color-mix(in srgb, var(--diya-color-surface) 70%, transparent); line-height: 1.55;
}
.landing-draft-label { display: flex; align-items: center; gap: var(--diya-space-2); color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-weight: 500; }
.landing-draft-label svg { width: 16px; height: 16px; }
.landing-draft-actions { display: flex; gap: var(--diya-space-2); }
.landing-composer {
  align-self: end; display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-3); min-height: 52px; padding: 0 var(--diya-space-4);
  border: 1px solid var(--diya-color-line); border-radius: calc(14px * var(--diya-corner-scale, 1)); color: var(--diya-color-muted); font-size: var(--diya-text-caption);
}
.landing-composer-tools { display: flex; gap: var(--diya-space-3); }

.landing-logos { display: grid; justify-items: center; gap: var(--diya-space-6); padding: clamp(56px, 8vw, 96px) var(--landing-gutter) 0; text-align: center; }
.landing-logos-title { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); font-weight: 500; text-wrap: balance; }
.landing-marks { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--diya-space-6) clamp(32px, 5vw, 64px); margin: 0; padding: 0; list-style: none; }
.landing-mark { display: inline-flex; align-items: center; gap: 9px; color: var(--diya-color-muted); font-size: var(--diya-text-title); font-weight: 600; letter-spacing: -0.02em; white-space: nowrap; }
.landing-mark i { width: 20px; height: 20px; background: currentColor; }
.landing-mark[data-mark='circle'] i { border-radius: 50%; }
.landing-mark[data-mark='square'] { font-size: var(--diya-text-large); font-stretch: 112%; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; }
.landing-mark[data-mark='square'] i { border-radius: 5px; }
.landing-mark[data-mark='pair'] { font-style: italic; font-weight: 450; letter-spacing: -0.01em; }
.landing-mark[data-mark='pair'] i { width: 26px; border-radius: 0; background: radial-gradient(circle at 7px 50%, currentColor 6.5px, transparent 7px), radial-gradient(circle at 19px 50%, currentColor 6.5px, transparent 7px); }
.landing-mark[data-mark='diamond'] { font-stretch: 85%; font-weight: 700; letter-spacing: 0.01em; }
.landing-mark[data-mark='diamond'] i { width: 15px; height: 15px; transform: rotate(45deg); border-radius: 2px; }
.landing-mark[data-mark='arch'] { font-weight: 500; letter-spacing: -0.03em; }
.landing-mark[data-mark='arch'] i { border-radius: 999px 999px 0 0; }
.landing-mark[data-mark='ring'] { font-size: var(--diya-text-body); font-stretch: 120%; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; }
.landing-mark[data-mark='ring'] i { border-radius: 50%; background: none; box-shadow: inset 0 0 0 4px currentColor; }

.landing-section { display: grid; justify-items: start; width: var(--landing-width); margin: 0 auto; padding: clamp(72px, 11vw, 144px) 0 0; }
.landing-section > .landing-section-lede { margin-top: var(--diya-space-4); }
.landing-features,
.landing-plans { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--diya-space-7); width: 100%; margin: var(--diya-space-8) 0 0; padding: 0; list-style: none; }
.landing-feature { display: grid; align-content: start; gap: var(--diya-space-3); }
.landing-icon {
  display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: var(--diya-space-2); border: 1px solid var(--diya-color-line);
  border-radius: calc(12px * var(--diya-corner-scale, 1)); background: var(--diya-color-raised);
}
.landing-icon svg { width: 22px; height: 22px; }

.landing-customers { justify-items: center; text-align: center; }
.landing-quote { display: grid; justify-items: center; gap: var(--diya-space-6); max-width: 920px; margin: var(--diya-space-5) 0 0; }
.landing-quote blockquote { margin: 0; }
.landing-quote blockquote p { margin: 0; font-size: clamp(26px, 3.3vw, 42px); font-weight: 550; line-height: 1.18; letter-spacing: -0.03em; text-wrap: balance; }
.landing-quote figcaption { display: inline-flex; align-items: center; gap: var(--diya-space-3); text-align: start; }
.landing-quote figcaption span { display: grid; color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.landing-quote figcaption b { color: var(--diya-color-text); font-weight: 600; }
.landing-results { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--diya-space-6); width: 100%; max-width: 920px; margin: var(--diya-space-8) 0 0; padding-top: var(--diya-space-7); border-top: 1px solid var(--diya-color-line); text-align: start; }
.landing-results div { display: flex; flex-direction: column-reverse; justify-content: flex-end; gap: var(--diya-space-2); }
.landing-results dt { max-width: 22ch; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: 1.4; }
.landing-results dd { margin: 0; font-size: clamp(44px, 5vw, 64px); font-weight: 650; line-height: 1; letter-spacing: -0.045em; font-variant-numeric: tabular-nums; }
.landing-results dd span { color: var(--diya-color-muted); font-size: var(--diya-text-title); font-weight: 500; letter-spacing: -0.01em; }
.landing-customers > .landing-fine { justify-self: start; margin-top: var(--diya-space-5); max-width: none; }
.landing-results + .landing-fine { justify-self: center; width: 100%; max-width: 920px; text-align: start; }

.landing-plan { display: grid; align-content: start; gap: var(--diya-space-3); padding-top: var(--diya-space-5); border-top: 1px solid var(--diya-color-line); }
.landing-price { margin: var(--diya-space-2) 0 var(--diya-space-1); font-size: clamp(36px, 3.6vw, 48px); font-weight: 650; line-height: 1; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.landing-price span { color: var(--diya-color-muted); font-size: var(--diya-text-body); font-weight: 400; letter-spacing: 0; }
.landing-plans + * { margin-top: var(--diya-space-7); }

.landing-split { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: var(--diya-space-7); align-items: start; }
.landing-split-head { display: grid; justify-items: start; gap: var(--diya-space-5); }
.landing-split-head .landing-muted { max-width: 34ch; }
.landing-updates { display: grid; margin: 0; padding: 0; list-style: none; }
.landing-update { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: var(--diya-space-5); padding: var(--diya-space-5) 0; border-top: 1px solid var(--diya-color-line); }
.landing-update:first-child { padding-top: 0; border-top: 0; }
.landing-update time { padding-top: 3px; color: var(--diya-color-muted); font-size: var(--diya-text-body); font-variant-numeric: tabular-nums; }
.landing-update .landing-muted { margin-top: var(--diya-space-2); }
.landing-accordion { max-width: none; }

.landing-start {
  display: grid; justify-items: center; gap: var(--diya-space-5); margin-top: clamp(40px, 6vw, 80px); padding: clamp(72px, 10vw, 128px) var(--landing-gutter);
  text-align: center; background: radial-gradient(ellipse 60% 70% at 50% 100%, color-mix(in srgb, var(--diya-color-text) 6%, transparent), transparent 70%);
}
.landing-start .landing-h2 { max-width: 16ch; }
.landing-done { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background: var(--diya-color-raised); box-shadow: 0 0 0 1px var(--diya-color-line); }
.landing-done svg { width: 26px; height: 26px; }
.landing-form { display: grid; gap: var(--diya-space-3); width: 100%; max-width: 520px; margin-top: var(--diya-space-3); }
.landing-alert { text-align: start; }
.landing-row { display: flex; align-items: flex-start; gap: var(--diya-space-3); text-align: start; }
.landing-field { flex: 1; min-width: 0; }

.landing-footer {
  display: grid; grid-template-columns: 2fr repeat(3, 1fr); gap: var(--diya-space-6); width: var(--landing-width); margin: 0 auto;
  padding: var(--diya-space-7) 0 var(--diya-space-6); border-top: 1px solid var(--diya-color-line); font-size: var(--diya-text-body);
}
.landing-footer-brand { display: grid; align-content: start; gap: var(--diya-space-3); }
.landing-footer-brand .landing-muted { font-size: var(--diya-text-body); }
.landing-footer-column h2 { margin: 0 0 var(--diya-space-3); font-size: var(--diya-text-body); font-weight: 600; }
.landing-footer-column ul { display: grid; gap: var(--diya-space-2); margin: 0; padding: 0; list-style: none; }
.landing-footer-link { border-radius: 4px; color: var(--diya-color-muted); text-decoration: none; }
.landing-footer-link:hover { color: var(--diya-color-text); }
.landing-legal { grid-column: 1 / -1; margin: 0; padding-top: var(--diya-space-5); border-top: 1px solid var(--diya-color-line); color: var(--diya-color-muted); font-size: var(--diya-text-caption); }

@media (max-width: 900px) {
  .landing-panes { grid-template-columns: minmax(0, 1fr); min-height: 420px; }
  .landing-thread { display: none; }
  .landing-list { border-right: 0; }
  .landing-features, .landing-plans, .landing-split { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-6); }
  .landing-features, .landing-plans { margin-top: var(--diya-space-7); }
  .landing-footer { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .landing-footer-brand { grid-column: 1 / -1; }
}
@media (max-width: 1180px) {
  .landing-marks { display: grid; grid-template-columns: repeat(3, auto); justify-content: center; justify-items: start; }
}
@media (max-width: 640px) {
  .landing-results { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-5); }
  .landing-chrome { grid-template-columns: auto 1fr; }
  .landing-find { width: auto; }
  .landing-team { display: none; }
  .landing-marks { grid-template-columns: repeat(2, auto); gap: var(--diya-space-5) var(--diya-space-6); }
}
@media (max-width: 520px) {
  .landing-update { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-2); }
  .landing-row { flex-direction: column; align-items: stretch; }
  .landing-actions { flex-direction: column; align-items: stretch; width: 100%; max-width: 320px; }
  .landing-footer { gap: var(--diya-space-6) var(--diya-space-4); }
}
@media (max-width: 400px) {
  .landing-mark, .landing-mark[data-mark='square'] { gap: 7px; font-size: var(--diya-text-body); }
  .landing-mark[data-mark='ring'] { font-size: var(--diya-text-caption); }
  .landing-mark i { width: 16px; height: 16px; }
  .landing-marks { column-gap: var(--diya-space-5); }
}
@media (max-width: 370px) {
  .landing-sign-in { display: none; }
  .landing-footer { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`

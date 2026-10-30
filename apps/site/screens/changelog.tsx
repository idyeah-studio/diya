'use client'
// Changelog & roadmap: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/changelog/page.tsx. Vite: save as src/Changelog.tsx and render it inside your DiyaProvider.
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import { Alert, Button, Dialog, Prose, SiteHeader, Tabs, Tag, TextArea, TextInput, Toast, type Tone } from '@idyeah/diya'
import { ChevronUp, LucideProvider } from 'lucide-react'

// Your product, its release notes (newest first) and the public roadmap.
// The sample dates count back from the latest Thursday, so the demo never goes stale: `weeks` is how many
// Thursdays before it each note shipped. Your CMS or API brings real dates.
const PRODUCT = 'Quayside'

type Kind = 'new' | 'improved' | 'fixed'
type Entry = { id: string; weeks: number; kind: Kind; title: string; figure?: 'views' | 'board'; body: ReactNode }

const KINDS: Record<Kind, { label: string; tone: Tone; plural: string }> = {
  new: { label: 'New', tone: 'brand', plural: 'new features' },
  improved: { label: 'Improved', tone: 'info', plural: 'improvements' },
  fixed: { label: 'Fixed', tone: 'success', plural: 'fixes' },
}

const ENTRIES: Entry[] = [
  {
    id: 'saved-views', weeks: 0, kind: 'new', title: 'Saved views for every list', figure: 'views',
    body: (
      <>
        <p>Filter, sort and group a list the way you like it, then save it as a view. Views sit above the list, so getting back to “my bugs this sprint” is one click.</p>
        <ul>
          <li>Share a view with your team, or keep it to yourself.</li>
          <li>Pin up to eight views per project.</li>
          <li>Views update live as issues change.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'safari-dates', weeks: 0, kind: 'fixed', title: 'Due dates stay put in Safari',
    body: <p>If your computer’s time zone was behind UTC, Safari sometimes showed a due date one day early. Dates now read the same in every browser. Thanks to Haruto Sato for the clear report.</p>,
  },
  {
    id: 'faster-search', weeks: 1, kind: 'improved', title: 'Search is about three times faster',
    body: <p>We rebuilt search on a new index. Results for a workspace with 50,000 issues now arrive in around 120 ms, down from 380 ms, and typos like <code>recuring</code> still find what you meant.</p>,
  },
  {
    id: 'roadmap-boards', weeks: 2, kind: 'new', title: 'Roadmap boards', figure: 'board',
    body: (
      <>
        <p>Lay out the next quarter as columns of projects, then drag them between Planned, In progress and Done. Each card shows its progress, so stand-ups get shorter.</p>
        <p>Boards are on every plan. Open one from <strong>Projects → Roadmap</strong>.</p>
      </>
    ),
  },
  {
    id: 'shortcuts', weeks: 3, kind: 'improved', title: 'Keyboard shortcuts, everywhere',
    body: <p>Press <code>C</code> to create an issue from any page, <code>/</code> to search, and <code>?</code> to see the rest. Shortcuts now work inside dialogs and the side panel too.</p>,
  },
  {
    id: 'email-threads', weeks: 4, kind: 'fixed', title: 'Email replies thread correctly again',
    body: <p>Replies sent from some mail apps started new issues instead of joining the conversation. They now land in the right thread, and we merged the 214 stray issues this created.</p>,
  },
  {
    id: 'recurring', weeks: 7, kind: 'new', title: 'Recurring issues',
    body: <p>Set an issue to repeat every day, week or month, like “Rotate the on-call schedule.” A fresh copy appears when the last one closes, with the same assignee and labels.</p>,
  },
  {
    id: 'attachments', weeks: 9, kind: 'fixed', title: 'Large attachments upload reliably',
    body: <p>Files over 25 MB could stall at 99% on slow connections. Uploads now resume where they left off, up to the 250 MB limit.</p>,
  },
]

// Older notes load on request, the way a paged API would hand them over.
const EARLIER: Entry[] = [
  {
    id: 'dark-mode', weeks: 11, kind: 'improved', title: 'A calmer dark mode',
    body: <p>Softer contrast, true neutral grays and fewer borders. If you set your system to dark, Quayside follows it automatically.</p>,
  },
  {
    id: 'launch', weeks: 15, kind: 'new', title: 'Hello, Quayside',
    body: <p>Quayside is open to everyone: issues, projects and cycles for teams of two to two hundred. Thank you to the 1,800 people who tested it with us.</p>,
  },
]

type Idea = { id: string; title: string; text: string; votes: number; shipped?: number }
const ROADMAP: { id: string; title: string; ideas: Idea[] }[] = [
  {
    id: 'planned', title: 'Planned', ideas: [
      { id: 'time', title: 'Time tracking', text: 'Log time on an issue and see totals per project and person.', votes: 214 },
      { id: 'github', title: 'Two-way GitHub sync', text: 'Close the issue when the pull request merges, and the other way around.', votes: 188 },
      { id: 'fields', title: 'Custom fields', text: 'Add your own fields, like customer or effort, and filter by them.', votes: 161 },
    ],
  },
  {
    id: 'progress', title: 'In progress', ideas: [
      { id: 'android', title: 'Android app', text: 'Everything in the iPhone app, on Android. In testing with 300 people now.', votes: 342 },
      { id: 'guests', title: 'Guest access for clients', text: 'Invite a client to one project without giving them the whole workspace.', votes: 127 },
    ],
  },
  {
    id: 'shipped', title: 'Shipped', ideas: [
      { id: 'views', title: 'Saved views', text: 'Save filters, sorting and grouping as a view you can share.', votes: 296, shipped: 0 },
      { id: 'boards', title: 'Roadmap boards', text: 'Plan the quarter as columns of projects.', votes: 251, shipped: 2 },
      { id: 'recurring', title: 'Recurring issues', text: 'Issues that come back on a schedule.', votes: 203, shipped: 7 },
    ],
  },
]

// Replace with your API calls. Each stub waits a moment; the email offline@example.com fails as if the network dropped.
async function api(route: '/subscribe' | '/changelog/earlier' | '/ideas', body: Record<string, string> = {}) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return !(route === '/subscribe' && body.email === 'offline@example.com')
}

const day = (iso: string, options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(new Date(`${iso}T12:00:00Z`))
const monthOf = (iso: string) => iso.slice(0, 7)
const weeksBefore = (iso: string, weeks: number) => new Date(Date.parse(`${iso}T12:00:00Z`) - weeks * 7 * 86400000).toISOString().slice(0, 10)

// Today's date in the reader's browser. The server can't know it, so it renders '' and the notes fill in once the page loads.
const subscribeNever = () => () => {}
function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
const useToday = () => useSyncExternalStore(subscribeNever, todayIso, () => '')
// The most recent Thursday, today included: release day.
const lastThursday = (today: string) => {
  const back = (new Date(`${today}T12:00:00Z`).getUTCDay() + 3) % 7
  return new Date(Date.parse(`${today}T12:00:00Z`) - back * 86400000).toISOString().slice(0, 10)
}
const number = (value: number) => new Intl.NumberFormat('en-US').format(value)
const emailProblem = (email: string) =>
  !email.trim() ? 'Enter your email address.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : 'Enter an email address like name@example.com.'

export default function ChangelogScreen() {
  const [tab, setTab] = useState('changelog')
  const today = useToday()
  const latest = today && lastThursday(today)

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="changelog">
        <style>{css}</style>
        <SiteHeader
          brand={<span className="changelog-brand"><span className="changelog-mark" aria-hidden="true">{PRODUCT[0]}</span>{PRODUCT}</span>}
          brandHref="/"
          brandLabel={`${PRODUCT} home`}
          items={[
            { value: 'product', label: 'Product', href: '/product' },
            { value: 'pricing', label: 'Pricing', href: '/pricing' },
            { value: 'changelog', label: 'Changelog', href: '/changelog' },
            { value: 'docs', label: 'Docs', href: '/docs' },
          ]}
          value="changelog"
          utilities={<Button variant="quiet" href="/sign-in">Sign in</Button>}
        />
        <main className="changelog-main">
          <header className="changelog-hero">
            <div className="changelog-hero-copy">
              <h1 className="changelog-h1">What’s new in {PRODUCT}</h1>
              <p className="changelog-lede">New features, improvements and fixes. We ship on Thursdays, and write down every change.</p>
            </div>
            <Subscribe latest={latest} />
          </header>
          <Tabs
            className="changelog-tabs"
            label="Changelog and roadmap"
            value={tab}
            onValueChange={setTab}
            items={[
              { value: 'changelog', label: 'Changelog', content: latest ? <Notes latest={latest} /> : <p className="changelog-muted changelog-wait">Loading the latest notes…</p> },
              { value: 'roadmap', label: 'Roadmap', content: <Roadmap latest={latest} /> },
            ]}
          />
        </main>
        <footer className="changelog-footer">©{today && ` ${today.slice(0, 4)}`} {PRODUCT}. Written by the people who build it.</footer>
      </div>
    </LucideProvider>
  )
}

function Subscribe({ latest }: { latest: string }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle')

  async function subscribe(event: FormEvent) {
    event.preventDefault()
    const problem = emailProblem(email)
    setError(problem)
    if (problem || state === 'busy') return
    setState('busy')
    setState((await api('/subscribe', { email: email.trim() })) ? 'done' : 'failed')
  }

  return (
    <form className="changelog-subscribe" noValidate aria-labelledby="changelog-subscribe" onSubmit={subscribe}>
      <h2 id="changelog-subscribe" className="changelog-label">Subscribe to updates</h2>
      <div role="status" className="changelog-subscribe-status">
        {state === 'done' && <p className="changelog-muted">You’re subscribed. The next update lands {latest ? day(weeksBefore(latest, -1), { weekday: 'long', month: 'long', day: 'numeric' }) : 'on Thursday'}.</p>}
      </div>
      {state === 'failed' && <Alert tone="error" urgent>That didn’t go through. Check your connection and try again.</Alert>}
      {state !== 'done' && (
        <div className="changelog-row">
          <TextInput label="Email address" hideLabel placeholder="you@example.com" type="email" autoComplete="email" className="changelog-field"
            value={email} error={error} onValueChange={(value) => { setEmail(value); setError(undefined) }} />
          <Button type="submit" loading={state === 'busy'}>Subscribe</Button>
        </div>
      )}
    </form>
  )
}

function Notes({ latest }: { latest: string }) {
  const [filter, setFilter] = useState<Kind | 'all'>('all')
  const [earlier, setEarlier] = useState<'hidden' | 'loading' | 'shown'>('hidden')
  const all = (earlier === 'shown' ? [...ENTRIES, ...EARLIER] : ENTRIES).map((entry) => ({ ...entry, date: weeksBefore(latest, entry.weeks) }))
  const shown = all.filter((entry) => filter === 'all' || entry.kind === filter)
  const months = [...new Set(shown.map((entry) => monthOf(entry.date)))]
  const launched = weeksBefore(latest, EARLIER.at(-1)!.weeks)

  async function loadEarlier() {
    setEarlier('loading')
    await api('/changelog/earlier')
    setEarlier('shown')
  }

  return (
    <div className="changelog-notes">
      <aside className="changelog-index" aria-label="Months">
        <nav aria-label="Jump to a month">
          <ul>
            {months.map((month) => (
              <li key={month}><a href={`#changelog-${month}`}>{day(`${month}-01`, { month: 'long', year: 'numeric' })}</a></li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="changelog-entries">
        <div className="changelog-filters" role="group" aria-label="Show">
          {(['all', 'new', 'improved', 'fixed'] as const).map((kind) => (
            <Button key={kind} size="small" variant={filter === kind ? 'outline' : 'quiet'} aria-pressed={filter === kind} onClick={() => setFilter(kind)}>
              {kind === 'all' ? 'All' : KINDS[kind].label}
            </Button>
          ))}
          <span className="changelog-sr" role="status">
            {filter === 'all' ? `Showing all ${shown.length} updates` : `Showing ${shown.length} ${KINDS[filter].plural}`}
          </span>
        </div>
        {months.map((month) => (
          <section key={month} id={`changelog-${month}`} className="changelog-month" aria-labelledby={`changelog-${month}-title`}>
            <h2 id={`changelog-${month}-title`} className="changelog-h2">{day(`${month}-01`, { month: 'long', year: 'numeric' })}</h2>
            {shown.filter((entry) => monthOf(entry.date) === month).map((entry) => (
              <article key={entry.id} className="changelog-entry" aria-labelledby={`changelog-${entry.id}`}>
                <div className="changelog-meta">
                  <time dateTime={entry.date}>{day(entry.date)}</time>
                  <Tag tone={KINDS[entry.kind].tone} size="small">{KINDS[entry.kind].label}</Tag>
                </div>
                <h3 id={`changelog-${entry.id}`} className="changelog-h3">{entry.title}</h3>
                {entry.figure && <Figure kind={entry.figure} />}
                <Prose>{entry.body}</Prose>
              </article>
            ))}
          </section>
        ))}
        <div className="changelog-more">
          {earlier === 'shown' ? (
            <p className="changelog-muted">That’s everything since we launched in {day(launched, { month: 'long', year: 'numeric' })}.</p>
          ) : (
            <Button variant="outline" loading={earlier === 'loading'} onClick={loadEarlier}>Show earlier updates</Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Roadmap({ latest }: { latest: string }) {
  const [votes, setVotes] = useState<string[]>([])
  const [ideaOpen, setIdeaOpen] = useState(false)
  const [idea, setIdea] = useState('')
  const [ideaError, setIdeaError] = useState<string>()
  const [toast, setToast] = useState<string>()
  const toggle = (id: string) => setVotes(votes.includes(id) ? votes.filter((vote) => vote !== id) : [...votes, id])

  async function sendIdea() {
    if (!idea.trim()) {
      setIdeaError('Tell us what you’d like to see.')
      return false
    }
    await api('/ideas', { idea })
    setIdea('')
    setToast('Thanks. Your idea went straight to the team.')
  }

  return (
    <div className="changelog-roadmap">
      <div className="changelog-columns">
        {ROADMAP.map((column) => (
          <section key={column.id} className="changelog-column" aria-labelledby={`changelog-col-${column.id}`}>
            <h2 id={`changelog-col-${column.id}`} className="changelog-column-title">
              {column.title} <span className="changelog-muted">{column.ideas.length}</span>
            </h2>
            <ul className="changelog-ideas">
              {column.ideas.map((item) => {
                const voted = votes.includes(item.id)
                const count = item.votes + (voted ? 1 : 0)
                return (
                  <li key={item.id} className="changelog-idea">
                    <div className="changelog-idea-text">
                      <h3 className="changelog-idea-title">{item.title}</h3>
                      <p className="changelog-muted">{item.text}</p>
                      {item.shipped !== undefined && (
                        <p className="changelog-shipped">{latest && `Shipped ${day(weeksBefore(latest, item.shipped), { month: 'short', day: 'numeric' })} · `}{number(item.votes)} votes</p>
                      )}
                    </div>
                    {item.shipped === undefined && (
                      <Button size="small" variant={voted ? 'solid' : 'outline'} shape="rounded" className="changelog-vote" aria-pressed={voted}
                        aria-label={`Vote for ${item.title}, ${number(count)} votes`} onClick={() => toggle(item.id)}>
                        <ChevronUp /> {number(count)}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      <p className="changelog-suggest">
        Missing something? <Button variant="outline" onClick={() => setIdeaOpen(true)}>Suggest an idea</Button>
      </p>
      <Dialog open={ideaOpen} onOpenChange={setIdeaOpen} title="Suggest an idea" description="What would make your week easier? The team reads every one."
        confirmLabel="Send idea" onConfirm={sendIdea}>
        <TextArea label="Your idea" rows={4} value={idea} error={ideaError} onValueChange={(value) => { setIdea(value); setIdeaError(undefined) }} />
      </Dialog>
      {toast && <Toast tone="success" onDismiss={() => setToast(undefined)}>{toast}</Toast>}
    </div>
  )
}

// Pictures drawn with CSS, so the file stands alone. Swap in your own screenshots with an <img> and real alt text.
const FIG_ROWS = [
  { id: 'QS-412', title: 'Fix Safari due dates', who: 'HS', done: true },
  { id: 'QS-405', title: 'Email replies start new issues', who: 'MR', done: false },
  { id: 'QS-398', title: 'Uploads stall at 99%', who: 'AK', done: false },
]
const FIG_BOARD = [
  { title: 'Planned', cards: [['Time tracking', 0, 6], ['Custom fields', 0, 4]] },
  { title: 'In progress', cards: [['Android app', 7, 12], ['Guest access', 3, 8]] },
  { title: 'Done', cards: [['Saved views', 9, 9]] },
] as const

function Figure({ kind }: { kind: 'views' | 'board' }) {
  if (kind === 'views') {
    return (
      <div className="changelog-figure" role="img" aria-label="A list of bugs under three saved views: My bugs, This sprint and Needs review. My bugs is open, showing three issues.">
        <div className="changelog-fig-views">
          <span data-on>My bugs</span><span>This sprint</span><span>Needs review</span>
        </div>
        <div className="changelog-fig-list">
          {FIG_ROWS.map((row) => (
            <div key={row.id} className="changelog-fig-row">
              <span className="changelog-fig-dot" data-done={row.done || undefined} />
              <span className="changelog-fig-id">{row.id}</span>
              <span className="changelog-fig-title">{row.title}</span>
              <span className="changelog-fig-who">{row.who}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="changelog-figure changelog-fig-board" role="img" aria-label="A roadmap board with three columns: Planned holds Time tracking and Custom fields, In progress holds Android app and Guest access, and Done holds Saved views.">
      {FIG_BOARD.map((column) => (
        <div key={column.title} className="changelog-fig-col">
          <span className="changelog-fig-col-title">{column.title}</span>
          {column.cards.map(([name, done, total]) => (
            <span key={name} className="changelog-fig-card">
              <span className="changelog-fig-title">{name}</span>
              <span className="changelog-fig-meter"><span style={{ width: `${(done / total) * 100}%` }} /></span>
              <span className="changelog-fig-id">{done} of {total} done</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

const css = `
.changelog { min-height: 100dvh; display: flex; flex-direction: column; color: var(--diya-color-text); }
.changelog-brand { display: inline-flex; align-items: center; gap: 10px; font-size: var(--diya-text-large); font-weight: 650; letter-spacing: -0.02em; }
.changelog-mark {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: calc(8px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-body); font-weight: 700;
}
.changelog-main { flex: 1; width: 100%; max-width: calc(1132px + 2 * var(--diya-space-7)); margin: 0 auto; padding: 0 var(--diya-space-7) var(--diya-space-8); }
.changelog-hero { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: var(--diya-space-7); align-items: end; padding: clamp(48px, 9vh, 104px) 0 var(--diya-space-7); }
.changelog-hero-copy { display: grid; gap: var(--diya-space-5); }
.changelog-h1 { max-width: 13ch; margin: 0; font-size: clamp(40px, 6vw, 76px); font-weight: 650; line-height: 1.02; letter-spacing: -0.03em; text-wrap: balance; }
.changelog-lede { max-width: 560px; margin: 0; color: var(--diya-color-muted); font-size: clamp(var(--diya-text-large), 1.5vw, var(--diya-text-title)); line-height: 1.45; letter-spacing: -0.01em; text-wrap: pretty; }
.changelog-subscribe { display: grid; gap: var(--diya-space-3); }
.changelog-subscribe-status:empty { display: none; }
.changelog-label { margin: 0; font-size: var(--diya-text-body); font-weight: 600; }
.changelog-row { display: flex; gap: var(--diya-space-2); align-items: flex-start; }
.changelog-field { flex: 1; min-width: 0; }
.changelog-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); font-weight: 400; line-height: var(--diya-leading-body); }
.changelog-notes { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: var(--diya-space-7); padding-top: var(--diya-space-5); }
.changelog-index { position: relative; }
.changelog-index nav { position: sticky; top: var(--diya-space-5); }
.changelog-index ul { display: grid; gap: var(--diya-space-1); margin: 0 0 0 calc(-1 * var(--diya-space-3)); padding: 0; list-style: none; }
.changelog-index a {
  display: block; padding: var(--diya-space-2) var(--diya-space-3); border-radius: calc(8px * var(--diya-corner-scale, 1));
  color: var(--diya-color-muted); font-size: var(--diya-text-body); text-decoration: none;
}
.changelog-index a:hover { background: var(--diya-color-hover); color: var(--diya-color-text); }
.changelog-index a:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: 2px; }
.changelog-entries { display: grid; gap: var(--diya-space-7); max-width: 720px; min-width: 0; }
.changelog-filters { display: flex; flex-wrap: wrap; gap: var(--diya-space-1); }
.changelog-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.changelog-month { display: grid; gap: var(--diya-space-7); scroll-margin-top: var(--diya-space-5); }
.changelog-h2 { margin: 0; padding-bottom: var(--diya-space-3); border-bottom: 1px solid var(--diya-color-line); color: var(--diya-color-muted); font-size: var(--diya-text-body); font-weight: 600; }
.changelog-entry { display: grid; gap: var(--diya-space-4); }
.changelog-meta { display: flex; align-items: center; gap: var(--diya-space-3); color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-variant-numeric: tabular-nums; }
.changelog-h3 { margin: 0; font-size: clamp(24px, 2.4vw, 30px); font-weight: 650; line-height: 1.15; letter-spacing: -0.03em; text-wrap: balance; }
.changelog-more { display: flex; justify-content: center; padding-top: var(--diya-space-3); }
.changelog-figure {
  display: grid; gap: var(--diya-space-3); padding: var(--diya-space-5); border-radius: var(--diya-radius-surface);
  background: var(--diya-color-recessed); box-shadow: inset 0 0 0 1px var(--diya-color-line);
}
.changelog-fig-views { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); margin-bottom: var(--diya-space-2); font-size: var(--diya-text-caption); }
.changelog-fig-views span { padding: 4px 12px; border-radius: 999px; color: var(--diya-color-muted); box-shadow: inset 0 0 0 1px var(--diya-color-line); white-space: nowrap; }
.changelog-fig-views span[data-on] { background: var(--diya-color-accent); color: var(--diya-color-accent-text); box-shadow: none; }
.changelog-fig-list { display: grid; overflow: hidden; border-radius: 10px; background: var(--diya-color-raised); box-shadow: 0 0 0 1px var(--diya-color-line); }
.changelog-fig-row { display: grid; grid-template-columns: 14px auto minmax(0, 1fr) 28px; align-items: center; gap: var(--diya-space-3); padding: 10px var(--diya-space-3); font-size: var(--diya-text-caption); }
.changelog-fig-row + .changelog-fig-row { border-top: 1px solid var(--diya-color-line); }
.changelog-fig-dot { width: 14px; height: 14px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px var(--diya-color-muted); }
.changelog-fig-dot[data-done] { background: var(--diya-color-success-fill); box-shadow: none; }
.changelog-fig-id { color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-variant-numeric: tabular-nums; white-space: nowrap; }
.changelog-fig-title { min-width: 0; overflow: hidden; color: var(--diya-color-text); font-size: var(--diya-text-caption); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.changelog-fig-who { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--diya-color-selected); font-size: 13px; font-weight: 500; }
.changelog-fig-board { grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: start; }
.changelog-fig-col { display: grid; gap: var(--diya-space-2); min-width: 0; }
.changelog-fig-col-title { margin-bottom: var(--diya-space-1); color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-weight: 600; }
.changelog-fig-card { display: grid; gap: var(--diya-space-2); padding: var(--diya-space-3); border-radius: 10px; background: var(--diya-color-raised); box-shadow: 0 0 0 1px var(--diya-color-line); }
.changelog-fig-meter { display: block; height: 4px; overflow: hidden; border-radius: 2px; background: color-mix(in srgb, var(--diya-color-text) 10%, transparent); }
.changelog-fig-meter > span { display: block; height: 100%; border-radius: inherit; background: var(--diya-color-text); }
.changelog-wait { padding-block: var(--diya-space-7); }
.changelog-roadmap { display: grid; gap: var(--diya-space-7); padding-top: var(--diya-space-5); }
.changelog-columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--diya-space-6); }
.changelog-column { display: grid; align-content: start; gap: var(--diya-space-3); }
.changelog-column-title { display: flex; gap: var(--diya-space-2); align-items: baseline; margin: 0; padding-bottom: var(--diya-space-3); border-bottom: 1px solid var(--diya-color-line); font-size: var(--diya-text-large); font-weight: 600; }
.changelog-ideas { display: grid; margin: 0; padding: 0; list-style: none; }
.changelog-idea { display: flex; gap: var(--diya-space-4); align-items: flex-start; justify-content: space-between; padding: var(--diya-space-4) 0; border-bottom: 1px solid color-mix(in srgb, var(--diya-color-line) 60%, transparent); }
.changelog-idea-text { display: grid; gap: var(--diya-space-1); min-width: 0; }
.changelog-idea-title { margin: 0; font-size: var(--diya-text-body); font-weight: 600; }
.changelog-shipped { margin: var(--diya-space-1) 0 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-variant-numeric: tabular-nums; }
.changelog-vote { flex-shrink: 0; min-width: 64px; font-variant-numeric: tabular-nums; }
.changelog-suggest { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--diya-space-3); margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.changelog-footer { padding: var(--diya-space-5); border-top: 1px solid var(--diya-color-line); color: var(--diya-color-muted); font-size: var(--diya-text-caption); text-align: center; }
@media (max-width: 900px) {
  .changelog-hero { grid-template-columns: minmax(0, 1fr); align-items: start; }
  .changelog-notes { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-5); }
  .changelog-index nav { position: static; }
  .changelog-index ul { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); margin: 0; }
  .changelog-index a { padding: var(--diya-space-1) var(--diya-space-3); box-shadow: inset 0 0 0 1px var(--diya-color-line); border-radius: 999px; }
  .changelog-columns { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-7); }
}
@media (max-width: 900px) and (min-width: 641px) {
  .changelog-main { padding-inline: var(--diya-space-5); }
}
@media (max-width: 640px) {
  .changelog-main { padding: 0 var(--diya-space-4) var(--diya-space-7); }
  .changelog-index { display: none; }
}
@media (max-width: 520px) {
  .changelog-hero { padding-top: var(--diya-space-7); }
  .changelog-row { flex-direction: column; align-items: stretch; }
}
`

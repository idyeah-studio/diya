'use client'
// Error & system pages: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/errors/page.tsx. Vite: save as src/ErrorPages.tsx and render it inside your DiyaProvider.
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { Button, Dialog, Search, Select, TextArea, TextLink } from '@idyeah/diya'
import { ArrowLeft, Check, Copy, Hourglass, LucideProvider, RotateCw, Wifi, WifiOff, Wrench } from 'lucide-react'

// Your product, and what each page knows about the moment it's shown in.
const PRODUCT = 'Penwright'
const STATUS_URL = 'https://status.example.com'
const ERROR_ID = 'PW-7F3A-91C2'
const DOCUMENT = { name: 'Q4 launch plan', team: 'Marketing', owner: 'Ines Moreau' }
const SIGNED_IN_AS = 'noor.haddad@example.com'
// When your maintenance window ends. The demo ends it 45 minutes after the page loads.
const BACK_AT = new Date(Date.now() + 45 * 60_000)

type Kind = 'not-found' | 'server' | 'no-access' | 'maintenance' | 'expired' | 'offline'
const KINDS: { value: Kind; label: string }[] = [
  { value: 'not-found', label: 'Not found' },
  { value: 'server', label: 'Server error' },
  { value: 'no-access', label: 'No access' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'expired', label: 'Expired link' },
  { value: 'offline', label: 'Offline' },
]

// Replace with your API calls. Each waits a moment. The server error is still
// broken when you retry; requests for access and new links go through.
async function api(route: '/retry' | '/access-requests' | '/session/email-link', body: Record<string, string> = {}) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  void body
  return route !== '/retry'
}

type PageProps = { titleRef: Ref<HTMLHeadingElement> }

export default function ErrorPagesScreen() {
  const [kind, setKind] = useState<Kind>('not-found')
  const titleRef = useRef<HTMLHeadingElement>(null)
  const shown = useRef(kind)

  useEffect(() => {
    if (shown.current === kind) return
    shown.current = kind
    titleRef.current?.focus()
  }, [kind])

  const page = { titleRef }
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="errors">
        <style>{css}</style>
        <header className="errors-top">
          <a className="errors-brand" href="/">
            <span className="errors-mark" aria-hidden="true">{PRODUCT[0]}</span>
            <span className="errors-brand-name">{PRODUCT}</span>
          </a>
          {/* Remove the switcher and render the kind your router gives you. */}
          <Select className="errors-switcher" size="small" label="Page to preview" hideLabel options={KINDS} value={kind}
            onValueChange={(value) => setKind(value as Kind)} />
        </header>
        <main className="errors-main">
          {kind === 'not-found' && <NotFound key={kind} {...page} />}
          {kind === 'server' && <ServerError key={kind} {...page} />}
          {kind === 'no-access' && <NoAccess key={kind} {...page} />}
          {kind === 'maintenance' && <Maintenance key={kind} {...page} />}
          {kind === 'expired' && <ExpiredLink key={kind} {...page} />}
          {kind === 'offline' && <Offline key={kind} {...page} />}
        </main>
        <footer className="errors-foot">
          <span>© 2026 {PRODUCT}</span>
          <a className="errors-foot-link" href="/help">Help center</a>
          <a className="errors-foot-link" href={STATUS_URL}>System status</a>
        </footer>
      </div>
    </LucideProvider>
  )
}

function NotFound({ titleRef }: PageProps) {
  const [query, setQuery] = useState('')
  return (
    <Message code="404" title="Page not found" titleRef={titleRef}
      lede="The link may be out of date, or the page moved on without leaving a note.">
      {/* Sends the search to your search page as /search?q=… */}
      <form role="search" action="/search" method="get" className="errors-search">
        <Search label={`Search ${PRODUCT}`} hideLabel name="q" placeholder="Search documents and people" value={query}
          onValueChange={setQuery} />
      </form>
    </Message>
  )
}

function ServerError({ titleRef }: PageProps) {
  const [busy, setBusy] = useState(false)
  const [tries, setTries] = useState(0)
  const [copied, setCopied] = useState<boolean>()

  async function retry() {
    // In Next.js, error.tsx gets a reset() to call here instead.
    setBusy(true)
    const ok = await api('/retry')
    setBusy(false)
    if (ok) window.location.reload()
    else setTries(tries + 1)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(ERROR_ID)
      setCopied(true)
      setTimeout(() => setCopied(undefined), 2400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Message code="500" title="Something broke on our end" titleRef={titleRef}
      lede={tries ? 'Still not working. We’re on it, so give it a few minutes before you try again.' : 'It’s not you, it’s us. We’ve been alerted, and someone is already looking into it.'}>
      <Button loading={busy} onClick={retry}><RotateCw /> Try again</Button>
      <div className="errors-reference">
        <span className="errors-reference-label">Error ID</span>
        <code className="errors-code-id">{ERROR_ID}</code>
        <Button variant="quiet" size="small" onClick={copy}>
          {copied ? <><Check /> Copied</> : <><Copy /> Copy</>}
        </Button>
      </div>
      <p className="errors-note" role="status">
        {copied === false ? 'Couldn’t reach your clipboard. Select the ID and copy it yourself.' : copied ? 'Error ID copied.' : 'Writing to support? Include this ID and we’ll find what happened.'}
      </p>
    </Message>
  )
}

function NoAccess({ titleRef }: PageProps) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const owner = DOCUMENT.owner.split(' ')[0]

  async function send() {
    await api('/access-requests', { document: DOCUMENT.name, note })
    setSent(true)
  }

  return (
    <Message code="403" title="No access" titleRef={titleRef}
      lede={sent
        ? `Request sent. We’ll email you as soon as ${owner} says yes.`
        : <>“{DOCUMENT.name}” is shared with the {DOCUMENT.team} team. Ask its owner, {DOCUMENT.owner}, to let you in.</>}>
      {sent ? (
        <Button variant="outline" disabled><Check /> Request sent</Button>
      ) : (
        <Button onClick={() => setOpen(true)}>Request access</Button>
      )}
      <Dialog open={open} onOpenChange={setOpen} title="Request access" size="small" confirmLabel="Send request"
        description={`${DOCUMENT.owner} gets an email and a notification.`} onConfirm={send}>
        <TextArea label="Add a note (optional)" rows={3} maxLength={280} showCount value={note} onValueChange={setNote}
          placeholder={`Hi ${owner}, I’m helping with the launch emails.`} />
      </Dialog>
      <p className="errors-note">
        Signed in as {SIGNED_IN_AS}. <TextLink href="/switch-account" inline>Switch account</TextLink>
      </p>
    </Message>
  )
}

function Maintenance({ titleRef }: PageProps) {
  const minutes = useMinutesUntil(BACK_AT)
  const time = BACK_AT.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
  return (
    <Message icon={<Wrench />} title="Down for maintenance" titleRef={titleRef}
      lede={`We’re upgrading our servers so your documents open faster. Back by ${time}, ${
        minutes > 1 ? `in about ${minutes} minutes` : 'any moment now'}.`}>
      <Button variant="outline" href={STATUS_URL}>See live status</Button>
    </Message>
  )
}

function ExpiredLink({ titleRef }: PageProps) {
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(0)
  const masked = SIGNED_IN_AS.replace(/^(.)[^@]*/, '$1•••')

  async function resend() {
    setBusy(true)
    await api('/session/email-link', { email: SIGNED_IN_AS })
    setBusy(false)
    setSent(sent + 1)
  }

  return (
    <Message icon={<Hourglass />} title="This link has expired" titleRef={titleRef}
      lede={sent
        ? `We sent ${sent > 1 ? 'another' : 'a new'} link to ${masked}. It works once, for the next 15 minutes.`
        : 'Sign-in links work for 15 minutes, to keep your account safe. This one had a good run.'}>
      <Button variant={sent ? 'outline' : 'solid'} loading={busy} onClick={resend}>
        {sent ? 'Send another link' : 'Email me a new link'}
      </Button>
    </Message>
  )
}

function Offline({ titleRef }: PageProps) {
  const [online, setOnline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const back = () => setOnline(true)
    const gone = () => setOnline(false)
    window.addEventListener('online', back)
    window.addEventListener('offline', gone)
    return () => {
      window.removeEventListener('online', back)
      window.removeEventListener('offline', gone)
    }
  }, [])

  async function retry() {
    setBusy(true)
    setStill(false)
    await new Promise((resolve) => setTimeout(resolve, 900))
    setBusy(false)
    // navigator.onLine is false only when the device has no network at all.
    if (navigator.onLine === false) setStill(true)
    else setOnline(true)
  }

  if (online) {
    return (
      <Message icon={<Wifi />} title="You’re back online" titleRef={titleRef}
        lede="Your edits from while you were away are syncing now. Pick up where you left off.">
        <Button href="/">Continue</Button>
      </Message>
    )
  }
  return (
    <Message icon={<WifiOff />} title="You’re offline" titleRef={titleRef}
      lede={still
        ? 'Still no connection. We’ll reconnect by ourselves as soon as your network is back.'
        : 'Check your Wi-Fi or network cable. Your edits are saved on this device and sync when you’re back.'}>
      <Button loading={busy} onClick={retry}><RotateCw /> Try again</Button>
    </Message>
  )
}

type MessageProps = { code?: string; icon?: ReactNode; title: string; lede: ReactNode; titleRef: Ref<HTMLHeadingElement>; children: ReactNode }

function Message({ code, icon, title, lede, titleRef, children }: MessageProps) {
  const id = useId()
  return (
    <section className="errors-message" aria-labelledby={id}>
      {code ? (
        <p className="errors-numeral" aria-hidden="true">{code}</p>
      ) : (
        <span className="errors-icon" aria-hidden="true">{icon}</span>
      )}
      <h1 id={id} ref={titleRef} tabIndex={-1} className="errors-title">
        {code && <span className="errors-sr">Error {code}: </span>}
        {title}
      </h1>
      <p className="errors-lede" role="status">{lede}</p>
      <div className="errors-actions">{children}</div>
      <TextLink href="/" className="errors-home" leadingIcon={<ArrowLeft />}>Back to home</TextLink>
    </section>
  )
}

function useMinutesUntil(when: Date) {
  const left = () => Math.max(0, Math.ceil((when.getTime() - Date.now()) / 60_000))
  const [minutes, setMinutes] = useState(left)
  useEffect(() => {
    const tick = setInterval(() => setMinutes(left()), 15_000)
    return () => clearInterval(tick)
  })
  return minutes
}

const css = `
.errors {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  color: var(--diya-color-text);
}
.errors-top,
.errors-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--diya-space-4);
  padding: var(--diya-space-5) var(--diya-space-6);
}
.errors-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  color: inherit;
  font-size: var(--diya-text-large);
  font-weight: 600;
  letter-spacing: -0.01em;
  text-decoration: none;
}
.errors-brand:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 4px; }
.errors-mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: calc(8px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent);
  color: var(--diya-color-accent-text);
  font-size: var(--diya-text-body);
  font-weight: 650;
  line-height: 1;
}
.errors-switcher { width: 168px; }

.errors-main { display: grid; place-items: center; padding: var(--diya-space-7) var(--diya-space-5) var(--diya-space-8); }
.errors-message { display: grid; justify-items: center; width: 100%; max-width: 520px; text-align: center; }
.errors-numeral {
  margin: 0 0 var(--diya-space-5);
  font-size: clamp(112px, 24vw, 176px);
  font-weight: 200;
  font-stretch: 92%;
  line-height: 0.8;
  letter-spacing: -0.06em;
  font-variant-numeric: lining-nums;
  color: color-mix(in srgb, var(--diya-color-text) 16%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--diya-color-text) 30%, transparent), color-mix(in srgb, var(--diya-color-text) 8%, transparent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  user-select: none;
}
.errors-icon { display: grid; margin-bottom: var(--diya-space-6); color: color-mix(in srgb, var(--diya-color-text) 34%, transparent); }
.errors-icon svg { width: 80px; height: 80px; stroke-width: 0.9; }
.errors-title {
  margin: 0;
  font-size: var(--diya-text-display);
  font-weight: 600;
  line-height: var(--diya-leading-tight);
  letter-spacing: -0.025em;
  text-wrap: balance;
}
.errors-title:focus { outline: none; }
.errors-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.errors-lede {
  max-width: 30em;
  margin: var(--diya-space-3) 0 0;
  color: var(--diya-color-muted);
  font-size: var(--diya-text-large);
  line-height: var(--diya-leading-body);
  text-wrap: balance;
}
.errors-actions { display: grid; justify-items: center; gap: var(--diya-space-4); width: 100%; margin-top: var(--diya-space-6); }
.errors-search { width: 100%; max-width: 400px; }
.errors-reference {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--diya-space-2) var(--diya-space-3);
  margin-top: var(--diya-space-5);
}
.errors-reference-label { color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.errors-code-id { font-family: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace; font-size: var(--diya-text-body); letter-spacing: 0.02em; user-select: all; }
.errors-note { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: var(--diya-leading-body); text-wrap: balance; overflow-wrap: anywhere; }
.errors-home { margin-top: var(--diya-space-6); font-size: var(--diya-text-body); }
.errors-foot { justify-content: center; gap: var(--diya-space-5); color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.errors-foot-link { border-radius: 4px; color: inherit; text-decoration: none; }
.errors-foot-link:hover { color: var(--diya-color-text); text-decoration: underline; text-underline-offset: 3px; }
.errors-foot-link:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 3px; }

@media (max-width: 640px) {
  .errors-top { padding: var(--diya-space-4); }
  .errors-switcher { width: 148px; }
  .errors-main { place-items: start center; padding: var(--diya-space-8) var(--diya-space-5) var(--diya-space-7); }
  .errors-title { font-size: 28px; }
  .errors-lede { font-size: var(--diya-text-body); }
  .errors-foot { flex-wrap: wrap; gap: var(--diya-space-2) var(--diya-space-4); padding: var(--diya-space-5) var(--diya-space-4); }
}
`

'use client'
// Sign up: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/sign-up/page.tsx. Vite: save as src/SignUp.tsx and render it inside your DiyaProvider.
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { Alert, Avatar, Button, Form, List, Progress, Stack, TextInput, TextLink, useDiyaAppearance } from '@idyeah/diya'
import { ArrowLeft, ArrowRight, FileText, FolderKanban, ListChecks, Lock, LucideProvider, NotebookPen, PenLine, Search } from 'lucide-react'

// Your product, what the quiet panel says, and the invite the demo opens.
const PRODUCT = 'Lintel'
const RESEND_AFTER = 30
const POINTS = [
  { icon: <PenLine />, title: 'Write it together', text: 'Docs the whole team edits at once, with comments that stay where you left them.' },
  { icon: <ListChecks />, title: 'Plan where you write', text: 'Turn any line into a task with an owner and a date.' },
  { icon: <Search />, title: 'Find it next year', text: 'Every doc and decision, searchable back to day one.' },
]
const QUOTE = {
  text: 'We moved the whole studio into Lintel in an afternoon. Nobody has asked where a file lives since.',
  name: 'Priya Natarajan',
  role: 'Studio lead at Kestrel & Vine',
}
const INVITE = { from: 'Maya', fromFull: 'Maya Okafor', workspace: 'Northwind Studio', email: 'jonah.park@example.com', others: 11 }
const WAITING = [
  { id: 'handbook', label: 'Studio handbook', description: 'Updated yesterday by Aiko Tanaka', icon: <FileText /> },
  { id: 'refresh', label: 'Spring brand refresh', description: 'A project with 14 docs and 9 open tasks', icon: <FolderKanban /> },
  { id: 'crit', label: 'Weekly crit notes', description: 'Three new pages since Monday', icon: <NotebookPen /> },
]

type Route = '/accounts' | '/accounts/confirm/resend' | '/invites/accept' | '/session/google' | '/session/github'

// Replace with your API call. The stub waits a moment, then turns down
// taken@example.com as already registered. Everything else goes through.
async function api(route: Route, body: Record<string, string> = {}) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  if (route === '/accounts') return body.email.trim().toLowerCase() !== 'taken@example.com'
  return true
}

type View = 'form' | 'confirm' | 'welcome'
type Mode = 'new' | 'invite'
type Account = { name: string; email: string; password: string }
type ViewProps = { mode: Mode; account: Account; titleRef: Ref<HTMLHeadingElement>; go: (view: View) => void }

const emailProblem = (email: string) =>
  !email.trim()
    ? 'Enter your email address.'
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? undefined
      : 'Enter an email address like name@example.com.'

const GUESSABLE = ['password', '12345678', 'qwerty', 'letmein', 'lintel', 'iloveyou']

function strength(password: string) {
  if (!password) return { value: 0, words: 'Use 8 or more characters. A short phrase works well.' }
  if (password.length < 8) return { value: 12, words: 'Too short so far. Keep going.' }
  if (GUESSABLE.some((word) => password.toLowerCase().includes(word))) return { value: 30, words: 'Weak. That one is easy to guess.', guessable: true }
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) => kind.test(password)).length
  if (password.length < 12 && kinds < 3) return { value: 60, words: 'Fair. A few more characters would help.' }
  return { value: 100, words: 'Strong. That one will hold.' }
}

export default function SignUpScreen() {
  const { glass } = useDiyaAppearance()
  const [view, setView] = useState<View>('form')
  const [mode, setMode] = useState<Mode>('new')
  const [account, setAccount] = useState<Account>({ name: '', email: '', password: '' })
  const titleRef = useRef<HTMLHeadingElement>(null)
  const shown = useRef(`${view}-${mode}`)

  useEffect(() => {
    if (shown.current === `${view}-${mode}`) return
    shown.current = `${view}-${mode}`
    window.scrollTo({ top: 0 })
    titleRef.current?.focus({ preventScroll: true })
  }, [view, mode])

  const shared: ViewProps = { mode, account, titleRef, go: setView }
  const switchMode = (next: Mode) => {
    setMode(next)
    setAccount({ name: account.name, email: next === 'invite' ? INVITE.email : '', password: '' })
  }

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="sign-up" data-glass={glass || undefined}>
        <style>{css}</style>
        <main className="sign-up-main">
          {view === 'form' && <FormView {...shared} key={mode} setAccount={setAccount} switchMode={switchMode} />}
          {view === 'confirm' && <ConfirmView {...shared} />}
          {view === 'welcome' && <WelcomeView {...shared} />}
        </main>
        {mode === 'new' ? <WhyPanel /> : <InvitePanel />}
      </div>
    </LucideProvider>
  )
}

function FormView({ mode, account, titleRef, go, setAccount, switchMode }: ViewProps & { setAccount: (account: Account) => void; switchMode: (mode: Mode) => void }) {
  const invite = mode === 'invite'
  const [errors, setErrors] = useState<Partial<Account>>({})
  const [taken, setTaken] = useState('')
  const [busy, setBusy] = useState<'account' | 'google' | 'github'>()
  const fields = { name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null) }
  const focus = useFocusAfterRender()
  const meter = strength(account.password)

  const edit = (key: keyof Account) => (value: string) => {
    setAccount({ ...account, [key]: value })
    setErrors({ ...errors, [key]: undefined })
  }

  async function create() {
    const found: Partial<Account> = {
      name: account.name.trim() ? undefined : 'Enter your name.',
      email: invite ? undefined : emailProblem(account.email),
      password: account.password.length < 8 ? 'Use at least 8 characters.' : meter.guessable ? 'That one is easy to guess. Try a short phrase instead.' : undefined,
    }
    setErrors(found)
    setTaken('')
    const first = (['name', 'email', 'password'] as const).find((key) => found[key])
    if (first) return focus(fields[first].current)
    setBusy('account')
    // Invites were sent to this address, so it's already confirmed.
    const ok = await api(invite ? '/invites/accept' : '/accounts', account)
    if (ok) return go(invite ? 'welcome' : 'confirm')
    setBusy(undefined)
    setTaken(account.email.trim())
    focus(fields.email.current)
  }

  async function continueWith(provider: 'google' | 'github') {
    if (busy) return
    setBusy(provider)
    // A real Google or GitHub sign-up sends the browser to the provider here.
    await api(`/session/${provider}`)
    go('welcome')
  }

  return (
    <Panel
      heading={invite ? `${INVITE.from} invited you to ${INVITE.workspace} on ${PRODUCT}` : `Create your ${PRODUCT} account`}
      lede={invite ? `Make an account to join ${INVITE.from} and ${INVITE.others} others. It takes about a minute.` : 'Free for teams of up to 10. No card needed.'}
      titleRef={titleRef}
      busy={busy !== undefined}
      onSubmit={create}
      footer={
        invite ? (
          <>Not you? <LinkButton onClick={() => switchMode('new')}>Sign up without the invite</LinkButton></>
        ) : (
          <>
            Already have an account? <TextLink href="/sign-in" inline>Sign in</TextLink>
            <br />
            Joining your team? <LinkButton onClick={() => switchMode('invite')}>Open your invite</LinkButton>
          </>
        )
      }
    >
      <Stack gap={3}>
        <Button variant="outline" className="sign-up-wide" loading={busy === 'google'} onClick={() => continueWith('google')}>
          <GoogleLogo /> Continue with Google
        </Button>
        <Button variant="outline" className="sign-up-wide" loading={busy === 'github'} onClick={() => continueWith('github')}>
          <GitHubLogo /> Continue with GitHub
        </Button>
      </Stack>
      <p className="sign-up-or">or</p>
      <Stack gap={4}>
        {taken && (
          <Alert tone="error" urgent>
            <strong className="sign-up-strong">{taken} already has a {PRODUCT} account.</strong>{' '}
            <TextLink href="/sign-in" inline>Sign in instead</TextLink>, or use a different email.
          </Alert>
        )}
        <TextInput ref={fields.name} label="Name" autoComplete="name" autoCapitalize="words" value={account.name} error={errors.name} onValueChange={edit('name')} />
        <TextInput
          ref={fields.email}
          label={invite ? 'Email' : 'Work email'}
          type="email"
          autoComplete="username"
          value={account.email}
          error={errors.email}
          readOnly={invite}
          leadingIcon={invite ? <Lock /> : undefined}
          helperText={invite ? 'Your invite is for this address.' : undefined}
          onValueChange={(value) => { edit('email')(value); setTaken('') }}
        />
        <div className="sign-up-password">
          <TextInput ref={fields.password} label="Password" type="password" autoComplete="new-password" value={account.password} error={errors.password} onValueChange={edit('password')} />
          <Progress className="sign-up-meter" label="Password strength" value={meter.value} showValue={false} />
          <p className="sign-up-hint" aria-live="polite">{errors.password ? '' : meter.words}</p>
        </div>
      </Stack>
      <Stack gap={4}>
        <Button type="submit" className="sign-up-wide" loading={busy === 'account'}>
          {invite ? `Join ${INVITE.workspace}` : 'Create account'}
        </Button>
        <p className="sign-up-legal">
          By continuing, you agree to our <TextLink href="/terms" inline>Terms</TextLink> and{' '}
          <TextLink href="/privacy" inline>Privacy Policy</TextLink>.
        </p>
      </Stack>
    </Panel>
  )
}

function ConfirmView({ account, titleRef, go }: ViewProps) {
  const [wait, restart] = useCooldown()
  const [busy, setBusy] = useState(false)
  const [again, setAgain] = useState(false)

  async function resend() {
    if (wait > 0) return
    setBusy(true)
    await api('/accounts/confirm/resend', { email: account.email })
    setBusy(false)
    setAgain(true)
    restart()
  }

  return (
    <Panel
      heading="Check your email to confirm"
      lede={
        <>
          We sent {again ? 'another' : 'a'} link to <strong className="sign-up-strong">{account.email}</strong>. Open it to confirm
          it’s you, and you’re in. It works for the next 24 hours.
        </>
      }
      titleRef={titleRef}
      busy={busy}
      onSubmit={resend}
      footer={
        <>
          Still nothing?{' '}
          <LinkButton type="submit" disabled={busy || wait > 0}>
            {wait > 0 ? `Resend in ${countdown(wait)}` : busy ? 'Sending…' : 'Resend the link'}
          </LinkButton>
        </>
      }
    >
      <p className="sign-up-hint">Not there yet? Give it a minute, and check your spam folder.</p>
      <Button variant="outline" className="sign-up-wide" onClick={() => go('form')}>
        <ArrowLeft /> Use a different email
      </Button>
    </Panel>
  )
}

function WelcomeView({ mode, account, titleRef }: ViewProps) {
  const invite = mode === 'invite'
  const first = account.name.trim().split(/\s+/)[0]
  return (
    <Panel
      heading={invite ? `You’re in ${INVITE.workspace}` : `Welcome to ${PRODUCT}${first ? `, ${first}` : ''}`}
      lede={
        invite
          ? `${INVITE.from} will see you’ve joined. The studio handbook is a good first read.`
          : 'Your account is ready. Next, two minutes to set up your workspace.'
      }
      titleRef={titleRef}
      busy={false}
      onSubmit={() => undefined}
    >
      <Button href={invite ? '/' : '/onboarding'} className="sign-up-wide">
        {invite ? `Open ${INVITE.workspace}` : 'Set up your workspace'} <ArrowRight />
      </Button>
    </Panel>
  )
}

function WhyPanel() {
  const id = useId()
  return (
    <aside className="sign-up-aside" aria-labelledby={id}>
      <div className="sign-up-aside-body">
        <h2 id={id} className="sign-up-aside-title">A calm home for your team’s docs and plans.</h2>
        <ul className="sign-up-points">
          {POINTS.map((point) => (
            <li key={point.title} className="sign-up-point">
              {point.icon}
              <span>
                <strong className="sign-up-strong">{point.title}</strong>
                <span className="sign-up-point-text">{point.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <figure className="sign-up-quote">
        <blockquote className="sign-up-quote-text">“{QUOTE.text}”</blockquote>
        <figcaption className="sign-up-quote-by">
          <Avatar name={QUOTE.name} size="small" />
          <span>
            <strong className="sign-up-strong">{QUOTE.name}</strong>
            <span className="sign-up-point-text">{QUOTE.role}</span>
          </span>
        </figcaption>
      </figure>
    </aside>
  )
}

function InvitePanel() {
  const id = useId()
  return (
    <aside className="sign-up-aside" aria-labelledby={id}>
      <div className="sign-up-aside-body">
        <h2 id={id} className="sign-up-aside-title">Already waiting in {INVITE.workspace}</h2>
        <List label={`In ${INVITE.workspace}`} divided items={WAITING.map(({ icon, ...item }) => ({ ...item, leading: icon }))} />
      </div>
      <div className="sign-up-quote-by">
        <Avatar name={INVITE.fromFull} size="small" />
        <span>
          <strong className="sign-up-strong">Invited by {INVITE.fromFull}</strong>
          <span className="sign-up-point-text">Design lead, and the one who sets the crit agenda</span>
        </span>
      </div>
    </aside>
  )
}

type PanelProps = { heading: string; lede: ReactNode; titleRef: Ref<HTMLHeadingElement>; busy: boolean; onSubmit: () => void; footer?: ReactNode; children: ReactNode }

function Panel(props: PanelProps) {
  const id = useId()
  return (
    <Form className="sign-up-form" aria-labelledby={id} noValidate loading={props.busy} actions={null} onSubmit={props.onSubmit}>
      <header className="sign-up-header">
        <span className="sign-up-mark" aria-hidden="true">{PRODUCT[0]}</span>
        <h1 id={id} ref={props.titleRef} tabIndex={-1} className="sign-up-title">{props.heading}</h1>
        <p className="sign-up-lede" role="status">{props.lede}</p>
      </header>
      {props.children}
      {props.footer && <p className="sign-up-footer">{props.footer}</p>}
    </Form>
  )
}

function LinkButton(props: { type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <TextLink asChild inline>
      <button
        type={props.type ?? 'button'}
        className="sign-up-link"
        aria-disabled={props.disabled || undefined}
        onClick={(event) => (props.disabled ? event.preventDefault() : props.onClick?.())}
      >
        {props.children}
      </button>
    </TextLink>
  )
}

const countdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

function useCooldown() {
  const [left, setLeft] = useState(RESEND_AFTER)
  useEffect(() => {
    if (left === 0) return
    const tick = setTimeout(() => setLeft(left - 1), 1000)
    return () => clearTimeout(tick)
  }, [left])
  return [left, () => setLeft(RESEND_AFTER)] as const
}

function useFocusAfterRender() {
  const [target, setTarget] = useState<{ node: HTMLElement | null }>()
  useEffect(() => target?.node?.focus(), [target])
  return (node: HTMLElement | null) => setTarget({ node })
}

// Google's "G" and GitHub's mark are trademarks of their owners, not covered by DIYA's MIT license; use them only as https://developers.google.com/identity/branding-guidelines and https://brand.github.com/foundations/logo allow.
function GoogleLogo() {
  const id = useId()
  const blur = `url(#${id}-blur)`
  return (
    <svg className="sign-up-logo" viewBox="10 10 20 20" aria-hidden="true" focusable="false">
      <mask id={`${id}-g`} maskUnits="userSpaceOnUse" x="10" y="10" width="20" height="20">
        <path fill="#fff" d="M29.3987 18.1814H19.9849V22.0445H25.3598C25.1286 23.294 24.4294 24.3596 23.3676 25.0712C22.4746 25.6716 21.3266 26.0211 19.9849 26.0211C17.3864 26.0211 15.1823 24.2666 14.3947 21.9004C14.1952 21.2989 14.0853 20.6599 14.0853 19.9983C14.0853 19.3367 14.1952 18.6966 14.3947 18.0962C15.1823 15.7311 17.3864 13.9755 19.9849 13.9755C21.4524 13.9755 22.767 14.4816 23.8039 15.4713L26.6653 12.6057C24.936 10.9908 22.6786 10 19.9849 10C16.0832 10 12.705 12.2414 11.0618 15.5076C10.383 16.8592 10 18.3834 10 19.9994C10 21.6155 10.383 23.1396 11.0618 24.4913C12.705 27.7597 16.0832 30 19.9849 30C22.6797 30 24.9485 29.1137 26.6018 27.5861C28.4887 25.8452 29.5732 23.2702 29.5732 20.2275C29.5732 19.5182 29.5131 18.835 29.3987 18.1825V18.1814Z" />
      </mask>
      <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="1" />
      </filter>
      <g mask={`url(#${id}-g)`}>
        <g filter={blur}>
          <foreignObject x="6" y="6" width="28" height="28">
            <div className="sign-up-google-sweep" />
          </foreignObject>
        </g>
        <ellipse filter={blur} cx="20.0496" cy="20.2413" rx="5.39634" ry="2.83537" transform="rotate(24.4473 20.0496 20.2413)" fill="#3186FF" />
        <ellipse filter={blur} cx="33.3538" cy="18.2155" rx="7.43918" ry="3.09357" fill="#3186FF" />
        <ellipse filter={blur} cx="25.2744" cy="16.2195" rx="7.40854" ry="2.37805" fill="#FF4641" />
        <ellipse filter={blur} cx="29.5427" cy="12.9268" rx="7.40854" ry="2.37805" fill="#FF5B8B" />
        <ellipse filter={blur} cx="24.4817" cy="19.878" rx="8.5061" ry="3.10976" fill="#3186FF" />
        <ellipse filter={blur} cx="25.1842" cy="14.0197" rx="4.53882" ry="2.37805" transform="rotate(-28.6599 25.1842 14.0197)" fill="#FF4641" />
      </g>
    </svg>
  )
}

function GitHubLogo() {
  return (
    <svg className="sign-up-logo sign-up-github" viewBox="0 0 98 96" aria-hidden="true" focusable="false">
      <path d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z" />
    </svg>
  )
}

const css = `
.sign-up {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  color: var(--diya-color-text);
}
.sign-up-main { display: grid; place-items: center; padding: var(--diya-space-7) var(--diya-space-6); }
.sign-up-form { width: 100%; max-width: 400px; margin: 0; padding: 0; gap: var(--diya-space-5); background: none; border: 0; box-shadow: none; backdrop-filter: none; }
.sign-up[data-glass] .sign-up-main {
  margin: var(--diya-space-3);
  border: 1px solid color-mix(in srgb, var(--diya-color-text) 10%, transparent);
  border-radius: calc(20px * var(--diya-corner-scale, 1));
  background: color-mix(in srgb, var(--diya-color-raised) 62%, transparent);
  backdrop-filter: blur(28px) saturate(1.15);
}
.sign-up-header { display: grid; gap: var(--diya-space-2); }
.sign-up-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-bottom: var(--diya-space-4);
  border-radius: calc(12px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent);
  color: var(--diya-color-accent-text);
  font-size: var(--diya-text-title);
  font-weight: 650;
  line-height: 1;
}
.sign-up-title {
  margin: 0;
  font-size: var(--diya-text-heading);
  font-weight: 600;
  line-height: var(--diya-leading-tight);
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.sign-up-title:focus { outline: none; }
.sign-up-lede,
.sign-up-hint { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.sign-up-strong { color: var(--diya-color-text); font-weight: 600; overflow-wrap: anywhere; }
.sign-up-wide { width: 100%; }
.sign-up-logo { width: 20px; height: 20px; flex-shrink: 0; margin-inline-end: 2px; }
.sign-up-github { fill: currentColor; fill: light-dark(#000, #fff); }
.sign-up-google-sweep {
  width: 100%;
  height: 100%;
  background: conic-gradient(from 45deg at 48.864% 49.26%, #ff4641 0deg, #ff4641 4.14555deg, #3186ff 39.154deg, #3186ff 72.0044deg,
    #00a5b7 96.7463deg, #0ebc5f 120.897deg, #0ebc5f 154.722deg, #6cc400 179.136deg, #fc0 203.588deg, #ffd314 226.915deg,
    #fc0 251.688deg, #ff6a2b 273.129deg, #fd4641 289.305deg, #ff4641 359.593deg);
}
.sign-up-or { display: flex; align-items: center; gap: var(--diya-space-3); margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: 1; }
.sign-up-or::before,
.sign-up-or::after { content: ''; flex: 1; border-top: 1px solid var(--diya-color-line); }
.sign-up-password { display: grid; gap: var(--diya-space-2); }
.sign-up-meter { margin-top: var(--diya-space-1); }
.sign-up-password .sign-up-hint { font-size: var(--diya-text-caption); }
.sign-up-legal { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: var(--diya-leading-body); text-align: center; text-wrap: balance; }
.sign-up-link { padding: 0; border: 0; background: none; font: inherit; font-size: var(--diya-text-body); font-variant-numeric: tabular-nums; cursor: pointer; }
.sign-up-link[aria-disabled='true'] { color: var(--diya-color-muted); text-decoration: none; cursor: default; }
.sign-up-footer {
  margin: 0;
  padding-top: var(--diya-space-5);
  border-top: 1px solid var(--diya-color-line);
  color: var(--diya-color-muted);
  font-size: var(--diya-text-body);
  line-height: 2;
  text-align: center;
}
.sign-up-aside {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--diya-space-7);
  margin: var(--diya-space-3);
  padding: var(--diya-space-8) clamp(var(--diya-space-6), 6vw, 96px) var(--diya-space-7);
  border-radius: calc(20px * var(--diya-corner-scale, 1));
  background: var(--diya-color-recessed);
}
.sign-up[data-glass] .sign-up-aside { background: none; }
.sign-up-aside-body { display: grid; gap: var(--diya-space-6); max-width: 440px; margin-block: auto; }
.sign-up-aside-title {
  margin: 0;
  font-size: var(--diya-text-display);
  font-weight: 600;
  line-height: var(--diya-leading-tight);
  letter-spacing: -0.025em;
  text-wrap: balance;
}
.sign-up-points { display: grid; gap: var(--diya-space-5); margin: 0; padding: 0; list-style: none; }
.sign-up-point { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: var(--diya-space-4); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.sign-up-point > svg { margin-top: 2px; color: var(--diya-color-muted); }
.sign-up-point > span,
.sign-up-quote-by > span { display: grid; gap: 2px; }
.sign-up-point-text { color: var(--diya-color-muted); text-wrap: pretty; }
.sign-up-quote { display: grid; gap: var(--diya-space-4); max-width: 440px; margin: 0; }
.sign-up-quote-text { margin: 0; font-size: var(--diya-text-large); line-height: var(--diya-leading-body); text-wrap: pretty; }
.sign-up-quote-by { display: flex; align-items: center; gap: var(--diya-space-3); font-size: var(--diya-text-caption); }
@media (max-width: 1023px) {
  .sign-up { grid-template-columns: minmax(0, 1fr); }
  .sign-up-aside { display: none; }
}
@media (max-width: 520px) {
  .sign-up-main {
    place-items: start stretch;
    padding: var(--diya-space-7) max(var(--diya-space-5), env(safe-area-inset-right)) max(var(--diya-space-6), env(safe-area-inset-bottom))
      max(var(--diya-space-5), env(safe-area-inset-left));
  }
  .sign-up-form { max-width: none; }
  .sign-up[data-glass] .sign-up-main { margin: 0; border: 0; border-radius: 0; }
}
@media (prefers-reduced-transparency: reduce) {
  .sign-up[data-glass] .sign-up-main { background: var(--diya-color-raised); backdrop-filter: none; }
}
`

'use client'
// Sign in: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/sign-in/page.tsx. Vite: save as src/SignIn.tsx and render it inside your DiyaProvider.
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { Alert, Button, Choice, Form, Inline, Stack, TextInput, TextLink } from '@idyeah/diya'
import { ArrowLeft, ArrowRight, LucideProvider } from 'lucide-react'

// Your product, and what the demo account shows.
const PRODUCT = 'Lintel'
const PHONE_ENDING = '42'
const RESEND_AFTER = 30

type Route = '/session' | '/session/code' | '/session/code/resend' | '/session/email-link' | '/session/google' | '/session/github' | '/session/end' | '/password/reset'

// Replace with your API call. The stub waits a moment, then turns down the
// password `wrong` and the code 000000. Everything else goes through.
async function api(route: Route, body: Record<string, string | boolean> = {}) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  if (route === '/session') return body.password !== 'wrong'
  if (route === '/session/code') return body.code !== '000000'
  return true
}

type Step = 'sign-in' | 'forgot' | 'emailed' | 'code' | 'done'
type Sent = 'reset' | 'link'
type StepProps = { email: string; setEmail: (email: string) => void; go: (step: Step) => void; titleRef: Ref<HTMLHeadingElement> }

const emailProblem = (email: string) =>
  !email.trim()
    ? 'Enter your email address.'
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? undefined
      : 'Enter an email address like name@example.com.'

export default function SignInScreen() {
  const [step, setStep] = useState<Step>('sign-in')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState<Sent>('reset')
  const titleRef = useRef<HTMLHeadingElement>(null)
  const shown = useRef(step)

  useEffect(() => {
    if (shown.current === step) return
    shown.current = step
    titleRef.current?.focus()
  }, [step])

  const shared: StepProps = { email, setEmail, go: setStep, titleRef }
  const emailed = (kind: Sent) => {
    setSent(kind)
    setStep('emailed')
  }

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <main className="sign-in">
        <style>{css}</style>
        {step === 'sign-in' && <SignInStep {...shared} onEmailed={emailed} />}
        {step === 'forgot' && <ForgotStep {...shared} onEmailed={emailed} />}
        {step === 'emailed' && <EmailedStep {...shared} kind={sent} />}
        {step === 'code' && <CodeStep {...shared} />}
        {step === 'done' && <DoneStep {...shared} />}
      </main>
    </LucideProvider>
  )
}

function SignInStep({ email, setEmail, go, titleRef, onEmailed }: StepProps & { onEmailed: (kind: Sent) => void }) {
  const [password, setPassword] = useState('')
  const [keep, setKeep] = useState<string[]>([])
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState<'password' | 'link' | 'google' | 'github'>()
  const emailField = useRef<HTMLInputElement>(null)
  const passwordField = useRef<HTMLInputElement>(null)
  const focus = useFocusAfterRender()

  async function signIn() {
    const found = { email: emailProblem(email), password: password ? undefined : 'Enter your password.' }
    setErrors(found)
    setFailed(false)
    if (found.email || found.password) return focus(found.email ? emailField.current : passwordField.current)
    setBusy('password')
    const ok = await api('/session', { email, password, remember: keep.length > 0 })
    if (ok) return go('code')
    setBusy(undefined)
    setFailed(true)
    setPassword('')
    focus(passwordField.current)
  }

  async function emailLink() {
    if (busy) return
    const problem = emailProblem(email)
    setErrors({ email: problem })
    setFailed(false)
    if (problem) return focus(emailField.current)
    setBusy('link')
    await api('/session/email-link', { email })
    onEmailed('link')
  }

  async function continueWith(provider: 'google' | 'github') {
    if (busy) return
    setBusy(provider)
    // A real Google or GitHub sign-in sends the browser to the provider here.
    await api(`/session/${provider}`)
    go('done')
  }

  return (
    <Panel
      heading={`Sign in to ${PRODUCT}`}
      lede="Welcome back. Pick up where you left off."
      titleRef={titleRef}
      busy={busy !== undefined}
      onSubmit={signIn}
      footer={<>New here? <TextLink href="/sign-up" inline>Create an account</TextLink></>}
    >
      <Stack gap={3}>
        <Button variant="outline" className="sign-in-wide" loading={busy === 'google'} onClick={() => continueWith('google')}>
          <GoogleLogo /> Continue with Google
        </Button>
        <Button variant="outline" className="sign-in-wide" loading={busy === 'github'} onClick={() => continueWith('github')}>
          <GitHubLogo /> Continue with GitHub
        </Button>
      </Stack>
      <p className="sign-in-or">or</p>
      <Stack gap={4}>
        {failed && (
          <Alert tone="error" urgent title="That email and password don’t match." action={{ label: 'Reset your password', onClick: () => go('forgot') }}>
            Check for typos and caps lock, then try again.
          </Alert>
        )}
        <TextInput ref={emailField} label="Email" type="email" autoComplete="username" value={email} error={errors.email}
          onValueChange={(value) => { setEmail(value); setErrors({ ...errors, email: undefined }) }} />
        <TextInput ref={passwordField} label="Password" type="password" autoComplete="current-password" value={password} error={errors.password}
          onValueChange={(value) => { setPassword(value); setErrors({ ...errors, password: undefined }) }} />
        <Inline justify="between" gap={3}>
          <Choice multiple hideLabel label="Session" options={[{ value: 'keep', label: 'Keep me signed in' }]} value={keep} onValueChange={setKeep} />
          <LinkButton onClick={() => go('forgot')}>Forgot password?</LinkButton>
        </Inline>
      </Stack>
      <Stack gap={3}>
        <Button type="submit" className="sign-in-wide" loading={busy === 'password'}>Sign in</Button>
        <Button variant="quiet" className="sign-in-wide" loading={busy === 'link'} onClick={emailLink}>
          Email me a sign-in link instead
        </Button>
      </Stack>
    </Panel>
  )
}

function ForgotStep({ email, setEmail, go, titleRef, onEmailed }: StepProps & { onEmailed: (kind: Sent) => void }) {
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const field = useRef<HTMLInputElement>(null)
  const focus = useFocusAfterRender()

  async function send() {
    const problem = emailProblem(email)
    setError(problem)
    if (problem) return focus(field.current)
    setBusy(true)
    await api('/password/reset', { email })
    onEmailed('reset')
  }

  return (
    <Panel
      heading="Reset your password"
      lede="It happens. Enter the email you sign in with, and we’ll send you a link to choose a new one."
      titleRef={titleRef}
      busy={busy}
      onSubmit={send}
    >
      <TextInput ref={field} label="Email" type="email" autoComplete="email" value={email} error={error}
        onValueChange={(value) => { setEmail(value); setError(undefined) }} />
      <Stack gap={3}>
        <Button type="submit" className="sign-in-wide" loading={busy}>Send reset link</Button>
        <Button variant="quiet" className="sign-in-wide" onClick={() => go('sign-in')}>
          <ArrowLeft /> Back to sign in
        </Button>
      </Stack>
    </Panel>
  )
}

function EmailedStep({ email, go, titleRef, kind }: StepProps & { kind: Sent }) {
  const [wait, restart] = useCooldown()
  const [busy, setBusy] = useState(false)
  const [again, setAgain] = useState(false)
  const what = kind === 'reset' ? 'reset link' : 'sign-in link'

  async function resend() {
    if (wait > 0) return
    setBusy(true)
    await api(kind === 'reset' ? '/password/reset' : '/session/email-link', { email })
    setBusy(false)
    setAgain(true)
    restart()
  }

  return (
    <Panel
      heading="Check your email"
      lede={
        <>
          We sent {again ? 'another' : 'a'} {what} to <strong className="sign-in-strong">{email}</strong>.{' '}
          {kind === 'reset' ? 'It works for the next hour.' : 'It works once, for the next 15 minutes.'}
        </>
      }
      titleRef={titleRef}
      busy={busy}
      onSubmit={resend}
      footer={
        <>
          Still nothing?{' '}
          <LinkButton type="submit" disabled={busy || wait > 0}>
            {wait > 0 ? `Resend in ${countdown(wait)}` : busy ? 'Sending…' : `Resend the ${what}`}
          </LinkButton>
        </>
      }
    >
      <p className="sign-in-hint">Not there yet? Give it a minute, and check your spam folder.</p>
      <Button variant="outline" className="sign-in-wide" onClick={() => go('sign-in')}>
        <ArrowLeft /> Back to sign in
      </Button>
    </Panel>
  )
}

function CodeStep({ go, titleRef }: StepProps) {
  const [recovery, setRecovery] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState<'verify' | 'resend'>()
  const [resent, setResent] = useState(false)
  const [wait, restart] = useCooldown()
  const field = useRef<HTMLInputElement>(null)
  const focus = useFocusAfterRender()

  async function verify() {
    const problem = recovery
      ? code.trim() ? undefined : 'Enter one of your recovery codes.'
      : code.length === 6 ? undefined : 'Enter all 6 digits of the code.'
    setError(problem)
    if (problem) return focus(field.current)
    setBusy('verify')
    const ok = await api('/session/code', { code })
    if (ok) return go('done')
    setBusy(undefined)
    setError(recovery ? 'That recovery code didn’t work. Check it and try again.' : 'That code didn’t work. Check the latest text, or send a new code.')
    setCode('')
    focus(field.current)
  }

  async function resend() {
    if (busy || wait > 0) return
    setBusy('resend')
    await api('/session/code/resend')
    setBusy(undefined)
    setResent(true)
    restart()
    focus(field.current)
  }

  function switchMode() {
    setRecovery(!recovery)
    setCode('')
    setError(undefined)
    focus(field.current)
  }

  return (
    <Panel
      heading="One more step"
      lede={
        recovery
          ? 'Enter one of the recovery codes you saved when you turned on two-step sign-in.'
          : `We texted a ${resent ? 'new ' : ''}6-digit code to your phone number ending in ${PHONE_ENDING}.`
      }
      titleRef={titleRef}
      busy={busy !== undefined}
      onSubmit={verify}
      footer={<>Wrong account? <LinkButton onClick={() => go('sign-in')}>Back to sign in</LinkButton></>}
    >
      <TextInput
        ref={field}
        size="large"
        label={recovery ? 'Recovery code' : 'Verification code'}
        inputMode={recovery ? 'text' : 'numeric'}
        autoComplete={recovery ? 'off' : 'one-time-code'}
        autoCapitalize="none"
        spellCheck={false}
        maxLength={recovery ? 32 : 6}
        value={code}
        error={error}
        onValueChange={(value) => {
          setCode(recovery ? value : value.replace(/\D/g, '').slice(0, 6))
          setError(undefined)
        }}
      />
      <Stack gap={4}>
        <Button type="submit" className="sign-in-wide" loading={busy === 'verify'}>Continue</Button>
        <Inline justify="center" gap={4}>
          {!recovery && (
            <LinkButton onClick={resend} disabled={busy === 'resend' || wait > 0}>
              {wait > 0 ? `Resend code in ${countdown(wait)}` : busy === 'resend' ? 'Sending…' : 'Resend code'}
            </LinkButton>
          )}
          <LinkButton onClick={switchMode}>{recovery ? 'Use a text message code' : 'Use a recovery code instead'}</LinkButton>
        </Inline>
      </Stack>
    </Panel>
  )
}

function DoneStep({ go, titleRef }: StepProps) {
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    await api('/session/end')
    go('sign-in')
  }

  return (
    <Panel
      heading="You’re in."
      lede={`Welcome back to ${PRODUCT}. Your drafts missed you.`}
      titleRef={titleRef}
      busy={busy}
      onSubmit={signOut}
      footer={<>Not you? <LinkButton type="submit">Sign out</LinkButton></>}
    >
      <Button href="/" className="sign-in-wide">
        Open your workspace <ArrowRight />
      </Button>
    </Panel>
  )
}

type PanelProps = { heading: string; lede: ReactNode; titleRef: Ref<HTMLHeadingElement>; busy: boolean; onSubmit: () => void; footer?: ReactNode; children: ReactNode }

function Panel(props: PanelProps) {
  const id = useId()
  return (
    <Form className="sign-in-card" aria-labelledby={id} noValidate loading={props.busy} actions={null} onSubmit={props.onSubmit}>
      <header className="sign-in-header">
        <span className="sign-in-mark" aria-hidden="true">{PRODUCT[0]}</span>
        <h1 id={id} ref={props.titleRef} tabIndex={-1} className="sign-in-title">{props.heading}</h1>
        <p className="sign-in-lede" role="status">{props.lede}</p>
      </header>
      {props.children}
      {props.footer && <p className="sign-in-footer">{props.footer}</p>}
    </Form>
  )
}

function LinkButton(props: { type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <TextLink asChild inline>
      <button
        type={props.type ?? 'button'}
        className="sign-in-link"
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
    <svg className="sign-in-logo" viewBox="10 10 20 20" aria-hidden="true" focusable="false">
      <mask id={`${id}-g`} maskUnits="userSpaceOnUse" x="10" y="10" width="20" height="20">
        <path fill="#fff" d="M29.3987 18.1814H19.9849V22.0445H25.3598C25.1286 23.294 24.4294 24.3596 23.3676 25.0712C22.4746 25.6716 21.3266 26.0211 19.9849 26.0211C17.3864 26.0211 15.1823 24.2666 14.3947 21.9004C14.1952 21.2989 14.0853 20.6599 14.0853 19.9983C14.0853 19.3367 14.1952 18.6966 14.3947 18.0962C15.1823 15.7311 17.3864 13.9755 19.9849 13.9755C21.4524 13.9755 22.767 14.4816 23.8039 15.4713L26.6653 12.6057C24.936 10.9908 22.6786 10 19.9849 10C16.0832 10 12.705 12.2414 11.0618 15.5076C10.383 16.8592 10 18.3834 10 19.9994C10 21.6155 10.383 23.1396 11.0618 24.4913C12.705 27.7597 16.0832 30 19.9849 30C22.6797 30 24.9485 29.1137 26.6018 27.5861C28.4887 25.8452 29.5732 23.2702 29.5732 20.2275C29.5732 19.5182 29.5131 18.835 29.3987 18.1825V18.1814Z" />
      </mask>
      <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="1" />
      </filter>
      <g mask={`url(#${id}-g)`}>
        <g filter={blur}>
          <foreignObject x="6" y="6" width="28" height="28">
            <div className="sign-in-google-sweep" />
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
    <svg className="sign-in-logo sign-in-github" viewBox="0 0 98 96" aria-hidden="true" focusable="false">
      <path d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z" />
    </svg>
  )
}

const css = `
.sign-in { min-height: 100dvh; display: grid; place-items: center; padding: var(--diya-space-7) var(--diya-space-4); color: var(--diya-color-text); }
.sign-in-card { width: 100%; max-width: 432px; margin: 0; padding: var(--diya-space-6); gap: var(--diya-space-5); }
.sign-in-header { display: grid; gap: var(--diya-space-2); }
.sign-in-mark {
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
.sign-in-title {
  margin: 0;
  font-size: var(--diya-text-heading);
  font-weight: 600;
  line-height: var(--diya-leading-tight);
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.sign-in-title:focus { outline: none; }
.sign-in-lede,
.sign-in-hint { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.sign-in-strong { color: var(--diya-color-text); font-weight: 600; overflow-wrap: anywhere; }
.sign-in-wide { width: 100%; }
.sign-in-logo { width: 20px; height: 20px; flex-shrink: 0; margin-inline-end: 2px; }
.sign-in-github { fill: currentColor; fill: light-dark(#000, #fff); }
.sign-in-google-sweep {
  width: 100%;
  height: 100%;
  background: conic-gradient(from 45deg at 48.864% 49.26%, #ff4641 0deg, #ff4641 4.14555deg, #3186ff 39.154deg, #3186ff 72.0044deg,
    #00a5b7 96.7463deg, #0ebc5f 120.897deg, #0ebc5f 154.722deg, #6cc400 179.136deg, #fc0 203.588deg, #ffd314 226.915deg,
    #fc0 251.688deg, #ff6a2b 273.129deg, #fd4641 289.305deg, #ff4641 359.593deg);
}
.sign-in-or { display: flex; align-items: center; gap: var(--diya-space-3); margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: 1; }
.sign-in-or::before,
.sign-in-or::after { content: ''; flex: 1; border-top: 1px solid var(--diya-color-line); }
.sign-in-link { padding: 0; border: 0; background: none; font: inherit; font-size: var(--diya-text-body); font-variant-numeric: tabular-nums; cursor: pointer; }
.sign-in-link[aria-disabled='true'] { color: var(--diya-color-muted); text-decoration: none; cursor: default; }
.sign-in-footer {
  margin: 0;
  padding-top: var(--diya-space-5);
  border-top: 1px solid var(--diya-color-line);
  color: var(--diya-color-muted);
  font-size: var(--diya-text-body);
  text-align: center;
}
@media (max-width: 520px) {
  .sign-in { place-items: stretch; padding: 0; }
  .sign-in-card {
    max-width: none;
    min-height: 100dvh;
    align-content: start;
    padding: var(--diya-space-7) max(var(--diya-space-4), env(safe-area-inset-right)) max(var(--diya-space-6), env(safe-area-inset-bottom))
      max(var(--diya-space-4), env(safe-area-inset-left));
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
}
`

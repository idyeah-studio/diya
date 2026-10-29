'use client'
// Account settings: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/settings/page.tsx. Vite: save as src/Settings.tsx and render it inside your DiyaProvider.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Avatar, Button, Card, Choice, CodeBlock, Combobox, Dialog, FileUpload, Form, Inline, List, Select, SideNavigation, Stack, Switch, Tag, TextInput, Toast, type AlertTone } from '@idyeah/diya'
import { Bell, Camera, Check, CreditCard, Laptop, LucideProvider, Monitor, Palette, Shield, Smartphone, Tablet, UserRound, Users } from 'lucide-react'

// Your product, the person signed in, and what the demo account shows.
const PRODUCT = 'Mullion'
const WORKSPACE = 'Bramble & Finch'
const ME = { name: 'Priya Natarajan', email: 'priya@example.com', zone: 'Europe/Lisbon', photo: '' }
const PASSWORD_CHANGED = 'March 14, 2026'
const SETUP_KEY = 'JBSW Y3DP EHPK 3PXP'

const ZONES = [
  ['America/Los_Angeles', 'Pacific Time, Los Angeles'], ['America/Denver', 'Mountain Time, Denver'], ['America/Chicago', 'Central Time, Chicago'],
  ['America/New_York', 'Eastern Time, New York'], ['America/Sao_Paulo', 'Brasília Time, São Paulo'], ['Europe/London', 'United Kingdom, London'],
  ['Europe/Lisbon', 'Portugal, Lisbon'], ['Europe/Berlin', 'Central European Time, Berlin'], ['Africa/Lagos', 'West Africa Time, Lagos'],
  ['Africa/Nairobi', 'East Africa Time, Nairobi'], ['Asia/Dubai', 'Gulf Time, Dubai'], ['Asia/Kolkata', 'India Time, Kolkata'],
  ['Asia/Singapore', 'Singapore Time'], ['Asia/Tokyo', 'Japan Time, Tokyo'], ['Australia/Sydney', 'Australian Eastern Time, Sydney'],
].map(([value, label]) => ({ value, label }))

const SESSIONS = [
  { id: 'laptop', device: 'MacBook Air', app: 'Safari', where: 'Lisbon, Portugal', when: 'Right now', icon: <Laptop />, current: true },
  { id: 'phone', device: 'iPhone', app: `${PRODUCT} for iOS`, where: 'Lisbon, Portugal', when: 'Active 2 hours ago', icon: <Smartphone /> },
  { id: 'desktop', device: 'Windows desktop', app: 'Chrome', where: 'Porto, Portugal', when: 'Active Nov 3', icon: <Monitor /> },
  { id: 'tablet', device: 'iPad', app: 'Safari', where: 'Madrid, Spain', when: 'Active Oct 18', icon: <Tablet /> },
]

const CHANNELS = [
  { id: 'email', title: 'Email', description: `Sent to ${ME.email}.`, items: [
    { id: 'email-mentions', label: 'Mentions and replies', on: true },
    { id: 'email-reviews', label: 'Review requests', on: true },
    { id: 'email-digest', label: 'Weekly summary', hint: 'Monday mornings, in your time zone.', on: true },
    { id: 'email-news', label: 'Product news', hint: 'A few times a year. We’re not chatty.', on: false },
  ] },
  { id: 'push', title: 'Push', description: `On your phone, through the ${PRODUCT} app.`, items: [
    { id: 'push-mentions', label: 'Mentions and replies', on: true },
    { id: 'push-reviews', label: 'Review requests', on: false },
    { id: 'push-due', label: 'Due dates', hint: 'The morning something is due.', on: true },
  ] },
  { id: 'desktop', title: 'Desktop', description: `In this browser, while ${PRODUCT} is open.`, items: [
    { id: 'desktop-mentions', label: 'Mentions and replies', on: true },
    { id: 'desktop-sound', label: 'Play a sound', on: false },
  ] },
]

// Accent presets: hex values for your provider's brandColor. An empty value keeps DIYA's neutral ink.
const ACCENTS = [
  { value: '', label: 'Graphite' },
  { value: '#0A7CFF', label: 'Ocean' },
  { value: '#1FA855', label: 'Jade' },
  { value: '#FF6A1A', label: 'Ember' },
  { value: '#FF375F', label: 'Rose' },
  { value: '#F5A300', label: 'Saffron' },
]

type Section = 'profile' | 'security' | 'notifications' | 'appearance'
const SECTIONS: { value: Section; label: string; icon: ReactNode; lede: string }[] = [
  { value: 'profile', label: 'Profile', icon: <UserRound />, lede: `How your teammates see you around ${PRODUCT}.` },
  { value: 'security', label: 'Security', icon: <Shield />, lede: 'Your password, two-step sign-in, and everywhere you’re signed in.' },
  { value: 'notifications', label: 'Notifications', icon: <Bell />, lede: 'What reaches you, and where.' },
  { value: 'appearance', label: 'Appearance', icon: <Palette />, lede: `How ${PRODUCT} looks on this device.` },
]
const WORKSPACE_LINKS = [
  { value: 'billing', label: 'Billing & plan', href: '/settings/billing', icon: <CreditCard /> },
  { value: 'team', label: 'Team', href: '/settings/team', icon: <Users /> },
]

type Route = '/me' | '/me/password' | '/me/two-step' | '/me/sessions/end' | '/me/notifications' | '/me/delete'

// Replace with your API call. The stub waits a moment, then turns down the
// email taken@example.com, the current password `wrong` and the code 000000.
// Everything else goes through.
async function api(route: Route, body: Record<string, unknown> = {}) {
  await new Promise((resolve) => setTimeout(resolve, 800))
  if (route === '/me') return body.email !== 'taken@example.com'
  if (route === '/me/password') return body.current !== 'wrong'
  if (route === '/me/two-step') return body.code !== '000000'
  return true
}

type Notice = { tone: AlertTone; title: string; text: string }
type Notify = (notice: Notice) => void

const emailProblem = (email: string) =>
  !email.trim() ? 'Enter your email address.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : 'Enter an email address like name@example.com.'
const timeIn = (zone: string) => new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(new Date())

export default function SettingsScreen() {
  const [section, setSection] = useState<Section>('profile')
  const [deleted, setDeleted] = useState(false)
  const [notice, setNotice] = useState<Notice & { id: number }>()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const shown = useRef<string>(section)
  const current = SECTIONS.find((item) => item.value === section) ?? SECTIONS[0]
  const notify: Notify = (next) => setNotice({ ...next, id: Date.now() })

  useEffect(() => {
    // Opens the section the address names, such as /settings#security.
    const asked = SECTIONS.find((item) => `#${item.value}` === window.location.hash)
    if (asked) setSection(asked.value)
  }, [])

  useEffect(() => {
    const view = deleted ? 'deleted' : section
    if (shown.current === view) return
    shown.current = view
    titleRef.current?.focus()
  }, [section, deleted])

  function choose(value: string) {
    setSection(value as Section)
    window.history.replaceState(null, '', `#${value}`)
  }

  const panes: Record<Section, ReactNode> = {
    profile: <Profile notify={notify} onDeleted={() => setDeleted(true)} />,
    security: <Security notify={notify} />,
    notifications: <Notifications />,
    appearance: <Appearance />,
  }
  const workspace = (className: string) => (
    <SideNavigation className={className} label="Workspace settings" value="" groups={[{ id: 'workspace', label: 'Workspace', items: WORKSPACE_LINKS }]} />
  )

  if (deleted)
    return (
      <LucideProvider size={18} strokeWidth={1.6}>
        <style>{css}</style>
        <main className="settings-gone">
          <span className="settings-mark" aria-hidden="true">{PRODUCT[0]}</span>
          <h1 ref={titleRef} tabIndex={-1} className="settings-heading">Your account is deleted</h1>
          <p className="settings-lede">We’ll hold on to it for 30 days in case you change your mind. Sign in before December 9 to bring it back. After that, it’s gone for good.</p>
          <Button href="/">Back to the start</Button>
        </main>
      </LucideProvider>
    )

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <div className="settings">
        <a className="settings-skip" href="#settings-main">Skip to content</a>
        <header className="settings-side">
          <p className="settings-brand">
            <span className="settings-mark" aria-hidden="true">{PRODUCT[0]}</span>
            {PRODUCT}
          </p>
          <h1 className="settings-title">Settings</h1>
          <SideNavigation
            className="settings-nav"
            label="Account settings"
            value={section}
            onValueChange={choose}
            groups={[{ id: 'account', label: 'Account', items: SECTIONS.map(({ value, label, icon }) => ({ value, label, icon, href: `#${value}` })) }]}
          />
          {workspace('settings-nav')}
          <Select className="settings-picker" label="Settings section" hideLabel leadingIcon={current.icon} options={SECTIONS} value={section} onValueChange={choose} />
        </header>

        <main className="settings-main" id="settings-main" tabIndex={-1}>
          <div className="settings-column">
            <header className="settings-head">
              <h2 ref={titleRef} tabIndex={-1} className="settings-heading">{current.label}</h2>
              <p className="settings-lede">{current.lede}</p>
            </header>
            {SECTIONS.map(({ value }) => (
              <div key={value} className="settings-pane" hidden={section !== value}>{panes[value]}</div>
            ))}
            {workspace('settings-nav settings-more')}
          </div>
        </main>

        {notice && (
          <Toast key={notice.id} tone={notice.tone} title={notice.title} duration={6000} onDismiss={() => setNotice(undefined)}>
            {notice.text}
          </Toast>
        )}
      </div>
    </LucideProvider>
  )
}

function Profile({ notify, onDeleted }: { notify: Notify; onDeleted: () => void }) {
  const [saved, setSaved] = useState(ME)
  const [draft, setDraft] = useState(ME)
  const [errors, setErrors] = useState<{ name?: string; email?: string; zone?: string }>({})
  const [busy, setBusy] = useState(false)
  const nameField = useRef<HTMLInputElement>(null)
  const emailField = useRef<HTMLInputElement>(null)
  const zoneField = useRef<HTMLInputElement>(null)
  const focus = useFocusAfterRender()
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  const edit = (field: keyof typeof ME, value: string) => {
    setDraft({ ...draft, [field]: value })
    setErrors({ ...errors, [field]: undefined })
  }

  async function save() {
    const found = { name: draft.name.trim() ? undefined : 'Enter your name.', email: emailProblem(draft.email), zone: draft.zone ? undefined : 'Choose your time zone.' }
    setErrors(found)
    if (found.name || found.email || found.zone) return focus((found.name ? nameField : found.email ? emailField : zoneField).current)
    setBusy(true)
    const ok = await api('/me', draft)
    setBusy(false)
    if (!ok) {
      setErrors({ email: `That email is already on another ${PRODUCT} account.` })
      return focus(emailField.current)
    }
    setSaved(draft)
    notify({
      tone: 'success',
      title: 'Profile saved',
      text: draft.email === saved.email ? 'Your teammates see the changes right away.' : `Check ${draft.email} for a link to confirm your new email.`,
    })
  }

  return (
    <Stack gap={7}>
      <Form
        aria-label="Profile"
        noValidate
        loading={busy}
        onSubmit={save}
        actions={
          <>
            <p className="settings-status" role="status">{dirty ? 'You have unsaved changes.' : ''}</p>
            <Button variant="quiet" disabled={!dirty || busy} onClick={() => { setDraft(saved); setErrors({}) }}>Discard</Button>
            <Button type="submit" disabled={!dirty} loading={busy}>Save changes</Button>
          </>
        }
      >
        <div className="settings-person">
          <Avatar name={draft.name.trim() || saved.name} src={draft.photo || undefined} size="large" />
          <Inline gap={2}>
            <PhotoDialog onPick={(photo) => edit('photo', photo)} />
            {draft.photo && <Button variant="quiet" size="small" onClick={() => edit('photo', '')}>Remove</Button>}
          </Inline>
        </div>
        <TextInput ref={nameField} label="Full name" autoComplete="name" value={draft.name} error={errors.name} onValueChange={(value) => edit('name', value)} />
        <TextInput ref={emailField} label="Email" type="email" autoComplete="email" helperText="We’ll send a link to confirm a new address."
          value={draft.email} error={errors.email} onValueChange={(value) => edit('email', value)} />
        <Combobox ref={zoneField} label="Time zone" options={ZONES} helperText={draft.zone ? `It’s ${timeIn(draft.zone)} there now.` : undefined}
          value={draft.zone} error={errors.zone} onValueChange={(value) => edit('zone', value)} />
      </Form>
      <DeleteAccount email={saved.email} onDeleted={onDeleted} />
    </Stack>
  )
}

function PhotoDialog({ onPick }: { onPick: (url: string) => void }) {
  const [files, setFiles] = useState<File[]>([])
  return (
    <Dialog
      trigger={<Button variant="outline" size="small"><Camera /> Change photo</Button>}
      title="Change your photo"
      headingLevel={2}
      description="A square photo works best. It shows next to your comments and in the team list."
      confirmLabel="Use this photo"
      confirmDisabled={files.length === 0}
      onOpenChange={(open) => open && setFiles([])}
      onConfirm={() => onPick(URL.createObjectURL(files[0]))}
    >
      <FileUpload files={files} onFilesChange={setFiles} accept="image/png,image/jpeg,image/webp" maxBytes={5 * 1024 * 1024}
        title="Choose a photo" chooseLabel="Choose photo" helperText="PNG, JPG or WebP, up to 5 MB." />
    </Dialog>
  )
}

function DeleteAccount({ email, onDeleted }: { email: string; onDeleted: () => void }) {
  const [typed, setTyped] = useState('')
  const id = useId()
  return (
    <section className="settings-danger" aria-labelledby={id}>
      <div className="settings-danger-copy">
        <h3 id={id} className="settings-subheading">Delete your account</h3>
        <p className="settings-note">Your profile, drafts and sign-in go for good. Projects you’ve shared stay with {WORKSPACE}.</p>
      </div>
      <Dialog
        trigger={<Button variant="outline">Delete account</Button>}
        title="Delete your account?"
        headingLevel={2}
        description={`We keep it for 30 days in case you change your mind, then it’s gone for good. Projects you’ve shared stay with ${WORKSPACE}.`}
        confirmLabel="Delete my account"
        confirmVariant="destructive"
        confirmDisabled={typed.trim().toLowerCase() !== email}
        onOpenChange={(open) => open && setTyped('')}
        onConfirm={async () => {
          await api('/me/delete')
          onDeleted()
        }}
      >
        <TextInput label={`To confirm, type ${email}`} autoComplete="off" autoCapitalize="none" spellCheck={false} value={typed} onValueChange={setTyped} />
      </Dialog>
    </section>
  )
}

function Security({ notify }: { notify: Notify }) {
  const [changed, setChanged] = useState(PASSWORD_CHANGED)
  const [twoStep, setTwoStep] = useState(false)
  const [asking, setAsking] = useState<'on' | 'off'>()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string>()
  const [sessions, setSessions] = useState(SESSIONS)
  const [ending, setEnding] = useState<string>()
  const list = useRef<HTMLUListElement>(null)
  const codeField = useRef<HTMLInputElement>(null)
  const focus = useFocusAfterRender()
  const others = sessions.filter((session) => !session.current)

  async function signOut(ids: string[]) {
    setEnding(ids.length > 1 ? 'all' : ids[0])
    await api('/me/sessions/end', { ids })
    setEnding(undefined)
    setSessions(sessions.filter((session) => !ids.includes(session.id)))
    focus(list.current)
    const one = sessions.find((session) => session.id === ids[0])
    notify({ tone: 'success', title: ids.length > 1 ? 'Signed out everywhere else' : `Signed out of ${one?.device}`, text: 'Anyone using it will need your password to get back in.' })
  }

  async function turnOn() {
    const ok = code.length === 6 && (await api('/me/two-step', { code }))
    if (!ok) {
      setCodeError(code.length === 6 ? 'That code didn’t match. Codes change every 30 seconds, so try the newest one.' : 'Enter all 6 digits from your app.')
      setCode('')
      focus(codeField.current)
      return false
    }
    setTwoStep(true)
    notify({ tone: 'success', title: 'Two-step sign-in is on', text: 'Next time you sign in on a new device, keep your authenticator app handy.' })
  }

  return (
    <Stack gap={6}>
      <Card
        title="Password"
        description={`Last changed ${changed}.`}
        footer={<PasswordDialog onChanged={() => {
          setChanged('today')
          notify({ tone: 'success', title: 'Password changed', text: 'Use your new password the next time you sign in.' })
        }} />}
      />

      <Card title="Two-step sign-in" description="Asks for a code from your authenticator app when you sign in on a new device.">
        <Switch
          label="Ask for a code when I sign in"
          helperText={twoStep ? 'On. Your account is a lot harder to get into.' : 'Off. Your password is all it takes.'}
          checked={twoStep}
          onCheckedChange={(on) => {
            setCode('')
            setCodeError(undefined)
            setAsking(on ? 'on' : 'off')
          }}
        />
      </Card>
      <Dialog
        open={asking === 'on'}
        onOpenChange={(open) => !open && setAsking(undefined)}
        title="Turn on two-step sign-in"
        headingLevel={2}
        description="Add this setup key to your authenticator app, then enter the 6-digit code it shows."
        confirmLabel="Turn on"
        onConfirm={turnOn}
      >
        <Stack gap={4}>
          <CodeBlock label="Setup key" code={SETUP_KEY} />
          <TextInput ref={codeField} label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} error={codeError}
            onValueChange={(value) => { setCode(value.replace(/\D/g, '').slice(0, 6)); setCodeError(undefined) }} />
        </Stack>
      </Dialog>
      <Dialog
        open={asking === 'off'}
        onOpenChange={(open) => !open && setAsking(undefined)}
        title="Turn off two-step sign-in?"
        headingLevel={2}
        description="Then your password is the only thing standing between someone and your account. We’d keep it on."
        confirmLabel="Turn off"
        confirmVariant="destructive"
        onConfirm={async () => {
          await api('/me/two-step', { off: true })
          setTwoStep(false)
          notify({ tone: 'info', title: 'Two-step sign-in is off', text: 'You can turn it back on here anytime.' })
        }}
      />

      <Card
        title="Where you’re signed in"
        description="Don’t recognize one? Sign it out, then change your password."
        footer={others.length > 1 && (
          <Button variant="outline" loading={ending === 'all'} onClick={() => signOut(others.map((session) => session.id))}>Sign out of all other devices</Button>
        )}
      >
        <List
          ref={list}
          tabIndex={-1}
          className="settings-sessions"
          label="Signed-in devices"
          divided
          items={sessions.map((session) => ({
            id: session.id,
            label: `${session.device}, ${session.app}`,
            description: `${session.where} · ${session.when}`,
            leading: session.icon,
            trailing: session.current ? (
              <Tag size="small" tone="success" leading="dot">This device</Tag>
            ) : (
              <Button size="small" variant="outline" loading={ending === session.id} aria-label={`Sign out of ${session.device}`} onClick={() => signOut([session.id])}>Sign out</Button>
            ),
          }))}
        />
      </Card>
    </Stack>
  )
}

function PasswordDialog({ onChanged }: { onChanged: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [errors, setErrors] = useState<{ current?: string; next?: string }>({})
  const currentField = useRef<HTMLInputElement>(null)
  const nextField = useRef<HTMLInputElement>(null)
  const focus = useFocusAfterRender()

  async function change() {
    const found = { current: current ? undefined : 'Enter your current password.', next: next.length >= 12 ? undefined : 'Use at least 12 characters.' }
    setErrors(found)
    if (found.current || found.next) {
      focus((found.current ? currentField : nextField).current)
      return false
    }
    if (!(await api('/me/password', { current, next }))) {
      setErrors({ current: 'That isn’t your current password. Check caps lock and try again.' })
      setCurrent('')
      focus(currentField.current)
      return false
    }
    onChanged()
  }

  return (
    <Dialog
      trigger={<Button variant="outline">Change password</Button>}
      title="Change your password"
      headingLevel={2}
      description="You’ll stay signed in here. Other devices keep working until they sign in again."
      confirmLabel="Change password"
      onOpenChange={(open) => {
        if (!open) return
        setCurrent('')
        setNext('')
        setErrors({})
      }}
      onConfirm={change}
    >
      <Stack gap={4}>
        <TextInput ref={currentField} label="Current password" type="password" autoComplete="current-password" value={current} error={errors.current}
          onValueChange={(value) => { setCurrent(value); setErrors({ ...errors, current: undefined }) }} />
        <TextInput ref={nextField} label="New password" type="password" autoComplete="new-password" helperText="At least 12 characters. A short sentence is easy to remember."
          value={next} error={errors.next} onValueChange={(value) => { setNext(value); setErrors({ ...errors, next: undefined }) }} />
      </Stack>
    </Dialog>
  )
}

function Notifications() {
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(CHANNELS.flatMap((channel) => channel.items.map((item) => [item.id, item.on]))))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  async function toggle(id: string, value: boolean) {
    setOn((now) => ({ ...now, [id]: value }))
    setStatus('saving')
    await api('/me/notifications', { [id]: value })
    setStatus('saved')
  }

  return (
    <Stack gap={6}>
      <p className="settings-saved" role="status">
        {status === 'saved' && <Check />}
        {status === 'idle' ? 'Changes save as you go.' : status === 'saving' ? 'Saving…' : 'Saved.'}
      </p>
      {CHANNELS.map((channel) => (
        <Card key={channel.id} title={channel.title} description={channel.description}>
          <Stack gap={5}>
            {channel.items.map((item) => (
              <Switch key={item.id} label={item.label} helperText={item.hint} checked={on[item.id]} onCheckedChange={(value) => toggle(item.id, value)} />
            ))}
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}

// Display only: this screen shows the choice but doesn't change your app. To
// make it real, keep `theme` and `accent` in your app's state (or the user's
// saved settings) and pass them to the provider at your app's root, as its
// props: theme={theme} brandColor={accent || undefined}.
function Appearance() {
  const [theme, setTheme] = useState('system')
  const [accent, setAccent] = useState('')
  const name = useId()
  const picked = ACCENTS.find((item) => item.value === accent) ?? ACCENTS[0]

  return (
    <Stack gap={6}>
      <Card title="Theme" description="Applies to this device only.">
        <Choice
          label="Theme"
          hideLabel
          value={theme}
          onValueChange={setTheme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'Match my device', description: 'Light by day, dark by night, if your device does that.' },
          ]}
        />
      </Card>
      <Card title="Accent color" description="Fills buttons, switches and the things that want your attention.">
        <fieldset className="settings-swatch-set">
          <legend className="settings-hidden">Accent color</legend>
          <div className="settings-swatches">
            {ACCENTS.map((item) => (
              <label key={item.label} className="settings-swatch">
                <input type="radio" name={name} value={item.value} checked={accent === item.value} onChange={() => setAccent(item.value)} />
                <span className="settings-dot" style={item.value ? { background: item.value } : undefined} aria-hidden="true">
                  {accent === item.value && <Check size={16} strokeWidth={2.4} />}
                </span>
                <span className="settings-hidden">{item.label}</span>
              </label>
            ))}
          </div>
          <p className="settings-note" aria-hidden="true">{picked.label}{picked.value ? '' : ', the default'}</p>
        </fieldset>
      </Card>
    </Stack>
  )
}

function useFocusAfterRender() {
  const [target, setTarget] = useState<{ node: HTMLElement | null }>()
  useEffect(() => target?.node?.focus(), [target])
  return (node: HTMLElement | null) => setTarget({ node })
}

const css = `
.settings { min-height: 100dvh; display: grid; grid-template-columns: 272px minmax(0, 1fr); color: var(--diya-color-text); }
.settings-skip { position: absolute; z-index: 10; top: var(--diya-space-3); left: var(--diya-space-4); padding: var(--diya-space-2) var(--diya-space-4); border-radius: var(--diya-radius-control); background: var(--diya-color-raised); color: var(--diya-color-text); font-size: var(--diya-text-body); }
.settings-skip:not(:focus) { width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.settings-side { position: sticky; top: 0; display: flex; flex-direction: column; gap: var(--diya-space-5); height: 100dvh; box-sizing: border-box; overflow-y: auto; padding: var(--diya-space-6) var(--diya-space-4); }
.settings-brand { display: flex; align-items: center; gap: var(--diya-space-3); margin: 0; padding: 0 var(--diya-space-3); font-size: var(--diya-text-large); font-weight: 600; }
.settings-mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: calc(10px * var(--diya-corner-scale, 1)); background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-large); font-weight: 650; line-height: 1; }
.settings-title,
.settings-heading { margin: 0; font-size: var(--diya-text-heading); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; }
.settings-title { margin-top: var(--diya-space-5); padding: 0 var(--diya-space-3); }
.settings-heading:focus,
.settings-main:focus,
.settings-sessions:focus { outline: none; }
.settings-nav { width: auto; padding: 0; border: 0; background: transparent; backdrop-filter: none; }
.settings-picker,
.settings-more { display: none; }
.settings-main { min-width: 0; padding: 112px var(--diya-space-7) var(--diya-space-8); border-left: 1px solid var(--diya-color-line); }
.settings-column { max-width: 960px; margin-inline: auto; }
.settings-head,
.settings-pane { max-width: 640px; }
.settings-head { display: grid; gap: var(--diya-space-2); margin-bottom: var(--diya-space-6); }
.settings-pane[hidden] { display: none; }
.settings-lede,
.settings-note { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.settings-person { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-4); }
.settings-status { flex: 1 1 auto; align-self: center; margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.settings-danger { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-4) var(--diya-space-5); padding-top: var(--diya-space-6); border-top: 1px solid var(--diya-color-line); }
.settings-danger-copy { display: grid; flex: 1 1 320px; gap: var(--diya-space-1); }
.settings-subheading { margin: 0; font-size: var(--diya-text-large); font-weight: 600; line-height: var(--diya-leading-tight); }
.settings-saved { display: flex; align-items: center; gap: var(--diya-space-2); min-height: 22px; margin: calc(var(--diya-space-3) * -1) 0 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.settings-swatch-set { display: grid; gap: var(--diya-space-3); min-width: 0; margin: 0; padding: 0; border: 0; }
.settings-swatches { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); }
.settings-swatch { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; }
.settings-swatch input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: pointer; }
.settings-swatch:has(input:checked) { box-shadow: inset 0 0 0 2px var(--diya-color-text); }
.settings-swatch:has(input:focus-visible) { outline: 2px solid var(--diya-color-text); outline-offset: 2px; }
.settings-dot { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--diya-color-text); color: var(--diya-color-surface); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--diya-color-text) 16%, transparent); pointer-events: none; }
.settings-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.settings-gone { min-height: 100dvh; display: grid; place-content: center; justify-items: start; gap: var(--diya-space-4); max-width: 480px; margin: 0 auto; padding: var(--diya-space-7) var(--diya-space-5); color: var(--diya-color-text); }
.settings-gone .settings-mark { margin-bottom: var(--diya-space-3); }
@media (max-width: 860px) {
  .settings { grid-template-columns: minmax(0, 1fr); }
  .settings-side { position: static; height: auto; overflow: visible; gap: var(--diya-space-4); padding: var(--diya-space-5) var(--diya-space-4) 0; }
  .settings-brand,
  .settings-title { padding: 0; }
  .settings-title { margin-top: var(--diya-space-3); }
  .settings-side .settings-nav { display: none; }
  .settings-picker { display: block; }
  .settings-main { padding: var(--diya-space-6) var(--diya-space-4) var(--diya-space-7); border-left: 0; }
  .settings-status { flex-basis: 100%; }
  .settings-more { display: block; max-width: 640px; margin-top: var(--diya-space-7); }
}
`

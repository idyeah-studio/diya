'use client'
// Onboarding wizard: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/onboarding/page.tsx. Vite: save as src/Onboarding.tsx and render it inside your DiyaProvider.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Button, Choice, Form, List, Tag, TextInput, Wizard } from '@idyeah/diya'
import { ArrowRight, Globe, LayoutTemplate, LucideProvider, Plus, Send } from 'lucide-react'

// Your product, who is signed in, and the choices each step offers.
const PRODUCT = 'Lintel'
const ADDRESS = 'lintel.example.com/'
const ME = { first: 'Maya', email: 'maya.okafor@example.com' }
const ROLES = [
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'product', label: 'Product' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'leadership', label: 'Running the place' },
]
const SIZES = [
  { value: '1', label: 'Just me' },
  { value: '2-10', label: '2 to 10' },
  { value: '11-50', label: '11 to 50' },
  { value: '51-200', label: '51 to 200' },
  { value: '200+', label: 'More than 200' },
]
const TEMPLATES = [
  { value: 'client', label: 'Client projects', description: 'A brief, a timeline, meeting notes and a decisions log for each client.' },
  { value: 'product', label: 'Product team', description: 'A roadmap, specs, release notes and a weekly update.' },
  { value: 'handbook', label: 'Team handbook', description: 'How you work, who does what, and a first-week guide for new people.' },
  { value: 'blank', label: 'Start blank', description: 'One empty page, and plenty of room.' },
]

type Route = '/workspaces/check' | '/workspaces'

// Replace with your API call. The stub waits a moment, then reports the URL
// acme as taken. Everything else goes through.
async function api(route: Route, body: Record<string, unknown> = {}) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  if (route === '/workspaces/check') return body.url !== 'acme'
  return true
}

type Errors = { name?: string; url?: string; invite?: string; template?: string }

const slugify = (text: string) =>
  text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 40)
const isEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
const listed = (emails: string[]) =>
  emails.length <= 2 ? emails.join(' and ') : `${emails.slice(0, 2).join(', ')} and ${emails.length - 2} more`

export default function OnboardingScreen() {
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [urlEdited, setUrlEdited] = useState(false)
  const [role, setRole] = useState('')
  const [size, setSize] = useState('')
  const [draft, setDraft] = useState('')
  const [invites, setInvites] = useState<string[]>([])
  const [template, setTemplate] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const fields = { name: useRef<HTMLInputElement>(null), url: useRef<HTMLInputElement>(null), invite: useRef<HTMLInputElement>(null), template: useRef<HTMLInputElement>(null) }
  const focus = useFocusAfterRender()
  const slug = url.replace(/-+$/, '')

  function fail(found: Errors) {
    setErrors(found)
    const first = (['name', 'url', 'invite', 'template'] as const).find((key) => found[key])
    if (first) focus(fields[first].current)
    return Boolean(first)
  }

  // Adds every address in the field; stops at the first one that can't go in.
  function addInvites() {
    const next = [...invites]
    const parts = draft.split(/[\s,;]+/).filter(Boolean)
    for (const [index, part] of parts.entries()) {
      const email = part.toLowerCase()
      const problem = !isEmail(email)
        ? `“${part}” isn’t a full email address. Try one like name@example.com.`
        : email === ME.email
          ? 'That’s you, and you’re already in.'
          : next.includes(email)
            ? `You’ve already added ${email}.`
            : undefined
      if (problem) {
        setInvites(next)
        setDraft(parts.slice(index).join(', '))
        return !fail({ invite: problem })
      }
      next.push(email)
    }
    setInvites(next)
    setDraft('')
    setErrors({})
    return true
  }

  function onInviteKey(event: KeyboardEvent<HTMLInputElement>) {
    // Enter and comma add the address here, instead of moving to the next step.
    if (event.key !== 'Enter' && event.key !== ',') return
    event.preventDefault()
    if (draft.trim()) addInvites()
  }

  async function changeStep(next: number) {
    if (next < active) return setActive(next)
    if (active === 0) {
      const found: Errors = {
        name: name.trim() ? undefined : 'Give your workspace a name.',
        url: !slug ? 'Choose a URL for your workspace.' : slug.length < 3 ? 'Use at least 3 characters.' : undefined,
      }
      if (fail(found)) return
      setBusy(true)
      const free = await api('/workspaces/check', { url: slug })
      setBusy(false)
      if (!free) return fail({ url: `${ADDRESS}${slug} is taken. Try ${slug}-team, or something else.` })
    }
    if (active === 2 && draft.trim() && !addInvites()) return
    setErrors({})
    setActive(next)
  }

  async function finish() {
    if (!template) return fail({ template: 'Pick one to start with. Start blank counts.' })
    setBusy(true)
    await api('/workspaces', { name, url: slug, role, size, invites, template })
    setBusy(false)
    setDone(true)
  }

  const steps = [
    {
      id: 'workspace',
      label: 'Name',
      title: 'Name your workspace',
      description: `Welcome to ${PRODUCT}, ${ME.first}. This is where your team’s docs and plans will live. You can rename it any time.`,
      content: (
        <div className="onboarding-fields">
          <TextInput ref={fields.name} label="Workspace name" helperText="Your team or company name works well." autoComplete="organization" value={name} error={errors.name}
            onValueChange={(value) => {
              setName(value)
              if (!urlEdited) setUrl(slugify(value))
              setErrors({})
            }} />
          <TextInput ref={fields.url} label="Workspace URL" leadingIcon={<Globe />} autoCapitalize="none" autoComplete="off" spellCheck={false} maxLength={40}
            value={url} error={errors.url} helperText={`Your address: ${ADDRESS}${slug || 'your-team'}`}
            onValueChange={(value) => {
              setUrl(slugify(value))
              setUrlEdited(value !== '')
              setErrors({})
            }} />
        </div>
      ),
    },
    {
      id: 'about',
      label: 'You',
      title: 'Tell us a little about you',
      description: 'We’ll suggest pages that fit how you work. Rather not say? Skip it.',
      content: (
        <div className="onboarding-pair">
          <Choice label="What do you do?" options={ROLES} value={role} onValueChange={setRole} />
          <Choice label="How big is your team?" options={SIZES} value={size} onValueChange={setSize} />
        </div>
      ),
    },
    {
      id: 'team',
      label: 'Team',
      title: 'Invite your teammates',
      description: 'Docs are better with company. Invites go out when you finish, and everyone joins as a member.',
      content: (
        <div className="onboarding-fields">
          <div className="onboarding-invite">
            <TextInput ref={fields.invite} label="Email addresses" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false}
              placeholder="name@example.com" value={draft} error={errors.invite}
              helperText={errors.invite ? undefined : 'Press Enter after each one, or paste a few at once.'}
              onKeyDown={onInviteKey} onValueChange={(value) => { setDraft(value); setErrors({}) }} />
            <Button variant="outline" className="onboarding-add" disabled={!draft.trim()} onClick={addInvites}>
              <Plus /> Add
            </Button>
          </div>
          <ul className="onboarding-tags" aria-label="People to invite">
            {invites.map((email) => (
              <li key={email}>
                <Tag onRemove={() => { setInvites(invites.filter((item) => item !== email)); focus(fields.invite.current) }}>{email}</Tag>
              </li>
            ))}
          </ul>
          <p className="onboarding-sr" role="status">{invites.length ? `${invites.length === 1 ? '1 person' : `${invites.length} people`} to invite.` : ''}</p>
        </div>
      ),
    },
    {
      id: 'template',
      label: 'Template',
      title: 'Pick a starting point',
      description: 'A template gives you a few ready-made pages. Rename, change or delete any of them later.',
      content: (
        <Choice ref={fields.template} label="Templates" hideLabel options={TEMPLATES} value={template} error={errors.template}
          onValueChange={(value) => { setTemplate(value); setErrors({}) }} />
      ),
    },
  ]

  const skippable = (active === 1 && !role && !size) || (active === 2 && invites.length === 0 && !draft.trim())

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="onboarding">
        <style>{css}</style>
        <header className="onboarding-bar">
          <span className="onboarding-mark" aria-hidden="true">{PRODUCT[0]}</span>
          <span className="onboarding-product">{PRODUCT}</span>
        </header>
        <main className="onboarding-main">
          {done ? (
            <Done name={name.trim()} slug={slug} invites={invites} template={TEMPLATES.find((item) => item.value === template)?.label ?? ''} />
          ) : (
            <Wizard
              className="onboarding-wizard"
              label="Set up your workspace"
              headingLevel={1}
              steps={steps}
              activeStep={active}
              onStepChange={changeStep}
              onComplete={finish}
              loading={busy}
              nextLabel={skippable ? 'Skip for now' : 'Continue'}
              completeLabel="Create workspace"
            />
          )}
        </main>
      </div>
    </LucideProvider>
  )
}

function Done({ name, slug, invites, template }: { name: string; slug: string; invites: string[]; template: string }) {
  const id = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  return (
    <Form className="onboarding-done" aria-labelledby={id} actions={null} onSubmit={() => undefined}>
      <header className="onboarding-done-header">
        <h1 id={id} ref={heading} tabIndex={-1} className="onboarding-title">{name} is ready</h1>
        <p className="onboarding-lede" role="status">
          {invites.length ? 'Your invites are on their way. Here’s what we set up.' : 'Here’s what we set up. You can invite people whenever you like.'}
        </p>
      </header>
      <List
        className="onboarding-summary"
        label="What we set up"
        divided
        items={[
          { id: 'url', leading: <Globe />, label: `${ADDRESS}${slug}`, description: 'Your workspace address' },
          { id: 'template', leading: <LayoutTemplate />, label: template, description: template === 'Start blank' ? 'One empty page to begin with' : 'Ready-made pages, waiting for your words' },
          {
            id: 'invites',
            leading: <Send />,
            label: invites.length ? `${invites.length} ${invites.length === 1 ? 'invite' : 'invites'} sent` : 'No invites yet',
            description: invites.length ? listed(invites) : 'Invite people from Settings, or from any doc',
          },
        ]}
      />
      <Button href="/" className="onboarding-wide">
        Open {name} <ArrowRight />
      </Button>
    </Form>
  )
}

function useFocusAfterRender() {
  const [target, setTarget] = useState<{ node: HTMLElement | null }>()
  useEffect(() => target?.node?.focus(), [target])
  return (node: HTMLElement | null) => setTarget({ node })
}

const css = `
.onboarding { min-height: 100dvh; display: flex; flex-direction: column; color: var(--diya-color-text); }
.onboarding-bar { display: flex; align-items: center; gap: var(--diya-space-3); padding: var(--diya-space-5) var(--diya-space-6); }
.onboarding-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: calc(10px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent);
  color: var(--diya-color-accent-text);
  font-size: var(--diya-text-large);
  font-weight: 650;
  line-height: 1;
}
.onboarding-product { font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; }
.onboarding-main { flex: 1; display: grid; align-content: start; justify-items: center; padding: var(--diya-space-6) var(--diya-space-4) var(--diya-space-8); }
.onboarding-wizard { padding: var(--diya-space-6); }
.onboarding-fields { display: grid; gap: var(--diya-space-5); }
.onboarding-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: var(--diya-space-5) var(--diya-space-6); }
.onboarding-invite { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--diya-space-3); align-items: start; }
.onboarding-add { margin-top: calc(var(--diya-text-body) * var(--diya-leading-body) + var(--diya-space-2)); }
.onboarding-tags { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); margin: 0; padding: 0; list-style: none; }
.onboarding-tags:empty { display: none; }
.onboarding-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.onboarding-done { width: 100%; max-width: 560px; margin: 0; padding: var(--diya-space-6); gap: var(--diya-space-5); }
.onboarding-done-header { display: grid; gap: var(--diya-space-2); }
.onboarding-title {
  margin: 0;
  font-size: var(--diya-text-heading);
  font-weight: 600;
  line-height: var(--diya-leading-tight);
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.onboarding-title:focus { outline: none; }
.onboarding-lede { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.onboarding-summary { max-width: none; }
.onboarding-wide { width: 100%; }
@media (max-width: 600px) {
  .onboarding-bar { padding: var(--diya-space-4) var(--diya-space-5); }
  .onboarding-main { display: flex; flex-direction: column; padding: 0; }
  .onboarding-wizard,
  .onboarding-done {
    max-width: none;
    flex: 1;
    margin: 0;
    align-content: start;
    padding: var(--diya-space-5) max(var(--diya-space-5), env(safe-area-inset-right)) max(var(--diya-space-6), env(safe-area-inset-bottom))
      max(var(--diya-space-5), env(safe-area-inset-left));
    border-width: 1px 0 0;
    border-radius: 0;
    box-shadow: none;
  }
  .onboarding-invite { grid-template-columns: minmax(0, 1fr); }
  .onboarding-add { margin-top: 0; justify-self: start; }
}
`

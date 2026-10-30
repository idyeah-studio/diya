'use client'
// API keys & integrations: a DIYA screen. Install: npm i @idyeah/diya lucide-react echarts@6
// Next.js: save as app/settings/api-keys/page.tsx. Vite: save as src/ApiKeys.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  Alert, Avatar, Badge, Button, Card, Choice, ContentState, Dialog, List, Select, Tabs, Tag, TextInput, TextLink, Toast,
  type AlertTone, type TableColumn, Table,
} from '@idyeah/diya'
import { DataViz } from '@idyeah/diya/charts'
import { Check, Copy, KeyRound, LucideProvider, Plus, Send, Server, Webhook } from 'lucide-react'

// Your product and who's signed in.
const PRODUCT = 'Postwick'
const USER = 'Ravi Menon'

type Env = 'live' | 'test'
type Key = { id: string; name: string; last4: string; created: string; lastUsed: string; scopes: string[]; expires: string; revoked?: string }
type Status = 'healthy' | 'failing' | 'pending'
type Endpoint = { id: string; url: string; events: string[]; status: Status; delivered: number[]; failed: number[]; error?: string }
type Integration = { id: string; name: string; monogram: string; text: string; connected?: string; setup?: boolean }

const SCOPES = [
  { value: 'send', label: 'Send email', description: 'Send messages and use your templates.' },
  { value: 'events', label: 'Read events', description: 'Delivery, open, click and bounce events.' },
  { value: 'domains', label: 'Manage domains', description: 'Add and verify sending domains.' },
]
const SCOPE_TAGS: Record<string, string> = { send: 'Send', events: 'Events', domains: 'Domains' }
const EXPIRY = [
  { value: '30', label: 'In 30 days' },
  { value: '90', label: 'In 90 days' },
  { value: '365', label: 'In a year' },
  { value: 'never', label: 'Never' },
]
const EVENTS = [
  { value: 'email.delivered', label: 'email.delivered', description: 'The receiving server accepted it.' },
  { value: 'email.bounced', label: 'email.bounced', description: 'It couldn’t be delivered.' },
  { value: 'email.opened', label: 'email.opened', description: 'Someone opened it.' },
  { value: 'email.complained', label: 'email.complained', description: 'Someone marked it as spam.' },
]
const shortDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const fullDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
// The last seven days, ending today. The chart only renders in the browser, after you open Webhooks.
const lastWeek = () => Array.from({ length: 7 }, (_, i) => shortDate(new Date(Date.now() - (6 - i) * 86_400_000)))

// Production starts with keys, endpoints and two connected apps. The sandbox starts empty.
const KEYS: Key[] = [
  { id: 'k1', name: 'Billing worker', last4: '4f2a', created: 'Aug 14, 2026', lastUsed: '2 minutes ago', scopes: ['send', 'events'], expires: 'Never' },
  { id: 'k2', name: 'Marketing site forms', last4: '9c71', created: 'Sep 2, 2026', lastUsed: 'Yesterday', scopes: ['send'], expires: 'in 5 weeks' },
  { id: 'k3', name: 'Warehouse sync', last4: 'e03b', created: 'Oct 5, 2026', lastUsed: '3 days ago', scopes: ['events'], expires: 'Never' },
  { id: 'k4', name: 'Old staging server', last4: '71d8', created: 'Mar 9, 2026', lastUsed: 'Last month', scopes: ['send', 'domains'], expires: 'Never', revoked: 'Oct 2, 2026' },
]
const ENDPOINTS: Endpoint[] = [
  { id: 'w1', url: 'https://hooks.example.com/postwick', events: ['email.delivered', 'email.bounced', 'email.complained'], status: 'healthy',
    delivered: [1840, 2120, 960, 870, 2310, 2475, 1290], failed: [4, 2, 0, 1, 3, 6, 2] },
  { id: 'w2', url: 'https://crm.example.com/webhooks/email-events', events: ['email.opened'], status: 'failing', error: '503 Service Unavailable',
    delivered: [612, 655, 301, 288, 702, 214, 0], failed: [3, 1, 0, 2, 4, 498, 377] },
]
const INTEGRATIONS: Integration[] = [
  { id: 'fernhollow', name: 'Fernhollow CRM', monogram: 'FC', text: 'Add bounces and unsubscribes to contact records.', connected: 'Connected Sep 12' },
  { id: 'ashgrove', name: 'Ashgrove Helpdesk', monogram: 'AH', text: 'Open a ticket when a customer’s email bounces.' },
  { id: 'pebblestack', name: 'Pebblestack', monogram: 'PS', text: 'Stream every email event into your data warehouse.', setup: true },
  { id: 'lanternfish', name: 'Lanternfish Chat', monogram: 'LC', text: 'Post delivery alerts to a team channel.', connected: 'Connected Oct 3' },
  { id: 'corvane', name: 'Corvane Forms', monogram: 'CF', text: 'Send a receipt when someone submits a form.' },
  { id: 'tallowby', name: 'Tallowby Books', monogram: 'TB', text: 'Email invoices straight from your accounting.' },
]

const wait = (ms = 900) => new Promise((resolve) => setTimeout(resolve, ms))
const randomKey = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('')

// Replace with your API calls. Each waits a moment. A key can't reuse a name,
// localhost can't receive webhooks, and the failing endpoint fails its test.
async function createKey(env: Env, name: string, keys: Key[]) {
  await wait()
  if (keys.some((key) => !key.revoked && key.name.toLowerCase() === name.toLowerCase())) throw new Error(`You already have a key called “${name}”. Pick another name.`)
  return `sk_${env}_${randomKey()}`
}
async function revokeKey(id: string) { await wait(); return id }
async function addEndpoint(url: string) {
  await wait()
  if (/^https:\/\/(localhost|127\.|0\.0\.0\.0)/.test(url)) throw new Error('We can’t reach localhost from the internet. Use a public URL, or a tunnel to your machine.')
}
async function sendTest(endpoint: Endpoint) { await wait(1100); return endpoint.status !== 'failing' }
async function setConnection(id: string, on: boolean, settings: Record<string, string> = {}) { await wait(); void settings; return { id, on } }

type Notice = { id: number; tone: AlertTone; title: string; text: string }

export default function ApiKeysScreen() {
  const [env, setEnv] = useState<Env>('live')
  const [tab, setTab] = useState('keys')
  const [keys, setKeys] = useState<Record<Env, Key[]>>({ live: KEYS, test: [] })
  const [endpoints, setEndpoints] = useState<Record<Env, Endpoint[]>>({ live: ENDPOINTS, test: [] })
  const [notice, setNotice] = useState<Notice>()
  const notify = (tone: AlertTone, title: string, text: string) => setNotice({ id: Date.now(), tone, title, text })
  const failing = endpoints[env].filter((e) => e.status === 'failing').length

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="api-keys">
        <style>{css}</style>
        <header className="api-keys-bar">
          <a className="api-keys-brand" href="/">
            <span className="api-keys-mark" aria-hidden="true">{PRODUCT[0]}</span>
            {PRODUCT}
          </a>
          <Avatar name={USER} size="small" />
        </header>
        <main className="api-keys-main">
          <header className="api-keys-head">
            <div className="api-keys-heading">
              <h1 className="api-keys-title">Developers</h1>
              <p className="api-keys-lede">
                Keys, webhooks and connected apps for the {PRODUCT} API. <TextLink href="/docs" inline>Read the docs</TextLink>
              </p>
            </div>
            <Select className="api-keys-env" label="Environment" hideLabel leadingIcon={<Server />} value={env}
              options={[{ value: 'live', label: 'Production' }, { value: 'test', label: 'Sandbox' }]} onValueChange={(value) => setEnv(value as Env)} />
          </header>
          <Tabs className="api-keys-tabs" label="Developer settings" value={tab} onValueChange={setTab} items={[
            { value: 'keys', label: 'API keys', content: (
              <KeysPanel key={env} env={env} keys={keys[env]} onChange={(next) => setKeys({ ...keys, [env]: next })} notify={notify} />
            ) },
            { value: 'webhooks', label: 'Webhooks', badge: failing ? { variant: 'count', count: failing, tone: 'error', label: 'failing' } : undefined,
              // Mounted only while open, so the chart measures a visible box.
              content: tab === 'webhooks' && <WebhooksPanel key={env} endpoints={endpoints[env]} onChange={(next) => setEndpoints({ ...endpoints, [env]: next })} notify={notify} /> },
            { value: 'integrations', label: 'Integrations', content: <IntegrationsPanel notify={notify} /> },
          ]} />
        </main>
        {notice && (
          <Toast key={notice.id} tone={notice.tone} title={notice.title} onDismiss={() => setNotice(undefined)} duration={6000}>{notice.text}</Toast>
        )}
      </div>
    </LucideProvider>
  )
}

type Notify = (tone: AlertTone, title: string, text: string) => void

function KeysPanel({ env, keys, onChange, notify }: { env: Env; keys: Key[]; onChange: (keys: Key[]) => void; notify: Notify }) {
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<Key>()
  const masked = (key: Key) => `sk_${env}_…${key.last4}`

  const expiresText = (k: Key) => `Expires ${k.expires === 'Never' ? 'never' : k.expires.replace(/, \d{4}$/, '')}`
  const revokedTag = (k: Key) => <Tag size="small" leading="dot" tone="error">Revoked {k.revoked?.replace(/, \d{4}$/, '')}</Tag>
  const columns: TableColumn<Key>[] = [
    { key: 'name', label: 'Name', width: 260, sortValue: (k) => k.name, render: (k) => (
      <span className="api-keys-who" data-revoked={k.revoked ? true : undefined}>
        <strong>{k.name}</strong>
        <span className="api-keys-mono" aria-hidden="true">{masked(k)}</span>
        <span className="api-keys-sr">{env === 'live' ? 'Live' : 'Sandbox'} key ending {k.last4}</span>
      </span>
    ) },
    { key: 'scopes', label: 'Scopes', width: 200, render: (k) => (
      <span className="api-keys-scopes">{k.scopes.map((s) => <Tag key={s} size="small">{SCOPE_TAGS[s]}</Tag>)}</span>
    ) },
    { key: 'created', label: 'Created', width: 140, render: (k) => k.created },
    { key: 'used', label: 'Last used', width: 140, render: (k) => k.lastUsed },
    { key: 'status', label: 'Status', width: 150, render: (k) => k.revoked ? revokedTag(k) : <span className="api-keys-muted">{expiresText(k)}</span> },
    { key: 'actions', label: 'Actions', width: 110, numeric: true, render: (k) => !k.revoked && (
      <Button variant="quiet" size="small" onClick={() => setRevoking(k)} aria-label={`Revoke ${k.name}`}>Revoke</Button>
    ) },
  ]

  return (
    <section className="api-keys-panel" aria-labelledby="api-keys-keys">
      <PanelHead id="api-keys-keys" title="API keys"
        text="Your servers use these to send mail. Treat them like passwords: keep them out of your code and your browser."
        action={keys.length > 0 && <Button onClick={() => setCreating(true)}><Plus /> Create key</Button>} />
      {keys.length ? (
        <>
          <div className="api-keys-desk">
            <Table className="api-keys-table" label="API keys" showTitle={false} rows={keys} columns={columns} rowLabel={(k) => k.name} pagination={false} />
          </div>
          {/* Phones get the same keys as stacked rows, so no column is cut off. */}
          <ul className="api-keys-rows" aria-label="API keys">
            {keys.map((k) => (
              <li key={k.id} className="api-keys-row" data-revoked={k.revoked ? true : undefined}>
                <span className="api-keys-row-text">
                  <strong className="api-keys-row-name">{k.name}</strong>
                  <span className="api-keys-row-meta">
                    <span className="api-keys-mono" aria-hidden="true">{masked(k)}</span>
                    <span className="api-keys-sr">{env === 'live' ? 'Live' : 'Sandbox'} key ending {k.last4}</span>
                    {' · '}{k.scopes.map((s) => SCOPE_TAGS[s]).join(', ')}
                  </span>
                  <span className="api-keys-row-meta">Used {k.lastUsed.toLowerCase()}{k.revoked ? '' : ` · ${expiresText(k).toLowerCase()}`}</span>
                </span>
                {k.revoked ? revokedTag(k) : <Button variant="outline" size="small" onClick={() => setRevoking(k)} aria-label={`Revoke ${k.name}`}>Revoke</Button>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ContentState className="api-keys-empty" headingLevel={3} icon={<KeyRound />} title={`No ${env === 'test' ? 'sandbox ' : ''}keys yet`}
          description="Create one to start sending. Sandbox keys send to a test inbox, so nobody gets an email by accident."
          action={{ label: 'Create key', onClick: () => setCreating(true) }} />
      )}
      <CreateKeyDialog open={creating} env={env} keys={keys} onOpenChange={setCreating}
        onCreated={(key) => onChange([key, ...keys])} />
      <Dialog open={revoking !== undefined} onOpenChange={(open) => !open && setRevoking(undefined)} size="small"
        title={`Revoke “${revoking?.name ?? ''}”?`} confirmLabel="Revoke key" confirmVariant="destructive"
        description={revoking && `Anything still using ${masked(revoking)} stops working right away. You can’t undo this.`}
        onConfirm={async () => {
          if (!revoking) return
          await revokeKey(revoking.id)
          onChange(keys.map((k) => (k.id === revoking.id ? { ...k, revoked: fullDate(new Date()) } : k)))
          notify('success', 'Key revoked', `${revoking.name} no longer works. Requests that use it get a 401.`)
        }}>
        {revoking?.lastUsed.includes('minute') && (
          <Alert tone="warning">This key was used {revoking.lastUsed}. Make sure its replacement is live first.</Alert>
        )}
      </Dialog>
    </section>
  )
}

function CreateKeyDialog({ open, env, keys, onOpenChange, onCreated }: {
  open: boolean; env: Env; keys: Key[]; onOpenChange: (open: boolean) => void; onCreated: (key: Key) => void
}) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>(['send'])
  const [expiry, setExpiry] = useState('90')
  const [errors, setErrors] = useState<{ name?: string; scopes?: string }>({})
  const [busy, setBusy] = useState(false)
  const [secret, setSecret] = useState<string>()
  const nameField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setScopes(['send'])
    setExpiry('90')
    setErrors({})
    setSecret(undefined)
    requestAnimationFrame(() => nameField.current?.focus())
  }, [open])

  async function create(event: FormEvent) {
    event.preventDefault()
    const found = { name: name.trim() ? undefined : 'Give the key a name you’ll recognize later.', scopes: scopes.length ? undefined : 'Pick at least one scope.' }
    setErrors(found)
    if (found.name) return nameField.current?.focus()
    if (found.scopes) return
    setBusy(true)
    try {
      const full = await createKey(env, name.trim(), keys)
      const days = Number(expiry)
      const expires = expiry === 'never' ? 'Never' : fullDate(new Date(Date.now() + days * 86_400_000))
      onCreated({ id: full, name: name.trim(), last4: full.slice(-4), created: fullDate(new Date()), lastUsed: 'Never', scopes, expires })
      setSecret(full)
    } catch (error) {
      setErrors({ name: (error as Error).message })
      nameField.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={secret ? 'Copy your new key' : 'Create an API key'}
      description={secret ? `${name.trim()} is ready.` : `For ${env === 'live' ? 'production' : 'the sandbox'}. You choose what it can do.`}
      footer={secret ? (
        <Button onClick={() => onOpenChange(false)}>Done</Button>
      ) : (
        <div className="api-keys-dialog-actions">
          <Button variant="quiet" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="api-keys-create" loading={busy}>Create key</Button>
        </div>
      )}>
      {secret ? (
        <div className="api-keys-stack">
          <Alert tone="warning" title="You won’t see this again">
            Copy it now and keep it in your secrets manager. If you lose it, revoke it and create a new one.
          </Alert>
          <CopyField label="Secret key" value={secret} />
        </div>
      ) : (
        <form id="api-keys-create" className="api-keys-stack" noValidate onSubmit={create}>
          <TextInput ref={nameField} label="Name" autoComplete="off" value={name} error={errors.name} helperText={errors.name ? undefined : 'Like “Billing worker” or “Signup form”.'}
            onValueChange={(value) => { setName(value); setErrors({ ...errors, name: undefined }) }} />
          <Choice multiple label="Scopes" options={SCOPES} value={scopes} error={errors.scopes}
            onValueChange={(value) => { setScopes(value); setErrors({ ...errors, scopes: undefined }) }} />
          <Select label="Expires" options={EXPIRY} value={expiry} onValueChange={setExpiry} />
        </form>
      )}
    </Dialog>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState<boolean>()
  const field = useRef<HTMLInputElement>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(undefined), 2400)
    } catch {
      field.current?.select()
      setCopied(false)
    }
  }

  return (
    <div className="api-keys-copy">
      <TextInput ref={field} className="api-keys-copy-field" label={label} value={value} readOnly spellCheck={false}
        onFocus={(event) => event.currentTarget.select()}
        helperText={copied === false ? 'Couldn’t reach your clipboard. The key is selected, so press Ctrl+C or ⌘C.' : undefined} />
      <Button variant="outline" onClick={copy} aria-label={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}>
        {copied ? <><Check /> Copied</> : <><Copy /> Copy</>}
      </Button>
      <span className="api-keys-sr" role="status">{copied ? 'Copied to your clipboard.' : ''}</span>
    </div>
  )
}

const STATUS: Record<Status, { text: string; tone: 'success' | 'error' | 'neutral' }> = {
  healthy: { text: 'Healthy', tone: 'success' },
  failing: { text: 'Failing', tone: 'error' },
  pending: { text: 'No deliveries yet', tone: 'neutral' },
}

function WebhooksPanel({ endpoints, onChange, notify }: { endpoints: Endpoint[]; onChange: (endpoints: Endpoint[]) => void; notify: Notify }) {
  const [selected, setSelected] = useState(endpoints[0]?.id)
  const [adding, setAdding] = useState(false)
  const [testing, setTesting] = useState(false)
  const endpoint = endpoints.find((e) => e.id === selected) ?? endpoints[0]

  async function test() {
    if (!endpoint) return
    setTesting(true)
    const ok = await sendTest(endpoint)
    setTesting(false)
    if (!ok) return notify('error', 'Test event failed', `${endpoint.url} answered ${endpoint.error}. Check that your server is up.`)
    if (endpoint.status === 'pending') onChange(endpoints.map((e) => (e.id === endpoint.id ? { ...e, status: 'healthy' } : e)))
    notify('success', 'Test event delivered', `${endpoint.url} answered 200 OK in 182 ms.`)
  }

  return (
    <section className="api-keys-panel" aria-labelledby="api-keys-hooks">
      <PanelHead id="api-keys-hooks" title="Webhooks"
        text="We POST events to these URLs as they happen, and retry failures for up to 3 days."
        action={endpoints.length > 0 && <Button onClick={() => setAdding(true)}><Plus /> Add endpoint</Button>} />
      {endpoint ? (
        <div className="api-keys-hooks">
          <List className="api-keys-endpoints" label="Endpoints" items={endpoints.map((e) => ({
            id: e.id, label: e.url.replace('https://', ''), description: `${e.events.length} event${e.events.length > 1 ? 's' : ''} · ${STATUS[e.status].text}`,
            current: e.id === endpoint.id, onSelect: () => setSelected(e.id),
            leading: <Badge variant="dot" tone={STATUS[e.status].tone} label={STATUS[e.status].text} />,
          }))} />
          <div className="api-keys-endpoint">
            <div className="api-keys-endpoint-head">
              <h3 className="api-keys-url">{endpoint.url}</h3>
              <span className="api-keys-status"><Badge variant="dot" tone={STATUS[endpoint.status].tone} label="" aria-hidden="true" />{STATUS[endpoint.status].text}</span>
            </div>
            {endpoint.status === 'failing' && (
              <Alert className="api-keys-wide" tone="error" title="This endpoint is failing">
                Since 8:12 AM, every delivery has come back {endpoint.error}. We’ll keep retrying for 3 days, then pause it.
              </Alert>
            )}
            <span className="api-keys-scopes">{endpoint.events.map((e) => <Tag key={e} size="small">{e}</Tag>)}</span>
            {endpoint.status === 'pending' ? (
              <p className="api-keys-muted">Nothing sent yet. Send a test event to check that your server answers.</p>
            ) : (
              <DataViz title="Deliveries, last 7 days" description={`${sum(endpoint.delivered).toLocaleString('en-US')} delivered, ${sum(endpoint.failed).toLocaleString('en-US')} failed`}
                headingLevel={4} type="bar" variant="stacked" height={240} categories={lastWeek()} showDataToggle
                series={[{ name: 'Delivered', values: endpoint.delivered }, { name: 'Failed', values: endpoint.failed }]} />
            )}
            <div>
              <Button variant="outline" loading={testing} onClick={test}><Send /> Send test event</Button>
            </div>
          </div>
        </div>
      ) : (
        <ContentState className="api-keys-empty" headingLevel={3} icon={<Webhook />} title="No endpoints yet"
          description="Add a URL and we’ll tell your server the moment an email is delivered, bounces or gets opened."
          action={{ label: 'Add endpoint', onClick: () => setAdding(true) }} />
      )}
      <AddEndpointDialog open={adding} onOpenChange={setAdding} onAdded={(e) => {
        onChange([...endpoints, e])
        setSelected(e.id)
        notify('success', 'Endpoint added', 'Send it a test event to make sure it answers.')
      }} />
    </section>
  )
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

function AddEndpointDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (open: boolean) => void; onAdded: (e: Endpoint) => void }) {
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>(['email.delivered', 'email.bounced'])
  const [errors, setErrors] = useState<{ url?: string; events?: string }>({})
  const urlField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setUrl('')
    setEvents(['email.delivered', 'email.bounced'])
    setErrors({})
    requestAnimationFrame(() => urlField.current?.focus())
  }, [open])

  async function add() {
    const value = url.trim()
    const problem = !value ? 'Enter the URL we should send events to.'
      : !/^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+|^https?:\/\/localhost/.test(value) ? 'Enter a full URL, like https://example.com/webhooks.'
        : value.startsWith('http://') ? 'Use https://. We only send events over a secure connection.' : undefined
    const found = { url: problem, events: events.length ? undefined : 'Pick at least one event.' }
    setErrors(found)
    if (found.url || found.events) {
      if (found.url) urlField.current?.focus()
      return false
    }
    try {
      await addEndpoint(value)
    } catch (error) {
      setErrors({ url: (error as Error).message })
      urlField.current?.focus()
      return false
    }
    onAdded({ id: value, url: value, events, status: 'pending', delivered: [], failed: [] })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add an endpoint" confirmLabel="Add endpoint" onConfirm={add}
      description="Your server should answer with a 2xx within 10 seconds.">
      <form className="api-keys-stack" noValidate onSubmit={(event) => { event.preventDefault(); add() }}>
        <TextInput ref={urlField} label="Endpoint URL" type="url" inputMode="url" autoComplete="off" spellCheck={false}
          placeholder="https://example.com/webhooks" value={url} error={errors.url}
          onValueChange={(value) => { setUrl(value); setErrors({ ...errors, url: undefined }) }} />
        <Choice multiple label="Events to send" options={EVENTS} value={events} error={errors.events}
          onValueChange={(value) => { setEvents(value); setErrors({ ...errors, events: undefined }) }} />
      </form>
    </Dialog>
  )
}

function IntegrationsPanel({ notify }: { notify: Notify }) {
  const [apps, setApps] = useState(INTEGRATIONS)
  const [busy, setBusy] = useState<string>()
  const [setup, setSetup] = useState<Integration>()
  const [leaving, setLeaving] = useState<Integration>()
  const [dataset, setDataset] = useState('')
  const [datasetError, setDatasetError] = useState<string>()

  async function connect(app: Integration, settings?: Record<string, string>) {
    setBusy(app.id)
    await setConnection(app.id, true, settings)
    setBusy(undefined)
    setApps((all) => all.map((a) => (a.id === app.id ? { ...a, connected: 'Connected today' } : a)))
    notify('success', `${app.name} connected`, 'Events start flowing within a minute.')
  }

  return (
    <section className="api-keys-panel" aria-labelledby="api-keys-apps">
      <PanelHead id="api-keys-apps" title="Integrations" text="Connect the tools your team already uses. Each one only sees the events it needs." />
      <ul className="api-keys-grid">
        {apps.map((app) => (
          <li key={app.id}>
            <Card className="api-keys-app" title={app.name} headingLevel={3} description={app.text}
              tags={<span className="api-keys-monogram" aria-hidden="true">{app.monogram}</span>}
              footer={
                <div className="api-keys-app-foot">
                  {app.connected
                    ? <Tag size="small" tone="success" leading={<Check />}>{app.connected}</Tag>
                    : <span className="api-keys-muted">{app.setup ? 'Needs a dataset' : 'Not connected'}</span>}
                  {app.connected ? (
                    <Button variant="quiet" size="small" onClick={() => setLeaving(app)}>Disconnect</Button>
                  ) : (
                    <Button variant="outline" size="small" loading={busy === app.id}
                      onClick={() => (app.setup ? (setDataset(''), setDatasetError(undefined), setSetup(app)) : connect(app))}>Connect</Button>
                  )}
                </div>
              } />
          </li>
        ))}
      </ul>
      <Dialog open={setup !== undefined} onOpenChange={(open) => !open && setSetup(undefined)} title={`Set up ${setup?.name ?? ''}`}
        description="Tell us where to put your events." confirmLabel="Connect" onConfirm={async () => {
          if (!/^[a-z][a-z0-9_]*$/.test(dataset)) {
            setDatasetError('Use lowercase letters, numbers and underscores, starting with a letter.')
            return false
          }
          if (setup) await connect(setup, { dataset })
        }}>
        <TextInput label="Dataset" autoComplete="off" spellCheck={false} placeholder="postwick_events" value={dataset} error={datasetError}
          helperText={datasetError ? undefined : 'We create it if it doesn’t exist yet.'}
          onValueChange={(value) => { setDataset(value); setDatasetError(undefined) }} />
      </Dialog>
      <Dialog open={leaving !== undefined} onOpenChange={(open) => !open && setLeaving(undefined)} size="small"
        title={`Disconnect ${leaving?.name ?? ''}?`} description="It stops getting events right away. You can connect it again later."
        confirmLabel="Disconnect" confirmVariant="destructive" onConfirm={async () => {
          if (!leaving) return
          await setConnection(leaving.id, false)
          setApps((all) => all.map((a) => (a.id === leaving.id ? { ...a, connected: undefined } : a)))
          notify('success', `${leaving.name} disconnected`, 'Nothing more goes to it.')
        }} />
    </section>
  )
}

function PanelHead({ id, title, text, action }: { id: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="api-keys-panel-head">
      <div className="api-keys-heading">
        <h2 id={id} className="api-keys-sr">{title}</h2>
        <p className="api-keys-muted">{text}</p>
      </div>
      {action}
    </div>
  )
}

const css = `
.api-keys { min-height: 100dvh; color: var(--diya-color-text); --api-keys-gutter: var(--diya-space-7); }
.api-keys-bar, .api-keys-main { width: 100%; max-width: 1200px; margin: 0 auto; padding-inline: var(--api-keys-gutter); }
.api-keys-bar { display: flex; align-items: center; justify-content: space-between; min-height: 56px; padding-block: var(--diya-space-5); }
.api-keys-brand { display: inline-flex; align-items: center; gap: 10px; border-radius: 8px; color: inherit; font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; text-decoration: none; }
.api-keys-brand:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 4px; }
.api-keys-mark {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: calc(8px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-body); font-weight: 650; line-height: 1;
}
.api-keys-main { padding-top: var(--diya-space-7); padding-bottom: var(--diya-space-8); }
.api-keys-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--diya-space-4) var(--diya-space-6); }
.api-keys-heading { display: grid; gap: var(--diya-space-2); min-width: 0; max-width: 720px; }
.api-keys-title { margin: 0; font-size: 28px; font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.025em; }
.api-keys-lede { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-large); line-height: var(--diya-leading-body); text-wrap: pretty; }
.api-keys-env { width: 180px; }
.api-keys-tabs { margin-top: var(--diya-space-6); }
.api-keys-tabs [role='tablist'] { width: 100%; }
.api-keys-panel { display: grid; gap: var(--diya-space-5); padding-top: var(--diya-space-6); }
.api-keys-panel-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-4); }
.api-keys-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.api-keys-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.api-keys-stack { display: grid; gap: var(--diya-space-5); }
.api-keys-dialog-actions { display: flex; justify-content: flex-end; gap: var(--diya-space-3); width: 100%; }
.api-keys-empty { margin: var(--diya-space-4) auto 0; padding-block: var(--diya-space-7); }

.api-keys-who { display: grid; gap: 2px; }
.api-keys-who strong { font-weight: 550; }
.api-keys-who[data-revoked] { color: var(--diya-color-muted); }
.api-keys-mono { color: var(--diya-color-muted); font-family: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace; font-size: var(--diya-text-caption); }
.api-keys-scopes { display: flex; flex-wrap: wrap; gap: 6px; }
.api-keys-rows { display: none; margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--diya-color-line); }
.api-keys-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--diya-space-3); padding: var(--diya-space-3) 0; border-bottom: 1px solid var(--diya-color-line); }
.api-keys-row-text { display: grid; gap: 2px; min-width: 0; }
.api-keys-row-name { font-size: var(--diya-text-body); font-weight: 550; }
.api-keys-row[data-revoked] .api-keys-row-name { color: var(--diya-color-muted); }
.api-keys-row-meta { overflow: hidden; color: var(--diya-color-muted); font-size: var(--diya-text-caption); text-overflow: ellipsis; white-space: nowrap; }

.api-keys-copy { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: var(--diya-space-3); }

.api-keys-hooks { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: var(--diya-space-6); align-items: start; }
.api-keys-endpoints.api-keys-endpoints { max-width: none; }
.api-keys-endpoint { display: grid; gap: var(--diya-space-4); min-width: 0; }
.api-keys-endpoint-head { display: grid; gap: var(--diya-space-1); }
.api-keys-url { margin: 0; font-size: var(--diya-text-large); font-weight: 600; overflow-wrap: anywhere; }
.api-keys-status { display: inline-flex; align-items: center; gap: 8px; color: var(--diya-color-muted); font-size: var(--diya-text-body); }

.api-keys-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: var(--diya-space-4); margin: 0; padding: 0; list-style: none; }
.api-keys-grid > li { display: grid; }
.api-keys-app { max-width: none; margin: 0; }
.api-keys-monogram {
  display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: var(--diya-space-2); border-radius: calc(12px * var(--diya-corner-scale, 1));
  background: color-mix(in srgb, var(--diya-color-text) 7%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--diya-color-text) 8%, transparent);
  color: var(--diya-color-text); font-size: var(--diya-text-body); font-weight: 650; letter-spacing: 0.02em;
}
.api-keys-app-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-3); width: 100%; }
.api-keys-wide { max-width: none; }

@media (max-width: 960px) {
  .api-keys { --api-keys-gutter: var(--diya-space-5); }
  .api-keys-hooks { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 640px) {
  .api-keys-desk { display: none; }
  .api-keys-rows { display: block; }
}
@media (max-width: 520px) {
  .api-keys { --api-keys-gutter: var(--diya-space-4); }
  .api-keys-bar { padding-block: 0; }
  .api-keys-main { padding-top: var(--diya-space-5); }
  .api-keys-env { width: 100%; }
  .api-keys-panel-head > :last-child:not(.api-keys-heading) { width: 100%; }
  .api-keys-copy { grid-template-columns: minmax(0, 1fr); }
}
`

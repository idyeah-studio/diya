'use client'
// Contact & support: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/contact/page.tsx. Vite: save as src/Contact.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Alert, Button, Choice, FileUpload, Form, Select, SiteHeader, Tag, TextArea, TextInput } from '@idyeah/diya'
import { ArrowLeft, CircleCheck, Clock, LucideProvider, Mail, MapPin, MessageCircle, Newspaper } from 'lucide-react'

// Your company, how to reach it, and what the form asks for each topic.
const PRODUCT = 'Newel'
const HOURS = 'Monday to Friday, 6 AM to 6 PM Pacific'
const SALES_EMAIL = 'sales@example.com'
const PRESS_EMAIL = 'press@example.com'
const OFFICE = ['Newel, Inc.', '27 Quillfeather Lane, Suite 300', 'Fernhollow, CA 90000']
const TOPICS = [
  { value: 'sales', label: 'Sales', description: 'Plans, pricing and a demo for your team' },
  { value: 'support', label: 'Support', description: 'Help with your account or a form' },
  { value: 'bug', label: 'Bug report', description: 'Something isn’t working the way it should' },
  { value: 'press', label: 'Press', description: 'Interviews, stories and our media kit' },
]
const MESSAGE_LABEL: Record<string, string> = { sales: 'What are you hoping to do?', support: 'How can we help?', bug: 'What happened?', press: 'What are you working on?' }
const TEAM_SIZES = ['Just me', '2 to 10', '11 to 50', '51 to 200', '201 to 1,000', 'More than 1,000'].map((label) => ({ value: label, label }))
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Something else'].map((label) => ({ value: label, label }))
const MAX_BYTES = 10 * 1024 * 1024

type Fields = { topic: string; name: string; email: string; company: string; team: string; message: string; steps: string; browser: string }
type Problems = Partial<Record<keyof Fields, string>>
const EMPTY: Fields = { topic: '', name: '', email: '', company: '', team: '', message: '', steps: '', browser: '' }
const ORDER: (keyof Fields)[] = ['topic', 'name', 'email', 'team', 'browser', 'message', 'steps']

let failedLast = false

// Replace with your API call. The stub waits a moment and returns a request
// number. A message with "fail" in it fails once, as if the connection
// dropped; Try again goes through.
async function sendRequest(body: Fields & { files: readonly File[] }): Promise<string | null> {
  await new Promise((resolve) => setTimeout(resolve, 1200))
  if (/fail/i.test(body.message) && !failedLast) return (failedLast = true), null
  failedLast = false
  return '4821'
}

function check(fields: Fields): Problems {
  const email = fields.email.trim()
  return {
    topic: fields.topic ? undefined : 'Choose what this is about.',
    name: fields.name.trim() ? undefined : 'Enter your name.',
    email: !email ? 'Enter your email address.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : 'Enter an email address like name@example.com.',
    team: fields.topic === 'sales' && !fields.team ? 'Choose your team size.' : undefined,
    browser: fields.topic === 'bug' && !fields.browser ? 'Choose the browser you were using.' : undefined,
    message: fields.message.trim() ? undefined : 'Tell us a little about it.',
    steps: fields.topic === 'bug' && !fields.steps.trim() ? 'List the steps that lead to the bug.' : undefined,
  }
}

export default function ContactScreen() {
  const [fields, setFields] = useState(EMPTY)
  const [files, setFiles] = useState<File[]>([])
  const [problems, setProblems] = useState<Problems>({})
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sent, setSent] = useState<string>()
  const refs = useRef<Partial<Record<keyof Fields, HTMLElement | null>>>({})
  const thanks = useRef<HTMLHeadingElement>(null)
  const formTitle = useRef<HTMLHeadingElement>(null)
  const alert = useRef<HTMLDivElement>(null)
  const shown = useRef(sent)

  useEffect(() => {
    if (shown.current === sent) return
    shown.current = sent
    ;(sent ? thanks : formTitle).current?.focus()
  }, [sent])

  useEffect(() => {
    if (failed) alert.current?.focus()
  }, [failed])

  const set = (key: keyof Fields) => (value: string) => {
    setFields((now) => ({ ...now, [key]: value }))
    setProblems((now) => ({ ...now, [key]: undefined }))
  }
  const field = (key: keyof Fields) => ({ ref: (node: HTMLElement | null) => { refs.current[key] = node }, value: fields[key], error: problems[key], onValueChange: set(key) })

  async function submit() {
    if (busy) return
    const found = check(fields)
    setProblems(found)
    setFailed(false)
    const first = ORDER.find((key) => found[key])
    if (first) return refs.current[first]?.focus()
    setBusy(true)
    const id = await sendRequest({ ...fields, files })
    setBusy(false)
    if (id) return setSent(id)
    setFailed(true)
  }

  function reset() {
    setFields(EMPTY)
    setFiles([])
    setSent(undefined)
  }

  const first = fields.name.trim().split(/\s+/)[0]
  const topic = fields.topic

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="contact">
        <style>{css}</style>
        <SiteHeader
          brand={<Brand />}
          brandHref="/"
          brandLabel={`${PRODUCT} Support, home`}
          value="contact"
          items={[
            { value: 'help', label: 'Help center', href: '/help' },
            { value: 'docs', label: 'Docs', href: '/docs' },
            { value: 'contact', label: 'Contact', href: '/contact' },
          ]}
        />
        <main className="contact-main">
          <header className="contact-intro">
            <h1 className="contact-title">Talk to us</h1>
            <p className="contact-lede">
              Questions, bugs, big plans or a story to write. Pick a topic and it goes straight to the people who can help.
              For quick answers, the <a className="contact-link" href="/help">help center</a> is open all night.
            </p>
          </header>

          <aside className="contact-info" aria-label="Other ways to reach us">
            <dl className="contact-facts">
              <Fact icon={<Clock />} term="Support hours">{HOURS}</Fact>
              <Fact icon={<MessageCircle />} term="Response time">Within one business day. On Business, within 4 hours.</Fact>
              <Fact icon={<Mail />} term="Sales"><a className="contact-link" href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a></Fact>
              <Fact icon={<Newspaper />} term="Press"><a className="contact-link" href={`mailto:${PRESS_EMAIL}`}>{PRESS_EMAIL}</a></Fact>
              <Fact icon={<MapPin />} term="Office">{OFFICE.map((line) => <span key={line} className="contact-line">{line}</span>)}</Fact>
            </dl>
            <p className="contact-status">
              <Tag tone="success" leading="dot" size="small">All systems normal</Tag>
              <a className="contact-link" href="/status">Status page</a>
            </p>
          </aside>

          <section className="contact-panel" aria-labelledby={sent ? 'contact-sent' : 'contact-form-title'}>
            {sent ? (
              <Form className="contact-form contact-sent" aria-labelledby="contact-sent" actions={null} onSubmit={reset}>
                <span className="contact-sent-icon" aria-hidden="true"><CircleCheck /></span>
                <h2 id="contact-sent" ref={thanks} tabIndex={-1} className="contact-heading">Thanks, {first}. We’ll reply within one business day.</h2>
                <p className="contact-muted" role="status">
                  Your request number is #{sent}, and a copy is on its way to <strong className="contact-strong">{fields.email.trim()}</strong>.
                </p>
                <div className="contact-sent-actions">
                  <Button type="submit" variant="outline">Send another message</Button>
                  <Button variant="quiet" href="/help"><ArrowLeft /> Back to the help center</Button>
                </div>
              </Form>
            ) : (
              <Form className="contact-form" aria-labelledby="contact-form-title" noValidate loading={busy} actions={null} onSubmit={submit}>
                <h2 id="contact-form-title" ref={formTitle} tabIndex={-1} className="contact-heading">Send us a message</h2>
                {failed && (
                  <Alert ref={alert} tabIndex={-1} className="contact-alert" tone="error" urgent title="Your message didn’t send" action={{ label: 'Try again', onClick: submit }}>
                    The connection may have dropped. Everything you wrote is still here.
                  </Alert>
                )}
                <Choice label="What’s this about?" options={TOPICS} value={topic} error={problems.topic}
                  ref={(node) => { if (node?.value === TOPICS[0].value) refs.current.topic = node }} onValueChange={set('topic')} />
                <div className="contact-pair">
                  <TextInput label="Name" autoComplete="name" {...field('name')} />
                  <TextInput label="Email" type="email" inputMode="email" autoComplete="email" spellCheck={false} {...field('email')} />
                </div>
                <div className="contact-pair">
                  <TextInput label="Company (optional)" autoComplete="organization" {...field('company')} />
                  {topic === 'sales' && <Select label="Team size" placeholder="Choose a size" options={TEAM_SIZES} {...field('team')} />}
                  {topic === 'bug' && <Select label="Browser" placeholder="Choose a browser" options={BROWSERS} {...field('browser')} />}
                </div>
                <TextArea label={MESSAGE_LABEL[topic] ?? 'How can we help?'} rows={5} maxLength={2000} showCount {...field('message')} />
                {topic === 'bug' && (
                  <TextArea label="Steps to reproduce" rows={4} placeholder={'1. Open the form\n2. Choose Preview\n3. …'}
                    helperText="What you did, what you expected, and what happened instead." {...field('steps')} />
                )}
                <FileUpload className="contact-upload" title="Attachment (optional)" headingLevel={3} files={files} onFilesChange={setFiles}
                  accept="image/*,.pdf,.txt,.log" maxBytes={MAX_BYTES} chooseLabel="Choose a file"
                  description={topic === 'bug' ? 'A screenshot or screen recording helps us find it faster.' : 'A screenshot, a PDF or a log file.'}
                  helperText="PNG, JPG, PDF or TXT, up to 10 MB." />
                <div className="contact-actions">
                  <p className="contact-muted contact-small">We use your details only to answer you.</p>
                  <Button type="submit" loading={busy}>Send message</Button>
                </div>
              </Form>
            )}
          </section>
        </main>
      </div>
    </LucideProvider>
  )
}

function Fact({ icon, term, children }: { icon: ReactNode; term: string; children: ReactNode }) {
  return (
    <div className="contact-fact">
      <span className="contact-fact-icon" aria-hidden="true">{icon}</span>
      <dt className="contact-term">{term}</dt>
      <dd className="contact-detail">{children}</dd>
    </div>
  )
}

function Brand() {
  return (
    <span className="contact-brand">
      <span className="contact-mark" aria-hidden="true">{PRODUCT[0]}</span>
      {PRODUCT}
      <span className="contact-brand-sub">Support</span>
    </span>
  )
}

const css = `
.contact { min-height: 100dvh; color: var(--diya-color-text); }
.contact-brand { display: inline-flex; align-items: center; gap: var(--diya-space-2); font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; }
.contact-mark {
  display: grid; place-items: center; width: 28px; height: 28px; margin-inline-end: 2px;
  border-radius: calc(9px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text);
  font-size: var(--diya-text-body); font-weight: 650; line-height: 1;
}
.contact-brand-sub { color: var(--diya-color-muted); font-weight: 400; }
.contact-main {
  display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); grid-template-areas: 'intro panel' 'info panel';
  grid-template-rows: auto 1fr; gap: var(--diya-space-6) var(--diya-space-8); align-items: start;
  max-width: calc(1056px + 2 * var(--diya-space-7)); margin: 0 auto; padding: var(--diya-space-8) var(--diya-space-7);
}
.contact-intro { grid-area: intro; display: grid; gap: var(--diya-space-4); padding-top: var(--diya-space-5); }
.contact-info { grid-area: info; display: grid; gap: var(--diya-space-6); }
.contact-panel { grid-area: panel; min-width: 0; }
.contact-title { margin: 0; font-size: var(--diya-text-hero); font-weight: 600; line-height: 1.1; letter-spacing: -0.03em; }
.contact-lede { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-large); line-height: var(--diya-leading-body); text-wrap: pretty; }
.contact-link { color: var(--diya-color-text); text-decoration: underline; text-underline-offset: 0.2em; text-decoration-thickness: 1px; border-radius: 3px; overflow-wrap: anywhere; }
.contact-link:hover { text-decoration-thickness: 2px; }
.contact-link:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: 2px; }
.contact-facts { display: grid; gap: var(--diya-space-5); margin: 0; }
.contact-fact { display: grid; grid-template-columns: 20px minmax(0, 1fr); column-gap: var(--diya-space-3); row-gap: 2px; }
.contact-fact-icon { grid-row: span 2; padding-top: 2px; color: var(--diya-color-muted); }
.contact-term { font-size: var(--diya-text-body); font-weight: 600; }
.contact-detail { display: grid; margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.contact-line { display: block; }
.contact-status { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-3); margin: 0; padding-top: var(--diya-space-5); border-top: 1px solid var(--diya-color-line); font-size: var(--diya-text-body); }
.contact-form { width: 100%; max-width: none; margin: 0; padding: var(--diya-space-6); gap: var(--diya-space-5); }
.contact-heading { margin: 0; font-size: var(--diya-text-title); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.015em; text-wrap: balance; }
.contact-heading:focus, .contact-alert:focus { outline: none; }
.contact-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--diya-space-4); align-items: start; }
.contact-pair > :only-child { grid-column: 1 / -1; }
/* FileUpload brings its own surface; inside the form it sits flat, as one field among the others. */
.contact-upload { max-width: none; margin: 0; padding: 0; border: 0; border-radius: 0; background: none; box-shadow: none; backdrop-filter: none; }
.contact-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-3) var(--diya-space-4); padding-top: var(--diya-space-2); }
.contact-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.contact-small { font-size: var(--diya-text-caption); }
.contact-strong { color: var(--diya-color-text); font-weight: 600; overflow-wrap: anywhere; }
.contact-sent { justify-items: start; gap: var(--diya-space-3); padding-block: var(--diya-space-7); }
.contact-sent-icon {
  display: grid; place-items: center; width: 48px; height: 48px; margin-bottom: var(--diya-space-2);
  border-radius: 50%; background: var(--diya-color-success-surface); color: var(--diya-color-success);
}
.contact-sent-icon svg { width: 24px; height: 24px; }
.contact-sent-actions { display: flex; flex-wrap: wrap; gap: var(--diya-space-3); margin-top: var(--diya-space-4); }
@media (max-width: 960px) {
  .contact-main { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'intro' 'panel' 'info'; grid-template-rows: none; gap: var(--diya-space-6); padding: var(--diya-space-6) var(--diya-space-5) var(--diya-space-8); }
  .contact-intro { padding-top: 0; }
  .contact-title { font-size: var(--diya-text-display); }
  .contact-info { padding-top: var(--diya-space-4); }
}
@media (max-width: 600px) {
  .contact-main { padding-inline: var(--diya-space-4); }
  .contact-lede { font-size: var(--diya-text-body); }
  .contact-pair { grid-template-columns: minmax(0, 1fr); }
  .contact-form { padding: var(--diya-space-5); }
  .contact-actions > :last-child { width: 100%; }
}
`

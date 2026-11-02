'use client'
// Docs article: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/docs/[slug]/page.tsx. Vite: save as src/DocsArticle.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState } from 'react'
import { Accordion, Alert, Breadcrumbs, Button, CodeBlock, Drawer, Prose, SiteHeader, Tabs, TextArea } from '@idyeah/diya'
import { ArrowLeft, ArrowRight, LucideProvider, PanelLeft, ThumbsDown, ThumbsUp } from 'lucide-react'

// Your product, the docs around this page, and the page's own sections.
const PRODUCT = 'Newel'
const NAV = [
  { id: 'start', label: 'Get started', items: [['introduction', 'Introduction'], ['quickstart', 'Quickstart'], ['embed', 'Embed a form']] },
  { id: 'forms', label: 'Forms', items: [['fields', 'Questions and fields'], ['logic', 'Conditional logic'], ['hidden-fields', 'Hidden fields']] },
  { id: 'responses', label: 'Responses', items: [['notifications', 'Notifications'], ['export', 'Export to CSV'], ['webhooks', 'Webhooks'], ['spreadsheets', 'Spreadsheet sync']] },
  { id: 'api', label: 'API', items: [['authentication', 'Authentication'], ['rate-limits', 'Rate limits'], ['errors', 'Errors']] },
].map((group) => ({ ...group, items: group.items.map(([value, label]) => ({ value, label, href: `/docs/${value}` })) }))
const PAGE = 'webhooks'
const SECTIONS = [
  { id: 'before-you-start', label: 'Before you start', level: 2 },
  { id: 'add-a-webhook', label: 'Add a webhook', level: 2 },
  { id: 'what-we-send', label: 'What we send', level: 2 },
  { id: 'fields', label: 'Fields', level: 3 },
  { id: 'verify-the-signature', label: 'Verify the signature', level: 2 },
  { id: 'retries', label: 'Retries', level: 2 },
  { id: 'answer-quickly', label: 'Answer quickly', level: 3 },
  { id: 'troubleshooting', label: 'Troubleshooting', level: 2 },
]

const PAYLOAD = `{
  "id": "rsp_8Hq2vT41",
  "form_id": "frm_supper-club-rsvp",
  "submitted_at": "2026-11-04T18:22:07Z",
  "test": false,
  "answers": [
    { "question": "Your name", "value": "Kofi Mensah" },
    { "question": "Coming to supper?", "value": "Yes, plus one" }
  ]
}`
const VERIFY_NODE = `import { createHmac, timingSafeEqual } from 'node:crypto'

// rawBody is the request body exactly as it arrived, before JSON.parse.
function isFromNewel(rawBody: string, signature: string, secret: string) {
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex')
  const expected = Buffer.from(digest)
  const received = Buffer.from(signature)
  if (expected.length !== received.length) return false
  return timingSafeEqual(expected, received)
}`
const VERIFY_PYTHON = `import hashlib
import hmac

# raw_body is the request body exactly as it arrived, before json.loads.
def is_from_newel(raw_body: bytes, signature: str, secret: str) -> bool:
    digest = hmac.new(secret.encode(), raw_body, hashlib.sha256)
    expected = digest.hexdigest()
    return hmac.compare_digest(expected, signature)`
const TEST = `curl -X POST https://api.example.com/newel \\
  -H "Content-Type: application/json" \\
  -H "X-Newel-Signature: $(openssl dgst -sha256 -hmac "$SECRET" payload.json | cut -d' ' -f2)" \\
  --data-binary @payload.json`

// Replace with your API call. The stub waits a moment and always goes through.
async function sendFeedback(body: { page: string; helpful: boolean; note?: string }) {
  await new Promise((resolve) => setTimeout(resolve, 700))
  return Boolean(body.page)
}

// Marks the section being read: the heading in the top third of the window, or the last one at the end of the page.
function useCurrentSection() {
  const [current, setCurrent] = useState(SECTIONS[0].id)
  const now = useRef(current)
  now.current = current
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const ids = SECTIONS.map((section) => section.id)
    const inBand = new Set<string>()
    const atEnd = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.id
        if (entry.isIntersecting) inBand.add(id)
        else {
          inBand.delete(id)
          // Scrolling back up: a heading dropping below the band hands over to the one before it.
          if (entry.boundingClientRect.top > 0 && now.current === id) setCurrent(ids[Math.max(0, ids.indexOf(id) - 1)])
        }
      }
      const first = ids.find((id) => inBand.has(id))
      if (atEnd()) setCurrent(ids[ids.length - 1])
      else if (first) setCurrent(first)
    }, { rootMargin: '0px 0px -70% 0px' })
    for (const id of ids) {
      const heading = document.getElementById(id)
      if (heading) observer.observe(heading)
    }
    // The last sections can't reach the top of the window, so the end of the page marks the last one.
    const onScroll = () => atEnd() && setCurrent(ids[ids.length - 1])
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
  return [current, setCurrent] as const
}

export default function DocsArticleScreen() {
  const [current, setCurrent] = useCurrentSection()
  const [menu, setMenu] = useState(false)
  const [platform, setPlatform] = useState('node')
  const contents = <Contents current={current} onPick={setCurrent} />

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="docs">
        <style>{css}</style>
        <SiteHeader
          brand={<Brand />}
          brandHref="/"
          brandLabel={`${PRODUCT} Support, home`}
          value="docs"
          items={[
            { value: 'help', label: 'Help center', href: '/help' },
            { value: 'docs', label: 'Docs', href: '/docs' },
            { value: 'contact', label: 'Contact', href: '/contact' },
          ]}
        />
        <div className="docs-layout">
          <aside className="docs-side" aria-label="Docs navigation"><DocsNav /></aside>

          <main className="docs-main">
            <div className="docs-top">
              <span className="docs-menu">
                <Button variant="outline" size="small" onClick={() => setMenu(true)}><PanelLeft /> Browse docs</Button>
              </span>
              <Breadcrumbs items={[{ label: 'Docs', href: '/docs' }, { label: 'Responses', href: '/docs/responses' }, { label: 'Webhooks', href: '/docs/webhooks' }]} />
            </div>

            <article className="docs-article">
              <Prose className="docs-prose">
                <h1>Send responses to a webhook</h1>
                <p className="docs-meta">Updated October 27, 2026 · 6 minute read</p>
                <p>
                  A webhook posts each new response to a URL you choose, the moment someone presses Submit. Use it to file a
                  ticket, update your CRM or wake up a script, without asking the API every few minutes whether anything happened.
                </p>
                <Accordion className="docs-contents-fold" headingLevel={2} items={[{ id: 'contents', label: 'On this page', content: contents }]} />

                <h2 id="before-you-start">Before you start</h2>
                <ul>
                  <li>A form on the Team or Business plan.</li>
                  <li>An HTTPS endpoint that answers within 10 seconds.</li>
                  <li>Your signing secret, from <strong>Settings → Developers</strong>. Keep it on your server, never in a browser.</li>
                </ul>

                <h2 id="add-a-webhook">Add a webhook</h2>
                <ol>
                  <li>Open your form and choose <strong>Connect → Webhooks</strong>.</li>
                  <li>Paste your endpoint’s URL, such as <code>https://api.example.com/newel</code>.</li>
                  <li>Choose <strong>Send a test</strong>. Your server should answer <code>200</code> within a few seconds.</li>
                  <li>Choose <strong>Turn on</strong>. From now on, every response is posted as it comes in.</li>
                </ol>
                <p>To send a test from your own machine instead, sign a saved payload and post it:</p>
                <CodeBlock label="Terminal" code={TEST} />
                <Alert className="docs-callout" tone="info" title="Tests are marked">
                  Every test delivery has <code>"test": true</code> in its body, so your server can skip them instead of filing a ticket for Kofi’s supper.
                </Alert>

                <h2 id="what-we-send">What we send</h2>
                <p>Each delivery is a <code>POST</code> with a JSON body. Here’s a response to a two-question RSVP form:</p>
                <CodeBlock label="payload.json" code={PAYLOAD} />
                <h3 id="fields">Fields</h3>
                <div role="region" aria-label="Payload fields" tabIndex={0}>
                <table>
                  <thead>
                    <tr><th>Field</th><th>Type</th><th>What it holds</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><code>id</code></td><td>string</td><td>The response’s ID. Use it to ignore a delivery you’ve already handled.</td></tr>
                    <tr><td><code>form_id</code></td><td>string</td><td>The form it came from.</td></tr>
                    <tr><td><code>submitted_at</code></td><td>string</td><td>When Submit was pressed, in UTC (ISO 8601).</td></tr>
                    <tr><td><code>test</code></td><td>boolean</td><td><code>true</code> for deliveries from Send a test.</td></tr>
                    <tr><td><code>answers</code></td><td>array</td><td>One entry per question answered, in the order of the form.</td></tr>
                  </tbody>
                </table>
                </div>

                <h2 id="verify-the-signature">Verify the signature</h2>
                <p>
                  Every delivery carries an <code>X-Newel-Signature</code> header: an HMAC-SHA256 of the raw body, signed with
                  your secret. Check it before you trust anything in the body.
                </p>
                <Tabs label="Language" variant="pill" size="small" value={platform} onValueChange={setPlatform} items={[
                  { value: 'node', label: 'Node.js', content: <CodeBlock className="docs-tab-code" label="server/verify.ts" code={VERIFY_NODE} /> },
                  { value: 'python', label: 'Python', content: <CodeBlock className="docs-tab-code" label="server/verify.py" code={VERIFY_PYTHON} /> },
                ]} />
                <Alert className="docs-callout" tone="warning" title="Check the bytes, then parse">
                  Parse the JSON only after the signature checks out. Parsing and re-serializing changes the bytes, and the check fails.
                </Alert>

                <h2 id="retries">Retries</h2>
                <p>If your endpoint doesn’t answer with a <code>2xx</code> within 10 seconds, we try again, five more times over about a day:</p>
                <table>
                  <thead>
                    <tr><th>Attempt</th><th>Sent after</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>2</td><td>1 minute</td></tr>
                    <tr><td>3</td><td>10 minutes</td></tr>
                    <tr><td>4</td><td>1 hour</td></tr>
                    <tr><td>5</td><td>6 hours</td></tr>
                    <tr><td>6</td><td>24 hours</td></tr>
                  </tbody>
                </table>
                <p>After the sixth try, we pause the webhook and email the form’s owners. Turning it back on sends everything that waited.</p>
                <h3 id="answer-quickly">Answer quickly</h3>
                <p>
                  Reply <code>200</code> as soon as the signature checks out, then do the slow work in a queue. A server that
                  takes 11 seconds to file a ticket gets the same response again, and files two.
                </p>

                <h2 id="troubleshooting">Troubleshooting</h2>
                <ul>
                  <li><strong>Every delivery fails with 401.</strong> Your server is checking against an old secret. Copy it again from Settings → Developers.</li>
                  <li><strong>The signature never matches.</strong> Your framework parsed the body first. Read the raw body for this route.</li>
                  <li><strong>Deliveries arrive twice.</strong> Retries reuse the same <code>id</code>. Keep the IDs you’ve handled, and skip repeats.</li>
                </ul>
              </Prose>

              <Feedback />

              <nav className="docs-pager" aria-label="Previous and next pages">
                <a className="docs-page" href="/docs/export">
                  <span className="docs-page-hint"><ArrowLeft /> Previous</span>
                  <span className="docs-page-title">Export to CSV</span>
                </a>
                <a className="docs-page docs-page-next" href="/docs/spreadsheets">
                  <span className="docs-page-hint">Next <ArrowRight /></span>
                  <span className="docs-page-title">Spreadsheet sync</span>
                </a>
              </nav>
            </article>
          </main>

          <aside className="docs-toc" aria-labelledby="docs-toc-title">
            <h2 id="docs-toc-title" className="docs-toc-title">On this page</h2>
            {contents}
          </aside>
        </div>

        <Drawer open={menu} onOpenChange={setMenu} side="left" title="Docs" headingLevel={2}>
          <DocsNav />
        </Drawer>
      </div>
    </LucideProvider>
  )
}

function DocsNav() {
  return (
    <nav className="docs-nav" aria-label="Docs">
      {NAV.map((group) => (
        <div key={group.id} className="docs-nav-group">
          <p className="docs-nav-title" aria-hidden="true">{group.label}</p>
          <ul className="docs-contents" aria-label={group.label}>
            {group.items.map((item) => (
              <li key={item.value}>
                <a href={item.href} className="docs-contents-link" aria-current={item.value === PAGE ? 'page' : undefined}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function Contents({ current, onPick }: { current: string; onPick: (id: string) => void }) {
  return (
    <ul className="docs-contents">
      {SECTIONS.map((section) => (
        <li key={section.id} className={section.level === 3 ? 'docs-contents-sub' : undefined}>
          <a href={`#${section.id}`} className="docs-contents-link" aria-current={current === section.id ? 'location' : undefined}
            onClick={() => onPick(section.id)}>
            {section.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

function Feedback() {
  const [answer, setAnswer] = useState<'yes' | 'no'>()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'yes' | 'note'>()
  const [done, setDone] = useState(false)
  const noteField = useRef<HTMLTextAreaElement>(null)
  const thanks = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (done) thanks.current?.focus()
    else if (answer === 'no') noteField.current?.focus()
  }, [answer, done])

  async function send(helpful: boolean) {
    setBusy(helpful ? 'yes' : 'note')
    await sendFeedback({ page: PAGE, helpful, note: note.trim() || undefined })
    setBusy(undefined)
    setDone(true)
  }

  return (
    <section className="docs-feedback" id="docs-feedback" aria-labelledby="docs-feedback-title">
      {done ? (
        <p ref={thanks} tabIndex={-1} className="docs-thanks" role="status">
          {answer === 'no'
            ? 'Thanks for telling us. The docs team reads every note, and this page gets better because of them.'
            : 'Thanks. Glad it helped. Happy shipping.'}
        </p>
      ) : (
        <>
          <div className="docs-feedback-row">
            <h2 id="docs-feedback-title" className="docs-feedback-title">Was this page helpful?</h2>
            <div className="docs-feedback-actions">
              <Button variant="outline" size="small" loading={busy === 'yes'} disabled={answer === 'no'}
                onClick={() => { setAnswer('yes'); void send(true) }}><ThumbsUp /> Yes</Button>
              <Button variant="outline" size="small" aria-pressed={answer === 'no'} disabled={busy === 'yes'}
                onClick={() => setAnswer('no')}><ThumbsDown /> No</Button>
            </div>
          </div>
          {answer === 'no' && (
            <form className="docs-note" onSubmit={(event) => { event.preventDefault(); void send(false) }}>
              <TextArea ref={noteField} label="What was missing or wrong?" helperText="Optional. Specific beats polite." rows={3}
                maxLength={1000} value={note} onValueChange={setNote} />
              <div className="docs-feedback-actions">
                <Button type="submit" size="small" loading={busy === 'note'}>Send</Button>
                <Button variant="quiet" size="small" disabled={busy === 'note'} onClick={() => { setAnswer(undefined); setNote('') }}>Cancel</Button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  )
}

function Brand() {
  return (
    <span className="docs-brand">
      <span className="docs-mark" aria-hidden="true">{PRODUCT[0]}</span>
      {PRODUCT}
      <span className="docs-brand-sub">Support</span>
    </span>
  )
}

const css = `
.docs { min-height: 100dvh; color: var(--diya-color-text); }
.docs-brand { display: inline-flex; align-items: center; gap: var(--diya-space-2); font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; }
.docs-mark {
  display: grid; place-items: center; width: 28px; height: 28px; margin-inline-end: 2px;
  border-radius: calc(9px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text);
  font-size: var(--diya-text-body); font-weight: 650; line-height: 1;
}
.docs-brand-sub { color: var(--diya-color-muted); font-weight: 400; }
.docs-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr) 220px; gap: var(--diya-space-7); max-width: 1440px; margin: 0 auto; padding: 0 var(--diya-space-6); }
.docs-side, .docs-toc { position: sticky; top: 0; align-self: start; max-height: 100dvh; overflow-y: auto; padding-block: var(--diya-space-6); }
.docs-nav { display: grid; gap: var(--diya-space-5); }
.docs-nav-group { display: grid; gap: var(--diya-space-1); }
.docs-nav-title, .docs-toc-title { margin: 0 0 var(--diya-space-1); padding-inline: var(--diya-space-3); color: var(--diya-color-text); font-size: var(--diya-text-caption); font-weight: 600; }
.docs-main { min-width: 0; padding: var(--diya-space-6) 0 var(--diya-space-8); }
.docs-top { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-3) var(--diya-space-4); margin-bottom: var(--diya-space-6); }
.docs-menu { display: none; }
.docs-article { display: grid; gap: var(--diya-space-8); max-width: 680px; }
.docs-prose { max-width: none; }
.docs-prose h2, .docs-prose h3 { scroll-margin-top: var(--diya-space-6); }
.docs-prose .docs-meta { margin-top: var(--diya-space-3); color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.docs-tab-code { margin-top: var(--diya-space-3); }
.docs-contents-fold { display: none; border-block: 1px solid var(--diya-color-line); }
.docs-callout { max-width: none; }
.docs-toc-title { margin-bottom: var(--diya-space-3); }
.docs-contents { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; }
.docs-contents-link {
  display: block; padding: 6px var(--diya-space-3); border-radius: calc(8px * var(--diya-corner-scale, 1));
  color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: 1.4; text-decoration: none;
}
.docs-contents-sub .docs-contents-link { padding-inline-start: var(--diya-space-6); }
/* Glass shows a photo behind the page, so the index reads in a stronger gray there. */
[data-glass='true'] .docs-contents-link { color: color-mix(in srgb, var(--diya-color-text) 82%, transparent); }
.docs-contents-link:hover { color: var(--diya-color-text); background: var(--diya-color-hover); }
.docs-contents-link[aria-current] { color: var(--diya-color-text); background: var(--diya-color-selected); font-weight: 500; }
.docs-contents-link:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: -2px; }
.docs-feedback { display: grid; gap: var(--diya-space-5); }
.docs-feedback-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-3); }
.docs-feedback-title { margin: 0; font-size: var(--diya-text-large); font-weight: 600; }
.docs-feedback-actions { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); }
.docs-note { display: grid; gap: var(--diya-space-3); }
.docs-thanks { margin: 0; font-size: var(--diya-text-large); line-height: var(--diya-leading-body); text-wrap: pretty; }
.docs-thanks:focus { outline: none; }
.docs-pager { display: grid; grid-template-columns: 1fr 1fr; gap: var(--diya-space-4); margin-top: calc(var(--diya-space-4) * -1); }
.docs-page {
  display: grid; gap: var(--diya-space-1); padding: var(--diya-space-4) var(--diya-space-5);
  border: 1px solid var(--diya-color-line); border-radius: var(--diya-radius-surface);
  color: var(--diya-color-text); text-decoration: none; transition: border-color 0.15s ease;
}
.docs-page:hover { border-color: color-mix(in srgb, var(--diya-color-text) 32%, transparent); }
.docs-page:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: 2px; }
.docs-page-next { text-align: end; justify-items: end; }
.docs-page-hint { display: inline-flex; align-items: center; gap: var(--diya-space-1); color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.docs-page-hint svg { width: 16px; height: 16px; }
.docs-page-title { font-size: var(--diya-text-large); font-weight: 600; }
@media (prefers-reduced-motion: reduce) { .docs-page { transition: none; } }
@media (max-width: 1180px) {
  .docs-layout { grid-template-columns: 220px minmax(0, 1fr); }
  .docs-toc { display: none; }
  .docs-contents-fold { display: block; }
}
@media (max-width: 860px) {
  .docs-layout { grid-template-columns: minmax(0, 1fr); padding: 0 var(--diya-space-5); }
  .docs-side { display: none; }
  .docs-menu { display: inline-flex; }
  .docs-main { padding-top: var(--diya-space-5); }
  .docs-top { margin-bottom: var(--diya-space-5); }
  .docs-article { gap: var(--diya-space-7); }
}
@media (max-width: 480px) {
  .docs-layout { padding: 0 var(--diya-space-4); }
  .docs-pager { grid-template-columns: minmax(0, 1fr); }
  .docs-page-title { font-size: var(--diya-text-body); }
}
`

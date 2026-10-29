'use client'
// Invoice & quote: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/invoices/[id]/page.tsx. Vite: save as src/Invoice.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import {
  Alert, Button, DatePicker, Dialog, Menu, Select, Stack, Table, Tabs, Tag, TextArea, TextInput, TextLink, Toast, useDiyaAppearance,
  type TableColumn, type Tone,
} from '@idyeah/diya'
import { ArrowLeft, Check, ChevronDown, Download, LucideProvider, Send, X } from 'lucide-react'

// Your studio, your client and "today", fixed so the demo reads the same on any day.
const TODAY = '2026-11-04'
const TAX_RATE = 0.07
const STUDIO = { name: 'Saltwind Studio', line: 'Brand and packaging design', city: 'Providence, Rhode Island', email: 'billing@example.com' }
const CLIENT = { name: 'Calloway & Finch', contact: 'Mara Lindqvist', city: 'Asheville, North Carolina', email: 'accounts@example.com', paysIn: 6 }
const PAYMENT = ['Bank transfer to Saltwind Studio LLC, account ending 4417.', 'Or pay by card at pay.example.com/saltwind. Please include the invoice number.']

type Item = { id: string; name: string; detail?: string; qty: number; rate: number }
type Status = 'draft' | 'sent' | 'overdue' | 'paid'
type Doc = { id: string; number: string; status: Status; issued: string; due: string; items: Item[]; paidOn?: string; reminded?: boolean; note: string }

// Your invoices for this client. In your app, load the one in the URL.
const INVOICES: Doc[] = [
  { id: 'inv-2048', number: 'INV-2048', status: 'draft', issued: TODAY, due: '2026-11-18', note: 'November’s retainer, plus the holiday page you asked for on the 2nd.', items: [
    { id: 'a', name: 'Design retainer, November', detail: 'Up to 40 hours of design and art direction', qty: 1, rate: 4800 },
    { id: 'b', name: 'Holiday landing page', detail: 'Design and build, one round of changes', qty: 1, rate: 2400 },
    { id: 'c', name: 'Product photo retouching', detail: 'Per image', qty: 24, rate: 35 },
  ] },
  { id: 'inv-2047', number: 'INV-2047', status: 'sent', issued: '2026-10-28', due: '2026-11-11', note: 'Thanks for a smooth packaging launch. The jars look great on the shelf.', items: [
    { id: 'a', name: 'Packaging system, final artwork', detail: 'Six jar labels and two gift boxes', qty: 1, rate: 5600 },
    { id: 'b', name: 'Press proofs', detail: 'Per round, with the printer', qty: 3, rate: 180 },
    { id: 'c', name: 'Brand guidelines update', detail: 'Hourly', qty: 6, rate: 150 },
  ] },
  { id: 'inv-2046', number: 'INV-2046', status: 'overdue', issued: '2026-10-07', due: '2026-10-21', note: 'October’s retainer and the spring catalog layout.', items: [
    { id: 'a', name: 'Design retainer, October', detail: 'Up to 40 hours of design and art direction', qty: 1, rate: 4800 },
    { id: 'b', name: 'Spring catalog layout', detail: 'Per page', qty: 32, rate: 95 },
  ] },
  { id: 'inv-2045', number: 'INV-2045', status: 'paid', issued: '2026-09-30', due: '2026-10-14', paidOn: '2026-10-09', note: 'September’s retainer and a year of hosting.', items: [
    { id: 'a', name: 'Design retainer, September', detail: 'Up to 40 hours of design and art direction', qty: 1, rate: 4800 },
    { id: 'b', name: 'Website hosting, 12 months', qty: 1, rate: 360 },
  ] },
]

const QUOTE = { number: 'Q-0119', title: 'Spring campaign', issued: '2026-11-02', validUntil: '2026-11-25', note: 'Shoot dates are flexible in March. Half the total is due on acceptance, the rest on delivery.', items: [
  { id: 'a', name: 'Campaign concept and art direction', detail: 'Two directions, one refined', qty: 1, rate: 3800 },
  { id: 'b', name: 'Photography', detail: 'Per day, studio and one location', qty: 2, rate: 1600 },
  { id: 'c', name: 'Retouching', detail: 'Per image', qty: 40, rate: 35 },
  { id: 'd', name: 'Social cutdowns', detail: 'Per format', qty: 12, rate: 90 },
] }

// Replace with your API calls. Each waits a moment. Sending turns down any
// address that starts with bounce@, the way a mail server rejects a dead inbox.
async function api(route: string, body: Record<string, string> = {}) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  if (route.endsWith('/send') && body.to?.startsWith('bounce@')) throw new Error(`${body.to} bounced last time. Check the address with ${CLIENT.contact}.`)
  return true
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format
const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format
const longDate = (iso: string) => date(new Date(iso))
const daysLate = (due: string) => Math.round((Date.parse(TODAY) - Date.parse(due)) / 86_400_000)
const sum = (items: Item[]) => items.reduce((total, item) => total + item.qty * item.rate, 0)
const STATUS: Record<Status, [Tone, string]> = { draft: ['neutral', 'Draft'], sent: ['info', 'Sent'], overdue: ['warning', 'Overdue'], paid: ['success', 'Paid'] }
type Notice = { id: number; title: string; text: string; tone?: 'success' | 'info' }

export default function InvoiceScreen() {
  const { glass } = useDiyaAppearance()
  const [mode, setMode] = useState('invoice')
  const [notice, setNotice] = useState<Notice>()
  const notify = (title: string, text: string, tone?: 'info') => setNotice({ id: Date.now(), title, text, tone })

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <main className="invoice" data-glass={glass || undefined}>
        <style>{css}</style>
        <div className="invoice-page">
          <TextLink className="invoice-back" href="/invoices" leadingIcon={<ArrowLeft />}>Invoices</TextLink>
          <Tabs className="invoice-tabs" variant="pill" size="small" label="Document" value={mode} onValueChange={setMode} items={[
            { value: 'invoice', label: 'Invoice', content: mode === 'invoice' && <InvoiceView notify={notify} /> },
            { value: 'quote', label: 'Quote', content: mode === 'quote' && <QuoteView notify={notify} /> },
          ]} />
        </div>
        {notice && (
          <Toast key={notice.id} tone={notice.tone ?? 'success'} title={notice.title} onDismiss={() => setNotice(undefined)} duration={6000}>{notice.text}</Toast>
        )}
      </main>
    </LucideProvider>
  )
}

function InvoiceView({ notify }: { notify: (title: string, text: string, tone?: 'info') => void }) {
  const [docs, setDocs] = useState(INVOICES)
  const [id, setId] = useState('inv-2047')
  const [dialog, setDialog] = useState<'send' | 'paid'>()
  const [reminding, setReminding] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const [moved, moveFocus] = useState(0)
  const doc = docs.find((d) => d.id === id)!
  const total = sum(doc.items) * (1 + TAX_RATE)
  const [tone, label] = STATUS[doc.status]

  // When the document or its status changes under the reader, focus its heading.
  useEffect(() => {
    if (moved) heading.current?.focus()
  }, [moved])

  const update = (changes: Partial<Doc>) => setDocs(docs.map((d) => (d.id === doc.id ? { ...d, ...changes } : d)))
  const open = (next: string) => {
    setId(next)
    moveFocus(Date.now())
  }

  async function remind() {
    setReminding(true)
    await api(`/invoices/${doc.id}/remind`)
    setReminding(false)
    update({ reminded: true })
    notify('Reminder sent', `${CLIENT.contact} has a friendly nudge about ${doc.number}.`)
  }

  return (
    <div className="invoice-view">
      <div className="invoice-toolbar">
        <Menu label={`Invoices for ${CLIENT.name}`} items={docs.map((d) => ({
          id: d.id, type: 'radio' as const, checked: d.id === doc.id, label: `${d.number} · ${STATUS[d.status][1]}`, onSelect: () => open(d.id),
        }))} trigger={<Button variant="quiet" size="small" className="invoice-switch">{doc.number} <ChevronDown /></Button>} />
        <Tag tone={tone} leading={doc.status === 'paid' ? <Check /> : 'dot'} size="small">{label}</Tag>
        <div className="invoice-actions">
          <Button variant="outline" size="small" onClick={() => window.print()}><Download /> Download PDF</Button>
          {doc.status === 'draft' && <Button size="small" onClick={() => setDialog('send')}><Send /> Send invoice</Button>}
          {doc.status === 'sent' && <Button variant="outline" size="small" onClick={() => setDialog('send')}><Send /> Send again</Button>}
          {(doc.status === 'sent' || doc.status === 'overdue') && <Button size="small" onClick={() => setDialog('paid')}><Check /> Mark as paid</Button>}
        </div>
      </div>

      {doc.status === 'overdue' && (
        <Alert className="invoice-alert" tone="warning" title={`${daysLate(doc.due)} days overdue`} action={reminding ? undefined : { label: doc.reminded ? 'Send another reminder' : 'Send reminder', onClick: remind }}>
          {reminding ? 'Sending the reminder…' : doc.reminded
            ? `You sent a reminder today. ${CLIENT.name} usually pays within ${CLIENT.paysIn} days of one.`
            : `${CLIENT.name} usually pays within ${CLIENT.paysIn} days, so a nudge may be all it takes.`}
        </Alert>
      )}

      <Paper kind="Invoice" number={doc.number} headingRef={heading} items={doc.items} note={doc.note}
        dates={[['Issued', doc.status === 'draft' ? 'Not sent yet' : longDate(doc.issued)], ['Due', longDate(doc.due)], ['Terms', 'Net 14']]}
        totals={[
          ['Amount paid', doc.paidOn ? `−${usd(total)}` : usd(0)],
          [doc.paidOn ? 'Balance due' : 'Amount due', usd(doc.paidOn ? 0 : total)],
        ]}
        stamp={doc.paidOn && <Tag tone="success" leading={<Check />}>Paid {longDate(doc.paidOn)}</Tag>}
        footer={<><h3 className="invoice-label">How to pay</h3>{PAYMENT.map((line) => <p key={line} className="invoice-text">{line}</p>)}</>} />

      <SendDialog open={dialog === 'send'} doc={doc} onClose={() => setDialog(undefined)} onSent={(to) => {
          update({ status: doc.status === 'draft' ? 'sent' : doc.status, issued: doc.status === 'draft' ? TODAY : doc.issued })
          notify(`${doc.number} sent`, `It’s on its way to ${to}.`)
          moveFocus(Date.now())
        }} />
      <PaidDialog open={dialog === 'paid'} doc={doc} total={total} onClose={() => setDialog(undefined)} onPaid={(paidOn) => {
          update({ status: 'paid', paidOn })
          notify(`${doc.number} is paid`, `${CLIENT.contact} gets a receipt by email.`)
          moveFocus(Date.now())
        }} />
    </div>
  )
}

type DialogProps = { open: boolean; doc: Doc; onClose: () => void }

function SendDialog({ open, doc, onClose, onSent }: DialogProps & { onSent: (to: string) => void }) {
  const [to, setTo] = useState(CLIENT.email)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setTo(CLIENT.email)
    setMessage(`Hi ${CLIENT.contact.split(' ')[0]}, here’s ${doc.number}. Thank you!`)
    setError(undefined)
    setBusy(false)
  }, [open, doc.number])

  async function send() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      setError('Enter an email address like name@example.com.')
      return false
    }
    setBusy(true)
    try {
      await api(`/invoices/${doc.id}/send`, { to: to.trim(), message })
    } catch (problem) {
      setBusy(false)
      setError((problem as Error).message)
      return false
    }
    onSent(to.trim())
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title={doc.status === 'draft' ? `Send ${doc.number}` : `Send ${doc.number} again`}
      description="We’ll email a link to the invoice and attach a PDF." confirmLabel="Send invoice" loading={busy} onConfirm={send}>
      <Stack gap={4}>
        <TextInput label="To" type="email" autoComplete="email" value={to} error={error} onValueChange={(value) => { setTo(value); setError(undefined) }} />
        <TextArea label="Message" rows={3} value={message} onValueChange={setMessage} />
      </Stack>
    </Dialog>
  )
}

function PaidDialog({ open, doc, total, onClose, onPaid }: DialogProps & { total: number; onPaid: (on: string) => void }) {
  const [on, setOn] = useState(TODAY)
  const [method, setMethod] = useState('bank')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setBusy(false)
  }, [open])

  async function confirm() {
    setBusy(true)
    await api(`/invoices/${doc.id}/payments`, { on, method })
    onPaid(on)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title={`Mark ${doc.number} as paid?`} size="small"
      description={`This records a payment of ${usd(total)} and emails ${CLIENT.name} a receipt.`} confirmLabel="Mark as paid" loading={busy} onConfirm={confirm}>
      <Stack gap={4}>
        <DatePicker label="Payment date" value={on} max={TODAY} min={doc.issued} onValueChange={setOn} />
        <Select label="Paid by" value={method} onValueChange={setMethod}
          options={[{ value: 'bank', label: 'Bank transfer' }, { value: 'card', label: 'Card' }, { value: 'check', label: 'Check' }]} />
      </Stack>
    </Dialog>
  )
}

type Answer = { kind: 'accepted'; name: string; on: string } | { kind: 'declined'; reason: string; on: string }

function QuoteView({ notify }: { notify: (title: string, text: string, tone?: 'info') => void }) {
  const [answer, setAnswer] = useState<Answer>()
  const [dialog, setDialog] = useState<'accept' | 'decline'>()
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const [moved, moveFocus] = useState(0)
  const subtotal = sum(QUOTE.items)

  useEffect(() => {
    if (moved) heading.current?.focus()
  }, [moved])

  async function accept() {
    if (name.trim().split(/\s+/).length < 2) {
      setError('Type your first and last name to sign.')
      return false
    }
    setBusy(true)
    await api(`/quotes/${QUOTE.number}/accept`, { name: name.trim() })
    setBusy(false)
    setAnswer({ kind: 'accepted', name: name.trim(), on: TODAY })
    notify('Quote accepted', `${STUDIO.name} will be in touch about shoot dates. A signed copy is on its way to your inbox.`)
    moveFocus(Date.now())
  }

  async function decline() {
    setBusy(true)
    await api(`/quotes/${QUOTE.number}/decline`, { reason })
    setBusy(false)
    setAnswer({ kind: 'declined', reason: reason.trim(), on: TODAY })
    notify('Quote declined', `We let ${STUDIO.name} know. No hard feelings.`, 'info')
    moveFocus(Date.now())
  }

  const [tone, label]: [Tone, string] = !answer ? ['info', `Valid until ${longDate(QUOTE.validUntil)}`] : answer.kind === 'accepted' ? ['success', 'Accepted'] : ['neutral', 'Declined']
  return (
    <div className="invoice-view">
      <div className="invoice-toolbar">
        <span className="invoice-number">{QUOTE.number}</span>
        <Tag tone={tone} leading={answer?.kind === 'accepted' ? <Check /> : answer ? <X /> : 'dot'} size="small">{label}</Tag>
        <div className="invoice-actions">
          <Button variant="outline" size="small" onClick={() => window.print()}><Download /> Download PDF</Button>
          {!answer && <Button variant="outline" size="small" onClick={() => setDialog('decline')}>Decline</Button>}
          {!answer && <Button size="small" onClick={() => { setError(undefined); setDialog('accept') }}><Check /> Accept quote</Button>}
        </div>
      </div>

      <Paper kind="Quote" number={QUOTE.number} subject={QUOTE.title} headingRef={heading} items={QUOTE.items} note={QUOTE.note}
        dates={[['Issued', longDate(QUOTE.issued)], ['Valid until', longDate(QUOTE.validUntil)], ['Deposit', usd(subtotal * (1 + TAX_RATE) / 2)]]}
        totals={[]}
        footer={
          <div className="invoice-sign">
            <h3 className="invoice-label">Acceptance</h3>
            {answer?.kind === 'declined' ? (
              <p className="invoice-text">Declined on {longDate(answer.on)}.{answer.reason && <> “{answer.reason}”</>}</p>
            ) : (
              <div className="invoice-sign-grid">
                <p className="invoice-sign-line"><span className="invoice-signature">{answer?.name ?? ' '}</span><span className="invoice-muted">Signed by {CLIENT.name}</span></p>
                <p className="invoice-sign-line"><span className="invoice-signed-on">{answer ? longDate(answer.on) : ' '}</span><span className="invoice-muted">Date</span></p>
              </div>
            )}
          </div>
        } />

      <Dialog open={dialog === 'accept'} onOpenChange={(open) => !open && setDialog(undefined)} title={`Accept ${QUOTE.number}?`} size="small"
        description={`Typing your name signs the quote for ${usd(subtotal * (1 + TAX_RATE))}, with half due now.`} confirmLabel="Accept and sign" loading={busy} onConfirm={accept}>
        <TextInput label="Full name" autoComplete="name" value={name} error={error} helperText={`As it should appear for ${CLIENT.name}`}
          onValueChange={(value) => { setName(value); setError(undefined) }} />
      </Dialog>
      <Dialog open={dialog === 'decline'} onOpenChange={(open) => !open && setDialog(undefined)} title={`Decline ${QUOTE.number}?`} size="small"
        description={`${STUDIO.name} will hear that it’s a no for now.`} confirmLabel="Decline quote" loading={busy} onConfirm={decline}>
        <TextArea label="Anything they should know? (optional)" rows={3} value={reason} onValueChange={setReason} />
      </Dialog>
    </div>
  )
}

type PaperProps = {
  kind: 'Invoice' | 'Quote'; number: string; subject?: string; headingRef: RefObject<HTMLHeadingElement | null>; items: Item[]; note: string
  dates: [string, string][]; totals: [string, string][]; stamp?: ReactNode; footer: ReactNode
}

const columns: TableColumn<Item>[] = [
  { key: 'name', label: 'Description', render: (item) => (
    <span className="invoice-item"><span>{item.name}</span>{item.detail && <span className="invoice-muted">{item.detail}</span>}</span>
  ) },
  { key: 'qty', label: 'Qty', numeric: true, width: 64, render: (item) => item.qty },
  { key: 'rate', label: 'Rate', numeric: true, width: 110, render: (item) => usd(item.rate) },
  { key: 'amount', label: 'Amount', numeric: true, width: 120, render: (item) => usd(item.qty * item.rate) },
]
// Phones get two columns, with the quantity and rate under each description.
const phoneColumns: TableColumn<Item>[] = [
  { key: 'name', label: 'Description', render: (item) => (
    <span className="invoice-item"><span>{item.name}</span><span className="invoice-muted">{item.qty} × {usd(item.rate)}</span></span>
  ) },
  columns[3],
]

// The printable sheet. Download PDF prints only this, through the print styles at the bottom.
function Paper(props: PaperProps) {
  const subtotal = sum(props.items)
  const tax = subtotal * TAX_RATE
  return (
    <article className="invoice-paper" aria-labelledby="invoice-heading">
      <header className="invoice-head">
        <div className="invoice-brand">
          <span className="invoice-mark" aria-hidden="true">{STUDIO.name[0]}</span>
          <span><strong className="invoice-strong">{STUDIO.name}</strong><span className="invoice-muted">{STUDIO.line}</span></span>
        </div>
        <div className="invoice-titles">
          <h1 id="invoice-heading" ref={props.headingRef} tabIndex={-1} className="invoice-title">
            {props.kind} <span className="invoice-title-number">{props.number}</span>
          </h1>
          {props.subject && <p className="invoice-muted">{props.subject}</p>}
          {props.stamp}
        </div>
      </header>

      <div className="invoice-parties">
        <Party label="From" lines={[STUDIO.name, STUDIO.city, STUDIO.email]} />
        <Party label={props.kind === 'Invoice' ? 'Bill to' : 'Prepared for'} lines={[CLIENT.name, `Attn: ${CLIENT.contact}`, CLIENT.city, CLIENT.email]} />
        <dl className="invoice-dates">
          {props.dates.map(([term, value]) => (
            <div key={term}><dt className="invoice-label">{term}</dt><dd className="invoice-text">{value}</dd></div>
          ))}
        </dl>
      </div>

      {[columns, phoneColumns].map((shown, index) => (
        <Table key={index} className={index ? 'invoice-lines invoice-lines-phone' : 'invoice-lines invoice-lines-wide'} label="Line items" showTitle={false}
          rows={props.items} columns={shown} rowLabel={(item) => item.name} pagination={false} density="compact" />
      ))}

      <dl className="invoice-totals">
        <div><dt>Subtotal</dt><dd>{usd(subtotal)}</dd></div>
        <div><dt>Tax ({Math.round(TAX_RATE * 100)}%)</dt><dd>{usd(tax)}</dd></div>
        <div className="invoice-total"><dt>Total</dt><dd>{usd(subtotal + tax)}</dd></div>
        {props.totals.map(([term, value], index) => (
          <div key={term} className={index === props.totals.length - 1 ? 'invoice-due' : undefined}><dt>{term}</dt><dd>{value}</dd></div>
        ))}
      </dl>

      <footer className="invoice-foot">
        <div><h3 className="invoice-label">Notes</h3><p className="invoice-text">{props.note}</p></div>
        <div>{props.footer}</div>
      </footer>
    </article>
  )
}

function Party({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="invoice-party">
      <h2 className="invoice-label">{label}</h2>
      <p className="invoice-text">{lines.map((line, index) => <span key={line} className={index ? undefined : 'invoice-strong'}>{line}</span>)}</p>
    </div>
  )
}

const css = `
.invoice { min-height: 100dvh; background: var(--diya-color-recessed); color: var(--diya-color-text); }
.invoice[data-glass] { background: none; }
.invoice-page { box-sizing: border-box; width: 100%; max-width: 920px; margin: 0 auto; display: grid; gap: var(--diya-space-5);
  padding: var(--diya-space-6) var(--diya-space-6) var(--diya-space-8); }
.invoice-back { justify-self: start; }
.invoice-tabs { min-width: 0; }
.invoice-view { display: grid; gap: var(--diya-space-5); padding-top: var(--diya-space-5); }
.invoice-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-3); }
.invoice-switch, .invoice-number { font-weight: 600; font-variant-numeric: tabular-nums; }
.invoice-switch { margin-inline-start: calc(var(--diya-space-3) * -1); }
.invoice-number { font-size: var(--diya-text-body); }
.invoice-actions { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); margin-inline-start: auto; }
.invoice-alert { max-width: none; }
.invoice-paper {
  display: grid; gap: var(--diya-space-7); padding: var(--diya-space-8) var(--diya-space-8) var(--diya-space-7);
  border: 1px solid var(--diya-color-line); border-radius: calc(12px * var(--diya-corner-scale, 1));
  background: var(--diya-color-raised); box-shadow: 0 1px 2px color-mix(in srgb, var(--diya-color-text) 6%, transparent), 0 24px 60px -32px color-mix(in srgb, var(--diya-color-text) 22%, transparent);
}
.invoice[data-glass] .invoice-paper { background: color-mix(in srgb, var(--diya-color-raised) 72%, transparent); backdrop-filter: blur(28px) saturate(1.15); }
.invoice-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: var(--diya-space-5); }
.invoice-brand { display: flex; align-items: center; gap: var(--diya-space-3); }
.invoice-brand > span:last-child { display: grid; gap: 2px; }
.invoice-mark { display: grid; place-items: center; width: 40px; height: 40px; border-radius: calc(12px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-title); font-weight: 650; line-height: 1; }
.invoice-titles { display: grid; justify-items: end; gap: var(--diya-space-2); text-align: end; }
.invoice-title { display: grid; gap: var(--diya-space-1); margin: 0; font-size: var(--diya-text-display); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.025em; }
.invoice-title:focus { outline: none; }
.invoice-title-number { color: var(--diya-color-muted); font-size: var(--diya-text-large); font-weight: 500; letter-spacing: 0; font-variant-numeric: tabular-nums; }
.invoice-parties { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--diya-space-6); }
.invoice-party p { display: grid; gap: 2px; }
.invoice-label { margin: 0 0 var(--diya-space-2); color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-weight: 500; }
.invoice-text { margin: 0; font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; overflow-wrap: anywhere; }
.invoice-text + .invoice-text { margin-top: var(--diya-space-2); }
.invoice-strong { font-weight: 600; }
.invoice-muted { display: block; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.invoice-dates { display: grid; gap: var(--diya-space-3); margin: 0; }
.invoice-dates dd { margin: 0; font-variant-numeric: tabular-nums; }
.invoice-dates .invoice-label { margin: 0; }
.invoice-lines { min-width: 0; }
.invoice-lines-phone { display: none; }
.invoice-item { display: grid; gap: 2px; }
.invoice-totals { display: grid; gap: var(--diya-space-2); width: min(100%, 320px); margin: calc(var(--diya-space-5) * -1) 0 0 auto; font-size: var(--diya-text-body); font-variant-numeric: tabular-nums; }
.invoice-totals div { display: flex; justify-content: space-between; gap: var(--diya-space-5); padding-inline: var(--diya-space-4); }
.invoice-totals dt { color: var(--diya-color-muted); }
.invoice-totals dd { margin: 0; text-align: end; }
.invoice-total { padding-top: var(--diya-space-3); border-top: 1px solid var(--diya-color-line); font-weight: 600; }
.invoice-total dt, .invoice-due dt { color: var(--diya-color-text); }
.invoice-due { padding-block: var(--diya-space-3); border-radius: var(--diya-radius-control); background: color-mix(in srgb, var(--diya-color-text) 5%, transparent); font-size: var(--diya-text-large); font-weight: 650; }
.invoice-foot { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--diya-space-6); padding-top: var(--diya-space-6); border-top: 1px solid var(--diya-color-line); }
.invoice-sign-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: var(--diya-space-4); }
.invoice-sign-line { display: grid; gap: var(--diya-space-1); margin: 0; }
.invoice-signature, .invoice-signed-on { min-height: 34px; padding-bottom: var(--diya-space-1); border-bottom: 1px solid var(--diya-color-text); font-size: var(--diya-text-body); }
.invoice-signature { font-family: 'Snell Roundhand', 'Segoe Script', cursive; font-size: var(--diya-text-title); line-height: 1.5; }
.invoice-signed-on { display: flex; align-items: flex-end; font-variant-numeric: tabular-nums; }
@media (prefers-reduced-transparency: reduce) {
  .invoice[data-glass] .invoice-paper { background: var(--diya-color-raised); backdrop-filter: none; }
}
@media (max-width: 760px) {
  .invoice-page { padding: var(--diya-space-5) var(--diya-space-4) var(--diya-space-7); }
  .invoice-paper { gap: var(--diya-space-6); padding: var(--diya-space-6) var(--diya-space-5); }
  .invoice-parties { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .invoice-dates { grid-column: 1 / -1; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .invoice-foot { grid-template-columns: minmax(0, 1fr); }
  .invoice-actions { width: 100%; margin-inline-start: 0; }
  .invoice-actions > * { flex: 1 1 auto; }
}
@media (max-width: 480px) {
  .invoice-head { flex-direction: column-reverse; }
  .invoice-titles { justify-items: start; text-align: start; }
  .invoice-title { font-size: var(--diya-text-heading); }
  .invoice-lines-wide { display: none; }
  .invoice-lines-phone { display: block; }
  .invoice-parties { grid-template-columns: minmax(0, 1fr); }
  .invoice-paper { margin-inline: calc(var(--diya-space-4) * -1); border-inline: 0; border-radius: 0; }
}
@media print {
  body * { visibility: hidden; }
  .invoice-paper, .invoice-paper * { visibility: visible; }
  .invoice-paper {
    position: absolute; inset: 0 0 auto 0; gap: var(--diya-space-6); padding: 0; border: 0; border-radius: 0; box-shadow: none; background: none; backdrop-filter: none;
    color-scheme: light; color: CanvasText; --diya-color-text: CanvasText; --diya-color-muted: GrayText; --diya-color-line: color-mix(in srgb, CanvasText 20%, transparent);
    --diya-color-raised: Canvas; --diya-color-surface: Canvas; --diya-color-recessed: Canvas;
  }
  .invoice-mark { background: none; color: CanvasText; box-shadow: inset 0 0 0 1.5px CanvasText; }
  .invoice-due { background: none; border-top: 1px solid CanvasText; border-radius: 0; }
  .invoice-head > *, .invoice-parties, .invoice-totals, .invoice-foot { break-inside: avoid; }
}
`

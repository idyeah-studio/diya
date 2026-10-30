'use client'
// Billing & plan: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/settings/billing/page.tsx. Vite: save as src/Billing.tsx and render it inside your DiyaProvider.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Choice, Dialog, Menu, Metric, Progress, SideNavigation, Stack, Table, Tag, TextInput, Toast, type AlertTone } from '@idyeah/diya'
import { Bell, CreditCard, Download, LucideProvider, Menu as MenuIcon, Palette, Shield, UserRound, Users } from 'lucide-react'

// Your product, the workspace, and what the demo account shows. The plan renews
// on the 21st of each month; the dates below are worked out from today.
const PRODUCT = 'Mullion'
const WORKSPACE = 'Bramble & Finch'
const BILLING_EMAIL = 'priya@example.com'
const RENEWAL_DAY = 21
const SEATS = 10
const USED = { seats: 9, storage: 61.4, runs: 8420 }

type PlanId = 'starter' | 'studio' | 'business'
const PLANS: Record<PlanId, { name: string; price: number; seats: number; storage: number; runs: number; blurb: string }> = {
  starter: { name: 'Starter', price: 8, seats: 5, storage: 20, runs: 1000, blurb: 'Up to 5 seats, 20 GB of files and 1,000 automation runs a month.' },
  studio: { name: 'Studio', price: 12, seats: 50, storage: 100, runs: 10000, blurb: 'Up to 50 seats, 100 GB of files and 10,000 automation runs a month.' },
  business: { name: 'Business', price: 24, seats: 500, storage: 1000, runs: 100000, blurb: 'Everything in Studio, with 1 TB, 100,000 runs, single sign-on and an audit log.' },
}

type Card = { brand: string; last4: string; expires: string; expired: boolean }
type Invoice = { id: string; date: string; label: string; amount: number; status: 'Paid' | 'Failed' }

// Every date on the page, from today: the current period, the card on file
// (it ran out last month) and the invoices for the months before.
function calendar(now: Date) {
  const at = (year: number, month: number, date: number) => new Date(Date.UTC(year, month, date, 12))
  const today = at(now.getFullYear(), now.getMonth(), now.getDate())
  const back = now.getDate() < RENEWAL_DAY ? 1 : 0
  const start = at(today.getUTCFullYear(), today.getUTCMonth() - back, RENEWAL_DAY)
  const end = at(start.getUTCFullYear(), start.getUTCMonth() + 1, RENEWAL_DAY)
  const months = (n: number) => iso(at(start.getUTCFullYear(), start.getUTCMonth() - n, RENEWAL_DAY))
  const seatAdded = at(start.getUTCFullYear(), start.getUTCMonth() - 1, 2)
  const lapsed = at(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)
  const card: Card = { brand: 'Visa', last4: '4242', expires: `${String(lapsed.getUTCMonth() + 1).padStart(2, '0')}/${String(lapsed.getUTCFullYear() % 100).padStart(2, '0')}`, expired: true }
  const invoices: Invoice[] = [
    { id: 'INV-0187', date: months(0), label: 'Studio, 10 seats', amount: 120, status: 'Paid' },
    { id: 'INV-0164', date: months(1), label: 'Studio, 10 seats', amount: 120, status: 'Paid' },
    { id: 'INV-0152', date: iso(seatAdded), label: `One more seat, ${short(seatAdded)} to ${RENEWAL_DAY}`, amount: 7.35, status: 'Paid' },
    { id: 'INV-0139', date: months(2), label: 'Studio, 9 seats', amount: 108, status: 'Paid' },
    { id: 'INV-0117', date: months(3), label: 'Studio, 9 seats', amount: 108, status: 'Paid' },
    { id: 'INV-0098', date: months(4), label: 'Studio, 9 seats', amount: 108, status: 'Paid' },
  ]
  return {
    today,
    start,
    end,
    renews: long(end),
    period: `${month(start)} ${RENEWAL_DAY} to ${month(end)} ${RENEWAL_DAY}`,
    daysLeft: Math.round((end.getTime() - today.getTime()) / 86_400_000),
    periodDays: Math.round((end.getTime() - start.getTime()) / 86_400_000),
    lapsedMonth: month(lapsed),
    card,
    invoices,
  }
}

// The server and the browser render the same sample day, then the browser
// moves to today before it paints, so the page hydrates without a mismatch.
const SAMPLE_DAY = new Date(2026, 10, 9)
function useToday() {
  const [today, setToday] = useState(SAMPLE_DAY)
  useLayoutEffect(() => setToday(new Date()), [])
  return today
}

const REASONS = [
  { value: 'price', label: 'It costs too much' },
  { value: 'missing', label: 'It’s missing something we need' },
  { value: 'switching', label: 'We’re moving to another tool' },
  { value: 'done', label: 'Our project wrapped up' },
  { value: 'other', label: 'Something else' },
]

const NAV = [
  { id: 'account', label: 'Account', items: [
    { value: 'profile', label: 'Profile', href: '/settings#profile', icon: <UserRound /> },
    { value: 'security', label: 'Security', href: '/settings#security', icon: <Shield /> },
    { value: 'notifications', label: 'Notifications', href: '/settings#notifications', icon: <Bell /> },
    { value: 'appearance', label: 'Appearance', href: '/settings#appearance', icon: <Palette /> },
  ] },
  { id: 'workspace', label: 'Workspace', items: [
    { value: 'billing', label: 'Billing & plan', href: '/settings/billing', icon: <CreditCard /> },
    { value: 'team', label: 'Team', href: '/settings/team', icon: <Users /> },
  ] },
]

type Route = '/subscription' | '/subscription/cancel' | '/subscription/resume' | '/payment-method'

// Replace with your API call, usually to your payment provider. The stub waits
// a moment, then fails any charge while the card on file is expired, and
// declines the card number 4000 0000 0000 0002. Everything else goes through.
async function api(route: Route, body: Record<string, unknown> = {}) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  if (route === '/subscription') return !(Number(body.charge) > 0 && body.cardExpired)
  if (route === '/payment-method') return body.number !== '4000000000000002'
  return true
}

const money = (amount: number, cents = amount % 1 !== 0) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0 }).format(amount)
const utcFormat = (options: Intl.DateTimeFormatOptions) => (date: Date) => new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date)
const long = utcFormat({ month: 'long', day: 'numeric', year: 'numeric' })
const short = utcFormat({ month: 'short', day: 'numeric' })
const month = utcFormat({ month: 'long' })
const iso = (date: Date) => date.toISOString().slice(0, 10)
const day = (value: string) => utcFormat({ month: 'short', day: 'numeric', year: 'numeric' })(new Date(`${value}T12:00:00Z`))
const count = (value: number) => new Intl.NumberFormat('en-US').format(value)
const brandOf = (number: string) => (number.startsWith('4') ? 'Visa' : /^(5[1-5]|2[2-7])/.test(number) ? 'Mastercard' : /^3[47]/.test(number) ? 'American Express' : 'Card')

// Replace with a link to the invoice PDF your payment provider hosts. This stand-in saves a plain-text receipt.
function download(invoice: Invoice) {
  const text = `${WORKSPACE}\n${invoice.id}\n${day(invoice.date)}\n${invoice.label}\n${money(invoice.amount)}, ${invoice.status}\n`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  link.download = `${invoice.id}.txt`
  link.click()
  URL.revokeObjectURL(link.href)
}

type Notice = { tone: AlertTone; title: string; text: string; id: number }
type CardForm = { name: string; number: string; expires: string; code: string }
const EMPTY_CARD: CardForm = { name: '', number: '', expires: '', code: '' }

export default function BillingScreen() {
  const dates = calendar(useToday())
  const { renews: RENEWS, period: PERIOD, daysLeft: DAYS_LEFT, periodDays: PERIOD_DAYS } = dates
  const [plan, setPlan] = useState<PlanId>('studio')
  const [canceled, setCanceled] = useState(false)
  const [trialNotice, setTrialNotice] = useState(true)
  const [cardOverride, setCard] = useState<Card>()
  const [invoiceOverride, setInvoices] = useState<Invoice[]>()
  const card = cardOverride ?? dates.card
  const invoices = invoiceOverride ?? dates.invoices
  const [failed, setFailed] = useState<{ plan: PlanId; amount: number; invoice: string }>()
  const [dialog, setDialog] = useState<'plan' | 'cancel' | 'card'>()
  const [choice, setChoice] = useState<PlanId>('business')
  const [choiceError, setChoiceError] = useState<string>()
  const [reason, setReason] = useState('')
  const [form, setForm] = useState(EMPTY_CARD)
  const [errors, setErrors] = useState<Partial<CardForm>>({})
  const [resuming, setResuming] = useState(false)
  const planButton = useRef<HTMLButtonElement>(null)
  const failedAlert = useRef<HTMLDivElement>(null)
  // Where focus goes once the dialog has closed and handed focus back.
  const [focusNext, setFocusNext] = useState<'failed' | 'plan'>()
  const [notice, setNotice] = useState<Notice>()
  useEffect(() => {
    if (!focusNext || dialog) return
    const target = (focusNext === 'failed' ? failedAlert : planButton).current
    setFocusNext(undefined)
    // A task later, after the closing dialog has put focus back where it was.
    setTimeout(() => target?.focus())
  }, [focusNext, dialog])
  const current = PLANS[plan]
  const picked = PLANS[choice]
  const notify = (tone: AlertTone, title: string, text: string) => setNotice({ tone, title, text, id: Date.now() })
  const close = (open: boolean) => !open && setDialog(undefined)
  const upgradeLabel = (name: string) => `${name} upgrade, ${short(dates.today)} to ${short(dates.end)}`
  const prorated = (difference: number) => Math.round(((difference * SEATS * DAYS_LEFT) / PERIOD_DAYS) * 100) / 100

  function openPlan(id: PlanId) {
    setChoice(id)
    setChoiceError(undefined)
    setDialog('plan')
  }

  function settle(id: PlanId, amount: number, invoice: string) {
    setPlan(id)
    setCanceled(false)
    setFailed(undefined)
    if (id === 'business') setTrialNotice(false)
    if (amount > 0)
      setInvoices([
        { id: invoice, date: iso(dates.today), label: upgradeLabel(PLANS[id].name), amount, status: 'Paid' },
        ...invoices.filter((row) => row.id !== invoice),
      ])
  }

  async function changePlan() {
    if (USED.seats > picked.seats || USED.storage > picked.storage) {
      setChoiceError(`${picked.name} fits ${picked.seats} seats and ${picked.storage} GB. ${WORKSPACE} uses ${USED.seats} seats and ${USED.storage} GB right now.`)
      return false
    }
    const charge = picked.price > current.price ? prorated(picked.price - current.price) : 0
    const invoice = `INV-0${200 + invoices.length}`
    if (!(await api('/subscription', { plan: choice, charge, cardExpired: card.expired }))) {
      setFailed({ plan: choice, amount: charge, invoice })
      setFocusNext('failed')
      setInvoices([{ id: invoice, date: iso(dates.today), label: upgradeLabel(picked.name), amount: charge, status: 'Failed' }, ...invoices])
      return
    }
    settle(choice, charge, invoice)
    setFocusNext('plan')
    notify('success', `You’re on ${picked.name}`, charge > 0 ? `We charged ${money(charge)} to ${card.brand} ending ${card.last4} for the rest of this period.` : `Your new price starts today. We’ll credit what’s left of ${current.name} to your next invoice.`)
  }

  async function saveCard() {
    const digits = form.number.replace(/\D/g, '')
    const [, month, year] = /^(\d{2})\s*\/?\s*(\d{2})$/.exec(form.expires.trim()) ?? []
    const found: Partial<CardForm> = {
      name: form.name.trim() ? undefined : 'Enter the name on the card.',
      number: digits.length >= 15 && digits.length <= 16 ? undefined : 'Enter the 15 or 16 digits on the front of the card.',
      expires: !month || Number(month) > 12 || Number(month) < 1 ? 'Enter the month and year, like 08 / 29.' : Number(year) * 12 + Number(month) < (dates.today.getUTCFullYear() % 100) * 12 + dates.today.getUTCMonth() + 1 ? 'This card has expired.' : undefined,
      code: /^\d{3,4}$/.test(form.code) ? undefined : 'Enter the 3 or 4 digits on the back.',
    }
    setErrors(found)
    if (Object.values(found).some(Boolean)) return false
    if (!(await api('/payment-method', { number: digits }))) {
      setErrors({ number: 'Your bank declined this card. Try a different one, or call the number on the back.' })
      return false
    }
    const next = { brand: brandOf(digits), last4: digits.slice(-4), expires: `${month}/${year}`, expired: false }
    setCard(next)
    if (failed && (await api('/subscription', { plan: failed.plan, charge: failed.amount, cardExpired: false }))) {
      settle(failed.plan, failed.amount, failed.invoice)
      setFocusNext('plan')
      return notify('success', 'Card updated, and the payment went through', `You’re on ${PLANS[failed.plan].name}. We charged ${money(failed.amount)} to ${next.brand} ending ${next.last4}.`)
    }
    notify('success', 'Card updated', `We’ll charge ${next.brand} ending ${next.last4} on ${RENEWS}.`)
  }

  async function cancel() {
    await api('/subscription/cancel', { reason })
    setCanceled(true)
    setFocusNext('plan')
    notify('info', 'Your plan is canceled', `${current.name} stays on until ${RENEWS}. Change your mind before then and nothing changes.`)
  }

  async function resume() {
    setResuming(true)
    await api('/subscription/resume')
    setResuming(false)
    setCanceled(false)
    notify('success', 'Your plan is back on', `It renews on ${RENEWS}, like nothing happened.`)
  }

  const bind = (key: keyof CardForm) => ({
    value: form[key],
    error: errors[key],
    onValueChange: (value: string) => {
      setForm({ ...form, [key]: key === 'number' ? value.replace(/[^\d ]/g, '') : value })
      setErrors({ ...errors, [key]: undefined })
    },
  })

  const meters = [
    { label: 'Seats', used: `${USED.seats} of ${SEATS}`, value: (USED.seats / SEATS) * 100, note: `${SEATS - USED.seats} left. Invites use a seat until they’re accepted.` },
    { label: 'Files', used: `${USED.storage} of ${count(current.storage)} GB`, value: (USED.storage / current.storage) * 100 },
    { label: 'Automation runs', used: `${count(USED.runs)} of ${count(current.runs)}`, value: (USED.runs / current.runs) * 100, note: `They reset on ${RENEWS}.` },
  ]
  const upgrade = picked.price > current.price

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <div className="billing">
        <a className="billing-skip" href="#billing-main">Skip to content</a>
        <header className="billing-side">
          <p className="billing-brand">
            <span className="billing-mark" aria-hidden="true">{PRODUCT[0]}</span>
            {PRODUCT}
          </p>
          <p className="billing-section">Settings</p>
          <SideNavigation className="billing-nav" label="Settings" value="billing" groups={NAV} />
        </header>

        <main className="billing-main" id="billing-main" tabIndex={-1}>
          <div className="billing-column">
            <div className="billing-bar">
              <p className="billing-brand">
                <span className="billing-mark" aria-hidden="true">{PRODUCT[0]}</span>
                {PRODUCT}
              </p>
              <Menu label="Settings sections" triggerIcon={<MenuIcon />} items={NAV.flatMap((group) => group.items.map((item) => ({ id: item.value, label: item.label, icon: item.icon, href: item.href, current: item.value === 'billing' })))} />
            </div>
            <header className="billing-head">
              <h1 className="billing-title">Billing & plan</h1>
              <p className="billing-lede">{WORKSPACE}’s plan, what you’ve used this month, and every invoice.</p>
            </header>

            <Stack gap={6}>
              {failed && (
                <Alert ref={failedAlert} tabIndex={-1} className="billing-wide" tone="error" urgent title="Your payment didn’t go through" action={{ label: 'Update card', onClick: () => setDialog('card') }}>
                  We couldn’t charge {money(failed.amount)} for {PLANS[failed.plan].name} to {card.brand} ending {card.last4}, because the card expired in {dates.lapsedMonth}. Update it and we’ll try again right away.
                </Alert>
              )}
              {trialNotice && !failed && (
                <Alert className="billing-wide" tone="info" title="Your Business trial has ended" action={{ label: 'Upgrade to Business', onClick: () => openPlan('business') }} onDismiss={() => setTrialNotice(false)}>
                  Single sign-on and the audit log are paused. Everything else is just as you left it.
                </Alert>
              )}

              <Card
                headingLevel={2}
                title={`${current.name} plan`}
                tags={canceled ? <Tag tone="warning" leading="dot">Ends {RENEWS}</Tag> : <Tag tone="success" leading="dot">Active</Tag>}
                description={canceled ? `Everything works as usual until ${RENEWS}. After that, ${WORKSPACE} becomes read-only, and nothing is deleted.` : `${SEATS} seats at ${money(current.price)} each, billed monthly. Renews ${RENEWS}.`}
                footer={
                  <>
                    <Button ref={planButton} variant={canceled ? 'solid' : 'outline'} loading={resuming} onClick={canceled ? resume : () => openPlan(plan === 'business' ? 'studio' : 'business')}>
                      {canceled ? 'Resume plan' : 'Change plan'}
                    </Button>
                    {!canceled && <Button variant="quiet" onClick={() => { setReason(''); setDialog('cancel') }}>Cancel plan</Button>}
                  </>
                }
              >
                <Metric label={canceled ? 'Last charge' : 'Next charge'} value={money(current.price * SEATS)} unit={canceled ? `on ${short(dates.start)}` : 'a month'} />
              </Card>

              <Card headingLevel={2} title="Usage" description={`This billing period, ${PERIOD}.`}>
                <div className="billing-meters">
                  {meters.map((meter) => (
                    <div key={meter.label} className="billing-meter">
                      <p className="billing-meter-head">
                        <span>{meter.label}</span>
                        <span className="billing-figure">{meter.used}</span>
                      </p>
                      <Progress className="billing-wide" label={`${meter.label}: ${meter.used}`} value={meter.value} showValue={false} />
                      {meter.note && <p className="billing-note">{meter.note}</p>}
                    </div>
                  ))}
                </div>
              </Card>

              <Card
                headingLevel={2}
                title="Payment method"
                description={`Charged on the 21st of each month. Receipts go to ${BILLING_EMAIL}.`}
                footer={<Button variant="outline" onClick={() => { setForm(EMPTY_CARD); setErrors({}); setDialog('card') }}>Update card</Button>}
              >
                <div className="billing-card">
                  <span className="billing-card-icon" aria-hidden="true"><CreditCard /></span>
                  <p className="billing-card-copy">
                    <span className="billing-card-name">
                      <strong>{card.brand} ending {card.last4}</strong>
                      {card.expired && <Tag size="small" tone="warning" leading="dot">Expired</Tag>}
                    </span>
                    <span>Valid through {card.expires}</span>
                  </p>
                </div>
              </Card>

              <div className="billing-desk">
              <Table
                label="Billing history"
                headingLevel={2}
                rows={invoices}
                rowLabel={(row) => `${row.label}, ${day(row.date)}`}
                pagination={false}
                emptyTitle="No invoices yet"
                emptyDescription="Your first one shows up here after your first payment."
                columns={[
                  { key: 'date', label: 'Date', render: (row) => day(row.date), sortValue: (row) => row.date, width: 128 },
                  { key: 'label', label: 'Description', render: (row) => row.label, width: 216 },
                  { key: 'amount', label: 'Amount', numeric: true, render: (row) => money(row.amount, true), sortValue: (row) => row.amount, width: 104 },
                  { key: 'status', label: 'Status', render: (row) => <Tag size="small" tone={row.status === 'Paid' ? 'success' : 'error'} leading="dot">{row.status}</Tag>, width: 100 },
                  {
                    key: 'file',
                    label: 'Receipt',
                    width: 132,
                    render: (row) => (
                      <Button size="small" variant="quiet" aria-label={`Download receipt ${row.id}`} onClick={() => download(row)}>
                        <Download /> Download
                      </Button>
                    ),
                  },
                ]}
              />
              </div>
              {/* Phones get the same invoices as stacked rows, so no column is cut off. */}
              <section className="billing-phone" aria-labelledby="billing-history-phone">
                <h2 id="billing-history-phone" className="billing-subtitle">Billing history</h2>
                <ul className="billing-rows">
                  {invoices.map((row) => (
                    <li key={row.id} className="billing-row">
                      <span className="billing-row-text">
                        <span className="billing-row-main">{row.label}</span>
                        <span className="billing-row-meta">{day(row.date)}</span>
                      </span>
                      <span className="billing-row-end">
                        <span className="billing-row-main billing-figure-strong">{money(row.amount, true)}</span>
                        <Tag size="small" tone={row.status === 'Paid' ? 'success' : 'error'} leading="dot">{row.status}</Tag>
                      </span>
                      <Button size="small" variant="quiet" aria-label={`Download receipt ${row.id}`} onClick={() => download(row)}><Download /></Button>
                    </li>
                  ))}
                </ul>
              </section>
            </Stack>
          </div>
        </main>

        <Dialog
          open={dialog === 'plan'}
          onOpenChange={close}
          title="Change your plan"
          headingLevel={2}
          description={`Prices are per seat, per month, and you have ${SEATS} seats.`}
          confirmLabel={choice === plan ? 'Change plan' : `${upgrade ? 'Upgrade' : 'Switch'} to ${picked.name}`}
          confirmDisabled={choice === plan}
          onConfirm={changePlan}
        >
          <Stack gap={4}>
            <Choice
              label="Plan"
              hideLabel
              value={choice}
              error={choiceError}
              onValueChange={(value) => { setChoice(value as PlanId); setChoiceError(undefined) }}
              options={(Object.keys(PLANS) as PlanId[]).map((id) => ({
                value: id,
                label: `${PLANS[id].name}, ${money(PLANS[id].price)} a seat${id === plan ? ' (your plan)' : ''}`,
                description: PLANS[id].blurb,
              }))}
            />
            <p className="billing-note" role="status">
              {choice === plan
                ? 'That’s the plan you’re on.'
                : upgrade
                  ? `You’ll pay ${money(prorated(picked.price - current.price))} today for the rest of this period, then ${money(picked.price * SEATS)} a month.`
                  : `${money(picked.price * SEATS)} a month from today. We’ll credit what’s left of ${current.name} to your next invoice.`}
            </p>
          </Stack>
        </Dialog>

        <Dialog
          open={dialog === 'cancel'}
          onOpenChange={close}
          title={`Cancel your ${current.name} plan?`}
          headingLevel={2}
          description={`You keep ${current.name} until ${RENEWS}. After that, ${WORKSPACE} becomes read-only. Nothing is deleted, and you can pick a plan again anytime.`}
          confirmLabel="Cancel plan"
          confirmVariant="destructive"
          dismissLabel="Keep my plan"
          onConfirm={cancel}
        >
          <Choice label="Mind telling us why?" helperText={`Optional. It goes straight to the people who build ${PRODUCT}.`} options={REASONS} value={reason} onValueChange={setReason} />
        </Dialog>

        <Dialog
          open={dialog === 'card'}
          onOpenChange={close}
          title="Update your card"
          headingLevel={2}
          description={failed ? `Once it’s saved, we’ll retry the ${money(failed.amount)} payment.` : `We’ll charge this card from ${RENEWS}.`}
          confirmLabel={failed ? `Save and pay ${money(failed.amount)}` : 'Save card'}
          onConfirm={saveCard}
        >
          {/* Your payment provider likely has its own card fields, which keep card numbers off your servers. Swap these four for those. */}
          <Stack gap={4}>
            <TextInput label="Name on card" autoComplete="cc-name" {...bind('name')} />
            <TextInput label="Card number" inputMode="numeric" autoComplete="cc-number" maxLength={23} {...bind('number')} />
            <div className="billing-pair">
              <TextInput label="Expires" placeholder="MM / YY" inputMode="numeric" autoComplete="cc-exp" maxLength={7} {...bind('expires')} />
              <TextInput label="Security code" inputMode="numeric" autoComplete="cc-csc" maxLength={4} {...bind('code')} />
            </div>
          </Stack>
        </Dialog>

        {notice && (
          <Toast key={notice.id} tone={notice.tone} title={notice.title} duration={7000} onDismiss={() => setNotice(undefined)}>
            {notice.text}
          </Toast>
        )}
      </div>
    </LucideProvider>
  )
}


const css = `
.billing { min-height: 100dvh; display: grid; grid-template-columns: 272px minmax(0, 1fr); color: var(--diya-color-text); }
.billing-skip { position: absolute; z-index: 10; top: var(--diya-space-3); left: var(--diya-space-4); padding: var(--diya-space-2) var(--diya-space-4); border-radius: var(--diya-radius-control); background: var(--diya-color-raised); color: var(--diya-color-text); font-size: var(--diya-text-body); }
.billing-skip:not(:focus) { width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.billing-side { position: sticky; top: 0; display: flex; flex-direction: column; gap: var(--diya-space-5); height: 100dvh; box-sizing: border-box; overflow-y: auto; padding: var(--diya-space-6) var(--diya-space-4); }
.billing-brand { display: flex; align-items: center; gap: var(--diya-space-3); margin: 0; padding: 0 var(--diya-space-3); font-size: var(--diya-text-large); font-weight: 600; }
.billing-mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: calc(10px * var(--diya-corner-scale, 1)); background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-large); font-weight: 650; line-height: 1; }
.billing-section,
.billing-title { margin: 0; font-size: 28px; font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; }
.billing-section { margin-top: var(--diya-space-5); padding: 0 var(--diya-space-3); }
.billing-nav { width: auto; padding: 0; border: 0; background: transparent; backdrop-filter: none; }
.billing-main { min-width: 0; padding: 112px var(--diya-space-7) var(--diya-space-8); border-left: 1px solid var(--diya-color-line); }
.billing-main:focus,
.billing-wide:focus { outline: none; }
.billing-column { max-width: 720px; }
.billing-bar { display: none; }
.billing-head { display: grid; gap: var(--diya-space-2); margin-bottom: var(--diya-space-6); }
.billing-lede,
.billing-note { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.billing-note { font-size: var(--diya-text-caption); }
.billing-meters { display: grid; gap: var(--diya-space-5); }
.billing-meter { display: grid; gap: var(--diya-space-2); }
.billing-meter-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--diya-space-1) var(--diya-space-3); margin: 0; font-size: var(--diya-text-body); font-weight: 500; }
.billing-figure { color: var(--diya-color-muted); font-weight: 400; font-variant-numeric: tabular-nums; }
.billing-card { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-3) var(--diya-space-4); }
.billing-card-icon { display: grid; place-items: center; width: 48px; height: 34px; border: 1px solid var(--diya-color-line); border-radius: calc(6px * var(--diya-corner-scale, 1)); color: var(--diya-color-muted); }
.billing-card-copy { display: grid; flex: 1 1 160px; gap: 2px; margin: 0; font-size: var(--diya-text-body); }
.billing-card-copy > span:last-child { color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-variant-numeric: tabular-nums; }
.billing-card-name { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-1) var(--diya-space-2); }
.billing-wide { width: 100%; max-width: none; }
.billing-phone { display: none; gap: var(--diya-space-4); }
.billing-subtitle { margin: 0; font-size: var(--diya-text-body); font-weight: 600; line-height: var(--diya-leading-tight); }
.billing-rows { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--diya-color-line); }
.billing-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: var(--diya-space-3); padding: var(--diya-space-3) 0; border-bottom: 1px solid var(--diya-color-line); }
.billing-row-text,
.billing-row-end { display: grid; gap: 4px; min-width: 0; }
.billing-row-end { justify-items: end; }
.billing-row-main { font-size: var(--diya-text-body); font-weight: 500; }
.billing-row-meta { color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.billing-figure-strong { font-variant-numeric: tabular-nums; }
.billing-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: var(--diya-space-4); }
@media (max-width: 860px) {
  .billing { grid-template-columns: minmax(0, 1fr); }
  .billing-side { display: none; }
  .billing-main { padding: 0 var(--diya-space-4) var(--diya-space-7); border-left: 0; }
  .billing-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-4); height: 56px; margin-bottom: var(--diya-space-5); }
  .billing-bar .billing-brand { padding: 0; }
}
@media (max-width: 640px) {
  .billing-desk { display: none; }
  .billing-phone { display: grid; }
}
`

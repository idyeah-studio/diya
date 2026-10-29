'use client'
// Billing & plan: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/settings/billing/page.tsx. Vite: save as src/Billing.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Choice, Dialog, Metric, Progress, SideNavigation, Stack, Table, Tag, TextInput, TextLink, Toast, type AlertTone } from '@idyeah/diya'
import { Bell, ChevronLeft, CreditCard, Download, LucideProvider, Palette, Shield, UserRound, Users } from 'lucide-react'

// Your product, the workspace, and what the demo account shows. Today is November 9, 2026.
const PRODUCT = 'Mullion'
const WORKSPACE = 'Bramble & Finch'
const BILLING_EMAIL = 'priya@example.com'
const RENEWS = 'November 21, 2026'
const PERIOD = 'October 21 to November 21'
const SEATS = 10
const DAYS_LEFT = 12
const PERIOD_DAYS = 31
const USED = { seats: 9, storage: 61.4, runs: 8420 }

type PlanId = 'starter' | 'studio' | 'business'
const PLANS: Record<PlanId, { name: string; price: number; seats: number; storage: number; runs: number; blurb: string }> = {
  starter: { name: 'Starter', price: 8, seats: 5, storage: 20, runs: 1000, blurb: 'Up to 5 seats, 20 GB of files and 1,000 automation runs a month.' },
  studio: { name: 'Studio', price: 12, seats: 50, storage: 100, runs: 10000, blurb: 'Up to 50 seats, 100 GB of files and 10,000 automation runs a month.' },
  business: { name: 'Business', price: 24, seats: 500, storage: 1000, runs: 100000, blurb: 'Everything in Studio, with 1 TB, 100,000 runs, single sign-on and an audit log.' },
}

type Card = { brand: string; last4: string; expires: string; expired: boolean }
const CARD: Card = { brand: 'Visa', last4: '4242', expires: '10/26', expired: true }

type Invoice = { id: string; date: string; label: string; amount: number; status: 'Paid' | 'Failed' }
const INVOICES: Invoice[] = [
  { id: 'INV-2026-0187', date: '2026-10-21', label: 'Studio, 10 seats', amount: 120, status: 'Paid' },
  { id: 'INV-2026-0164', date: '2026-09-21', label: 'Studio, 10 seats', amount: 120, status: 'Paid' },
  { id: 'INV-2026-0152', date: '2026-09-02', label: 'One more seat, Sep 2 to 21', amount: 7.35, status: 'Paid' },
  { id: 'INV-2026-0139', date: '2026-08-21', label: 'Studio, 9 seats', amount: 108, status: 'Paid' },
  { id: 'INV-2026-0117', date: '2026-07-21', label: 'Studio, 9 seats', amount: 108, status: 'Paid' },
  { id: 'INV-2026-0098', date: '2026-06-21', label: 'Studio, 9 seats', amount: 108, status: 'Paid' },
]

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
const day = (iso: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${iso}T12:00:00`))
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
  const [plan, setPlan] = useState<PlanId>('studio')
  const [canceled, setCanceled] = useState(false)
  const [trialNotice, setTrialNotice] = useState(true)
  const [card, setCard] = useState(CARD)
  const [invoices, setInvoices] = useState(INVOICES)
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
  const focus = useFocusAfterRender()
  const [notice, setNotice] = useState<Notice>()
  const current = PLANS[plan]
  const picked = PLANS[choice]
  const notify = (tone: AlertTone, title: string, text: string) => setNotice({ tone, title, text, id: Date.now() })
  const close = (open: boolean) => !open && setDialog(undefined)
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
      setInvoices((rows) => [
        { id: invoice, date: '2026-11-09', label: `${PLANS[id].name} upgrade, Nov 9 to 21`, amount, status: 'Paid' },
        ...rows.filter((row) => row.id !== invoice),
      ])
  }

  async function changePlan() {
    if (USED.seats > picked.seats || USED.storage > picked.storage) {
      setChoiceError(`${picked.name} fits ${picked.seats} seats and ${picked.storage} GB. ${WORKSPACE} uses ${USED.seats} seats and ${USED.storage} GB right now.`)
      return false
    }
    const charge = picked.price > current.price ? prorated(picked.price - current.price) : 0
    const invoice = `INV-2026-0${200 + invoices.length}`
    if (!(await api('/subscription', { plan: choice, charge, cardExpired: card.expired }))) {
      setFailed({ plan: choice, amount: charge, invoice })
      focus(failedAlert.current)
      setInvoices([{ id: invoice, date: '2026-11-09', label: `${picked.name} upgrade, Nov 9 to 21`, amount: charge, status: 'Failed' }, ...invoices])
      return
    }
    settle(choice, charge, invoice)
    focus(planButton.current)
    notify('success', `You’re on ${picked.name}`, charge > 0 ? `We charged ${money(charge)} to ${card.brand} ending ${card.last4} for the rest of this period.` : `Your new price starts today. We’ll credit what’s left of ${current.name} to your next invoice.`)
  }

  async function saveCard() {
    const digits = form.number.replace(/\D/g, '')
    const [, month, year] = /^(\d{2})\s*\/?\s*(\d{2})$/.exec(form.expires.trim()) ?? []
    const found: Partial<CardForm> = {
      name: form.name.trim() ? undefined : 'Enter the name on the card.',
      number: digits.length >= 15 && digits.length <= 16 ? undefined : 'Enter the 15 or 16 digits on the front of the card.',
      expires: !month || Number(month) > 12 || Number(month) < 1 ? 'Enter the month and year, like 08 / 29.' : Number(year) * 12 + Number(month) < 26 * 12 + 11 ? 'This card has expired.' : undefined,
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
      focus(planButton.current)
      return notify('success', 'Card updated, and the payment went through', `You’re on ${PLANS[failed.plan].name}. We charged ${money(failed.amount)} to ${next.brand} ending ${next.last4}.`)
    }
    notify('success', 'Card updated', `We’ll charge ${next.brand} ending ${next.last4} on ${RENEWS}.`)
  }

  async function cancel() {
    await api('/subscription/cancel', { reason })
    setCanceled(true)
    focus(planButton.current)
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
            <TextLink className="billing-back" href="/settings" leadingIcon={<ChevronLeft />}>Settings</TextLink>
            <header className="billing-head">
              <h1 className="billing-title">Billing & plan</h1>
              <p className="billing-lede">{WORKSPACE}’s plan, what you’ve used this month, and every invoice.</p>
            </header>

            <Stack gap={6}>
              {failed && (
                <Alert ref={failedAlert} tabIndex={-1} className="billing-wide" tone="error" urgent title="Your payment didn’t go through" action={{ label: 'Update card', onClick: () => setDialog('card') }}>
                  We couldn’t charge {money(failed.amount)} for {PLANS[failed.plan].name} to {card.brand} ending {card.last4}, because the card expired in October. Update it and we’ll try again right away.
                </Alert>
              )}
              {trialNotice && !failed && (
                <Alert className="billing-wide" tone="info" title="Your Business trial ended on November 7" action={{ label: 'Upgrade to Business', onClick: () => openPlan('business') }} onDismiss={() => setTrialNotice(false)}>
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
                <Metric label={canceled ? 'Last charge' : 'Next charge'} value={money(current.price * SEATS)} unit={canceled ? 'on Oct 21' : 'a month'} />
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

function useFocusAfterRender() {
  const [target, setTarget] = useState<{ node: HTMLElement | null }>()
  useEffect(() => target?.node?.focus(), [target])
  return (node: HTMLElement | null) => setTarget({ node })
}

const css = `
.billing { min-height: 100dvh; display: grid; grid-template-columns: 272px minmax(0, 1fr); color: var(--diya-color-text); }
.billing-skip { position: absolute; z-index: 10; top: var(--diya-space-3); left: var(--diya-space-4); padding: var(--diya-space-2) var(--diya-space-4); border-radius: var(--diya-radius-control); background: var(--diya-color-raised); color: var(--diya-color-text); font-size: var(--diya-text-body); }
.billing-skip:not(:focus) { width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.billing-side { position: sticky; top: 0; display: flex; flex-direction: column; gap: var(--diya-space-5); height: 100dvh; box-sizing: border-box; overflow-y: auto; padding: var(--diya-space-6) var(--diya-space-4); }
.billing-brand { display: flex; align-items: center; gap: var(--diya-space-3); margin: 0; padding: 0 var(--diya-space-3); font-size: var(--diya-text-large); font-weight: 600; }
.billing-mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: calc(10px * var(--diya-corner-scale, 1)); background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-large); font-weight: 650; line-height: 1; }
.billing-section,
.billing-title { margin: 0; font-size: var(--diya-text-heading); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; }
.billing-section { margin-top: var(--diya-space-5); padding: 0 var(--diya-space-3); }
.billing-nav { width: auto; padding: 0; border: 0; background: transparent; backdrop-filter: none; }
.billing-main { min-width: 0; padding: 112px var(--diya-space-7) var(--diya-space-8); border-left: 1px solid var(--diya-color-line); }
.billing-main:focus,
.billing-wide:focus { outline: none; }
.billing-column { max-width: 960px; margin-inline: auto; }
.billing-column > * { max-width: 720px; }
.billing-back { display: none; }
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
.billing-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: var(--diya-space-4); }
@media (max-width: 860px) {
  .billing { grid-template-columns: minmax(0, 1fr); }
  .billing-side { display: none; }
  .billing-main { padding: var(--diya-space-5) var(--diya-space-4) var(--diya-space-7); border-left: 0; }
  .billing-back { display: inline-flex; margin: 0 0 var(--diya-space-5) calc(var(--diya-space-1) * -1); }
}
`

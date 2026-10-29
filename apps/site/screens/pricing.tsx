'use client'
// Pricing: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/pricing/page.tsx. Vite: save as src/Pricing.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Accordion, Button, Card, Dialog, Metric, Select, SiteHeader, Slider, Table, Tabs, TextArea, TextInput, TextLink, Toast, type TableColumn,
} from '@idyeah/diya'
import { ArrowRight, Check, LucideProvider, Minus } from 'lucide-react'

// Your product and its plans. Prices are US dollars a person a month on monthly billing; yearly takes 20% off.
const PRODUCT = 'Lumenary'
const YEARLY_DISCOUNT = 0.2
const TRIAL_DAYS = 14
const MAX_SEATS = 100

type PlanId = 'free' | 'team' | 'business'
type Plan = { id: PlanId; name: string; pitch: string; monthly: number; action: string; href: string; lead: string; features: string[] }

const PLANS: Plan[] = [
  {
    id: 'free', name: 'Free', pitch: 'For a few people getting organized.', monthly: 0, action: 'Start free', href: '/sign-up',
    lead: 'What you get', features: ['Up to 3 people', '50 docs and plans', '7 days of version history', '3 integrations'],
  },
  {
    id: 'team', name: 'Team', pitch: 'For teams who ship every week.', monthly: 15, action: 'Start a free trial', href: '/sign-up?plan=team',
    lead: 'Everything in Free, plus', features: ['Unlimited people and docs', 'A year of version history', 'Guests and private spaces', '500 automation runs a month'],
  },
  {
    id: 'business', name: 'Business', pitch: 'For companies with more people and rules.', monthly: 30, action: 'Start a free trial', href: '/sign-up?plan=business',
    lead: 'Everything in Team, plus', features: ['SAML single sign-on', 'Admin roles and an audit log', 'Version history, forever', 'Priority support within 4 hours'],
  },
]
const FEATURED: PlanId = 'team'

type Cell = boolean | string
type Row = { id: string; feature: string } & Record<PlanId, Cell>
const COMPARISON: Row[] = [
  { id: 'people', feature: 'People', free: 'Up to 3', team: 'Unlimited', business: 'Unlimited' },
  { id: 'docs', feature: 'Docs and plans', free: '50', team: 'Unlimited', business: 'Unlimited' },
  { id: 'history', feature: 'Version history', free: '7 days', team: '1 year', business: 'Forever' },
  { id: 'guests', feature: 'Guests', free: false, team: '10 per space', business: 'Unlimited' },
  { id: 'private', feature: 'Private spaces', free: false, team: true, business: true },
  { id: 'integrations', feature: 'Integrations', free: '3', team: 'All 40', business: 'All 40' },
  { id: 'automations', feature: 'Automation runs a month', free: false, team: '500', business: '5,000' },
  { id: 'roles', feature: 'Admin roles', free: false, team: false, business: true },
  { id: 'sso', feature: 'SAML single sign-on', free: false, team: false, business: true },
  { id: 'audit', feature: 'Audit log', free: false, team: false, business: true },
  { id: 'uptime', feature: 'Uptime commitment', free: false, team: false, business: '99.9%' },
  { id: 'support', feature: 'Support', free: 'Help center', team: 'Email, next business day', business: 'Priority, within 4 hours' },
]

const FAQ = [
  { id: 'person', label: 'Who counts as a person?', content: 'Anyone who can edit in your workspace. People who only view shared links, and guests on Team and Business, are free.' },
  { id: 'switch', label: 'Can I switch between monthly and yearly?', content: 'Yes, from Billing at any time. Moving to yearly starts the discount right away, and we credit what’s left of your month.' },
  { id: 'trial', label: 'What happens when my trial ends?', content: `After ${TRIAL_DAYS} days your workspace moves to Free unless you add a card. Nothing is deleted; docs over the Free limit become read-only until you upgrade.` },
  { id: 'discounts', label: 'Do you offer discounts for nonprofits and schools?', content: 'Registered nonprofits and schools get Team at half price. Write to us from your organization’s email and we’ll set it up.' },
  { id: 'cancel', label: 'Can I cancel at any time?', content: 'Yes. Cancel from Billing and you keep your plan until the end of the period you paid for. Yearly plans are refunded for full unused months.' },
]

const SIZES = [
  { value: '50-100', label: '50 to 100 people' },
  { value: '101-250', label: '101 to 250 people' },
  { value: '251-1000', label: '251 to 1,000 people' },
  { value: '1000+', label: 'More than 1,000 people' },
]

type Period = 'monthly' | 'yearly'
type Sales = { name: string; email: string; size: string; message: string }

// Replace with your API call. The stub waits a moment, then fails when the message contains `fail`.
async function api(route: '/sales', body: Sales) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return route === '/sales' && !/fail/i.test(body.message)
}

const money = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount)
const people = (count: number) => `${new Intl.NumberFormat('en-US').format(count)} ${count === 1 ? 'person' : 'people'}`
const priceOf = (plan: Plan, period: Period) => (period === 'yearly' ? plan.monthly * (1 - YEARLY_DISCOUNT) : plan.monthly)
const emailProblem = (email: string) =>
  !email.trim() ? 'Enter your work email.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : 'Enter an email address like name@example.com.'

export default function PricingScreen() {
  const [period, setPeriod] = useState<Period>('yearly')
  const [salesOpen, setSalesOpen] = useState(false)
  const [sentTo, setSentTo] = useState<string>()

  const plans = <PlanGrid period={period} />

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="pricing">
        <style>{css}</style>
        <SiteHeader
          brand={<span className="pricing-brand"><span className="pricing-mark" aria-hidden="true">{PRODUCT[0]}</span>{PRODUCT}</span>}
          brandHref="/"
          brandLabel={`${PRODUCT} home`}
          items={[
            { value: 'product', label: 'Product', href: '/product' },
            { value: 'pricing', label: 'Pricing', href: '/pricing' },
            { value: 'customers', label: 'Customers', href: '/customers' },
            { value: 'changelog', label: 'Changelog', href: '/changelog' },
          ]}
          value="pricing"
          utilities={<Button variant="quiet" href="/sign-in">Sign in</Button>}
        />

        <main className="pricing-main">
          <section className="pricing-hero" aria-labelledby="pricing-title">
            <h1 id="pricing-title" className="pricing-h1">Start free. Pay when it’s worth it.</h1>
            <p className="pricing-lede">
              Try every feature free for {TRIAL_DAYS} days. After that, pay per person, change plans whenever you like, and keep everything you made either way.
            </p>
            <Tabs
              className="pricing-period"
              variant="pill"
              label="Billing period"
              value={period}
              onValueChange={(value) => setPeriod(value as Period)}
              items={[
                { value: 'monthly', label: 'Monthly', content: plans },
                { value: 'yearly', label: `Yearly · save ${YEARLY_DISCOUNT * 100}%`, content: plans },
              ]}
            />
            <p className="pricing-enterprise" role="status">
              {sentTo ? (
                <span>Thanks. Our sales team will write to <strong>{sentTo}</strong> within one business day.</span>
              ) : (
                <>
                  <span>More than {MAX_SEATS} people, or a security review on the way? <strong>Enterprise</strong> adds SCIM, a named contact and custom terms.</span>
                  <Button variant="outline" onClick={() => setSalesOpen(true)}>Talk to sales</Button>
                </>
              )}
            </p>
          </section>

          <Calculator period={period} onPeriodChange={setPeriod} onTalk={() => setSalesOpen(true)} />

          <section className="pricing-section" aria-labelledby="pricing-compare">
            <Heading id="pricing-compare" lede="The details, side by side. Every plan includes the editor, comments, search and the mobile apps.">
              Compare plans
            </Heading>
            <Table label="Compare plans" showTitle={false} rows={COMPARISON} columns={columns} rowLabel={(row) => row.feature}
              density="compact" pagination={false} sticky className="pricing-table" />
          </section>

          <section className="pricing-section pricing-split" aria-labelledby="pricing-faq">
            <Heading id="pricing-faq">Questions, answered</Heading>
            <Accordion className="pricing-full" items={FAQ.map((item) => ({ ...item, content: <p className="pricing-answer">{item.content}</p> }))} />
          </section>

          <section className="pricing-section pricing-closing" aria-labelledby="pricing-closing">
            <Heading id="pricing-closing" lede={`Team is free for ${TRIAL_DAYS} days. No card, and nothing changes when the trial ends unless you say so.`}>
              Try it with your team.
            </Heading>
            <Button size="large" href="/sign-up?plan=team">
              Start your free trial <ArrowRight />
            </Button>
          </section>
        </main>

        <footer className="pricing-footer">
          <p>Prices in US dollars, before tax.</p>
          <p>© 2026 {PRODUCT}</p>
        </footer>

        <SalesDialog open={salesOpen} onOpenChange={setSalesOpen} onSent={setSentTo} />
      </div>
    </LucideProvider>
  )
}

function PlanGrid({ period }: { period: Period }) {
  return (
    <div className="pricing-plans">
      {PLANS.map((plan) => {
        const featured = plan.id === FEATURED
        const price = priceOf(plan, period)
        return (
          <Card
            key={plan.id}
            title={plan.name}
            headingLevel={2}
            description={plan.pitch}
            shadow={featured}
            className="pricing-plan"
            data-featured={featured || undefined}
            actions={featured ? <span className="pricing-popular">Most popular</span> : undefined}
          >
            <div className="pricing-plan-body">
              <div className="pricing-stack">
                <div className="pricing-price">
                  <span className="pricing-amount">{money(price)}</span>
                  <span className="pricing-per">{plan.monthly ? <>per person<br />per month</> : <>for up to<br />3 people</>}</span>
                </div>
                <p className="pricing-billed">
                  {!plan.monthly ? 'Free forever, no card needed.' : period === 'yearly' ? `Billed yearly, ${money(price * 12)} a person.` : 'Billed monthly. Cancel anytime.'}
                </p>
              </div>
              <Button href={plan.href} variant={featured ? 'solid' : 'outline'} className="pricing-wide">{plan.action}</Button>
              <div className="pricing-stack">
                <p className="pricing-lead">{plan.lead}</p>
                <ul className="pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature}><Check className="pricing-check" />{feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function Calculator({ period, onPeriodChange, onTalk }: { period: Period; onPeriodChange: (period: Period) => void; onTalk: () => void }) {
  const [seats, setSeats] = useState(18)
  const paid = PLANS.filter((plan) => plan.monthly > 0)

  return (
    <section className="pricing-section pricing-split" aria-labelledby="pricing-calc">
      <Heading id="pricing-calc" lede="Slide to the size of your team for a monthly estimate. Guests and people who only view are free, so leave them out.">
        What would we pay?
      </Heading>
      <Card title="Your estimate" className="pricing-calc-card" divided
        footer={
          <p className="pricing-billed">
            {period === 'yearly' ? 'Yearly prices, shown per month.' : 'Monthly prices.'}{' '}
            <TextLink asChild inline>
              <button type="button" className="pricing-link" onClick={() => onPeriodChange(period === 'yearly' ? 'monthly' : 'yearly')}>
                {period === 'yearly' ? 'Show monthly prices' : 'Show yearly prices'}
              </button>
            </TextLink>
          </p>
        }
      >
        <div className="pricing-calc-body">
          <Slider label="People on your team" min={1} max={MAX_SEATS} value={seats} onValueChange={setSeats} className="pricing-full" />
          <div className="pricing-calc-results" aria-live="polite">
            {paid.map((plan) => {
              const price = priceOf(plan, period)
              return (
                <div key={plan.id} className="pricing-calc-plan">
                  <Metric label={plan.name} value={money(price * seats)} unit="a month" size="large" />
                  <p className="pricing-billed">
                    {people(seats)} at {money(price)}{period === 'yearly' ? `, billed ${money(price * seats * 12)} a year.` : ', billed monthly.'}
                  </p>
                </div>
              )
            })}
          </div>
          {seats <= 3 && <p className="pricing-note">Three people or fewer? Free covers you, at {money(0)}.</p>}
          {seats >= MAX_SEATS && (
            <div className="pricing-note pricing-note-row">
              <span>{MAX_SEATS} people or more? Enterprise pricing gets kinder at this size.</span>
              <Button variant="outline" size="small" onClick={onTalk}>Talk to sales</Button>
            </div>
          )}
        </div>
      </Card>
    </section>
  )
}

const columns: TableColumn<Row>[] = [
  { key: 'feature', label: 'Feature', width: 190, render: (row) => <span className="pricing-feature">{row.feature}</span> },
  ...PLANS.map((plan): TableColumn<Row> => ({ key: plan.id, label: plan.name, width: 180, render: (row) => <Included value={row[plan.id]} /> })),
]

function Included({ value }: { value: Cell }) {
  if (value === true) return <span className="pricing-yes"><Check /><span className="pricing-sr">Included</span></span>
  if (value === false) return <span className="pricing-no"><Minus /><span className="pricing-sr">Not included</span></span>
  return <>{value}</>
}

function SalesDialog({ open, onOpenChange, onSent }: { open: boolean; onOpenChange: (open: boolean) => void; onSent: (email: string) => void }) {
  const [form, setForm] = useState<Sales>({ name: '', email: '', size: '', message: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof Sales, string>>>({})
  const [toast, setToast] = useState<string>()
  const fields = useRef<Partial<Record<keyof Sales, HTMLInputElement | HTMLSelectElement | null>>>({})
  const focus = useFocusAfterRender()
  const set = (key: keyof Sales) => (value: string) => {
    setForm({ ...form, [key]: value })
    setErrors({ ...errors, [key]: undefined })
  }

  async function send() {
    const found = {
      name: form.name.trim() ? undefined : 'Enter your name.',
      email: emailProblem(form.email),
      size: form.size ? undefined : 'Choose how many people work at your company.',
    }
    setErrors(found)
    const first = (['name', 'email', 'size'] as const).find((key) => found[key])
    if (first) {
      focus(fields.current[first] ?? null)
      return false
    }
    if (!(await api('/sales', form))) throw new Error('That didn’t send. Your message is still here, so try again in a moment.')
    onSent(form.email.trim())
    setToast(`Thanks, ${form.name.trim().split(' ')[0]}. We’ll be in touch soon.`)
    setForm({ name: '', email: '', size: '', message: '' })
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Talk to sales"
        description={`Tell us a little about your team. Someone who knows ${PRODUCT} well will write within one business day.`}
        confirmLabel="Send"
        onConfirm={send}
      >
        <div className="pricing-dialog-fields">
          <TextInput ref={(node) => { fields.current.name = node }} label="Name" autoComplete="name" value={form.name} error={errors.name} onValueChange={set('name')} />
          <TextInput ref={(node) => { fields.current.email = node }} label="Work email" type="email" autoComplete="email" value={form.email} error={errors.email} onValueChange={set('email')} />
          <Select ref={(node) => { fields.current.size = node }} label="Company size" placeholder="Choose one" options={SIZES} value={form.size} error={errors.size} onValueChange={set('size')} />
          <TextArea label="What are you looking for? (optional)" rows={3} value={form.message} onValueChange={set('message')} />
        </div>
      </Dialog>
      {toast && <Toast tone="success" onDismiss={() => setToast(undefined)}>{toast}</Toast>}
    </>
  )
}

function Heading({ id, lede, children }: { id: string; lede?: string; children: ReactNode }) {
  return (
    <header className="pricing-heading">
      <h2 id={id} className="pricing-h2">{children}</h2>
      {lede && <p className="pricing-lede">{lede}</p>}
    </header>
  )
}

function useFocusAfterRender() {
  const [target, setTarget] = useState<{ node: HTMLElement | null }>()
  useEffect(() => target?.node?.focus(), [target])
  return (node: HTMLElement | null) => setTarget({ node })
}

const css = `
.pricing { min-height: 100dvh; display: flex; flex-direction: column; color: var(--diya-color-text); }
.pricing-brand { display: inline-flex; align-items: center; gap: 10px; font-size: var(--diya-text-large); font-weight: 650; letter-spacing: -0.02em; }
.pricing-mark {
  display: grid; place-items: center; width: 28px; height: 28px;
  border-radius: calc(8px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text);
  font-size: var(--diya-text-body); font-weight: 700;
}
.pricing-main { flex: 1; width: 100%; max-width: 1180px; margin: 0 auto; padding: 0 var(--diya-space-5); }
.pricing-hero { display: grid; justify-items: center; padding: clamp(56px, 10vh, 112px) 0 var(--diya-space-8); text-align: center; }
.pricing-h1 {
  max-width: 14ch; margin: 0;
  font-size: clamp(40px, 6.4vw, 80px); font-weight: 650; line-height: 1.02; letter-spacing: -0.045em; text-wrap: balance;
}
.pricing-h2 { margin: 0; font-size: clamp(30px, 3.8vw, 48px); font-weight: 650; line-height: 1.06; letter-spacing: -0.035em; text-wrap: balance; }
.pricing-lede {
  max-width: 600px; margin: 0; color: var(--diya-color-muted);
  font-size: clamp(var(--diya-text-large), 1.5vw, var(--diya-text-title)); line-height: 1.45; letter-spacing: -0.01em; text-wrap: pretty;
}
.pricing-hero > .pricing-lede { margin-top: var(--diya-space-5); }
.pricing-period { display: grid; justify-items: center; margin-top: var(--diya-space-7); text-align: start; }
.pricing-plans { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--diya-space-5); align-items: stretch; margin-top: var(--diya-space-5); }
.pricing-plan-body { display: grid; gap: var(--diya-space-5); padding-top: var(--diya-space-4); }
.pricing-stack { display: grid; gap: var(--diya-space-3); }
.pricing-popular { color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-weight: 500; white-space: nowrap; }
.pricing-price { display: flex; align-items: center; gap: var(--diya-space-3); }
.pricing-amount { font-size: clamp(44px, 4.4vw, 56px); font-weight: 650; line-height: 1; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.pricing-plan[data-featured] .pricing-amount { font-weight: 700; }
.pricing-per { color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: 1.3; }
.pricing-billed { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: 1.45; font-variant-numeric: tabular-nums; }
.pricing-wide { width: 100%; }
.pricing-lead { margin: 0; font-size: var(--diya-text-caption); font-weight: 600; }
.pricing-features { display: grid; gap: var(--diya-space-3); margin: 0; padding: 0; list-style: none; font-size: var(--diya-text-body); line-height: 1.4; }
.pricing-features li { display: flex; gap: var(--diya-space-3); align-items: flex-start; }
.pricing-check { flex-shrink: 0; margin-top: 1px; color: var(--diya-color-muted); }
.pricing-enterprise {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--diya-space-3) var(--diya-space-5);
  max-width: 820px; margin: var(--diya-space-7) 0 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: 1.5; text-wrap: pretty;
}
.pricing-enterprise strong { color: var(--diya-color-text); font-weight: 600; }
.pricing-section { display: grid; gap: var(--diya-space-6); padding: var(--diya-space-8) 0; border-top: 1px solid var(--diya-color-line); }
.pricing-heading { display: grid; gap: var(--diya-space-4); }
.pricing-split { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); align-items: start; gap: var(--diya-space-7); }
.pricing-full { width: 100%; max-width: none; }
.pricing-link { padding: 0; border: 0; background: none; font: inherit; cursor: pointer; }
.pricing-calc-body { display: grid; gap: var(--diya-space-5); padding-top: var(--diya-space-3); }
.pricing-calc-results { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--diya-space-5); padding-top: var(--diya-space-5); border-top: 1px solid var(--diya-color-line); }
.pricing-calc-plan { display: grid; gap: var(--diya-space-2); align-content: start; }
.pricing-note { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: 1.5; }
.pricing-note-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-3); color: var(--diya-color-text); }
.pricing-table { font-size: var(--diya-text-body); }
.pricing-feature { font-weight: 500; }
.pricing-yes, .pricing-no { display: inline-flex; }
.pricing-no { color: var(--diya-color-muted); }
.pricing-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.pricing-answer { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.pricing-closing { justify-items: center; text-align: center; padding-bottom: clamp(64px, 12vh, 128px); }
.pricing-closing .pricing-heading { justify-items: center; }
.pricing-dialog-fields { display: grid; gap: var(--diya-space-4); }
.pricing-footer {
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--diya-space-2) var(--diya-space-5);
  width: calc(100% - 2 * var(--diya-space-5)); max-width: 1132px; margin: 0 auto; padding: var(--diya-space-5) 0;
  border-top: 1px solid var(--diya-color-line); color: var(--diya-color-muted); font-size: var(--diya-text-caption);
}
.pricing-footer p { margin: 0; }
@media (max-width: 960px) {
  .pricing-plans { grid-template-columns: minmax(0, 1fr); max-width: 520px; margin-inline: auto; }
  .pricing-split { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-6); }
}
@media (max-width: 520px) {
  .pricing-main { padding: 0 var(--diya-space-4); }
  .pricing-footer { width: calc(100% - 2 * var(--diya-space-4)); }
  .pricing-hero { padding-top: var(--diya-space-7); }
  .pricing-section { padding: var(--diya-space-7) 0; }
  .pricing-calc-results { grid-template-columns: minmax(0, 1fr); }
}
`

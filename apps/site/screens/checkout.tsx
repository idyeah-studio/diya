'use client'
// Checkout: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/checkout/page.tsx. Vite: save as src/Checkout.tsx and render it inside your DiyaProvider.
import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { Accordion, Alert, Button, Choice, Select, SiteHeader, Switch, Tag, TextInput, TextLink } from '@idyeah/diya'
import { ArrowLeft, CircleCheck, CreditCard, Lock, LucideProvider } from 'lucide-react'

// Your store, what's in the bag, and how it ships.
const STORE = 'Nore'
const TAX_RATE = 0.0825
// The drawings stand in for your product photos, so they keep their own colors in every theme.
const LIGHT = '#fffdf8', SHADOW = '#1d1a16'
const ITEMS = [
  { id: 'wren', name: 'Wren bud vase', detail: 'Chalk, small', price: 36, quantity: 1, shape: 'bud', glaze: '#ece7de' },
  { id: 'halden', name: 'Halden mug', detail: 'Chalk', price: 28, quantity: 2, shape: 'mug', glaze: '#ece7de' },
  { id: 'tove', name: 'Tove serving bowl', detail: 'Sage', price: 58, quantity: 1, shape: 'bowl', glaze: '#b2baa3' },
] as const
const DELIVERY = [
  { value: 'standard', label: 'Standard, free', description: '3 to 5 business days. Arrives by Thursday, November 5.', price: 0, arrives: 'By Thursday, November 5' },
  { value: 'express', label: 'Express, $18', description: '2 business days. Arrives by Monday, November 2.', price: 18, arrives: 'By Monday, November 2' },
  { value: 'overnight', label: 'Next day, $32', description: 'Order by 2 p.m. Arrives Friday, October 30.', price: 32, arrives: 'Friday, October 30' },
]
const STATES = 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming'
  .split('|').map((name) => ({ value: name, label: name }))

// Replace with your API calls. The stubs wait a moment. The promo code DIYA10
// takes 10% off and any other code is turned down; the card is declined when
// the email is declined@example.com, and every other order goes through.
async function applyPromo(code: string) {
  await new Promise((resolve) => setTimeout(resolve, 700))
  return code.trim().toUpperCase() === 'DIYA10' ? { code: 'DIYA10', percent: 10 } : null
}
async function placeOrder(order: { email: string; total: number }) {
  await new Promise((resolve) => setTimeout(resolve, 1400))
  if (order.email.trim().toLowerCase() === 'declined@example.com') return { ok: false as const }
  return { ok: true as const, number: `NR-${Math.floor(10000 + Math.random() * 90000)}` }
}

type Field = 'email' | 'firstName' | 'lastName' | 'address' | 'city' | 'state' | 'zip'
type Details = Record<Field | 'apartment' | 'phone', string>
type Promo = { code: string; percent: number } | null
const EMPTY: Details = { email: '', firstName: '', lastName: '', address: '', apartment: '', city: '', state: '', zip: '', phone: '' }

const PROBLEMS: Record<Field, (value: string) => string | undefined> = {
  email: (v) => (!v.trim() ? 'Enter your email address.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? undefined : 'Enter an email address like name@example.com.'),
  firstName: (v) => (v.trim() ? undefined : 'Enter your first name.'),
  lastName: (v) => (v.trim() ? undefined : 'Enter your last name.'),
  address: (v) => (v.trim() ? undefined : 'Enter your street address.'),
  city: (v) => (v.trim() ? undefined : 'Enter your city.'),
  state: (v) => (v ? undefined : 'Choose your state.'),
  zip: (v) => (/^\d{5}(-\d{4})?$/.test(v.trim()) ? undefined : 'Enter a 5-digit ZIP code.'),
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const money = (amount: number) => usd.format(amount)

function totalsFor(promo: Promo, shipping: number) {
  const subtotal = ITEMS.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discount = promo ? Math.round(subtotal * promo.percent) / 100 : 0
  const tax = Math.round((subtotal - discount) * TAX_RATE * 100) / 100
  return { subtotal, discount, shipping, tax, total: subtotal - discount + shipping + tax }
}

export default function CheckoutScreen() {
  const [details, setDetails] = useState(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [news, setNews] = useState(false)
  const [delivery, setDelivery] = useState('standard')
  const [promo, setPromo] = useState<Promo>(null)
  const [busy, setBusy] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [order, setOrder] = useState<string>()
  const summaryRef = useRef<HTMLDivElement>(null)
  const declinedRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef<HTMLHeadingElement>(null)
  const [focusNext, setFocusNext] = useState<'summary' | 'declined' | 'done'>()

  // Moves focus once the part it points at has rendered.
  useEffect(() => {
    if (!focusNext) return
    const targets = { summary: summaryRef, declined: declinedRef, done: doneRef }
    targets[focusNext].current?.focus()
    setFocusNext(undefined)
  }, [focusNext])

  const method = DELIVERY.find((d) => d.value === delivery)!
  const totals = totalsFor(promo, method.price)
  const listed = (Object.keys(PROBLEMS) as Field[]).filter((field) => errors[field])

  const field = (name: Field | 'apartment' | 'phone') => ({
    id: `checkout-${name}`,
    className: 'checkout-full',
    value: details[name],
    error: name in PROBLEMS ? errors[name as Field] : undefined,
    onValueChange: (value: string) => {
      setDetails((now) => ({ ...now, [name]: value }))
      setErrors((now) => ({ ...now, [name]: undefined }))
    },
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const found = Object.fromEntries((Object.keys(PROBLEMS) as Field[]).map((name) => [name, PROBLEMS[name](details[name])]))
    setErrors(found)
    setDeclined(false)
    if (Object.values(found).some(Boolean)) return setFocusNext('summary')
    setBusy(true)
    // Your payment provider's card fields hand you a token here; send it with the order.
    const result = await placeOrder({ email: details.email, total: totals.total })
    setBusy(false)
    if (!result.ok) {
      setDeclined(true)
      return setFocusNext('declined')
    }
    setOrder(result.number)
    setFocusNext('done')
  }

  const summary = <Summary totals={totals} promo={promo} onPromo={setPromo} />

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="checkout">
        <style>{css}</style>
        <SiteHeader
          brand={<span className="checkout-brand">{STORE}</span>}
          brandHref="/"
          brandLabel={`${STORE} home`}
          utilities={<span className="checkout-secure"><Lock /> Secure checkout</span>}
        />
        {order ? (
          <main className="checkout-main checkout-done">
            <CircleCheck className="checkout-done-icon" size={40} strokeWidth={1.4} />
            <h1 ref={doneRef} tabIndex={-1} className="checkout-title">Thank you, {details.firstName.trim()}. Your order is in.</h1>
            <p className="checkout-lede">
              Order {order}. We sent a receipt to <strong className="checkout-strong">{details.email.trim()}</strong>, and we’ll
              email tracking the moment your pieces leave the studio.
            </p>
            <dl className="checkout-facts">
              <div><dt>Arriving</dt><dd>{method.arrives}</dd></div>
              <div><dt>Shipping to</dt><dd>{details.address.trim()}{details.apartment.trim() && `, ${details.apartment.trim()}`}, {details.city.trim()}, {details.state} {details.zip.trim()}</dd></div>
              <div><dt>Paid</dt><dd>{money(totals.total)}</dd></div>
            </dl>
            <Button href="/shop" size="large">Keep shopping</Button>
          </main>
        ) : (
          <main className="checkout-main">
            <div className="checkout-intro">
              <TextLink href="/bag" leadingIcon={<ArrowLeft />}>Back to bag</TextLink>
              <h1 className="checkout-title">Checkout</h1>
            </div>
            <div className="checkout-phone-summary">
              <Accordion className="checkout-full" headingLevel={2} items={[{ id: 'summary', label: `Order summary · ${money(totals.total)}`, content: summary }]} />
            </div>

            <div className="checkout-layout" inert={busy}>
              <form className="checkout-form" noValidate aria-label="Checkout" onSubmit={submit}>
                {listed.length > 0 && (
                  <Alert ref={summaryRef} tabIndex={-1} className="checkout-full" tone="error" title={`Check ${listed.length === 1 ? 'one field' : `${listed.length} fields`} before you pay`}>
                    <ul className="checkout-problems">
                      {listed.map((name) => (
                        <li key={name}>
                          <TextLink inline href={`#checkout-${name}`} onClick={(event) => { event.preventDefault(); document.getElementById(`checkout-${name}`)?.focus() }}>
                            {errors[name]}
                          </TextLink>
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}
                <Section title="Contact">
                  <TextInput label="Email" type="email" autoComplete="email" inputMode="email" spellCheck={false} {...field('email')} />
                  <Switch label="Email me when a new batch comes out of the kiln" checked={news} onCheckedChange={setNews} />
                </Section>

                <Section title="Shipping address" lede="We ship anywhere in the US.">
                  <div className="checkout-pair">
                    <TextInput label="First name" autoComplete="given-name" {...field('firstName')} />
                    <TextInput label="Last name" autoComplete="family-name" {...field('lastName')} />
                  </div>
                  <TextInput label="Address" autoComplete="address-line1" {...field('address')} />
                  <TextInput label="Apartment, suite, etc. (optional)" autoComplete="address-line2" {...field('apartment')} />
                  <div className="checkout-trio">
                    <TextInput label="City" autoComplete="address-level2" {...field('city')} />
                    <Select label="State" autoComplete="address-level1" options={STATES} placeholder="Choose" {...field('state')} />
                    <TextInput label="ZIP code" autoComplete="postal-code" inputMode="numeric" maxLength={10} {...field('zip')} />
                  </div>
                  <TextInput label="Phone (optional)" type="tel" autoComplete="tel" helperText="Only if the courier needs to reach you." {...field('phone')} />
                </Section>

                <Section title="Delivery">
                  <Choice label="Delivery speed" hideLabel options={DELIVERY} value={delivery} onValueChange={setDelivery} />
                </Section>

                <Section title="Payment" lede="Your card details go straight to our payment provider. We never see or store them.">
                  {declined && (
                    <Alert ref={declinedRef} tabIndex={-1} className="checkout-full" tone="error" urgent title="Your card was declined">
                      Nothing was charged, and everything you entered is still here. Try another card, or check with your bank.
                    </Alert>
                  )}
                  {/* Mount your payment provider's card fields here. They render inside the
                      provider's own secure frame, so card numbers never reach your server. */}
                  <div className="checkout-slot" id="checkout-card">
                    <CreditCard />
                    <p>Your payment provider’s card fields appear here.</p>
                  </div>
                </Section>

                <Button type="submit" size="large" className="checkout-pay" loading={busy}>
                  {busy ? 'Processing' : `Pay ${money(totals.total)}`}
                </Button>
              </form>

              <aside className="checkout-aside" aria-labelledby="checkout-summary-title">
                <h2 id="checkout-summary-title" className="checkout-section-title">Order summary</h2>
                {summary}
              </aside>
            </div>
          </main>
        )}
      </div>
    </LucideProvider>
  )
}

function Section({ title, lede, children }: { title: string; lede?: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="checkout-section" aria-labelledby={id}>
      <div className="checkout-section-head">
        <h2 id={id} className="checkout-section-title">{title}</h2>
        {lede && <p className="checkout-muted">{lede}</p>}
      </div>
      {children}
    </section>
  )
}

function Summary({ totals, promo, onPromo }: { totals: ReturnType<typeof totalsFor>; promo: Promo; onPromo: (promo: Promo) => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const field = useRef<HTMLInputElement>(null)

  function remove() {
    onPromo(null)
    // The field comes back once the code is gone; put the cursor in it.
    setTimeout(() => field.current?.focus())
  }

  async function apply(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!code.trim()) return setError('Enter a promo code.')
    setBusy(true)
    const found = await applyPromo(code)
    setBusy(false)
    if (!found) return setError(`${code.trim()} isn’t a code we know. Check the spelling, or try another.`)
    onPromo(found)
    setCode('')
  }

  return (
    <div className="checkout-summary">
      <ul className="checkout-items">
        {ITEMS.map((item) => (
          <li key={item.id} className="checkout-item">
            <span className="checkout-thumb"><ItemArt shape={item.shape} glaze={item.glaze} /></span>
            <span className="checkout-item-text">
              <span className="checkout-item-name">{item.name}</span>
              <span className="checkout-muted">{item.detail}{item.quantity > 1 && `, ${item.quantity} of them`}</span>
            </span>
            <span className="checkout-amount">{money(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>

      {promo ? (
        <div className="checkout-applied" role="status">
          <Tag tone="success" label={`Promo code ${promo.code}`} onRemove={remove}>{promo.code}</Tag>
          <span className="checkout-muted">{promo.percent}% off, nicely done.</span>
        </div>
      ) : (
        <form className="checkout-promo" noValidate onSubmit={apply}>
          <TextInput ref={field} className="checkout-promo-field" label="Promo code" autoComplete="off" autoCapitalize="characters" spellCheck={false}
            value={code} error={error} onValueChange={(next) => { setCode(next); setError(undefined) }} />
          <Button type="submit" variant="outline" loading={busy}>Apply</Button>
        </form>
      )}

      <dl className="checkout-totals">
        <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
        {promo && <div><dt>Promo, {promo.code}</dt><dd>−{money(totals.discount)}</dd></div>}
        <div><dt>Shipping</dt><dd>{totals.shipping ? money(totals.shipping) : 'Free'}</dd></div>
        <div><dt>Estimated tax</dt><dd>{money(totals.tax)}</dd></div>
        <div className="checkout-total"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
      </dl>
    </div>
  )
}

// Replace with <img src={item.image} alt="" /> once you have photographs.
const SHAPES: Record<string, { box: string; d: string }> = {
  bud: { box: '30 45 140 140', d: 'M91 60H109V65C107 66 107 70 107 76V88C107 94 112 97 119 101C132 108 138 120 138 134C138 157 121 170 100 170C79 170 62 157 62 134C62 120 68 108 81 101C88 97 93 94 93 88V76C93 70 93 66 91 65Z' },
  mug: { box: '49 73 120 120', d: 'M66 96H126V104C152 104 156 152 126 152V160C126 166 122 170 116 170H76C70 170 66 166 66 160ZM126 114V142C140 141 140 115 126 114Z' },
  bowl: { box: '20 61 160 160', d: 'M36 112H164C164 142 140 164 112 166V170H88V166C60 164 36 142 36 112Z' },
}

function ItemArt({ shape, glaze }: { shape: string; glaze: string }) {
  const id = useId()
  const { box, d } = SHAPES[shape]
  return (
    <svg className="checkout-art" viewBox={box} aria-hidden="true" focusable="false"
      style={{ '--checkout-glaze': glaze, '--checkout-light': LIGHT, '--checkout-shadow': SHADOW } as CSSProperties}>
      <defs>
        <linearGradient id={id}>
          <stop offset="0" className="checkout-lit" stopOpacity="0.5" />
          <stop offset="0.42" className="checkout-lit" stopOpacity="0" />
          <stop offset="0.5" className="checkout-dim" stopOpacity="0" />
          <stop offset="1" className="checkout-dim" stopOpacity="0.32" />
        </linearGradient>
      </defs>
      <path className="checkout-glaze" d={d} />
      <path fill={`url(#${id})`} d={d} />
    </svg>
  )
}

const css = `
.checkout { min-height: 100dvh; color: var(--diya-color-text); }
.checkout-brand { font-size: var(--diya-text-title); font-weight: 650; letter-spacing: -0.03em; }
.checkout-secure { display: inline-flex; align-items: center; gap: var(--diya-space-2); color: var(--diya-color-muted); font-size: var(--diya-text-body); white-space: nowrap; }
.checkout-main { max-width: 1120px; margin: 0 auto; padding: var(--diya-space-7) var(--diya-space-6) var(--diya-space-8); }
.checkout-intro { display: grid; justify-items: start; gap: var(--diya-space-4); margin-bottom: var(--diya-space-7); }
.checkout-title { margin: 0; font-size: var(--diya-text-display); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.03em; text-wrap: balance; }
.checkout-title:focus { outline: none; }
.checkout-layout { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: var(--diya-space-8); align-items: start; }
.checkout-form { display: grid; gap: var(--diya-space-7); min-width: 0; }
.checkout-section { display: grid; gap: var(--diya-space-5); }
.checkout-section-head { display: grid; gap: var(--diya-space-1); }
.checkout-section-title { margin: 0; font-size: var(--diya-text-title); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.015em; }
.checkout-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.checkout-strong { color: var(--diya-color-text); font-weight: 600; overflow-wrap: anywhere; }
.checkout-pair,
.checkout-trio { display: grid; gap: var(--diya-space-4); }
.checkout-pair { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.checkout-trio { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.2fr) minmax(0, 1fr); align-items: start; }
.checkout-problems { display: grid; gap: var(--diya-space-1); margin: var(--diya-space-2) 0 0; padding-inline-start: 1.2em; }
.checkout-slot {
  display: grid;
  justify-items: center;
  gap: var(--diya-space-2);
  padding: var(--diya-space-6) var(--diya-space-5);
  border: 1px dashed var(--diya-color-line);
  border-radius: var(--diya-radius-surface);
  color: var(--diya-color-muted);
  font-size: var(--diya-text-body);
  text-align: center;
}
.checkout-slot p { margin: 0; }
.checkout-pay,
.checkout-full { width: 100%; max-width: none; }
.checkout-aside,
.checkout-phone-summary { border-radius: var(--diya-radius-surface); background: color-mix(in srgb, var(--diya-color-text) 4%, transparent); }
.checkout-aside {
  position: sticky;
  top: var(--diya-space-5);
  display: grid;
  gap: var(--diya-space-5);
  padding: var(--diya-space-6);
}
.checkout-phone-summary { display: none; }
.checkout-summary { display: grid; gap: var(--diya-space-5); }
.checkout-items { display: grid; gap: var(--diya-space-4); margin: 0; padding: 0; list-style: none; }
.checkout-item { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto; align-items: center; gap: var(--diya-space-3); font-size: var(--diya-text-body); }
.checkout-thumb { display: block; aspect-ratio: 1; border-radius: var(--diya-radius-control); background: var(--diya-color-surface); }
.checkout-art { display: block; width: 100%; height: 100%; }
.checkout-glaze { fill: var(--checkout-glaze); }
.checkout-lit { stop-color: var(--checkout-light); }
.checkout-dim { stop-color: var(--checkout-shadow); }
.checkout-item-text { display: grid; min-width: 0; }
.checkout-item-name { font-weight: 500; }
.checkout-amount { font-variant-numeric: tabular-nums; }
.checkout-promo { display: flex; align-items: start; gap: var(--diya-space-2); }
.checkout-promo-field { flex: 1; min-width: 0; }
.checkout-promo > :last-child { margin-top: 30px; }
.checkout-applied { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-3); }
.checkout-totals { display: grid; gap: var(--diya-space-2); margin: 0; padding-top: var(--diya-space-5); border-top: 1px solid var(--diya-color-line); font-size: var(--diya-text-body); }
.checkout-totals div,
.checkout-facts div { display: flex; justify-content: space-between; gap: var(--diya-space-4); }
.checkout-totals dt { color: var(--diya-color-muted); }
.checkout-totals dd,
.checkout-facts dd { margin: 0; font-variant-numeric: tabular-nums; text-align: end; }
.checkout-total { margin-top: var(--diya-space-2); font-size: var(--diya-text-large); font-weight: 600; }
.checkout-totals .checkout-total dt { color: var(--diya-color-text); }
.checkout-done { display: grid; justify-items: start; gap: var(--diya-space-5); max-width: 640px; }
.checkout-done-icon { color: var(--diya-color-success); }
.checkout-lede { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-large); line-height: var(--diya-leading-body); text-wrap: pretty; }
.checkout-facts { display: grid; width: 100%; margin: var(--diya-space-3) 0; font-size: var(--diya-text-body); }
.checkout-facts div { padding-block: var(--diya-space-3); border-top: 1px solid var(--diya-color-line); }
.checkout-facts div:last-child { border-bottom: 1px solid var(--diya-color-line); }
.checkout-facts dt { color: var(--diya-color-muted); white-space: nowrap; }
@media (max-width: 920px) {
  .checkout-main { max-width: 688px; padding: var(--diya-space-5) var(--diya-space-5) var(--diya-space-7); }
  .checkout-intro { margin-bottom: var(--diya-space-5); }
  .checkout-title { font-size: var(--diya-text-heading); }
  .checkout-layout { grid-template-columns: minmax(0, 1fr); }
  .checkout-aside { display: none; }
  .checkout-phone-summary { display: block; margin-bottom: var(--diya-space-6); padding: var(--diya-space-1) var(--diya-space-2); }
  .checkout-phone-summary .checkout-summary { padding-block: var(--diya-space-3); }
  .checkout-lede { font-size: var(--diya-text-body); }
}
@media (max-width: 560px) {
  .checkout-trio { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .checkout-trio > :first-child { grid-column: 1 / -1; }
  .checkout-secure { font-size: var(--diya-text-caption); }
}
@media (max-width: 380px) {
  .checkout-main { padding-inline: var(--diya-space-4); }
  .checkout-pair,
  .checkout-trio { grid-template-columns: minmax(0, 1fr); }
}
`

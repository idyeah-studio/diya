'use client'
// Product detail: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/products/[id]/page.tsx. Vite: save as src/ProductDetail.tsx and render it inside your DiyaProvider.
import { useId, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { Accordion, Alert, Badge, Breadcrumbs, Button, Choice, Progress, Rating, Select, SiteHeader, TextInput, Toast } from '@idyeah/diya'
import { LucideProvider, Minus, Plus, ShoppingBag, Truck } from 'lucide-react'

// Your store and the product on show.
const STORE = 'Nore'
const PRODUCT = { name: 'Wren bud vase', category: 'Vases', rating: 4.8, reviews: 212 }
const BAG_START = 2

// The drawings stand in for your product photos, so they keep their own
// colors in every theme: each glaze, and the light and shadow they're lit with.
const LIGHT = '#fffdf8', SHADOW = '#1d1a16'
const GLAZES = [
  { value: 'chalk', label: 'Chalk', description: 'Warm white, satin', color: '#ece7de' },
  { value: 'sage', label: 'Sage', description: 'Soft green-gray, matte', color: '#b2baa3' },
  { value: 'graphite', label: 'Graphite', description: 'Near-black, satin. Sold out for now', color: '#47494c' },
]
const SIZES = [
  { value: 'small', label: 'Small, 5 in tall', price: 36 },
  { value: 'medium', label: 'Medium, 7 in tall', price: 48 },
  { value: 'large', label: 'Large, 10 in tall', price: 64 },
]
// What's left of each glaze and size. Graphite is between firings.
const STOCK: Record<string, Record<string, number>> = {
  chalk: { small: 40, medium: 18, large: 6 },
  sage: { small: 25, medium: 9, large: 2 },
  graphite: { small: 0, medium: 0, large: 0 },
}
const BACK_ON = 'November 20'

const VIEWS = [
  { value: 'front', label: 'Front' },
  { value: 'above', label: 'From above' },
  { value: 'glaze', label: 'Glaze up close' },
  { value: 'shelf', label: 'On a shelf' },
] as const
type View = (typeof VIEWS)[number]['value']

const STARS = [176, 25, 7, 3, 1]
const REVIEWS = [
  { id: 'r1', name: 'Priya N.', date: 'Oct 21, 2026', rating: 5, title: 'Small, and somehow the whole room changed', text: 'One dried stem of eucalyptus and it looks like a magazine shot. The satin glaze feels lovely in the hand.' },
  { id: 'r2', name: 'Tomás F.', date: 'Oct 9, 2026', rating: 5, title: 'Bought one, came back for two more', text: 'The neck on each one leans a little differently. Grouped in threes on the mantel, that’s the best part.' },
  { id: 'r3', name: 'Grace O.', date: 'Sep 28, 2026', rating: 4, title: 'Lovely, but truly small', text: 'Check the size before you order. Small means a single stem. I’m keeping it and ordering a Large too.' },
]

// Replace with your API calls. The stub waits a moment, then turns down a
// quantity larger than what's left (Sage in Large has 2). Notify me always works.
async function addToBag(item: { glaze: string; size: string; quantity: number }) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  const left = STOCK[item.glaze][item.size]
  return item.quantity <= left ? { ok: true as const } : { ok: false as const, left }
}
async function notifyWhenBack(_request: { email: string; glaze: string }) {
  await new Promise((resolve) => setTimeout(resolve, 800))
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function ProductDetailScreen() {
  const [view, setView] = useState<View>('front')
  const [glaze, setGlaze] = useState('chalk')
  const [size, setSize] = useState('small')
  const [quantity, setQuantity] = useState('1')
  const [busy, setBusy] = useState(false)
  const [refused, setRefused] = useState<number>()
  const [added, setAdded] = useState<string>()
  const [bag, setBag] = useState(BAG_START)

  const chosen = GLAZES.find((g) => g.value === glaze)!
  const sized = SIZES.find((s) => s.value === size)!
  const left = STOCK[glaze][size]
  const count = Math.min(10, Math.max(1, Number.parseInt(quantity, 10) || 1))

  async function add(amount = count) {
    setQuantity(String(amount))
    setRefused(undefined)
    setAdded(undefined)
    setBusy(true)
    const result = await addToBag({ glaze, size, quantity: amount })
    setBusy(false)
    if (!result.ok) return setRefused(result.left)
    setBag(bag + amount)
    setAdded(`${PRODUCT.name}, ${chosen.label}, ${sized.label.split(',')[0].toLowerCase()}. Quantity ${amount}.`)
  }

  const step = (by: number) => {
    setQuantity(String(Math.min(10, Math.max(1, count + by))))
    setRefused(undefined)
  }

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="product">
        <style>{css}</style>
        <SiteHeader
          brand={<span className="product-brand">{STORE}</span>}
          brandHref="/"
          brandLabel={`${STORE} home`}
          items={[
            { value: 'shop', label: 'Shop', href: '/shop' },
            { value: 'lighting', label: 'Lighting', href: '/shop?category=lighting' },
            { value: 'journal', label: 'Journal', href: '/journal' },
            { value: 'studio', label: 'Our studio', href: '/studio' },
          ]}
          value="shop"
          utilities={
            <span className="product-bag">
              <Button variant="quiet" iconOnly href="/bag" aria-label={`Bag, ${bag} items`}>
                <ShoppingBag />
              </Button>
              <Badge className="product-bag-count" variant="count" size="small" count={bag} label="items in your bag" aria-hidden="true" />
            </span>
          }
        />
        <main className="product-main">
          <Breadcrumbs
            className="product-crumbs"
            items={[
              { label: 'Shop', href: '/shop' },
              { label: PRODUCT.category, href: '/shop?category=vases' },
              { label: PRODUCT.name, href: '/products/wren-bud-vase' },
            ]}
          />
          <div className="product-layout">
            <Gallery view={view} onView={setView} color={chosen.color} name={`${PRODUCT.name} in ${chosen.label}`} />

            <div className="product-info">
              <header className="product-header">
                <h1 className="product-title">{PRODUCT.name}</h1>
                <p className="product-price">{usd.format(sized.price)}</p>
                <a className="product-rating" href="#product-reviews">
                  <Rating value={PRODUCT.rating} count={PRODUCT.reviews} showValue />
                </a>
                <p className="product-lede">
                  A round little vase for a single stem, or three if you’re feeling generous. Each one is thrown on the
                  wheel, so every neck leans its own way.
                </p>
              </header>

              <Choice label="Glaze" options={GLAZES} value={glaze} onValueChange={(next) => { setGlaze(next); setRefused(undefined) }} />
              <Select
                className="product-full"
                label="Size"
                options={SIZES.map(({ value, label, price }) => ({ value, label: `${label}, ${usd.format(price)}` }))}
                value={size}
                helperText={left > 0 && left <= 3 ? `Only ${left} left in ${chosen.label}.` : undefined}
                onValueChange={(next) => { setSize(next); setRefused(undefined) }}
              />

              {left === 0 ? (
                <NotifyMe glaze={chosen.label} />
              ) : (
                <form className="product-buy" noValidate onSubmit={(event: FormEvent) => { event.preventDefault(); if (!busy) add() }}>
                  <div>
                    <span className="product-label" aria-hidden="true">Quantity</span>
                    <div className="product-stepper">
                      <Button variant="outline" iconOnly aria-label="One fewer" onClick={() => step(-1)}><Minus /></Button>
                      <TextInput
                        className="product-count"
                        label="Quantity"
                        hideLabel
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={2}
                        value={quantity}
                        onValueChange={(next) => { setQuantity(next.replace(/\D/g, '')); setRefused(undefined) }}
                        onBlur={() => setQuantity(String(count))}
                      />
                      <Button variant="outline" iconOnly aria-label="One more" onClick={() => step(1)}><Plus /></Button>
                    </div>
                  </div>
                  {refused !== undefined && (
                    <Alert tone="error" urgent title={`We have only ${refused} left`} action={{ label: `Add ${refused} instead`, onClick: () => add(refused) }}>
                      There aren’t {count} of these on the shelf. Add the last {refused}, or try another glaze.
                    </Alert>
                  )}
                  <Button type="submit" size="large" className="product-wide" loading={busy}>Add to bag</Button>
                </form>
              )}

              <p className="product-ship"><Truck /> Free shipping over $75. Ships from our studio in 1–2 business days.</p>

              <Accordion
                className="product-full"
                headingLevel={2}
                items={[
                  { id: 'shipping', label: 'Shipping and delivery', content: <p className="product-copy">Standard delivery takes 3–5 business days and is free over $75. Express arrives in 2 business days for $18. Every piece travels in molded paper pulp, no foam.</p> },
                  { id: 'returns', label: 'Returns', content: <p className="product-copy">Changed your mind? Send it back within 30 days for a full refund. If it arrives chipped, tell us within a week and we’ll send a new one. Keep the broken one for the garden.</p> },
                  { id: 'care', label: 'Details and care', content: <p className="product-copy">Stoneware, glazed inside so it holds water. Dishwasher safe, though a quick rinse by hand keeps the satin finish soft for longer.</p> },
                  { id: 'size', label: 'Dimensions', content: <p className="product-copy">Small: 5 in tall, 3.5 in wide. Medium: 7 in tall, 5 in wide. Large: 10 in tall, 7 in wide. The opening fits stems up to 0.5 in across.</p> },
                ]}
              />
            </div>
          </div>

          <Reviews />
        </main>

        {added && (
          <Toast tone="success" title="Added to your bag" action={{ label: 'View bag', onClick: () => window.location.assign('/bag') }} onDismiss={() => setAdded(undefined)}>
            {added}
          </Toast>
        )}
      </div>
    </LucideProvider>
  )
}

function Gallery({ view, onView, color, name }: { view: View; onView: (view: View) => void; color: string; name: string }) {
  const thumbs = useRef<(HTMLButtonElement | null)[]>([])
  const shown = VIEWS.find((v) => v.value === view)!

  // Arrow keys, Home and End move between the pictures.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = VIEWS.findIndex((v) => v.value === view)
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: VIEWS.length - 1 }
    if (!(event.key in keys)) return
    event.preventDefault()
    const target = (keys[event.key] + VIEWS.length) % VIEWS.length
    onView(VIEWS[target].value)
    thumbs.current[target]?.focus()
  }

  return (
    <section className="product-gallery" aria-label="Pictures">
      <div className="product-stage" role="img" aria-label={`${name}, ${shown.label.toLowerCase()}`}>
        <VaseArt view={view} color={color} />
      </div>
      <div className="product-thumbs" role="group" aria-label="Choose a picture" onKeyDown={onKeyDown}>
        {VIEWS.map((v, index) => (
          <button
            key={v.value}
            ref={(node) => { thumbs.current[index] = node }}
            type="button"
            className="product-thumb"
            aria-pressed={v.value === view}
            aria-label={v.label}
            onClick={() => onView(v.value)}
          >
            <VaseArt view={v.value} color={color} />
          </button>
        ))}
      </div>
    </section>
  )
}

function NotifyMe({ glaze }: { glaze: string }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const field = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const problem = !email.trim() ? 'Enter your email address.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : 'Enter an email address like name@example.com.'
    setError(problem)
    if (problem) return field.current?.focus()
    setBusy(true)
    await notifyWhenBack({ email, glaze })
    setBusy(false)
    setDone(email.trim())
  }

  return (
    <div className="product-soldout">
      <p className="product-copy" role="status">
        <strong className="product-strong">{glaze} is sold out.</strong> The next batch is cooling in the kiln and should
        ship around {BACK_ON}.
      </p>
      {done ? (
        <Alert tone="success" title="You’re on the list">We’ll email {done} once, the day {glaze} is back. That’s all.</Alert>
      ) : (
        <form className="product-notify" noValidate onSubmit={submit}>
          <TextInput ref={field} className="product-notify-field" label="Email me when it’s back" type="email" autoComplete="email"
            value={email} error={error} onValueChange={(next) => { setEmail(next); setError(undefined) }} />
          <Button type="submit" variant="outline" loading={busy}>Notify me</Button>
        </form>
      )}
    </div>
  )
}

function Reviews() {
  return (
    <section className="product-reviews" id="product-reviews" aria-labelledby="product-reviews-title">
      <div className="product-summary">
        <h2 id="product-reviews-title" className="product-section-title">Reviews</h2>
        <p className="product-average">{PRODUCT.rating.toFixed(1)}</p>
        <Rating value={PRODUCT.rating} size="large" />
        <p className="product-muted">From {PRODUCT.reviews} reviews</p>
        <ul className="product-bars">
          {STARS.map((count, index) => (
            <li key={index} className="product-bar">
              <span aria-hidden="true">{5 - index} star{index === 4 ? '' : 's'}</span>
              <Progress label={`${5 - index} stars: ${count} reviews`} value={(count / PRODUCT.reviews) * 100} showValue={false} />
              <span className="product-muted" aria-hidden="true">{count}</span>
            </li>
          ))}
        </ul>
      </div>
      <ul className="product-review-list">
        {REVIEWS.map((review) => (
          <li key={review.id} className="product-review">
            <Rating value={review.rating} size="small" />
            <h3 className="product-review-title">{review.title}</h3>
            <p className="product-copy">{review.text}</p>
            <p className="product-muted">{review.name} · Verified buyer · {review.date}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Replace with <img src={photo} alt="" /> once you have photographs.
const VASE = 'M91 60H109V65C107 66 107 70 107 76V88C107 94 112 97 119 101C132 108 138 120 138 134C138 157 121 170 100 170C79 170 62 157 62 134C62 120 68 108 81 101C88 97 93 94 93 88V76C93 70 93 66 91 65Z'
const SHOULDER = 'M76 -25H124V40C124 58 140 66 160 72C200 86 260 140 280 225H-80C-60 140 0 86 40 72C60 66 76 58 76 40Z'
const scatter = (seed: number) => (Math.sin(seed) * 43758.5453) % 1
const SPECKS = Array.from({ length: 60 }, (_, i) => ({ x: -20 + Math.abs(scatter(i + 1)) * 240, y: 80 + Math.abs(scatter(i + 99)) * 145, r: 0.8 + (i % 3) * 0.5 }))

function VaseArt({ view, color }: { view: View; color: string }) {
  const id = useId()
  const lit = `url(#${id}-lit)`
  const soft = `url(#${id}-soft)`
  return (
    <svg className="product-art" viewBox={view === 'front' ? '0 18 200 200' : '-25 -25 250 250'} aria-hidden="true" focusable="false"
      style={{ '--product-glaze': color, '--product-light': LIGHT, '--product-shadow': SHADOW } as CSSProperties}>
      <defs>
        <linearGradient id={`${id}-lit`} y2={view === 'above' ? 1 : 0}>
          <stop offset="0" className="product-lit" stopOpacity="0.55" />
          <stop offset="0.2" className="product-lit" stopOpacity="0.25" />
          <stop offset="0.42" className="product-lit" stopOpacity="0" />
          <stop offset="0.5" className="product-dim" stopOpacity="0" />
          <stop offset="0.75" className="product-dim" stopOpacity="0.12" />
          <stop offset="1" className="product-dim" stopOpacity="0.34" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {view === 'front' && (
        <>
          <ellipse className="product-floor" filter={soft} cx="100" cy="170" rx="46" ry="5" />
          <path className="product-glaze" d={VASE} />
          <path fill={lit} d={VASE} />
        </>
      )}
      {view === 'above' && (
        <>
          <circle className="product-floor" filter={soft} cx="106" cy="106" r="76" />
          <circle className="product-glaze" cx="100" cy="100" r="76" />
          <circle fill={lit} cx="100" cy="100" r="76" />
          <circle className="product-glaze" cx="100" cy="100" r="18" />
          <circle fill={lit} cx="100" cy="100" r="18" transform="rotate(180 100 100)" />
          <circle className="product-hollow" cx="100" cy="100" r="10" />
        </>
      )}
      {view === 'glaze' && (
        <>
          <path className="product-glaze" d={SHOULDER} />
          <path fill={lit} d={SHOULDER} />
          {SPECKS.map((speck, index) => <circle key={index} className="product-speck" cx={speck.x} cy={speck.y} r={speck.r} />)}
        </>
      )}
      {view === 'shelf' && (
        <>
          <rect className="product-shelf" x="-25" y="155" width="250" height="12" rx="2" />
          <path className="product-stem" d="M50 70C46 50 38 30 30 8M50 70C52 46 56 24 62 2M50 70C56 56 66 44 78 36" />
          <g className="product-leaf">
            <ellipse cx="34" cy="20" rx="6" ry="3" transform="rotate(-60 34 20)" />
            <ellipse cx="60" cy="12" rx="6" ry="3" transform="rotate(-80 60 12)" />
            <ellipse cx="72" cy="40" rx="6" ry="3" transform="rotate(-30 72 40)" />
          </g>
          <g transform="translate(-28 22) scale(0.78)">
            <path className="product-glaze" d={VASE} />
            <path fill={lit} d={VASE} />
          </g>
          <rect className="product-book" x="118" y="77" width="16" height="78" rx="2" />
          <rect className="product-book product-book-dark" x="136" y="87" width="20" height="68" rx="2" />
          <rect className="product-book" x="158" y="83" width="14" height="72" rx="2" transform="rotate(12 172 155)" />
        </>
      )}
    </svg>
  )
}

const css = `
.product { min-height: 100dvh; color: var(--diya-color-text); }
.product-brand { font-size: var(--diya-text-title); font-weight: 650; letter-spacing: -0.03em; }
.product-bag { position: relative; display: inline-flex; }
.product-bag-count { position: absolute; top: 2px; right: 0; pointer-events: none; }
.product-main { max-width: 1240px; margin: 0 auto; padding: var(--diya-space-6) var(--diya-space-6) var(--diya-space-8); }
.product-crumbs { margin-bottom: var(--diya-space-6); }
.product-layout { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: var(--diya-space-8); align-items: start; }
.product-gallery { position: sticky; top: var(--diya-space-5); display: grid; gap: var(--diya-space-3); }
.product-stage,
.product-thumb { overflow: hidden; border-radius: var(--diya-radius-surface); background: color-mix(in srgb, var(--diya-color-text) 4%, transparent); }
.product-stage { aspect-ratio: 1; }
.product-thumbs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--diya-space-3); }
.product-thumb { aspect-ratio: 1; padding: 0; border: 1px solid transparent; cursor: pointer; }
.product-thumb:hover { border-color: var(--diya-color-line); }
.product-thumb[aria-pressed='true'] { border-color: var(--diya-color-text); box-shadow: inset 0 0 0 1px var(--diya-color-text); }
.product-art { display: block; width: 100%; height: 100%; }
.product-glaze { fill: var(--product-glaze); }
.product-lit { stop-color: var(--product-light); }
.product-dim { stop-color: var(--product-shadow); }
.product-hollow { fill: var(--product-shadow); opacity: 0.38; }
.product-floor { fill: var(--product-shadow); opacity: 0.16; }
.product-speck { fill: var(--product-shadow); opacity: 0.22; }
.product-shelf { fill: color-mix(in srgb, var(--diya-color-text) 12%, transparent); }
.product-book { fill: color-mix(in srgb, var(--diya-color-text) 20%, transparent); }
.product-book-dark { fill: color-mix(in srgb, var(--diya-color-text) 30%, transparent); }
.product-stem { fill: none; stroke: color-mix(in srgb, var(--diya-color-text) 45%, transparent); stroke-width: 1.5; stroke-linecap: round; }
.product-leaf { fill: color-mix(in srgb, var(--diya-color-text) 40%, transparent); }
.product-info { display: grid; gap: var(--diya-space-6); }
.product-header { display: grid; gap: var(--diya-space-2); }
.product-title { margin: 0; font-size: var(--diya-text-display); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.03em; text-wrap: balance; }
.product-price { margin: 0; font-size: var(--diya-text-title); font-variant-numeric: tabular-nums; }
.product-rating { justify-self: start; color: inherit; text-decoration: none; border-radius: 3px; }
.product-rating:hover { text-decoration: underline; text-underline-offset: 4px; }
.product-rating:focus-visible,
.product-thumb:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: 3px; }
.product-lede { margin: var(--diya-space-3) 0 0; color: var(--diya-color-muted); font-size: var(--diya-text-large); line-height: var(--diya-leading-body); text-wrap: pretty; }
.product-buy { display: grid; gap: var(--diya-space-5); }
.product-label { display: block; margin-bottom: 10px; font-size: var(--diya-text-body); font-weight: 500; }
.product-stepper { display: flex; align-items: center; gap: var(--diya-space-2); }
.product-count { width: 64px; }
.product-wide,
.product-full { width: 100%; max-width: none; }
.product-ship { display: flex; align-items: start; gap: var(--diya-space-2); margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.product-ship svg { flex: none; margin-top: 2px; }
.product-copy { margin: 0; font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.product-strong { font-weight: 600; }
.product-soldout { display: grid; gap: var(--diya-space-4); }
.product-notify { display: flex; align-items: start; gap: var(--diya-space-3); }
.product-notify-field { flex: 1; }
.product-notify > :last-child { margin-top: 30px; }
.product-reviews { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: var(--diya-space-8); margin-top: var(--diya-space-8); padding-top: var(--diya-space-7); border-top: 1px solid var(--diya-color-line); }
.product-summary { display: grid; gap: var(--diya-space-2); align-content: start; }
.product-section-title { margin: 0 0 var(--diya-space-3); font-size: var(--diya-text-heading); font-weight: 600; letter-spacing: -0.02em; }
.product-average { margin: 0; font-size: var(--diya-text-hero); font-weight: 600; line-height: 1; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.product-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); font-variant-numeric: tabular-nums; }
.product-bars { display: grid; gap: var(--diya-space-2); margin: var(--diya-space-4) 0 0; padding: 0; list-style: none; }
.product-bar { display: grid; grid-template-columns: 56px minmax(0, 1fr) 32px; align-items: center; gap: var(--diya-space-3); font-size: var(--diya-text-body); }
.product-bar > :last-child { text-align: end; }
.product-review-list { display: grid; margin: 0; padding: 0; list-style: none; }
.product-review { display: grid; gap: var(--diya-space-2); padding-block: var(--diya-space-5); border-bottom: 1px solid var(--diya-color-line); }
.product-review:first-child { padding-top: 0; }
.product-review:last-child { border-bottom: 0; }
.product-review-title { margin: var(--diya-space-1) 0 0; font-size: var(--diya-text-large); font-weight: 600; line-height: var(--diya-leading-tight); }
@media (max-width: 900px) {
  .product-main { max-width: 688px; padding: var(--diya-space-5) var(--diya-space-5) var(--diya-space-7); }
  .product-crumbs { margin-bottom: var(--diya-space-5); }
  .product-layout,
  .product-reviews { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-6); }
  .product-gallery { position: static; }
  .product-title { font-size: var(--diya-text-heading); }
  .product-lede { font-size: var(--diya-text-body); }
  .product-reviews { margin-top: var(--diya-space-7); padding-top: var(--diya-space-6); }
}
@media (max-width: 380px) {
  .product-main { padding-inline: var(--diya-space-4); }
  .product-notify { flex-direction: column; align-items: stretch; }
  .product-notify > :last-child { margin-top: 0; }
}
`

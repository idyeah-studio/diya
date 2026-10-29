'use client'
// Product listing with filters: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/shop/page.tsx. Vite: save as src/Listing.tsx and render it inside your DiyaProvider.
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { Badge, Button, Choice, ContentState, Drawer, Pagination, Rating, Select, SiteHeader, Slider, Switch, Tag } from '@idyeah/diya'
import { ArrowUpDown, LucideProvider, SearchX, ShoppingBag, SlidersHorizontal } from 'lucide-react'

// Your store, and what's on its shelves.
const STORE = 'Nore'
const BAG_COUNT = 2
const PAGE_SIZE = 12
const PRICE_TOP = 200

type Shape = 'bud' | 'column' | 'bottle' | 'bowl' | 'mug' | 'tumblers' | 'plates' | 'pitcher' | 'lamp' | 'pendant' | 'planter'
type Product = {
  id: string; name: string; category: string; detail: string; price: number
  rating: number; reviews: number; inStock: boolean; added: string; shape: Shape; glaze: string
}

const CATEGORIES = [
  { value: 'all', label: 'Everything' },
  { value: 'vases', label: 'Vases' },
  { value: 'bowls', label: 'Bowls' },
  { value: 'cups', label: 'Mugs and cups' },
  { value: 'table', label: 'Tableware' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'planters', label: 'Planters' },
]
const RATINGS = [
  { value: '0', label: 'Any rating' },
  { value: '4', label: '4 stars and up' },
  { value: '4.5', label: '4.5 stars and up' },
]
const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'low', label: 'Price, low to high' },
  { value: 'high', label: 'Price, high to low' },
  { value: 'rated', label: 'Highest rated' },
]

// The drawings stand in for your product photos, so they keep their own
// colors in every theme: each glaze, and the light and shadow they're lit with.
const CHALK = '#ece7de', OAT = '#d8cbb5', SAGE = '#b2baa3', MIST = '#b7c1c7', STONE = '#a29e96', CLAY = '#bd8467', GRAPHITE = '#47494c'
const LIGHT = '#fffdf8', SHADOW = '#1d1a16'

const PRODUCTS: Product[] = [
  { id: 'wren-bud-vase', name: 'Wren bud vase', category: 'vases', detail: 'Stoneware, 3 glazes', price: 36, rating: 4.8, reviews: 212, inStock: true, added: '2026-09-14', shape: 'bud', glaze: CHALK },
  { id: 'halden-mug', name: 'Halden mug', category: 'cups', detail: 'Stoneware, 12 oz', price: 28, rating: 4.8, reviews: 521, inStock: true, added: '2026-03-02', shape: 'mug', glaze: CHALK },
  { id: 'halo-table-lamp', name: 'Halo table lamp', category: 'lighting', detail: 'Glazed shade, linen cord', price: 189, rating: 4.9, reviews: 77, inStock: true, added: '2026-10-12', shape: 'lamp', glaze: OAT },
  { id: 'tove-serving-bowl', name: 'Tove serving bowl', category: 'bowls', detail: 'Stoneware, 11 in', price: 58, rating: 4.9, reviews: 164, inStock: true, added: '2026-05-20', shape: 'bowl', glaze: SAGE },
  { id: 'arlo-column-vase', name: 'Arlo column vase', category: 'vases', detail: 'Stoneware, 2 glazes', price: 64, rating: 4.6, reviews: 98, inStock: true, added: '2026-07-08', shape: 'column', glaze: STONE },
  { id: 'nima-pendant', name: 'Nima pendant', category: 'lighting', detail: 'Porcelain, 9 ft cord', price: 148, rating: 4.6, reviews: 38, inStock: false, added: '2026-08-30', shape: 'pendant', glaze: GRAPHITE },
  { id: 'fern-planter', name: 'Fern planter', category: 'planters', detail: 'Terracotta, with saucer', price: 42, rating: 4.6, reviews: 134, inStock: true, added: '2026-04-11', shape: 'planter', glaze: CLAY },
  { id: 'sola-dinner-plates', name: 'Sola dinner plates, set of 4', category: 'table', detail: 'Stoneware, 10.5 in', price: 88, rating: 4.7, reviews: 196, inStock: true, added: '2026-02-17', shape: 'plates', glaze: OAT },
  { id: 'juno-bottle-vase', name: 'Juno bottle vase', category: 'vases', detail: 'Porcelain, 14 in tall', price: 82, rating: 4.7, reviews: 41, inStock: false, added: '2026-10-02', shape: 'bottle', glaze: MIST },
  { id: 'etta-pitcher', name: 'Etta pitcher', category: 'table', detail: 'Stoneware, 40 oz', price: 54, rating: 4.5, reviews: 61, inStock: true, added: '2026-06-03', shape: 'pitcher', glaze: CHALK },
  { id: 'ise-tumblers', name: 'Ise tumblers, set of 2', category: 'cups', detail: 'Porcelain, 8 oz', price: 34, rating: 4.4, reviews: 88, inStock: true, added: '2026-09-22', shape: 'tumblers', glaze: MIST },
  { id: 'mori-cereal-bowls', name: 'Mori cereal bowls, set of 4', category: 'bowls', detail: 'Stoneware, 6 in', price: 72, rating: 4.7, reviews: 309, inStock: true, added: '2026-01-26', shape: 'bowl', glaze: OAT },
  { id: 'pip-mini-lamp', name: 'Pip mini lamp', category: 'lighting', detail: 'Glazed shade, dimmable', price: 96, rating: 4.4, reviews: 65, inStock: true, added: '2026-10-20', shape: 'lamp', glaze: CLAY },
  { id: 'bram-latte-mug', name: 'Bram latte mug', category: 'cups', detail: 'Stoneware, 16 oz', price: 32, rating: 4.6, reviews: 143, inStock: true, added: '2026-07-29', shape: 'mug', glaze: GRAPHITE },
  { id: 'sill-planter', name: 'Sill planter', category: 'planters', detail: 'Stoneware, 4 in', price: 24, rating: 4.8, reviews: 71, inStock: true, added: '2026-08-14', shape: 'planter', glaze: CHALK },
  { id: 'lune-salad-bowl', name: 'Lune salad bowl', category: 'bowls', detail: 'Stoneware, 13 in', price: 96, rating: 4.5, reviews: 52, inStock: true, added: '2026-03-30', shape: 'bowl', glaze: CLAY },
  { id: 'ode-carafe', name: 'Ode carafe', category: 'table', detail: 'Porcelain, 28 oz', price: 46, rating: 4.2, reviews: 19, inStock: true, added: '2026-10-25', shape: 'bottle', glaze: CHALK },
  { id: 'bell-pendant', name: 'Bell pendant', category: 'lighting', detail: 'Stoneware, 9 ft cord', price: 164, rating: 4.7, reviews: 22, inStock: true, added: '2026-06-18', shape: 'pendant', glaze: OAT },
  { id: 'moss-planter', name: 'Moss planter, large', category: 'planters', detail: 'Stoneware, 10 in', price: 78, rating: 4.3, reviews: 46, inStock: false, added: '2026-05-05', shape: 'planter', glaze: STONE },
  { id: 'pell-vase', name: 'Pell vase', category: 'vases', detail: 'Stoneware, 9 in tall', price: 48, rating: 3.9, reviews: 27, inStock: true, added: '2026-04-24', shape: 'column', glaze: SAGE },
]

type Filters = { category: string; price: [number, number]; inStock: boolean; rating: string; sort: string }
type Chip = { key: string; label: string; clear: Partial<Filters> }
const NO_FILTERS: Filters = { category: 'all', price: [0, PRICE_TOP], inStock: false, rating: '0', sort: 'featured' }

const ORDER: Record<string, (a: Product, b: Product) => number> = {
  featured: () => 0,
  newest: (a, b) => b.added.localeCompare(a.added),
  low: (a, b) => a.price - b.price,
  high: (a, b) => b.price - a.price,
  rated: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
}

function query(filters: Filters, page: number) {
  const [low, high] = filters.price
  const found = PRODUCTS.filter((p) =>
    (filters.category === 'all' || p.category === filters.category) &&
    p.price >= low && (high === PRICE_TOP || p.price <= high) &&
    (!filters.inStock || p.inStock) && p.rating >= Number(filters.rating),
  ).sort(ORDER[filters.sort])
  return { total: found.length, items: found.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) }
}

// Replace with your API call. The stub waits a moment, then filters, sorts and
// pages the sample products the way your server would.
async function searchProducts(filters: Filters, page: number) {
  await new Promise((resolve) => setTimeout(resolve, 700))
  return query(filters, page)
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const money = (amount: number) => usd.format(amount)
const keyOf = (filters: Filters, page: number) => `${JSON.stringify(filters)} ${page}`
const priceLabel = (price: number) => `${money(price)}${price === PRICE_TOP ? '+' : ''}`
const priceRange = ([low, high]: [number, number]) => `${priceLabel(low)} – ${priceLabel(high)}`

export default function ListingScreen() {
  const [filters, setFilters] = useState(NO_FILTERS)
  const [page, setPage] = useState(1)
  const [results, setResults] = useState(() => ({ key: keyOf(NO_FILTERS, 1), ...query(NO_FILTERS, 1) }))
  const [drawer, setDrawer] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const key = keyOf(filters, page)
  const loading = key !== results.key

  useEffect(() => {
    if (key === results.key) return
    let current = true
    // A short pause, so dragging the price slider asks once, not on every step.
    const timer = setTimeout(async () => {
      const found = await searchProducts(filters, page)
      if (current) setResults({ key, ...found })
    }, 250)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [key, results.key, filters, page])

  const update = (patch: Partial<Filters>) => {
    setFilters((now) => ({ ...now, ...patch }))
    setPage(1)
  }
  const reset = () => {
    update(NO_FILTERS)
    heading.current?.focus()
  }
  const turnTo = (next: number) => {
    setPage(next)
    heading.current?.focus()
  }

  const category = CATEGORIES.find((c) => c.value === filters.category)!
  const chips: (Chip | false)[] = [
    filters.category !== 'all' && { key: 'category', label: category.label, clear: { category: 'all' } },
    (filters.price[0] > 0 || filters.price[1] < PRICE_TOP) && { key: 'price', label: priceRange(filters.price), clear: { price: NO_FILTERS.price } },
    filters.inStock && { key: 'stock', label: 'In stock', clear: { inStock: false } },
    filters.rating !== '0' && { key: 'rating', label: `${filters.rating} stars and up`, clear: { rating: '0' } },
  ]
  const applied = chips.filter((chip) => chip !== false)
  const count = `${results.total} ${results.total === 1 ? 'piece' : 'pieces'}`

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="listing">
        <style>{css}</style>
        <SiteHeader
          brand={<span className="listing-brand">{STORE}</span>}
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
            <span className="listing-bag">
              <Button variant="quiet" iconOnly href="/bag" aria-label={`Bag, ${BAG_COUNT} items`}>
                <ShoppingBag />
              </Button>
              <Badge className="listing-bag-count" variant="count" size="small" count={BAG_COUNT} label="items in your bag" aria-hidden="true" />
            </span>
          }
        />
        <main className="listing-main">
          <header className="listing-intro">
            <h1 className="listing-title">Shop the studio</h1>
            <p className="listing-lede">Vases, tableware and lamps, thrown and glazed by hand in small batches. No two are quite alike, which is the point.</p>
          </header>

          <div className="listing-layout">
            <aside className="listing-aside" aria-label="Filters">
              <FilterControls filters={filters} update={update} />
            </aside>

            <section className="listing-results" aria-labelledby="listing-results-title" aria-busy={loading}>
              <div className="listing-toolbar">
                <div className="listing-heading">
                  <h2 id="listing-results-title" ref={heading} tabIndex={-1} className="listing-results-title">{category.label}</h2>
                  <p className="listing-count" role="status">{loading ? 'Looking…' : count}</p>
                </div>
                <div className="listing-tools">
                  <span className="listing-filter-open">
                    <Button variant="outline" shape="rounded" onClick={() => setDrawer(true)}>
                      <SlidersHorizontal /> Filters{applied.length > 0 && ` (${applied.length})`}
                    </Button>
                  </span>
                  <Select label="Sort by" hideLabel leadingIcon={<ArrowUpDown />} options={SORTS} value={filters.sort}
                    onValueChange={(sort) => update({ sort })} />
                </div>
              </div>

              {applied.length > 0 && (
                <div className="listing-applied" role="group" aria-label="Applied filters">
                  {applied.map((chip) => (
                    <Tag key={chip.key} onRemove={() => { update(chip.clear); heading.current?.focus() }}>{chip.label}</Tag>
                  ))}
                  <Button variant="quiet" size="small" onClick={reset}>Clear all</Button>
                </div>
              )}

              {loading ? (
                <ul className="listing-grid" aria-hidden="true">
                  {Array.from({ length: Math.min(PAGE_SIZE, results.items.length || 6) }, (_, index) => (
                    <li key={index} className="listing-item">
                      <div className="listing-tile listing-ghost" />
                      <div className="listing-ghost listing-ghost-line" />
                      <div className="listing-ghost listing-ghost-short" />
                    </li>
                  ))}
                </ul>
              ) : results.total === 0 ? (
                <ContentState
                  className="listing-empty"
                  headingLevel={3}
                  icon={<SearchX />}
                  title="Nothing on the shelf matches"
                  description="Try a wider price range, or let go of a filter or two. New batches come out of the kiln most Fridays."
                  action={{ label: 'Clear filters', onClick: reset }}
                />
              ) : (
                <ul className="listing-grid">
                  {results.items.map((product) => (
                    <li key={product.id}>
                      <ProductCard product={product} />
                    </li>
                  ))}
                </ul>
              )}

              {results.total > PAGE_SIZE && (
                <Pagination className="listing-pages" page={page} total={results.total} pageSize={PAGE_SIZE} onPageChange={turnTo} />
              )}
            </section>
          </div>
        </main>

        <Drawer
          open={drawer}
          onOpenChange={setDrawer}
          title="Filters"
          side="left"
          footer={
            <div className="listing-drawer-actions">
              <Button variant="quiet" onClick={reset}>Clear all</Button>
              <Button onClick={() => setDrawer(false)} loading={loading}>{loading ? 'Looking' : `Show ${count}`}</Button>
            </div>
          }
        >
          <FilterControls filters={filters} update={update} />
        </Drawer>
      </div>
    </LucideProvider>
  )
}

function FilterControls({ filters, update }: { filters: Filters; update: (patch: Partial<Filters>) => void }) {
  return (
    <div className="listing-filters">
      <Choice label="Category" options={CATEGORIES} value={filters.category} onValueChange={(category) => update({ category })} />
      <Slider range label="Price" min={0} max={PRICE_TOP} step={5} formatValue={priceLabel}
        value={filters.price} onValueChange={(price) => update({ price })} />
      <Switch label="In stock only" checked={filters.inStock} onCheckedChange={(inStock) => update({ inStock })} />
      <Choice label="Rating" options={RATINGS} value={filters.rating} onValueChange={(rating) => update({ rating })} />
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  const href = `/products/${product.id}`
  return (
    <article className="listing-item" aria-labelledby={`${product.id}-name`}>
      {/* The picture repeats the name link for pointers; keyboards and screen readers get the one below. */}
      <a href={href} className="listing-tile" tabIndex={-1} aria-hidden="true">
        <ProductArt shape={product.shape} glaze={product.glaze} />
      </a>
      <h3 className="listing-name" id={`${product.id}-name`}>
        <a href={href} className="listing-link">{product.name}</a>
      </h3>
      <p className="listing-detail">{product.detail}</p>
      <p className="listing-price">
        {money(product.price)}
        {!product.inStock && <span className="listing-sold"> · Sold out</span>}
      </p>
      <Rating value={product.rating} count={product.reviews} size="small" />
    </article>
  )
}

// Replace with <img src={product.image} alt="" /> once you have photographs.
const SHAPES: Record<Shape, { body: string; hollow?: string; floor: number }> = {
  bud: { floor: 40, body: 'M91 60H109V65C107 66 107 70 107 76V88C107 94 112 97 119 101C132 108 138 120 138 134C138 157 121 170 100 170C79 170 62 157 62 134C62 120 68 108 81 101C88 97 93 94 93 88V76C93 70 93 66 91 65Z' },
  column: { floor: 38, body: 'M74 46H126C129 46 130 48 130 51V60C134 64 136 70 136 78V164C136 168 133 170 129 170H71C67 170 64 168 64 164V78C64 70 66 64 70 60V51C70 48 71 46 74 46Z', hollow: 'M76 50a24 3 0 0 0 48 0a24 3 0 0 0 -48 0Z' },
  bottle: { floor: 30, body: 'M94 30H106V34C105 35 105 37 105 40V82C105 90 110 94 116 98C124 103 128 110 128 120V160C128 166 124 170 118 170H82C76 170 72 166 72 160V120C72 110 76 103 84 98C90 94 95 90 95 82V40C95 37 95 35 94 34Z' },
  bowl: { floor: 46, body: 'M36 112H164C164 142 140 164 112 166V170H88V166C60 164 36 142 36 112Z', hollow: 'M38 112a62 8 0 0 0 124 0a62 8 0 0 0 -124 0Z' },
  mug: { floor: 36, body: 'M66 96H126V104C152 104 156 152 126 152V160C126 166 122 170 116 170H76C70 170 66 166 66 160ZM126 114V142C140 141 140 115 126 114Z', hollow: 'M68 96a28 4 0 0 0 56 0a28 4 0 0 0 -56 0Z' },
  tumblers: { floor: 56, body: 'M46 104H94L90 166C90 168 88 170 86 170H54C52 170 50 168 50 166ZM106 118H154L151 166C151 168 149 170 147 170H113C111 170 109 168 109 166Z', hollow: 'M48 104a23 3 0 0 0 46 0a23 3 0 0 0 -46 0ZM108 118a23 3 0 0 0 46 0a23 3 0 0 0 -46 0Z' },
  plates: { floor: 66, body: 'M30 126H170C170 131 160 135 146 135H54C40 135 30 131 30 126ZM30 138H170C170 143 160 147 146 147H54C40 147 30 143 30 138ZM30 150H170C170 155 160 159 146 159H54C40 159 30 155 30 150ZM30 162H170C170 167 160 171 146 171H54C40 171 30 167 30 162Z', hollow: 'M54 124a46 5 0 0 0 92 0a46 5 0 0 0 -92 0Z' },
  pitcher: { floor: 38, body: 'M70 70H122L134 60C136 59 138 61 137 63L128 80C130 92 136 104 136 122V160C136 166 132 170 126 170H74C68 170 64 166 64 160V122C64 104 70 92 70 76ZM66 90C40 92 40 138 66 140V130C52 128 52 102 66 100Z' },
  lamp: { floor: 40, body: 'M46 98C46 64 70 40 100 40C130 40 154 64 154 98ZM96 98H104V156H96ZM72 156H128C133 156 136 159 136 163V166C136 168 134 170 132 170H68C66 170 64 168 64 166V163C64 159 67 156 72 156Z', hollow: 'M48 98a52 5 0 0 0 104 0Z' },
  pendant: { floor: 0, body: 'M99 -25H101V62H99ZM100 60C92 60 88 64 86 70L56 130C54 134 56 136 60 136H140C144 136 146 134 144 130L114 70C112 64 108 60 100 60Z', hollow: 'M60 136a40 4 0 0 0 80 0Z' },
  planter: { floor: 36, body: 'M56 96H144V108H140L132 162C131 167 128 170 123 170H77C72 170 69 167 68 162L60 108H56Z', hollow: 'M58 96a42 4 0 0 0 84 0a42 4 0 0 0 -84 0Z' },
}

function ProductArt({ shape, glaze }: { shape: Shape; glaze: string }) {
  const id = useId()
  const { body, hollow, floor } = SHAPES[shape]
  return (
    <svg className="listing-art" viewBox="0 8 200 200" aria-hidden="true" focusable="false"
      style={{ '--listing-glaze': glaze, '--listing-light': LIGHT, '--listing-shadow': SHADOW } as CSSProperties}>
      <defs>
        <linearGradient id={`${id}-lit`}>
          <stop offset="0" className="listing-lit" stopOpacity="0.55" />
          <stop offset="0.2" className="listing-lit" stopOpacity="0.25" />
          <stop offset="0.42" className="listing-lit" stopOpacity="0" />
          <stop offset="0.5" className="listing-dim" stopOpacity="0" />
          <stop offset="0.75" className="listing-dim" stopOpacity="0.12" />
          <stop offset="1" className="listing-dim" stopOpacity="0.34" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {floor > 0 && <ellipse className="listing-floor" filter={`url(#${id}-soft)`} cx="100" cy="170" rx={floor + 6} ry="5" />}
      <path className="listing-glaze" d={body} />
      <path fill={`url(#${id}-lit)`} d={body} />
      {hollow && <path className="listing-hollow" d={hollow} />}
    </svg>
  )
}

const css = `
.listing { min-height: 100dvh; color: var(--diya-color-text); }
.listing-brand { font-size: var(--diya-text-title); font-weight: 650; letter-spacing: -0.03em; }
.listing-bag { position: relative; display: inline-flex; }
.listing-bag-count { position: absolute; top: 2px; right: 0; pointer-events: none; }
.listing-main { max-width: 1360px; margin: 0 auto; padding: var(--diya-space-8) var(--diya-space-6); }
.listing-intro { display: grid; gap: var(--diya-space-3); max-width: 640px; margin-bottom: var(--diya-space-8); }
.listing-title { margin: 0; font-size: var(--diya-text-display); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.03em; text-wrap: balance; }
.listing-lede { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-large); line-height: var(--diya-leading-body); text-wrap: pretty; }
.listing-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: var(--diya-space-8); align-items: start; }
.listing-aside { position: sticky; top: var(--diya-space-5); }
.listing-filters { display: grid; gap: var(--diya-space-6); }
.listing-toolbar { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: var(--diya-space-4); margin-bottom: var(--diya-space-5); }
.listing-heading { display: flex; align-items: baseline; gap: var(--diya-space-3); min-width: 0; }
.listing-results-title { margin: 0; font-size: var(--diya-text-heading); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; }
.listing-results-title:focus { outline: none; }
.listing-count { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); font-variant-numeric: tabular-nums; }
.listing-tools { display: flex; align-items: center; gap: var(--diya-space-3); }
.listing-filter-open { display: none; }
.listing-applied { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-2); margin-bottom: var(--diya-space-5); }
.listing-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--diya-space-7) var(--diya-space-5); margin: 0; padding: 0; list-style: none; }
.listing-item { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-1); align-content: start; }
.listing-tile {
  display: block;
  aspect-ratio: 1;
  margin-bottom: var(--diya-space-3);
  border-radius: var(--diya-radius-surface);
  background: color-mix(in srgb, var(--diya-color-text) 4%, transparent);
}
.listing-art { width: 100%; height: 100%; }
.listing-glaze { fill: var(--listing-glaze); }
.listing-lit { stop-color: var(--listing-light); }
.listing-dim { stop-color: var(--listing-shadow); }
.listing-hollow { fill: var(--listing-shadow); opacity: 0.38; }
.listing-floor { fill: var(--listing-shadow); opacity: 0.16; }
.listing-name { margin: 0; font-size: var(--diya-text-body); font-weight: 600; line-height: var(--diya-leading-tight); }
.listing-link { color: inherit; text-decoration: none; border-radius: 3px; }
.listing-link:hover { text-decoration: underline; text-underline-offset: 4px; }
.listing-link:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: 3px; }
.listing-detail,
.listing-price { margin: 0; font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.listing-detail,
.listing-sold { color: var(--diya-color-muted); }
.listing-price { font-variant-numeric: tabular-nums; }
.listing-ghost { border-radius: var(--diya-radius-control); background: color-mix(in srgb, var(--diya-color-text) 6%, transparent); animation: listing-pulse 1.4s ease-in-out infinite; }
.listing-tile.listing-ghost { border-radius: var(--diya-radius-surface); }
.listing-ghost-line { width: 70%; height: 18px; }
.listing-ghost-short { width: 40%; height: 18px; }
@keyframes listing-pulse { 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) { .listing-ghost { animation: none; } }
.listing-empty { padding-block: var(--diya-space-8); }
.listing-pages { margin-top: var(--diya-space-8); }
.listing-drawer-actions { display: flex; justify-content: space-between; gap: var(--diya-space-3); width: 100%; }
@media (min-width: 1600px) { .listing-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 1080px) { .listing-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 860px) {
  .listing-main { padding: var(--diya-space-6) var(--diya-space-5) var(--diya-space-7); }
  .listing-intro { margin-bottom: var(--diya-space-6); }
  .listing-title { font-size: var(--diya-text-heading); }
  .listing-lede { font-size: var(--diya-text-body); }
  .listing-layout { grid-template-columns: minmax(0, 1fr); }
  .listing-aside { display: none; }
  .listing-filter-open { display: inline-flex; }
  .listing-toolbar { flex-direction: column; align-items: stretch; }
  .listing-tools > :last-child { flex: 1; }
  .listing-grid { gap: var(--diya-space-6) var(--diya-space-4); }
}
@media (max-width: 380px) { .listing-main { padding-inline: var(--diya-space-4); } }
`

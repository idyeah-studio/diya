'use client'
// Search results: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/search/page.tsx. Vite: save as src/SearchResults.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Avatar, Button, Choice, Drawer, Inline, List, Menu, Pagination, Search, Select, Stack, Tabs, TextLink } from '@idyeah/diya'
import { Clock, FileText, FolderKanban, LucideProvider, SlidersHorizontal } from 'lucide-react'

// Your workspace and what's in it. Replace with your own search index.
const PRODUCT = 'Fieldbook'
const ME = { name: 'Imani Brooks' }
// The page opens on this search. Use '' to open on recent searches instead.
const START = 'brand'
const PAGE_SIZE = 6
const POPULAR = ['onboarding', 'launch', 'roadmap', 'hiring', 'expense policy']
const TEAMS = ['Design', 'Engineering', 'Marketing', 'Operations', 'People', 'Product']
const DATES = [
  { value: 'any', label: 'Any time', since: '' },
  { value: 'week', label: 'Past week', since: '2026-10-30' },
  { value: 'month', label: 'Past month', since: '2026-10-06' },
  { value: 'year', label: 'Past year', since: '2025-11-06' },
]

type Kind = 'doc' | 'project' | 'person'
type Result = { id: string; kind: Kind; title: string; team: string; date: string; text: string; role?: string }

const DOCS = [
  ['Onboarding checklist for new engineers', 'Engineering', '2026-11-04', 'Your first week, day by day: laptop setup, repo access, your onboarding buddy, and the first pull request we hope to see by Friday.'],
  ['Design onboarding: tools, files and rituals', 'Design', '2026-10-28', 'How the design team works: the component library, Thursday critique, and who to ask when a component doesn’t exist yet.'],
  ['Roadmap 2027: first draft', 'Product', '2026-11-05', 'Themes for next year: offline mode, faster search, and onboarding that teaches by doing. Comments are open until November 20.'],
  ['Q4 launch plan: Fieldbook mobile', 'Product', '2026-11-02', 'Milestones from beta to launch on December 3, the launch checklist, and who owns each part of the announcement.'],
  ['Hiring plan for 2027', 'People', '2026-10-30', 'Twelve open roles across engineering, design and support, with the interview loop for each and their onboarding dates.'],
  ['Customer interviews: onboarding', 'Design', '2026-10-19', 'Eight interviews with new teams. The biggest stumble in onboarding: inviting teammates before there’s anything to show them.'],
  ['Incident review: search outage on October 21', 'Engineering', '2026-10-23', 'What broke, how we found it, and the three changes that keep it from happening again. Search was down for 47 minutes.'],
  ['Accessibility checklist', 'Design', '2026-10-12', 'Contrast, focus, labels and motion. Run it before every design review, and again before launch.'],
  ['Budget review: Q3', 'Operations', '2026-10-07', 'Spending against plan for the quarter, with notes on travel, software and the launch party.'],
  ['On-call handbook', 'Engineering', '2026-09-30', 'Rotations, paging rules and the runbooks we reach for first, plus how to hand off at the end of a shift.'],
  ['Brand guidelines 2026', 'Marketing', '2026-09-15', 'Logo, color, type and voice. The voice section changed most this year: shorter sentences, fewer exclamation points.'],
  ['Launch checklist template', 'Product', '2026-08-21', 'Copy this before any launch: pricing page, help articles, release notes, a support briefing and the go or no-go meeting.'],
  ['Expense policy', 'Operations', '2026-07-01', 'What you can expense, how to send receipts, and the travel per diem. Yes, the good coffee counts on client days.'],
  ['Writing release notes', 'Product', '2026-06-12', 'Lead with what changed for the reader, not what we built. Good examples, and a few we’d rather forget.'],
  ['Remote work guide', 'People', '2026-05-08', 'Core hours, how we use video, and the home office budget. Also: please mute while the coffee grinder runs.'],
]
const PROJECTS = [
  ['Mobile app launch', 'Product', '2026-11-05', 'Ship Fieldbook for iOS and Android by December 3. 18 of 28 tasks done, two waiting on review.'],
  ['Onboarding redesign', 'Design', '2026-11-03', 'Rebuild the first run so a new team sees why Fieldbook matters within five minutes.'],
  ['Search speed', 'Engineering', '2026-10-29', 'Answer every search in under 200 ms, even in workspaces with a million pages.'],
  ['2027 hiring', 'People', '2026-10-30', 'Hire twelve people across four teams, and give each of them a great first week.'],
  ['Brand refresh', 'Marketing', '2026-09-25', 'New type, a calmer palette, and a voice guide that everyone can follow.'],
  ['Office move', 'Operations', '2026-08-14', 'Move the studio up to the third floor by January, without losing a single desk.'],
]
const PEOPLE = [
  ['Ana Lucía Ortega', 'Engineering', '2023-03-14', 'Runs onboarding for new engineers. Ask about on-call, hiring and the search outage.', 'Engineering manager'],
  ['Tomasz Nowak', 'Design', '2021-06-01', 'Looks after the component library and the onboarding redesign. Ask about accessibility.', 'Staff designer'],
  ['Imani Brooks', 'People', '2022-01-10', 'Hiring, onboarding and benefits. Ask about the 2027 hiring plan and remote work.', 'Head of people'],
  ['Kenji Watanabe', 'Product', '2026-10-26', 'Joined in October to lead the mobile launch. Ask about launch dates and the roadmap.', 'Product manager'],
  ['Zainab Haddad', 'Marketing', '2024-04-22', 'Keeper of the brand guidelines. Ask about logos, voice and launch campaigns.', 'Brand lead'],
  ['Oluwaseun Adeyemi', 'Operations', '2020-09-01', 'Budgets, expenses and the office move. Ask about the expense policy and travel.', 'Operations lead'],
  ['Marisol Vega', 'Engineering', '2026-11-02', 'New on the search team this week. Ask about search speed, or onboarding as a new engineer.', 'Software engineer'],
]

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const INDEX: Result[] = [
  ...DOCS.map(([title, team, date, text]) => ({ id: `docs/${slug(title)}`, kind: 'doc' as const, title, team, date, text })),
  ...PROJECTS.map(([title, team, date, text]) => ({ id: `projects/${slug(title)}`, kind: 'project' as const, title, team, date, text })),
  ...PEOPLE.map(([title, team, date, text, role]) => ({ id: `people/${slug(title)}`, kind: 'person' as const, title, team, date, text, role })),
]
const WORDS = [...new Set(INDEX.flatMap((item) => `${item.title} ${item.text}`.toLowerCase().match(/[a-z]{4,}/g) ?? []))]

const termsOf = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean)
const matches = (query: string) =>
  INDEX.map((item) => {
    const title = item.title.toLowerCase()
    const body = `${item.text} ${item.team} ${item.role ?? ''}`.toLowerCase()
    const terms = termsOf(query)
    const found = terms.every((term) => title.includes(term) || body.includes(term))
    return { item, score: found ? terms.reduce((sum, term) => sum + (title.includes(term) ? 3 : 1), 0) : 0 }
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.item.date.localeCompare(a.item.date))
    .map(({ item }) => item)

function distance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    row = next
  }
  return row[b.length]
}

function closest(term: string) {
  if (term.length < 4 || WORDS.includes(term)) return term
  const best = WORDS.reduce((a, b) => (distance(term, b) < distance(term, a) ? b : a))
  return distance(term, best) <= 2 ? best : term
}

// Replace with your search API. The stub waits a moment, finds results that
// contain every word you typed, and when nothing does, suggests the closest
// spelling it knows (try "onbaording").
async function search(query: string): Promise<{ results: Result[]; suggestion?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  const results = matches(query)
  if (results.length) return { results }
  const asked = query.toLowerCase()
  const fixed = termsOf(asked).map(closest).join(' ')
  return { results, suggestion: fixed !== asked && matches(fixed).length ? fixed : undefined }
}

const shortDate = (iso: string, year = false) =>
  new Date(`${iso}T12:00`).toLocaleDateString('en-US', year ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' })
const KINDS = { doc: { label: 'Doc', plural: 'Docs', verb: 'Edited' }, project: { label: 'Project', plural: 'Projects', verb: 'Updated' }, person: { label: 'Person', plural: 'People', verb: 'Joined' } }
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

function highlight(text: string, query: string): ReactNode {
  const terms = termsOf(query).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!terms.length) return text
  return text.split(new RegExp(`(${terms.join('|')})`, 'gi')).map((part, index) =>
    index % 2 ? <mark key={index} className="search-results-mark">{part}</mark> : part,
  )
}

// The query lives in the URL (?q=), so a search can be shared and reloaded.
// With a router, write it through the router's search params instead.
function writeQuery(query: string, push: boolean) {
  const url = new URL(window.location.href)
  if (query) url.searchParams.set('q', query)
  else url.searchParams.delete('q')
  if (url.href !== window.location.href) window.history[push ? 'pushState' : 'replaceState'](null, '', url)
}

export default function SearchResultsScreen() {
  const [draft, setDraft] = useState(START)
  const [query, setQuery] = useState(START)
  // The opening search is answered on the first render, so the page never opens on a spinner.
  const [found, setFound] = useState<{ query: string; results: Result[]; suggestion?: string }>(() => ({ query: START, results: matches(START) }))
  const status = !query ? 'idle' : found.query === query ? 'done' : 'loading'
  const [kind, setKind] = useState<'all' | Kind>('all')
  const [teams, setTeams] = useState<string[]>([])
  const [date, setDate] = useState('any')
  const [sort, setSort] = useState('best')
  const [page, setPage] = useState(1)
  const [recent, setRecent] = useState(['brand guidelines', 'on-call', 'q4 launch plan'])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const countRef = useRef<HTMLHeadingElement>(null)
  const focusCount = useRef(false)
  const latest = useRef('')

  function commit(text: string, picked = false) {
    const clean = text.trim()
    latest.current = clean
    setDraft(text)
    setQuery(clean)
    writeQuery(clean, true)
    if (clean) setRecent((list) => [clean, ...list.filter((item) => item !== clean)].slice(0, 5))
    if (picked && clean === query) countRef.current?.focus()
    else focusCount.current = picked
  }

  useEffect(() => {
    const restore = (event?: PopStateEvent) => {
      const text = new URLSearchParams(window.location.search).get('q') ?? (event ? '' : START)
      latest.current = text.trim()
      setDraft(text)
      setQuery(text.trim())
    }
    restore()
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft.trim() === latest.current) return
      latest.current = draft.trim()
      focusCount.current = false
      setQuery(draft.trim())
      writeQuery(draft.trim(), false)
    }, 300)
    return () => clearTimeout(timer)
  }, [draft])

  useEffect(() => {
    setPage(1)
    if (!query || query === found.query) return
    let current = true
    search(query).then((answer) => {
      if (current) setFound({ query, ...answer })
    })
    return () => {
      current = false
    }
  }, [query])

  useEffect(() => {
    if (status === 'done' && focusCount.current) {
      focusCount.current = false
      countRef.current?.focus()
    }
  }, [status])

  const since = DATES.find((option) => option.value === date)!.since
  const filtered = found.results.filter((item) => (!teams.length || teams.includes(item.team)) && item.date >= since)
  const count = (type: 'all' | Kind) => filtered.filter((item) => type === 'all' || item.kind === type).length
  const shown = filtered.filter((item) => kind === 'all' || item.kind === kind)
  const sorted = sort === 'new' ? [...shown].sort((a, b) => b.date.localeCompare(a.date)) : shown
  const current = Math.min(page, Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)))
  const activeFilters = teams.length + (date === 'any' ? 0 : 1)
  const clearFilters = () => { setTeams([]); setDate('any'); setPage(1) }
  const facets: FacetProps = {
    teams, date, activeFilters, clearFilters,
    setTeams: (next) => { setTeams(next); setPage(1) },
    setDate: (next) => { setDate(next); setPage(1) },
  }

  // Type, team, date, sort and paging run here in the browser on what the
  // stub returns. With a big index, send them with the query instead and get
  // back one page of results plus the count for each type.
  const panel = (
    <div className="search-results-layout">
      <aside className="search-results-facets" aria-label="Filters">
        <Facets {...facets} />
      </aside>
      <section className="search-results-main" aria-busy={status === 'loading'}>
        <div className="search-results-bar">
          <div role="status" className="search-results-status">
            <h2 ref={countRef} tabIndex={-1} className="search-results-count">
              {status === 'loading' ? 'Searching…' : sorted.length ? `${plural(sorted.length, 'result')} for “${query}”` : `No results for “${query}”`}
            </h2>
          </div>
          <Inline gap={2}>
            <Button className="search-results-filter-button" variant="outline" size="small" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal /> {activeFilters ? `Filters · ${activeFilters}` : 'Filters'}
            </Button>
            <Select label="Sort by" hideLabel size="small" className="search-results-sort" value={sort} onValueChange={setSort}
              options={[{ value: 'best', label: 'Best match' }, { value: 'new', label: 'Newest first' }]} />
          </Inline>
        </div>
        {status === 'loading' ? (
          <ul className="search-results-list" aria-hidden="true">
            {[0, 1, 2, 3].map((row) => (
              <li key={row} className="search-results-item">
                <span className="search-results-skeleton search-results-skeleton-icon" />
                <span className="search-results-skeleton-lines">
                  <span className="search-results-skeleton" /><span className="search-results-skeleton" /><span className="search-results-skeleton" />
                </span>
              </li>
            ))}
          </ul>
        ) : sorted.length ? (
          <>
            <ol className="search-results-list">
              {sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((item) => <Hit key={item.id} item={item} query={query} />)}
            </ol>
            {sorted.length > PAGE_SIZE && <Pagination page={current} total={sorted.length} pageSize={PAGE_SIZE} showCount={false}
              onPageChange={(next) => { setPage(next); countRef.current?.focus() }} />}
          </>
        ) : (
          <NoResults suggestion={found.suggestion} filtered={activeFilters > 0 || kind !== 'all'} onPick={(text) => commit(text, true)}
            onClear={() => { clearFilters(); setKind('all') }} />
        )}
      </section>
    </div>
  )

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="search-results">
        <style>{css}</style>
        <header className="search-results-top">
          <span className="search-results-brand"><span className="search-results-logo" aria-hidden="true">{PRODUCT[0]}</span>{PRODUCT}</span>
          <Menu label="Account" items={[{ id: 'settings', label: 'Account settings', href: '/settings' }, { id: 'sign-out', label: 'Sign out', href: '/sign-out' }]}
            trigger={<button type="button" className="search-results-account" aria-label={`${ME.name}: account`}><Avatar name={ME.name} size="small" /></button>} />
        </header>
        <main className="search-results-page">
          <header className="search-results-header">
            <h1 className="search-results-title">Search</h1>
            <form role="search" className="search-results-form" onSubmit={(event) => { event.preventDefault(); commit(draft) }}>
              <Search className="search-results-field" label={`Search ${PRODUCT}`} hideLabel size="large" clearable placeholder="Docs, projects and people"
                autoComplete="off" enterKeyHint="search" value={draft} onValueChange={setDraft} />
            </form>
          </header>

          {query ? (
            <Tabs
              className="search-results-tabs"
              label="Result types"
              value={kind}
              onValueChange={(next) => { setKind(next as 'all' | Kind); setPage(1) }}
              items={(['all', 'doc', 'project', 'person'] as const).map((type) => ({
                value: type,
                label: type === 'all' ? 'All' : KINDS[type].plural,
                badge: status === 'done' && type !== 'all' ? { variant: 'count' as const, count: count(type), showZero: true, label: count(type) === 1 ? 'result' : 'results' } : undefined,
                content: type === kind ? panel : null,
              }))}
            />
          ) : (
            <Start recent={recent} onPick={(text) => commit(text, true)} onClear={() => setRecent([])} />
          )}

          <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} title="Filters" headingLevel={2}
            footer={<Button className="search-results-wide" onClick={() => setFiltersOpen(false)}>Show {plural(sorted.length, 'result')}</Button>}>
            <Facets {...facets} />
          </Drawer>
        </main>
      </div>
    </LucideProvider>
  )
}

type FacetProps = { teams: string[]; setTeams: (teams: string[]) => void; date: string; setDate: (date: string) => void; activeFilters: number; clearFilters: () => void }

function Facets({ teams, setTeams, date, setDate, activeFilters, clearFilters }: FacetProps) {
  return (
    <Stack gap={6} align="start">
      <Choice multiple label="Team" options={TEAMS.map((team) => ({ value: team, label: team }))} value={teams} onValueChange={setTeams} />
      <Choice label="Last changed" options={DATES} value={date} onValueChange={setDate} />
      {activeFilters > 0 && (
        <TextLink asChild><button type="button" className="search-results-text-button" onClick={clearFilters}>Clear filters</button></TextLink>
      )}
    </Stack>
  )
}

function Hit({ item, query }: { item: Result; query: string }) {
  const meta = [KINDS[item.kind].label, item.role ?? item.team, `${KINDS[item.kind].verb} ${shortDate(item.date, item.kind === 'person')}`]
  return (
    <li className="search-results-item">
      <span className="search-results-icon" aria-hidden="true">
        {item.kind === 'person' ? <Avatar name={item.title} size="small" /> : item.kind === 'doc' ? <FileText /> : <FolderKanban />}
      </span>
      <div className="search-results-body">
        <h3 className="search-results-hit-title">
          <TextLink inline href={`/${item.id}`} className="search-results-link">{highlight(item.title, query)}</TextLink>
        </h3>
        <p className="search-results-meta">{meta.join(' · ')}</p>
        <p className="search-results-text">{highlight(item.text, query)}</p>
      </div>
    </li>
  )
}

function NoResults({ suggestion, filtered, onPick, onClear }: { suggestion?: string; filtered: boolean; onPick: (text: string) => void; onClear: () => void }) {
  if (suggestion)
    return (
      <p className="search-results-suggest">
        Did you mean{' '}
        <TextLink asChild inline>
          <button type="button" className="search-results-text-button" onClick={() => onPick(suggestion)}>{suggestion}</button>
        </TextLink>
        ?
      </p>
    )
  return (
    <div className="search-results-tips">
      <p className="search-results-text">Nothing in {PRODUCT} matches that yet. A few things to try:</p>
      <ul className="search-results-tip-list">
        <li>Check the spelling, or use a shorter word: “launch” finds “launches” too.</li>
        <li>Looking for someone? Their first name or team works best.</li>
        {filtered && (
          <li>
            Search every type, team and date.{' '}
            <TextLink asChild inline><button type="button" className="search-results-text-button" onClick={onClear}>Clear filters</button></TextLink>
          </li>
        )}
      </ul>
    </div>
  )
}

function Start({ recent, onPick, onClear }: { recent: string[]; onPick: (text: string) => void; onClear: () => void }) {
  return (
    <div className="search-results-start">
      <section className="search-results-section" aria-labelledby="search-results-recent">
        <div className="search-results-section-head">
          <h2 id="search-results-recent" className="search-results-section-title">Recent searches</h2>
          {recent.length > 0 && <Button variant="quiet" size="small" onClick={onClear}>Clear</Button>}
        </div>
        {recent.length ? (
          <List label="Recent searches" items={recent.map((text) => ({ id: text, label: text, leading: <Clock />, onSelect: () => onPick(text) }))} />
        ) : (
          <p className="search-results-text">Nothing yet. What you search for shows up here, just for you.</p>
        )}
      </section>
      <section className="search-results-section" aria-labelledby="search-results-popular">
        <h2 id="search-results-popular" className="search-results-section-title">Popular this week</h2>
        <Inline gap={2}>
          {POPULAR.map((text) => <Button key={text} variant="outline" size="small" onClick={() => onPick(text)}>{text}</Button>)}
        </Inline>
      </section>
    </div>
  )
}

const css = `
.search-results { min-height: 100dvh; color: var(--diya-color-text); }
.search-results-top { display: none; }
.search-results-brand { display: inline-flex; align-items: center; gap: 10px; font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; }
.search-results-logo {
  display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: calc(8px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-body); font-weight: 650; line-height: 1;
}
.search-results-account { display: grid; padding: 4px; margin-right: -4px; border: 0; border-radius: 50%; background: none; cursor: pointer; }
.search-results-account:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 2px; }
.search-results-page {
  box-sizing: border-box;
  max-width: calc(880px + 2 * var(--diya-space-7));
  padding: var(--diya-space-7) var(--diya-space-7) var(--diya-space-8);
  display: flex;
  flex-direction: column;
  gap: var(--diya-space-6);
}
.search-results-header { display: grid; gap: var(--diya-space-5); }
.search-results-title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  line-height: var(--diya-leading-tight);
  letter-spacing: -0.02em;
}
.search-results-field { max-width: none; }
.search-results-tabs [role='tablist'] { width: 100%; }
.search-results-layout { display: grid; grid-template-columns: 184px minmax(0, 1fr); gap: var(--diya-space-7); padding-top: var(--diya-space-5); }
.search-results-main { display: grid; gap: var(--diya-space-5); align-content: start; min-width: 0; }
.search-results-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-3); }
.search-results-count {
  margin: 0;
  font-size: var(--diya-text-large);
  font-weight: 600;
  line-height: var(--diya-leading-tight);
  overflow-wrap: anywhere;
}
.search-results-count:focus { outline: none; }
.search-results-sort { width: 160px; }
.search-results-filter-button { display: none; }
.search-results-list { margin: 0; padding: 0; list-style: none; display: grid; }
.search-results-item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: var(--diya-space-4);
  padding-block: var(--diya-space-5);
  border-top: 1px solid var(--diya-color-line);
}
.search-results-item:first-child { border-top: 0; padding-top: var(--diya-space-2); }
.search-results-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--diya-radius-control);
  background: color-mix(in srgb, var(--diya-color-text) 6%, transparent);
  color: var(--diya-color-muted);
}
.search-results-icon:has(> *:not(svg)) { background: none; }
.search-results-body { display: grid; gap: var(--diya-space-1); min-width: 0; }
.search-results-hit-title { margin: 0; font-size: var(--diya-text-large); font-weight: 600; line-height: var(--diya-leading-tight); }
.search-results-link { text-decoration: none; }
.search-results-link:hover { text-decoration: underline; }
.search-results-meta { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.search-results-text { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.search-results-mark {
  padding: 0 2px;
  margin: 0 -2px;
  border-radius: 3px;
  background: var(--diya-color-warning-surface);
  color: var(--diya-color-text);
}
.search-results-skeleton {
  display: block;
  height: 12px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--diya-color-text) 7%, transparent);
}
.search-results-skeleton-icon { width: 36px; height: 36px; border-radius: var(--diya-radius-control); }
.search-results-skeleton-lines { display: grid; gap: var(--diya-space-3); padding-top: var(--diya-space-1); }
.search-results-skeleton-lines > :first-child { width: 40%; height: 16px; }
.search-results-skeleton-lines > :nth-child(2) { width: 24%; }
.search-results-skeleton-lines > :last-child { width: 88%; }
.search-results-suggest { margin: 0; font-size: var(--diya-text-title); line-height: var(--diya-leading-tight); }
.search-results-text-button { padding: 0; border: 0; background: none; font: inherit; font-weight: 600; cursor: pointer; }
.search-results-tips { display: grid; gap: var(--diya-space-3); max-width: 560px; }
.search-results-tip-list { margin: 0; padding-left: var(--diya-space-5); display: grid; gap: var(--diya-space-2); color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.search-results-start { display: grid; gap: var(--diya-space-7); padding-top: var(--diya-space-3); }
.search-results-section { display: grid; gap: var(--diya-space-4); align-content: start; }
.search-results-section-head { display: flex; align-items: center; justify-content: space-between; min-height: 32px; }
.search-results-section-title { margin: 0; font-size: var(--diya-text-caption); font-weight: 600; color: var(--diya-color-muted); }
.search-results-section > .search-results-section-title { min-height: 32px; display: flex; align-items: center; }
.search-results-wide { width: 100%; }
@media (max-width: 860px) {
  .search-results-page { padding: var(--diya-space-6) var(--diya-space-5); }
  .search-results-layout { grid-template-columns: minmax(0, 1fr); padding-top: var(--diya-space-4); }
  .search-results-facets { display: none; }
  .search-results-filter-button { display: inline-flex; }
}
@media (max-width: 720px) {
  .search-results-top {
    display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-3); position: sticky; top: 0; z-index: 10;
    height: 56px; box-sizing: border-box; padding: 0 var(--diya-space-4); border-bottom: 1px solid var(--diya-color-line);
    background: color-mix(in srgb, var(--diya-color-surface) 82%, transparent); backdrop-filter: blur(20px) saturate(1.4);
  }
  .search-results-page { padding: var(--diya-space-5) var(--diya-space-4) var(--diya-space-7); gap: var(--diya-space-5); }
}
@media (max-width: 520px) {
  .search-results-sort { width: 148px; }
  .search-results-item { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-2); }
  .search-results-icon { display: none; }
}
`

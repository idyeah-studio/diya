'use client'
import {
  Avatar,
  Breadcrumbs,
  Button,
  Choice,
  DiyaProvider,
  Metric,
  Progress,
  Search,
  Switch,
  Tabs,
  Tag,
  TextInput,
} from '@idyeah/diya'
import Image from 'next/image'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { useAppearance, type Theme } from '../../app/Appearance'

/** The parts sheet: eleven working components under a nested provider, so its
    Finish control re-themes the sheet and nothing else on the page. */
export function PartsSheet() {
  const site = useAppearance()
  const [chosenTheme, setTheme] = useState<Theme | null>(null)
  const [chosenGlass, setGlass] = useState<boolean | null>(null)
  const theme = chosenTheme ?? site.theme
  const glass = chosenGlass ?? site.glass

  return (
    <div className="ld-sheet-block">
      <div className="ld-sub-head">
        <div>
          <h3>28 components.</h3>
          <p>Button to Date Picker, built to work with a keyboard and a screen reader.</p>
        </div>
        <div className="ld-finish" role="group" aria-label="Finish of the sheet below">
          {(['light', 'dark'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
            >
              {value === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
          <span className="ld-finish-sep" aria-hidden="true" />
          <button type="button" aria-pressed={glass} onClick={() => setGlass(!glass)}>
            Glass
          </button>
        </div>
      </div>
      <DiyaProvider surface={false} theme={theme} glass={glass} className="ld-sheet-provider">
        <div className="ld-sheet-stage" data-glass={glass}>
          {glass && (
            <div className="ld-sheet-photo" aria-hidden="true">
              <Image src="/images/concept-architecture.png" alt="" fill sizes="100vw" quality={70} />
            </div>
          )}
          <div className="ld-sheet">
            <Cell name="Button" id="button">
              <StepButtons />
            </Cell>
            <Cell name="Text Input" id="text-input">
              <EmailField />
            </Cell>
            <Cell name="Tabs" phone={false} id="tabs">
              <RangeTabs />
            </Cell>
            <Cell name="Switch" id="switch">
              <Switches />
            </Cell>
            <Cell name="Tag" id="tag">
              <div className="ld-row">
                <Tag label="Status" tone="success" leading="dot">
                  Paid
                </Tag>
                <Tag label="Status" tone="warning" leading="dot">
                  Due Friday
                </Tag>
                <Tag label="Status">Draft</Tag>
              </div>
            </Cell>
            <Cell name="Avatar" id="avatar">
              <div className="ld-avatars">
                <Avatar name="Maya Verma" />
                <Avatar name="Alex Chen" />
                <Avatar name="Ravi Kumar" status="online" />
              </div>
            </Cell>
            <Cell name="Progress" phone={false} id="progress">
              <div className="ld-fill">
                <Progress label="Upload" value={68} showValue />
              </div>
            </Cell>
            <Cell name="Metric" id="metric">
              <Metric label="Orders" value="1,284" change={{ value: '8%', direction: 'up', meaning: 'positive' }} />
            </Cell>
            <Cell name="Search" phone={false} id="search">
              <SearchField />
            </Cell>
            <Cell name="Choice" phone={false} id="choice">
              <Billing />
            </Cell>
            <Cell name="Breadcrumbs" phone={false} id="breadcrumbs">
              <Trail />
            </Cell>
            <div className="ld-cell" data-more="">
              <Link className="ld-more" href="/explore?area=components">
                All 28 components
                <span>And the 13 patterns below. →</span>
              </Link>
            </div>
          </div>
        </div>
      </DiyaProvider>
    </div>
  )
}

function Cell({ name, id, phone = true, children }: { name: string; id: string; phone?: boolean; children: ReactNode }) {
  return (
    <div className="ld-cell" data-phone={phone ? undefined : 'hide'}>
      <Link className="ld-cell-name" href={`/explore?area=components&component=${id}`}>
        {name}
        <span className="sr-only"> in the library</span>
      </Link>
      <div className="ld-cell-stage">{children}</div>
    </div>
  )
}

function StepButtons() {
  const [step, setStep] = useState(1)
  return (
    <div className="ld-steps">
      <div className="ld-row">
        <Button shape="pill" disabled={step === 3} onClick={() => setStep(step + 1)}>
          Continue
        </Button>
        <Button variant="outline" shape="pill" disabled={step === 1} onClick={() => setStep(step - 1)}>
          Back
        </Button>
      </div>
      <p aria-live="polite">Step {step} of 3</p>
    </div>
  )
}

function EmailField() {
  const [value, setValue] = useState('maya@ink.co')
  return (
    <div className="ld-fill">
      <TextInput label="Email" type="email" value={value} onValueChange={setValue} />
    </div>
  )
}

const ranges = [
  { value: 'week', label: 'Week', total: '$4,210' },
  { value: 'month', label: 'Month', total: '$18,420' },
  { value: 'year', label: 'Year', total: '$212,900' },
]

function RangeTabs() {
  const [range, setRange] = useState('week')
  return (
    <Tabs
      label="Revenue range"
      variant="pill"
      size="small"
      value={range}
      onValueChange={setRange}
      items={ranges.map((item) => ({
        value: item.value,
        label: item.label,
        content: <p className="ld-tab-total">{item.total} revenue</p>,
      }))}
    />
  )
}

function Switches() {
  const [digest, setDigest] = useState(true)
  const [weekend, setWeekend] = useState(false)
  return (
    <div className="ld-stack">
      <Switch label="Email digest" checked={digest} onCheckedChange={setDigest} />
      <Switch label="Weekend alerts" checked={weekend} onCheckedChange={setWeekend} />
    </div>
  )
}

function SearchField() {
  const [query, setQuery] = useState('')
  return (
    <div className="ld-fill">
      <Search label="Search invoices" hideLabel placeholder="Search invoices" shape="pill" value={query} onValueChange={setQuery} />
    </div>
  )
}

function Billing() {
  const [plan, setPlan] = useState('monthly')
  return (
    <Choice
      label="Billing"
      hideLabel
      value={plan}
      onValueChange={setPlan}
      options={[
        { value: 'monthly', label: 'Monthly' },
        { value: 'yearly', label: 'Yearly' },
      ]}
    />
  )
}

const trail = [
  { label: 'Home', href: '#home' },
  { label: 'Billing', href: '#billing' },
  { label: 'Invoices', href: '#invoices' },
]

function Trail() {
  const [depth, setDepth] = useState(trail.length)
  return (
    <div className="ld-stack ld-trail">
      <Breadcrumbs
        items={trail.slice(0, depth)}
        onNavigate={(item) => setDepth(trail.findIndex((entry) => entry.href === item.href) + 1)}
      />
      {depth < trail.length && (
        <Button variant="quiet" size="small" shape="pill" onClick={() => setDepth(trail.length)}>
          Back to Invoices
        </Button>
      )}
    </div>
  )
}

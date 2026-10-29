'use client'
import { Breadcrumbs, Button, DiyaProvider, Metric, PageHeader, Switch, Tabs, Tag } from '@idyeah/diya'
import { useId, useState } from 'react'
import { useAppearance, type Theme } from '../../app/Appearance'

/** The hero's specimen plates: real components under their own provider. The
    Finish plate is live and re-finishes all three; the other two are specimens. */
export function HeroPlates() {
  const site = useAppearance()
  const [chosenTheme, setTheme] = useState<Theme | null>(null)
  const [glass, setGlass] = useState(true)
  const [tab, setTab] = useState('overview')
  const theme = chosenTheme ?? site.theme
  const title = useId()
  return (
    <DiyaProvider surface={false} theme={theme} glass={glass} className="ld-plates">
      <div className="ld-plate ld-plate-header" inert aria-hidden="true">
        <PageHeader
          headingLevel={2}
          title="Autumn release"
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: 'Projects', href: '#projects' },
                { label: 'Autumn release', href: '#autumn-release' },
              ]}
            />
          }
          description="Everything shipping before the lights go up."
          tags={
            <>
              <Tag label="Status" tone="success" leading="dot">
                On track
              </Tag>
              <Tag label="Team">Design</Tag>
            </>
          }
          actions={
            <>
              <Button variant="outline" shape="pill">
                Follow
              </Button>
              <Button shape="pill">Share</Button>
            </>
          }
          navigation={
            <Tabs
              label="Release"
              variant="underline"
              value={tab}
              onValueChange={setTab}
              items={[
                { value: 'overview', label: 'Overview', content: null },
                { value: 'activity', label: 'Activity', content: null },
                { value: 'files', label: 'Files', content: null },
              ]}
            />
          }
        />
      </div>

      <div className="ld-plate ld-plate-finish" role="group" aria-labelledby={title}>
        <p className="ld-plate-title" id={title}>
          Finish<span className="sr-only"> for these previews</span>
        </p>
        <div className="ld-seg" role="radiogroup" aria-label="Theme">
          {(['light', 'dark'] as const).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name={`${title}-theme`}
                checked={theme === value}
                onChange={() => setTheme(value)}
              />
              <span>{value === 'light' ? 'Light' : 'Dark'}</span>
            </label>
          ))}
        </div>
        <div className="ld-plate-glass">
          <Switch label="Glass" checked={glass} onCheckedChange={setGlass} />
          <code aria-hidden="true">glass</code>
        </div>
      </div>

      <div className="ld-plate ld-plate-metric" inert aria-hidden="true">
        <Metric
          label="Visitors this week"
          value="48.2k"
          change={{ value: '12%', direction: 'up', meaning: 'positive' }}
        />
        <svg className="ld-spark" viewBox="0 0 200 40" preserveAspectRatio="none">
          <path className="ld-spark-area" d="M0 32 L25 28 L50 30 L75 22 L100 24 L125 16 L150 18 L175 9 L200 6 V40 H0Z" />
          <path d="M0 32 L25 28 L50 30 L75 22 L100 24 L125 16 L150 18 L175 9 L200 6" />
        </svg>
      </div>
    </DiyaProvider>
  )
}

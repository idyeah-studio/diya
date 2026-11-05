'use client'
import { createContext, useContext, useState } from 'react'
import dynamic from 'next/dynamic'
import { PatternSidebar } from './PatternSidebar'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { PreviewOptions, PreviewSetting } from './PreviewControls'
import { Button, Select } from '@idyeah/diya'
import type { ChartType, ChartProps, DataVizProps } from '@idyeah/diya/charts'
import { chartData, channels, acquisitionTotal, allocationData } from './catalog-data'
type DataDensity = 'Light' | 'Dense'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './PageHeaderLibrary.css'

type LoadingContent = Pick<
  DataVizProps,
  | 'title'
  | 'showHeader'
  | 'description'
  | 'actions'
  | 'summary'
  | 'footer'
  | 'showDataToggle'
  | 'shadow'
>
const ChartLoadingContent = createContext<LoadingContent | null>(null)

function DataVizLoading() {
  const content = useContext(ChartLoadingContent)
  if (!content) return null
  return (
    <article className="diya-analytics-card" data-shadow={content.shadow}>
      {(content.showHeader || content.actions) && (
        <header className="diya-analytics-header">
          {content.showHeader && (
            <div>
              <h3 className="diya-analytics-title">{content.title}</h3>
              {content.description && <p>{content.description}</p>}
            </div>
          )}
          {content.actions && <div className="diya-analytics-tools">{content.actions}</div>}
        </header>
      )}
      {content.summary && <div className="diya-analytics-metric">{content.summary}</div>}
      <div
        className="diya-data-viz"
        style={{ height: 300, display: 'grid', placeItems: 'center' }}
        role="status"
      >
        Loading chart…
      </div>
      {(content.footer || content.showDataToggle) && (
        <footer className="diya-analytics-footer">
          <span>{content.footer}</span>
          {content.showDataToggle && (
            <Button variant="quiet" size="small" disabled>
              Show data table
            </Button>
          )}
        </footer>
      )}
    </article>
  )
}

/** Option values are the library's lowercase names; the picker shows them capitalised. */
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const DataViz = dynamic(() => import('@idyeah/diya/charts').then((module) => module.DataViz), {
  loading: DataVizLoading,
})

export function DataVizLibrary() {
  const [type, setType] = useState<ChartType>('line'),
    [variant, setVariant] = useState('standard')
  const [density, setDensity] = useState<DataDensity>('Light')
  const selectedChannels = channels.slice(0, density === 'Dense' ? 6 : 3)
  const [options, setOptions] = useState({
    Header: true,
    Metric: true,
    Period: true,
    Legend: true,
    Grid: true,
    Tooltip: true,
    Footer: true,
    Shadow: false,
  })
  const variants =
    type === 'bar'
      ? ['standard', 'stacked', 'horizontal']
      : type === 'line'
        ? ['standard', 'smooth']
        : type === 'area'
          ? ['standard', 'stacked']
          : type === 'donut'
            ? ['standard', 'thin']
            : ['standard']
  const content: LoadingContent = {
    title: type === 'treemap' ? 'Resource allocation' : 'Acquisition overview',
    showHeader: options.Header,
    description: options.Header
      ? type === 'treemap'
        ? 'How resources are distributed across teams.'
        : 'How people discover your product.'
      : undefined,
    actions: options.Period && <span>Jan–Jun 2026</span>,
    summary: options.Metric && (
      <>
        {type === 'treemap' ? '1,240' : acquisitionTotal(density).toLocaleString('en-US')}
        <small>{type === 'treemap' ? 'Total allocation' : 'Total visits'}</small>
      </>
    ),
    shadow: options.Shadow,
    showDataToggle: options.Footer,
    footer: options.Footer && 'Illustrative data · No live tracking',
  }
  return (
    <main id="content" className="gallery-study component-library pattern-library">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <PatternSidebar current="data-viz" />
      <div className="component-document">
        <header className="component-document-heading">
          <h1>Data Viz</h1>
          <LibraryActions id="data-viz" />
        </header>
        <section className="pattern-stage" aria-label="Data Viz playground">
          <div className="pattern-controls data-viz-controls">
            <div className="catalog-select-setting">
              <Select
                label="Type"
                options={(['line', 'area', 'bar', 'donut', 'pie', 'combo', 'treemap'] as const).map(
                  (value) => ({ value, label: titleCase(value) })
                )}
                value={type}
                onValueChange={(next) => {
                  setType(next as ChartType)
                  setVariant('standard')
                }}
              />
            </div>
            <div className="catalog-select-setting">
              <Select
                label="Variant"
                options={variants.map((value) => ({ value, label: titleCase(value) }))}
                value={variant}
                onValueChange={setVariant}
              />
            </div>
            <PreviewSetting
              label="Data"
              options={['Light', 'Dense']}
              value={density}
              onChange={(value) => setDensity(value as DataDensity)}
            />
            <PreviewOptions
              items={Object.entries(options).map(([label, checked]) => ({
                label,
                checked,
                disabled:
                  (label === 'Grid' && ['donut', 'pie', 'treemap'].includes(type)) ||
                  (label === 'Legend' && type === 'treemap'),
                onChange: (value) => setOptions({ ...options, [label]: value }),
              }))}
            />
          </div>
          <CustomizationScope id="data-viz"><div className="pattern-canvas">
            <ChartLoadingContent.Provider value={content}>
              <DataViz
                {...content}
                type={type}
                variant={variant as ChartProps['variant']}
                height={300}
                valueDomain={variant === 'stacked' ? [0, 1200] : [0, 300]}
                categories={chartData.map((row) => row.name)}
                series={selectedChannels.map((channel, index) => ({
                  name: channel.name,
                  values: chartData.map((row) => row[channel.key]),
                  type:
                    type === 'combo'
                      ? index === selectedChannels.length - 1
                        ? 'line'
                        : 'bar'
                      : undefined,
                }))}
                data={
                  type === 'treemap'
                    ? allocationData(density)
                    : selectedChannels.map((channel) => ({
                        name: channel.name,
                        value: chartData.reduce((sum, row) => sum + row[channel.key], 0),
                      }))
                }
                legend={options.Legend}
                grid={options.Grid}
                tooltip={options.Tooltip}
              />
            </ChartLoadingContent.Provider>
          </div></CustomizationScope>
        </section>
      </div>
    </main>
  )
}

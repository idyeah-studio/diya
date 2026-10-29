'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewSetting, PreviewOptions } from './PreviewControls'
import { Progress } from '@idyeah/diya'
import { Slider } from '@idyeah/diya'
import { Breadcrumbs } from '@idyeah/diya'
import { Button } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './CollectionAtoms.css'
import './UtilityLibrary.css'

export type UtilityAtom = 'progress' | 'slider' | 'breadcrumbs'
const titles = { progress: 'Progress', slider: 'Slider', breadcrumbs: 'Breadcrumbs' }
const breadcrumbPages = [
  { label: 'Home', href: '#home', description: 'Your workspace overview and recent projects.' },
  { label: 'Projects', href: '#projects', description: 'Browse the projects in this workspace.' },
  { label: 'Veylo', href: '#veylo', description: 'Project details, activity, and team ownership.' },
  { label: 'Settings', href: '#settings', description: 'Manage the Veylo project’s preferences.' },
]
export function UtilityLibrary({ component }: { component: UtilityAtom }) {
  const [type, setType] = useState(component === 'progress' ? 'Linear' : 'Single')
  const [state, setState] = useState('Default')
  const [mode, setMode] = useState('Determinate')
  const [value, setValue] = useState(60)
  const [values, setValues] = useState<[number, number]>([25, 75])
  const [showValues, setShowValues] = useState(true)
  const [marks, setMarks] = useState(false)
  const [step, setStep] = useState('1')
  const [home, setHome] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [message, setMessage] = useState('')
  const [breadcrumbPage, setBreadcrumbPage] = useState(3)
  const title = titles[component]
  return (
    <main
      id="content"
      className="gallery-study component-library button-library"
      data-area="components"
    >
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current={component} />
      <div className="component-document">
        <header className="component-document-heading">
          <LibraryActions id={component} />
          <h2>{title}</h2>
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="input-preview-controls">
            {component === 'progress' && (
              <>
                <PreviewSetting
                  label="Type"
                  options={['Linear', 'Circular']}
                  value={type}
                  onChange={setType}
                  divided
                />
                <PreviewSetting
                  label="Mode"
                  options={['Determinate', 'Indeterminate']}
                  value={mode}
                  onChange={setMode}
                />
                <fieldset
                  className="button-control-group utility-value-control"
                  disabled={mode === 'Indeterminate'}
                >
                  <legend>Value</legend>
                  <div className="utility-value-row">
                    <Slider
                      label="Progress value"
                      hideLabel
                      showValues={false}
                      value={value}
                      onValueChange={setValue}
                      disabled={mode === 'Indeterminate'}
                    />
                    <output>{value}%</output>
                  </div>
                </fieldset>
                <PreviewOptions
                  items={[
                    {
                      label: 'Percentage',
                      checked: showValues,
                      onChange: setShowValues,
                      disabled: mode === 'Indeterminate',
                    },
                  ]}
                />
              </>
            )}
            {component === 'slider' && (
              <>
                <PreviewSetting
                  label="Type"
                  options={['Single', 'Range']}
                  value={type}
                  onChange={setType}
                  divided
                />
                <PreviewSetting
                  label="Step"
                  options={['1', '5', '10']}
                  value={step}
                  onChange={(next) => {
                    setStep(next)
                    setValues(
                      values.map((v) => Math.round(v / Number(next)) * Number(next)) as [
                        number,
                        number,
                      ]
                    )
                  }}
                />
                <PreviewOptions
                  items={[
                    { label: 'Values', checked: showValues, onChange: setShowValues },
                    { label: 'Markers', checked: marks, onChange: setMarks },
                  ]}
                />
                <PreviewSetting
                  label="State"
                  options={['Default', 'Disabled']}
                  value={state}
                  onChange={setState}
                />
              </>
            )}
            {component === 'breadcrumbs' && (
              <PreviewOptions
                items={[
                  { label: 'Home icon', checked: home, onChange: setHome },
                  { label: 'Collapse', checked: collapsed, onChange: setCollapsed },
                ]}
              />
            )}
          </div>
          <CustomizationScope id={component}><section className="collection-example" aria-label={`${title} preview`}>
            <div className="collection-example-stack">
              {component === 'progress' && (
                <Progress
                  label="Upload progress"
                  value={mode === 'Determinate' ? value : undefined}
                  variant={type === 'Linear' ? 'linear' : 'circular'}
                  showValue={showValues}
                />
              )}
              {component === 'slider' && (
                <Slider
                  label="Volume"
                  {...(type === 'Range'
                    ? { range: true as const, value: values, onValueChange: setValues }
                    : { value: values[0], onValueChange: (next: number) => setValues([next, values[1]]) })}
                  showValues={showValues}
                  showMarks={marks}
                  step={Number(step)}
                  disabled={state === 'Disabled'}
                />
              )}
              {component === 'breadcrumbs' && (
                <>
                  <Breadcrumbs
                    showHomeIcon={home}
                    collapsed={collapsed}
                    items={breadcrumbPages.slice(0, breadcrumbPage + 1)}
                    onNavigate={(item) => {
                      setBreadcrumbPage(
                        breadcrumbPages.findIndex((page) => page.href === item.href)
                      )
                      setMessage(`${item.label} opened.`)
                    }}
                  />
                  <section aria-label="Breadcrumb destination">
                    <h3>{breadcrumbPages[breadcrumbPage].label}</h3>
                    <p>{breadcrumbPages[breadcrumbPage].description}</p>
                    {breadcrumbPage < 3 && (
                      <Button
                        variant="quiet"
                        onClick={() => {
                          setBreadcrumbPage(3)
                          setMessage('Veylo settings opened.')
                        }}
                      >
                        Open Veylo settings
                      </Button>
                    )}
                  </section>
                  <p className="collection-preview-status" role="status">
                    {message}
                  </p>
                </>
              )}
            </div>
          </section></CustomizationScope>
        </div>
      </div>
    </main>
  )
}

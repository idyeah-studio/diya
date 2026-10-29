'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useRef, useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewSetting, PreviewOptions } from './PreviewControls'
import { Badge, type Tone } from '@idyeah/diya'
import './BadgeLibrary.css'
import { Tag } from '@idyeah/diya'
import { Metric } from '@idyeah/diya'
import { TextLink } from '@idyeah/diya'
import { Pagination } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './CollectionAtoms.css'
import './DataAtoms.css'
export type DataAtom = 'tag' | 'metric' | 'link' | 'pagination'
const titles = { tag: 'Tag', metric: 'Metric', link: 'Text Link', pagination: 'Pagination' }
function Icon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="m9 15 6-6 M7 13l-2 2a3 3 0 0 0 4 4l4-4 M11 9l4-4a3 3 0 0 1 4 4l-2 2" />
    </svg>
  )
}
export function DataAtomsLibrary({ component }: { component: DataAtom }) {
  const [tone, setTone] = useState<Tone>('neutral')
  const [size, setSize] = useState('Medium')
  const [leading, setLeading] = useState('None')
  const [removable, setRemovable] = useState(false)
  const [tags, setTags] = useState(['Design', 'Engineering', 'Product'])
  const [label, setLabel] = useState(true)
  const [comparison, setComparison] = useState(true)
  const [type, setType] = useState('Standalone')
  const [leadingIcon, setLeadingIcon] = useState(false)
  const [trailingIcon, setTrailingIcon] = useState(false)
  const [numbers, setNumbers] = useState(true)
  const [count, setCount] = useState(true)
  const [perPage, setPerPage] = useState(true)
  const [empty, setEmpty] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [message, setMessage] = useState('')
  const tagArea = useRef<HTMLDivElement>(null)
  const title = titles[component]
  const typedSize = size.toLowerCase() as 'small' | 'medium' | 'large'
  function removeTag(tag: string) {
    const buttons = Array.from(tagArea.current?.querySelectorAll('button') ?? [])
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    setTags(tags.filter((item) => item !== tag))
    setMessage(`${tag} removed.`)
    requestAnimationFrame(() => {
      const remaining = tagArea.current?.querySelectorAll('button')
      if (remaining?.length) remaining[Math.min(index, remaining.length - 1)].focus()
      else tagArea.current?.focus()
    })
  }
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
            {component === 'link' && (
              <PreviewSetting
                label="Type"
                options={['Standalone', 'Inline']}
                value={type}
                onChange={setType}
                divided
              />
            )}
            {(component === 'tag' || component === 'metric') && (
              <PreviewSetting
                label="Size"
                options={['Small', 'Medium', 'Large']}
                value={size}
                onChange={setSize}
              />
            )}
            {component === 'tag' && (
              <>
                <fieldset className="button-control-group badge-color-group">
                  <legend>Color</legend>
                  <div className="badge-color-options">
                    {(
                      ['neutral', 'success', 'warning', 'error', 'info', 'brand'] as Tone[]
                    ).map((option) => (
                      <label key={option}>
                        <input
                          type="radio"
                          name="tag-color"
                          aria-label={option[0].toUpperCase() + option.slice(1)}
                          checked={tone === option}
                          onChange={() => setTone(option)}
                        />
                        <span className="badge-color-swatch">
                          <Badge variant="dot" tone={option} label={option} />
                          <span>{option[0].toUpperCase() + option.slice(1)}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <PreviewSetting
                  label="Leading"
                  options={['None', 'Dot', 'Icon']}
                  value={leading}
                  onChange={setLeading}
                />
                <PreviewOptions
                  items={[
                    {
                      label: 'Removable',
                      checked: removable,
                      onChange: (value) => {
                        setRemovable(value)
                        setTags(['Design', 'Engineering', 'Product'])
                        setMessage('')
                      },
                    },
                  ]}
                />
              </>
            )}
            {component === 'metric' && (
              <PreviewOptions
                items={[
                  { label: 'Label', checked: label, onChange: setLabel },
                  { label: 'Comparison', checked: comparison, onChange: setComparison },
                ]}
              />
            )}
            {component === 'link' && (
              <PreviewOptions
                items={[
                  { label: 'Leading icon', checked: leadingIcon, onChange: setLeadingIcon },
                  { label: 'Trailing icon', checked: trailingIcon, onChange: setTrailingIcon },
                ]}
              />
            )}
            {component === 'pagination' && (
              <>
                <PreviewOptions
                  items={[
                    { label: 'Page numbers', checked: numbers, onChange: setNumbers },
                    { label: 'Result count', checked: count, onChange: setCount },
                    { label: 'Page size', checked: perPage, onChange: setPerPage },
                  ]}
                />
                <PreviewSetting
                  label="State"
                  options={['Default', 'Empty']}
                  value={empty ? 'Empty' : 'Default'}
                  onChange={(v) => {
                    setEmpty(v === 'Empty')
                    setPage(1)
                  }}
                />
              </>
            )}
          </div>
          <CustomizationScope id={component}><section className="collection-example" aria-label={`${title} preview`}>
            <div className="data-atom-content">
              {component === 'tag' && (
                <>
                  <div className="data-tags" ref={tagArea} tabIndex={-1} aria-label="Tags">
                    {tags.map((tag) => (
                      <Tag
                        tone={tone}
                        key={tag}
                        label={tag}
                        size={typedSize}
                        leading={
                          leading === 'Dot' ? 'dot' : leading === 'Icon' ? <Icon /> : undefined
                        }
                        onRemove={removable ? () => removeTag(tag) : undefined}
                      >
                        {tag}
                      </Tag>
                    ))}
                    {!tags.length && (
                      <span className="collection-preview-status">All tags removed.</span>
                    )}
                  </div>
                  <p className="collection-preview-status" role="status">
                    {message}
                    {tags.length < 3 && (
                      <>
                        {' '}
                        <TextLink
                          href="#restore"
                          onClick={(e) => {
                            e.preventDefault()
                            setTags(['Design', 'Engineering', 'Product'])
                            setMessage('Tags restored.')
                            requestAnimationFrame(() =>
                              tagArea.current?.querySelector('button')?.focus()
                            )
                          }}
                        >
                          Restore tags
                        </TextLink>
                      </>
                    )}
                  </p>
                </>
              )}
              {component === 'metric' && (
                <div className="data-metrics">
                  {[
                    {
                      label: 'Revenue',
                      value: '24,800',
                      unit: 'USD',
                      direction: 'up',
                      meaning: 'positive',
                      delta: '12.8%',
                      caption: 'Increase',
                    },
                    {
                      label: 'Response time',
                      value: '186',
                      unit: 'ms',
                      direction: 'down',
                      meaning: 'positive',
                      delta: '8.2%',
                      caption: 'Decrease',
                    },
                    {
                      label: 'Error rate',
                      value: '2.4',
                      unit: '%',
                      direction: 'up',
                      meaning: 'negative',
                      delta: '0.6%',
                      caption: 'Negative',
                    },
                    {
                      label: 'Retention',
                      value: '92',
                      unit: '%',
                      direction: 'flat',
                      meaning: 'neutral',
                      delta: '0%',
                      caption: 'Unchanged',
                    },
                  ].map((item) => (
                    <div
                      className="data-metric-specimen"
                      role="group"
                      aria-label={item.label}
                      key={item.label}
                    >
                      <Metric
                        value={item.value}
                        unit={item.unit}
                        label={label ? item.label : undefined}
                        size={typedSize}
                        change={
                          comparison
                            ? {
                                value: item.delta,
                                direction: item.direction as 'up' | 'down' | 'flat',
                                meaning: item.meaning as 'positive' | 'negative' | 'neutral',
                                comparison: 'vs. last month',
                              }
                            : undefined
                        }
                      />
                      <small>{item.caption}</small>
                    </div>
                  ))}
                </div>
              )}
              {component === 'link' && (
                <p className="data-link-example">
                  {type === 'Inline' && 'For field guidance, explore the '}
                  <TextLink
                    href="/explore?area=components&component=text-input"
                    inline={type === 'Inline'}
                    leadingIcon={leadingIcon ? <Icon /> : undefined}
                    trailingIcon={trailingIcon ? <Icon /> : undefined}
                  >
                    {type === 'Inline' ? 'Text Input component' : 'Explore Text Input'}
                  </TextLink>
                  {type === 'Inline' && ' before you begin.'}
                </p>
              )}
              {component === 'pagination' && (
                <Pagination
                  page={page}
                  total={empty ? 0 : 128}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={
                    perPage
                      ? (n) => {
                          setPageSize(n)
                          setPage(1)
                        }
                      : undefined
                  }
                  showCount={count}
                  showNumbers={numbers}
                />
              )}
            </div>
          </section></CustomizationScope>
        </div>
      </div>
    </main>
  )
}

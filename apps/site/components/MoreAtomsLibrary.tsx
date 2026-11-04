'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useEffect, useRef, useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions } from './PreviewControls'
import { Switch } from '@idyeah/diya'
import { Tooltip } from '@idyeah/diya'
import { Avatar } from '@idyeah/diya'
import { Search } from '@idyeah/diya'
import { TextArea } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './MoreAtomsLibrary.css'
export type MoreAtom = 'switch' | 'tooltip' | 'avatar' | 'search' | 'text-area'
const titles = { switch: 'Switch', tooltip: 'Tooltip', avatar: 'Avatar', search: 'Search', 'text-area': 'Text Area' }
function Setting({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <fieldset className="button-control-group"><legend>{label}</legend><div className="button-mini-switch">{options.map((option) => <label key={option}><input type="radio" name={`atom-${label}`} checked={value === option} onChange={() => onChange(option)} /><span>{option}</span></label>)}</div></fieldset>
}
export function MoreAtomsLibrary({ component }: { component: MoreAtom }) {
  const [size, setSize] = useState('Medium')
  const [state, setState] = useState('Default')
  const [label, setLabel] = useState(true)
  const [description, setDescription] = useState(false)
  const [clear, setClear] = useState(true)
  const [count, setCount] = useState(false)
  const [resize, setResize] = useState(true)
  const [checked, setChecked] = useState(true)
  const [value, setValue] = useState('')
  const [placement, setPlacement] = useState('Top')
  /* Tooltip has no open prop, so its stage would show only the trigger: shortly
     after load, and after each Position change, it gets a pointer-over and shows
     itself. Any real interaction (leaving it, scrolling, Escape) closes it as usual. */
  const tooltipStage = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (component !== 'tooltip') return
    const timer = window.setTimeout(() => {
      tooltipStage.current?.querySelector('.diya-tooltip-anchor')?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [component, placement])
  const [shape, setShape] = useState('Circle')
  const [status, setStatus] = useState('None')
  const [searchStyle, setSearchStyle] = useState('Rounded')
  const typedSize = size.toLowerCase() as 'small' | 'medium' | 'large'
  const title = titles[component]
  const options = component === 'switch' ? [ ['Label', label, setLabel], ['Helper text', description, setDescription] ]
    : component === 'search' ? [ ['Label', label, setLabel], ['Helper text', description, setDescription], ['Clear action', clear, setClear] ]
    : [ ['Label', label, setLabel], ['Helper text', description, setDescription], ['Count', count, setCount], ['Resize', resize, setResize] ]
  const results = ['Button', 'Text Input', 'Select', 'Choice', 'Badge', 'Tabs', 'Switch', 'Tooltip', 'Avatar', 'Search', 'Text Area'].filter((name) => name.toLowerCase().includes(value.trim().toLowerCase()))
  return <main id="content" className="gallery-study component-library button-library more-atoms-library" data-area="components">
    <div className="gallery-study-backdrop" aria-hidden="true" /><AtomicSidebar current={component} />
    <div className="component-document"><header className="component-document-heading"><h1>{title}</h1><LibraryActions id={component} /></header>
      <div className="component-preview-stage input-specimens">
        <div className="input-preview-controls">
          {component === 'tooltip' ? <Setting label="Position" options={['Top', 'Bottom', 'Left', 'Right']} value={placement} onChange={setPlacement} /> : <Setting label="Size" options={['Small', 'Medium', 'Large']} value={size} onChange={setSize} />}
          {component === 'search' && <Setting label="Style" options={['Rounded', 'Pill']} value={searchStyle} onChange={setSearchStyle} />}
          {component === 'avatar' ? <><Setting label="Shape" options={['Circle', 'Rounded']} value={shape} onChange={setShape} /><Setting label="Status" options={['None', 'Online', 'Away', 'Busy']} value={status} onChange={setStatus} /></> : component !== 'tooltip' && <>
            <PreviewOptions items={options.map(([text, selected, change]) => ({ label: text as string, checked: selected as boolean, onChange: change as (value: boolean) => void }))} />
            <Setting label="State" options={component === 'switch' ? ['Default', 'Error', 'Disabled'] : ['Default', 'Error', 'Disabled', 'Read-only']} value={state} onChange={setState} />
          </>}
        </div>
        <CustomizationScope id={component}><section className="more-atom-example" aria-label={`${title} preview`}>
          {component === 'switch' && <Switch checked={checked} onCheckedChange={setChecked} label="Email notifications" hideLabel={!label} helperText={description ? 'Keep up with important updates.' : undefined} error={state === 'Error' ? 'Notifications could not be updated. Try again.' : undefined} disabled={state === 'Disabled'} size={typedSize} />}
          {component === 'tooltip' && <div ref={tooltipStage} className="tooltip-stage"><Tooltip label="About project access" content="Only invited people can access this project." placement={placement.toLowerCase() as 'top' | 'bottom' | 'left' | 'right'}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v1" /></svg>Project access</Tooltip></div>}
          {component === 'avatar' && <div className="avatar-specimens">{[{label:'Image', name:'Veylo Studio', src:'/images/avatar-arch.jpg'}, {label:'Initials', name:'Alex Morgan'}, {label:'Fallback', name:''}].map((item) => <div key={item.label}><Avatar name={item.name} src={item.src} size={typedSize} shape={shape === 'Circle' ? 'circle' : 'rounded'} status={status === 'None' ? undefined : status.toLowerCase() as 'online' | 'away' | 'busy'} /><span>{item.label}</span></div>)}</div>}
          {component === 'search' && <div className="search-example"><Search shape={searchStyle === 'Pill' ? 'pill' : 'rounded'} label="Search components" hideLabel={!label} placeholder="Find a component…" value={value} onValueChange={setValue} size={typedSize} clearable={clear} disabled={state === 'Disabled'} readOnly={state === 'Read-only'} helperText={description ? 'Search by component name.' : undefined} error={state === 'Error' ? 'Search is unavailable. Try again.' : undefined} autoComplete="off" /><div className="search-demo-results" aria-live="polite">{value.trim() && state !== 'Error' && <><span className="search-result-summary">{results.length ? `${results.length} ${results.length === 1 ? 'match' : 'matches'}` : 'No components found.'}</span>{results.length > 0 && <ul>{results.map((name) => <li key={name}>{name}</li>)}</ul>}</>}</div></div>}
          {component === 'text-area' && <TextArea label="Project description" hideLabel={!label} placeholder="What are you working on?" value={value} onValueChange={setValue} size={typedSize} disabled={state === 'Disabled'} readOnly={state === 'Read-only'} helperText={description ? 'A few words about your project.' : undefined} error={state === 'Error' ? 'Add a little more detail before continuing.' : undefined} showCount={count} maxLength={240} resizable={resize} />}
        </section></CustomizationScope>
      </div>
    </div>
  </main>
}

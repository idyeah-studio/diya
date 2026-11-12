// One page per case (?case=…), each a small app built on the package's dist. The specs drive
// them in Chromium, WebKit and Firefox. Query: theme, glass, motion, scale (duration scale).
import { useRef, useState, version } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import '@idyeah/diya/styles.css'
import * as diya from '@idyeah/diya'
import {
  Accordion, Button, Combobox, DatePicker, Dialog, DiyaProvider, Drawer, Menu, Popover, Progress, Select, Switch, Tabs,
  TextInput, Toast, Tooltip,
} from '@idyeah/diya'

const query = new URLSearchParams(location.search)
const motion = query.get('motion') || undefined
const theme = query.get('theme') || 'light'
const glass = query.get('glass') === '1'
const which = query.get('case') || 'buttons'
const scale = query.get('scale')
const log = (window.__log = [])
const note = (event, detail) => log.push({ event, detail, at: performance.now() })

function Buttons() {
  return (
    <div style={{ display: 'flex', gap: 16, padding: 24, flexWrap: 'wrap' }}>
      <Button>Sign in</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Cancel</Button>
      <Button className="classbg">Brand</Button>
    </div>
  )
}

function Tips() {
  return (
    <div style={{ display: 'flex', gap: 8, padding: 48 }}>
      <Tooltip content="Bold text"><Button variant="outline" size="small">Bold</Button></Tooltip>
      <Tooltip content="Italic text"><Button variant="outline" size="small">Italic</Button></Tooltip>
      <Tooltip content="Underlined text"><Button variant="outline" size="small">Under</Button></Tooltip>
      <Tooltip content="Saves the file"><Button>Save</Button></Tooltip>
    </div>
  )
}

function TabsCase() {
  const [range, setRange] = useState('week')
  const items = [{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]
  return <div style={{ padding: 24 }}><Tabs variant="pill" label="Range" items={items} value={range} onValueChange={setRange} /></div>
}

function AccordionCase() {
  return (
    <div style={{ width: 500, padding: 24 }}>
      <Accordion items={[
        { id: 'wide', label: 'Wide content', content: <div style={{ width: 900, height: 40, background: '#ccc' }}>900px</div> },
        { id: 'two', label: 'Second', content: <p>Short text.</p> },
      ]} />
    </div>
  )
}

function Overlays() {
  const [drawer, setDrawer] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 16, padding: 24 }}>
      <Dialog title="Project details" description="Edit the project." trigger={<Button>Open dialog</Button>}><p>Body</p></Dialog>
      <Button onClick={() => setDrawer(true)}>Open drawer</Button>
      <Drawer open={drawer} onOpenChange={setDrawer} title="Filters"><p>Drawer body</p></Drawer>
    </div>
  )
}

function ThemeCase() {
  const [current, setCurrent] = useState('light')
  const [tab, setTab] = useState('a')
  return (
    <div style={{ padding: 24 }}>
      <button id="flip" onClick={() => setCurrent(current === 'light' ? 'dark' : 'light')}>Flip theme</button>
      <DiyaProvider theme={current}>
        <div style={{ display: 'grid', gap: 16, padding: 24 }}>
          <Button>Solid</Button>
          <Button variant="outline">Outline</Button>
          <Switch label="Email" defaultChecked />
          <Tabs variant="pill" label="T" items={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]} value={tab} onValueChange={setTab} />
          <TextInput label="Name" defaultValue="Ada" />
        </div>
      </DiyaProvider>
    </div>
  )
}

function ProgressCase() {
  return <div style={{ display: 'grid', gap: 24, padding: 24, width: 400 }}><Progress label="Syncing" /><Progress variant="circular" label="Saving" /></div>
}

// Popups inside Dialog and Drawer, plus a pretend third-party popup that portals either to
// document.body (its default) or to a container it is given.
const options = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Bravo' }, { value: 'c', label: 'Charlie' }]
const clicked = (what) => { window.__clicked = (window.__clicked || []).concat(what) }
function ThirdParty({ id, container }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button id={`${id}-trigger`} onClick={() => setOpen(true)}>Third party {id}</button>
      {open && createPortal(
        <div id={`${id}-popup`} style={{ position: 'fixed', top: 40, left: 40, width: 200, height: 80, background: 'yellow', zIndex: 99999 }}>
          <button id={`${id}-item`} onClick={() => clicked(id)}>Pick</button>
        </div>,
        container || document.body,
      )}
    </div>
  )
}
function PopupsBody({ where, modal }) {
  const [combo, setCombo] = useState('')
  const [date, setDate] = useState('')
  const [choice, setChoice] = useState('')
  const [toast, setToast] = useState(false)
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Menu label={`Menu ${where}`} items={[{ id: 'm1', label: 'Rename', onSelect: () => clicked(`menu-${where}`) }]} />
      <Popover label={`Popover ${where}`}><button onClick={() => clicked(`popover-${where}`)}>Inside popover {where}</button></Popover>
      <Tooltip content={`Tip ${where}`}><Button aria-label={`Tip trigger ${where}`}>Hover {where}</Button></Tooltip>
      <Combobox label={`Combo ${where}`} options={options} value={combo} onValueChange={setCombo} />
      <DatePicker label={`Date ${where}`} value={date} onValueChange={setDate} />
      <Select label={`Select ${where}`} options={options} value={choice} onValueChange={setChoice} />
      <Button onClick={() => setToast(true)}>Toast {where}</Button>
      {toast && <Toast title={`Saved ${where}`} tone="success" duration={0} onDismiss={() => setToast(false)} action={{ label: `Undo ${where}`, onClick: () => clicked(`toast-${where}`) }}>Draft saved.</Toast>}
      <ThirdParty id={`tp-body-${where}`} />
      <ThirdParty id={`tp-ref-${where}`} container={modal.current} />
      {diya.useDiyaPortalContainer && <HookedThirdParty where={where} />}
    </div>
  )
}
function HookedThirdParty({ where }) {
  const container = diya.useDiyaPortalContainer()
  return <ThirdParty id={`tp-hook-${where}`} container={container} />
}
function Popups() {
  const [dialog, setDialog] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const dialogRef = useRef(null)
  const drawerRef = useRef(null)
  return (
    <div style={{ display: 'flex', gap: 16, padding: 24 }}>
      <Button id="open-dialog" onClick={() => setDialog(true)}>Open dialog</Button>
      <Button id="open-drawer" onClick={() => setDrawer(true)}>Open drawer</Button>
      <Dialog ref={dialogRef} title="In a dialog" open={dialog} onOpenChange={setDialog} size="large"><PopupsBody where="dialog" modal={dialogRef} /></Dialog>
      <Drawer ref={drawerRef} title="In a drawer" open={drawer} onOpenChange={setDrawer}><PopupsBody where="drawer" modal={drawerRef} /></Drawer>
    </div>
  )
}

// A host that keeps one toast in state, the way 1.1 apps (and the Screens) do.
function ToastHost() {
  const [notice, setNotice] = useState(null)
  const duration = Number(query.get('duration') ?? 8000)
  const count = useRef(0)
  const raise = (title, extra = {}) => { count.current += 1; note('raise', title); setNotice({ key: count.current, title, ...extra }) }
  return (
    <div style={{ display: 'flex', gap: 16, padding: 24, flexWrap: 'wrap' }}>
      <Button onClick={() => raise('Draft saved')}>Save</Button>
      <Button onClick={() => raise('Link copied')}>Copy link</Button>
      <Button onClick={() => raise('3 emails archived', { action: { label: 'Undo', onClick: () => note('undo') } })}>Archive</Button>
      {notice && (
        <Toast key={query.get('keyed') === '0' ? undefined : notice.key} tone="success" title={notice.title} duration={duration} action={notice.action}
          onDismiss={() => { note('dismiss', notice.title); setNotice(null) }}>
          Saved a moment ago.
        </Toast>
      )}
    </div>
  )
}

const cases = { buttons: Buttons, tips: Tips, tabs: TabsCase, accordion: AccordionCase, overlays: Overlays, theme: ThemeCase, progress: ProgressCase, popups: Popups, toast: ToastHost }
const Case = cases[which]
const style = document.createElement('style')
style.textContent = '.classbg { background: rgb(220 38 38); color: white; }'
document.head.append(style)
document.documentElement.dataset.react = version
createRoot(document.getElementById('root')).render(
  which === 'theme'
    ? <Case />
    : <DiyaProvider theme={theme} glass={glass} motion={motion} style={scale === null ? undefined : { '--diya-duration-scale': scale }}><Case /></DiyaProvider>,
)
requestAnimationFrame(() => document.documentElement.setAttribute('data-ready', ''))

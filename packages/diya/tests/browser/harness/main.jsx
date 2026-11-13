// One page per case (?case=…), each a small app built on the package's dist. The specs drive
// them in Chromium, WebKit and Firefox. Query: theme, glass, motion, scale (duration scale).
import { useEffect, useRef, useState, version } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import '@idyeah/diya/styles.css'
import * as diya from '@idyeah/diya'
import {
  Accordion, Button, Card, Combobox, Pagination, DatePicker, Dialog, DiyaProvider, Drawer, Menu, PageHeader, Popover, Progress, Select, Switch, Tabs,
  TextArea, TextInput, Toast, Tooltip,
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
      {query.get('page') === '1' && diya.useDiyaPortalContainer && <HookedThirdParty where="page" />}
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


// The theming tokens' targets: each control the nine tokens reach, open where it opens.
// brand=1 adds a brand file; outer=1 sets the tokens on an outer provider's style around a
// nested Dark provider.
const BRAND_FILE = `.diya-root { --diya-height-control-small: 36px; --diya-height-control-medium: 44px; --diya-height-control-large: 52px; }
@media (forced-colors: none) {
  .diya-root[data-theme='light'] { --diya-color-heading: #0b4a4e; --diya-color-focus: #0f6b70; --diya-color-field: #ffffff; --diya-color-field-line: #7d8c8e; }
  .diya-root[data-theme='dark'] { --diya-color-heading: #9fe3dc; --diya-color-focus: #4cc4bb; --diya-color-field: #18181b; --diya-color-field-line: #6b7a7c; }
}`
function TokensBody() {
  const [tab, setTab] = useState('a')
  const [menu, setMenu] = useState(false)
  return (
    <div style={{ display: 'grid', gap: 16, padding: 24, maxWidth: 520 }}>
      <PageHeader title="Workspace settings" />
      <Card title="Billing" actions={<Button data-k="card-action" iconOnly size="small" aria-label="More">⋯</Button>}>Card body</Card>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button data-k="button-small" size="small">Small</Button>
        <Button data-k="button-medium">Medium</Button>
        <Button data-k="button-large" size="large">Large</Button>
        <Button data-k="button-icon" iconOnly aria-label="More">⋯</Button>
      </div>
      <TextInput data-k="text" label="Name" defaultValue="Ada" />
      <TextInput data-k="text-invalid" label="Email" defaultValue="ada@" error="Enter a full email address." />
      <TextArea label="Notes" defaultValue="Draft" />
      <Select label="Team" options={[{ value: 'a', label: 'Alpha' }]} defaultValue="a" />
      <Combobox label="Owner" options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Bravo' }]} defaultValue="" />
      <DatePicker label="Due" value="2026-11-12" onValueChange={() => {}} />
      <Tabs label="Sections" items={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]} value={tab} onValueChange={setTab} />
      <Menu label="Actions" open={menu} onOpenChange={setMenu} items={[{ id: 'r', label: 'Rename', onSelect: () => {} }]} />
      <Dialog title="Edit project" trigger={<Button>Open dialog</Button>}><p>Body</p></Dialog>
      <div data-k="pagination"><Pagination page={2} total={60} pageSize={10} onPageChange={() => {}} /></div>
    </div>
  )
}
function Tokens() {
  if (query.get('brand') === '1') {
    const sheet = document.createElement('style')
    sheet.textContent = BRAND_FILE
    document.head.append(sheet)
  }
  if (query.get('outer') !== '1') return <TokensBody />
  return (
    <DiyaProvider theme="light" style={{ '--diya-height-control-medium': '60px', '--diya-color-field': 'rgb(255, 0, 0)', '--diya-color-focus': 'rgb(255, 0, 0)', '--diya-radius-popup': '2px' }}>
      <div id="outer-probe"><Button data-k="outer-button">Outer</Button></div>
      <DiyaProvider theme="dark"><div id="nested"><TokensBody /></div></DiyaProvider>
    </DiyaProvider>
  )
}

// toast() and its stack: buttons that raise toasts, and a Dialog and Drawer to open over them.
// nopopover=1 takes the Popover API away first, the way Safari before 17 has it.
if (query.get('nopopover') === '1') delete HTMLElement.prototype.showPopover
function StackCase() {
  const [dialog, setDialog] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const undo = { label: 'Undo', onClick: () => note('undo') }
  return (
    <div style={{ display: 'flex', gap: 12, padding: 24, flexWrap: 'wrap', alignItems: 'start' }}>
      <Button onClick={() => diya.toast({ title: 'Draft saved', tone: 'success', duration: 0 })}>Save</Button>
      <Button onClick={() => diya.toast({ title: '3 emails archived', action: undo })}>Archive</Button>
      <Button onClick={() => diya.toast({ title: 'Link copied', duration: 0 })}>Copy link</Button>
      <Button onClick={() => diya.toast({ title: 'Export started', description: "We'll email you when it's ready.", duration: 0 })}>Export</Button>
      <Button onClick={() => diya.toast({ title: "Couldn't sync", tone: 'error', urgent: true, duration: 0, action: { label: 'Try again', onClick: () => note('retry') } })}>Sync</Button>
      <Button id="open-dialog" onClick={() => setDialog(true)}>Open dialog</Button>
      <Button id="open-drawer" onClick={() => setDrawer(true)}>Open drawer</Button>
      <Dialog title="Edit task" open={dialog} onOpenChange={setDialog}>
        <TextInput label="Task name" defaultValue="Write the brief" />
        <Button onClick={() => diya.toast({ title: 'Saved in the dialog', duration: 0 })}>Toast inside</Button>
      </Dialog>
      <Drawer title="Filters" open={drawer} onOpenChange={setDrawer}>
        <Button onClick={() => diya.toast({ title: 'Saved in the drawer', duration: 0 })}>Toast inside</Button>
      </Drawer>
    </div>
  )
}

// Two <Toast>s and a toast() in one provider, and a <Toast> in a nested Dark provider.
function ToastsCase() {
  const [first, setFirst] = useState(true)
  const [second, setSecond] = useState(true)
  return (
    <div style={{ padding: 24, display: 'flex', gap: 12 }}>
      <Button onClick={() => diya.toast({ title: 'Export started', duration: 0 })}>Export</Button>
      {first && <Toast title="Draft saved" tone="success" duration={0} onDismiss={() => setFirst(false)}>Saved a moment ago.</Toast>}
      {second && <Toast title="Link copied" duration={0} onDismiss={() => setSecond(false)}>Paste it anywhere.</Toast>}
      {query.get('nested') === '1' && <DiyaProvider theme="dark"><Toast title="Synced" duration={0} onDismiss={() => {}}>Up to date.</Toast></DiyaProvider>}
    </div>
  )
}

// The toast probe: everything driven from the page's window, so specs can start from an empty
// stack and move a real pointer onto a toast. window.diya is the package; window.comps adds and
// removes <Toast>s; window.nested does it in a nested Dark provider; window.openDialog opens a
// DIYA Dialog; window.openNative opens an app's own showModal() dialog with a <Toast> button.
// bg=1 puts a busy backdrop behind the corner, so Glass shows what's under it. nestedmotion and
// nestedscale set the nested provider's motion and duration scale.
function Comps({ store, prefix }) {
  const [list, setList] = useState([])
  useEffect(() => {
    let n = 0
    window[store] = {
      add: (props) => { const key = `${prefix}${++n}`; flushSync(() => setList((items) => [...items, { key, ...props }])); return key },
      update: (key, props) => flushSync(() => setList((items) => items.map((item) => (item.key === key ? { ...item, ...props } : item)))),
      remove: (key) => flushSync(() => setList((items) => items.filter((item) => item.key !== key))),
    }
  }, [])
  return list.map(({ key, title, description, action, duration = 0, tone = 'info', urgent }) => (
    <Toast key={key} title={title} tone={tone} duration={duration} urgent={urgent} action={action}
      onDismiss={() => { note('dismiss', title); setList((items) => items.filter((item) => item.key !== key)) }}>
      {description}
    </Toast>
  ))
}
function ProbeCase() {
  const [dialog, setDialog] = useState(false)
  const native = useRef(null)
  const [nativeToast, setNativeToast] = useState(false)
  const [couponError, setCouponError] = useState()
  useEffect(() => {
    window.diya = diya
    window.openDialog = () => flushSync(() => setDialog(true))
    window.closeDialog = () => flushSync(() => setDialog(false))
    window.openNative = () => native.current.showModal()
  }, [])
  return (
    <div style={{ padding: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'start' }}>
      {query.get('bg') === '1' && <div aria-hidden="true" style={{ position: 'fixed', right: 0, bottom: 0, width: 520, height: 560, background: 'repeating-linear-gradient(135deg, #e4572e 0 24px, #29335c 24px 48px, #f3a712 48px 72px)', zIndex: 0 }} />}
      <p id="probe-blank" style={{ margin: 0 }}>Blank page</p>
      <input id="extra" aria-label="Extra" />
      <Button id="post-undo" onClick={() => window.comps.add({ title: 'Comment hidden', action: { label: 'Undo', onClick: () => note('undo-comment') } })}>Hide comment</Button>
      <Button id="post-comment" onClick={() => window.comps.add({ title: 'Comment posted' })}>Post comment</Button>
      <Button id="post-toast" onClick={() => diya.toast({ title: 'Comment saved', duration: 0 })}>Save comment</Button>
      <TextInput label="Project name" defaultValue="Atlas" />
      <Button id="open-dialog" onClick={() => setDialog(true)}>Open dialog</Button>
      <Dialog title="Edit task" open={dialog} onOpenChange={setDialog}>
        <TextInput label="Task name" defaultValue="Write the brief" />
        <Button onClick={() => diya.toast({ title: 'Saved in the dialog', duration: 0 })}>Toast inside</Button>
        <Button id="dialog-save" onClick={() => window.comps.add({ title: 'Brief saved' })}>Save brief</Button>
      </Dialog>
      <dialog ref={native} id="native" style={{ padding: 24 }}>
        <TextInput id="coupon" label="Coupon code" error={couponError} onBlur={(event) => setCouponError(event.target.value.length < 6 ? 'Enter all 6 characters of the code.' : undefined)} />
        <button id="native-save" onClick={() => setNativeToast(true)}>Save</button>
        <button id="native-close" onClick={() => native.current.close()}>Close</button>
        {nativeToast && <Toast title="Saved in native" duration={0} action={{ label: 'Undo native', onClick: () => note('undo-native') }} onDismiss={() => setNativeToast(false)}>Saved in the app's own dialog.</Toast>}
      </dialog>
      <Comps store="comps" prefix="k" />
      {query.get('nested') === '1' && <DiyaProvider theme="dark" glass={query.get('nestedglass') === '1'} motion={query.get('nestedmotion') ?? undefined} style={query.get('nestedscale') ? { '--diya-duration-scale': query.get('nestedscale') } : undefined}><div id="nested-region"><Comps store="nested" prefix="n" /></div></DiyaProvider>}
    </div>
  )
}

// Field (1.2): TextInput beside Field framed around a raw input, with the same words, for the
// pixel match; a hosted card iframe (cross-origin) and a same-origin one, each framed; and a form
// whose field shows its error when you leave it, above a Pay button, for the held error.
function FieldCase() {
  const [error, setError] = useState()
  const [paid, setPaid] = useState(0)
  const [errorTi, setErrorTi] = useState()
  const [paidTi, setPaidTi] = useState(0)
  const cross = `${location.protocol}//127.0.0.1:${location.port}/card.html`
  return (
    <div style={{ display: 'grid', gap: 24, padding: 24, width: query.get('narrow') ? 'auto' : 360 }}>
      <div id="pair" style={{ display: 'grid', gap: 24 }}>
        <TextInput id="ti" label="Name on card" helperText="As it appears on the card." />
        <diya.Field label="Name on card" helperText="As it appears on the card." framed><input id="fi" /></diya.Field>
      </div>
      <diya.Field label="Card number" framed error={query.get('error') ? 'Enter your card number.' : undefined}><div className="mount"><iframe title="Card number input" src={cross} /></div></diya.Field>
      <diya.Field label="Expiry" framed><iframe title="Expiry input" srcDoc="<!doctype html><style>html,body{margin:0;background:transparent}</style><input aria-label=Expiry>" /></diya.Field>
      <form id="pay" onSubmit={(event) => { event.preventDefault(); setPaid((count) => count + 1) }} style={{ display: 'grid', gap: 16 }}>
        <diya.Field label="Security code" error={error}><input id="cvc" onBlur={(event) => setError(event.target.value.length < 3 ? 'Enter the 3 digits on the back.' : undefined)} /></diya.Field>
        <Button type="submit" id="submit">Pay</Button>
        <output id="paid">{paid}</output>
      </form>
      <form id="pay-ti" onSubmit={(event) => { event.preventDefault(); setPaidTi((count) => count + 1) }} style={{ display: 'grid', gap: 16 }}>
        <TextInput id="cvc-ti" label="Security code" error={errorTi} onBlur={(event) => setErrorTi(event.target.value.length < 3 ? 'Enter the 3 digits on the back.' : undefined)} />
        <Button type="submit" id="submit-ti">Pay</Button>
        <output id="paid-ti">{paidTi}</output>
      </form>
    </div>
  )
}

// React Stripe Elements' pattern: a component renders its own mount div and mounts the hosted
// iframe into it once mounted (<CardElement />).
function CardElement({ name }) {
  const mount = useRef(null)
  useEffect(() => {
    const frame = document.createElement('iframe')
    frame.title = name
    frame.src = `${location.protocol}//127.0.0.1:${location.port}/card.html?component`
    frame.setAttribute('style', 'border: none !important; margin: 0px !important; padding: 0px !important; width: 1px !important; min-width: 100% !important; overflow: hidden !important; display: block !important; height: 19.2px;')
    mount.current.append(frame)
    return () => frame.remove()
  }, [])
  return <div ref={mount} className="StripeElement" />
}

// Real hosted-field patterns inside Field framed (the front-end review, steps 5–6): Stripe's
// mount div holding an iframe with !important inline sizing, a bare iframe, split card fields
// (number, expiry), a native select and a textarea; plus a Dialog that mounts on its opener's
// click, with no other overlay on the page.
function ProvidersCase() {
  const [later, setLater] = useState(false)
  const [mounted, setMounted] = useState(false)
  const stripe = useRef(null)
  const cross = (name) => `${location.protocol}//127.0.0.1:${location.port}/card.html?${name}`
  useEffect(() => {
    // As Stripe Elements mounts: a private div, then an iframe with !important inline sizing.
    const holder = document.createElement('div')
    holder.className = '__PrivateStripeElement'
    holder.setAttribute('style', 'margin: 0px !important; padding: 0px !important; border: none !important; display: block !important; background: transparent !important; position: relative !important; opacity: 1 !important;')
    const frame = document.createElement('iframe')
    frame.title = 'Stripe-like card'
    frame.src = cross('stripe')
    frame.setAttribute('style', 'border: none !important; margin: 0px !important; padding: 0px !important; width: 1px !important; min-width: 100% !important; overflow: hidden !important; display: block !important; user-select: none !important; height: 19.2px;')
    holder.append(frame)
    stripe.current.append(holder)
    return () => holder.remove()
  }, [])
  return (
    <div style={{ display: 'grid', gap: 24, padding: 24, width: 360 }}>
      <Button id="later-open" onClick={() => { setMounted(true); setLater(true) }}>Open later</Button>
      {mounted && <Dialog title="Later" open={later} onOpenChange={setLater}><p>Body</p></Dialog>}
      <diya.Field label="Card (mount div)" framed><div id="stripe-mount" ref={stripe} /></diya.Field>
      <diya.Field label="Card (component)" framed><CardElement name="Component card" /></diya.Field>
      <diya.Field label="Card (bare iframe)" framed><iframe title="Bare card" src={cross('bare')} /></diya.Field>
      <diya.Field label="Card number" framed><iframe title="Split number" src={cross('a')} /></diya.Field>
      <diya.Field label="Expiry" framed error={query.get('error') ? 'Enter the expiry date.' : undefined}><iframe title="Split expiry" src={cross('b')} /></diya.Field>
      <diya.Field label="Region" framed><select id="framed-select"><option>North</option><option>South</option></select></diya.Field>
      <diya.Field label="Regions" framed><select id="framed-list" multiple><option>North</option><option>South</option><option>East</option></select></diya.Field>
      <diya.Field label="Notes" framed><textarea id="framed-notes" defaultValue={'one\ntwo\nthree'} /></diya.Field>
      <div id="textareas" style={{ display: 'grid', gap: 16 }}>
        {['small', 'medium', 'large'].map((size) => (
          <div key={size} style={{ display: 'grid', gap: 16 }}>
            <TextArea id={`ta-${size}`} label={`TextArea ${size}`} size={size} />
            <diya.Field label={`Framed ${size}`} size={size} framed><textarea id={`fta-${size}`} /></diya.Field>
          </div>
        ))}
      </div>
      <p id="blank" style={{ padding: 24 }}>Blank page</p>
    </div>
  )
}

// Checkbox (1.2) beside Choice, whose box it shares: unchecked and checked boxes of each, a mixed
// Checkbox and a mixed Select all (present from the first paint), a label with a link, and a
// form whose submissions are counted.
function CheckboxCase() {
  const [sent, setSent] = useState(0)
  const options = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Bravo' }, { value: 'c', label: 'Charlie' }]
  return (
    <form id="cb-form" onSubmit={(event) => { event.preventDefault(); setSent((count) => count + 1) }} style={{ display: 'grid', gap: 24, padding: 24, width: 420 }}>
      <diya.Choice label="Teams" multiple selectAll options={options} defaultValue={['b']} />
      <diya.Choice label="One" multiple options={[{ value: 'x', label: 'Unchecked option' }, { value: 'y', label: 'Checked option' }]} defaultValue={['y']} />
      <diya.Checkbox id="cb-off" label="Unchecked box" />
      <diya.Checkbox id="cb-on" label="Checked box" defaultChecked />
      <diya.Checkbox id="cb-mixed" label="All 3 projects" indeterminate />
      <diya.Checkbox id="cb-terms" name="terms" label={<>I agree to the <diya.TextLink href="#terms" inline>Terms</diya.TextLink></>} />
      <Button type="submit">Create account</Button>
      <output id="cb-sent">{sent}</output>
    </form>
  )
}

const cases = { checkbox: CheckboxCase, providers: ProvidersCase, field: FieldCase, buttons: Buttons, tips: Tips, tabs: TabsCase, accordion: AccordionCase, overlays: Overlays, theme: ThemeCase, progress: ProgressCase, popups: Popups, toast: ToastHost, tokens: Tokens, stack: StackCase, toasts: ToastsCase, probe: ProbeCase }
const Case = cases[which]
const style = document.createElement('style')
style.textContent = '.classbg { background: rgb(220 38 38); color: white; }'
document.head.append(style)
document.documentElement.dataset.react = version
const app = which === 'theme' || (which === 'tokens' && query.get('outer') === '1')
  ? <Case />
  : <DiyaProvider theme={theme} glass={glass} motion={motion} style={scale === null ? undefined : { '--diya-duration-scale': scale }}><Case /></DiyaProvider>
if (query.get('ssr') === '1') {
  // As a server-rendered app arrives: the server's HTML paints first, then React hydrates it two
  // frames later (data-hydrated marks when).
  const root = document.getElementById('root')
  root.innerHTML = renderToString(app)
  requestAnimationFrame(() => {
    document.documentElement.setAttribute('data-ready', '')
    requestAnimationFrame(() => requestAnimationFrame(() => {
      hydrateRoot(root, app)
      requestAnimationFrame(() => document.documentElement.setAttribute('data-hydrated', ''))
    }))
  })
} else {
  createRoot(document.getElementById('root')).render(app)
  requestAnimationFrame(() => document.documentElement.setAttribute('data-ready', ''))
}

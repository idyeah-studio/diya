'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useState, type CSSProperties } from 'react'
import { PatternSidebar } from './PatternSidebar'
import { PreviewSetting, PreviewOptions } from './PreviewControls'
import { Button, Dialog } from '@idyeah/diya'
import { TextInput } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './PageHeaderLibrary.css'

// The canvas shows the closed panel in place: no modal layer, so it never traps or takes focus.
// The live dialog opens from the trigger in the controls.
const specimen: CSSProperties = { display: 'block', position: 'relative', inset: 'auto', maxWidth: '100%', maxHeight: 'none', margin: 'auto' }

export function DialogLibrary() {
  const [size, setSize] = useState('Medium')
  const [description, setDescription] = useState(true)
  const [close, setClose] = useState(true)
  const [divider, setDivider] = useState(false)
  const [name, setName] = useState('Website launch')
  const [savedName, setSavedName] = useState('Website launch')
  const [message, setMessage] = useState('')
  const props = {
    title: 'Project details',
    description: description ? 'Update the name people see across your project.' : undefined,
    size: size.toLowerCase() as 'small' | 'medium' | 'large',
    showClose: close, divided: divider, confirmDisabled: !name.trim(),
    onConfirm: () => { setSavedName(name.trim()); setName(name.trim()); setMessage('Project name saved in this preview.') },
    onDismiss: () => { setName(savedName); setMessage('Changes discarded.') },
  }
  const field = <TextInput label="Project name" value={name} onValueChange={setName} required maxLength={80} />
  return <main id="content" className="gallery-study component-library pattern-library"><div className="gallery-study-backdrop" aria-hidden="true" /><PatternSidebar current="dialog" />
    <div className="component-document"><header className="component-document-heading"><LibraryActions id="dialog" /><h2>Dialog</h2></header>
      <section className="pattern-stage" aria-label="Dialog playground"><div className="pattern-controls">
        <PreviewSetting label="Size" options={['Small','Medium','Large']} value={size} onChange={setSize} />
        <PreviewOptions items={[{label:'Description',checked:description,onChange:setDescription},{label:'Close button',checked:close,onChange:setClose},{label:'Divider',checked:divider,onChange:setDivider}]} />
        <CustomizationScope id="dialog" canvas={false}><div className="dialog-pattern-launch"><Dialog {...props} trigger={<Button variant="outline">Open dialog</Button>}>{field}</Dialog></div></CustomizationScope>
      </div><CustomizationScope id="dialog"><div className="pattern-canvas dialog-pattern-canvas"><Dialog {...props} role="group" style={specimen}>{field}</Dialog></div></CustomizationScope><p className="pattern-feedback" role="status">{message}</p></section>
      <div className="pattern-notes"><span>Built with</span><div><a href="/explore?area=components&component=text-input">Text Input</a><a href="/explore?area=components&component=button">Button</a></div><p>Open the dialog to try keyboard navigation, Escape, and returning focus to the trigger.</p></div>
    </div></main>
}

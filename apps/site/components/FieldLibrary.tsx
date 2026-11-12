'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions, PreviewSetting } from './PreviewControls'
import { Field } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'

const SIZES = ['Small', 'Medium', 'Large'] as const

/**
 * Field around a control DIYA doesn't make. DIYA has no time field, so the
 * preview frames a native time input: the label, help and error are Field's,
 * and Framed draws the field box any DIYA field has.
 */
export function FieldLibrary() {
  const [size, setSize] = useState<(typeof SIZES)[number]>('Medium')
  const [state, setState] = useState('Default')
  const [label, setLabel] = useState(true)
  const [helper, setHelper] = useState(true)
  const [framed, setFramed] = useState(true)
  const [value, setValue] = useState('09:30')
  return (
    <main id="content" className="gallery-study component-library button-library text-input-library" data-area="components">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current="field" />
      <div className="component-document">
        <header className="component-document-heading">
          <h1>Field</h1>
          <LibraryActions id="field" />
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="input-preview-controls">
            <PreviewSetting label="Size" options={[...SIZES]} value={size} onChange={(next) => setSize(next as (typeof SIZES)[number])} />
            <PreviewOptions
              className="input-options-group"
              items={[
                { label: 'Label', checked: label, onChange: setLabel },
                { label: 'Helper text', checked: helper, onChange: setHelper },
                { label: 'Framed', checked: framed, onChange: setFramed },
              ]}
            />
            <PreviewSetting label="State" options={['Default', 'Error', 'Disabled']} value={state} onChange={setState} />
          </div>
          <CustomizationScope id="field">
            <section className="input-example" aria-label="Field preview">
              <Field
                label="Start time"
                hideLabel={!label}
                helperText={helper ? 'In your time zone.' : undefined}
                error={state === 'Error' ? 'Pick a time between 9:00 AM and 6:00 PM.' : undefined}
                disabled={state === 'Disabled'}
                framed={framed}
                size={size === 'Small' ? 'small' : size === 'Large' ? 'large' : 'medium'}
              >
                <input type="time" value={value} onChange={(event) => setValue(event.target.value)} />
              </Field>
            </section>
          </CustomizationScope>
        </div>
      </div>
    </main>
  )
}

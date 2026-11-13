'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions, PreviewSetting } from './PreviewControls'
import { Checkbox } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'

const SIZES = ['Small', 'Medium', 'Large'] as const

/**
 * A lone yes or no sent with a form. Mixed is for a box that chooses all of a
 * list, so with Mixed on the example becomes one ("Select all 4 files").
 */
export function CheckboxLibrary() {
  const [size, setSize] = useState<(typeof SIZES)[number]>('Medium')
  const [state, setState] = useState('Default')
  const [label, setLabel] = useState(true)
  const [helper, setHelper] = useState(true)
  const [mixed, setMixed] = useState(false)
  const [checked, setChecked] = useState(false)
  const help = state === 'Disabled' ? 'Already agreed when your team signed up.' : mixed ? '2 of 4 chosen.' : 'You can read them any time from your account.'
  return (
    <main id="content" className="gallery-study component-library button-library text-input-library" data-area="components">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current="checkbox" />
      <div className="component-document">
        <header className="component-document-heading">
          <h1>Checkbox</h1>
          <LibraryActions id="checkbox" />
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="input-preview-controls">
            <PreviewSetting label="Size" options={[...SIZES]} value={size} onChange={(next) => setSize(next as (typeof SIZES)[number])} />
            <PreviewOptions
              className="input-options-group"
              items={[
                { label: 'Label', checked: label, onChange: setLabel },
                { label: 'Helper text', checked: helper, onChange: setHelper },
                { label: 'Mixed', checked: mixed, onChange: setMixed },
              ]}
            />
            <PreviewSetting label="State" options={['Default', 'Error', 'Disabled']} value={state} onChange={setState} />
          </div>
          <CustomizationScope id="checkbox">
            <section className="input-example" aria-label="Checkbox preview">
              <Checkbox
                label={mixed ? 'Select all 4 files' : 'I agree to the Terms of Service'}
                hideLabel={!label}
                checked={checked}
                onCheckedChange={(next) => {
                  setChecked(next)
                  setMixed(false)
                }}
                indeterminate={mixed}
                size={size === 'Small' ? 'small' : size === 'Large' ? 'large' : 'medium'}
                helperText={helper ? help : undefined}
                error={state === 'Error' ? (mixed ? 'Choose at least one file to share.' : 'Agree to the terms to create your account.') : undefined}
                disabled={state === 'Disabled'}
              />
            </section>
          </CustomizationScope>
        </div>
      </div>
    </main>
  )
}

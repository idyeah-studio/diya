'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions } from './PreviewControls'
import { Select } from '@idyeah/diya'
import { Icon } from './Icon'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './SelectLibrary.css'
const options = [
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'product', label: 'Product' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'archived', label: 'Archived team (unavailable)', disabled: true },
]
export function SelectLibrary() {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [state, setState] = useState('Default')
  const [label, setLabel] = useState(true)
  const [helper, setHelper] = useState(true)
  const [leading, setLeading] = useState(false)
  const [value, setValue] = useState('')
  return (
    <main
      id="content"
      className="gallery-study component-library button-library select-library"
      data-area="components"
    >
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current="select" />
      <div className="component-document">
        <header className="component-document-heading">          <h1>Select</h1>
<LibraryActions id="select" />
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="input-preview-controls">
            <fieldset className="button-control-group">
              <legend>Size</legend>
              <div className="button-mini-switch">
                {(['small', 'medium', 'large'] as const).map((option) => (
                  <label key={option}>
                    <input
                      type="radio"
                      name="select-size"
                      checked={size === option}
                      onChange={() => setSize(option)}
                    />
                    <span>
                      {option === 'small' ? 'Small' : option === 'medium' ? 'Medium' : 'Large'}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <PreviewOptions
              className="input-options-group"
              items={[
                { label: 'Label', checked: label, onChange: setLabel },
                { label: 'Helper text', checked: helper, onChange: setHelper },
                { label: 'Leading icon', checked: leading, onChange: setLeading },
              ]}
            />
            <fieldset className="button-control-group">
              <legend>State</legend>
              <div className="button-mini-switch">
                {['Default', 'Error', 'Disabled'].map((option) => (
                  <label key={option}>
                    <input
                      type="radio"
                      name="select-state"
                      checked={state === option}
                      onChange={() => setState(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <CustomizationScope id="select"><section className="input-example" aria-label="Select preview">
            <Select
              label="Team"
              hideLabel={!label}
              value={value}
              onValueChange={setValue}
              options={options}
              placeholder="Choose a team"
              size={size}
              disabled={state === 'Disabled'}
              helperText={helper ? 'Choose the team this project belongs to.' : undefined}
              error={
                state === 'Error'
                  ? value
                    ? 'This team is unavailable for this project.'
                    : 'Choose a team to continue.'
                  : undefined
              }
              leadingIcon={leading ? <Icon name="layers" size={16} /> : undefined}
            />
          </section></CustomizationScope>
        </div>
      </div>
    </main>
  )
}

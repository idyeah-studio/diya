'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions } from './PreviewControls'
import { TextInput } from '@idyeah/diya'
import { Icon } from './Icon'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
export function TextInputLibrary() {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [state, setState] = useState('Default')
  const [label, setLabel] = useState(true)
  const [helper, setHelper] = useState(true)
  const [leading, setLeading] = useState(false)
  const [clear, setClear] = useState(false)
  const [value, setValue] = useState('')
  return (
    <main
      id="content"
      className="gallery-study component-library button-library text-input-library"
      data-area="components"
    >
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current="text-input" />
      <div className="component-document">
        <header className="component-document-heading">          <h1>Text Input</h1>
<LibraryActions id="text-input" />
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
                      name="input-size"
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
                { label: 'Clear action', checked: clear, onChange: setClear },
              ]}
            />
            <fieldset className="button-control-group">
              <legend>State</legend>
              <div className="button-mini-switch">
                {['Default', 'Error', 'Disabled', 'Read-only'].map((option) => (
                  <label key={option}>
                    <input
                      type="radio"
                      name="input-state"
                      checked={state === option}
                      onChange={() => setState(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <CustomizationScope id="text-input"><section className="input-example" aria-label="Text input preview">
            <TextInput
              label="Project name"
              hideLabel={!label}
              placeholder="e.g. Veylo"
              value={value}
              onValueChange={setValue}
              size={size}
              disabled={state === 'Disabled'}
              readOnly={state === 'Read-only'}
              helperText={helper ? 'Give your project a name you’ll recognize.' : undefined}
              error={
                state === 'Error'
                  ? value.trim()
                    ? 'This project name is already in use.'
                    : 'Enter a project name to continue.'
                  : undefined
              }
              leadingIcon={leading ? <Icon name="layers" size={16} /> : undefined}
              clearable={clear}
              autoComplete="off"
            />
          </section></CustomizationScope>
        </div>
      </div>
    </main>
  )
}

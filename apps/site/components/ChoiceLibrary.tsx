'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions } from './PreviewControls'
import { Choice } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './ChoiceLibrary.css'
const choices = [
  { value: 'design', label: 'Design', description: 'Shape the look and feel.' },
  { value: 'engineering', label: 'Engineering', description: 'Bring the experience to life.' },
  { value: 'product', label: 'Product', description: 'Decide what comes next.' },
]
const plainChoices = choices.map(({ value, label }) => ({ value, label }))
export function ChoiceLibrary() {
  const [mode, setMode] = useState<'single' | 'multiple'>('single')
  const [single, setSingle] = useState('design')
  const [multiple, setMultiple] = useState<string[]>(['design'])
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [state, setState] = useState('Default')
  const [label, setLabel] = useState(true)
  const [descriptions, setDescriptions] = useState(false)
  const [selectAll, setSelectAll] = useState(false)
  const [helper, setHelper] = useState(false)
  return (
    <main
      id="content"
      className="gallery-study component-library button-library choice-library"
      data-area="components"
    >
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current="choice" />
      <div className="component-document">
        <header className="component-document-heading"><LibraryActions id="choice" />
          <h2>Choice</h2>
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="button-preview-controls">
            <div className="button-kind-control">
              <fieldset className="button-control-group">
                <legend>Type</legend>
                <div className="button-mini-switch">
                  {(['single', 'multiple'] as const).map((option) => (
                    <label key={option}>
                      <input
                        type="radio"
                        name="choice-mode"
                        checked={mode === option}
                        onChange={() => setMode(option)}
                      />
                      <span>{option === 'single' ? 'Single' : 'Multiple'}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="button-other-controls">
              <fieldset className="button-control-group">
                <legend>Size</legend>
                <div className="button-mini-switch">
                  {(['small', 'medium', 'large'] as const).map((option) => (
                    <label key={option}>
                      <input
                        type="radio"
                        name="choice-size"
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
                items={[
                  { label: 'Label', checked: label, onChange: setLabel },
                  { label: 'Descriptions', checked: descriptions, onChange: setDescriptions },
                  { label: 'Select all', checked: selectAll, onChange: setSelectAll, disabled: mode === 'single' },
                  { label: 'Helper text', checked: helper, onChange: setHelper },
                ]}
              />
              <fieldset className="button-control-group">
                <legend>State</legend>
                <div className="button-mini-switch">
                  {['Default', 'Error', 'Disabled'].map((option) => (
                    <label key={option}>
                      <input
                        type="radio"
                        name="choice-state"
                        checked={state === option}
                        onChange={() => setState(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
          <CustomizationScope id="choice"><section className="choice-example" aria-label="Choice preview">
            <Choice
              {...(mode === 'single'
                ? { value: single, onValueChange: setSingle }
                : { multiple: true as const, value: multiple, onValueChange: setMultiple, selectAll })}
              label={mode === 'single' ? 'Choose your focus' : 'Choose your interests'}
              options={descriptions ? choices : plainChoices}
              size={size}
              hideLabel={!label}
              disabled={state === 'Disabled'}
              helperText={
                helper
                  ? mode === 'single'
                    ? 'Choose one option.'
                    : 'Choose any that apply.'
                  : undefined
              }
              error={state === 'Error' ? 'Please review your selection.' : undefined}
            />
          </section></CustomizationScope>
        </div>
      </div>
    </main>
  )
}

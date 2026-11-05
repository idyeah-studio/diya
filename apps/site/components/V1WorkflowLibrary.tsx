'use client'
import { useState } from 'react'
import { PatternSidebar } from './PatternSidebar'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { PreviewOptions, PreviewSetting } from './PreviewControls'
import { WorkflowPreview } from './WorkflowPreview'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './PageHeaderLibrary.css'

export type WorkflowPattern = 'file-upload' | 'form' | 'drawer' | 'empty-state' | 'wizard'
const descriptions = {
  wizard: ['Wizard', 'Guide users through a focused, multi-step flow.'],
  'file-upload': ['File Upload', 'Choose, validate, and manage files.'],
  form: ['Form', 'Clear fields, useful validation, and a complete submission flow.'],
  drawer: ['Drawer', 'Details and actions alongside your current work.'],
  'empty-state': [
    'Content State',
    'A clear next step when content is missing or unavailable.',
  ],
}
export function V1WorkflowLibrary({ pattern }: { pattern: WorkflowPattern }) {
  const [multiple, setMultiple] = useState(true)
  const [helper, setHelper] = useState(true)
  const [secondary, setSecondary] = useState(true)
  const [description, setDescription] = useState(true)
  const [footer, setFooter] = useState(true)
  const [action, setAction] = useState(true)
  const [extended, setExtended] = useState(true)
  const [orientation, setOrientation] = useState('Horizontal')
  const [showStepCount, setShowStepCount] = useState(true)
  const [side, setSide] = useState('Right')
  const [state, setState] = useState('Empty')
  const [title] = descriptions[pattern]
  return (
    <main id="content" className="gallery-study component-library pattern-library">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <PatternSidebar current={pattern} />
      <div className="component-document">
        <header className="component-document-heading">
          <h1>{title}</h1>
          <LibraryActions id={pattern} />
        </header>
        <section className="pattern-stage" aria-label={`${title} playground`}>
          <div className="pattern-controls">
            {pattern === 'file-upload' && (
              <PreviewOptions
                items={[
                  { label: 'Multiple files', checked: multiple, onChange: setMultiple },
                  { label: 'Helper text', checked: helper, onChange: setHelper },
                ]}
              />
            )}
            {pattern === 'form' && (
              <PreviewOptions
                items={[
                  { label: 'Helper text', checked: helper, onChange: setHelper },
                  { label: 'Secondary action', checked: secondary, onChange: setSecondary },
                  { label: 'Additional fields', checked: extended, onChange: setExtended },
                ]}
              />
            )}
            {pattern === 'wizard' && (
              <>
                <PreviewSetting
                  label="Layout"
                  options={['Horizontal', 'Vertical']}
                  value={orientation}
                  onChange={setOrientation}
                />
                <PreviewOptions
                  items={[{ label: 'Step count', checked: showStepCount, onChange: setShowStepCount }]}
                />
              </>
            )}
            {pattern === 'drawer' && (
              <>
                <PreviewSetting
                  label="Position"
                  options={['Left', 'Right']}
                  value={side}
                  onChange={setSide}
                />
                <PreviewOptions
                  items={[
                    { label: 'Description', checked: description, onChange: setDescription },
                    { label: 'Footer', checked: footer, onChange: setFooter },
                  ]}
                />
              </>
            )}
            {pattern === 'empty-state' && (
              <>
                <PreviewSetting
                  label="Type"
                  options={['Empty', 'No results', 'Error']}
                  value={state}
                  onChange={setState}
                />
                <PreviewOptions
                  items={[{ label: 'Action', checked: action, onChange: setAction }]}
                />
              </>
            )}
          </div>
          <CustomizationScope id={pattern}><div className="pattern-canvas">
            <WorkflowPreview
              key={pattern}
              pattern={pattern}
              multiple={multiple}
              helper={helper}
              secondary={secondary}
              extended={extended}
              orientation={orientation as 'Horizontal' | 'Vertical'}
              showStepCount={showStepCount}
              side={side as 'Left' | 'Right'}
              description={description}
              footer={footer}
              state={state}
              action={action}
            />
          </div></CustomizationScope>
        </section>
      </div>
    </main>
  )
}

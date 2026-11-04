'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions } from './PreviewControls'
import { Dialog, List, Tabs } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './TabsLibrary.css'

function Setting({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <fieldset className="button-control-group">
      <legend>{label}</legend>
      <div className="button-mini-switch">
        {options.map((option) => (
          <label key={option}>
            <input
              type="radio"
              name={`tabs-${label}`}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
const examples = [
  {
    value: 'overview',
    label: 'Overview',
    noun: 'milestones',
    path: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    items: [
      { id: 'scope', label: 'Scope approved', description: 'Goals and ownership are agreed.' },
      { id: 'design', label: 'Design review', description: 'Review the direction with the team.' },
      {
        id: 'handoff',
        label: 'Ready for handoff',
        description: 'Confirm the implementation checklist.',
      },
    ],
  },
  {
    value: 'activity',
    label: 'Activity',
    noun: 'updates',
    path: 'M3 12h4l3-8 4 16 3-8h4',
    items: [
      {
        id: 'alex',
        label: 'Alex updated the project brief',
        description: 'Today · Goals and ownership',
      },
      {
        id: 'samira',
        label: 'Samira added review notes',
        description: 'Yesterday · Design direction',
      },
    ],
  },
  {
    value: 'files',
    label: 'Files',
    noun: 'files',
    path: 'M4 4h6l2 3h8v13H4z',
    items: [
      {
        id: 'brief',
        label: 'Project brief',
        description: 'Alex Morgan · Goals, scope, and ownership',
      },
      {
        id: 'checklist',
        label: 'Launch checklist',
        description: 'Samira Chen · Review and handoff steps',
      },
    ],
  },
]
export function TabsLibrary() {
  const [type, setType] = useState('Underline')
  const [size, setSize] = useState('Medium')
  const [icons, setIcons] = useState(false)
  const [badge, setBadge] = useState('None')
  const [state, setState] = useState('Default')
  const [value, setValue] = useState('overview')
  const [file, setFile] = useState<string | null>(null)
  return (
    <main
      id="content"
      className="gallery-study component-library button-library tabs-library"
      data-area="components"
    >
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current="tabs" />
      <div className="component-document">
        <header className="component-document-heading">
          <h1>Tabs</h1>
          <LibraryActions id="tabs" />
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="button-preview-controls">
            <div className="button-kind-control">
              <Setting
                label="Type"
                options={['Underline', 'Pills']}
                value={type}
                onChange={setType}
              />
            </div>
            <div className="button-other-controls">
              <Setting
                label="Size"
                options={['Small', 'Medium', 'Large']}
                value={size}
                onChange={setSize}
              />
              <PreviewOptions label="Icon" items={[{ label: 'Leading', checked: icons, onChange: setIcons }]} />
              <Setting
                label="Badge"
                options={['None', 'Indicator', 'Count']}
                value={badge}
                onChange={setBadge}
              />
              <Setting
                label="State"
                options={['Default', 'Disabled']}
                value={state}
                onChange={setState}
              />
            </div>
          </div>
          <CustomizationScope id="tabs"><section className="tabs-example" aria-label="Tabs preview">
            <Tabs
              label="Project"
              value={value}
              onValueChange={setValue}
              variant={type === 'Pills' ? 'pill' : 'underline'}
              size={size.toLowerCase() as 'small' | 'medium' | 'large'}
              disabled={state === 'Disabled'}
              items={examples.map((item) => ({
                value: item.value,
                label: item.label,
                icon: icons ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.path} />
                  </svg>
                ) : undefined,
                badge:
                  badge === 'None'
                    ? undefined
                    : {
                        variant: badge === 'Count' ? 'count' : 'dot',
                        count: item.items.length,
                        label: badge === 'Count' ? item.noun : `New ${item.noun}`,
                      },
                content: (
                  <List
                    label={
                      item.value === 'overview'
                        ? 'Project milestones'
                        : item.value === 'activity'
                          ? 'Project activity'
                          : 'Project files'
                    }
                    divided
                    items={item.items.map((entry) => ({
                      ...entry,
                      onSelect: item.value === 'files' ? () => setFile(entry.label) : undefined,
                    }))}
                  />
                ),
              }))}
            />
            <Dialog
              open={file !== null}
              onOpenChange={(open) => {
                if (!open) setFile(null)
              }}
              title={file ?? 'Project file'}
              size="small"
            >
              <List
                label="File contents"
                items={
                  file === 'Project brief'
                    ? [
                        {
                          id: 'goal',
                          label: 'Goal',
                          description: 'Help the team plan and review the website launch.',
                        },
                        { id: 'owner', label: 'Owner', description: 'Alex Morgan' },
                      ]
                    : [
                        {
                          id: 'review',
                          label: 'Design review',
                          description: 'Confirm scope, content, and accessibility.',
                        },
                        {
                          id: 'handoff',
                          label: 'Handoff',
                          description: 'Agree ownership and the next milestone.',
                        },
                      ]
                }
              />
            </Dialog>
          </section></CustomizationScope>
        </div>
      </div>
    </main>
  )
}

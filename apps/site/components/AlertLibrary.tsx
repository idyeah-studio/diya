'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useRef, useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { Alert, Dialog, List, type AlertTone } from '@idyeah/diya'
import { Toast } from '@idyeah/diya'
import { PreviewOptions, PreviewSetting } from './PreviewControls'
import { Badge } from '@idyeah/diya'
import { Button } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './BadgeLibrary.css'
import './CollectionAtoms.css'

const examples = {
  brand: {
    title: 'Your workspace is ready',
    description: 'Everything is in place for your next project.',
    action: 'Open workspace',
  },
  info: {
    title: 'A new version is available',
    description: 'Update when you’re ready to get the latest improvements.',
    action: 'View updates',
  },
  success: {
    title: 'Changes saved',
    description: 'Your project is up to date and ready to share.',
    action: 'View project',
  },
  warning: {
    title: 'You have unsaved changes',
    description: 'Save your work before leaving this page.',
    action: 'Save changes',
  },
  error: {
    title: 'Project brief unavailable',
    description: 'The sample file could not be loaded. Try again to review the brief.',
    action: 'Try again',
  },
}
export function AlertLibrary() {
  const [kind, setKind] = useState('Alert')
  const [toast, setToast] = useState(0)
  const [tone, setTone] = useState<AlertTone>('info')
  const [title, setTitle] = useState(true)
  const [action, setAction] = useState(false)
  const [dismiss, setDismiss] = useState(false)
  const [visible, setVisible] = useState(true)
  const [message, setMessage] = useState('')
  const restore = useRef<HTMLSpanElement>(null)
  const [detail, setDetail] = useState<'workspace' | 'updates' | 'project' | 'brief' | null>(null)
  const [resolution, setResolution] = useState<'saved' | 'brief' | null>(null)
  const example =
    resolution === 'brief'
      ? {
          title: 'Project brief ready',
          description: 'The sample brief is available to review.',
          action: 'View brief',
        }
      : examples[tone]
  function selectTone(next: AlertTone) {
    setTone(next)
    setResolution(null)
    setVisible(true)
    setMessage('')
  }
  function act() {
    if (tone === 'warning') {
      setTone('success')
      setResolution('saved')
      setMessage('Sample project changes saved locally.')
    } else if (tone === 'error') {
      setTone('success')
      setResolution('brief')
      setDetail('brief')
      setMessage('Sample project brief loaded.')
    } else
      setDetail(
        resolution === 'brief'
          ? 'brief'
          : tone === 'brand'
            ? 'workspace'
            : tone === 'info'
              ? 'updates'
              : 'project'
      )
    setToast(0)
  }
  const detailTitles = {
    workspace: 'Veylo workspace',
    updates: 'What’s new',
    project: 'Website launch',
    brief: 'Project brief',
  }
  const detailItems =
    detail === 'updates'
      ? [
          {
            id: 'navigation',
            label: 'Clearer navigation',
            description: 'Project, activity, and people views share one workspace.',
          },
          {
            id: 'preferences',
            label: 'Display preferences',
            description: 'Owners and summaries can be adjusted in the account menu.',
          },
        ]
      : detail === 'brief'
        ? [
            {
              id: 'goal',
              label: 'Goal',
              description: 'Help the team plan and review the next website launch.',
            },
            { id: 'owner', label: 'Owner', description: 'Alex Morgan' },
            {
              id: 'next',
              label: 'Next milestone',
              description: 'Review the design direction with the team.',
            },
          ]
        : detail === 'workspace'
          ? [
              { id: 'nuvio', label: 'Nuvio', description: 'In progress · Alex Morgan' },
              { id: 'avyra', label: 'Avyra', description: 'In review · Samira Chen' },
              { id: 'kelmio', label: 'Kelmio', description: 'Ready · Eli Brooks' },
            ]
          : [
              { id: 'owner', label: 'Owner', description: 'Alex Morgan' },
              {
                id: 'state',
                label: 'Changes',
                description:
                  resolution === 'saved'
                    ? 'Saved in this local preview.'
                    : 'Project details are up to date.',
              },
              {
                id: 'next',
                label: 'Next milestone',
                description: 'Review the launch checklist with the team.',
              },
            ]

  return (
    <main
      id="content"
      className="gallery-study component-library button-library"
      data-area="components"
    >
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current="alert" />
      <div className="component-document">
        <header className="component-document-heading">
          <LibraryActions id="alert" />
          <h2>Alert</h2>
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="input-preview-controls">
            <PreviewSetting
              label="Type"
              options={['Alert', 'Toast']}
              value={kind}
              divided
              onChange={(value) => {
                setKind(value)
                setToast(0)
                setVisible(true)
                setMessage('')
              }}
            />
            <fieldset className="button-control-group">
              <legend>Status</legend>
              <div className="badge-color-options">
                {(['info', 'success', 'warning', 'error', 'brand'] as const).map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="alert-status"
                      checked={tone === value}
                      onChange={() => {
                        selectTone(value)
                      }}
                    />
                    <span className="badge-color-swatch">
                      <span aria-hidden="true">
                        <Badge variant="dot" tone={value} label={value} />
                      </span>
                      <span>{value[0].toUpperCase() + value.slice(1)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <PreviewOptions
              items={[
                { label: 'Title', checked: title, onChange: setTitle },
                { label: 'Action', checked: action, onChange: setAction },
                { label: 'Dismiss', checked: dismiss, onChange: setDismiss },
              ].map((option) => ({
                ...option,
                onChange: (checked: boolean) => {
                  option.onChange(checked)
                  setVisible(true)
                },
              }))}
            />
          </div>
          <CustomizationScope id="alert"><section className="collection-example" aria-label="Alert preview">
            <div className="collection-example-stack">
              {kind === 'Toast' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setToast(Date.now())
                    setMessage('')
                  }}
                >
                  Show toast
                </Button>
              ) : visible ? (
                <Alert
                  tone={tone}
                  title={title ? example.title : undefined}
                  action={action ? { label: example.action, onClick: act } : undefined}
                  onDismiss={
                    dismiss
                      ? () => {
                          setVisible(false)
                          setMessage('Alert dismissed.')
                          requestAnimationFrame(() =>
                            restore.current?.querySelector('button')?.focus()
                          )
                        }
                      : undefined
                  }
                >
                  {example.description}
                </Alert>
              ) : (
                <span ref={restore}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setVisible(true)
                      setMessage('')
                    }}
                  >
                    Show alert
                  </Button>
                </span>
              )}
              {kind === 'Toast' && toast > 0 && (
                <Toast
                  key={toast}
                  tone={tone}
                  title={title ? example.title : undefined}
                  showClose={dismiss}
                  onDismiss={() => setToast(0)}
                  action={action ? { label: example.action, onClick: act } : undefined}
                >
                  {example.description}
                </Toast>
              )}
              <Dialog
                open={detail !== null}
                onOpenChange={(open) => {
                  if (!open) setDetail(null)
                }}
                title={detail ? detailTitles[detail] : 'Details'}
                size="small"
              >
                <List
                  label={detail ? detailTitles[detail] : 'Details'}
                  items={detailItems}
                  divided
                />
              </Dialog>
              <p className="collection-preview-status" role="status">
                {message}
              </p>
            </div>
          </section></CustomizationScope>
        </div>
      </div>
    </main>
  )
}

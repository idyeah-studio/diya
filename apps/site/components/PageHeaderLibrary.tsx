'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useEffect, useId, useRef, useState } from 'react'
import { PatternSidebar } from './PatternSidebar'
import { PageHeader } from '@idyeah/diya'
import { Button } from '@idyeah/diya'
import { Breadcrumbs } from '@idyeah/diya'
import { Tag } from '@idyeah/diya'
import { Tabs } from '@idyeah/diya'
import { Dialog, List, TextInput } from '@idyeah/diya'
import { PreviewOptions, PreviewSetting } from './PreviewControls'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './PageHeaderLibrary.css'

const labels = [
  'Breadcrumbs',
  'Description',
  'Tags',
  'Primary action',
  'Secondary action',
  'Tabs',
] as const
type Part = (typeof labels)[number]
export function PageHeaderLibrary() {
  const [shown, setShown] = useState<Record<Part, boolean>>({
    Breadcrumbs: true,
    Description: true,
    Tags: true,
    'Primary action': true,
    'Secondary action': true,
    Tabs: true,
  })
  const [width, setWidth] = useState('Desktop')
  const [tab, setTab] = useState('Overview')
  const [following, setFollowing] = useState(false)
  const [directory, setDirectory] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  const [resource, setResource] = useState<string | null>(null)
  const previewFrame = useRef<HTMLDivElement>(null)
  const previousDirectory = useRef(directory)
  useEffect(() => {
    if (previousDirectory.current !== directory) {
      if (directory) previewFrame.current?.focus()
      else {
        const heading = previewFrame.current?.querySelector<HTMLHeadingElement>('h2, h3')
        if (heading) {
          heading.tabIndex = -1
          heading.focus()
        }
      }
    }
    previousDirectory.current = directory
  }, [directory])
  const shareId = useId()
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink)
      setShareStatus('Preview link copied.')
    } catch {
      setShareStatus('Copy unavailable. Select the preview link.')
      const input = document.getElementById(shareId) as HTMLInputElement | null
      input?.focus()
      input?.select()
    }
  }
  return (
    <main id="content" className="gallery-study component-library pattern-library">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <PatternSidebar current="page-header" />
      <div className="component-document">
        <header className="component-document-heading">
          <h1>Page Header</h1>
          <LibraryActions id="page-header" />
        </header>
        <section className="pattern-stage" aria-label="Page Header playground">
          <div className="pattern-controls">
            <PreviewOptions
              items={labels.map((label) => ({
                label,
                checked: shown[label],
                onChange: (value: boolean) => setShown({ ...shown, [label]: value }),
              }))}
            />
            <PreviewSetting
              label="Preview"
              options={['Desktop', 'Mobile']}
              value={width}
              onChange={setWidth}
            />
          </div>
          <CustomizationScope id="page-header"><div className="pattern-canvas">
            <div
              className="pattern-preview page-header-preview"
              data-width={width}
              ref={previewFrame}
              tabIndex={directory ? -1 : undefined}
              role={directory ? 'region' : undefined}
              aria-label={directory ? 'Projects directory' : undefined}
            >
              {directory ? (
                <List
                  label="Projects"
                  items={[
                    {
                      id: 'launch',
                      label: 'Website launch',
                      description: 'Alex Morgan · In progress',
                      onSelect: () => setDirectory(false),
                    },
                  ]}
                />
              ) : (
                <PageHeader
                  title="Website launch"
                  breadcrumbs={
                    shown.Breadcrumbs && (
                      <Breadcrumbs
                        items={[
                          { label: 'Projects', href: '#projects' },
                          { label: 'Website launch', href: '#launch' },
                        ]}
                        onNavigate={() => setDirectory(true)}
                      />
                    )
                  }
                  description={
                    shown.Description &&
                    'Bring the next version of your product to life. Keep the work, decisions, and people in one place.'
                  }
                  tags={
                    shown.Tags && (
                      <>
                        <Tag label="In progress" leading="dot" tone="info">
                          In progress
                        </Tag>
                        <Tag label="Design">Design</Tag>
                      </>
                    )
                  }
                  actions={
                    (shown['Primary action'] || shown['Secondary action']) && (
                      <>
                        {shown['Secondary action'] && (
                          <Button
                            variant="outline"
                            aria-pressed={following}
                            onClick={() => setFollowing(!following)}
                          >
                            {following ? 'Following' : 'Follow'}
                          </Button>
                        )}
                        {shown['Primary action'] && (
                          <Button
                            onClick={() => {
                              setShareLink(new URL('#project-launch', window.location.href).href)
                              setShareStatus('')
                              setSharing(true)
                            }}
                          >
                            Share project
                          </Button>
                        )}
                      </>
                    )
                  }
                  navigation={
                    shown.Tabs && (
                      <Tabs
                        label="Project sections"
                        value={tab}
                        onValueChange={setTab}
                        items={[
                          {
                            value: 'Overview',
                            label: 'Overview',
                            content: (
                              <List
                                label="Launch milestones"
                                divided
                                items={[
                                  {
                                    id: 'scope',
                                    label: 'Scope approved',
                                    description: 'Project goals and ownership are agreed.',
                                  },
                                  {
                                    id: 'design',
                                    label: 'Design review',
                                    description: 'The team is reviewing the first complete flow.',
                                  },
                                  {
                                    id: 'handoff',
                                    label: 'Handoff checklist',
                                    description:
                                      'Confirm assets, behavior, and acceptance criteria.',
                                  },
                                ]}
                              />
                            ),
                          },
                          {
                            value: 'Activity',
                            label: 'Activity',
                            content: (
                              <List
                                label="Project activity"
                                divided
                                items={[
                                  {
                                    id: 'brief',
                                    label: 'Alex updated the project brief',
                                    description: 'Today · Scope and success measures',
                                  },
                                  {
                                    id: 'review',
                                    label: 'Samira added review notes',
                                    description: 'Yesterday · First-run experience',
                                  },
                                ]}
                              />
                            ),
                          },
                          {
                            value: 'Files',
                            label: 'Files',
                            content: (
                              <List
                                label="Project files"
                                divided
                                items={['Project brief', 'Launch checklist'].map((name) => ({
                                  id: name,
                                  label: name,
                                  description: 'Local preview document',
                                  onSelect: () => setResource(name),
                                }))}
                              />
                            ),
                          },
                        ]}
                      />
                    )
                  }
                />
              )}
            </div>
          </div>
          <Dialog
            open={sharing}
            onOpenChange={setSharing}
            title="Share project preview"
            description="Copy this local preview link. It does not grant access to a live project."
            size="small"
          >
            <TextInput
              id={shareId}
              label="Preview link"
              value={shareLink}
              onValueChange={() => {}}
              readOnly
            />
            <Button onClick={copyLink}>Copy link</Button>
            <p role="status">{shareStatus}</p>
          </Dialog>
          <Dialog
            open={resource !== null}
            onOpenChange={(open) => {
              if (!open) setResource(null)
            }}
            title={resource ?? 'Project document'}
            size="small"
          >
            <List
              label="Document contents"
              divided
              items={
                resource === 'Launch checklist'
                  ? [
                      { id: 'review', label: 'Review all interface states' },
                      { id: 'access', label: 'Verify keyboard access' },
                      { id: 'delivery', label: 'Run the example' },
                    ]
                  : [
                      {
                        id: 'goal',
                        label: 'Goal',
                        description: 'Help the team launch a clear, usable product experience.',
                      },
                      { id: 'owner', label: 'Owner', description: 'Alex Morgan' },
                      {
                        id: 'next',
                        label: 'Next step',
                        description: 'Complete the design review and resolve feedback.',
                      },
                    ]
              }
            />
          </Dialog>
          </CustomizationScope>
        </section>
        <div className="pattern-notes">
          <span>Built with</span>
          <div>
            {['Breadcrumbs', 'Button', 'Tag', 'Tabs'].map((name) => (
              <a key={name} href={`/explore?area=components&component=${name.toLowerCase()}`}>
                {name}
              </a>
            ))}
          </div>
          <p>
            Hide a part to see the spacing adapt. On narrow screens, actions move below the title.
          </p>
        </div>
      </div>
    </main>
  )
}

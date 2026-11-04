'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useState } from 'react'
import { Dialog, List } from '@idyeah/diya'
import { PatternSidebar } from './PatternSidebar'
import { PreviewOptions } from './PreviewControls'
import { Card } from '@idyeah/diya'
import { Button } from '@idyeah/diya'
import { Tag } from '@idyeah/diya'
import { Avatar } from '@idyeah/diya'
import { Menu } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './PageHeaderLibrary.css'
const parts = [
  'Tag',
  'Description',
  'Image',
  'Content',
  'Menu',
  'Primary action',
  'Secondary action',
  'Divider',
  'Shadow',
] as const
export function CardLibrary() {
  const [options, setOptions] = useState({
    Tag: true,
    Description: true,
    Image: false,
    Content: true,
    Menu: true,
    'Primary action': true,
    'Secondary action': true,
    Divider: true,
    Shadow: false,
  })
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')
  const [copies, setCopies] = useState<string[]>([])
  const [inspected, setInspected] = useState<string | null>(null)
  return (
    <main id="content" className="gallery-study component-library pattern-library">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <PatternSidebar current="card" />
      <div className="component-document">
        <header className="component-document-heading">
          <h1>Card</h1>
          <LibraryActions id="card" />
        </header>
        <section className="pattern-stage" aria-label="Card playground">
          <div className="pattern-controls">
            <PreviewOptions
              items={parts.map((part) => ({
                label: part,
                checked: options[part],
                disabled: part === 'Divider' && !options['Primary action'] && !options['Secondary action'],
                onChange: (value: boolean) => setOptions({ ...options, [part]: value }),
              }))}
            />
          </div>
          <CustomizationScope id="card"><div className="pattern-canvas card-pattern-canvas">
            <Card
              title="Website launch"
              description={
                options.Description
                  ? 'A considered refresh, from the first impression to the final detail.'
                  : undefined
              }
              tags={
                options.Tag && (
                  <Tag label="In progress" leading="dot" tone="info">
                    In progress
                  </Tag>
                )
              }
              media={
                options.Image && (
                  <img
                    src="/images/concept-architecture.webp"
                    alt="Sculptural concrete architecture"
                  />
                )
              }
              actions={
                options.Menu && (
                  <Menu
                    label="Card actions"
                    triggerIcon={
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="19" cy="12" r="1.5" />
                      </svg>
                    }
                    items={[
                      {
                        id: 'save',
                        label: saved ? 'Remove from saved' : 'Save project',
                        onSelect: () => setSaved(!saved),
                      },
                      {
                        id: 'duplicate',
                        label: 'Duplicate project',
                        onSelect: () => {
                          setCopies((previous) => [
                            ...previous,
                            `Website launch · Copy ${previous.length + 1}`,
                          ])
                          setMessage('Project copy created locally.')
                        },
                      },
                    ]}
                  />
                )
              }
              footer={
                (options['Primary action'] || options['Secondary action']) && (
                  <>
                    {options['Primary action'] && (
                      <Button onClick={() => setInspected('Website launch')}>
                        View project
                      </Button>
                    )}
                    {options['Secondary action'] && (
                      <Button
                        variant="quiet"
                        aria-pressed={saved}
                        onClick={() => setSaved(!saved)}
                      >
                        {saved ? 'Saved' : 'Save'}
                      </Button>
                    )}
                  </>
                )
              }
              divided={options.Divider}
              shadow={options.Shadow}
            >
              {options.Content && (
                <div className="card-preview-content">
                  <Avatar name="Alex Morgan" size="small" />
                  <div>
                    <strong>Alex Morgan</strong>
                    <small>Project owner</small>
                  </div>
                </div>
              )}
            </Card>
            {copies.length > 0 && (
              <List
                label="Project copies"
                items={copies.map((name, index) => ({
                  id: String(index),
                  label: name,
                  description: 'Local copy · Alex Morgan',
                  onSelect: () => setInspected(name),
                }))}
              />
            )}
          </div></CustomizationScope>
          <p role="status" className="pattern-feedback">
            {message || (saved ? 'Project saved in this preview.' : '')}
          </p>
          <Dialog
            open={inspected !== null}
            onOpenChange={(open) => {
              if (!open) setInspected(null)
            }}
            title={inspected ?? 'Project details'}
            description="A considered refresh, from the first impression to the final detail."
            size="small"
          >
            <dl className="catalog-review-list">
              <div>
                <dt>Owner</dt>
                <dd>Alex Morgan</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>In progress</dd>
              </div>
              <div>
                <dt>Next step</dt>
                <dd>Review the launch checklist with the team.</dd>
              </div>
            </dl>
          </Dialog>
        </section>
        <div className="pattern-notes">
          <span>Built with</span>
          <div>
            {['Tag', 'Avatar', 'Button', 'Menu'].map((name) => (
              <a key={name} href={`/explore?area=components&component=${name.toLowerCase()}`}>
                {name}
              </a>
            ))}
          </div>
          <p>
            Optional sections collapse naturally. Actions stay separate so the card remains easy to
            navigate.
          </p>
        </div>
      </div>
    </main>
  )
}

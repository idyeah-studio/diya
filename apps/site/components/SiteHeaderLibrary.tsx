'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useRef, useState } from 'react'
import { PatternSidebar } from './PatternSidebar'
import {
  SiteHeader,
  Avatar,
  Button,
  Card,
  ContentState,
  Dialog,
  List,
  Menu,
  Tag,
  type MenuItem,
} from '@idyeah/diya'
import { Icon } from './Icon'
import { PreviewOptions, PreviewSetting } from './PreviewControls'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './PageHeaderLibrary.css'
import './SiteHeaderLibrary.css'
const parts = ['Navigation', 'Search', 'Notifications', 'Settings', 'Support', 'Avatar'] as const
const projects = [
  {
    id: 'nuvio',
    name: 'Nuvio',
    summary: 'A calmer workspace for planning team projects.',
    owner: 'Alex Morgan',
    status: 'In progress',
    tone: 'info',
    milestone: 'Workspace review · Oct 22',
    next: 'Review the project overview with the team.',
  },
  {
    id: 'avyra',
    name: 'Avyra',
    summary: 'A welcoming onboarding flow for new members.',
    owner: 'Samira Chen',
    status: 'In review',
    tone: 'warning',
    milestone: 'Flow review · Oct 23',
    next: 'Incorporate feedback on the signup flow.',
  },
  {
    id: 'kelmio',
    name: 'Kelmio',
    summary: 'Clear reporting for a growing product team.',
    owner: 'Eli Brooks',
    status: 'Ready',
    tone: 'success',
    milestone: 'Team walkthrough · Oct 24',
    next: 'Walk through the reporting views with the team.',
  },
] as const
type ProjectId = (typeof projects)[number]['id']
type Panel = ProjectId | 'profile' | 'search-tips' | 'about' | null
const people = [
  { id: 'alex', name: 'Alex Morgan', role: 'Product designer · Nuvio' },
  { id: 'samira', name: 'Samira Chen', role: 'Design lead · Avyra' },
  { id: 'eli', name: 'Eli Brooks', role: 'Front-end engineer · Kelmio' },
]
export function SiteHeaderLibrary() {
  const [options, setOptions] = useState({
    Navigation: true,
    Search: true,
    Notifications: true,
    Settings: true,
    Support: true,
    Avatar: true,
  })
  const [width, setWidth] = useState('Desktop')
  const [section, setSection] = useState('Projects')
  const [query, setQuery] = useState('')
  const [showSummaries, setShowSummaries] = useState(true)
  const [showOwners, setShowOwners] = useState(true)
  const [unread, setUnread] = useState(['avyra', 'kelmio'])
  const [panel, setPanel] = useState<Panel>(null)
  const preview = useRef<HTMLDivElement>(null)
  const terms = (options.Search ? query : '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  const visibleProjects = projects.filter((project) =>
    terms.every((term) =>
      `${project.name} ${project.summary} ${project.owner} ${project.status}`
        .toLowerCase()
        .includes(term)
    )
  )
  const selectedProject = projects.find((project) => project.id === panel)
  const workspaceActions: MenuItem[] = [
    ...(options.Settings
      ? [
          {
            id: 'summaries',
            type: 'checkbox' as const,
            label: 'Show project summaries',
            checked: showSummaries,
            separatorBefore: options.Avatar,
            onSelect: () => setShowSummaries((value) => !value),
          },
          {
            id: 'owners',
            type: 'checkbox' as const,
            label: 'Show project owners',
            checked: showOwners,
            onSelect: () => setShowOwners((value) => !value),
          },
        ]
      : []),
    ...(options.Support
      ? [
          {
            id: 'search-tips',
            label: 'Search tips',
            separatorBefore: options.Avatar || options.Settings,
            onSelect: () => setPanel('search-tips'),
          },
          { id: 'about', label: 'About this preview', onSelect: () => setPanel('about') },
        ]
      : []),
  ]
  function clearSearch() {
    setQuery('')
    preview.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
  }
  function openNotification(id: ProjectId) {
    setUnread((previous) => previous.filter((item) => item !== id))
    setPanel(id)
  }
  return (
    <main id="content" className="gallery-study component-library pattern-library">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <PatternSidebar current="site-header" />
      <div className="component-document">
        <header className="component-document-heading">
          <LibraryActions id="site-header" />
          <h2>Site Header</h2>
        </header>
        <section className="pattern-stage" aria-label="Site Header playground">
          <div className="pattern-controls">
            <PreviewOptions
              items={parts.map((part) => ({
                label: part,
                checked: options[part],
                onChange: (value: boolean) => setOptions({ ...options, [part]: value }),
              }))}
            />
            <PreviewSetting
              label="Preview"
              options={['Desktop', 'Mobile']}
              value={width}
              onChange={setWidth}
            />
          </div>
          <CustomizationScope id="site-header"><div className="pattern-canvas">
            <div ref={preview} className="pattern-preview site-header-preview" data-width={width}>
              <SiteHeader
                brand={
                  <>
                    <span className="catalog-brand-mark" aria-hidden="true">
                      v.
                    </span>
                    <span className="catalog-brand-name">Veylo</span>
                  </>
                }
                brandLabel="Veylo home"
                navigationLabel="Veylo navigation"
                onBrandClick={() => {
                  setSection('Projects')
                  setQuery('')
                }}
                items={
                  options.Navigation
                    ? ['Projects', 'Activity', 'People'].map((value) => ({ value, label: value }))
                    : []
                }
                value={section}
                onValueChange={(value) => {
                  setSection(value)
                }}
                search={
                  options.Search
                    ? {
                        value: query,
                        label: 'Search projects',
                        placeholder: 'Search projects',
                        onValueChange: (value) => {
                          setQuery(value)
                          if (value) setSection('Projects')
                        },
                        onSubmit: () => setSection('Projects'),
                      }
                    : undefined
                }
                utilities={
                  options.Notifications ||
                  (!options.Avatar && (options.Settings || options.Support)) ? (
                    <>
                      {options.Notifications && (
                        <Menu
                          label={`Notifications, ${unread.length} unread`}
                          triggerIcon={<Icon name="bell" size={20} />}
                          items={
                            unread.length
                              ? [
                                  ...(unread.includes('avyra')
                                    ? [
                                        {
                                          id: 'avyra-feedback',
                                          label: 'Samira shared feedback on Avyra',
                                          onSelect: () => openNotification('avyra'),
                                        },
                                      ]
                                    : []),
                                  ...(unread.includes('kelmio')
                                    ? [
                                        {
                                          id: 'kelmio-ready',
                                          label: 'Kelmio is ready for a walkthrough',
                                          onSelect: () => openNotification('kelmio'),
                                        },
                                      ]
                                    : []),
                                  {
                                    id: 'read',
                                    label: 'Mark all as read',
                                    separatorBefore: true,
                                    onSelect: () => setUnread([]),
                                  },
                                ]
                              : [
                                  {
                                    id: 'caught-up',
                                    label: 'You’re all caught up',
                                    disabled: true,
                                    onSelect: () => {},
                                  },
                                ]
                          }
                        />
                      )}
                      {!options.Avatar && (options.Settings || options.Support) && (
                        <Menu
                          label="Workspace actions"
                          triggerIcon={<Icon name="settings" size={20} />}
                          items={workspaceActions}
                        />
                      )}
                    </>
                  ) : undefined
                }
                avatar={
                  options.Avatar && (
                    <Menu
                      label="Account for Alex Morgan"
                      triggerIcon={<Avatar name="Alex Morgan" size="small" />}
                      items={[
                        {
                          id: 'profile',
                          label: 'View profile',
                          onSelect: () => setPanel('profile'),
                        },
                        ...workspaceActions,
                      ]}
                    />
                  )
                }
              />
              <section className="site-header-demo-content" aria-label={`${section} workspace`}>
                <div className="site-demo-heading">
                  <div>
                    <h3>{section}</h3>
                    <p>
                      {section === 'Projects'
                        ? 'Keep your team’s next steps in view.'
                        : section === 'Activity'
                          ? 'Recent updates from the people you work with.'
                          : 'A small team with a shared focus.'}
                    </p>
                  </div>
                  {section === 'Projects' && (
                    <span
                      className="site-demo-count"
                      role="status"
                      aria-label="Project search results"
                    >
                      {visibleProjects.length}{' '}
                      {visibleProjects.length === 1 ? 'project' : 'projects'}
                    </span>
                  )}
                </div>
                {section === 'Projects' &&
                  (visibleProjects.length ? (
                    <div className="site-demo-projects">
                      {visibleProjects.map((project) => (
                        <Card
                          key={project.id}
                          title={project.name}
                          description={showSummaries ? project.summary : undefined}
                          tags={
                            <Tag
                              label={`${project.name} status`}
                              tone={project.tone}
                              size="small"
                            >
                              {project.status}
                            </Tag>
                          }
                          footer={
                            <Button
                              variant="quiet"
                              size="small"
                              aria-label={`View ${project.name}`}
                              onClick={() => setPanel(project.id)}
                            >
                              View project
                            </Button>
                          }
                        >
                          <div className="site-demo-project-meta">
                            {showOwners && (
                              <span className="site-demo-owner">
                                <Avatar name={project.owner} size="small" />
                                <span>{project.owner}</span>
                              </span>
                            )}
                            <span>{project.milestone}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <ContentState
                      title="No matching projects"
                      description="Try another project name, owner, or keyword."
                      action={{ label: 'Clear search', onClick: clearSearch }}
                    />
                  ))}
                {section === 'Activity' && (
                  <List
                    label="Recent team activity"
                    divided
                    items={[
                      {
                        id: 'avyra-feedback',
                        label: 'Samira shared feedback on Avyra',
                        description: 'Signup flow review · 12 min ago',
                        leading: <Avatar name="Samira Chen" size="small" />,
                        onSelect: () => setPanel('avyra'),
                      },
                      {
                        id: 'kelmio-ready',
                        label: 'Eli prepared Kelmio for review',
                        description: 'Reporting views · 38 min ago',
                        leading: <Avatar name="Eli Brooks" size="small" />,
                        onSelect: () => setPanel('kelmio'),
                      },
                      {
                        id: 'nuvio-update',
                        label: 'Alex updated the Nuvio plan',
                        description: 'Workspace overview · 1 hr ago',
                        leading: <Avatar name="Alex Morgan" size="small" />,
                        onSelect: () => setPanel('nuvio'),
                      },
                    ]}
                  />
                )}
                {section === 'People' && (
                  <List
                    label="Workspace people"
                    divided
                    items={people.map((person) => ({
                      id: person.id,
                      label: person.name,
                      description: person.role,
                      leading: <Avatar name={person.name} size="small" />,
                    }))}
                  />
                )}
              </section>
              <Dialog
                open={panel !== null}
                onOpenChange={(open) => {
                  if (!open) setPanel(null)
                }}
                title={
                  selectedProject?.name ??
                  (panel === 'profile'
                    ? 'Alex Morgan'
                    : panel === 'search-tips'
                      ? 'Search tips'
                      : 'About this preview')
                }
                description={selectedProject?.summary}
                size="small"
              >
                {selectedProject ? (
                  <dl className="site-demo-details">
                    <div>
                      <dt>Status</dt>
                      <dd>{selectedProject.status}</dd>
                    </div>
                    <div>
                      <dt>Owner</dt>
                      <dd>{selectedProject.owner}</dd>
                    </div>
                    <div>
                      <dt>Milestone</dt>
                      <dd>{selectedProject.milestone}</dd>
                    </div>
                    <div>
                      <dt>Next step</dt>
                      <dd>{selectedProject.next}</dd>
                    </div>
                  </dl>
                ) : panel === 'profile' ? (
                  <dl className="site-demo-details">
                    <div>
                      <dt>Role</dt>
                      <dd>Product designer</dd>
                    </div>
                    <div>
                      <dt>Workspace</dt>
                      <dd>Veylo</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>alex@example.com</dd>
                    </div>
                  </dl>
                ) : panel === 'search-tips' ? (
                  <p className="site-demo-help">
                    Search by project name, owner, status, or a word from its summary. For example,
                    try “Samira” or “reporting”. Results update as you type. Clear the search to see
                    every project.
                  </p>
                ) : (
                  <p className="site-demo-help">
                    Veylo is a fictional team workspace. Projects, people, and updates are sample
                    records. Display preferences and notification changes stay in this preview.
                  </p>
                )}
              </Dialog>
            </div>
          </div></CustomizationScope>
        </section>
        <div className="pattern-notes">
          <span>Built with</span>
          <div>
            {['Button', 'Search', 'Avatar', 'Menu', 'Card'].map((name) => (
              <a
                key={name}
                href={
                  name === 'Card'
                    ? '/explore?pattern=card'
                    : `/explore?area=components&component=${name.toLowerCase()}`
                }
              >
                {name}
              </a>
            ))}
          </div>
          <p>
            Navigation collapses into a menu on narrow screens. Search stays accessible below the
            header.
          </p>
        </div>
      </div>
    </main>
  )
}

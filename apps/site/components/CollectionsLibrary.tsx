'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useId, useRef, useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions, PreviewSetting } from './PreviewControls'
import { List } from '@idyeah/diya'
import { Menu } from '@idyeah/diya'
import { Popover } from '@idyeah/diya'
import { Accordion } from '@idyeah/diya'
import { Avatar } from '@idyeah/diya'
import { Switch } from '@idyeah/diya'
import { Button, Dialog, Select, Table, TextInput, ContentState, type TableColumn } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './CollectionAtoms.css'

export type CollectionAtom = 'list' | 'menu' | 'popover' | 'accordion'
const titles = { list: 'List', menu: 'Menu', popover: 'Popover', accordion: 'Accordion' }
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
              name={`collection-${label}`}
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
function Glyph({ kind = 'file' }: { kind?: string }) {
  const paths: Record<string, string> = {
    file: 'M5 3h9l5 5v13H5z M14 3v6h5',
    edit: 'm4 16 12-12 4 4-12 12H4z',
    copy: 'M8 8h12v12H8z M4 16V4h12',
    link: 'm9 15 6-6 M7 13l-2 2a3 3 0 0 0 4 4l4-4 M11 9l4-4a3 3 0 0 1 4 4l-2 2',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 14h10l1-14 M10 10v7 M14 10v7',
  }
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[kind] ?? paths.file} />
    </svg>
  )
}
type Project = { id: string; name: string; status: string; updated: string }
const sampleProjects: Project[] = [
  { id: 'nuvio', name: 'Nuvio', status: 'In progress', updated: '2026-10-12' },
  { id: 'avyra', name: 'Avyra', status: 'In review', updated: '2026-10-14' },
  { id: 'kelmio', name: 'Kelmio', status: 'Ready', updated: '2026-10-13' },
]
export function CollectionsLibrary({ component }: { component: CollectionAtom }) {
  const [menuType, setMenuType] = useState('Actions')
  const [sort, setSort] = useState('Name')
  const [columns, setColumns] = useState(['Name', 'Status'])
  const [size, setSize] = useState('Medium')
  const [style, setStyle] = useState('Divided')
  const [leading, setLeading] = useState('Icon')
  const [mode, setMode] = useState('Single')
  const [placement, setPlacement] = useState('Bottom')
  const [state, setState] = useState('Default')
  const [description, setDescription] = useState(true)
  const [metadata, setMetadata] = useState(true)
  const [icons, setIcons] = useState(true)
  const [shortcuts, setShortcuts] = useState(false)
  const [destructive, setDestructive] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [compact, setCompact] = useState(false)
  const [message, setMessage] = useState('')
  const [projects, setProjects] = useState(sampleProjects)
  const [selected, setSelected] = useState('nuvio')
  const [rename, setRename] = useState('')
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [nameError, setNameError] = useState('')
  const [document, setDocument] = useState<{
    label: string
    description: string
    name: string
    meta: string
  } | null>(null)
  const sequence = useRef(0)
  const collectionStack = useRef<HTMLDivElement>(null)
  const renameId = useId()
  const activeProject = projects.find((project) => project.id === selected) ?? projects[0]
  const sortedProjects = [...projects].sort((a, b) =>
    sort === 'Status'
      ? a.status.localeCompare(b.status)
      : sort === 'Updated'
        ? b.updated.localeCompare(a.updated)
        : a.name.localeCompare(b.name)
  )
  const allColumns: TableColumn<Project>[] = [
    { key: 'Name', label: 'Name', render: (row) => row.name },
    { key: 'Status', label: 'Status', render: (row) => row.status },
    { key: 'Updated', label: 'Updated', render: (row) => row.updated },
  ]
  const visibleColumns =
    menuType === 'Multiple'
      ? allColumns.filter((column) => columns.includes(column.key))
      : allColumns
  function restoreProjects() {
    setProjects(sampleProjects)
    setSelected('nuvio')
    setMessage('Sample projects restored.')
  }
  async function copyProjectLink(id: string) {
    try {
      await navigator.clipboard.writeText(new URL(`#project-${id}`, window.location.href).href)
      setMessage('Local project link copied.')
    } catch {
      setMessage('Copy unavailable. Use the project name to find it in this preview.')
    }
  }
  function performAction(action: string) {
    if (!activeProject) return
    if (action === 'rename') {
      setRename(activeProject.name)
      setNameError('')
      setEditing(true)
    }
    if (action === 'duplicate') {
      const copy = {
        ...activeProject,
        id: `copy-${++sequence.current}`,
        name: `${activeProject.name} copy`,
      }
      setProjects((previous) => [...previous, copy])
      setSelected(copy.id)
      setMessage('Project duplicated locally.')
    }
    if (action === 'delete') setDeleting(true)
    if (action === 'link') void copyProjectLink(activeProject.id)
  }
  const title = titles[component]
  const typedSize = size.toLowerCase() as 'small' | 'medium' | 'large'
  return (
    <main
      id="content"
      className="gallery-study component-library button-library collections-library"
      data-area="components"
    >
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current={component} />
      <div className="component-document">
        <header className="component-document-heading">
          <LibraryActions id={component} />
          <h2>{title}</h2>
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="input-preview-controls">
            {component === 'list' && (
              <Setting
                label="Size"
                options={['Small', 'Medium', 'Large']}
                value={size}
                onChange={setSize}
              />
            )}
            {component === 'accordion' && (
              <Setting
                label="Style"
                options={['Plain', 'Divided']}
                value={style}
                onChange={setStyle}
              />
            )}
            {component === 'list' && (
              <>
                <Setting
                  label="Leading"
                  options={['None', 'Icon', 'Avatar']}
                  value={leading}
                  onChange={setLeading}
                />
                <PreviewOptions
                  items={[
                    { label: 'Description', checked: description, onChange: setDescription },
                    { label: 'Metadata', checked: metadata, onChange: setMetadata },
                    {
                      label: 'Divider',
                      checked: style === 'Divided',
                      onChange: (checked) => setStyle(checked ? 'Divided' : 'Plain'),
                    },
                  ]}
                />
              </>
            )}
            {component === 'menu' && (
              <PreviewSetting
                label="Type"
                options={['Actions', 'Single', 'Multiple']}
                value={menuType}
                onChange={setMenuType}
                divided
              />
            )}
            {component === 'menu' && menuType === 'Actions' && (
              <PreviewOptions
                items={[
                  { label: 'Icons', checked: icons, onChange: setIcons },
                  { label: 'Shortcuts', checked: shortcuts, onChange: setShortcuts },
                  { label: 'Destructive', checked: destructive, onChange: setDestructive },
                ]}
              />
            )}
            {component === 'popover' && (
              <Setting
                label="Position"
                options={['Top', 'Bottom']}
                value={placement}
                onChange={setPlacement}
              />
            )}
            {component === 'accordion' && (
              <Setting
                label="Expand"
                options={['Single', 'Multiple']}
                value={mode}
                onChange={setMode}
              />
            )}
            <Setting
              label="State"
              options={['Default', 'Disabled']}
              value={state}
              onChange={setState}
            />
          </div>
          <CustomizationScope id={component}><section
            className="collection-example"
            aria-label={`${title} preview`}
            onKeyDownCapture={(event) => {
              if (
                component !== 'menu' ||
                menuType !== 'Actions' ||
                !shortcuts ||
                !event.altKey ||
                !event.shiftKey
              )
                return
              const label = (
                { r: 'Rename', d: 'Duplicate', l: 'Copy link' } as Record<string, string>
              )[event.key.toLowerCase()]
              if (!label) return
              const menu = window.document.querySelector(
                '[role="menu"][aria-label="Project actions"]'
              )
              const item = Array.from(
                menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
              ).find((button) => button.dataset.label === label)
              if (item) {
                event.preventDefault()
                event.stopPropagation()
                item.click()
              }
            }}
          >
            <div className="collection-example-stack" ref={collectionStack}>
              {component === 'list' && (
                <List
                  label="Project files"
                  divided={style === 'Divided'}
                  size={typedSize}
                  items={[
                    {
                      id: 'brief',
                      label: 'Project brief',
                      description: 'The starting point for your next idea.',
                      meta: 'Today',
                      name: 'Alex Morgan',
                    },
                    {
                      id: 'research',
                      label: 'Research notes',
                      description: 'Observations worth keeping close.',
                      meta: 'Yesterday',
                      name: 'Sam Lee',
                    },
                    {
                      id: 'design',
                      label: 'Design direction',
                      description: 'A shared vision for what comes next.',
                      meta: 'Sep 22',
                      name: 'Jordan Chen',
                    },
                  ].map((item) => ({
                    ...item,
                    description: description ? item.description : undefined,
                    leading:
                      leading === 'Icon' ? (
                        <Glyph />
                      ) : leading === 'Avatar' ? (
                        <Avatar name={item.name} size="small" />
                      ) : undefined,
                    trailing: metadata ? item.meta : undefined,
                    disabled: state === 'Disabled',
                    onSelect: () => setDocument(item),
                  }))}
                />
              )}
              {component === 'menu' && (
                <>
                  {projects.length === 0 ? (
                    <ContentState
                      title="No projects left"
                      description="Restore the sample records to try another action."
                      action={{ label: 'Restore projects', onClick: restoreProjects }}
                    />
                  ) : (
                    <>
                      {menuType === 'Actions' && (
                        <Select
                          label="Project"
                          value={activeProject?.id ?? ''}
                          onValueChange={setSelected}
                          options={projects.map((project) => ({
                            value: project.id,
                            label: project.name,
                          }))}
                        />
                      )}
                      {menuType !== 'Actions' ? (
                        <Menu
                          label={menuType === 'Single' ? 'Sort by' : 'Visible columns'}
                          disabled={state === 'Disabled'}
                          items={['Name', 'Status', 'Updated'].map((item) => ({
                            id: item,
                            label: item,
                            type: menuType === 'Single' ? 'radio' : 'checkbox',
                            checked: menuType === 'Single' ? sort === item : columns.includes(item),
                            disabled:
                              menuType === 'Multiple' &&
                              columns.length === 1 &&
                              columns.includes(item),
                            onSelect: () => {
                              if (menuType === 'Single') setSort(item)
                              else
                                setColumns((previous) =>
                                  previous.includes(item)
                                    ? previous.filter((value) => value !== item)
                                    : [...previous, item]
                                )
                            },
                          }))}
                        />
                      ) : (
                        <Menu
                          label="Project actions"
                          disabled={state === 'Disabled'}
                          items={[
                            {
                              id: 'rename',
                              label: 'Rename',
                              kind: 'edit',
                              shortcut: 'Alt+Shift+R',
                            },
                            {
                              id: 'duplicate',
                              label: 'Duplicate',
                              kind: 'copy',
                              shortcut: 'Alt+Shift+D',
                            },
                            {
                              id: 'link',
                              label: 'Copy link',
                              kind: 'link',
                              shortcut: 'Alt+Shift+L',
                            },
                            { id: 'export', label: 'Export', kind: 'file', disabled: true },
                            ...(destructive
                              ? [
                                  {
                                    id: 'delete',
                                    label: 'Delete project',
                                    kind: 'trash',
                                    destructive: true,
                                    separatorBefore: true,
                                  },
                                ]
                              : []),
                          ].map((item) => ({
                            ...item,
                            icon: icons ? <Glyph kind={item.kind} /> : undefined,
                            shortcut: shortcuts && 'shortcut' in item ? item.shortcut : undefined,
                            onSelect: () => performAction(item.id),
                          }))}
                        />
                      )}
                      <Table
                        label="Sample projects"
                        rows={sortedProjects}
                        columns={visibleColumns}
                        rowLabel={(row) => row.name}
                        pagination={false}
                      />
                    </>
                  )}
                </>
              )}
              {component === 'popover' && (
                <>
                  <Popover
                    label="Display preferences"
                    placement={placement === 'Top' ? 'top' : 'bottom'}
                    disabled={state === 'Disabled'}
                  >
                    {(close) => (
                      <div className="collection-popover-content">
                        <h3 className="collection-popover-title">Display preferences</h3>
                        <Switch
                          label="Notifications"
                          checked={notifications}
                          onCheckedChange={setNotifications}
                          size="small"
                        />
                        <Switch
                          label="Compact view"
                          checked={compact}
                          onCheckedChange={setCompact}
                          size="small"
                        />
                        <Button
                          size="small"
                          onClick={() => {
                            setMessage('Display preferences updated locally.')
                            close()
                          }}
                        >
                          Done
                        </Button>
                      </div>
                    )}
                  </Popover>
                  <List
                    label="Notification preferences"
                    size={compact ? 'small' : 'medium'}
                    divided
                    items={[
                      {
                        id: 'updates',
                        label: 'Project updates',
                        description: notifications
                          ? 'Notification summaries are on.'
                          : 'Notification summaries are off.',
                      },
                      {
                        id: 'layout',
                        label: 'Display density',
                        description: compact ? 'Compact rows' : 'Comfortable rows',
                      },
                    ]}
                  />
                </>
              )}
              {component === 'accordion' && (
                <Accordion
                  multiple={mode === 'Multiple'}
                  divided={style === 'Divided'}
                  disabled={state === 'Disabled'}
                  items={[
                    {
                      id: 'included',
                      label: 'What’s included?',
                      content:
                        'Reusable components, thoughtful defaults, and the details that make an interface feel complete.',
                    },
                    {
                      id: 'customize',
                      label: 'Can I make it my own?',
                      content: 'Adjust the tokens, spacing, and content to fit your product.',
                    },
                    {
                      id: 'theme',
                      label: 'Does it support both themes?',
                      content:
                        'Light and dark are built in, with glass as an optional surface treatment.',
                    },
                  ]}
                />
              )}
              <Dialog
                open={document !== null}
                onOpenChange={(open) => {
                  if (!open) setDocument(null)
                }}
                title={document?.label ?? 'File details'}
                description={document?.description}
                size="small"
              >
                {document && (
                  <dl className="catalog-review-list">
                    <div>
                      <dt>Owner</dt>
                      <dd>{document.name}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{document.meta}</dd>
                    </div>
                    <div>
                      <dt>Next step</dt>
                      <dd>Review the document with your project team.</dd>
                    </div>
                  </dl>
                )}
              </Dialog>
              <Dialog
                open={editing}
                onOpenChange={setEditing}
                title="Rename project"
                confirmLabel="Save name"
                onConfirm={() => {
                  const next = rename.trim()
                  if (!next) {
                    setNameError('Enter a project name.')
                    window.document.getElementById(renameId)?.focus()
                    return false
                  }
                  if (
                    projects.some(
                      (project) =>
                        project.id !== activeProject?.id &&
                        project.name.toLowerCase() === next.toLowerCase()
                    )
                  ) {
                    setNameError('Use a different project name.')
                    window.document.getElementById(renameId)?.focus()
                    return false
                  }
                  setProjects((previous) =>
                    previous.map((project) =>
                      project.id === activeProject?.id ? { ...project, name: next } : project
                    )
                  )
                  setMessage('Project renamed locally.')
                }}
              >
                <TextInput
                  id={renameId}
                  label="Project name"
                  value={rename}
                  onValueChange={(value) => {
                    setRename(value)
                    setNameError('')
                  }}
                  error={nameError || undefined}
                  required
                  maxLength={80}
                />
              </Dialog>
              <Dialog
                open={deleting}
                onOpenChange={setDeleting}
                title={`Delete ${activeProject?.name ?? 'project'}?`}
                description="This removes only the local sample record."
                confirmLabel="Delete project"
                onConfirm={() => {
                  const remaining = projects.filter((project) => project.id !== activeProject?.id)
                  setProjects(remaining)
                  setSelected(remaining[0]?.id ?? '')
                  setMessage('Sample project deleted.')
                  if (!remaining.length)
                    requestAnimationFrame(() =>
                      collectionStack.current?.querySelector<HTMLButtonElement>('button')?.focus()
                    )
                }}
              />
              {['list', 'menu', 'popover'].includes(component) && (
                <p className="collection-preview-status" role="status">
                  {message}
                </p>
              )}
            </div>
          </section></CustomizationScope>
        </div>
      </div>
    </main>
  )
}

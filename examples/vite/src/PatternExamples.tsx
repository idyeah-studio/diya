import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import {
  Avatar,
  Breadcrumbs,
  Button,
  Card,
  Chatbot,
  Combobox,
  ContentState,
  DatePicker,
  Dialog,
  Drawer,
  FileUpload,
  Form,
  List,
  Menu,
  Metric,
  PageHeader,
  Search,
  Select,
  SideNavigation,
  Switch,
  Table,
  Tabs,
  Tag,
  TextArea,
  TextInput,
  type ChatMessage,
  type TableColumn,
} from '@idyeah/diya'
import { Wizard } from '@idyeah/diya'
import SiteHeaderWorkspace from './SiteHeaderWorkspace'
import { initialProjects, priorityOptions, teamOptions, type PatternId, type Project } from './data'
import { Glyph, Result } from './shared'

const DataVizExample = lazy(() => import('./DataVizExample'))

export function PatternExamples({ id }: { id: PatternId }) {
  switch (id) {
    case 'page-header':
      return <PageHeaderExample />
    case 'site-header':
      return <SiteHeaderWorkspace />
    case 'card':
      return <CardExample />
    case 'dialog':
      return <DialogExample />
    case 'table':
      return <TableExample />
    case 'file-upload':
      return <FileUploadExample />
    case 'form':
      return <FormExample />
    case 'wizard':
      return <WizardExample />
    case 'drawer':
      return <DrawerExample />
    case 'empty-state':
      return <ContentStateExample />
    case 'side-navigation':
      return <SideNavigationExample />
    case 'chatbot':
      return <ChatbotExample />
    case 'data-viz':
      return (
        <Suspense fallback={<p role="status">Loading chart example…</p>}>
          <DataVizExample />
        </Suspense>
      )
  }
}

function PageHeaderExample() {
  const [following, setFollowing] = useState(false)
  const [page, setPage] = useState<'projects' | 'project'>('project')
  const pageFrame = useRef<HTMLDivElement>(null)
  const previousPage = useRef(page)
  useEffect(() => {
    if (previousPage.current !== page) {
      const heading = pageFrame.current?.querySelector<HTMLHeadingElement>('h2, h3')
      if (heading) {
        heading.tabIndex = -1
        heading.focus()
      }
    }
    previousPage.current = page
  }, [page])
  const [tab, setTab] = useState('overview')
  const [taskCount, setTaskCount] = useState(12)
  const [parts, setParts] = useState({
    Breadcrumbs: true,
    Description: true,
    Tags: true,
    Actions: true,
    Tabs: true,
  })
  return (
    <div className="example-stack">
      <div className="demo-controls">
        {Object.entries(parts).map(([label, checked]) => (
          <label key={label}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setParts({ ...parts, [label]: event.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
      <div ref={pageFrame}>
        {page === 'projects' ? (
          <section aria-label="Projects directory">
            <h3>Projects</h3>
            <List
              label="Projects"
              items={[
                {
                  id: 'launch',
                  label: 'Website launch',
                  description: 'Morgan Lee · In progress',
                  onSelect: () => setPage('project'),
                },
              ]}
            />
          </section>
        ) : (
          <PageHeader
            title="Website launch"
            headingLevel={2}
            breadcrumbs={
              parts.Breadcrumbs && (
                <Breadcrumbs
                  items={[
                    { label: 'Projects', href: '#project' },
                    { label: 'Website launch', href: '#launch' },
                  ]}
                  onNavigate={() => setPage('projects')}
                />
              )
            }
            description={parts.Description && 'Keep the work, decisions and people in one place.'}
            tags={
              parts.Tags && (
                <>
                  <Tag label="In progress" tone="info" leading="dot">
                    In progress
                  </Tag>
                  <Tag label="Design">Design</Tag>
                </>
              )
            }
            actions={
              parts.Actions && (
                <>
                  <Button
                    variant="outline"
                    shape="pill"
                    aria-pressed={following}
                    onClick={() => setFollowing((value) => !value)}
                  >
                    {following ? 'Following' : 'Follow'}
                  </Button>
                  <Button shape="pill" onClick={() => setTaskCount((value) => value + 1)}>
                    <Glyph />
                    Add task
                  </Button>
                </>
              )
            }
            navigation={
              parts.Tabs && (
                <Tabs
                  label="Project sections"
                  value={tab}
                  onValueChange={setTab}
                  items={[
                    {
                      value: 'overview',
                      label: 'Overview',
                      content: <p>{taskCount} tasks in the current project.</p>,
                    },
                    {
                      value: 'activity',
                      label: 'Activity',
                      content: (
                        <p>
                          {following
                            ? 'You are following this project.'
                            : 'You are not following this project.'}
                        </p>
                      ),
                    },
                    {
                      value: 'files',
                      label: 'Files',
                      content: <p>No files have been attached to this example.</p>,
                    },
                  ]}
                />
              )
            }
          />
        )}
      </div>
      <Result>
        {taskCount} tasks · {following ? 'Following' : 'Not following'}
      </Result>
    </div>
  )
}

function CardExample() {
  const detailsId = useId()
  const [saved, setSaved] = useState(false)
  const [details, setDetails] = useState(false)
  const [shadow, setShadow] = useState(false)
  return (
    <div className="example-stack">
      <Switch label="Shadow" checked={shadow} onCheckedChange={setShadow} />
      <div className="example-centered">
        <Card
          title="Website launch"
          description="A considered refresh, from first impression to final detail."
          shadow={shadow}
          tags={
            <Tag label="In progress" tone="info" leading="dot">
              In progress
            </Tag>
          }
          actions={
            <Menu
              label="Card actions"
              items={[
                {
                  id: 'save',
                  label: saved ? 'Remove from saved' : 'Save project',
                  onSelect: () => setSaved((value) => !value),
                },
                {
                  id: 'details',
                  label: details ? 'Hide details' : 'Show details',
                  onSelect: () => setDetails((value) => !value),
                },
              ]}
            />
          }
          footer={
            <>
              <Button
                shape="pill"
                aria-expanded={details}
                aria-controls={detailsId}
                onClick={() => setDetails((value) => !value)}
              >
                {details ? 'Hide details' : 'View details'}
              </Button>
              <Button
                variant="quiet"
                shape="pill"
                aria-pressed={saved}
                onClick={() => setSaved((value) => !value)}
              >
                {saved ? 'Saved' : 'Save'}
              </Button>
            </>
          }
          divided
        >
          <div className="example-row">
            <Avatar name="Morgan Lee" size="small" />
            <span>Morgan Lee · Project owner</span>
          </div>
          <p id={detailsId} hidden={!details}>
            12 tasks · Due October 23 · Product design
          </p>
        </Card>
      </div>
      <Result>{saved ? 'Project is saved in this example.' : 'Project is not saved.'}</Result>
    </div>
  )
}

function DialogExample() {
  const id = useId()
  const [saved, setSaved] = useState('Website launch')
  const [draft, setDraft] = useState(saved)
  const [error, setError] = useState('')
  const [teams, setTeams] = useState<string[]>([])
  const [savedTeams, setSavedTeams] = useState<string[]>([])
  const [due, setDue] = useState('')
  const [savedDue, setSavedDue] = useState('')
  return (
    <div className="example-stack example-narrow">
      <p>
        Current project name: <strong>{saved}</strong>
      </p>
      <Dialog
        trigger={<Button variant="outline">Edit project name</Button>}
        title="Edit project"
        description="Update the details held by this example."
        confirmLabel="Save changes"
        onDismiss={() => {
          setDraft(saved)
          setTeams(savedTeams)
          setDue(savedDue)
          setError('')
        }}
        onConfirm={() => {
          if (!draft.trim()) {
            setError('Enter a project name.')
            document.getElementById(`${id}-name`)?.focus()
            return false
          }
          setSaved(draft.trim())
          setSavedTeams([...teams])
          setSavedDue(due)
          setError('')
          return true
        }}
      >
        <TextInput
          id={`${id}-name`}
          label="Project name"
          value={draft}
          onValueChange={(value) => {
            setDraft(value)
            setError('')
          }}
          error={error}
          required
        />
        <Combobox
          label="Team"
          options={teamOptions}
          multiple
          value={teams}
          onValueChange={setTeams}
        />
        <DatePicker label="Due date" value={due} onValueChange={setDue} />
      </Dialog>
      <Result>
        Saved name: {saved} · Team: {savedTeams.join(', ') || 'Unassigned'} · Due:{' '}
        {savedDue || 'Not set'}
      </Result>
    </div>
  )
}

function TableExample() {
  const [rows, setRows] = useState<Project[]>(initialProjects.map((project) => ({ ...project })))
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [sticky, setSticky] = useState(false)
  const [inspected, setInspected] = useState<Project | null>(null)
  const inspectedSurface = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (inspected) inspectedSurface.current?.focus()
  }, [inspected])
  const columns: TableColumn<Project>[] = [
    {
      key: 'name',
      label: 'Project',
      width: sticky ? 240 : undefined,
      render: (row) => row.name,
      sortValue: (row) => row.name,
    },
    {
      key: 'owner',
      label: 'Owner',
      width: sticky ? 180 : undefined,
      render: (row) => row.owner,
      sortValue: (row) => row.owner,
    },
    {
      key: 'status',
      label: 'Status',
      width: sticky ? 180 : undefined,
      render: (row) => (
        <Tag
          label={row.status}
          tone={
            row.status === 'Complete' ? 'success' : row.status === 'In review' ? 'warning' : 'info'
          }
        >
          {row.status}
        </Tag>
      ),
      sortValue: (row) => row.status,
    },
    {
      key: 'tasks',
      label: 'Tasks',
      width: sticky ? 100 : undefined,
      render: (row) => row.tasks,
      sortValue: (row) => row.tasks,
      numeric: true,
    },
  ]
  if (sticky)
    columns.push(
      {
        key: 'id',
        label: 'Project ID',
        width: 160,
        render: (row) => row.id,
        sortValue: (row) => row.id,
      },
      {
        key: 'summary',
        label: 'Details',
        width: 360,
        render: (row) => `${row.name} · ${row.tasks} tasks · ${row.owner}`,
      }
    )
  return (
    <div className="example-stack">
      <div className="demo-controls">
        <Switch label="Loading state" checked={loading} onCheckedChange={setLoading} />
        <Switch label="Sticky columns" checked={sticky} onCheckedChange={setSticky} />
        <Button
          variant="quiet"
          shape="pill"
          onClick={() => {
            setRows(initialProjects.map((project) => ({ ...project })))
            setSelected([])
            setInspected(null)
          }}
        >
          Restore projects
        </Button>
      </div>
      <Table
        label="Projects"
        rows={rows}
        columns={columns}
        sticky={sticky}
        defaultPageSize={5}
        rowLabel={(row) => row.name}
        searchText={(row) => `${row.name} ${row.owner}`}
        filterOptions={[
          {
            key: 'status',
            label: 'Status',
            options: ['In progress', 'In review', 'Complete'],
            getValue: (row) => row.status,
          },
        ]}
        selectedIds={selected}
        onSelectionChange={setSelected}
        loading={loading}
        loadingLabel="Example loading state"
        bulkActions={[
          {
            label: 'Archive',
            destructive: true,
            onAction: (ids) => {
              setRows((items) => items.filter((row) => !ids.includes(row.id)))
              setSelected((items) => items.filter((id) => !ids.includes(id)))
              setInspected(null)
            },
          },
        ]}
        onRowOpen={(row) => setInspected({ ...row })}
      />
      {inspected && (
        <div
          className="example-detail"
          ref={inspectedSurface}
          tabIndex={-1}
          role="region"
          aria-label="Project details"
        >
          <h3>{inspected.name}</h3>
          <p>
            {inspected.owner} · {inspected.status} · {inspected.tasks} tasks
          </p>
        </div>
      )}
      <Result>
        {rows.length} projects · {selected.length} selected
      </Result>
    </div>
  )
}

function FileUploadExample() {
  const [files, setFiles] = useState<File[]>([])
  const [multiple, setMultiple] = useState(true)
  const [disabled, setDisabled] = useState(false)
  return (
    <div className="example-stack">
      <div className="demo-controls">
        <Switch
          label="Multiple files"
          checked={multiple}
          onCheckedChange={(value) => {
            setMultiple(value)
            setFiles([])
          }}
        />
        <Switch label="Disabled" checked={disabled} onCheckedChange={setDisabled} />
      </div>
      <FileUpload
        files={files}
        onFilesChange={setFiles}
        multiple={multiple}
        disabled={disabled}
        accept=".txt,.pdf,.png,.jpg,.jpeg,.webp"
        maxBytes={10 * 1024 * 1024}
        helperText="TXT, PDF, PNG, JPG or WebP · Up to 10 MB per file. Files are selected locally; this example does not upload them."
      />
      <Result>{files.length} local files selected.</Result>
    </div>
  )
}

function FormExample() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [priority, setPriority] = useState('normal')
  const [teams, setTeams] = useState<string[]>([])
  const [due, setDue] = useState('')
  const [notes, setNotes] = useState('')
  const [updates, setUpdates] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  type CreatedProject = {
    id: string
    name: string
    owner: string
    priority: string
    teams: string[]
    due: string
    notes: string
    updates: boolean
  }
  const [records, setRecords] = useState<CreatedProject[]>([])
  const [inspected, setInspected] = useState<CreatedProject | null>(null)
  const sequence = useRef(0)
  function reset() {
    setName('')
    setEmail('')
    setPriority('normal')
    setTeams([])
    setDue('')
    setNotes('')
    setUpdates(true)
    setSubmitted(false)
  }
  const nameError = submitted && !name.trim() ? 'Enter a project name.' : undefined
  const emailError =
    submitted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? 'Enter a valid email address.'
      : undefined
  return (
    <div className="example-stack">
      <Form
        title="Create a project"
        description="Create a record in this example. No email or project service is connected."
        submitLabel="Create project"
        noValidate
        onCancel={reset}
        onSubmit={(event) => {
          setSubmitted(true)
          if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            event.currentTarget
              .querySelector<HTMLInputElement>(
                !name.trim() ? 'input[name=project-name]' : 'input[type=email]'
              )
              ?.focus()
            return
          }
          setRecords((items) => [
            ...items,
            {
              id: String(++sequence.current),
              name: name.trim(),
              owner: email.trim(),
              priority,
              teams: [...teams],
              due,
              notes,
              updates,
            },
          ])
          reset()
        }}
      >
        <TextInput
          name="project-name"
          label="Project name"
          value={name}
          onValueChange={setName}
          required
          maxLength={80}
          placeholder="e.g. Website launch"
          error={nameError}
        />
        <TextInput
          label="Owner email"
          type="email"
          value={email}
          onValueChange={setEmail}
          required
          placeholder="you@example.com"
          error={emailError}
        />
        <div className="diya-form-columns">
          <Select
            label="Priority"
            value={priority}
            onValueChange={setPriority}
            options={priorityOptions}
          />
          <DatePicker label="Due date" value={due} onValueChange={setDue} />
        </div>
        <Combobox
          label="Team"
          options={teamOptions}
          multiple
          value={teams}
          onValueChange={setTeams}
        />
        <TextArea
          label="Description"
          rows={3}
          maxLength={500}
          showCount
          value={notes}
          onValueChange={setNotes}
        />
        <Switch label="Project updates" checked={updates} onCheckedChange={setUpdates} />
      </Form>
      {records.length > 0 && (
        <List
          label="Projects created in this example"
          items={records.map((record) => ({
            id: record.id,
            label: record.name,
            description: record.owner,
            onSelect: () => setInspected(record),
          }))}
          divided
        />
      )}
      <Dialog
        open={inspected !== null}
        onOpenChange={(open) => {
          if (!open) setInspected(null)
        }}
        title={inspected?.name ?? 'Project details'}
      >
        <dl className="diya-wizard-review">
          {inspected &&
            [
              ['Owner', inspected.owner],
              [
                'Priority',
                priorityOptions.find((option) => option.value === inspected.priority)?.label ??
                  inspected.priority,
              ],
              [
                'Team',
                inspected.teams
                  .map(
                    (value) => teamOptions.find((option) => option.value === value)?.label ?? value
                  )
                  .join(', ') || 'Unassigned',
              ],
              ['Due date', inspected.due || 'Not set'],
              ['Description', inspected.notes || 'No description'],
              ['Updates', inspected.updates ? 'On' : 'Off'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      </Dialog>
      <Result>
        {records.length} {records.length === 1 ? 'project' : 'projects'} created in this example.
      </Result>
    </div>
  )
}

function WizardExample() {
  const id = useId()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [team, setTeam] = useState('')
  const [priority, setPriority] = useState('normal')
  const [error, setError] = useState(false)
  const [created, setCreated] = useState<{
    name: string
    owner: string
    team: string
    priority: string
  } | null>(null)
  const [vertical, setVertical] = useState(false)
  const completion = useRef<HTMLDivElement>(null)
  const previousCreated = useRef(created)
  useEffect(() => {
    if (created) {
      const heading = completion.current?.querySelector<HTMLHeadingElement>('h3')
      if (heading) {
        heading.tabIndex = -1
        heading.focus()
      }
    } else if (previousCreated.current) document.getElementById(`${id}-name`)?.focus()
    previousCreated.current = created
  }, [created, id])
  function validate() {
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(true)
      document.getElementById(`${id}-${!name.trim() ? 'name' : 'email'}`)?.focus()
      return false
    }
    setError(false)
    return true
  }
  function reset() {
    setCreated(null)
    setStep(0)
    setName('')
    setEmail('')
    setTeam('')
    setPriority('normal')
    setError(false)
  }
  if (created)
    return (
      <div ref={completion}>
        <ContentState
          title="Project created in this example"
          description={`${created.name} · ${created.owner}`}
          icon={<Glyph kind="check" />}
          action={{ label: 'Create another', onClick: reset }}
        />
        <dl className="diya-wizard-review">
          {[
            ['Team', teamLabel(created.team)],
            [
              'Priority',
              priorityOptions.find((option) => option.value === created.priority)?.label ??
                created.priority,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    )
  return (
    <div className="example-stack">
      <Switch label="Vertical layout" checked={vertical} onCheckedChange={setVertical} />
      <Wizard
        orientation={vertical ? 'vertical' : 'horizontal'}
        activeStep={step}
        onStepChange={(next) => {
          if (next > step && step === 0 && !validate()) return
          setStep(next)
          setError(false)
        }}
        onComplete={() => {
          if (validate())
            setCreated({ name: name.trim(), owner: email.trim(), team, priority })
        }}
        completeLabel="Create project"
        steps={[
          {
            id: 'details',
            label: 'Details',
            title: 'Project details',
            description: 'Choose a name and an owner.',
            content: (
              <>
                <TextInput
                  id={`${id}-name`}
                  label="Project name"
                  value={name}
                  onValueChange={setName}
                  required
                  error={error && !name.trim() ? 'Enter a project name.' : undefined}
                />
                <TextInput
                  id={`${id}-email`}
                  label="Owner email"
                  type="email"
                  value={email}
                  onValueChange={setEmail}
                  required
                  error={
                    error && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                      ? 'Enter a valid email address.'
                      : undefined
                  }
                />
              </>
            ),
          },
          {
            id: 'team',
            label: 'Team',
            title: 'Choose your team',
            content: (
              <>
                <Combobox
                  label="Team"
                  options={teamOptions}
                  value={team}
                  onValueChange={setTeam}
                />
                <Select
                  label="Priority"
                  value={priority}
                  onValueChange={setPriority}
                  options={priorityOptions}
                />
              </>
            ),
          },
          {
            id: 'review',
            label: 'Review',
            title: 'Review your project',
            content: (
              <dl className="diya-wizard-review">
                {[
                  ['Project', name],
                  ['Owner', email],
                  ['Team', teamLabel(team)],
                  [
                    'Priority',
                    priorityOptions.find((option) => option.value === priority)?.label ?? priority,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            ),
          },
        ]}
      />
      <Result>Step {step + 1} of 3. Entries remain when you go back.</Result>
    </div>
  )
}

function teamLabel(value: string) {
  return teamOptions.find((option) => option.value === value)?.label ?? 'Unassigned'
}

function DrawerExample() {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState('Review the final page before launch.')
  const [draft, setDraft] = useState(saved)
  return (
    <div className="example-stack example-narrow">
      <Card
        title="Website launch"
        description="Project details and a note held in this example."
        footer={
          <Button
            shape="pill"
            onClick={() => {
              setDraft(saved)
              setOpen(true)
            }}
          >
            Open drawer
          </Button>
        }
      >
        <p>{saved}</p>
      </Card>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Project details"
        description="Edit the note without leaving the current example."
        footer={
          <>
            <Button
              variant="quiet"
              shape="pill"
              onClick={() => {
                setDraft(saved)
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              shape="pill"
              onClick={() => {
                setSaved(draft)
                setOpen(false)
              }}
            >
              Save note
            </Button>
          </>
        }
      >
        <h4>Website launch</h4>
        <dl>
          <div>
            <dt>Owner</dt>
            <dd>Morgan Lee</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>In progress</dd>
          </div>
        </dl>
        <TextArea label="Project note" value={draft} onValueChange={setDraft} rows={4} />
      </Drawer>
      <Result>Saved note: {saved || 'Empty'}</Result>
    </div>
  )
}

function ContentStateExample() {
  const [mode, setMode] = useState('empty')
  const [items, setItems] = useState<string[]>([])
  const [query, setQuery] = useState('missing')
  const results = useRef<HTMLDivElement>(null)
  const recoveryTarget = useRef<'results' | 'search'>('results')
  const [recoveryVersion, setRecoveryVersion] = useState(0)
  useEffect(() => {
    if (!recoveryVersion) return
    if (recoveryTarget.current === 'search')
      results.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
    else results.current?.focus()
  }, [recoveryVersion])
  function recover(action: () => void, target: 'results' | 'search' = 'results') {
    action()
    recoveryTarget.current = target
    setRecoveryVersion((value) => value + 1)
  }
  const matches = items.filter((item) => item.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="example-stack">
      <Select
        label="State"
        value={mode}
        onValueChange={(value) => {
          setMode(value)
          setItems(value === 'no-results' ? ['Website launch'] : [])
          setQuery('missing')
        }}
        options={[
          { value: 'empty', label: 'Empty' },
          { value: 'no-results', label: 'No results' },
          { value: 'error', label: 'Error' },
        ]}
      />
      <div
        ref={results}
        role="region"
        aria-label="Task results"
        tabIndex={-1}
        className="example-stack"
      >
        {mode === 'empty' ? (
          items.length ? (
            <List
              label="Tasks added here"
              items={items.map((label, index) => ({ id: String(index), label }))}
            />
          ) : (
            <ContentState
              title="Your tasks start here"
              description="Add your first task to this example."
              icon={<Glyph />}
              action={{
                label: 'Add a task',
                onClick: () => recover(() => setItems(['Review the website'])),
              }}
            />
          )
        ) : mode === 'no-results' ? (
          <>
            <Search
              label="Search tasks"
              placeholder="Search"
              value={query}
              onValueChange={setQuery}
              clearable
            />
            {matches.length ? (
              <List label="Matching tasks" items={matches.map((label) => ({ id: label, label }))} />
            ) : (
              <ContentState
                title="No matching tasks"
                description="Clear the filter to see the task in this example."
                icon={<Glyph kind="info" />}
                action={{
                  label: 'Clear search',
                  onClick: () => recover(() => setQuery(''), 'search'),
                }}
              />
            )}
          </>
        ) : (
          <ContentState
            title="This is the error state"
            description="No network request has been made. Return to the empty task list to continue."
            icon={<Glyph kind="info" />}
            urgent
            action={{
              label: 'Return to tasks',
              onClick: () =>
                recover(() => {
                  setMode('empty')
                  setItems([])
                }),
            }}
          />
        )}
      </div>
      <Result>
        {mode === 'no-results'
          ? `${matches.length} matching tasks.`
          : mode === 'empty'
            ? `${items.length} tasks in this example.`
            : 'Error appearance selected.'}
      </Result>
    </div>
  )
}

function SideNavigationExample() {
  const [value, setValue] = useState('projects')
  const [collapsed, setCollapsed] = useState(false)
  const [showGroups, setShowGroups] = useState(true)
  const [activity, setActivity] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [updates, setUpdates] = useState(true)
  return (
    <div className="example-stack">
      <div className="demo-controls">
        <Switch label="Collapsed" checked={collapsed} onCheckedChange={setCollapsed} />
        <Switch label="Group labels" checked={showGroups} onCheckedChange={setShowGroups} />
      </div>
      <div className="example-navigation-layout">
        <SideNavigation
          brand="Veylo"
          collapsedBrand="v."
          collapsed={collapsed}
          showGroups={showGroups}
          value={value}
          onValueChange={(next) => {
            setValue(next)
            setActivity((items) => [...items, `${next} opened`])
          }}
          groups={[
            {
              id: 'work',
              label: 'Work',
              items: ['Projects', 'Activity', 'Files'].map((label) => ({
                value: label.toLowerCase(),
                label,
                icon: <Glyph kind="grid" />,
              })),
            },
            {
              id: 'manage',
              label: 'Manage',
              items: ['Members', 'Settings'].map((label) => ({
                value: label.toLowerCase(),
                label,
                icon: <Glyph kind="info" />,
              })),
            },
          ]}
        />
        <section className="example-detail">
          <h3>{value[0].toUpperCase() + value.slice(1)}</h3>
          {value === 'projects' ? (
            <List
              label="Navigation projects"
              items={initialProjects.slice(0, 3).map((project) => ({
                id: project.id,
                label: project.name,
                description: project.status,
              }))}
            />
          ) : value === 'activity' ? (
            <List
              label="Navigation activity"
              items={activity.map((label, index) => ({ id: String(index), label }))}
            />
          ) : value === 'files' ? (
            <FileUpload
              files={files}
              onFilesChange={setFiles}
              multiple
              helperText="Files are selected locally."
            />
          ) : value === 'members' ? (
            <List
              label="Members"
              items={['Morgan Lee', 'Sam River', 'Jordan Vale'].map((name) => ({
                id: name,
                label: name,
                leading: <Avatar name={name} size="small" />,
              }))}
            />
          ) : (
            <Switch label="Project updates" checked={updates} onCheckedChange={setUpdates} />
          )}
        </section>
      </div>
      <Result>Current section: {value}</Result>
    </div>
  )
}

function ChatbotExample() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(true)
  const [layout, setLayout] = useState<'embedded' | 'floating' | 'full-page'>('embedded')
  const [notice, setNotice] = useState('')
  const sequence = useRef(0)
  return (
    <div className="example-stack">
      <div className="demo-controls">
        <Select
          label="Presentation"
          value={layout}
          onValueChange={(value) => {
            setLayout(value as typeof layout)
            setOpen(true)
          }}
          options={[
            { value: 'embedded', label: 'Embedded' },
            { value: 'floating', label: 'Floating' },
            { value: 'full-page', label: 'Full page' },
          ]}
        />
        <Switch label="Loading state" checked={loading} onCheckedChange={setLoading} />
      </div>
      <Chatbot
        title="Local conversation"
        description="Messages are held in this example. No AI or message service is connected."
        layout={layout}
        messages={messages}
        value={draft}
        onValueChange={setDraft}
        attachments={files}
        onAttachmentsChange={setFiles}
        loading={loading}
        open={open}
        onOpenChange={setOpen}
        notice={notice}
        welcome={
          <>
            <span aria-hidden="true">✧</span>
            <h3>Start a conversation draft</h3>
            <p>Add a message below, or enter an assistant note yourself.</p>
          </>
        }
        onSend={(text, attachments) => {
          setMessages((items) => [
            ...items,
            {
              id: String(++sequence.current),
              role: 'user',
              text:
                text +
                (attachments.length
                  ? `\nSelected files: ${attachments.map((file) => file.name).join(', ')}`
                  : ''),
            },
          ])
          setDraft('')
          setFiles([])
          setNotice('Message added to the local conversation.')
        }}
        onStop={() => {
          setLoading(false)
          setNotice('Loading state cleared.')
        }}
        onRetry={
          messages.some((message) => message.role === 'user')
            ? () => {
                const last = [...messages].reverse().find((message) => message.role === 'user')
                if (last) setDraft(last.text)
                setNotice('Last message restored to the composer.')
              }
            : undefined
        }
      />
      <div className="example-detail example-stack">
        <TextArea
          label="Assistant note"
          value={note}
          onValueChange={setNote}
          rows={2}
          helperText="Enter the text yourself; this example never generates a reply."
        />
        <Button
          variant="outline"
          shape="pill"
          disabled={!note.trim()}
          onClick={() => {
            setMessages((items) => [
              ...items,
              { id: String(++sequence.current), role: 'assistant', text: note.trim() },
            ])
            setNote('')
            setNotice('Your note was added.')
          }}
        >
          Add assistant note
        </Button>
      </div>
      <Result>{messages.length} messages in the local conversation.</Result>
    </div>
  )
}

'use client'
import { useEffect, useId, useRef, useState } from 'react'
import {
  Button,
  Combobox,
  ContentState,
  DatePicker,
  Dialog,
  Drawer,
  FileUpload,
  Form,
  List,
  Select,
  Switch,
  TextArea,
  TextInput,
  Wizard,
} from '@idyeah/diya'
import type { WorkflowPattern } from './V1WorkflowLibrary'
const teams = [
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'product', label: 'Product' },
  { value: 'archived', label: 'Archived team', disabled: true },
]
type Props = {
  pattern: WorkflowPattern
  multiple: boolean
  helper: boolean
  secondary: boolean
  extended: boolean
  orientation: 'Horizontal' | 'Vertical'
  showStepCount: boolean
  side: 'Left' | 'Right'
  description: boolean
  footer: boolean
  state: string
  action: boolean
}
type CreatedProject = {
  id: string
  label: string
  description: string
  priority: string
  team: string[]
  dueDate: string
  notes: string
  updates: boolean
}
/** Example state stays here; the installed SDK owns every interactive primitive. */
export function WorkflowPreview(p: Props) {
  const id = useId(),
    sequence = useRef(0)
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [priority, setPriority] = useState('normal'),
    [team, setTeam] = useState<string[]>([]),
    [dueDate, setDueDate] = useState(''),
    [notes, setNotes] = useState(''),
    [updates, setUpdates] = useState(true),
    [submitted, setSubmitted] = useState(false)
  const [files, setFiles] = useState<File[]>([]),
    [rejection, setRejection] = useState(''),
    [records, setRecords] = useState<CreatedProject[]>([]),
    [open, setOpen] = useState(false),
    [step, setStep] = useState(0),
    [complete, setComplete] = useState(false),
    [message, setMessage] = useState('')
  const [recovery, setRecovery] = useState<'idle' | 'create' | 'loaded'>('idle')
  const [inspectedRecord, setInspectedRecord] = useState<CreatedProject | null>(null)
  const recoverySurface = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (recovery === 'create') document.getElementById(id + '-name')?.focus()
    if (recovery === 'loaded' || complete) recoverySurface.current?.focus()
  }, [recovery, complete, id])
  useEffect(() => {
    setRecovery('idle')
    setMessage('')
  }, [p.state, p.action])
  useEffect(() => {
    setFiles([])
    setRejection('')
  }, [p.multiple])
  const [drawerSaved, setDrawerSaved] = useState({
    name: 'Veylo launch',
    email: 'alex@example.com',
    priority: 'normal',
    team: ['design'],
    dueDate: '2026-10-23',
    notes: '',
    updates: true,
  })
  function drawerChange(next: boolean) {
    if (next) {
      setName(drawerSaved.name)
      setEmail(drawerSaved.email)
      setPriority(drawerSaved.priority)
      setTeam([...drawerSaved.team])
      setDueDate(drawerSaved.dueDate)
      setNotes(drawerSaved.notes)
      setUpdates(drawerSaved.updates)
      setSubmitted(false)
    }
    setOpen(next)
  }
  const nameError = submitted && !name.trim() ? 'Enter a project name.' : undefined
  const emailError =
    submitted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? 'Enter a valid email address.'
      : undefined
  function reset() {
    setName('')
    setEmail('')
    setPriority('normal')
    setTeam([])
    setDueDate('')
    setNotes('')
    setUpdates(true)
    setSubmitted(false)
    setMessage('')
  }
  function save() {
    setSubmitted(true)
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById(id + (!name.trim() ? '-name' : '-email'))?.focus()
      return false
    }
    setRecords((r) => [
      ...r,
      {
        id: String(++sequence.current),
        label: name.trim(),
        description: email,
        priority,
        team: [...team],
        dueDate,
        notes: notes.trim(),
        updates,
      },
    ])
    reset()
    setMessage('Project created in this preview.')
    return true
  }
  const base = (
    <>
      <TextInput
        id={id + '-name'}
        label="Project name"
        value={name}
        onValueChange={setName}
        placeholder="e.g. Veylo launch"
        required
        maxLength={80}
        error={nameError}
        helperText={p.helper ? 'Choose a name your team will recognize.' : undefined}
      />
      <TextInput
        id={id + '-email'}
        label="Owner email"
        type="email"
        value={email}
        onValueChange={setEmail}
        placeholder="you@example.com"
        required
        error={emailError}
      />
    </>
  )
  const additional = (
    <>
      <div className="catalog-form-columns">
        <Select
          label="Priority"
          value={priority}
          onValueChange={setPriority}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' },
          ]}
        />
        <DatePicker label="Due date" value={dueDate} onValueChange={setDueDate} />
      </div>
      <Combobox label="Team" value={team} onValueChange={setTeam} options={teams} multiple />
      <TextArea
        label="Description"
        value={notes}
        onValueChange={setNotes}
        rows={3}
        maxLength={500}
        showCount
      />
      <Switch label="Project updates" checked={updates} onCheckedChange={setUpdates} />
    </>
  )
  const drawerActions = (
    <>
      <Button variant="quiet" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button
        onClick={() => {
          setSubmitted(true)
          if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById(id + (!name.trim() ? '-name' : '-email'))?.focus()
            return
          }
          setDrawerSaved({
            name: name.trim(),
            email,
            priority,
            team: [...team],
            dueDate,
            notes,
            updates,
          })
          setOpen(false)
          setSubmitted(false)
          setMessage('Saved ' + name.trim() + ' in this preview.')
        }}
      >
        Save changes
      </Button>
    </>
  )
  const createdProjectDetails = (
    <Dialog
      open={inspectedRecord !== null}
      onOpenChange={(open) => {
        if (!open) setInspectedRecord(null)
      }}
      title={inspectedRecord?.label ?? 'Project details'}
      size="small"
    >
      {inspectedRecord && (
        <dl className="catalog-review-list">
          <div>
            <dt>Owner</dt>
            <dd>{inspectedRecord.description}</dd>
          </div>
          <div>
            <dt>Priority</dt>
            <dd>{inspectedRecord.priority[0].toUpperCase() + inspectedRecord.priority.slice(1)}</dd>
          </div>
          <div>
            <dt>Team</dt>
            <dd>
              {inspectedRecord.team
                .map((value) => teams.find((item) => item.value === value)?.label ?? value)
                .join(', ') || 'Unassigned'}
            </dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{inspectedRecord.dueDate || 'Not set'}</dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>{inspectedRecord.notes || 'No description'}</dd>
          </div>
          <div>
            <dt>Project updates</dt>
            <dd>{inspectedRecord.updates ? 'On' : 'Off'}</dd>
          </div>
        </dl>
      )}
    </Dialog>
  )
  if (p.pattern === 'file-upload')
    return (
      <div className="catalog-workflow-stack">
        <FileUpload
          files={files}
          onFilesChange={(value) => {
            setFiles(value)
            setRejection('')
          }}
          multiple={p.multiple}
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          maxBytes={10 * 1024 * 1024}
          helperText={p.helper ? 'PDF, PNG, JPG or WebP · Up to 10 MB per file.' : undefined}
          onReject={(items) =>
            setRejection(
              items
                .map(
                  (x) =>
                    x.file.name +
                    ': ' +
                    (x.reason === 'size' ? 'exceeds 10 MB' : 'unsupported file type')
                )
                .join('. ')
            )
          }
        />
        <p role="status">
          {rejection ||
            `${files.length} ${files.length === 1 ? 'file' : 'files'} selected locally.`}
        </p>
      </div>
    )
  if (p.pattern === 'form')
    return (
      <div className="catalog-workflow-stack">
        <Form
          title="Create a project"
          description={p.helper ? 'Project details, ownership, and preferences.' : undefined}
          submitLabel="Create project"
          onCancel={p.secondary ? reset : undefined}
          noValidate
          onSubmit={() => save()}
        >
          {base}
          {p.extended && additional}
        </Form>
        {records.length > 0 && (
          <List
            label="Created projects"
            items={records.map((record) => ({
              ...record,
              onSelect: () => setInspectedRecord(record),
            }))}
            divided
          />
        )}
        {createdProjectDetails}
        <p role="status">{message}</p>
      </div>
    )
  if (p.pattern === 'wizard')
    return (
      <div
        className="catalog-workflow-stack"
        ref={recoverySurface}
        tabIndex={complete ? -1 : undefined}
        role={complete ? 'region' : undefined}
        aria-label={complete ? 'Project created' : undefined}
      >
        {complete ? (
          <ContentState
            title="Project created"
            description={`${name.trim()} is ready in this preview.`}
            action={{
              label: 'Create another',
              onClick: () => {
                reset()
                setStep(0)
                setComplete(false)
                requestAnimationFrame(() => document.getElementById(id + '-name')?.focus())
              },
            }}
          />
        ) : (
          <Wizard
            label="Create project"
            orientation={p.orientation === 'Vertical' ? 'vertical' : 'horizontal'}
            showStepCount={p.showStepCount}
            activeStep={step}
            onStepChange={(next) => {
              if (next > step && step === 0) {
                setSubmitted(true)
                if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                  document.getElementById(id + (!name.trim() ? '-name' : '-email'))?.focus()
                  return
                }
                setSubmitted(false)
              }
              setStep(next)
            }}
            onComplete={() => setComplete(true)}
            completeLabel="Create project"
            steps={[
              {
                id: 'details',
                label: 'Details',
                title: 'Start with the essentials',
                content: base,
              },
              {
                id: 'preferences',
                label: 'Preferences',
                title: 'Make it work for your team',
                content: additional,
              },
              {
                id: 'review',
                label: 'Review',
                title: 'Ready to create',
                content: (
                  <dl className="catalog-review-list">
                    <div>
                      <dt>Project</dt>
                      <dd>{name}</dd>
                    </div>
                    <div>
                      <dt>Owner</dt>
                      <dd>{email}</dd>
                    </div>
                    <div>
                      <dt>Team</dt>
                      <dd>
                        {team
                          .map(
                            (value) => teams.find((item) => item.value === value)?.label ?? value
                          )
                          .join(', ') || 'Unassigned'}
                      </dd>
                    </div>
                    <div>
                      <dt>Due date</dt>
                      <dd>{dueDate || 'Not set'}</dd>
                    </div>
                    <div>
                      <dt>Priority</dt>
                      <dd>{priority[0].toUpperCase() + priority.slice(1)}</dd>
                    </div>
                    <div>
                      <dt>Description</dt>
                      <dd>{notes.trim() || 'No description'}</dd>
                    </div>
                    <div>
                      <dt>Project updates</dt>
                      <dd>{updates ? 'On' : 'Off'}</dd>
                    </div>
                  </dl>
                ),
              },
            ]}
          />
        )}
      </div>
    )
  if (p.pattern === 'drawer')
    return (
      <div className="catalog-workflow-stack">
        <Button onClick={() => drawerChange(true)}>
          Open drawer
        </Button>
        <Drawer
          open={open}
          onOpenChange={drawerChange}
          side={p.side === 'Left' ? 'left' : 'right'}
          title="Project details"
          description={p.description ? 'Edit project ownership and schedule.' : undefined}
          footer={p.footer ? drawerActions : undefined}
        >
          <div className="catalog-workflow-stack">
            {base}
            {additional}
          </div>
          {!p.footer && (
            <div className="catalog-workflow-actions" role="group" aria-label="Project actions">
              {drawerActions}
            </div>
          )}
        </Drawer>
        <p role="status">{message}</p>
      </div>
    )
  const states: Record<string, { title: string; description: string; label: string }> = {
    Empty: {
      title: 'No projects yet',
      description: 'Give your next idea a place to grow.',
      label: 'Create project',
    },
    'No results': {
      title: 'No matching projects',
      description: 'Try another search or clear your filters.',
      label: 'Clear filters',
    },
    Error: {
      title: 'Projects could not be loaded',
      description: 'Try again to load the sample projects.',
      label: 'Try again',
    },
  }
  const state = states[p.state] ?? states.Empty
  if (recovery === 'create')
    return (
      <div className="catalog-workflow-stack">
        <Form
          title="Create a project"
          submitLabel="Create project"
          noValidate
          onCancel={() => {
            reset()
            setRecovery('idle')
            requestAnimationFrame(() => recoverySurface.current?.querySelector('button')?.focus())
          }}
          onSubmit={() => {
            if (save()) setRecovery('loaded')
          }}
        >
          {base}
        </Form>
      </div>
    )
  if (recovery === 'loaded')
    return (
      <div
        className="catalog-workflow-stack"
        ref={recoverySurface}
        tabIndex={-1}
        role="region"
        aria-label="Project recovery results"
      >
        <List
          label="Projects"
          divided
          items={
            p.state === 'Empty'
              ? records.map((record) => ({ ...record, onSelect: () => setInspectedRecord(record) }))
              : [
                  { id: 'nuvio', label: 'Nuvio', description: 'Workspace planning · Alex Morgan' },
                  { id: 'avyra', label: 'Avyra', description: 'Onboarding review · Samira Chen' },
                  {
                    id: 'kelmio',
                    label: 'Kelmio',
                    description: 'Reporting walkthrough · Eli Brooks',
                  },
                ]
          }
        />
        {createdProjectDetails}
        <p role="status">
          {p.state === 'Empty'
            ? 'Your project is ready in this preview.'
            : p.state === 'Error'
              ? 'Sample projects loaded.'
              : 'Filters cleared. All sample projects are shown.'}
        </p>
        <Button
          variant="quiet"
          onClick={() => {
            setRecovery('idle')
            requestAnimationFrame(() => recoverySurface.current?.querySelector('button')?.focus())
          }}
        >
          Reset example
        </Button>
      </div>
    )
  return (
    <div className="catalog-workflow-stack" ref={recoverySurface}>
      <ContentState
        title={state.title}
        description={state.description}
        urgent={p.state === 'Error'}
        action={
          p.action
            ? {
                label: state.label,
                onClick: () => setRecovery(p.state === 'Empty' ? 'create' : 'loaded'),
              }
            : undefined
        }
      />
      <p role="status">{message}</p>
    </div>
  )
}

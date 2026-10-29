'use client'
// Task list: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/tasks/page.tsx. Vite: save as src/TaskList.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState } from 'react'
import {
  Avatar, Button, Choice, ContentState, DatePicker, Dialog, Drawer, Menu, Select, Stack, Tabs, Tag, TextInput, Toast, useDiyaAppearance,
} from '@idyeah/diya'
import { CalendarClock, ChevronDown, CircleAlert, Info, ListPlus, LucideProvider, Plus, Trash2 } from 'lucide-react'

// Your team, your projects and "today", fixed so the demo reads the same on any day.
const TODAY = '2026-11-04'
const TEAM = ['Lucía Fernández', 'Kenji Watanabe', 'Priya Raman', 'Tomás Ortega', 'Aisha Bello']
const PROJECTS = [
  { id: 'winter', name: 'Winter menu launch', blurb: 'Four new drinks and six pastries, on the counter by Nov 20.' },
  { id: 'popup', name: 'Holiday pop-up', blurb: 'A weekend stall at the night market in December.' },
]

type Status = 'todo' | 'doing' | 'done'
type Priority = 'low' | 'medium' | 'high'
type Task = { id: string; project: string; title: string; status: Status; assignee: string; due: string; priority: Priority }

// Your tasks. In your app, load them for the project in the URL.
const TASKS: Task[] = [
  { id: 't1', project: 'winter', title: 'Cost out the winter menu', status: 'todo', assignee: 'Aisha Bello', due: '2026-11-06', priority: 'high' },
  { id: 't2', project: 'winter', title: 'Order holiday cups and sleeves', status: 'todo', assignee: 'Tomás Ortega', due: '2026-11-02', priority: 'high' },
  { id: 't3', project: 'winter', title: 'Photograph the new pastries', status: 'todo', assignee: 'Priya Raman', due: '2026-11-10', priority: 'medium' },
  { id: 't4', project: 'winter', title: 'Write allergen cards for every item', status: 'todo', assignee: 'Kenji Watanabe', due: '2026-11-12', priority: 'medium' },
  { id: 't5', project: 'winter', title: 'Update the menu on the website', status: 'todo', assignee: 'Priya Raman', due: '2026-11-16', priority: 'low' },
  { id: 't6', project: 'winter', title: 'Test the cardamom buns at full batch size', status: 'doing', assignee: 'Kenji Watanabe', due: '2026-11-05', priority: 'high' },
  { id: 't7', project: 'winter', title: 'Train the weekend team on the new drinks', status: 'doing', assignee: 'Tomás Ortega', due: '2026-11-03', priority: 'medium' },
  { id: 't8', project: 'winter', title: 'Draft the launch email', status: 'doing', assignee: 'Priya Raman', due: '2026-11-09', priority: 'low' },
  { id: 't9', project: 'winter', title: 'Pick the four winter drinks', status: 'done', assignee: 'Lucía Fernández', due: '2026-10-28', priority: 'medium' },
  { id: 't10', project: 'winter', title: 'Taste-test the gingerbread latte, again', status: 'done', assignee: 'Lucía Fernández', due: '2026-10-30', priority: 'low' },
  { id: 't11', project: 'winter', title: 'Find a second oat milk supplier', status: 'done', assignee: 'Aisha Bello', due: '2026-10-31', priority: 'low' },
]

const STATUSES: { value: Status; label: string }[] = [{ value: 'todo', label: 'To do' }, { value: 'doing', label: 'In progress' }, { value: 'done', label: 'Done' }]
const PRIORITIES = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]
const PEOPLE = [{ value: 'none', label: 'Unassigned' }, ...TEAM.map((name) => ({ value: name, label: name }))]

// Replace with your API calls. Each waits a moment. Saving turns down a title
// another task in the project already has, so the list stays unambiguous.
async function api(route: string, task?: Task, all: Task[] = []) {
  await new Promise((resolve) => setTimeout(resolve, route === '/tasks/move' ? 300 : 800))
  if (task && all.some((t) => t.id !== task.id && t.project === task.project && t.title.toLowerCase() === task.title.trim().toLowerCase()))
    throw new Error(`There’s already a task called “${task.title.trim()}”. Give this one its own name.`)
  return true
}

const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format
const overdue = (task: Task) => task.status !== 'done' && !!task.due && task.due < TODAY
const label = (status: Status) => STATUSES.find((s) => s.value === status)!.label
type Notice = { id: number; text: string; undo?: () => void }
type Focus = { id: string; on: 'check' | 'move' | 'heading' }

export default function TaskListScreen() {
  const { glass } = useDiyaAppearance()
  const [tasks, setTasks] = useState(TASKS)
  const [project, setProject] = useState('winter')
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState<Task>()
  const [creating, setCreating] = useState<Task>()
  const [deleting, setDeleting] = useState<Task>()
  const [notice, setNotice] = useState<Notice>()
  const [said, say] = useState('')
  const [focus, setFocus] = useState<Focus>()
  const nodes = useRef<Record<string, HTMLElement | null>>({})
  const heading = useRef<HTMLHeadingElement>(null)
  const current = PROJECTS.find((p) => p.id === project)!
  const shown = tasks.filter((t) => t.project === project)
  const late = shown.filter(overdue).length

  // After a task moves, keep the keyboard where the reader expects it.
  useEffect(() => {
    if (!focus) return
    const node = focus.on === 'heading' ? heading.current : nodes.current[`${focus.on}-${focus.id}`]
    ;(node ?? heading.current)?.focus()
  }, [focus])

  function move(task: Task, status: Status, from: 'check' | 'move') {
    if (task.status === status) return
    const group = shown.filter((t) => t.status === task.status)
    const next = group[group.indexOf(task) + 1] ?? group[group.indexOf(task) - 1]
    setTasks((all) => all.map((t) => (t.id === task.id ? { ...t, status } : t)))
    void api('/tasks/move')
    setFocus(from === 'move' ? { id: task.id, on: 'move' } : next ? { id: next.id, on: 'check' } : { id: '', on: 'heading' })
    if (status === 'done') {
      setNotice({ id: Date.now(), text: `“${task.title}” is done.`, undo: () => {
        setTasks((all) => all.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)))
        say(`“${task.title}” is back in ${label(task.status)}.`)
      } })
    } else say(`Moved “${task.title}” to ${label(status)}.`)
  }

  async function save(task: Task) {
    await api(`/tasks/${task.id}`, task, tasks)
    const clean = { ...task, title: task.title.trim() }
    setTasks((all) => (all.some((t) => t.id === task.id) ? all.map((t) => (t.id === task.id ? clean : t)) : [...all, clean]))
    setNotice({ id: Date.now(), text: creating ? `Added “${clean.title}” to To do.` : 'Changes saved.' })
  }

  async function remove() {
    if (!deleting) return
    await api(`/tasks/${deleting.id}/delete`)
    setTasks((all) => all.filter((t) => t.id !== deleting.id))
    setNotice({ id: Date.now(), text: `Deleted “${deleting.title}”.` })
    setFocus({ id: '', on: 'heading' })
  }

  const create = () => setCreating({ id: `t${Date.now()}`, project, title: '', status: 'todo', assignee: '', due: '', priority: 'medium' })
  const shared = { tasks: shown, nodes, onMove: move, onOpen: setEditing }

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <main className="task-list" data-glass={glass || undefined}>
        <style>{css}</style>
        <div className="task-list-page">
          <header className="task-list-header">
            <div className="task-list-heading">
              <Menu label="Projects" items={PROJECTS.map((p) => ({
                id: p.id, type: 'radio' as const, checked: p.id === project, label: p.name,
                onSelect: () => { setProject(p.id); setFocus({ id: '', on: 'heading' }) },
              }))} trigger={<Button variant="quiet" size="small" className="task-list-switch">Little Fern Bakery <ChevronDown /></Button>} />
              <h1 ref={heading} tabIndex={-1} className="task-list-title">{current.name}</h1>
              <p className="task-list-lede">
                {shown.length ? `${shown.filter((t) => t.status !== 'done').length} open, ${shown.filter((t) => t.status === 'done').length} done` : current.blurb}
                {late > 0 && <span className="task-list-late"><CircleAlert /> {late} overdue</span>}
              </p>
            </div>
            <Button onClick={create}><Plus /> New task</Button>
          </header>

          {shown.length ? (
            <Tabs className="task-list-tabs" label="View" value={view} onValueChange={setView} items={[
              { value: 'list', label: 'List', content: view === 'list' && <ListView {...shared} /> },
              { value: 'board', label: 'Board', content: view === 'board' && <BoardView {...shared} /> },
            ]} />
          ) : (
            <ContentState className="task-list-empty" headingLevel={2} icon={<ListPlus />} title="Nothing on the list yet"
              description={`${current.blurb} Add the first task and the rest tends to follow.`} action={{ label: 'New task', onClick: create }} />
          )}
          <p className="task-list-sr" role="status">{said}</p>
        </div>

        <TaskDrawer task={editing} onClose={() => setEditing(undefined)} onSave={save}
          onDelete={(task) => { setEditing(undefined); setDeleting(task) }} />
        <TaskDialog open={!!creating} task={creating} onClose={() => setCreating(undefined)} onSave={save} />
        <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(undefined)} size="small" title="Delete this task?"
          description={deleting ? `“${deleting.title}” leaves the project for good, along with its due date and assignee.` : undefined}
          confirmLabel="Delete task" confirmVariant="destructive" dismissLabel="Keep it" onConfirm={remove}
          onDismiss={() => deleting && setEditing(deleting)} />
        {notice && (
          <Toast key={notice.id} tone="success" onDismiss={() => setNotice(undefined)} duration={6000}
            action={notice.undo ? { label: 'Undo', onClick: () => { notice.undo?.(); setNotice(undefined) } } : undefined}>
            {notice.text}
          </Toast>
        )}
      </main>
    </LucideProvider>
  )
}

type ViewProps = {
  tasks: Task[]; nodes: { current: Record<string, HTMLElement | null> }
  onMove: (task: Task, status: Status, from: 'check' | 'move') => void; onOpen: (task: Task) => void
}

function ListView({ tasks, nodes, onMove, onOpen }: ViewProps) {
  return (
    <div className="task-list-panel">
      {STATUSES.map((status) => {
        const group = tasks.filter((t) => t.status === status.value)
        return (
          <section key={status.value} className="task-list-group" aria-labelledby={`task-list-${status.value}`}>
            <h2 id={`task-list-${status.value}`} className="task-list-group-title">{status.label} <span className="task-list-count">{group.length}</span></h2>
            {group.length ? (
              <ul className="task-list-rows">
                {group.map((task) => (
                  <li key={task.id} className="task-list-row">
                    <Choice ref={(node) => { nodes.current[`check-${task.id}`] = node }} className="task-list-check" multiple hideLabel label="Complete"
                      options={[{ value: 'done', label: task.title }]} value={task.status === 'done' ? ['done'] : []}
                      onValueChange={(value) => onMove(task, value.length ? 'done' : 'todo', 'check')} />
                    <Meta task={task} />
                    <Button variant="quiet" size="small" iconOnly aria-label={`Details for ${task.title}`} onClick={() => onOpen(task)}><Info /></Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="task-list-quiet">{status.value === 'done' ? 'Nothing finished yet. The first one feels great.' : 'Nothing here right now.'}</p>
            )}
          </section>
        )
      })}
    </div>
  )
}

// Drag and drop between columns is planned; until DIYA ships it, each card's Move to menu does the job.
function BoardView({ tasks, nodes, onMove, onOpen }: ViewProps) {
  return (
    <div className="task-list-panel">
      <p className="task-list-quiet">Drag and drop is coming. Use Move to for now.</p>
      <div className="task-list-board">
        {STATUSES.map((status) => {
          const column = tasks.filter((t) => t.status === status.value)
          return (
            <section key={status.value} className="task-list-column" aria-labelledby={`task-list-col-${status.value}`}>
              <h2 id={`task-list-col-${status.value}`} className="task-list-group-title">{status.label} <span className="task-list-count">{column.length}</span></h2>
              {column.map((task) => (
                <article key={task.id} className="task-list-card" aria-label={task.title}>
                  <button type="button" className="task-list-card-title" onClick={() => onOpen(task)}>{task.title}</button>
                  <Meta task={task} />
                  <Menu ref={(node) => { nodes.current[`move-${task.id}`] = node }} label={`Move “${task.title}” to`}
                    trigger={<Button variant="quiet" size="small" className="task-list-move">Move to…</Button>}
                    items={STATUSES.filter((s) => s.value !== task.status).map((s) => ({ id: s.value, label: s.label, onSelect: () => onMove(task, s.value, 'move') }))} />
                </article>
              ))}
              {!column.length && <p className="task-list-quiet">No tasks</p>}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Meta({ task }: { task: Task }) {
  const late = overdue(task)
  return (
    <span className="task-list-meta">
      {task.due && (
        <span className={late ? 'task-list-due task-list-late' : 'task-list-due'}>
          {late ? <CircleAlert /> : <CalendarClock />}
          {late ? `Overdue, ${day(new Date(task.due))}` : task.due === TODAY ? 'Due today' : day(new Date(task.due))}
        </span>
      )}
      <Tag size="small" tone={task.priority === 'high' ? 'warning' : 'neutral'} leading={task.priority === 'high' ? 'dot' : undefined}>
        {PRIORITIES.find((p) => p.value === task.priority)!.label}
      </Tag>
      {task.assignee ? <Avatar name={task.assignee} size="small" /> : <span className="task-list-quiet">Unassigned</span>}
    </span>
  )
}

function Fields({ draft, setDraft, error, setError }: { draft: Task; setDraft: (task: Task) => void; error?: string; setError: (error?: string) => void }) {
  return (
    <Stack gap={5}>
      <TextInput label="Title" autoComplete="off" value={draft.title} error={error} onValueChange={(title) => { setDraft({ ...draft, title }); setError(undefined) }} />
      <Select label="Assignee" options={PEOPLE} value={draft.assignee || 'none'} onValueChange={(value) => setDraft({ ...draft, assignee: value === 'none' ? '' : value })} />
      <DatePicker className="task-list-field" label="Due date" value={draft.due} onValueChange={(due) => setDraft({ ...draft, due })} />
      <Choice label="Priority" options={PRIORITIES} value={draft.priority} onValueChange={(priority) => setDraft({ ...draft, priority: priority as Priority })} />
    </Stack>
  )
}

function useDraft(task: Task | undefined, open: boolean) {
  const [draft, setDraft] = useState<Task>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open || !task) return
    setDraft(task)
    setError(undefined)
    setBusy(false)
  }, [open, task])
  async function submit(onSave: (task: Task) => Promise<void>) {
    if (!draft) return false
    if (!draft.title.trim()) return setError('Give the task a title.'), false
    setBusy(true)
    try {
      await onSave(draft)
      return true
    } catch (problem) {
      setError((problem as Error).message)
      setBusy(false)
      return false
    }
  }
  return { draft, setDraft, error, setError, busy, submit }
}

type EditProps = { task?: Task; onClose: () => void; onSave: (task: Task) => Promise<void> }

function TaskDialog({ open, task, onClose, onSave }: EditProps & { open: boolean }) {
  const form = useDraft(task, open)
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title="New task" description="It starts in To do." confirmLabel="Add task"
      loading={form.busy} onConfirm={() => form.submit(onSave)}>
      {form.draft && <Fields draft={form.draft} setDraft={form.setDraft} error={form.error} setError={form.setError} />}
    </Dialog>
  )
}

function TaskDrawer({ task, onClose, onSave, onDelete }: EditProps & { onDelete: (task: Task) => void }) {
  const form = useDraft(task, !!task)
  async function save() {
    if (await form.submit(onSave)) onClose()
  }
  return (
    <Drawer open={!!task} onOpenChange={(open) => !open && onClose()} title="Task details"
      description={task ? `${label(task.status)}${overdue(task) ? ', overdue' : ''}` : undefined}
      footer={
        <div className="task-list-drawer-actions">
          <Button variant="quiet" onClick={() => task && onDelete(task)}><Trash2 /> Delete</Button>
          <Button loading={form.busy} onClick={save}>Save changes</Button>
        </div>
      }>
      {form.draft ? <Fields draft={form.draft} setDraft={form.setDraft} error={form.error} setError={form.setError} /> : <span />}
    </Drawer>
  )
}

const css = `
.task-list { min-height: 100dvh; color: var(--diya-color-text); }
.task-list-page { box-sizing: border-box; width: 100%; max-width: 1120px; margin: 0 auto; display: grid; align-content: start; gap: var(--diya-space-6);
  padding: var(--diya-space-7) var(--diya-space-7) var(--diya-space-8); }
.task-list-header { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--diya-space-4); }
.task-list-heading { display: grid; justify-items: start; gap: var(--diya-space-2); min-width: 0; }
.task-list-switch { margin-inline-start: calc(var(--diya-space-4) * -1); color: var(--diya-color-muted); }
.task-list-title { margin: 0; font-size: var(--diya-text-display); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.025em; text-wrap: balance; }
.task-list-title:focus { outline: none; }
.task-list-lede { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-2) var(--diya-space-4); margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-large); line-height: var(--diya-leading-body); }
.task-list-late { display: inline-flex; align-items: center; gap: var(--diya-space-1); color: var(--diya-color-error); font-weight: 500; }
.task-list-tabs { min-width: 0; }
.task-list-panel { display: grid; gap: var(--diya-space-6); padding-top: var(--diya-space-5); }
.task-list-group { display: grid; gap: var(--diya-space-2); }
.task-list-group-title { display: flex; align-items: baseline; gap: var(--diya-space-2); margin: 0; font-size: var(--diya-text-body); font-weight: 600; }
.task-list-count { color: var(--diya-color-muted); font-weight: 500; font-variant-numeric: tabular-nums; }
.task-list-rows { display: grid; margin: 0; padding: 0; list-style: none; }
.task-list-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: var(--diya-space-4);
  min-height: 52px; padding: var(--diya-space-2) 0; border-top: 1px solid var(--diya-color-line); }
.task-list-row:last-child { border-bottom: 1px solid var(--diya-color-line); }
.task-list-check { min-width: 0; }
.task-list-row .task-list-meta { display: grid; grid-template-columns: 136px 76px 32px; justify-items: start; }
.task-list-meta { display: inline-flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: var(--diya-space-3); }
.task-list-due { display: inline-flex; align-items: center; gap: var(--diya-space-1); color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-variant-numeric: tabular-nums; white-space: nowrap; }
.task-list-due.task-list-late { color: var(--diya-color-error); }
.task-list-quiet { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.task-list-sr { position: absolute; width: 1px; height: 1px; margin: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.task-list-empty { margin-block: var(--diya-space-7); }
.task-list-board { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--diya-space-4); align-items: start; }
.task-list-column { display: grid; gap: var(--diya-space-3); padding: var(--diya-space-4); border-radius: calc(16px * var(--diya-corner-scale, 1)); background: var(--diya-color-recessed);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--diya-color-line) 60%, transparent); }
.task-list-column > .task-list-group-title { padding: var(--diya-space-1) var(--diya-space-1) var(--diya-space-2); }
.task-list-card { display: grid; justify-items: start; gap: var(--diya-space-3); padding: var(--diya-space-4); border: 1px solid var(--diya-color-line);
  border-radius: calc(12px * var(--diya-corner-scale, 1)); background: var(--diya-color-raised); }
.task-list-card .task-list-meta { justify-content: flex-start; }
.task-list-card-title { padding: 0; border: 0; background: none; color: inherit; font: inherit; font-size: var(--diya-text-body); font-weight: 500; line-height: var(--diya-leading-body); text-align: start; cursor: pointer; }
.task-list-card-title:hover { text-decoration: underline; text-underline-offset: 3px; }
.task-list-card-title:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 3px; border-radius: 4px; }
.task-list-move { margin-inline-start: calc(var(--diya-space-3) * -1); margin-block-end: calc(var(--diya-space-2) * -1); }
.task-list[data-glass] .task-list-column { background: color-mix(in srgb, var(--diya-color-raised) 40%, transparent); backdrop-filter: blur(24px) saturate(1.1); }
.task-list[data-glass] .task-list-card { background: color-mix(in srgb, var(--diya-color-raised) 78%, transparent); }
.task-list-field { width: 100%; max-width: none; }
.task-list-drawer-actions { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); width: 100%; }
.task-list-drawer-actions > :first-child { margin-inline-end: auto; }
@media (prefers-reduced-transparency: reduce) {
  .task-list[data-glass] .task-list-column { background: var(--diya-color-recessed); backdrop-filter: none; }
  .task-list[data-glass] .task-list-card { background: var(--diya-color-raised); }
}
@media (max-width: 900px) {
  .task-list-board { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 640px) {
  .task-list-page { padding: var(--diya-space-5) var(--diya-space-4) var(--diya-space-7); gap: var(--diya-space-5); }
  .task-list-title { font-size: var(--diya-text-heading); }
  .task-list-lede { font-size: var(--diya-text-body); }
  .task-list-header > :last-child { width: 100%; }
  .task-list-row { grid-template-columns: minmax(0, 1fr) auto; row-gap: var(--diya-space-1); padding-block: var(--diya-space-3); }
  .task-list-row .task-list-meta { display: inline-flex; grid-column: 1; grid-row: 2; justify-content: flex-start; padding-inline-start: 30px; }
  .task-list-row > :last-child { grid-column: 2; grid-row: 1 / span 2; }
}
`

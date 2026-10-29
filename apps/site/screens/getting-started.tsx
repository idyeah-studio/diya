'use client'
// Getting started: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/getting-started/page.tsx. Vite: save as src/GettingStarted.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Avatar, Button, Card, Choice, Drawer, List, PageHeader, Progress, SideNavigation, SiteHeader, Stack, Switch, Tag, TextInput, TextLink, Toast, useDiyaAppearance,
} from '@idyeah/diya'
import {
  ArrowUpRight, BookOpen, Circle, CircleCheck, CircleDashed, FileText, FolderKanban, House, Inbox, ListChecks, LucideProvider, MessageCircle, Plus, Settings, Users,
} from 'lucide-react'

// Your product, who is signed in, and what today holds.
const PRODUCT = 'Lintel'
const WORKSPACE = 'Northwind Studio'
const ME = { name: 'Maya Okafor', first: 'Maya' }
const TODAY = 'Monday, November 9'
const NAV = [
  { value: 'home', label: 'Home', href: '/', icon: <House /> },
  { value: 'inbox', label: 'Inbox', href: '/inbox', icon: <Inbox />, count: 2 },
  { value: 'docs', label: 'Docs', href: '/docs', icon: <FileText /> },
  { value: 'projects', label: 'Projects', href: '/projects', icon: <FolderKanban /> },
]
const NAV_MORE = [
  { value: 'team', label: 'Team', href: '/team', icon: <Users /> },
  { value: 'settings', label: 'Settings', href: '/settings', icon: <Settings /> },
]
const AGENDA = [
  { id: 'crit', label: 'Weekly crit', description: 'The notes doc is ready to fill in', when: '10:00 AM' },
  { id: 'brief', label: 'Halvorsen brief', description: 'Aiko Tanaka asked for your eyes on it', when: 'Due today' },
  { id: 'jonah', label: 'Jonah Park joined', description: 'Say hi, or send him the handbook', when: '9:40 AM' },
]

type TaskId = 'workspace' | 'invite' | 'doc' | 'line' | 'calendar' | 'alerts'
type Status = 'todo' | 'done' | 'skipped'
type Task = { id: TaskId; label: string; todo: string; done: string; minutes: number; intro: string; steps?: string[]; action?: string; cheer?: string; link?: { label: string; href: string } }

// The setup checklist. Each task's drawer explains it and offers one action.
const TASKS: Task[] = [
  {
    id: 'workspace', label: 'Create your workspace', minutes: 1, todo: 'Name it and pick its address.', done: 'Live, with its own address',
    intro: `${WORKSPACE} is live at lintel.example.com/northwind-studio. You can rename it, or change its address, in Settings.`,
    link: { label: 'Open workspace settings', href: '/settings' },
  },
  {
    id: 'invite', label: 'Invite your team', minutes: 2, todo: 'Docs are better with company.', done: '3 invites sent, and 2 people have joined',
    intro: 'Aiko Tanaka and Jonah Park have joined. Tomás Rivera hasn’t opened his invite yet; it works for another 6 days.',
    link: { label: 'Invite more people', href: '/team' },
  },
  {
    id: 'doc', label: 'Write your first doc', minutes: 5, todo: 'The client brief from your template is a good start.', done: 'Client brief, written by you',
    intro: 'Your Client projects template made four pages. The brief is the one everything else points to, so it’s the best place to begin.',
    steps: ['Open Client brief from Docs.', 'Type / for headings, lists, tables and images.', 'Share it when it’s ready, or keep it to yourself for now.'],
    action: 'Open the brief', cheer: 'First doc, written',
  },
  {
    id: 'line', label: 'Turn a line into a task', minutes: 1, todo: 'Give it an owner and a date.', done: 'Your first task has an owner',
    intro: 'Any line in any doc can become a task. It keeps its place in the doc and shows up on its owner’s Today.',
    steps: ['Select a line, like “Send the moodboard”.', 'Press T, or choose Make a task.', 'Pick who owns it and when it’s due.'],
    action: 'Try it on the brief', cheer: 'Your first task is out there',
  },
  {
    id: 'calendar', label: 'Connect your calendar', minutes: 2, todo: 'Every meeting gets a notes doc, ready before it starts.', done: 'Meetings now come with notes',
    intro: `${PRODUCT} reads your meeting titles and times, never their contents, and makes a notes doc for each one.`,
    action: 'Connect calendar', cheer: 'Calendar connected',
  },
  {
    id: 'alerts', label: 'Choose your notifications', minutes: 1, todo: 'Mentions right away, the rest when it suits you.', done: 'Set the way you like them',
    intro: 'Start quiet. You can always turn more on in Settings.',
    action: 'Save notifications', cheer: 'Notifications saved',
  },
]
const STARTING: Record<TaskId, Status> = { workspace: 'done', invite: 'done', doc: 'todo', line: 'todo', calendar: 'todo', alerts: 'todo' }

type Route = '/setup/done' | '/setup/skipped' | '/setup/todo' | '/calendar/connect'

// Replace with your API call. The stub waits a moment, then turns down a
// calendar link that doesn't end in .ics. Everything else goes through.
async function api(route: Route, body: Record<string, unknown>) {
  await new Promise((resolve) => setTimeout(resolve, 700))
  if (route === '/calendar/connect') return body.provider !== 'ical' || String(body.link).trim().endsWith('.ics')
  return true
}

type Notice = { id: number; title: string; text: string }

export default function GettingStartedScreen() {
  const { glass } = useDiyaAppearance()
  const [status, setStatus] = useState(STARTING)
  const [open, setOpen] = useState<TaskId>()
  const [hidden, setHidden] = useState(false)
  const [notice, setNotice] = useState<Notice>()
  const heading = useRef<HTMLSpanElement>(null)
  const checklist = useRef<HTMLElement>(null)

  const doneCount = TASKS.filter((task) => status[task.id] === 'done').length
  const left = TASKS.filter((task) => status[task.id] === 'todo')
  const finished = left.length === 0
  const say = (title: string, text: string) => setNotice({ id: Date.now(), title, text })

  function settle(task: Task, to: Status) {
    const next = { ...status, [task.id]: to }
    const todo = TASKS.filter((item) => next[item.id] === 'todo')
    const done = TASKS.filter((item) => next[item.id] === 'done').length
    setStatus(next)
    setOpen(undefined)
    if (to === 'todo') say('Back on your list', `${task.label} is waiting whenever you are.`)
    if (to === 'done') say(task.cheer ?? 'Done', todo.length ? `${done} of ${TASKS.length} done. Next up: ${todo[0].label.toLowerCase()}.` : 'That’s every step. You can hide the checklist now.')
  }

  function hide() {
    setHidden(true)
    say('Checklist hidden', 'You can bring it back from the help card any time.')
    heading.current?.focus()
  }

  function show() {
    setHidden(false)
    requestAnimationFrame(() => checklist.current?.focus())
  }

  const task = TASKS.find((item) => item.id === open)
  const today = (
    <Card title="Today" headingLevel={2}>
      <List label="Today" divided items={AGENDA.map(({ when, ...item }) => ({ ...item, trailing: <span className="getting-started-quiet">{when}</span> }))} />
    </Card>
  )

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="getting-started" data-glass={glass || undefined}>
        <style>{css}</style>
        <a className="getting-started-skip" href="#getting-started-main">Skip to content</a>
        <div className="getting-started-side">
          <SideNavigation
            className="getting-started-nav"
            brand={<Brand />}
            value="home"
            groups={[{ id: 'main', items: NAV }, { id: 'workspace', label: WORKSPACE, items: NAV_MORE }]}
          />
          <div className="getting-started-account">
            <Avatar name={ME.name} size="small" />
            <span>
              <strong>{ME.name}</strong>
              <span className="getting-started-quiet">{WORKSPACE}</span>
            </span>
          </div>
        </div>
        <div className="getting-started-top">
          <SiteHeader brand={<Brand />} brandHref="/" brandLabel={`${PRODUCT}, home`} value="home" items={[...NAV, ...NAV_MORE].map(({ value, label, href }) => ({ value, label, href }))} avatar={<Avatar name={ME.name} size="small" />} />
        </div>

        <main className="getting-started-main" id="getting-started-main" tabIndex={-1}>
          <PageHeader
            surface={false}
            headingLevel={1}
            title={<span ref={heading} tabIndex={-1} className="getting-started-focus">Good morning, {ME.first}</span>}
            description={`${TODAY}. ${finished ? `${WORKSPACE} is all set up.` : `${WORKSPACE} is brand new, so start here.`}`}
            actions={<Button href="/docs/new"><Plus /> New doc</Button>}
          />
          <div className="getting-started-grid">
            <div className="getting-started-column">
              {hidden ? today : (
                <Card
                  ref={checklist}
                  tabIndex={-1}
                  className="getting-started-checklist getting-started-focus"
                  title={finished ? `${WORKSPACE} is set up` : `Get ${WORKSPACE} set up`}
                  headingLevel={2}
                  description={
                    finished
                      ? `${doneCount === TASKS.length ? 'Every step is done.' : `${doneCount} done, ${TASKS.length - doneCount} skipped.`} Nice work.`
                      : `${doneCount} of ${TASKS.length} done. About ${left.reduce((sum, item) => sum + item.minutes, 0)} minutes to go.`
                  }
                  divided={finished}
                  footer={finished ? (
                    <div className="getting-started-footer">
                      <span className="getting-started-quiet">You can still open any step from here.</span>
                      <Button variant="outline" size="small" onClick={hide}>Hide checklist</Button>
                    </div>
                  ) : undefined}
                >
                  <Stack gap={4}>
                    <Progress className="getting-started-progress" label="Setup progress" value={(doneCount / TASKS.length) * 100} showValue={false} />
                    <List
                      label="Setup steps"
                      divided
                      items={TASKS.map((item) => ({
                        id: item.id,
                        label: item.label,
                        description: status[item.id] === 'done' ? item.done : item.todo,
                        leading: status[item.id] === 'done' ? <CircleCheck className="getting-started-check" /> : status[item.id] === 'skipped' ? <CircleDashed /> : <Circle />,
                        trailing: status[item.id] === 'done' ? <Tag tone="success" size="small">Done</Tag>
                          : status[item.id] === 'skipped' ? <Tag size="small">Skipped</Tag>
                          : <span className="getting-started-quiet">{item.minutes} min</span>,
                        onSelect: () => setOpen(item.id),
                      }))}
                    />
                  </Stack>
                </Card>
              )}
            </div>
            <div className="getting-started-column">
              {!hidden && today}
              <Card title="Need a hand?" headingLevel={2} description="A person answers, usually within the hour." footer={<Button variant="outline" size="small" href="/support"><MessageCircle /> Message support</Button>}>
                <Stack gap={3}>
                  <TextLink href="/guides/getting-started" leadingIcon={<BookOpen />}>The five-minute guide</TextLink>
                  <TextLink href="/templates" leadingIcon={<ArrowUpRight />}>Browse more templates</TextLink>
                  {hidden && <LinkButton icon={<ListChecks />} onClick={show}>Show the setup checklist</LinkButton>}
                </Stack>
              </Card>
            </div>
          </div>
        </main>

        {task && <TaskDrawer task={task} status={status[task.id]} onClose={() => setOpen(undefined)} onSettle={(to) => settle(task, to)} />}
        {notice && (
          <Toast key={notice.id} tone="success" title={notice.title} onDismiss={() => setNotice(undefined)} duration={5000}>
            {notice.text}
          </Toast>
        )}
      </div>
    </LucideProvider>
  )
}

type DrawerProps = { task: Task; status: Status; onClose: () => void; onSettle: (status: Status) => void }

function TaskDrawer({ task, status, onClose, onSettle }: DrawerProps) {
  const [busy, setBusy] = useState<Status>()
  const [calendar, setCalendar] = useState('google')
  const [link, setLink] = useState('')
  const [error, setError] = useState<string>()
  const [alerts, setAlerts] = useState({ mentions: true, digest: true, weekly: false })
  const linkField = useRef<HTMLInputElement>(null)
  const focus = useFocusAfterRender()

  async function save(to: Status) {
    const ical = to === 'done' && task.id === 'calendar' && calendar === 'ical'
    if (ical && !link.trim()) {
      setError('Paste your calendar’s iCal link.')
      return focus(linkField.current)
    }
    setBusy(to)
    if (ical && !(await api('/calendar/connect', { provider: calendar, link }))) {
      setBusy(undefined)
      setError('We couldn’t find a calendar at that link. iCal links end in .ics.')
      return focus(linkField.current)
    }
    await api(`/setup/${to}`, { task: task.id, calendar, alerts })
    onSettle(to)
  }

  const footer: ReactNode = status === 'done'
    ? task.link && <Button variant="outline" href={task.link.href}>{task.link.label}</Button>
    : (
      <div className="getting-started-actions">
        <Button loading={busy === 'done'} disabled={busy !== undefined && busy !== 'done'} onClick={() => save('done')}>{task.action}</Button>
        {status === 'skipped'
          ? <Button variant="quiet" loading={busy === 'todo'} disabled={busy === 'done'} onClick={() => save('todo')}>Put it back on the list</Button>
          : <Button variant="quiet" loading={busy === 'skipped'} disabled={busy === 'done'} onClick={() => save('skipped')}>Skip for now</Button>}
      </div>
    )

  return (
    <Drawer open onOpenChange={(next) => !next && !busy && onClose()} title={task.label} headingLevel={2}
      description={status === 'done' ? 'Done.' : status === 'skipped' ? 'Skipped for now.' : `About ${task.minutes} ${task.minutes === 1 ? 'minute' : 'minutes'}.`}
      footer={footer}>
      <div className="getting-started-drawer">
        <p className="getting-started-text">{task.intro}</p>
        {status !== 'done' && task.steps && (
          <ol className="getting-started-steps">
            {task.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        )}
        {status !== 'done' && task.id === 'calendar' && (
          <Stack gap={4}>
            <Choice label="Which calendar?" value={calendar} onValueChange={(value) => { setCalendar(value); setError(undefined) }}
              options={[{ value: 'google', label: 'Google Calendar' }, { value: 'outlook', label: 'Outlook' }, { value: 'ical', label: 'Another one, by its iCal link' }]} />
            {calendar === 'ical' && (
              <TextInput ref={linkField} label="iCal link" type="url" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://…/calendar.ics"
                value={link} error={error} onValueChange={(value) => { setLink(value); setError(undefined) }} />
            )}
          </Stack>
        )}
        {status !== 'done' && task.id === 'alerts' && (
          <Stack gap={4}>
            <Switch label="Mentions and replies" helperText="Right away, so nobody waits on you." checked={alerts.mentions} onCheckedChange={(on) => setAlerts({ ...alerts, mentions: on })} />
            <Switch label="Daily digest" helperText="Everything else, once a day at 9 AM." checked={alerts.digest} onCheckedChange={(on) => setAlerts({ ...alerts, digest: on })} />
            <Switch label="Weekly summary" helperText="What changed across the workspace, on Fridays." checked={alerts.weekly} onCheckedChange={(on) => setAlerts({ ...alerts, weekly: on })} />
          </Stack>
        )}
      </div>
    </Drawer>
  )
}

function useFocusAfterRender() {
  const [target, setTarget] = useState<{ node: HTMLElement | null }>()
  useEffect(() => target?.node?.focus(), [target])
  return (node: HTMLElement | null) => setTarget({ node })
}

function Brand() {
  return (
    <span className="getting-started-brand">
      <span className="getting-started-mark" aria-hidden="true">{PRODUCT[0]}</span>
      {PRODUCT}
    </span>
  )
}

function LinkButton(props: { icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <TextLink asChild leadingIcon={props.icon}>
      <button type="button" className="getting-started-link" onClick={props.onClick}>{props.children}</button>
    </TextLink>
  )
}

const css = `
.getting-started { min-height: 100dvh; display: grid; grid-template-columns: 248px minmax(0, 1fr); color: var(--diya-color-text); }
.getting-started-skip {
  position: absolute; z-index: 50; top: 12px; left: 16px; padding: 10px 16px;
  border-radius: calc(10px * var(--diya-corner-scale, 1)); background: var(--diya-color-raised); color: var(--diya-color-text); font-size: var(--diya-text-body);
}
.getting-started-skip:not(:focus) { width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.getting-started-side {
  position: sticky; top: 0; height: 100dvh; display: flex; flex-direction: column;
  border-right: 1px solid var(--diya-color-line);
}
.getting-started[data-glass] .getting-started-side {
  top: 12px; height: calc(100dvh - 24px); margin: 12px 0 12px 12px; overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--diya-color-text) 10%, transparent);
  border-radius: calc(18px * var(--diya-corner-scale, 1));
  background: color-mix(in srgb, var(--diya-color-raised) 62%, transparent);
  backdrop-filter: blur(28px) saturate(1.15);
}
.getting-started-nav { flex: 1; width: auto; border: 0; border-radius: 0; background: none; backdrop-filter: none; box-shadow: none; }
.getting-started-brand { display: inline-flex; align-items: center; gap: var(--diya-space-3); font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; }
.getting-started-mark {
  display: grid; place-items: center; width: 28px; height: 28px;
  border-radius: calc(9px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text);
  font-size: var(--diya-text-body); font-weight: 650; line-height: 1;
}
.getting-started-account { display: flex; align-items: center; gap: var(--diya-space-3); padding: var(--diya-space-4) var(--diya-space-5) var(--diya-space-5); border-top: 1px solid var(--diya-color-line); font-size: var(--diya-text-caption); }
.getting-started-account > span { display: grid; min-width: 0; }
.getting-started-quiet { color: var(--diya-color-muted); font-size: var(--diya-text-caption); white-space: nowrap; }
.getting-started-top { display: none; }
.getting-started-main { display: grid; align-content: start; gap: var(--diya-space-6); width: 100%; max-width: 1200px; padding: var(--diya-space-7) var(--diya-space-7) var(--diya-space-8); }
.getting-started-main:focus,
.getting-started-focus:focus { outline: none; }
.getting-started-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: var(--diya-space-5); align-items: start; }
.getting-started-column { display: grid; gap: var(--diya-space-5); min-width: 0; }
.getting-started-checklist .getting-started-progress { width: 100%; }
.getting-started-check { color: var(--diya-color-success); }
.getting-started-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-3); }
.getting-started-link { padding: 0; border: 0; background: none; font: inherit; text-align: start; cursor: pointer; }
.getting-started-drawer { display: grid; gap: var(--diya-space-5); }
.getting-started-text { margin: 0; color: var(--diya-color-text); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.getting-started-steps { display: grid; gap: var(--diya-space-3); margin: 0; padding-inline-start: var(--diya-space-5); color: var(--diya-color-text); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.getting-started-steps li::marker { color: var(--diya-color-muted); font-variant-numeric: tabular-nums; }
.getting-started-actions { display: flex; flex-wrap: wrap; gap: var(--diya-space-3); }
@media (prefers-reduced-transparency: reduce) {
  .getting-started[data-glass] .getting-started-side { background: var(--diya-color-raised); backdrop-filter: none; }
}
@media (max-width: 1100px) {
  .getting-started-main { padding-inline: var(--diya-space-6); }
  .getting-started-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 860px) {
  .getting-started { grid-template-columns: minmax(0, 1fr); }
  .getting-started-side { display: none; }
  .getting-started-top { display: block; position: sticky; top: 0; z-index: 20; }
  .getting-started-main { padding: var(--diya-space-5) var(--diya-space-4) var(--diya-space-7); }
}
`

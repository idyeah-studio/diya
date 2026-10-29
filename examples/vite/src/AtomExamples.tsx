import { useRef, useState } from 'react'
import {
  Accordion,
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Choice,
  Combobox,
  DatePicker,
  Dialog,
  List,
  Menu,
  Metric,
  Pagination,
  Popover,
  Progress,
  Search,
  Select,
  Slider,
  Switch,
  Tabs,
  Tag,
  TextArea,
  TextInput,
  TextLink,
  Tooltip,
  type DateRange,
  type Tone,
} from '@idyeah/diya'
import { initialProjects, priorityOptions, teamOptions, type ComponentId } from './data'
import { Glyph, Result } from './shared'

export function AtomExamples({ id }: { id: ComponentId }) {
  const [text, setText] = useState(
    id === 'text-input' ? 'Website launch' : id === 'avatar' ? 'Morgan Lee' : ''
  )
  const [count, setCount] = useState(id === 'metric' ? 32 : id === 'progress' ? 60 : 7)
  const [checked, setChecked] = useState(false)
  const [alternate, setAlternate] = useState(false)
  const [selected, setSelected] = useState(
    id === 'tabs' ? 'overview' : id === 'choice' ? 'design' : id === 'avatar' ? 'online' : 'normal'
  )
  const [values, setValues] = useState<string[]>([])
  const [date, setDate] = useState('')
  const [dates, setDates] = useState<DateRange>({ start: '', end: '' })
  const [team, setTeam] = useState('')
  const [range, setRange] = useState<[number, number]>([30, 70])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [notice, setNotice] = useState('')
  const [inspectedProject, setInspectedProject] = useState<(typeof initialProjects)[number] | null>(
    null
  )
  const [tags, setTags] = useState(['Design', 'Planning', 'Research'])
  const [tone, setTone] = useState<Tone>('brand')
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
  const tagArea = useRef<HTMLDivElement>(null)
  const restoreTags = useRef<HTMLButtonElement>(null)
  function removeTag(tag: string) {
    const buttons = Array.from(tagArea.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    setTags((items) => items.filter((item) => item !== tag))
    requestAnimationFrame(() => {
      const remaining = tagArea.current?.querySelectorAll<HTMLButtonElement>('button')
      if (remaining?.length) remaining[Math.min(Math.max(index, 0), remaining.length - 1)].focus()
      else restoreTags.current?.focus()
    })
  }
  const [placement, setPlacement] = useState<'top' | 'bottom' | 'left' | 'right'>('top')

  switch (id) {
    case 'button':
      return (
        <div className="example-stack">
          <div className="demo-controls">
            <Select
              label="Size"
              options={['small', 'medium', 'large'].map((value) => ({ value, label: value }))}
              value={size}
              onValueChange={(value) => setSize(value as typeof size)}
            />
            <Switch label="Pill shape" checked={checked} onCheckedChange={setChecked} />
            <Switch label="Loading state" checked={alternate} onCheckedChange={setAlternate} />
          </div>
          <div className="example-row">
            {(['solid', 'outline', 'quiet'] as const).map((variant) => (
              <Button
                key={variant}
                size={size}
                shape={checked ? 'pill' : 'rounded'}
                variant={variant}
                onClick={() => setCount((value) => value + 1)}
              >
                {variant[0].toUpperCase() + variant.slice(1)}
              </Button>
            ))}
            <Button size={size} disabled>
              Disabled
            </Button>
            <Button size={size} loading={alternate} onClick={() => setCount((value) => value + 1)}>
              Action
            </Button>
            <Button
              size={size}
              iconOnly
              aria-label="Add one"
              onClick={() => setCount((value) => value + 1)}
            >
              <Glyph />
            </Button>
          </div>
          <Result>Action count: {count}</Result>
        </div>
      )
    case 'text-input':
      return (
        <div className="example-stack example-narrow">
          <TextInput
            label="Project name"
            value={text}
            onValueChange={setText}
            clearable
            required
            helperText="Give your project a recognizable name."
            error={checked && !text.trim() ? 'Enter a project name.' : undefined}
          />
          <Button variant="outline" shape="pill" onClick={() => setChecked(true)}>
            Validate
          </Button>
          <Result>
            {checked
              ? text.trim()
                ? `Valid name: ${text.trim()}`
                : 'A project name is required.'
              : `Current value: ${text || 'Empty'}`}
          </Result>
        </div>
      )
    case 'text-area':
      return (
        <div className="example-stack example-narrow">
          <TextArea
            label="Project notes"
            value={text}
            onValueChange={setText}
            rows={4}
            maxLength={500}
            showCount
            helperText="Add a little context for your team."
          />
          <Button variant="quiet" shape="pill" onClick={() => setText('')}>
            Clear notes
          </Button>
          <Result>{text.length} characters entered.</Result>
        </div>
      )
    case 'select':
      return (
        <div className="example-stack example-narrow">
          <Select
            label="Priority"
            options={priorityOptions}
            value={selected}
            onValueChange={setSelected}
            helperText="Choose the urgency of the work."
          />
          <Result>
            Priority: {priorityOptions.find((option) => option.value === selected)?.label}
          </Result>
        </div>
      )
    case 'date-picker':
      return (
        <div className="example-stack example-narrow">
          <Switch
            label="Date range"
            checked={checked}
            onCheckedChange={(value) => {
              setChecked(value)
              setDates({ start: '', end: '' })
            }}
          />
          {checked ? (
            <DatePicker
              label="Reporting period"
              range
              value={dates}
              onValueChange={setDates}
              helperText="Choose dates from the calendar."
            />
          ) : (
            <DatePicker
              label="Due date"
              value={date}
              onValueChange={setDate}
              helperText="Choose a date from the calendar."
            />
          )}
          <Button
            variant="quiet"
            shape="pill"
            onClick={() => {
              setDate('')
              setDates({ start: '', end: '' })
            }}
          >
            Clear dates
          </Button>
          <Result>
            {checked
              ? dates.start
                ? `${dates.start}${dates.end ? ` to ${dates.end}` : ''}`
                : 'No dates selected.'
              : date || 'No date selected.'}
          </Result>
        </div>
      )
    case 'combobox':
      return (
        <div className="example-stack example-narrow">
          <div className="example-row">
            <Switch
              label="Multiple selection"
              checked={checked}
              onCheckedChange={(value) => {
                setChecked(value)
                setValues([])
              }}
            />
            <Switch label="Disabled" checked={alternate} onCheckedChange={setAlternate} />
          </div>
          {checked ? (
            <Combobox
              label="Teams"
              options={teamOptions}
              multiple
              value={values}
              onValueChange={setValues}
              disabled={alternate}
              helperText="Search by team name. Archived team is unavailable."
            />
          ) : (
            <Combobox
              label="Team"
              options={teamOptions}
              value={team}
              onValueChange={setTeam}
              disabled={alternate}
              helperText="Search by team name. Archived team is unavailable."
            />
          )}
          <Result>
            {(checked ? values : team ? [team] : []).length
              ? `Selected: ${(checked ? values : [team]).map((value) => teamOptions.find((option) => option.value === value)?.label).join(', ')}`
              : 'No team selected.'}
          </Result>
        </div>
      )
    case 'choice':
      return (
        <div className="example-stack example-narrow">
          <Switch label="Multiple selection" checked={checked} onCheckedChange={setChecked} />
          {checked ? (
            <Choice
              multiple
              value={values}
              onValueChange={setValues}
              label="Teams"
              options={teamOptions}
              selectAll
            />
          ) : (
            <Choice
              value={selected}
              onValueChange={setSelected}
              label="Team"
              options={teamOptions}
            />
          )}
          <Result>Selection: {checked ? values.join(', ') || 'None' : selected}</Result>
        </div>
      )
    case 'switch':
      return (
        <div className="example-stack example-narrow">
          <Switch
            label="Project updates"
            helperText="Show updates in this example."
            checked={checked}
            onCheckedChange={setChecked}
          />
          <Result>Project updates are {checked ? 'on' : 'off'}.</Result>
        </div>
      )
    case 'slider':
      return (
        <div className="example-stack example-narrow">
          <Switch label="Range selection" checked={checked} onCheckedChange={setChecked} />
          {checked ? (
            <Slider label="Capacity" range value={range} onValueChange={setRange} step={5} showMarks />
          ) : (
            <Slider
              label="Capacity"
              value={range[0]}
              onValueChange={(value) => setRange([value, range[1]])}
              step={5}
              showMarks
            />
          )}
          <Result>Capacity: {checked ? `${range[0]}–${range[1]}` : range[0]}%</Result>
        </div>
      )
    case 'search': {
      const matches = initialProjects.filter((project) =>
        project.name.toLowerCase().includes(text.trim().toLowerCase())
      )
      return (
        <div className="example-stack example-narrow">
          <Search
            label="Search projects"
            hideLabel
            placeholder="Search"
            value={text}
            onValueChange={setText}
            clearable
          />
          <List
            label="Matching projects"
            items={matches.map((project) => ({
              id: project.id,
              label: project.name,
              description: project.owner,
            }))}
            divided
          />
          <Result>{matches.length} projects found.</Result>
        </div>
      )
    }
    case 'link':
      return (
        <div className="example-stack example-narrow">
          <p>
            Read the{' '}
            <TextLink href="#link-detail" inline onClick={() => setNotice('Details opened.')}>
              project details
            </TextLink>{' '}
            or{' '}
            <TextLink href="#link-detail" trailingIcon={<Glyph kind="check" />}>
              jump to the detail section
            </TextLink>
            .
          </p>
          <section id="link-detail" tabIndex={-1} className="example-detail">
            <h3>Project details</h3>
            <p>The linked section is part of this page.</p>
          </section>
          <Result>{notice}</Result>
        </div>
      )
    case 'pagination': {
      const records = Array.from({ length: 23 }, (_, index) => ({
        id: `record-${index}`,
        label: `Project ${index + 1}`,
      }))
      return (
        <div className="example-stack">
          <List
            label="Current page"
            items={records.slice((page - 1) * pageSize, page * pageSize)}
            divided
          />
          <Pagination
            page={page}
            total={records.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value)
              setPage(1)
            }}
          />
          <Result>
            Page {page}, {pageSize} results per page.
          </Result>
        </div>
      )
    }
    case 'tabs':
      return (
        <div className="example-stack">
          <Tabs
            label="Project sections"
            value={selected}
            onValueChange={setSelected}
            items={[
              {
                value: 'overview',
                label: 'Overview',
                content: <p>Seven projects and their current status.</p>,
              },
              {
                value: 'activity',
                label: 'Activity',
                badge: { variant: 'count', count, label: 'updates', tone: 'brand' },
                content: (
                  <div className="example-stack">
                    <p>{count} updates in this example.</p>
                    <Button shape="pill" onClick={() => setCount((value) => value + 1)}>
                      Add an update
                    </Button>
                  </div>
                ),
              },
              {
                value: 'files',
                label: 'Files',
                content: <p>No files have been selected in this example.</p>,
              },
              { value: 'locked', label: 'Archived', disabled: true, content: null },
            ]}
          />
          <Result>Current section: {selected}</Result>
        </div>
      )
    case 'breadcrumbs': {
      const path = [
        { label: 'Library', href: 'library' },
        { label: 'Projects', href: 'projects' },
        { label: 'Website launch', href: 'launch' },
      ]
      const position = selected === 'library' ? 0 : selected === 'projects' ? 1 : 2
      return (
        <div className="example-stack">
          <Breadcrumbs
            items={path.slice(0, position + 1)}
            showHomeIcon
            onNavigate={(item) => setSelected(item.href)}
          />
          <h3>{path[position].label}</h3>
          <p>
            {position === 0
              ? 'Browse the library.'
              : position === 1
                ? 'A list of your projects.'
                : 'The current project and its details.'}
          </p>
          {position < 2 && (
            <Button shape="pill" onClick={() => setSelected(path[position + 1].href)}>
              Open {path[position + 1].label}
            </Button>
          )}
          <Result>Current location: {path[position].label}</Result>
        </div>
      )
    }
    case 'menu': {
      const matches = initialProjects.filter((project) => checked || project.status !== 'Complete')
      return (
        <div className="example-stack example-narrow">
          <Menu
            label="Project options"
            items={[
              {
                id: 'completed',
                label: 'Show completed',
                type: 'checkbox',
                checked,
                onSelect: () => setChecked((value) => !value),
              },
              {
                id: 'reset',
                label: 'Reset filter',
                separatorBefore: true,
                onSelect: () => setChecked(false),
              },
              {
                id: 'unavailable',
                label: 'Unavailable action',
                disabled: true,
                onSelect: () => {},
              },
            ]}
          />
          <List
            label="Visible projects"
            items={matches.map((project) => ({
              id: project.id,
              label: project.name,
              description: project.status,
            }))}
            divided
          />
          <Result>{matches.length} visible projects.</Result>
        </div>
      )
    }
    case 'tag':
      return (
        <div className="example-stack">
          <div className="example-row" ref={tagArea}>
            {tags.map((tag) => (
              <Tag
                key={tag}
                label={tag}
                tone={tag === 'Design' ? 'brand' : 'neutral'}
                leading="dot"
                onRemove={() => removeTag(tag)}
              >
                {tag}
              </Tag>
            ))}
          </div>
          <Button
            ref={restoreTags}
            shape="pill"
            variant="outline"
            onClick={() => {
              setTags(['Design', 'Planning', 'Research'])
              requestAnimationFrame(() =>
                tagArea.current?.querySelector<HTMLButtonElement>('button')?.focus()
              )
            }}
          >
            Restore tags
          </Button>
          <Result>{tags.length} tags remain.</Result>
        </div>
      )
    case 'metric':
      return (
        <div className="example-stack example-narrow">
          <Metric
            label="Completed tasks"
            value={String(count)}
            unit="tasks"
            size="large"
            change={{
              value: `${Math.abs(count - 30)}`,
              direction: count === 30 ? 'flat' : count > 30 ? 'up' : 'down',
              meaning: count === 30 ? 'neutral' : count > 30 ? 'positive' : 'negative',
              comparison: 'compared with 30',
            }}
          />
          <div className="example-row">
            <Button
              variant="outline"
              shape="pill"
              disabled={count === 0}
              onClick={() => setCount((value) => Math.max(0, value - 1))}
            >
              Remove one
            </Button>
            <Button shape="pill" onClick={() => setCount((value) => value + 1)}>
              Complete one
            </Button>
          </div>
          <Result>{count} completed tasks in this example.</Result>
        </div>
      )
    case 'avatar':
      return (
        <div className="example-stack example-narrow">
          <TextInput label="Name" value={text} onValueChange={setText} />
          <Select
            label="Status"
            value={selected}
            onValueChange={setSelected}
            options={['online', 'away', 'busy'].map((value) => ({ value, label: value }))}
          />
          <div className="example-row">
            {(['small', 'medium', 'large'] as const).map((avatarSize) => (
              <Avatar
                key={avatarSize}
                name={text}
                size={avatarSize}
                status={selected as 'online' | 'away' | 'busy'}
              />
            ))}
          </div>
          <Result>
            {text || 'User'} is {selected}.
          </Result>
        </div>
      )
    case 'list':
      return (
        <div className="example-stack">
          <List
            label="Projects"
            items={initialProjects.slice(0, 4).map((project) => ({
              id: project.id,
              label: project.name,
              description: project.owner,
              trailing: (
                <Tag
                  label={project.status}
                  tone={
                    project.status === 'Complete'
                      ? 'success'
                      : project.status === 'In review'
                        ? 'warning'
                        : 'info'
                  }
                >
                  {project.status}
                </Tag>
              ),
              onSelect: () => setInspectedProject(project),
            }))}
            divided
          />
          <Dialog
            open={inspectedProject !== null}
            onOpenChange={(open) => {
              if (!open) setInspectedProject(null)
            }}
            title={inspectedProject?.name ?? 'Project details'}
          >
            <p>Owner: {inspectedProject?.owner}</p>
            <p>Status: {inspectedProject?.status}</p>
            <p>Tasks: {inspectedProject?.tasks}</p>
          </Dialog>
        </div>
      )
    case 'accordion':
      return (
        <div className="example-stack">
          <Switch label="Open multiple sections" checked={checked} onCheckedChange={setChecked} />
          <Accordion
            multiple={checked}
            items={[
              {
                id: 'setup',
                label: 'What is included?',
                content: <p>Reusable components, patterns and this standalone example.</p>,
              },
              {
                id: 'data',
                label: 'Where do changes go?',
                content: (
                  <p>Each example holds its own local state. Nothing is sent to a service.</p>
                ),
              },
              {
                id: 'appearance',
                label: 'How do appearances work?',
                content: <p>Light and Dark work with the independent Glass control above.</p>,
              },
            ]}
          />
        </div>
      )
    case 'badge':
      return (
        <div className="example-stack example-narrow">
          <Select
            label="Tone"
            value={tone}
            onValueChange={(value) => setTone(value as Tone)}
            options={['neutral', 'brand', 'success', 'warning', 'error', 'info'].map((value) => ({
              value,
              label: value,
            }))}
          />
          <Switch label="Show zero" checked={checked} onCheckedChange={setChecked} />
          <div className="example-row">
            <Badge
              variant="count"
              label="notifications"
              count={count}
              max={99}
              showZero={checked}
              tone={tone}
              size="large"
            />
            <Badge variant="dot" label="Status indicator" tone={tone} size="large" />
            <Button
              variant="outline"
              shape="pill"
              disabled={count === 0}
              onClick={() => setCount((value) => Math.max(0, value - 1))}
            >
              Decrease
            </Button>
            <Button shape="pill" onClick={() => setCount((value) => value + 1)}>
              Increase
            </Button>
            <Button variant="quiet" shape="pill" onClick={() => setCount(0)}>
              Clear
            </Button>
          </div>
          <Result>{count} notifications.</Result>
        </div>
      )
    case 'alert':
      return (
        <div className="example-stack">
          <Select
            label="Tone"
            value={tone === 'neutral' ? 'info' : tone}
            onValueChange={(value) => setTone(value as Tone)}
            options={['info', 'success', 'warning', 'error', 'brand'].map((value) => ({
              value,
              label: value,
            }))}
          />
          {!checked ? (
            <Alert
              tone={tone === 'neutral' ? 'info' : tone}
              title={`${count} tasks selected`}
              onDismiss={() => setChecked(true)}
              action={{ label: 'Clear selection', onClick: () => setCount(0) }}
            >
              Choose an action for the current selection.
            </Alert>
          ) : (
            <Button
              variant="outline"
              shape="pill"
              onClick={() => {
                setChecked(false)
                setCount(3)
              }}
            >
              Show alert
            </Button>
          )}
          <Result>{checked ? 'Alert dismissed.' : `${count} tasks selected.`}</Result>
        </div>
      )
    case 'progress':
      return (
        <div className="example-stack example-narrow">
          <div className="example-row">
            <Switch label="Circular" checked={checked} onCheckedChange={setChecked} />
            <Switch label="Indeterminate" checked={alternate} onCheckedChange={setAlternate} />
          </div>
          <Progress
            label="Example progress"
            value={alternate ? undefined : count}
            variant={checked ? 'circular' : 'linear'}
          />
          <div className="example-row">
            <Button
              variant="outline"
              shape="pill"
              disabled={count === 0}
              onClick={() => setCount((value) => Math.max(0, value - 10))}
            >
              Decrease
            </Button>
            <Button
              shape="pill"
              disabled={count === 100}
              onClick={() => setCount((value) => Math.min(100, value + 10))}
            >
              Increase
            </Button>
          </div>
          <Result>{alternate ? 'Indeterminate state selected.' : `${count}%`}</Result>
        </div>
      )
    case 'tooltip':
      return (
        <div className="example-stack example-narrow">
          <Select
            label="Position"
            value={placement}
            onValueChange={(value) => setPlacement(value as typeof placement)}
            options={['top', 'bottom', 'left', 'right'].map((value) => ({ value, label: value }))}
          />
          <div className="example-row">
            <Tooltip
              label="About local changes"
              content="Changes stay in this example."
              placement={placement}
            >
              <Glyph kind="info" />
            </Tooltip>
            <p>Focus or hover over the information button.</p>
          </div>
        </div>
      )
    case 'popover':
      return (
        <div className="example-stack example-narrow">
          <Popover label="Preferences">
            {(close) => (
              <div className="example-stack">
                <h3>Display preferences</h3>
                <Switch label="Compact layout" checked={checked} onCheckedChange={setChecked} />
                <Button shape="pill" onClick={close}>
                  Done
                </Button>
              </div>
            )}
          </Popover>
          <Result>Compact layout is {checked ? 'on' : 'off'}.</Result>
        </div>
      )
  }
}

// Every aria-* attribute DIYA renders is one WAI-ARIA defines: a misspelt or invented one, such as
// aria-loading, is silently ignored by assistive technology and draws React's "Invalid aria prop" warning.
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import * as core from '../dist/index.js'

const {
  Accordion, Alert, Avatar, Badge, Breadcrumbs, Button, Card, Chatbot, Choice, Combobox, ContentState, DatePicker, Dialog,
  DiyaProvider, Drawer, FileUpload, Form, Inline, List, Menu, Metric, PageHeader, Pagination, Popover, Progress, Search,
  Select, SideNavigation, SiteHeader, Slider, Stack, Switch, Table, Tabs, Tag, TextArea, TextInput, TextLink, Toast, Tooltip, Wizard,
} = core

/** WAI-ARIA 1.2 states and properties, plus aria-description and the braille pair from 1.3. */
const ARIA = new Set([
  'activedescendant', 'atomic', 'autocomplete', 'braillelabel', 'brailleroledescription', 'busy', 'checked', 'colcount',
  'colindex', 'colindextext', 'colspan', 'controls', 'current', 'describedby', 'description', 'details', 'disabled',
  'dropeffect', 'errormessage', 'expanded', 'flowto', 'grabbed', 'haspopup', 'hidden', 'invalid', 'keyshortcuts', 'label',
  'labelledby', 'level', 'live', 'modal', 'multiline', 'multiselectable', 'orientation', 'owns', 'placeholder', 'posinset',
  'pressed', 'readonly', 'relevant', 'required', 'roledescription', 'rowcount', 'rowindex', 'rowindextext', 'rowspan',
  'selected', 'setsize', 'sort', 'valuemax', 'valuemin', 'valuenow', 'valuetext',
].map((name) => `aria-${name}`))

function unknownAria(root: ParentNode) {
  const found = new Set<string>()
  for (const element of root.querySelectorAll('*')) {
    for (const { name } of element.attributes) if (name.startsWith('aria-') && !ARIA.has(name)) found.add(`${element.tagName.toLowerCase()} ${name}`)
  }
  return [...found]
}
function invalidAriaWarnings(spy: { mock: { calls: unknown[][] } }) {
  return spy.mock.calls.map((call) => call.map(String).join(' ')).filter((text) => /aria/i.test(text) && /invalid|unknown/i.test(text))
}

const noop = () => {}
const chat = (props: Partial<core.ChatbotProps> = {}) => (
  <Chatbot title="Assistant" messages={[{ id: '1', role: 'user', text: 'Hello' }]} value="Draft" onValueChange={noop} onSend={noop}
    onStop={noop} onRetry={noop} onAttachmentsChange={noop} attachments={[new File(['a'], 'brief.txt')]} notice="Replies can be wrong."
    showTimestamps suggestions={['Plan the week']} {...props} />
)

function Gallery({ children }: { children?: ReactNode }) {
  type Row = { id: string; name: string }
  return <DiyaProvider>
    <PageHeader title="Projects" description="All work" breadcrumbs={<Breadcrumbs items={[{ label: 'Home', href: '#' }]} />} />
    <SiteHeader brand="Acme" value="docs" items={[{ value: 'docs', label: 'Docs', href: '#docs' }, { value: 'blog', label: 'Blog' }]} search={{ label: 'Search', value: '', onValueChange: noop }} />
    <SideNavigation value="inbox" groups={[{ id: 'mail', label: 'Mail', items: [{ value: 'inbox', label: 'Inbox', count: 3, href: '#inbox' }, { value: 'sent', label: 'Sent' }] }]} />
    <SideNavigation value="inbox" collapsed groups={[{ id: 'mail', items: [{ value: 'inbox', label: 'Inbox', count: 3 }] }]} />
    <Stack><Inline><Button loading>Save</Button><Button iconOnly aria-label="Close">×</Button><TextLink href="#">Docs</TextLink></Inline></Stack>
    <Breadcrumbs items={[{ label: 'Home', href: '#' }, { label: 'Projects', href: '#p' }]} showHomeIcon />
    <Tabs label="Views" value="one" onValueChange={noop} items={[{ value: 'one', label: 'One', content: 'First' }, { value: 'two', label: 'Two', content: 'Second', disabled: true }]} />
    <Tag label="Paid" tone="success" onRemove={noop}>Paid</Tag>
    <Badge variant="count" count={150} label="messages" /><Badge variant="dot" label="New" />
    <TextInput label="Name" value="" onValueChange={noop} helperText="Your full name" error="Required" required />
    <TextArea label="Notes" value="" onValueChange={noop} showCount maxLength={200} />
    <Select label="Plan" value="a" onValueChange={noop} options={[{ value: 'a', label: 'A' }]} />
    <DatePicker label="Due" value="" onValueChange={noop} />
    <Combobox label="Team" value="" onValueChange={noop} options={[{ value: 'd', label: 'Design' }]} />
    <Combobox label="Teams" multiple value={['d']} onValueChange={noop} options={[{ value: 'd', label: 'Design' }]} />
    <Choice label="Size" value="s" onValueChange={noop} options={[{ value: 's', label: 'Small', description: 'Fits most' }]} />
    <Choice label="Days" multiple selectAll value={[]} onValueChange={noop} options={[{ value: 'm', label: 'Monday' }]} />
    <Switch label="Alerts" checked onCheckedChange={noop} helperText="Email me" />
    <Slider label="Volume" value={40} onValueChange={noop} />
    <Slider label="Range" range value={[20, 60]} onValueChange={noop} />
    <Search label="Search projects" value="q" onValueChange={noop} clearable />
    <Pagination page={2} total={60} pageSize={10} onPageChange={noop} />
    <Menu label="Actions" items={[{ id: 'a', label: 'Archive' }, { id: 'b', type: 'checkbox', label: 'Pinned', checked: true }]} />
    <Metric label="Revenue" value="$12k" change={{ value: '4%', direction: 'up', meaning: 'positive' }} />
    <Avatar name="Ana Ruiz" status="online" />
    <List label="Inbox" items={[{ id: 'a', label: 'Plan', current: true, onSelect: noop }, { id: 'b', label: 'Review', unread: true }]} />
    <Accordion items={[{ id: 'a', label: 'One', content: 'First' }]} />
    <Alert title="Saved" urgent onDismiss={noop}>Done</Alert>
    <Toast onDismiss={noop} title="Sent">Message sent</Toast>
    <Progress label="Upload" value={40} /><Progress label="Sync" />
    <Tooltip content="Delete the file"><Button iconOnly aria-label="Delete">×</Button></Tooltip>
    <Popover label="Filters">Filter content</Popover>
    <Card title="Atlas" description="A project">Body</Card>
    <Table<Row> label="Projects" rows={[{ id: 'a', name: 'Atlas' }]} rowLabel={(row) => row.name} searchText={(row) => row.name}
      columns={[{ key: 'name', label: 'Name', render: (row) => row.name, sortValue: (row) => row.name }]} bulkActions={[{ label: 'Archive', onAction: noop }]} onRowOpen={noop} />
    <Table<Row> label="Loading" loading rows={[]} rowLabel={(row) => row.name} columns={[{ key: 'name', label: 'Name', render: (row) => row.name }]} />
    <FileUpload files={[new File(['a'], 'a.txt')]} onFilesChange={noop} helperText="PDF only" />
    <Form title="New project" onSubmit={noop} loading><TextInput label="Title" value="" onValueChange={noop} /></Form>
    <Wizard steps={[{ id: 'a', label: 'Details', content: 'One' }, { id: 'b', label: 'Review', content: 'Two' }]} activeStep={0} onStepChange={noop} onComplete={noop} loading />
    <ContentState title="Nothing here" description="Add a project" />
    <Dialog title="Rename" open onOpenChange={noop} onConfirm={noop}>Body</Dialog>
    <Drawer title="Details" open onOpenChange={noop}>Body</Drawer>
    {chat()}
    {chat({ layout: 'floating', open: false, onOpenChange: noop })}
    {children}
  </DiyaProvider>
}

describe('ARIA attributes', () => {
  it('renders only aria-* attributes that WAI-ARIA defines, with no React warning', async () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    const view = render(<Gallery />)
    // Open the popups, so their panels are checked too.
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: /^Due/ }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('combobox', { name: 'Team' }))
    expect(unknownAria(document)).toEqual([])
    view.rerender(<Gallery>{chat({ loading: true })}{chat({ loading: true, messages: [{ id: '1', role: 'user', text: 'Hi' }, { id: '2', role: 'assistant', text: 'Writing' }] })}</Gallery>)
    expect(unknownAria(document)).toEqual([])
    expect(invalidAriaWarnings(warn)).toEqual([])
  })

  it('marks the Chatbot log busy only while a reply is being written into it', () => {
    const user = { id: '1', role: 'user' as const, text: 'Hi' }
    const reply = { id: '2', role: 'assistant' as const, text: 'Here is' }
    const view = render(<DiyaProvider>{chat({ messages: [user] })}</DiyaProvider>)
    const log = () => screen.getByRole('log', { name: 'Assistant messages' })
    expect(log().hasAttribute('aria-busy')).toBe(false)
    // Waiting: the log stays live, so "Preparing a response…" is announced.
    view.rerender(<DiyaProvider>{chat({ messages: [user], loading: true })}</DiyaProvider>)
    expect(log().hasAttribute('aria-busy')).toBe(false)
    expect(log().textContent).toContain('Preparing a response…')
    // Streaming the reply: busy, so it is read once complete.
    view.rerender(<DiyaProvider>{chat({ messages: [user, reply], loading: true })}</DiyaProvider>)
    expect(log().getAttribute('aria-busy')).toBe('true')
    view.rerender(<DiyaProvider>{chat({ messages: [user, { ...reply, text: 'Here is the plan.' }] })}</DiyaProvider>)
    expect(log().hasAttribute('aria-busy')).toBe(false)
    expect(log().hasAttribute('aria-loading')).toBe(false)
  })
})

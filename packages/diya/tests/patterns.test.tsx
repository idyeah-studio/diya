import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Accordion, Alert, Button, Dialog, DiyaProvider, Drawer, List, Table, type TableColumn, type TableProps } from '../dist/index.js'

type Project = { id: string; name: string; status: string }
const projects: Project[] = [
  { id: 'zeta project', name: 'Zeta', status: 'Active' },
  { id: 'alpha', name: 'Alpha', status: 'All' },
  { id: 'beta', name: 'Beta', status: 'Paused' },
]
const columns: TableColumn<Project>[] = [
  { key: 'name', label: 'Name', render: (row) => row.name, sortValue: (row) => row.name },
  { key: 'status', label: 'Status', render: (row) => row.status },
]

describe('customer-driven patterns', () => {
  it('sorts actual rows and treats a filter value named All separately from clearing filters', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Table label="Projects" rows={projects} columns={columns} rowLabel={(row) => row.name} searchText={(row) => row.name} filterOptions={[{ key: 'status', label: 'Status', options: ['All', 'Active', 'Paused'], getValue: (row) => row.status }]} pagination={false} /></DiyaProvider>)
    const table = screen.getByRole('table', { name: 'Projects' })
    await user.click(screen.getByRole('button', { name: 'Name' }))
    expect(within(within(table).getAllByRole('row')[1]).getByRole('cell', { name: 'Alpha' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Name' }).getAttribute('aria-sort')).toBe('ascending')
    await user.click(screen.getByRole('button', { name: 'Name' }))
    expect(within(within(table).getAllByRole('row')[1]).getByRole('cell', { name: 'Zeta' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Status' }))
    const choices = screen.getAllByRole('menuitemradio', { name: 'All' })
    await user.click(choices.find((item) => item.getAttribute('aria-checked') === 'false')!)
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(within(table).getByRole('cell', { name: 'Alpha' })).toBeTruthy()
    expect(within(table).queryByRole('cell', { name: 'Zeta' })).toBe(null)
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(within(table).getAllByRole('row')).toHaveLength(4)
  })

  it('preserves selection across a search and sends selected IDs to a bulk action, then clears the selection', async () => {
    const user = userEvent.setup()
    const selected = vi.fn()
    const archive = vi.fn()
    render(<DiyaProvider><Table label="Projects" rows={projects} columns={columns} rowLabel={(row) => row.name} searchText={(row) => row.name} pagination={false} onSelectionChange={selected} bulkActions={[{ label: 'Archive', onAction: archive }]} /></DiyaProvider>)
    expect(screen.queryByRole('button', { name: 'Archive' })).toBe(null)
    await user.click(screen.getByRole('checkbox', { name: 'Select Zeta' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), 'Alpha')
    await user.click(screen.getByRole('checkbox', { name: 'Select this page' }))
    expect(selected).toHaveBeenLastCalledWith(['zeta project', 'alpha'])
    expect(screen.getByRole('status').textContent).toBe('2 selected')
    await user.click(screen.getByRole('button', { name: 'Archive' }))
    expect(archive).toHaveBeenCalledExactlyOnceWith(['zeta project', 'alpha'])
    expect(selected).toHaveBeenLastCalledWith([])
    expect(screen.queryByRole('button', { name: 'Archive' })).toBe(null)
    expect((screen.getByRole('checkbox', { name: 'Select Alpha' }) as HTMLInputElement).checked).toBe(false)
  })

  it('applies a bulk action to one row from that row’s menu without changing the selection', async () => {
    const user = userEvent.setup()
    const selected = vi.fn()
    const archive = vi.fn()
    const remove = vi.fn()
    render(<DiyaProvider><Table label="Projects" rows={projects} columns={columns} rowLabel={(row) => row.name} searchText={(row) => row.name} pagination={false} onSelectionChange={selected}
      bulkActions={[{ label: 'Archive', onAction: archive }, { label: 'Delete', onAction: remove, destructive: true }]} /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Actions for Beta' }))
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Archive', 'Delete'])
    await user.click(screen.getByRole('menuitem', { name: 'Archive' }))
    expect(archive).toHaveBeenCalledExactlyOnceWith(['beta'])
    expect(remove).not.toHaveBeenCalled()
    expect(selected).not.toHaveBeenCalled()
  })

  it('opens a row from its menu with the default or a caller-supplied label', async () => {
    const user = userEvent.setup()
    const open = vi.fn()
    const table = (openLabel?: string) => <DiyaProvider><Table label="Projects" rows={projects} columns={columns} rowLabel={(row) => row.name} searchText={(row) => row.name} pagination={false} onRowOpen={open} openLabel={openLabel} /></DiyaProvider>
    const view = render(table())
    await user.click(screen.getByRole('button', { name: 'Actions for Alpha' }))
    await user.click(screen.getByRole('menuitem', { name: 'View details' }))
    expect(open).toHaveBeenCalledExactlyOnceWith(projects[1])
    view.rerender(table('Open project'))
    await user.click(screen.getByRole('button', { name: 'Actions for Zeta' }))
    expect(screen.queryByRole('menuitem', { name: 'View details' })).toBe(null)
    await user.click(screen.getByRole('menuitem', { name: 'Open project' }))
    expect(open).toHaveBeenLastCalledWith(projects[0])
  })

  it('keeps an async confirmation failure open, allows retry, and clears stale errors on reopen', async () => {
    const user = userEvent.setup()
    let reject: (failure: Error) => void = () => {}
    const confirm = vi.fn().mockImplementationOnce(() => new Promise((_, rejectPromise) => { reject = rejectPromise })).mockResolvedValue(true)
    render(<DiyaProvider><Dialog trigger={<Button>Edit project</Button>} title="Project settings" onConfirm={confirm} confirmLabel="Save project">Customer form</Dialog></DiyaProvider>)
    const trigger = screen.getByRole('button', { name: 'Edit project' })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Save project' }))
    // Pending: inert but still focused, not natively disabled.
    expect(screen.getByRole('button', { name: 'Save project' }).getAttribute('aria-disabled')).toBe('true')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Save project' }))
    await act(async () => { reject(new Error('Save failed')) })
    expect(screen.getByRole('alert').textContent).toBe('Save failed')
    expect(screen.getByRole('dialog', { name: 'Project settings' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Save project' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByRole('button', { name: 'Save project' }).hasAttribute('aria-disabled')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Save project' }))
    expect(screen.queryByRole('dialog')).toBe(null)
    expect(document.activeElement).toBe(trigger)
    await user.click(trigger)
    expect(screen.queryByRole('alert')).toBe(null)
    expect(screen.getByRole('dialog', { name: 'Project settings' })).toBeTruthy()
  })

  it('closes a controlled drawer on native cancel and returns focus to its opener', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    function Example() {
      const [open, setOpen] = useState(false)
      return <DiyaProvider><Button onClick={() => setOpen(true)}>Review project</Button><Drawer title="Project review" open={open} onOpenChange={(next) => { changes(next); setOpen(next) }}><Button>Drawer action</Button></Drawer></DiyaProvider>
    }
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Review project' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Project review' })
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(changes).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('dialog')).toBe(null)
    expect(document.activeElement).toBe(trigger)
  })

  it('runs list, alert and accordion interactions using customer content', async () => {
    const user = userEvent.setup()
    const select = vi.fn()
    const action = vi.fn()
    const dismiss = vi.fn()
    render(<DiyaProvider>
      <List label="Files" items={[{ id: 'brief', label: 'Project brief', onSelect: select }, { id: 'locked', label: 'Locked document', onSelect: select, disabled: true }]} />
      <Alert title="Upload failed" action={{ label: 'Try again', onClick: action }} onDismiss={dismiss}>Customer-defined explanation</Alert>
      <Accordion items={[{ id: 'one', label: 'First detail', content: 'First content' }, { id: 'two', label: 'Second detail', content: 'Second content' }]} />
    </DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Project brief' }))
    await user.click(screen.getByRole('button', { name: 'Locked document' }))
    expect(select).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await user.click(screen.getByRole('button', { name: 'Dismiss alert' }))
    expect(action).toHaveBeenCalledOnce()
    expect(dismiss).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'First detail' }))
    await user.click(screen.getByRole('button', { name: 'Second detail' }))
    expect(screen.queryByRole('region', { name: 'First detail' })).toBe(null)
    expect(screen.getByRole('region', { name: 'Second detail' }).textContent).toBe('Second content')
  })
})

type Member = { id: string; name: string; region: string; team: string }
const members: Member[] = Array.from({ length: 12 }, (_, index) => ({
  id: `member-${index + 1}`,
  name: `Member ${index + 1}`,
  region: index % 2 ? 'West' : 'East',
  team: index % 3 ? 'Design' : 'Sales',
}))
const memberColumns: TableColumn<Member>[] = [{ key: 'name', label: 'Name', render: (row) => row.name }]
const bodyRows = () => within(screen.getByRole('table', { name: 'Members' })).getAllByRole('row').slice(1)

describe('Table defaults', () => {
  it('shows ten rows a page with no checkboxes, search, filters or row menu unless asked', () => {
    render(<DiyaProvider><Table label="Members" rows={members} columns={memberColumns} rowLabel={(row) => row.name} /></DiyaProvider>)
    expect(bodyRows()).toHaveLength(10)
    expect(screen.getByRole('status').textContent).toBe('1–10 of 12')
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByRole('searchbox')).toBe(null)
    expect(screen.queryByRole('button', { name: /^Actions for/ })).toBe(null)
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).toBe(null)
  })

  it('adds row checkboxes for bulk actions or a selection handler, and selectable can turn them off', () => {
    const table = (props: Partial<TableProps<Member>>) => <DiyaProvider><Table label="Members" rows={members} columns={memberColumns} rowLabel={(row) => row.name} {...props} /></DiyaProvider>
    const view = render(table({ bulkActions: [{ label: 'Archive', onAction: () => {} }] }))
    expect(screen.getByRole('checkbox', { name: 'Select Member 1' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Select this page' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Actions for Member 1' })).toBeTruthy()
    view.rerender(table({ onSelectionChange: () => {} }))
    expect(screen.getByRole('checkbox', { name: 'Select Member 1' })).toBeTruthy()
    view.rerender(table({ bulkActions: [{ label: 'Archive', onAction: () => {} }], selectable: false }))
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('shows the search field once searchText is given', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Table label="Members" rows={members} columns={memberColumns} rowLabel={(row) => row.name} searchText={(row) => row.name} /></DiyaProvider>)
    await user.type(screen.getByRole('searchbox', { name: 'Search members' }), 'Member 12')
    expect(bodyRows()).toHaveLength(1)
  })

  it('keeps filter state by key, so two filters with the same label stay independent', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Table label="Members" rows={members} columns={memberColumns} rowLabel={(row) => row.name} pagination={false} filterOptions={[
      { key: 'region', label: 'Group', options: ['East', 'West'], getValue: (row) => row.region },
      { key: 'team', label: 'Group', options: [{ value: 'Sales', label: 'Sales team' }, { value: 'Design', label: 'Design team' }], getValue: (row) => row.team },
    ]} /></DiyaProvider>)
    expect(screen.getAllByRole('button', { name: 'Group' })).toHaveLength(2)
    await user.click(screen.getAllByRole('button', { name: 'Group' })[0])
    await user.click(screen.getByRole('menuitemradio', { name: 'East' }))
    expect(bodyRows()).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Group: East' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Group' })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Group' }))
    expect(screen.getByRole('menuitemradio', { name: 'All' }).getAttribute('aria-checked')).toBe('true')
    await user.click(screen.getByRole('menuitemradio', { name: 'Sales team' }))
    // East is members 1, 3, 5, 7, 9, 11; Sales is members 1, 4, 7, 10.
    expect(bodyRows().map((row) => row.textContent)).toEqual(['Member 1', 'Member 7'])
    expect(screen.getByRole('button', { name: 'Group: East' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Group: Sales team' })).toBeTruthy()
  })

  it('starts at defaultPageSize and offers pageSizeOptions', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Table label="Members" rows={members} columns={memberColumns} rowLabel={(row) => row.name} defaultPageSize={5} pageSizeOptions={[5, 20]} /></DiyaProvider>)
    expect(bodyRows()).toHaveLength(5)
    const size = screen.getByRole('combobox', { name: 'Results per page' }) as HTMLSelectElement
    expect([...size.options].filter((option) => option.value).map((option) => option.value)).toEqual(['5', '20'])
    await user.selectOptions(size, '20')
    expect(bodyRows()).toHaveLength(12)
  })
})

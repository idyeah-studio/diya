import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DatePicker, DiyaProvider, Pagination, Table, Tag, defaultMessages, type DiyaMessagesInput } from '../dist/index.js'

const columns = [{ key: 'name', label: 'Name', render: (row: { id: string; name: string }) => row.name }]

describe('DiyaProvider messages', () => {
  it('exports the English defaults', () => {
    expect(defaultMessages.table.emptyTitle).toBe('No data yet')
    expect(defaultMessages.pagination.next).toBe('Next')
    expect(defaultMessages.progress.inProgress).toBe('In progress')
    expect(defaultMessages.tag.remove('Paid')).toBe('Remove Paid')
  })

  it('renders overridden strings and keeps the defaults it was not given', () => {
    const messages: DiyaMessagesInput = { table: { emptyTitle: 'Nothing here' }, pagination: { next: 'Forward' } }
    render(<DiyaProvider messages={messages}>
      <Table label="Projects" rows={[]} columns={columns} rowLabel={(row) => row.name} pagination={false} />
      <Pagination page={1} total={30} pageSize={10} onPageChange={() => {}} />
    </DiyaProvider>)
    const table = screen.getByRole('table', { name: 'Projects' })
    expect(within(table).getByText('Nothing here')).toBeTruthy()
    expect(within(table).getByText('Items will appear here once they are added.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Forward' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeTruthy()
  })

  it('takes a function for an interpolated string', () => {
    render(<DiyaProvider messages={{ tag: { remove: (label) => `Retirer ${label}` } }}><Tag label="Payé" onRemove={() => {}}>Payé</Tag></DiyaProvider>)
    expect(screen.getByRole('button', { name: 'Retirer Payé' })).toBeTruthy()
  })

  it('lets a per-instance label prop win over messages', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider messages={{ table: { open: 'Ouvrir', emptyTitle: 'Rien ici' } }}>
      <Table label="Projects" rows={[{ id: 'atlas', name: 'Atlas' }]} columns={columns} rowLabel={(row) => row.name} pagination={false} onRowOpen={() => {}} openLabel="Open project" />
      <Table label="Archive" rows={[]} columns={columns} rowLabel={(row) => row.name} pagination={false} emptyTitle="No archived projects" />
    </DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Actions for Atlas' }))
    expect(screen.getByRole('menuitem', { name: 'Open project' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Ouvrir' })).toBe(null)
    expect(within(screen.getByRole('table', { name: 'Archive' })).getByText('No archived projects')).toBeTruthy()
  })

  it('lets a nested provider add to its parent strings and locale', () => {
    render(<DiyaProvider messages={{ table: { emptyTitle: 'Rien ici', emptyDescription: 'Ajoutez un projet.' } }} locale="en-GB">
      <DiyaProvider messages={{ table: { emptyTitle: 'Aucune archive', emptyDescription: undefined } }}>
        <Table label="Archive" rows={[]} columns={columns} rowLabel={(row) => row.name} pagination={false} />
        <DatePicker label="Due date" value="2026-10-14" onValueChange={() => {}} />
      </DiyaProvider>
    </DiyaProvider>)
    const table = screen.getByRole('table', { name: 'Archive' })
    expect(within(table).getByText('Aucune archive')).toBeTruthy()
    // An undefined key keeps the inherited string rather than erasing it.
    expect(within(table).getByText('Ajoutez un projet.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Due date/ }).textContent).toContain('14 Oct 2026')
  })

  it('formats the DatePicker value with the provider locale', () => {
    const view = render(<DiyaProvider><DatePicker label="Due date" value="2026-10-14" onValueChange={() => {}} /></DiyaProvider>)
    expect(screen.getByRole('button', { name: /Due date/ }).textContent).toContain('Oct 14, 2026')
    view.rerender(<DiyaProvider locale="en-GB"><DatePicker label="Due date" value="2026-10-14" onValueChange={() => {}} /></DiyaProvider>)
    expect(screen.getByRole('button', { name: /Due date/ }).textContent).toContain('14 Oct 2026')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Button, Combobox, Dialog, DiyaProvider, Menu, Table, Tabs } from '../dist/index.js'

describe('portable interaction boundary regressions', () => {
  it('distinguishes an empty Table filter value from clearing the filter', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Table label="Transactions" pagination={false}
      rows={[{ id: 'none', name: 'Uncategorized fee', category: '' }, { id: 'assigned', name: 'Hosting charge', category: 'Assigned' }]}
      columns={[{ key: 'name', label: 'Description', render: row => row.name }]}
      rowLabel={row => row.name}
      filterOptions={[{ key: 'category', label: 'Category', options: ['', 'Assigned'], getValue: row => row.category }]} /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Category' }))
    const choices = screen.getAllByRole('menuitemradio')
    await user.click(choices[1])
    const table = screen.getByRole('table', { name: 'Transactions' })
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(within(table).getByRole('cell', { name: 'Uncategorized fee' })).toBeTruthy()
    expect(within(table).queryByRole('cell', { name: 'Hosting charge' })).toBeNull()
    await user.click(screen.getByRole('button', { name: /^Category/ }))
    const reopened = screen.getAllByRole('menuitemradio')
    expect(reopened.filter(item => item.getAttribute('aria-checked') === 'true')).toHaveLength(1)
    expect(reopened[1].textContent?.replace(/[●✓]/g, '').trim()).not.toBe('')
    await user.click(reopened[0])
    expect(within(table).getAllByRole('row')).toHaveLength(3)
  })

  it('treats prototype-like Table filter labels as ordinary labels with no inherited state', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Table label="Transactions" pagination={false}
      rows={[{ id: 'settled', name: 'Settled receipt', status: 'Settled' }, { id: 'pending', name: 'Pending invoice', status: 'Pending' }]}
      columns={[{ key: 'name', label: 'Description', render: row => row.name }]}
      rowLabel={row => row.name}
      filterOptions={[{ key: 'toString', label: 'toString', options: ['Settled', 'Pending'], getValue: row => row.status }]} /></DiyaProvider>)
    const table = screen.getByRole('table', { name: 'Transactions' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'toString' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Pending' }))
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(within(table).getByRole('cell', { name: 'Pending invoice' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(within(table).getAllByRole('row')).toHaveLength(3)
  })

  it('returns keyboard focus to the Combobox input after removing a selected chip', async () => {
    const user = userEvent.setup()
    const changed = vi.fn()
    function Example() {
      const [value, setValue] = useState(['design', 'engineering'])
      return <DiyaProvider><Button>Before teams</Button><Combobox label="Teams" multiple
        options={[{ value: 'design', label: 'Design' }, { value: 'engineering', label: 'Engineering' }]}
        value={value} onValueChange={next => { changed(next); setValue(next) }} /><Button>After teams</Button></DiyaProvider>
    }
    render(<Example />)
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Design' }))
    await user.keyboard('{Enter}')
    expect(changed).toHaveBeenLastCalledWith(['engineering'])
    expect(screen.queryByRole('button', { name: 'Remove Design' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Teams' }))
  })

  it('clears a Dialog pending state after a native close before reopening', async () => {
    const user = userEvent.setup()
    let resolve: (value: boolean) => void = () => {}
    const confirm = vi.fn(() => new Promise<boolean>(complete => { resolve = complete }))
    render(<DiyaProvider><Dialog trigger={<Button>Review transaction</Button>} title="Transaction review" confirmLabel="Confirm review" onConfirm={confirm}>Caller-defined content</Dialog></DiyaProvider>)
    const opener = screen.getByRole('button', { name: 'Review transaction' })
    await user.click(opener)
    await user.click(screen.getByRole('button', { name: 'Confirm review' }))
    const dialog = screen.getByRole('dialog', { name: 'Transaction review' }) as HTMLDialogElement
    act(() => dialog.close())
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(opener)
    const disabledAfterReopen = (screen.getByRole('button', { name: 'Confirm review' }) as HTMLButtonElement).disabled
    await act(async () => { resolve(false) })
    expect(disabledAfterReopen).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Transaction review' })).toBeTruthy()
  })

  it('does not let an old confirmation close a Dialog reopened after native close', async () => {
    const user = userEvent.setup()
    let resolve: (value: boolean) => void = () => {}
    render(<DiyaProvider><Dialog trigger={<Button>Review transaction</Button>} title="Transaction review" confirmLabel="Confirm review"
      onConfirm={() => new Promise<boolean>(complete => { resolve = complete })}>Caller-defined content</Dialog></DiyaProvider>)
    const opener = screen.getByRole('button', { name: 'Review transaction' })
    await user.click(opener)
    await user.click(screen.getByRole('button', { name: 'Confirm review' }))
    act(() => (screen.getByRole('dialog', { name: 'Transaction review' }) as HTMLDialogElement).close())
    await user.click(opener)
    await act(async () => { resolve(true) })
    expect(screen.queryByRole('dialog', { name: 'Transaction review' })).not.toBeNull()
  })

  it('moves ArrowUp from a focused Menu surface to the last newly available item', async () => {
    const user = userEvent.setup()
    const example = (disabled: boolean) => <DiyaProvider><Menu label="Transaction actions" items={[
      { id: 'inspect', label: 'Details', disabled, onSelect: () => {} },
      { id: 'edit', label: 'Edit memo', disabled, onSelect: () => {} },
      { id: 'review', label: 'Mark reviewed', disabled, onSelect: () => {} },
    ]} /></DiyaProvider>
    const { rerender } = render(example(true))
    await user.click(screen.getByRole('button', { name: 'Transaction actions' }))
    expect(document.activeElement).toBe(screen.getByRole('menu', { name: 'Transaction actions' }))
    rerender(example(false))
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Mark reviewed' }))
    await user.keyboard('{Home}{ArrowUp}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Mark reviewed' }))
  })

  it('keeps a valid tab stop and matching panel when a controlled value targets a disabled tab', async () => {
    const user = userEvent.setup()
    const changed = vi.fn()
    function Example() {
      const [value, setValue] = useState('locked')
      return <DiyaProvider><Tabs label="Report sections" value={value} onValueChange={next => { changed(next); setValue(next) }} items={[
        { value: 'first', label: 'Overview', content: 'Overview report' },
        { value: 'locked', label: 'Unavailable report', content: 'Unavailable content', disabled: true },
        { value: 'last', label: 'Transactions', content: 'Transaction report' },
      ]} /></DiyaProvider>
    }
    render(<Example />)
    expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').textContent).toBe('Overview report')
    await user.tab()
    await user.keyboard('{End}')
    expect(changed).toHaveBeenLastCalledWith('last')
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Transactions' }))
    expect(screen.getByRole('tabpanel').textContent).toBe('Transaction report')
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Overview' }))
  })

  it('omits removed controlled selection IDs from bulk callbacks while preserving valid IDs', async () => {
    const user = userEvent.setup()
    const archive = vi.fn()
    const selected = vi.fn()
    const example = (rows: { id: string; name: string }[]) => <DiyaProvider><Table label="Transactions" rows={rows}
      columns={[{ key: 'name', label: 'Description', render: row => row.name }]} rowLabel={row => row.name}
      pagination={false} selectedIds={['removed', 'valid']} onSelectionChange={selected} bulkActions={[{ label: 'Archive', onAction: archive }]} /></DiyaProvider>
    const { rerender } = render(example([{ id: 'removed', name: 'Removed transaction' }, { id: 'valid', name: 'Existing transaction' }]))
    rerender(example([{ id: 'valid', name: 'Existing transaction' }]))
    expect(screen.getByRole('status').textContent).toBe('1 selected')
    await user.click(screen.getByRole('button', { name: 'Archive' }))
    expect(archive).toHaveBeenCalledWith(['valid'])
    expect(selected).toHaveBeenCalledWith([])
  })
})

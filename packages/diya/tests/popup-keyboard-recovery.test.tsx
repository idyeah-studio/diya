import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, Combobox, DatePicker, Dialog, DiyaProvider, Menu, Popover } from '../dist/index.js'

describe('popup keyboard traversal and dismissal recovery', () => {
  it('traverses native Popover fields and links, skips unavailable controls, then leaves at its boundaries', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Button>Before preferences</Button><Popover label="Preferences">{() => <>
      <textarea aria-label="Unavailable notes" disabled />
      <input aria-label="Hidden field" hidden />
      <textarea aria-label="Notes" />
      <select aria-label="Visibility"><option>Team</option><option>Private</option></select>
      <a href="#documentation">Documentation</a>
      <Button>Apply preferences</Button>
    </>}</Popover><Button>After preferences</Button></DiyaProvider>)
    const trigger = screen.getByRole('button', { name: 'Preferences' })
    await user.click(trigger)
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Notes' }))
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'Keep the draft')
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Visibility' }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Documentation' }))
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Visibility' }))
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Apply preferences' }))
    await user.tab()
    expect(screen.queryByRole('dialog', { name: 'Preferences' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After preferences' }))
    await user.click(trigger)
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(trigger)
    expect(screen.queryByRole('dialog', { name: 'Preferences' })).toBeNull()
  })

  it.each(['link', 'select'] as const)('initially focuses a native %s when it is the Popover content', async kind => {
    const user = userEvent.setup()
    render(<DiyaProvider><Popover label="Details">{() => kind === 'link'
      ? <a href="#details">Read details</a>
      : <select aria-label="Detail level"><option>Summary</option></select>}
    </Popover></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Details' }))
    expect(document.activeElement).toBe(kind === 'link'
      ? screen.getByRole('link', { name: 'Read details' })
      : screen.getByRole('combobox', { name: 'Detail level' }))
  })

  it('keeps normal Popover traversal and its exit inside the enclosing native modal', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Button>Outside modal</Button><Dialog trigger={<Button>Edit project</Button>} title="Project" showClose={false} footer={<></>}>
      <Popover label="Project options">{() => <><textarea aria-label="Project note" /><Button>Last option</Button></>}</Popover>
      <Button>After options</Button>
    </Dialog></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Edit project' }))
    const modal = screen.getByRole('dialog', { name: 'Project' })
    await user.click(within(modal).getByRole('button', { name: 'Project options' }))
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Project note' }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Last option' }))
    await user.tab()
    expect(document.activeElement).toBe(within(modal).getByRole('button', { name: 'After options' }))
    expect(screen.queryByRole('dialog', { name: 'Project options' })).toBeNull()
  })

  it('continues to exit a composite Menu on Tab instead of tabbing among menu items', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Button>Before actions</Button><Menu label="Actions" items={[
      { id: 'first', label: 'First action', onSelect: () => {} },
      { id: 'last', label: 'Last action', onSelect: () => {} },
    ]} /><Button>After actions</Button></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'First action' }))
    await user.tab()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After actions' }))
  })

  // An outside scroll or resize repositions the menu (see t2-popover-scroll); it closes only once its trigger leaves the viewport.
  it.each(['resize', 'scroll'] as const)('keeps Menu open and focused after an outside %s, and through its own scrolling', async event => {
    const user = userEvent.setup()
    render(<DiyaProvider><Menu label="Actions" items={[{ id: 'edit', label: 'Edit project', onSelect: () => {} }]} /></DiyaProvider>)
    const trigger = screen.getByRole('button', { name: 'Actions' })
    await user.click(trigger)
    const menu = screen.getByRole('menu')
    fireEvent.scroll(menu)
    expect(screen.getByRole('menu')).toBe(menu)
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit project' }))
    fireEvent(window, new Event(event))
    expect(screen.getByRole('menu')).toBe(menu)
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit project' }))
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it.each(['resize', 'scroll'] as const)('recovers focused Date Picker content after an outside %s', async event => {
    const user = userEvent.setup()
    render(<DiyaProvider><DatePicker label="Due date" value="2026-10-14" onValueChange={() => {}} /></DiyaProvider>)
    const trigger = screen.getByRole('button', { name: /Due date/ })
    await user.click(trigger)
    const calendar = screen.getByRole('group', { name: 'Choose date' })
    const day = within(calendar).getByRole('gridcell', { name: 'Wednesday, October 14, 2026' })
    act(() => day.focus())
    fireEvent.scroll(calendar)
    expect(document.activeElement).toBe(day)
    fireEvent(window, new Event(event))
    expect(screen.queryByRole('group', { name: 'Choose date' })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('lets IME composition keys edit the Combobox without selecting, removing, navigating or dismissing options', async () => {
    const user = userEvent.setup()
    const change = vi.fn()
    render(<DiyaProvider><Combobox label="Teams" multiple value={['alpha']} onValueChange={change}
      options={[{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }]} /></DiyaProvider>)
    const input = screen.getByRole('combobox', { name: 'Teams' })
    await user.click(input)
    const active = input.getAttribute('aria-activedescendant')
    for (const key of ['Backspace', 'Enter', 'ArrowDown', 'Escape']) {
      expect(fireEvent.keyDown(input, { key, isComposing: true })).toBe(true)
      expect(change).not.toHaveBeenCalled()
      expect(input.getAttribute('aria-activedescendant')).toBe(active)
      expect(input.getAttribute('aria-expanded')).toBe('true')
    }
    fireEvent.keyDown(input, { key: 'ArrowDown', isComposing: false })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: false })
    expect(change).toHaveBeenCalledExactlyOnceWith(['alpha', 'beta'])
  })
})

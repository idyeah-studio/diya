import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Button, Combobox, DatePicker, Dialog, DiyaProvider, Popover, Toast, Tooltip, type DateRange } from '../dist/index.js'

const teams = [
  { value: 'archived', label: 'Archived team', disabled: true },
  { value: 'architecture', label: 'Architecture' },
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
]

describe('scoped and anchored popups', () => {
  it('opens a combobox on the first enabled option, filters past disabled matches and closes on Escape', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    function Example() {
      const [value, setValue] = useState('')
      return <DiyaProvider theme="dark" glass><Combobox label="Team" options={teams} value={value} onValueChange={(next) => { changes(next); setValue(next) }} /></DiyaProvider>
    }
    render(<Example />)
    const input = screen.getByRole('combobox', { name: 'Team' }) as HTMLInputElement
    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(document.getElementById(input.getAttribute('aria-activedescendant')!)?.textContent).toBe('Architecture')
    const list = screen.getByRole('listbox', { name: 'Team' })
    expect(list.closest('.diya-root')?.getAttribute('data-theme')).toBe('dark')
    expect(list.closest('.diya-root')?.getAttribute('data-glass')).toBe('true')
    expect(list.hasAttribute('popover')).toBe(false)
    await user.type(input, 'arch')
    expect(document.getElementById(input.getAttribute('aria-activedescendant')!)?.textContent).toBe('Architecture')
    await user.keyboard('{Enter}')
    expect(changes).toHaveBeenLastCalledWith('architecture')
    expect(input.value).toBe('Architecture')
    expect(screen.queryByRole('listbox')).toBe(null)
    await user.keyboard('{ArrowDown}{Escape}')
    expect(screen.queryByRole('listbox')).toBe(null)
    expect(document.activeElement).toBe(input)
  })

  it('selects the first option on initial ArrowDown when no option is disabled', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    render(<DiyaProvider><Combobox label="Letters" options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]} value="" onValueChange={changes} /></DiyaProvider>)
    await user.tab()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(changes).toHaveBeenCalledWith('a')
  })

  it('removes an open popup immediately when a combobox becomes disabled', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    const example = (disabled: boolean) => <DiyaProvider><Combobox label="Team" options={teams} value="" onValueChange={changes} disabled={disabled} /></DiyaProvider>
    const { rerender } = render(example(false))
    await user.click(screen.getByRole('combobox', { name: 'Team' }))
    expect(screen.getByRole('listbox')).toBeTruthy()
    rerender(example(true))
    expect(screen.queryByRole('listbox')).toBe(null)
    expect(screen.getByRole('combobox', { name: 'Team' }).getAttribute('aria-expanded')).toBe('false')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(changes).not.toHaveBeenCalled()
  })

  it('uses a native popover API when available and falls back if it rejects', async () => {
    const user = userEvent.setup()
    const native = vi.fn(function (this: HTMLElement) { this.setAttribute('data-native-opened', 'true') })
    Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, writable: true, value: native })
    const { unmount } = render(<DiyaProvider><Combobox label="Native team" options={teams} value="" onValueChange={() => {}} /></DiyaProvider>)
    await user.click(screen.getByRole('combobox', { name: 'Native team' }))
    expect(native).toHaveBeenCalled()
    expect(screen.getByRole('listbox').getAttribute('popover')).toBe('manual')
    unmount()
    Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, writable: true, value: () => { throw new Error('Unsupported top layer') } })
    render(<DiyaProvider><Combobox label="Fallback team" options={teams} value="" onValueChange={() => {}} /></DiyaProvider>)
    await user.click(screen.getByRole('combobox', { name: 'Fallback team' }))
    const fallback = screen.getByRole('listbox') as HTMLElement
    expect(fallback.hasAttribute('popover')).toBe(false)
    expect(fallback.style.position).toBe('fixed')
  })

  it('handles Date Picker Escape and preserves logical Tab order around its portal', async () => {
    const user = userEvent.setup()
    function Example() {
      const [value, setValue] = useState('')
      return <DiyaProvider><Button>Before date</Button><DatePicker label="Due date" value={value} onValueChange={setValue} /><Button>After date</Button></DiyaProvider>
    }
    render(<Example />)
    const trigger = screen.getByRole('button', { name: /Due date/ })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('group', { name: 'Choose date' })).toBe(null)
    expect(document.activeElement).toBe(trigger)
    await user.click(trigger)
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Previous month' }))
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(trigger)
    act(() => screen.getByRole('button', { name: 'Clear' }).focus())
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After date' }))
    expect(screen.queryByRole('group', { name: 'Choose date' })).toBe(null)
  })

  it('returns actual selected dates and removes an open calendar when disabled', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    function Example({ disabled = false }: { disabled?: boolean }) {
      const [value, setValue] = useState<DateRange>({ start: '', end: '' })
      return <DiyaProvider><DatePicker label="Reporting period" range value={value} disabled={disabled} onValueChange={(next) => { changes(next); setValue(next) }} /></DiyaProvider>
    }
    const { rerender } = render(<Example />)
    await user.click(screen.getByRole('button', { name: /Reporting period/ }))
    const calendar = screen.getByRole('group', { name: 'Choose date' })
    const days = within(calendar).getAllByRole('gridcell', { name: /^[A-Za-z]+ \d{1,2}, \d{4}$/ })
    await user.click(days[0])
    expect(changes.mock.lastCall?.[0].start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(changes.mock.lastCall?.[0].end).toBe('')
    await user.click(days[1])
    const selection = changes.mock.lastCall?.[0] as DateRange
    expect(selection.start < selection.end).toBe(true)
    expect(screen.queryByRole('group', { name: 'Choose date' })).toBe(null)
    await user.click(screen.getByRole('button', { name: /Reporting period/ }))
    rerender(<Example disabled />)
    expect(screen.queryByRole('group', { name: 'Choose date' })).toBe(null)
    expect(changes).toHaveBeenCalledTimes(2)
  })

  it('dismisses an anchored date calendar on outside scrolling', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><DatePicker label="Due date" value="" onValueChange={() => {}} /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: /Due date/ }))
    fireEvent.scroll(window)
    expect(screen.queryByRole('group', { name: 'Choose date' })).toBe(null)
  })

  it('keeps input popup controls inside an open native dialog and wraps its tab boundary', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Button>Outside modal</Button><Dialog trigger={<Button>Edit project</Button>} title="Project settings" showClose={false} footer={<></>}>
      <Combobox label="Modal team" options={teams} value="" onValueChange={() => {}} />
      <DatePicker label="Modal date" value="" onValueChange={() => {}} />
    </Dialog></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Edit project' }))
    const dialog = screen.getByRole('dialog', { name: 'Project settings' })
    const combo = within(dialog).getByRole('combobox', { name: 'Modal team' })
    await user.click(combo)
    expect(dialog.contains(screen.getByRole('listbox'))).toBe(true)
    await user.keyboard('{Escape}')
    await user.click(within(dialog).getByRole('button', { name: /Modal date/ }))
    expect(dialog.contains(screen.getByRole('group', { name: 'Choose date' }))).toBe(true)
    act(() => within(dialog).getByRole('button', { name: 'Clear' }).focus())
    await user.tab()
    expect(document.activeElement).toBe(combo)
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('keeps tooltip and popover content scoped, runs callbacks and restores trigger focus', async () => {
    const user = userEvent.setup()
    const saved = vi.fn()
    render(<DiyaProvider theme="dark" glass>
      <Tooltip label="Explain settings" content="Customer-defined help">Help</Tooltip>
      <Popover label="Preferences">{(close) => <Button onClick={() => { saved(); close() }}>Done</Button>}</Popover>
    </DiyaProvider>)
    await user.hover(screen.getByRole('button', { name: 'Explain settings' }))
    expect(screen.getByRole('tooltip').textContent).toBe('Customer-defined help')
    expect(screen.getByRole('tooltip').closest('.diya-root')?.getAttribute('data-theme')).toBe('dark')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).toBe(null)
    const trigger = screen.getByRole('button', { name: 'Preferences' })
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Preferences' }).closest('.diya-root')?.getAttribute('data-glass')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(saved).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBe(null)
    expect(document.activeElement).toBe(trigger)
  })

  it('retains a nested provider appearance when its outlet is already inside a modal', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider theme="light"><Dialog trigger={<Button>Open settings</Button>} title="Settings">
      <DiyaProvider theme="dark" glass><Combobox label="Nested team" options={teams} value="" onValueChange={() => {}} /></DiyaProvider>
    </Dialog></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    await user.click(within(dialog).getByRole('combobox', { name: 'Nested team' }))
    const popup = screen.getByRole('listbox')
    expect(dialog.contains(popup)).toBe(true)
    expect(popup.closest('.diya-root')?.getAttribute('data-theme')).toBe('dark')
    expect(popup.closest('.diya-root')?.getAttribute('data-glass')).toBe('true')
  })

  it('keeps tooltip and popover controls in their enclosing native modal', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Dialog trigger={<Button>Open settings</Button>} title="Settings">
      <Tooltip label="Modal help" content="Inside this dialog">Help</Tooltip>
      <Popover label="Modal options">{(close) => <Button onClick={close}>Apply options</Button>}</Popover>
    </Dialog></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    await user.hover(within(dialog).getByRole('button', { name: 'Modal help' }))
    expect(dialog.contains(screen.getByRole('tooltip'))).toBe(true)
    await user.click(within(dialog).getByRole('button', { name: 'Modal options' }))
    const popup = screen.getByRole('dialog', { name: 'Modal options' })
    expect(dialog.contains(popup)).toBe(true)
    await user.click(within(popup).getByRole('button', { name: 'Apply options' }))
    expect(screen.queryByRole('dialog', { name: 'Modal options' })).toBe(null)
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Modal options' }))
  })
})

describe('notification timing', () => {
  it('resets the countdown when a caller changes duration', async () => {
    vi.useFakeTimers()
    const close = vi.fn()
    const example = (duration: number) => <DiyaProvider><Toast duration={duration} onDismiss={close}>Saved</Toast></DiyaProvider>
    const { rerender } = render(example(1000))
    await act(async () => { vi.advanceTimersByTime(400) })
    rerender(example(2000))
    await act(async () => { vi.advanceTimersByTime(1999) })
    expect(close).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(1) })
    expect(close).toHaveBeenCalledOnce()
  })

  it('keeps actionable notifications available and runs action/dismiss callbacks', async () => {
    vi.useFakeTimers()
    const action = vi.fn()
    const close = vi.fn()
    render(<DiyaProvider theme="dark"><Toast duration={100} onDismiss={close} action={{ label: 'Retry upload', onClick: action }}>Upload failed</Toast></DiyaProvider>)
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByRole('status').closest('.diya-root')?.getAttribute('data-theme')).toBe('dark')
    fireEvent.click(screen.getByRole('button', { name: 'Retry upload' }))
    expect(action).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }))
    expect(close).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when the reader dismisses a notification by button or Escape', () => {
    const byButton = vi.fn()
    const { unmount } = render(<DiyaProvider><Toast duration={0} onDismiss={byButton}>Saved</Toast></DiyaProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }))
    expect(byButton).toHaveBeenCalledOnce()
    unmount()
    const byEscape = vi.fn()
    render(<DiyaProvider><Toast duration={0} onDismiss={byEscape}>Saved</Toast></DiyaProvider>)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Dismiss alert' }), { key: 'Escape' })
    expect(byEscape).toHaveBeenCalledOnce()
  })

  it('hides the close button with showClose={false}, except when there is an action', () => {
    const { unmount } = render(<DiyaProvider><Toast duration={0} showClose={false} onDismiss={() => {}}>Saved</Toast></DiyaProvider>)
    expect(screen.getByText('Saved')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Dismiss alert' })).toBe(null)
    unmount()
    render(<DiyaProvider><Toast duration={0} showClose={false} onDismiss={() => {}} action={{ label: 'Undo', onClick: () => {} }}>Archived</Toast></DiyaProvider>)
    expect(screen.getByRole('button', { name: 'Dismiss alert' })).toBeTruthy()
  })

  it('dismisses once even when the host keeps the notification mounted', async () => {
    vi.useFakeTimers()
    const dismiss = vi.fn()
    render(<DiyaProvider><Toast duration={1000} onDismiss={dismiss}>Saved</Toast></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Dismiss alert' })
    fireEvent.click(button)
    fireEvent.keyDown(button, { key: 'Escape' })
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(dismiss).toHaveBeenCalledOnce()
  })
})

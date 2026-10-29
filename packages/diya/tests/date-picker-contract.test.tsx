import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { DatePicker, DiyaProvider, type DateRange } from '../dist/index.js'

beforeEach(() => {
  // Freeze only Date. User-event and popup effects continue using real timers.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 9, 12))
})

function calendar() {
  return screen.getByRole('group', { name: 'Choose date' })
}

describe('DatePicker controlled month and keyboard contracts', () => {
  it('opens the month of a controlled date range instead of the current month', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><DatePicker label="Reporting range" range value={{ start: '2026-09-01', end: '2026-09-30' }} onValueChange={() => {}} /></DiyaProvider>)

    await user.click(screen.getByRole('button', { name: /Reporting range/ }))

    expect(within(calendar()).getByText('September 2026')).toBeTruthy()
    expect(within(calendar()).getByRole('button', { name: 'Sep 1, 2026' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(calendar()).getByRole('button', { name: 'Sep 30, 2026' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('uses a changed controlled value when reopening a previously browsed calendar', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    const example = (value: DateRange) => <DiyaProvider><DatePicker label="Reporting range" range value={value} onValueChange={changes} /></DiyaProvider>
    const { rerender } = render(example({ start: '2026-10-01', end: '2026-10-31' }))

    const trigger = screen.getByRole('button', { name: /Reporting range/ })
    await user.click(trigger)
    await user.click(within(calendar()).getByRole('button', { name: 'Next month' }))
    expect(within(calendar()).getByText('November 2026')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('group', { name: 'Choose date' })).toBeNull()

    rerender(example({ start: '2026-09-01', end: '2026-09-30' }))
    await user.click(trigger)

    expect(within(calendar()).getByText('September 2026')).toBeTruthy()
    expect(changes).not.toHaveBeenCalled()
  })

  it('reopens at the selected month after browsing away without choosing a date', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    render(<DiyaProvider><DatePicker label="Payment date" value="2026-10-14" onValueChange={changes} /></DiyaProvider>)

    const trigger = screen.getByRole('button', { name: /Payment date/ })
    await user.click(trigger)
    await user.click(within(calendar()).getByRole('button', { name: 'Next month' }))
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(trigger)
    await user.click(trigger)

    expect(within(calendar()).getByText('October 2026')).toBeTruthy()
    expect(within(calendar()).getByRole('button', { name: 'Oct 14, 2026' }).getAttribute('aria-pressed')).toBe('true')
    expect(changes).not.toHaveBeenCalled()
  })

  it('resumes an incomplete controlled range after closing and reopening', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    function Example() {
      const [value, setValue] = useState<DateRange>({ start: '2026-09-01', end: '2026-09-30' })
      return <DiyaProvider><DatePicker label="Reporting range" range value={value} onValueChange={next => { changes(next); setValue(next) }} /></DiyaProvider>
    }
    render(<Example />)
    const trigger = screen.getByRole('button', { name: /Reporting range/ })

    await user.click(trigger)
    await user.click(within(calendar()).getByRole('button', { name: 'Sep 20, 2026' }))
    expect(changes).toHaveBeenLastCalledWith({ start: '2026-09-20', end: '' })
    await user.keyboard('{Escape}')
    await user.click(trigger)

    expect(within(calendar()).getByText('Choose end date')).toBeTruthy()
    await user.click(within(calendar()).getByRole('button', { name: 'Sep 25, 2026' }))

    expect(changes).toHaveBeenLastCalledWith({ start: '2026-09-20', end: '2026-09-25' })
    expect(changes).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('group', { name: 'Choose date' })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it.each([
    ['right', '2026-10-31', 'Oct 31, 2026', '{ArrowRight}', '2026-11-01', 'Nov 1, 2026', 'November 2026'],
    ['left', '2026-10-01', 'Oct 1, 2026', '{ArrowLeft}', '2026-09-30', 'Sep 30, 2026', 'September 2026'],
    ['down', '2026-10-28', 'Oct 28, 2026', '{ArrowDown}', '2026-11-04', 'Nov 4, 2026', 'November 2026'],
    ['up', '2026-10-03', 'Oct 3, 2026', '{ArrowUp}', '2026-09-26', 'Sep 26, 2026', 'September 2026'],
    ['PageUp', '2026-10-31', 'Oct 31, 2026', '{PageUp}', '2026-09-30', 'Sep 30, 2026', 'September 2026'],
    ['PageDown', '2026-01-31', 'Jan 31, 2026', '{PageDown}', '2026-02-28', 'Feb 28, 2026', 'February 2026'],
  ])('moves %s across a month boundary without selecting until Enter', async (_direction, initial, initialLabel, key, next, nextLabel, monthLabel) => {
    const user = userEvent.setup()
    const changes = vi.fn()
    render(<DiyaProvider><DatePicker label="Payment date" value={initial} onValueChange={changes} /></DiyaProvider>)

    const trigger = screen.getByRole('button', { name: /Payment date/ })
    await user.click(trigger)
    act(() => within(calendar()).getByRole('button', { name: initialLabel }).focus())
    await user.keyboard(key)

    expect(document.activeElement?.getAttribute('aria-label')).toBe(nextLabel)
    expect(within(calendar()).getByText(monthLabel)).toBeTruthy()
    expect(changes).not.toHaveBeenCalled()

    await user.keyboard('{Enter}')

    expect(changes).toHaveBeenCalledExactlyOnceWith(next)
    expect(screen.queryByRole('group', { name: 'Choose date' })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})

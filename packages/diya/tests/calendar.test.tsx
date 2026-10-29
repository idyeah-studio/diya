import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { Calendar, DatePicker, DiyaProvider, defaultMessages, type DateRange } from '../dist/index.js'

beforeEach(() => {
  // Freeze only Date: Friday 9 October 2026. User-event keeps real timers.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 9, 12))
})

const calendar = (name = 'Pick a day') => screen.getByRole('group', { name })
const day = (label: string, name?: string) => within(calendar(name)).getByRole('gridcell', { name: label })
const days = (name?: string) => within(calendar(name)).getAllByRole('gridcell').filter((cell) => cell.hasAttribute('data-date'))
const selected = (name?: string) => days(name).filter((cell) => cell.getAttribute('aria-selected') === 'true').map((cell) => cell.dataset.date)
const unavailable = (name?: string) => days(name).filter((button) => button.getAttribute('aria-disabled') === 'true').map((button) => button.dataset.date)
const tabStops = (name?: string) => days(name).filter((button) => button.tabIndex === 0).map((button) => button.dataset.date)
const heading = (name?: string) => calendar(name).querySelector('strong')?.textContent
const weekend = (date: string) => [0, 6].includes(new Date(`${date}T12:00:00`).getDay())

describe('Calendar', () => {
  it('is a labelled group that stays on the page, with the month, weekdays and every day', () => {
    const ref = createRef<HTMLDivElement>()
    render(<DiyaProvider><Calendar ref={ref} label="Pick a day" className="booking" style={{ maxWidth: 320 }} data-testid="booking" /></DiyaProvider>)
    const group = calendar()
    expect(ref.current).toBe(group)
    expect(screen.getByTestId('booking')).toBe(group)
    expect(group.classList.contains('booking')).toBe(true)
    expect(group.style.maxWidth).toBe('320px')
    expect(group.getAttribute('data-size')).toBe('medium')
    expect(screen.getByText('Pick a day')).toBeTruthy()
    expect(heading()).toBe('October 2026')
    expect(heading() && calendar().querySelector('strong')?.getAttribute('aria-live')).toBe('polite')
    expect(days()).toHaveLength(31)
    expect(selected()).toEqual([])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('follows the ARIA date grid pattern: a grid named by its month, weekday headers, a row per week', () => {
    render(<DiyaProvider><Calendar label="Pick a day" defaultValue="2026-10-14" /></DiyaProvider>)
    const grid = within(calendar()).getByRole('grid', { name: 'October 2026' })
    const rows = within(grid).getAllByRole('row')
    // The weekday headers, then five weeks: October 2026 starts on a Thursday.
    expect(rows).toHaveLength(6)
    const headers = within(rows[0]).getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent)).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'])
    expect(headers.map((header) => header.getAttribute('aria-label'))).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    for (const row of rows.slice(1)) expect(within(row).getAllByRole('gridcell')).toHaveLength(7)
    // Empty cells keep the columns: four before the 1st.
    expect(within(rows[1]).getAllByRole('gridcell').map((cell) => cell.textContent)).toEqual(['', '', '', '', '1', '2', '3'])
    expect(within(rows[5]).getAllByRole('gridcell').map((cell) => cell.textContent)).toEqual(['25', '26', '27', '28', '29', '30', '31'])
    // Each day is a native button with the gridcell role, named by its full date.
    expect(day('Wednesday, October 14, 2026').tagName).toBe('BUTTON')
    expect(day('Wednesday, October 14, 2026').getAttribute('aria-selected')).toBe('true')
    expect(day('Thursday, October 15, 2026').hasAttribute('aria-selected')).toBe(false)
    expect(day('Wednesday, October 14, 2026').hasAttribute('aria-pressed')).toBe(false)
    expect(days().filter((cell) => cell.getAttribute('aria-current') === 'date').map((cell) => cell.dataset.date)).toEqual(['2026-10-09'])
    expect(day('Friday, October 9, 2026').getAttribute('data-today')).toBe('true')
  })

  it('names the grid again when the month changes', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Calendar label="Pick a day" /></DiyaProvider>)
    await user.click(within(calendar()).getByRole('button', { name: 'Next month' }))
    expect(within(calendar()).getByRole('grid', { name: 'November 2026' })).toBeTruthy()
    expect(days().some((cell) => cell.hasAttribute('aria-current'))).toBe(false)
  })

  it('hides the label visually and keeps it as the name', () => {
    const view = render(<DiyaProvider><Calendar label="Pick a day" hideLabel size="large" /></DiyaProvider>)
    expect(calendar().getAttribute('data-size')).toBe('large')
    expect(screen.getByText('Pick a day').classList.contains('diya-sr-only')).toBe(true)
    const classes = Array.from(view.container.querySelectorAll('[class]')).flatMap((element) => Array.from(element.classList))
    expect(classes.filter((name) => !name.startsWith('diya-'))).toEqual([])
  })

  it('chooses one day uncontrolled, and stays open', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    render(<DiyaProvider><Calendar label="Pick a day" defaultValue="2026-10-14" onValueChange={changes} /></DiyaProvider>)
    expect(selected()).toEqual(['2026-10-14'])
    await user.click(day('Wednesday, October 21, 2026'))
    expect(changes).toHaveBeenCalledExactlyOnceWith('2026-10-21')
    expect(selected()).toEqual(['2026-10-21'])
    expect(document.activeElement).toBe(day('Wednesday, October 21, 2026'))
  })

  it('follows a controlled value and reports choices without changing on its own', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    render(<DiyaProvider><Calendar label="Pick a day" value="2026-10-14" onValueChange={changes} /></DiyaProvider>)
    await user.click(day('Thursday, October 15, 2026'))
    expect(changes).toHaveBeenCalledExactlyOnceWith('2026-10-15')
    expect(selected()).toEqual(['2026-10-14'])
  })

  it('opens on the chosen date’s month, kept inside min and max', () => {
    const view = render(<DiyaProvider><Calendar label="Pick a day" defaultValue="2027-02-03" /></DiyaProvider>)
    expect(heading()).toBe('February 2027')
    view.unmount()
    render(<DiyaProvider><Calendar label="Pick a day" min="2026-12-01" /></DiyaProvider>)
    expect(heading()).toBe('December 2026')
    expect(tabStops()).toEqual(['2026-12-01'])
  })

  it('picks a range: start, then end, swapped if earlier, then a new range', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    function Example() {
      const [value, setValue] = useState<DateRange>({ start: '', end: '' })
      return <DiyaProvider><Calendar label="Pick a day" range value={value} onValueChange={(next) => { changes(next); setValue(next) }} /></DiyaProvider>
    }
    render(<Example />)
    expect(within(calendar()).getByText('Choose start date')).toBeTruthy()
    await user.click(day('Tuesday, October 20, 2026'))
    expect(changes).toHaveBeenLastCalledWith({ start: '2026-10-20', end: '' })
    expect(within(calendar()).getByText('Choose end date')).toBeTruthy()
    await user.click(day('Monday, October 12, 2026'))
    expect(changes).toHaveBeenLastCalledWith({ start: '2026-10-12', end: '2026-10-20' })
    // The range is chosen as a whole: its ends and the days between are selected; the ends are marked apart.
    expect(selected()).toEqual(Array.from({ length: 9 }, (_, index) => `2026-10-${12 + index}`))
    expect(days().filter((cell) => cell.dataset.between === 'true').map((cell) => cell.dataset.date)).toEqual(Array.from({ length: 7 }, (_, index) => `2026-10-${13 + index}`))
    expect(within(calendar()).getByText('Choose start date')).toBeTruthy()
    await user.click(day('Sunday, October 25, 2026'))
    expect(changes).toHaveBeenLastCalledWith({ start: '2026-10-25', end: '' })
  })

  it('keeps one Tab stop in the grid, after the month buttons', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><button>Before</button><Calendar label="Pick a day" defaultValue="2026-10-14" /><button>After</button></DiyaProvider>)
    expect(tabStops()).toEqual(['2026-10-14'])
    await user.click(screen.getByRole('button', { name: 'Before' }))
    await user.tab()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Previous month')
    await user.tab()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Next month')
    await user.tab()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Wednesday, October 14, 2026')
    await user.tab()
    expect(document.activeElement?.textContent).toBe('After')
  })

  it('starts the Tab stop on today when nothing is chosen', () => {
    render(<DiyaProvider><Calendar label="Pick a day" /></DiyaProvider>)
    expect(tabStops()).toEqual(['2026-10-09'])
  })

  it.each([
    ['right', '2026-10-31', 'Saturday, October 31, 2026', '{ArrowRight}', '2026-11-01', 'Sunday, November 1, 2026', 'November 2026'],
    ['left', '2026-10-01', 'Thursday, October 1, 2026', '{ArrowLeft}', '2026-09-30', 'Wednesday, September 30, 2026', 'September 2026'],
    ['down', '2026-10-28', 'Wednesday, October 28, 2026', '{ArrowDown}', '2026-11-04', 'Wednesday, November 4, 2026', 'November 2026'],
    ['up', '2026-10-03', 'Saturday, October 3, 2026', '{ArrowUp}', '2026-09-26', 'Saturday, September 26, 2026', 'September 2026'],
    ['PageUp', '2026-10-31', 'Saturday, October 31, 2026', '{PageUp}', '2026-09-30', 'Wednesday, September 30, 2026', 'September 2026'],
    ['PageDown', '2026-01-31', 'Saturday, January 31, 2026', '{PageDown}', '2026-02-28', 'Saturday, February 28, 2026', 'February 2026'],
  ])('moves %s across a month boundary and chooses only on Enter', async (_direction, initial, initialLabel, key, next, nextLabel, monthLabel) => {
    const user = userEvent.setup()
    const changes = vi.fn()
    const months = vi.fn()
    render(<DiyaProvider><Calendar label="Pick a day" defaultValue={initial} onValueChange={changes} onMonthChange={months} /></DiyaProvider>)
    act(() => day(initialLabel).focus())
    await user.keyboard(key)
    expect(document.activeElement?.getAttribute('aria-label')).toBe(nextLabel)
    expect(heading()).toBe(monthLabel)
    expect(months).toHaveBeenCalledExactlyOnceWith(next.slice(0, 7))
    expect(tabStops()).toEqual([next])
    expect(changes).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(changes).toHaveBeenCalledExactlyOnceWith(next)
    expect(selected()).toEqual([next])
    expect(document.activeElement?.getAttribute('aria-label')).toBe(nextLabel)
  })

  it.each([
    ['en-US', 'Su', 'Sunday, October 11, 2026', 'Saturday, October 17, 2026', '2026-10-17'],
    ['en-GB', 'Mo', 'Monday, 12 October 2026', 'Sunday, 18 October 2026', '2026-10-18'],
  ])('starts the week on the %s first day, and Home/End follow it', async (locale, firstHeading, home, end, endDate) => {
    const user = userEvent.setup()
    render(<DiyaProvider locale={locale}><Calendar label="Pick a day" defaultValue="2026-10-14" /></DiyaProvider>)
    expect(calendar().querySelector('.diya-calendar-weekday')?.textContent).toBe(firstHeading)
    act(() => days().find((button) => button.dataset.date === '2026-10-14')!.focus())
    await user.keyboard('{Home}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe(home)
    await user.keyboard('{End}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe(end)
    await user.keyboard(' ')
    expect(selected()).toEqual([endDate])
  })

  it('marks days outside min and max unavailable, refuses them and keeps the keyboard inside', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    render(<DiyaProvider><Calendar label="Pick a day" min="2026-10-05" max="2026-10-20" onValueChange={changes} /></DiyaProvider>)
    expect(unavailable()).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', ...Array.from({ length: 11 }, (_, index) => `2026-10-${21 + index}`)])
    expect((within(calendar()).getByRole('button', { name: 'Previous month' }) as HTMLButtonElement).disabled).toBe(true)
    expect((within(calendar()).getByRole('button', { name: 'Next month' }) as HTMLButtonElement).disabled).toBe(true)
    await user.click(day('Saturday, October 3, 2026, unavailable'))
    expect(changes).not.toHaveBeenCalled()
    act(() => day('Tuesday, October 6, 2026').focus())
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Monday, October 5, 2026')
    await user.keyboard('{PageDown}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Tuesday, October 20, 2026')
    await user.keyboard('{Enter}')
    expect(changes).toHaveBeenCalledExactlyOnceWith('2026-10-20')
  })

  it('announces unavailable days and refuses them, while the keyboard still moves through them', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    const isDateUnavailable = vi.fn((date: string) => weekend(date) || date === '2026-10-14')
    render(<DiyaProvider><Calendar label="Pick a day" isDateUnavailable={isDateUnavailable} onValueChange={changes} /></DiyaProvider>)
    expect(isDateUnavailable).toHaveBeenCalledWith('2026-10-01')
    expect(unavailable()).toEqual(days().map((button) => button.dataset.date!).filter((date) => weekend(date) || date === '2026-10-14'))
    // An unavailable day says so in words as well as through aria-disabled.
    expect(day('Saturday, October 10, 2026, unavailable').getAttribute('aria-disabled')).toBe('true')
    expect(day('Monday, October 12, 2026').hasAttribute('aria-disabled')).toBe(false)
    // Unavailable days stay in the grid's geometry: focusable cells, not removed or natively disabled.
    expect((day('Saturday, October 10, 2026, unavailable') as HTMLButtonElement).disabled).toBe(false)
    await user.click(day('Saturday, October 10, 2026, unavailable'))
    expect(changes).not.toHaveBeenCalled()
    act(() => day('Tuesday, October 13, 2026').focus())
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Wednesday, October 14, 2026, unavailable')
    await user.keyboard('{Enter}')
    expect(changes).not.toHaveBeenCalled()
    await user.keyboard('{ArrowRight}{Enter}')
    expect(changes).toHaveBeenCalledExactlyOnceWith('2026-10-15')
  })

  it('puts the first Tab stop on an available day', () => {
    const view = render(<DiyaProvider><Calendar label="Pick a day" isDateUnavailable={(date) => date <= '2026-10-12'} /></DiyaProvider>)
    expect(tabStops()).toEqual(['2026-10-13'])
    view.unmount()
    render(<DiyaProvider><Calendar label="Pick a day" isDateUnavailable={(date) => date === '2026-10-14'} defaultValue="2026-10-14" /></DiyaProvider>)
    // A chosen day that has since become unavailable still shows as chosen, and is still refused.
    expect(selected()).toEqual(['2026-10-14'])
    expect(tabStops()).toEqual(['2026-10-09'])
  })

  it('starts and ends a range only on available days', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    render(<DiyaProvider><Calendar label="Pick a day" range isDateUnavailable={weekend} onValueChange={changes} /></DiyaProvider>)
    await user.click(day('Saturday, October 10, 2026, unavailable'))
    expect(changes).not.toHaveBeenCalled()
    await user.click(day('Friday, October 9, 2026'))
    await user.click(day('Sunday, October 11, 2026, unavailable'))
    expect(changes).toHaveBeenCalledTimes(1)
    await user.click(day('Tuesday, October 13, 2026'))
    // Days between the ends may be unavailable; only the ends are checked.
    expect(changes).toHaveBeenLastCalledWith({ start: '2026-10-09', end: '2026-10-13' })
    expect(selected()).toEqual(['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'])
  })

  it('disables every button when disabled, and refuses choices', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    render(<DiyaProvider><button>Before</button><Calendar label="Pick a day" disabled defaultValue="2026-10-14" onValueChange={changes} /><button>After</button></DiyaProvider>)
    const group = calendar()
    expect(group.getAttribute('aria-disabled')).toBe('true')
    expect([...within(group).getAllByRole('button'), ...days()].every((button) => (button as HTMLButtonElement).disabled)).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Before' }))
    await user.tab()
    expect(document.activeElement?.textContent).toBe('After')
    await user.click(day('Thursday, October 15, 2026'))
    expect(changes).not.toHaveBeenCalled()
    expect(selected()).toEqual(['2026-10-14'])
  })

  it('turns the page with the month buttons and reports the month', async () => {
    const user = userEvent.setup()
    const months = vi.fn()
    render(<DiyaProvider><Calendar label="Pick a day" onMonthChange={months} /></DiyaProvider>)
    await user.click(within(calendar()).getByRole('button', { name: 'Next month' }))
    expect(heading()).toBe('November 2026')
    expect(months).toHaveBeenLastCalledWith('2026-11')
    await user.click(within(calendar()).getByRole('button', { name: 'Previous month' }))
    await user.click(within(calendar()).getByRole('button', { name: 'Previous month' }))
    expect(heading()).toBe('September 2026')
    expect(months).toHaveBeenLastCalledWith('2026-09')
  })

  it('shows a controlled month and asks to change it', async () => {
    const user = userEvent.setup()
    const months = vi.fn()
    const view = render(<DiyaProvider><Calendar label="Pick a day" month="2027-03" defaultValue="2026-10-14" onMonthChange={months} /></DiyaProvider>)
    expect(heading()).toBe('March 2027')
    await user.click(within(calendar()).getByRole('button', { name: 'Next month' }))
    expect(months).toHaveBeenCalledExactlyOnceWith('2027-04')
    expect(heading()).toBe('March 2027')
    view.rerender(<DiyaProvider><Calendar label="Pick a day" month="2027-04" defaultValue="2026-10-14" onMonthChange={months} /></DiyaProvider>)
    expect(heading()).toBe('April 2027')
  })

  it('moves focus into the next month once a controlled month follows the keyboard', async () => {
    const user = userEvent.setup()
    function Example() {
      const [month, setMonth] = useState('2026-10')
      return <DiyaProvider><Calendar label="Pick a day" month={month} onMonthChange={setMonth} defaultValue="2026-10-31" /></DiyaProvider>
    }
    render(<Example />)
    act(() => day('Saturday, October 31, 2026').focus())
    await user.keyboard('{ArrowRight}')
    expect(heading()).toBe('November 2026')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Sunday, November 1, 2026')
  })

  it('turns to the month of a value set from outside', () => {
    const months = vi.fn()
    const example = (value: string) => <DiyaProvider><Calendar label="Pick a day" value={value} onValueChange={() => {}} onMonthChange={months} /></DiyaProvider>
    const view = render(example('2026-10-14'))
    view.rerender(example('2026-10-20'))
    expect(months).not.toHaveBeenCalled()
    view.rerender(example('2026-12-02'))
    expect(heading()).toBe('December 2026')
    expect(months).toHaveBeenCalledExactlyOnceWith('2026-12')
    expect(selected()).toEqual(['2026-12-02'])
  })

  it('reads its strings from DiyaProvider messages', () => {
    expect(defaultMessages.calendar).toEqual({ previousMonth: 'Previous month', nextMonth: 'Next month', chooseStart: 'Choose start date', chooseEnd: 'Choose end date', unavailableDay: expect.any(Function) })
    expect(defaultMessages.calendar.unavailableDay('Thursday, November 12, 2026')).toBe('Thursday, November 12, 2026, unavailable')
    render(<DiyaProvider locale="fr-FR" messages={{ calendar: { previousMonth: 'Mois précédent', chooseStart: 'Choisissez le début' } }}>
      <Calendar label="Choisir un jour" range />
    </DiyaProvider>)
    const group = calendar('Choisir un jour')
    expect(within(group).getByRole('button', { name: 'Mois précédent' })).toBeTruthy()
    expect(within(group).getByRole('button', { name: 'Next month' })).toBeTruthy()
    expect(within(group).getByText('Choisissez le début')).toBeTruthy()
    expect(group.querySelector('strong')?.textContent).toBe('octobre 2026')
    expect(group.querySelector('.diya-calendar-weekday')?.textContent).toBe('lu')
  })

  it('names each day with its weekday in the provider locale, and words unavailable days through messages', () => {
    const view = render(<DiyaProvider><Calendar label="Pick a day" defaultValue="2026-11-12" isDateUnavailable={(date) => date === '2026-11-13'} /></DiyaProvider>)
    expect(day('Thursday, November 12, 2026').dataset.date).toBe('2026-11-12')
    expect(day('Friday, November 13, 2026, unavailable').getAttribute('aria-disabled')).toBe('true')
    view.unmount()
    render(<DiyaProvider locale="fr-FR" messages={{ calendar: { unavailableDay: (date) => `${date}, indisponible` } }}>
      <Calendar label="Choisir un jour" defaultValue="2026-11-12" min="2026-11-10" />
    </DiyaProvider>)
    expect(day('jeudi 12 novembre 2026', 'Choisir un jour').dataset.date).toBe('2026-11-12')
    expect(day('lundi 9 novembre 2026, indisponible', 'Choisir un jour').getAttribute('aria-disabled')).toBe('true')
  })

  it('server-renders without marking a day as today, then marks it once hydrated', () => {
    const html = renderToString(<DiyaProvider><Calendar label="Pick a day" value="2026-10-14" onValueChange={() => {}} /></DiyaProvider>)
    expect(html).toContain('Pick a day')
    expect(html).toContain('October 2026')
    expect(html).toMatch(/data-date="2026-10-14"[^>]*aria-selected="true"/)
    expect(html).not.toContain('data-today="true"')
    expect(html).not.toContain('aria-current')
    const host = document.createElement('div')
    host.innerHTML = html
    document.body.append(host)
    render(<DiyaProvider><Calendar label="Pick a day" value="2026-10-14" onValueChange={() => {}} /></DiyaProvider>, { container: host, hydrate: true })
    expect(host.querySelector('[data-date="2026-10-09"]')?.getAttribute('data-today')).toBe('true')
    expect(host.querySelector('[data-date="2026-10-09"]')?.getAttribute('aria-current')).toBe('date')
    host.remove()
  })
})

describe('DatePicker shares the grid', () => {
  const popup = () => screen.getByRole('group', { name: 'Choose date' })

  it('uses the same ARIA date grid in its popup', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><DatePicker label="Due" range defaultValue={{ start: '2026-10-12', end: '2026-10-14' }} /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: /Due/ }))
    const grid = within(popup()).getByRole('grid', { name: 'October 2026' })
    const rows = within(grid).getAllByRole('row')
    expect(rows).toHaveLength(6)
    expect(within(rows[0]).getAllByRole('columnheader').map((header) => header.getAttribute('aria-label'))).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    const cells = within(grid).getAllByRole('gridcell').filter((cell) => cell.hasAttribute('data-date'))
    expect(cells).toHaveLength(31)
    expect(cells.filter((cell) => cell.getAttribute('aria-selected') === 'true').map((cell) => cell.dataset.date)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14'])
    expect(cells.filter((cell) => cell.getAttribute('aria-current') === 'date').map((cell) => cell.dataset.date)).toEqual(['2026-10-09'])
    expect(within(popup()).getByText('Choose start date')).toBeTruthy()
    expect(within(popup()).getByRole('button', { name: 'Today' })).toBeTruthy()
    expect(popup().closest('.diya-inline-calendar')).toBeNull()
  })

  it('takes isDateUnavailable too: announced, refused, and Today follows it', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    render(<DiyaProvider><DatePicker label="Delivery" isDateUnavailable={(date) => weekend(date) || date === '2026-10-09'} value="" onValueChange={changes} /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: /Delivery/ }))
    const dayButtons = within(popup()).getAllByRole('gridcell').filter((cell) => cell.hasAttribute('data-date'))
    expect(dayButtons.filter((button) => button.getAttribute('aria-disabled') === 'true').map((button) => button.dataset.date))
      .toEqual(dayButtons.map((button) => button.dataset.date!).filter((date) => weekend(date) || date === '2026-10-09'))
    expect((within(popup()).getByRole('button', { name: 'Today' }) as HTMLButtonElement).disabled).toBe(true)
    expect(dayButtons.filter((button) => button.tabIndex === 0).map((button) => button.dataset.date)).toEqual(['2026-10-01'])
    await user.click(within(popup()).getByRole('gridcell', { name: 'Saturday, October 10, 2026, unavailable' }))
    expect(changes).not.toHaveBeenCalled()
    await user.click(within(popup()).getByRole('gridcell', { name: 'Monday, October 12, 2026' }))
    expect(changes).toHaveBeenCalledExactlyOnceWith('2026-10-12')
  })

  it('words unavailable days through the datePicker messages', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider locale="de-DE" messages={{ datePicker: { unavailableDay: (date) => `${date}, nicht verfügbar` } }}>
      <DatePicker label="Lieferung" defaultValue="2026-11-12" isDateUnavailable={weekend} />
    </DiyaProvider>)
    await user.click(screen.getByRole('button', { name: /Lieferung/ }))
    expect(within(popup()).getByRole('gridcell', { name: 'Donnerstag, 12. November 2026' }).dataset.date).toBe('2026-11-12')
    expect(within(popup()).getByRole('gridcell', { name: 'Samstag, 14. November 2026, nicht verfügbar' }).getAttribute('aria-disabled')).toBe('true')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { Choice, Combobox, DatePicker, DiyaProvider, FileUpload, Form, Search, Select, Slider, Switch, TextArea, TextInput } from '../dist/index.js'

const teams = [{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }, { value: 'gamma', label: 'Gamma' }]

describe('refs reach the native control', () => {
  it('forwards each field ref to its input, textarea, select, switch or trigger', () => {
    const refs = {
      text: createRef<HTMLInputElement>(), area: createRef<HTMLTextAreaElement>(), select: createRef<HTMLSelectElement>(),
      switch: createRef<HTMLInputElement>(), choice: createRef<HTMLInputElement>(), slider: createRef<HTMLInputElement>(),
      combobox: createRef<HTMLInputElement>(), search: createRef<HTMLInputElement>(), date: createRef<HTMLButtonElement>(),
      form: createRef<HTMLFormElement>(), upload: createRef<HTMLElement>(),
    }
    render(<DiyaProvider>
      <TextInput ref={refs.text} label="Name" />
      <TextArea ref={refs.area} label="Notes" />
      <Select ref={refs.select} label="Team" options={teams} />
      <Switch ref={refs.switch} label="Alerts" />
      <Choice ref={refs.choice} label="Plan" options={teams} />
      <Slider ref={refs.slider} label="Volume" />
      <Combobox ref={refs.combobox} label="Owner" options={teams} />
      <Search ref={refs.search} label="Find" />
      <DatePicker ref={refs.date} label="Due" />
      <Form ref={refs.form} title="Settings" onSubmit={() => {}}>{null}</Form>
      <FileUpload ref={refs.upload} files={[]} onFilesChange={() => {}} />
    </DiyaProvider>)
    expect(refs.text.current).toBe(screen.getByRole('textbox', { name: 'Name' }))
    expect(refs.area.current).toBe(screen.getByRole('textbox', { name: 'Notes' }))
    expect(refs.select.current).toBe(screen.getByRole('combobox', { name: 'Team' }))
    expect(refs.switch.current).toBe(screen.getByRole('switch', { name: 'Alerts' }))
    expect(refs.choice.current).toBe(screen.getByRole('radio', { name: 'Alpha' }))
    expect(refs.slider.current).toBe(screen.getByRole('slider', { name: 'Volume' }))
    expect(refs.combobox.current).toBe(screen.getByRole('combobox', { name: 'Owner' }))
    expect(refs.search.current).toBe(screen.getByRole('searchbox', { name: 'Find' }))
    expect(refs.date.current).toBe(screen.getByRole('button', { name: /Due/ }))
    expect(refs.form.current).toBe(screen.getByRole('form', { name: 'Settings' }))
    expect(refs.upload.current).toBe(screen.getByRole('region', { name: 'Add your files' }))
  })

  it('hands a callback ref every radio in a Choice group', () => {
    const nodes: Array<HTMLInputElement | null> = []
    render(<DiyaProvider><Choice ref={(node) => { nodes.push(node) }} label="Plan" options={teams} /></DiyaProvider>)
    expect(new Set(nodes.filter(Boolean))).toEqual(new Set(screen.getAllByRole('radio')))
  })
})

describe('escape hatches', () => {
  it('puts className and style on the wrapper and other attributes on the native control', () => {
    const { container } = render(<DiyaProvider>
      <Switch label="Alerts" className="alerts" style={{ maxWidth: 300 }} data-testid="alerts-control" />
      <Slider label="Volume" className="volume" style={{ maxWidth: 320 }} data-testid="volume-control" />
      <Combobox label="Owner" options={teams} className="owner" style={{ maxWidth: 280 }} data-testid="owner-control" />
      <DatePicker label="Due" className="due" style={{ maxWidth: 260 }} data-testid="due-control" />
      <Choice label="Plan" options={teams} className="plan" style={{ maxWidth: 240 }} data-testid="plan-group" />
      <FileUpload files={[]} onFilesChange={() => {}} className="upload" style={{ maxWidth: 500 }} data-testid="upload" />
      <Form title="Settings" className="settings" style={{ maxWidth: 600 }} onSubmit={() => {}}>{null}</Form>
    </DiyaProvider>)
    expect(screen.getByTestId('alerts-control')).toBe(screen.getByRole('switch'))
    expect(screen.getByTestId('volume-control')).toBe(screen.getByRole('slider'))
    expect(screen.getByTestId('owner-control')).toBe(screen.getByRole('combobox', { name: 'Owner' }))
    expect(screen.getByTestId('due-control')).toBe(screen.getByRole('button', { name: /Due/ }))
    expect(screen.getByTestId('plan-group')).toBe(screen.getByRole('group', { name: 'Plan' }))
    for (const [selector, width] of [['.diya-switch-field.alerts', '300px'], ['.diya-slider.volume', '320px'], ['.diya-combobox.owner', '280px'], ['.diya-date-field.due', '260px'], ['.diya-choice.plan', '240px'], ['.diya-upload.upload', '500px'], ['.diya-project-form.settings', '600px']]) {
      expect((container.querySelector(selector) as HTMLElement | null)?.style.maxWidth, selector).toBe(width)
    }
  })

  it('renders only diya- classes of its own', () => {
    const { container } = render(<DiyaProvider>
      <TextInput label="Name" hideLabel /><Switch label="Alerts" helperText="Sent daily" hideLabel /><Choice label="Plan" hideLabel options={teams} />
      <Select label="Team" hideLabel options={teams} /><Combobox label="Owner" hideLabel options={teams} /><DatePicker label="Due" hideLabel />
    </DiyaProvider>)
    const classes = Array.from(container.querySelectorAll('[class]')).flatMap((element) => Array.from(element.classList))
    expect(classes.filter((name) => !name.startsWith('diya-'))).toEqual([])
  })

  it('gives Search the shared control corners by default, with pill as an option', () => {
    const { container } = render(<DiyaProvider><Search label="Find" /><Search label="Filter" shape="pill" /></DiyaProvider>)
    const fields = container.querySelectorAll('.diya-search')
    expect(fields[0].classList.contains('diya-search-rounded')).toBe(true)
    expect(fields[1].classList.contains('diya-search-pill')).toBe(true)
  })
})

describe('uncontrolled fields in a native form', () => {
  function Native() {
    return <DiyaProvider><form aria-label="Native">
      <TextInput label="Name" name="name" defaultValue="Ada" clearable />
      <TextArea label="Notes" name="notes" defaultValue="Hi" showCount />
      <Select label="Team" name="team" defaultValue="beta" options={teams} />
      <Switch label="Alerts" name="alerts" value="yes" defaultChecked />
      <Choice label="Plan" name="plan" defaultValue="beta" options={teams} />
      <Choice label="Regions" name="regions" multiple selectAll defaultValue={['alpha']} options={teams} />
      <Slider label="Volume" name="volume" min={0} max={10} defaultValue={4} />
      <Slider label="Budget" name="budget" range defaultValue={[20, 60]} />
      <Combobox label="Owner" name="owner" defaultValue="gamma" options={teams} />
      <DatePicker label="Due" name="due" defaultValue="2026-10-14" />
    </form></DiyaProvider>
  }
  const data = () => {
    const form = screen.getByRole('form', { name: 'Native' }) as HTMLFormElement
    const values = new FormData(form)
    return Object.fromEntries(['name', 'notes', 'team', 'alerts', 'plan', 'regions', 'volume', 'budget', 'owner', 'due'].map((key) => [key, values.getAll(key)]))
  }

  it('submits defaults, follows edits and returns to the defaults on reset', async () => {
    const user = userEvent.setup()
    render(<Native />)
    expect(data()).toEqual({ name: ['Ada'], notes: ['Hi'], team: ['beta'], alerts: ['yes'], plan: ['beta'], regions: ['alpha'], volume: ['4'], budget: ['20', '60'], owner: ['gamma'], due: ['2026-10-14'] })

    await user.type(screen.getByRole('textbox', { name: 'Name' }), ' L')
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), '!')
    expect(screen.getByText('3')).toBeTruthy()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Team' }), 'gamma')
    await user.click(screen.getByRole('switch', { name: 'Alerts' }))
    await user.click(screen.getByRole('radio', { name: 'Alpha' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '7' } })
    fireEvent.change(screen.getByRole('slider', { name: 'Budget minimum' }), { target: { value: '80' } })
    await user.click(screen.getByRole('combobox', { name: 'Owner' }))
    await user.click(within(screen.getByRole('listbox', { name: 'Owner' })).getByRole('option', { name: 'Alpha' }))
    expect(data()).toEqual({ name: ['Ada L'], notes: ['Hi!'], team: ['gamma'], alerts: [], plan: ['alpha'], regions: ['alpha', 'beta', 'gamma'], volume: ['7'], budget: ['60', '60'], owner: ['alpha'], due: ['2026-10-14'] })
    expect((screen.getByRole('checkbox', { name: 'Select all' }) as HTMLInputElement).checked).toBe(true)

    act(() => (screen.getByRole('form', { name: 'Native' }) as HTMLFormElement).reset())
    // happy-dom does not reflect option.defaultSelected, so a reset Select is checked in Chrome instead (see the L2 report).
    await waitFor(() => expect({ ...data(), team: ['beta'] }).toEqual({ name: ['Ada'], notes: ['Hi'], team: ['beta'], alerts: ['yes'], plan: ['beta'], regions: ['alpha'], volume: ['4'], budget: ['20', '60'], owner: ['gamma'], due: ['2026-10-14'] }))
    expect(screen.getByText('2')).toBeTruthy()
    expect((screen.getByRole('checkbox', { name: 'Select all' }) as HTMLInputElement).indeterminate).toBe(true)
    expect((screen.getByRole('combobox', { name: 'Owner' }) as HTMLInputElement).value).toBe('Gamma')
  })

  it('fires native onChange and onBlur and still reports onValueChange', async () => {
    const user = userEvent.setup()
    const events = vi.fn()
    const values = vi.fn()
    render(<DiyaProvider>
      <TextInput label="Name" onChange={(event) => events('name', event.target.value)} onBlur={() => events('name blur')} onValueChange={(value) => values('name', value)} />
      <Switch label="Alerts" onChange={(event) => events('alerts', event.target.checked)} onBlur={() => events('alerts blur')} onCheckedChange={(value) => values('alerts', value)} />
      <Choice label="Plan" options={teams} onChange={(event) => events('plan', event.target.value)} onValueChange={(value) => values('plan', value)} />
      <Slider label="Volume" onChange={(event) => events('volume', event.target.value)} onValueChange={(value) => values('volume', value)} />
    </DiyaProvider>)
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'A')
    await user.click(screen.getByRole('switch', { name: 'Alerts' }))
    await user.click(screen.getByRole('radio', { name: 'Beta' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '25' } })
    expect(events.mock.calls).toEqual([['name', 'A'], ['name blur'], ['alerts', true], ['alerts blur'], ['plan', 'beta'], ['volume', '25']])
    expect(values.mock.calls).toEqual([['name', 'A'], ['alerts', true], ['plan', 'beta'], ['volume', 25]])
  })

  it('toggles a Switch with Enter and keeps it off the form while off', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><form aria-label="Prefs"><Switch label="Alerts" name="alerts" /></form></DiyaProvider>)
    const form = screen.getByRole('form', { name: 'Prefs' }) as HTMLFormElement
    expect(new FormData(form).has('alerts')).toBe(false)
    act(() => screen.getByRole('switch').focus())
    await user.keyboard('{Enter}')
    expect(new FormData(form).get('alerts')).toBe('on')
  })
})

describe('Slider min, max and step', () => {
  it('uses the given scale for the inputs, values, marks and fill', () => {
    const changes = vi.fn()
    const { container } = render(<DiyaProvider><Slider label="Temperature" min={10} max={50} step={5} value={25} onValueChange={changes} showMarks /></DiyaProvider>)
    const slider = screen.getByRole('slider', { name: 'Temperature' }) as HTMLInputElement
    expect([slider.min, slider.max, slider.step, slider.value]).toEqual(['10', '50', '5', '25'])
    expect(container.querySelector('.diya-slider-values')?.textContent).toBe('1025')
    expect(Array.from(container.querySelectorAll('.diya-slider-marks span')).map((mark) => mark.textContent)).toEqual(['10', '20', '30', '40', '50'])
    expect((container.querySelector('.diya-slider-inputs') as HTMLElement).style.getPropertyValue('--diya-internal-slider-end')).toBe('37.5%')
    fireEvent.change(slider, { target: { value: '45' } })
    expect(changes).toHaveBeenLastCalledWith(45)
  })

  it('clamps a controlled value to the range and keeps range handles in order', () => {
    const changes = vi.fn()
    function Example() {
      const [value, setValue] = useState<[number, number]>([2, 8])
      return <DiyaProvider><Slider label="Rating" range min={1} max={10} value={value} onValueChange={(next) => { changes(next); setValue(next) }} /></DiyaProvider>
    }
    render(<Example />)
    fireEvent.change(screen.getByRole('slider', { name: 'Rating maximum' }), { target: { value: '1' } })
    expect(changes).toHaveBeenLastCalledWith([2, 2])
    const view = render(<DiyaProvider><Slider label="Clamped" min={0} max={10} value={40} onValueChange={() => {}} /></DiyaProvider>)
    expect((within(view.container).getByRole('slider') as HTMLInputElement).value).toBe('10')
  })
})

describe('DatePicker calendar keyboard and limits', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })
  const calendar = () => screen.getByRole('group', { name: 'Choose date' })
  const days = () => within(calendar()).getAllByRole('button').filter((button) => button.hasAttribute('data-date'))

  it('keeps one Tab stop in the grid and moves it with the arrows', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><button>Before</button><DatePicker label="Due" defaultValue="2026-10-14" /><button>After</button></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: /Due/ }))
    expect(days().filter((day) => day.tabIndex === 0).map((day) => day.dataset.date)).toEqual(['2026-10-14'])
    await user.tab()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Previous month')
    await user.tab()
    await user.tab()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Oct 14, 2026')
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Oct 15, 2026')
    expect(days().filter((day) => day.tabIndex === 0).map((day) => day.dataset.date)).toEqual(['2026-10-15'])
    await user.tab()
    expect(document.activeElement?.textContent).toBe('Today')
    await user.tab()
    expect(document.activeElement?.textContent).toBe('Clear')
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Oct 15, 2026')
  })

  it.each([
    ['en-US', 'Su', 4, 'Oct 11, 2026', 'Oct 17, 2026'],
    ['en-GB', 'Mo', 3, '12 Oct 2026', '18 Oct 2026'],
  ])('starts the week on the %s first day', async (locale, firstHeading, blanks, home, end) => {
    const user = userEvent.setup()
    render(<DiyaProvider locale={locale}><DatePicker label="Due" defaultValue="2026-10-14" /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: /Due/ }))
    const grid = calendar().querySelector('.diya-calendar-grid')!
    expect(grid.querySelector('.diya-calendar-weekday')?.textContent).toBe(firstHeading)
    expect(Array.from(grid.children).filter((child) => child.tagName === 'SPAN' && !child.className).length).toBe(blanks)
    act(() => days().find((day) => day.dataset.date === '2026-10-14')!.focus())
    await user.keyboard('{Home}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe(home)
    await user.keyboard('{End}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe(end)
  })

  it('falls back to the region when Intl has no week data', async () => {
    const user = userEvent.setup()
    const prototype = Intl.Locale.prototype as never
    if ('weekInfo' in Intl.Locale.prototype) vi.spyOn(prototype, 'weekInfo' as never, 'get' as never).mockReturnValue(undefined as never)
    if ('getWeekInfo' in Intl.Locale.prototype) vi.spyOn(prototype, 'getWeekInfo' as never).mockReturnValue(undefined as never)
    const blanks = () => Array.from(calendar().querySelector('.diya-calendar-grid')!.children).filter((child) => child.tagName === 'SPAN' && !child.className).length
    for (const [locale, expected] of [['en-GB', 3], ['en-US', 4], ['ar-EG', 5], ['de', 3]] as const) {
      const view = render(<DiyaProvider locale={locale}><DatePicker label="Due" defaultValue="2026-10-14" /></DiyaProvider>)
      await user.click(screen.getByRole('button', { name: /Due/ }))
      expect(blanks(), locale).toBe(expected)
      view.unmount()
    }
  })

  it('marks days outside min and max unavailable and keeps choices inside', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    render(<DiyaProvider><DatePicker label="Due" min="2026-10-05" max="2026-10-20" value="" onValueChange={changes} /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: /Due/ }))
    const unavailable = days().filter((day) => day.getAttribute('aria-disabled') === 'true').map((day) => day.dataset.date)
    expect(unavailable).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', ...Array.from({ length: 11 }, (_, index) => `2026-10-${21 + index}`)])
    expect((within(calendar()).getByRole('button', { name: 'Previous month' }) as HTMLButtonElement).disabled).toBe(true)
    expect((within(calendar()).getByRole('button', { name: 'Next month' }) as HTMLButtonElement).disabled).toBe(true)
    await user.click(within(calendar()).getByRole('button', { name: 'Oct 3, 2026' }))
    expect(changes).not.toHaveBeenCalled()
    act(() => within(calendar()).getByRole('button', { name: 'Oct 6, 2026' }).focus())
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Oct 5, 2026')
    await user.keyboard('{PageDown}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Oct 20, 2026')
    await user.keyboard('{Enter}')
    expect(changes).toHaveBeenCalledExactlyOnceWith('2026-10-20')
  })

  it('opens on the nearest allowed month and disables Today outside the limits', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><DatePicker label="Due" min="2026-12-01" /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: /Due/ }))
    expect(within(calendar()).getByText('December 2026')).toBeTruthy()
    expect((within(calendar()).getByRole('button', { name: 'Today' }) as HTMLButtonElement).disabled).toBe(true)
    expect(days().filter((day) => day.tabIndex === 0).map((day) => day.dataset.date)).toEqual(['2026-12-01'])
  })
})

describe('Form and FileUpload headings', () => {
  it('makes the Form title optional and sets its heading level', () => {
    const view = render(<DiyaProvider><Form aria-label="Billing" onSubmit={() => {}}>{null}</Form></DiyaProvider>)
    expect(screen.getByRole('form', { name: 'Billing' }).querySelector('header')).toBeNull()
    view.rerender(<DiyaProvider><Form title="Billing details" headingLevel={2} description="Used on invoices." onSubmit={() => {}}>{null}</Form></DiyaProvider>)
    expect(screen.getByRole('heading', { level: 2, name: 'Billing details' })).toBeTruthy()
    expect(screen.getByRole('form', { name: 'Billing details' })).toBeTruthy()
  })

  it('sets the FileUpload heading level', () => {
    render(<DiyaProvider><FileUpload files={[]} onFilesChange={() => {}} headingLevel={2} /></DiyaProvider>)
    expect(screen.getByRole('heading', { level: 2, name: 'Add your files' })).toBeTruthy()
  })
})

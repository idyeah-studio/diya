import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Choice, DiyaProvider, Pagination, Search, Select, Slider, Switch, TextArea, TextInput, TextLink } from '../dist/index.js'

describe('portable field contracts', () => {
  it('uses native input attributes, updates customer state and clears without submitting', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    const submit = vi.fn()
    function Example() {
      const [value, setValue] = useState('')
      return <DiyaProvider><form onSubmit={(event) => { event.preventDefault(); submit() }}>
        <TextInput label="Project" name="project" required maxLength={12} autoComplete="off" value={value} clearable helperText="A customer-defined name" onValueChange={(next) => { changes(next); setValue(next) }} />
      </form></DiyaProvider>
    }
    render(<Example />)
    const input = screen.getByRole('textbox', { name: 'Project' }) as HTMLInputElement
    await user.type(input, 'Launch')
    expect(input.value).toBe('Launch')
    expect(changes).toHaveBeenLastCalledWith('Launch')
    expect(new FormData(input.form!).get('project')).toBe('Launch')
    expect(input.required).toBe(true)
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('A customer-defined name')
    await user.click(screen.getByRole('button', { name: 'Clear project' }))
    expect(input.value).toBe('')
    expect(changes).toHaveBeenLastCalledWith('')
    expect(document.activeElement).toBe(input)
    expect(submit).not.toHaveBeenCalled()
  })

  it('prevents edits to disabled and read-only controls and preserves native invalid state', async () => {
    const user = userEvent.setup()
    const change = vi.fn()
    render(<DiyaProvider>
      <TextInput label="Locked input" value="Fixed" onValueChange={change} disabled aria-invalid="grammar" />
      <TextArea label="Read-only notes" value="Existing notes" onValueChange={change} readOnly aria-invalid="spelling" />
      <Select label="Invalid selection" defaultValue="alpha" aria-invalid={true} options={[{ value: 'alpha', label: 'Alpha' }]} />
    </DiyaProvider>)
    const locked = screen.getByRole('textbox', { name: 'Locked input' }) as HTMLInputElement
    const notes = screen.getByRole('textbox', { name: 'Read-only notes' }) as HTMLTextAreaElement
    await user.type(locked, ' changed')
    await user.type(notes, ' changed')
    expect(locked.value).toBe('Fixed')
    expect(notes.value).toBe('Existing notes')
    expect(change).not.toHaveBeenCalled()
    expect(locked.getAttribute('aria-invalid')).toBe('grammar')
    expect(notes.getAttribute('aria-invalid')).toBe('spelling')
    expect(screen.getByRole('combobox', { name: 'Invalid selection' }).getAttribute('aria-invalid')).toBe('true')
  })

  it('associates an error with the native field and overrides its invalid state', () => {
    render(<DiyaProvider><TextInput label="Email" type="email" name="email" value="invalid" onValueChange={() => {}} helperText="Normal help" error="Enter a valid email" aria-invalid={false} /></DiyaProvider>)
    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toContain('Enter a valid email')
    expect(screen.queryByText('Normal help')).toBe(null)
  })

  it('updates a textarea count while honoring native length limits', async () => {
    const user = userEvent.setup()
    function Example() {
      const [value, setValue] = useState('')
      return <DiyaProvider><TextArea label="Summary" name="summary" rows={4} maxLength={5} value={value} onValueChange={setValue} showCount /></DiyaProvider>
    }
    render(<Example />)
    const input = screen.getByRole('textbox', { name: 'Summary' }) as HTMLTextAreaElement
    await user.type(input, 'abcdef')
    expect(input.value).toBe('abcde')
    expect(input.getAttribute('rows')).toBe('4')
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('5 / 5')
  })

  it('supports native select defaults and controlled change callbacks', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    function Example() {
      const [value, setValue] = useState('alpha')
      return <DiyaProvider><Select label="Team" name="team" value={value} onChange={(event) => { changes(event.target.value); setValue(event.target.value) }} options={[{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }, { value: 'locked', label: 'Locked', disabled: true }]} /></DiyaProvider>
    }
    render(<Example />)
    const select = screen.getByRole('combobox', { name: 'Team' }) as HTMLSelectElement
    await user.selectOptions(select, 'beta')
    expect(select.value).toBe('beta')
    expect(changes).toHaveBeenLastCalledWith('beta')
    await user.selectOptions(select, 'locked')
    expect(select.value).toBe('beta')
  })

  it('reports the chosen Select value through onValueChange and still calls the native onChange', async () => {
    const user = userEvent.setup()
    const values = vi.fn()
    const events = vi.fn()
    function Example() {
      const [value, setValue] = useState('alpha')
      return <DiyaProvider><Select label="Owner" value={value} onValueChange={(next) => { values(next); setValue(next) }} onChange={(event) => events(event.target.value)} options={[{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }]} /></DiyaProvider>
    }
    render(<Example />)
    const select = screen.getByRole('combobox', { name: 'Owner' }) as HTMLSelectElement
    await user.selectOptions(select, 'beta')
    expect(values).toHaveBeenCalledExactlyOnceWith('beta')
    expect(events).toHaveBeenCalledExactlyOnceWith('beta')
    expect(select.value).toBe('beta')
  })

  it('puts className and style on the field wrapper and other attributes on the control', () => {
    render(<DiyaProvider>
      <TextInput label="Name" value="" onValueChange={() => {}} className="name-field" style={{ maxWidth: 320 }} data-testid="name-control" />
      <TextArea label="Notes" value="" onValueChange={() => {}} className="notes-field" style={{ maxWidth: 400 }} data-testid="notes-control" />
      <Select label="Plan" defaultValue="" className="plan-field" style={{ maxWidth: 240 }} data-testid="plan-control" options={[{ value: 'basic', label: 'Basic' }]} />
      <Search label="Find" value="" onValueChange={() => {}} className="find-field" style={{ maxWidth: 280 }} data-testid="find-control" />
    </DiyaProvider>)
    for (const [name, role, className, width, testId] of [
      ['Name', 'textbox', 'name-field', '320px', 'name-control'],
      ['Notes', 'textbox', 'notes-field', '400px', 'notes-control'],
      ['Plan', 'combobox', 'plan-field', '240px', 'plan-control'],
      ['Find', 'searchbox', 'find-field', '280px', 'find-control'],
    ] as const) {
      const control = screen.getByRole(role, { name })
      const wrapper = control.closest(`.${className}`) as HTMLElement
      expect(wrapper, name).not.toBe(null)
      expect(wrapper).not.toBe(control)
      expect(wrapper.style.maxWidth).toBe(width)
      expect(control.classList.contains(className)).toBe(false)
      expect(control.style.maxWidth).toBe('')
      expect(control.getAttribute('data-testid')).toBe(testId)
    }
  })

  it('clears controlled Search values and restores focus', async () => {
    const user = userEvent.setup()
    function Example() {
      const [value, setValue] = useState('')
      return <DiyaProvider><Search label="Search projects" value={value} onValueChange={setValue} clearable /></DiyaProvider>
    }
    render(<Example />)
    const search = screen.getByRole('searchbox', { name: 'Search projects' }) as HTMLInputElement
    await user.type(search, 'Website')
    await user.click(screen.getByRole('button', { name: 'Clear search projects' }))
    expect(search.value).toBe('')
    expect(document.activeElement).toBe(search)
  })

  it('selects only enabled choices and keeps descriptions valid for values containing spaces', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    function Example() {
      const [value, setValue] = useState(['locked'])
      return <DiyaProvider><Choice multiple label="Regions" value={value} selectAll options={[{ value: 'New York', label: 'New York', description: 'East coast' }, { value: 'California', label: 'California' }, { value: 'locked', label: 'Locked', disabled: true }]} onValueChange={(next) => { changes(next); setValue(next) }} /></DiyaProvider>
    }
    render(<Example />)
    const choice = screen.getByRole('checkbox', { name: /New York/ })
    expect(document.getElementById(choice.getAttribute('aria-describedby')!)?.textContent).toBe('East coast')
    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))
    expect(changes).toHaveBeenLastCalledWith(['locked', 'New York', 'California'])
    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))
    expect(changes).toHaveBeenLastCalledWith(['locked'])
  })

  it('shows an option description whenever the option has one', () => {
    render(<DiyaProvider><Choice label="Plan" value="basic" onValueChange={() => {}} options={[{ value: 'basic', label: 'Basic', description: 'One project' }, { value: 'team', label: 'Team' }]} /></DiyaProvider>)
    const basic = screen.getByRole('radio', { name: /Basic/ })
    expect(screen.getByText('One project')).toBeTruthy()
    expect(document.getElementById(basic.getAttribute('aria-describedby')!)?.textContent).toBe('One project')
    expect(screen.getByRole('radio', { name: 'Team' }).hasAttribute('aria-describedby')).toBe(false)
  })

  it('selects one radio choice and reports its value as a string', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    function Example() {
      const [value, setValue] = useState('monthly')
      return <DiyaProvider><Choice label="Billing" value={value} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} onValueChange={(next) => { changes(next); setValue(next) }} /></DiyaProvider>
    }
    render(<Example />)
    expect(screen.queryByRole('checkbox')).toBe(null)
    expect((screen.getByRole('radio', { name: 'Monthly' }) as HTMLInputElement).checked).toBe(true)
    await user.click(screen.getByRole('radio', { name: 'Yearly' }))
    expect(changes).toHaveBeenLastCalledWith('yearly')
    expect((screen.getByRole('radio', { name: 'Yearly' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: 'Monthly' }) as HTMLInputElement).checked).toBe(false)
  })

  it('uses keyboard activation for a controlled switch', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    function Example() {
      const [checked, setChecked] = useState(false)
      return <DiyaProvider><Switch label="Notifications" helperText="Project updates" checked={checked} onCheckedChange={(next) => { changes(next); setChecked(next) }} /><Switch label="Locked switch" checked={false} disabled onCheckedChange={changes} /></DiyaProvider>
    }
    render(<Example />)
    await user.tab()
    await user.keyboard(' ')
    expect((screen.getByRole('switch', { name: 'Notifications' }) as HTMLInputElement).checked).toBe(true)
    await user.keyboard('{Enter}')
    expect(changes.mock.calls.map(([value]) => value)).toEqual([true, false])
    await user.click(screen.getByRole('switch', { name: 'Locked switch' }))
    expect(changes).toHaveBeenCalledTimes(2)
  })

  it('shows helper text on a switch, and replaces it with an error marked invalid', () => {
    const view = render(<DiyaProvider><Switch label="Alerts" helperText="Sent by email" checked={false} onCheckedChange={() => {}} /></DiyaProvider>)
    const control = screen.getByRole('switch', { name: 'Alerts' })
    expect(document.getElementById(control.getAttribute('aria-describedby')!)?.textContent).toBe('Sent by email')
    expect(control.hasAttribute('aria-invalid')).toBe(false)
    view.rerender(<DiyaProvider><Switch label="Alerts" helperText="Sent by email" error="Add an email address first" checked={false} onCheckedChange={() => {}} /></DiyaProvider>)
    expect(control.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(control.getAttribute('aria-describedby')!)?.textContent).toBe('Add an email address first')
    expect(screen.queryByText('Sent by email')).toBe(null)
  })

  it('shows the slider label unless hideLabel is set, keeping the accessible name either way', () => {
    const view = render(<DiyaProvider><Slider label="Opacity" value={30} onValueChange={() => {}} /></DiyaProvider>)
    expect(screen.getByText('Opacity')).toBeTruthy()
    expect(screen.getByRole('slider', { name: 'Opacity' })).toBeTruthy()
    view.rerender(<DiyaProvider><Slider label="Opacity" hideLabel value={30} onValueChange={() => {}} /></DiyaProvider>)
    expect(screen.queryByText('Opacity')).toBe(null)
    expect(screen.getByRole('slider', { name: 'Opacity' })).toBeTruthy()
  })

  it('shows slider values by default and marks only with showMarks', () => {
    const view = render(<DiyaProvider><Slider label="Range" range value={[20, 60]} onValueChange={() => {}} /></DiyaProvider>)
    expect(screen.getByText('20')).toBeTruthy()
    expect(screen.getByText('60')).toBeTruthy()
    expect(screen.queryByText('75')).toBe(null)
    view.rerender(<DiyaProvider><Slider label="Range" range showValues={false} showMarks value={[20, 60]} onValueChange={() => {}} /></DiyaProvider>)
    expect(screen.queryByText('20')).toBe(null)
    expect(screen.getByText('75')).toBeTruthy()
  })

  it('keeps the range-slider handles from crossing through native input changes', () => {
    const changes = vi.fn()
    function Example() {
      const [value, setValue] = useState<[number, number]>([25, 75])
      return <DiyaProvider><Slider label="Budget" range value={value} onValueChange={(next) => { changes(next); setValue(next) }} /></DiyaProvider>
    }
    render(<Example />)
    fireEvent.change(screen.getByRole('slider', { name: 'Budget minimum' }), { target: { value: '90' } })
    expect(changes).toHaveBeenLastCalledWith([75, 75])
    fireEvent.change(screen.getByRole('slider', { name: 'Budget maximum' }), { target: { value: '10' } })
    expect(changes).toHaveBeenLastCalledWith([75, 75])
  })

  it('reports a single slider value as a number', () => {
    const changes = vi.fn()
    function Example() {
      const [value, setValue] = useState(40)
      return <DiyaProvider><Slider label="Volume" value={value} onValueChange={(next) => { changes(next); setValue(next) }} /></DiyaProvider>
    }
    render(<Example />)
    const slider = screen.getByRole('slider', { name: 'Volume' }) as HTMLInputElement
    expect(screen.getAllByRole('slider')).toHaveLength(1)
    fireEvent.change(slider, { target: { value: '65' } })
    expect(changes).toHaveBeenLastCalledWith(65)
    expect(slider.value).toBe('65')
  })

  it('takes a node as an option label: links open without toggling, and the name is the label\'s text', async () => {
    const user = userEvent.setup()
    const changes = vi.fn()
    const opened = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    render(
      <DiyaProvider>
        <Choice label="Consent" multiple onValueChange={changes} options={[
          { value: 'agree', label: <>I agree to the <TextLink href="/terms" inline onClick={opened}>Terms</TextLink> and <TextLink href="/privacy" inline onClick={opened}>Privacy Policy</TextLink></> },
          { value: 'news', label: 'Send me news' },
        ]} />
        <Choice label="Color" defaultValue="red" options={[
          { value: 'red', label: <><span aria-hidden="true" className="swatch" />Red</> },
          { value: 'blue', label: <><span aria-hidden="true" className="swatch" />Blue</> },
        ]} />
      </DiyaProvider>
    )
    const agree = screen.getByRole('checkbox', { name: 'I agree to the Terms and Privacy Policy' }) as HTMLInputElement
    await user.click(screen.getByRole('link', { name: 'Terms' }))
    expect(opened).toHaveBeenCalledTimes(1)
    expect(agree.checked).toBe(false)
    expect(changes).not.toHaveBeenCalled()
    await user.click(screen.getByText('Send me news'))
    expect(changes).toHaveBeenLastCalledWith(['news'])
    // Keyboard: Space toggles the box; Tab then reaches the links, which are their own stops.
    agree.focus()
    await user.keyboard(' ')
    expect(agree.checked).toBe(true)
    expect(changes).toHaveBeenLastCalledWith(['agree', 'news'])
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Terms' }))
    // A swatch is hidden, so the radio is named by its word.
    expect((screen.getByRole('radio', { name: 'Red' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByRole('radio', { name: 'Blue' })).toBeTruthy()
  })

  it('formats the shown values, the marks and both handles\' aria-valuetext with formatValue', () => {
    const dollars = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    function Example() {
      const [value, setValue] = useState<[number, number]>([200, 800])
      return <DiyaProvider><Slider label="Price" range min={0} max={1000} step={50} showMarks formatValue={dollars} value={value} onValueChange={setValue} /></DiyaProvider>
    }
    const { container } = render(<Example />)
    const start = screen.getByRole('slider', { name: 'Price minimum' })
    const end = screen.getByRole('slider', { name: 'Price maximum' })
    expect(start.getAttribute('aria-valuetext')).toBe('$200')
    expect(end.getAttribute('aria-valuetext')).toBe('$800')
    expect([...container.querySelectorAll('.diya-slider-values span')].map((node) => node.textContent)).toEqual(['$200', '$800'])
    expect([...container.querySelectorAll('.diya-slider-marks span')].map((node) => node.textContent)).toEqual(['$0', '$250', '$500', '$750', '$1,000'])
    // The value attribute stays a plain number for forms; only the announced text is formatted.
    fireEvent.change(end, { target: { value: '950' } })
    expect((end as HTMLInputElement).value).toBe('950')
    expect(end.getAttribute('aria-valuetext')).toBe('$950')
    expect(container.querySelector('.diya-slider-values')!.textContent).toBe('$200$950')
  })

  it('formats a single, uncontrolled slider and leaves aria-valuetext alone without formatValue', () => {
    const view = render(<DiyaProvider><Slider label="Tip" defaultValue={15} formatValue={(value) => `${value}%`} /></DiyaProvider>)
    const slider = screen.getByRole('slider', { name: 'Tip' })
    expect(slider.getAttribute('aria-valuetext')).toBe('15%')
    fireEvent.change(slider, { target: { value: '20' } })
    expect(slider.getAttribute('aria-valuetext')).toBe('20%')
    view.unmount()
    render(<DiyaProvider><Slider label="Volume" defaultValue={40} aria-valuetext="Medium" /></DiyaProvider>)
    expect(screen.getByRole('slider', { name: 'Volume' }).getAttribute('aria-valuetext')).toBe('Medium')
    expect(screen.getByText('40')).toBeTruthy()
  })

  it('reports page and page-size changes to the host', async () => {
    const user = userEvent.setup()
    const pageChanges = vi.fn()
    const sizeChanges = vi.fn()
    function Example() {
      const [page, setPage] = useState(1)
      const [size, setSize] = useState(10)
      return <DiyaProvider><Pagination page={page} pageSize={size} total={95} onPageChange={(next) => { pageChanges(next); setPage(next) }} onPageSizeChange={(next) => { sizeChanges(next); setSize(next); setPage(1) }} /></DiyaProvider>
    }
    render(<Example />)
    expect((screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(pageChanges).toHaveBeenLastCalledWith(2)
    expect(screen.getByRole('status').textContent).toBe('11–20 of 95')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Results per page' }), '25')
    expect(sizeChanges).toHaveBeenLastCalledWith(25)
    expect(screen.getByRole('status').textContent).toBe('1–25 of 95')
  })
})

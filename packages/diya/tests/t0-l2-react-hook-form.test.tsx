import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { Choice, DiyaProvider, Select, Slider, Switch, TextArea, TextInput } from '../dist/index.js'

type Values = { name: string; bio: string; team: string; notify: boolean; plan: string; volume: number }
const defaults: Values = { name: '', bio: '', team: '', notify: false, plan: 'basic', volume: 30 }

// Plain register() on every field: no Controller anywhere.
function Settings({ onSave, form: expose, initial = defaults }: { onSave: (values: Values) => void; form: { current?: UseFormReturn<Values> }; initial?: Values }) {
  const form = useForm<Values>({ defaultValues: initial })
  expose.current = form
  const { errors } = form.formState
  return <DiyaProvider>
    <form onSubmit={form.handleSubmit(onSave)}>
      <TextInput label="Name" clearable {...form.register('name', { required: 'Add a name' })} error={errors.name?.message} />
      <TextArea label="Bio" showCount maxLength={80} {...form.register('bio')} />
      <Select label="Team" options={[{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }]} {...form.register('team', { required: 'Choose a team' })} error={errors.team?.message} />
      <Switch label="Email me" {...form.register('notify')} />
      <Choice label="Plan" options={[{ value: 'basic', label: 'Basic' }, { value: 'pro', label: 'Pro' }]} {...form.register('plan')} />
      <Slider label="Volume" step={10} {...form.register('volume', { valueAsNumber: true })} />
      <button type="submit">Save</button>
    </form>
  </DiyaProvider>
}

describe('react-hook-form register() with no Controller', () => {
  it('submits every field, focuses the first invalid field, and lands setFocus on the native control', async () => {
    const user = userEvent.setup()
    const save = vi.fn()
    const form: { current?: UseFormReturn<Values> } = {}
    render(<Settings onSave={save} form={form} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' })))
    expect(screen.getByText('Add a name')).toBeTruthy()
    expect(save).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Team' })))
    expect(save).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox', { name: 'Bio' }), 'Hello')
    expect(screen.getByText('5 / 80')).toBeTruthy()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Team' }), 'beta')
    await user.click(screen.getByRole('switch', { name: 'Email me' }))
    await user.click(screen.getByRole('radio', { name: 'Pro' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '60' } })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    expect(save.mock.calls[0][0]).toEqual({ name: 'Ada', bio: 'Hello', team: 'beta', notify: true, plan: 'pro', volume: 60 })

    for (const [name, element] of [
      ['name', screen.getByRole('textbox', { name: 'Name' })],
      ['bio', screen.getByRole('textbox', { name: 'Bio' })],
      ['team', screen.getByRole('combobox', { name: 'Team' })],
      ['notify', screen.getByRole('switch', { name: 'Email me' })],
      ['plan', screen.getByRole('radio', { name: 'Basic' })],
      ['volume', screen.getByRole('slider', { name: 'Volume' })],
    ] as const) {
      // setFocus focuses on the next task.
      act(() => form.current!.setFocus(name))
      await waitFor(() => expect(document.activeElement, name).toBe(element))
    }
  })

  it('reset() returns the native controls and DIYA-drawn parts to the defaults', async () => {
    const user = userEvent.setup()
    const save = vi.fn()
    const form: { current?: UseFormReturn<Values> } = {}
    render(<Settings onSave={save} form={form} initial={{ ...defaults, name: 'Ada' }} />)
    const name = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement
    const team = screen.getByRole('combobox', { name: 'Team' }) as HTMLSelectElement
    const notify = screen.getByRole('switch', { name: 'Email me' }) as HTMLInputElement
    const slider = screen.getByRole('slider', { name: 'Volume' }) as HTMLInputElement
    expect(name.value).toBe('Ada')
    expect(slider.value).toBe('30')

    await user.clear(name)
    await user.type(name, 'Grace')
    await user.type(screen.getByRole('textbox', { name: 'Bio' }), 'Hi')
    await user.selectOptions(team, 'alpha')
    await user.click(notify)
    await user.click(screen.getByRole('radio', { name: 'Pro' }))
    fireEvent.change(slider, { target: { value: '90' } })
    expect(document.querySelector('.diya-slider-values')?.textContent).toContain('90')

    await act(async () => form.current!.reset())
    await waitFor(() => expect(name.value).toBe('Ada'))
    expect((screen.getByRole('textbox', { name: 'Bio' }) as HTMLTextAreaElement).value).toBe('')
    expect(screen.getByText('0 / 80')).toBeTruthy()
    expect(team.value).toBe('')
    expect(notify.checked).toBe(false)
    expect((screen.getByRole('radio', { name: 'Basic' }) as HTMLInputElement).checked).toBe(true)
    expect(slider.value).toBe('30')
    expect(document.querySelector('.diya-slider-values')?.textContent).toContain('30')

    await user.selectOptions(team, 'beta')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    expect(save.mock.calls[0][0]).toEqual({ name: 'Ada', bio: '', team: 'beta', notify: false, plan: 'basic', volume: 30 })
  })

  it('shows default values written by react-hook-form, including an on Switch', () => {
    const form: { current?: UseFormReturn<Values> } = {}
    render(<Settings onSave={() => {}} form={form} initial={{ name: 'Ada', bio: 'Notes', team: 'beta', notify: true, plan: 'pro', volume: 70 }} />)
    expect((screen.getByRole('switch', { name: 'Email me' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('combobox', { name: 'Team' }) as HTMLSelectElement).value).toBe('beta')
    expect((screen.getByRole('radio', { name: 'Pro' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText('5 / 80')).toBeTruthy()
    expect(document.querySelector('.diya-slider-values')?.textContent).toContain('70')
    expect(screen.getByRole('button', { name: 'Clear name' })).toBeTruthy()
  })

  it('clears a registered TextInput through the input, so the form sees the empty value', async () => {
    const user = userEvent.setup()
    const save = vi.fn()
    const form: { current?: UseFormReturn<Values> } = {}
    render(<Settings onSave={save} form={form} initial={{ ...defaults, name: 'Ada', team: 'alpha' }} />)
    await user.click(screen.getByRole('button', { name: 'Clear name' }))
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' }))
    expect(form.current!.getValues('name')).toBe('')
    expect(screen.queryByRole('button', { name: 'Clear name' })).toBeNull()
  })
})

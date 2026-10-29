import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { Breadcrumbs, Button, DiyaProvider, Tabs } from '../dist/index.js'

it('retains native Button refs, form safety and loading activation protection', async () => {
  const user = userEvent.setup()
  const ref = createRef<HTMLButtonElement>()
  const submit = vi.fn()
  const click = vi.fn()
  render(<DiyaProvider><form onSubmit={(event) => { event.preventDefault(); submit() }}>
    <Button ref={ref} onClick={click}>Save</Button>
    <Button iconOnly loading aria-label="Add item" onClick={click}>+</Button>
  </form></DiyaProvider>)
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(ref.current).toBe(screen.getByRole('button', { name: 'Save' }))
  expect(click).toHaveBeenCalledOnce()
  expect(submit).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Add item' }))
  expect(click).toHaveBeenCalledOnce()
})

it('retains keyboard tab selection and its matching accessible panel', async () => {
  const user = userEvent.setup()
  function Example() {
    const [value, setValue] = useState('first')
    return <DiyaProvider><Tabs label="Sections" value={value} onValueChange={setValue} items={[
      { value: 'first', label: 'First', content: 'First content' },
      { value: 'second', label: 'Second', content: 'Second content', disabled: true },
      { value: 'third', label: 'Third', content: 'Third content' },
    ]} /></DiyaProvider>
  }
  render(<Example />)
  await user.tab()
  await user.keyboard('{ArrowRight}')
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Third' }))
  expect(screen.getByRole('tab', { name: 'Third' }).getAttribute('aria-selected')).toBe('true')
  expect(screen.getByRole('tabpanel').textContent).toBe('Third content')
})

it('retains scoped breadcrumb menus and logical Tab navigation', async () => {
  const user = userEvent.setup()
  render(<DiyaProvider theme="dark" glass><Button>Before breadcrumbs</Button><Breadcrumbs collapsed items={[
    { label: 'Home', href: '#home' }, { label: 'Projects', href: '#projects' }, { label: 'Design', href: '#design' }, { label: 'Details', href: '#details' },
  ]} /><Button>After breadcrumbs</Button></DiyaProvider>)
  const trigger = screen.getByRole('button', { name: 'More pages' })
  await user.click(trigger)
  expect(screen.getByRole('menu').closest('.diya-root')?.getAttribute('data-glass')).toBe('true')
  await user.tab()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After breadcrumbs' }))
  expect(screen.queryByRole('menu')).toBe(null)
  await user.click(trigger)
  await user.tab({ shift: true })
  expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Home' }))
})

it('defaults Button to the pill shape and keeps a requested shape', () => {
  render(<DiyaProvider><Button>Default</Button><Button shape="rounded">Rounded</Button><Button shape="pill">Pill</Button></DiyaProvider>)
  expect(screen.getByRole('button', { name: 'Default' }).getAttribute('data-shape')).toBe('pill')
  expect(screen.getByRole('button', { name: 'Rounded' }).getAttribute('data-shape')).toBe('rounded')
  expect(screen.getByRole('button', { name: 'Pill' }).getAttribute('data-shape')).toBe('pill')
})

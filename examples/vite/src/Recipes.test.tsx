import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiyaProvider } from '@idyeah/diya'
import { PatternExamples } from './PatternExamples'
import { AtomExamples } from './AtomExamples'
import DataVizExample from './DataVizExample'
import type { PatternId } from './data'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
function open(id: PatternId) {
  return render(
    <DiyaProvider>
      <PatternExamples id={id} />
    </DiyaProvider>
  )
}

describe('supplementary installed library recipes', () => {
  it('runs the composed Site Header recipe with search recovery and an actual account action', async () => {
    const user = userEvent.setup()
    open('site-header')
    const search = screen.getByRole('searchbox', { name: 'Search projects' })
    await user.type(search, 'missing project')
    expect(screen.getByRole('heading', { name: 'No matching projects' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(document.activeElement).toBe(search)
    expect(screen.getAllByRole('article')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Account for Alex Morgan' }))
    await user.click(screen.getByRole('menuitem', { name: 'View profile' }))
    expect(screen.getByRole('heading', { name: 'Alex Morgan' })).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'Alex Morgan' })).toBeTruthy()
    expect(screen.getByText(/Alex owns Nuvio/)).toBeTruthy()
  })

  it('validates a form and creates a caller-owned local record', async () => {
    const user = userEvent.setup()
    open('form')
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    const name = screen.getByLabelText('Project name', { exact: true })
    expect(document.activeElement === name).toBe(true)
    await user.type(name, 'Consumer project')
    await user.type(screen.getByLabelText('Owner email', { exact: true }), 'owner@example.com')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Priority' }), 'urgent')
    await user.click(screen.getByRole('combobox', { name: 'Team' }))
    await user.click(screen.getByRole('option', { name: 'Engineering' }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: /Due date/ }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Saved project context')
    await user.click(screen.getByRole('switch', { name: 'Project updates' }))
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    const records = screen.getByRole('list', { name: 'Projects created in this example' })
    expect(records.textContent).toContain('Consumer project')
    expect(records.textContent).toContain('owner@example.com')
    expect(screen.getByText('1 project created in this example.')).toBeTruthy()
    expect((name as HTMLInputElement).value).toBe('')
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(within(records).getAllByRole('listitem')).toHaveLength(1)
    await user.click(within(records).getByRole('button', { name: /Consumer project/ }))
    const details = screen.getByRole('dialog', { name: 'Consumer project' })
    expect(details.textContent).toContain('Urgent')
    expect(details.textContent).toContain('Engineering')
    expect(details.textContent).toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(details.textContent).toContain('Saved project context')
    expect(details.textContent).toContain('Off')
  })

  it('runs the wizard with real validation, completion and reset focus', async () => {
    const user = userEvent.setup()
    open('wizard')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    const name = screen.getByLabelText('Project name', { exact: true })
    expect(document.activeElement === name).toBe(true)
    await user.type(name, 'Wizard project')
    await user.type(screen.getByLabelText('Owner email', { exact: true }), 'owner@example.com')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(
      document.activeElement === screen.getByRole('heading', { name: 'Choose your team' })
    ).toBe(true)
    await user.click(screen.getByRole('combobox', { name: 'Team' }))
    await user.click(screen.getByRole('option', { name: 'Engineering' }))
    await user.keyboard('{Escape}')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Priority' }), 'urgent')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(
      document.activeElement === screen.getByRole('heading', { name: 'Review your project' })
    ).toBe(true)
    expect(screen.getByText('Engineering')).toBeTruthy()
    expect(screen.getByText('Urgent')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(
      document.activeElement ===
        screen.getByRole('heading', { name: 'Project created in this example' })
    ).toBe(true)
    expect(screen.getByText('Wizard project · owner@example.com')).toBeTruthy()
    expect(screen.getByText('Engineering')).toBeTruthy()
    expect(screen.getByText('Urgent')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Create another' }))
    expect(document.activeElement === screen.getByLabelText('Project name', { exact: true })).toBe(
      true
    )
  })

  it('archives the selected table rows and restores the sample data', async () => {
    const user = userEvent.setup()
    open('table')
    await user.click(screen.getByRole('checkbox', { name: 'Select this page' }))
    await user.click(screen.getByRole('button', { name: 'Archive' }))
    expect(screen.getByText('2 projects · 0 selected')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Restore projects' }))
    expect(screen.getByText('7 projects · 0 selected')).toBeTruthy()
  })

  it('adds only user-authored conversation content and exposes a real stop callback', async () => {
    const user = userEvent.setup()
    open('chatbot')
    await user.type(screen.getByLabelText('Message', { exact: true }), 'A local message')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    const log = screen.getByRole('log', { name: 'Local conversation messages' })
    expect(log.querySelectorAll('[data-role=user]').length).toBe(1)
    expect(log.querySelectorAll('[data-role=assistant]').length).toBe(0)
    await user.type(
      screen.getByLabelText('Assistant note', { exact: true }),
      'A manually written note'
    )
    await user.click(screen.getByRole('button', { name: 'Add assistant note' }))
    expect(log.querySelectorAll('[data-role=assistant]').length).toBe(1)
    expect(log.textContent).toContain('A manually written note')
    await user.click(screen.getByRole('switch', { name: 'Loading state' }))
    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(screen.getByRole('switch', { name: 'Loading state' }).getAttribute('aria-checked')).toBe(
      'false'
    )
    expect(document.activeElement === screen.getByLabelText('Message', { exact: true })).toBe(true)
  })
  it('opens the Page Header Projects destination and restores project context', async () => {
    const user = userEvent.setup()
    open('page-header')
    await user.click(screen.getByRole('button', { name: 'Add task' }))
    await user.click(screen.getByRole('button', { name: 'Follow' }))
    await user.click(screen.getByRole('tab', { name: 'Activity' }))
    await user.click(screen.getByRole('link', { name: 'Projects' }))
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Projects' }))
    expect(screen.queryByRole('heading', { name: 'Website launch' })).toBeNull()
    await user.click(
      within(screen.getByRole('list', { name: 'Projects' })).getByRole('button', {
        name: /Website launch/,
      })
    )
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Website launch' }))
    expect(screen.getByRole('tab', { name: 'Activity' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('13 tasks · Following')).toBeTruthy()
  })

  it('keeps focus on useful content when Content State actions replace themselves', async () => {
    const user = userEvent.setup()
    open('empty-state')
    await user.click(screen.getByRole('button', { name: 'Add a task' }))
    expect(screen.getByRole('list', { name: 'Tasks added here' }).textContent).toContain(
      'Review the website'
    )
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Task results' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'State' }), 'no-results')
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByRole('list', { name: 'Matching tasks' }).textContent).toContain(
      'Website launch'
    )
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Search tasks' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'State' }), 'error')
    await user.click(screen.getByRole('button', { name: 'Return to tasks' }))
    expect(screen.getByRole('heading', { name: 'Your tasks start here' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Task results' }))
  })

  it('exposes Card details as a named disclosure and retains saved state', async () => {
    const user = userEvent.setup()
    open('card')
    const details = screen.getByRole('button', { name: 'View details' })
    expect(details.getAttribute('aria-expanded')).toBe('false')
    await user.click(details)
    expect(details.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(details.getAttribute('aria-controls')!)?.hidden).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: 'Saved' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('makes the Table inspected record reachable and allows inspecting the same row again', async () => {
    const user = userEvent.setup()
    open('table')
    for (let attempt = 0; attempt < 2; attempt++) {
      await user.click(screen.getByRole('button', { name: 'Actions for Website launch' }))
      await user.click(screen.getByRole('menuitem', { name: 'View details' }))
      const details = screen.getByRole('region', { name: 'Project details' })
      expect(details.textContent).toContain('Morgan Lee')
      expect(document.activeElement).toBe(details)
    }
  })

  it('keeps tag deletion and restore focus in the example controls', async () => {
    const user = userEvent.setup()
    render(
      <DiyaProvider>
        <AtomExamples id="tag" />
      </DiyaProvider>
    )
    await user.click(screen.getByRole('button', { name: 'Remove Design' }))
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Planning' }))
    )
    await user.click(screen.getByRole('button', { name: 'Remove Planning' }))
    await user.click(screen.getByRole('button', { name: 'Remove Research' }))
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Restore tags' }))
    )
    await user.click(screen.getByRole('button', { name: 'Restore tags' }))
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Design' }))
    )
  })

  it('reconciles accessible chart categories, summary and empty-data controls', async () => {
    const user = userEvent.setup()
    // A measured host permits the real SVG engine to initialize in HappyDOM.
    // This asserts accessible data, not visual geometry.
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
      this: HTMLElement
    ) {
      return this.classList.contains('diya-data-viz') ? 640 : 0
    })
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
      this: HTMLElement
    ) {
      return this.classList.contains('diya-data-viz') ? 300 : 0
    })
    render(
      <DiyaProvider>
        <DataVizExample />
      </DiyaProvider>
    )
    await user.selectOptions(screen.getByRole('combobox', { name: 'Variant' }), 'Smooth')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'Donut')
    expect((screen.getByRole('combobox', { name: 'Variant' }) as HTMLSelectElement).value).toBe(
      'standard'
    )
    expect(screen.getByText('Light data · 3 categories · Donut chart · 300px height')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Show data table' }))
    const table = screen.getByRole('table', { name: 'Values supplied by the example' })
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(screen.getByText('Total visits').parentElement?.textContent).toContain('2,346')
    await user.click(screen.getByRole('button', { name: 'Dense data' }))
    expect(within(table).getAllByRole('row')).toHaveLength(7)
    await user.click(screen.getByRole('switch', { name: 'Empty data' }))
    expect(screen.getByText('Empty dataset selected.')).toBeTruthy()
    expect(screen.getByText('Total visits').parentElement?.textContent).toContain('0')
  })
})

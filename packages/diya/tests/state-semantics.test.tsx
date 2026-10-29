import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContentState, DiyaProvider } from '../dist/index.js'
import { DataViz } from '../dist/data-viz/index.js'

// Exercise real disclosure/data behavior; SVG drawing is covered by browser review.
vi.mock('echarts/core', () => ({
  use: vi.fn(),
  init: vi.fn(() => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), getOption: () => undefined })),
}))

describe('status copy and chart data disclosures', () => {
  it('keeps a title-only Content State live, and excludes its retry action from the announced copy', async () => {
    const retry = vi.fn()
    const user = userEvent.setup()
    const view = render(<DiyaProvider><ContentState title="Could not load projects" urgent action={{ label: 'Retry projects', onClick: retry }} /></DiyaProvider>)
    const alert = screen.getByRole('alert')
    expect(within(alert).getByRole('heading', { name: 'Could not load projects' })).toBeTruthy()
    expect(within(alert).queryByRole('button')).toBeNull()
    const action = screen.getByRole('button', { name: 'Retry projects' })
    await user.click(action)
    expect(retry).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(action)
    view.rerender(<DiyaProvider><ContentState title="No matching projects" description="Try another owner or keyword." action={{ label: 'Retry projects', onClick: retry }} /></DiyaProvider>)
    expect(screen.queryByRole('alert')).toBeNull()
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('No matching projectsTry another owner or keyword.')
    expect(within(status).queryByRole('button')).toBeNull()
    expect(document.activeElement).toBe(action)
  })

  it('announces an urgent Content State as an alert and any other as a status', () => {
    const view = render(<DiyaProvider><ContentState title="Payment failed" urgent /></DiyaProvider>)
    expect(screen.getByRole('alert').textContent).toBe('Payment failed')
    expect(screen.queryByRole('status')).toBeNull()
    view.rerender(<DiyaProvider><ContentState title="Payment failed" urgent={false} /></DiyaProvider>)
    expect(screen.getByRole('status').textContent).toBe('Payment failed')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('reports independent data-table disclosure state and keeps an expanded table current with caller data', async () => {
    const user = userEvent.setup()
    const example = (budget: number) => <DiyaProvider>
      <DataViz title="Budget" type="line" categories={['October']} series={[{ name: 'Budget', values: [budget] }]} />
      <DataViz title="Revenue" type="line" categories={['October']} series={[{ name: 'Revenue', values: [90] }]} />
    </DiyaProvider>
    const view = render(example(42))
    const [budget, revenue] = screen.getAllByRole('button', { name: 'Show data table' })
    expect(budget.getAttribute('aria-expanded')).toBe('false')
    expect(revenue.getAttribute('aria-expanded')).toBe('false')
    await user.click(budget)
    const table = screen.getByRole('table', { name: 'Budget data' })
    expect(budget.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(budget.getAttribute('aria-controls')!)).toBe(table)
    expect(within(table).getByRole('cell', { name: '42' })).toBeTruthy()
    expect(revenue.getAttribute('aria-expanded')).toBe('false')
    const scroll = screen.getByRole('region', { name: 'Budget data table' })
    expect(scroll.contains(table)).toBe(true)
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(scroll)
    await user.tab()
    expect(document.activeElement).toBe(budget)
    view.rerender(example(54))
    expect(within(table).getByRole('cell', { name: '54' })).toBeTruthy()
    expect(document.activeElement).toBe(budget)
    const budgetId = table.id
    await user.keyboard('{Enter}')
    expect(budget.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('table', { name: 'Budget data' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Budget data table' })).toBeNull()
    expect(budget.hasAttribute('aria-controls')).toBe(false)
    await user.click(revenue)
    const revenueTable = screen.getByRole('table', { name: 'Revenue data' })
    expect(revenueTable.id).not.toBe(budgetId)
    expect(document.getElementById(revenue.getAttribute('aria-controls')!)).toBe(revenueTable)
    expect(within(revenueTable).getByRole('cell', { name: '90' })).toBeTruthy()
  })
})

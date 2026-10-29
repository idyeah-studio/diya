import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiyaProvider } from '../dist/index.js'
import { DataViz } from '../dist/data-viz/index.js'
import { DiyaProvider as SourceProvider } from '../src/DiyaProvider.js'
import { Chart as SourceChart } from '../src/data-viz/DataViz.js'

const chartMock = vi.hoisted(() => ({
  setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(),
  getOption: vi.fn((): { legend: { selected: Record<string, boolean> }[] } | undefined => ({ legend: [{ selected: {} }] })),
}))

// These tests cover the accessible data controls, while real SVG rendering,
// tooltips, resizing and native browser layout are verified separately.
vi.mock('echarts/core', () => ({
  use: vi.fn(),
  init: vi.fn(() => chartMock),
  format: { getTextRect: (text: string, font: string) => ({ width: text.length * Number.parseFloat(font) * .55, height: Number.parseFloat(font) }) },
}))

afterEach(() => vi.unstubAllGlobals())

describe('optional charts public entry point', () => {
  it('keeps its accessible name and actions when the visible header is omitted', () => {
    render(<DiyaProvider><DataViz title="Revenue" showHeader={false} description="Visible description" type="line" actions={<button>Change period</button>} categories={['Jan']} series={[{name:'Revenue',values:[10]}]}/></DiyaProvider>)
    expect(screen.queryByRole('heading', {name:'Revenue'})).toBe(null)
    expect(screen.queryByText('Visible description')).toBe(null)
    expect(screen.getByRole('button', {name:'Change period'})).toBeTruthy()
    expect(screen.getByRole('img', {name:/Revenue/})).toBeTruthy()
  })

  it('toggles a caller-supplied data table and formats missing values honestly', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><DataViz title="Customer revenue" type="line" categories={['January', 'February', 'March']} series={[{ name: 'Revenue', values: [10, null, Number.NaN] }]} formatValue={(value) => '$' + value} /></DiyaProvider>)
    expect(screen.queryByRole('table')).toBe(null)
    await user.click(screen.getByRole('button', { name: 'Show data table' }))
    const table = screen.getByRole('table', { name: 'Customer revenue data' })
    expect(within(table).getByRole('cell', { name: '$10' })).toBeTruthy()
    expect(within(table).getAllByRole('cell', { name: '—' })).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Hide data table' }))
    expect(screen.queryByRole('table')).toBe(null)
  })

  it('flattens hierarchical data and omits invalid values from the accessible table', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><DataViz title="Regional mix" type="treemap" data={[{ name: 'Region', children: [{ name: 'East', value: 12 }, { name: 'West', value: 8 }, { name: 'Invalid', value: -1 }] }]} /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Show data table' }))
    const table = screen.getByRole('table', { name: 'Regional mix data' })
    expect(within(table).getByRole('rowheader', { name: 'Region / East' })).toBeTruthy()
    expect(within(table).getByRole('rowheader', { name: 'Region / West' })).toBeTruthy()
    expect(within(table).queryByText(/Invalid/)).toBe(null)
    expect(within(table).getAllByRole('row')).toHaveLength(3)
  })
})

describe('compact circular chart layout', () => {
  const expenses = ['Payroll', 'Contractors', 'Workspace', 'Travel', 'Software', 'Office supplies', 'Payment fees', 'Telecom', 'Hosting'].map(name => ({ name, value: 1 }))
  type CircularOptions = { legend: { selected: Record<string, boolean> }; series: { center: [string, number]; radius: [number, number] | [string, string] }[] }
  const options = () => chartMock.setOption.mock.calls.at(-1)![0] as CircularOptions

  it('initializes when ECharts has no previous option model', () => {
    chartMock.getOption.mockReturnValueOnce(undefined)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(304)
    render(<SourceProvider><SourceChart label="Expenses" type="donut" variant="thin" height={200} data={expenses} /></SourceProvider>)
    expect(options().series[0].center[1]).toBeGreaterThan(0)
  })

  it.each([304, 360])('keeps a 200px donut clear of its three-row legend at %ipx width', width => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width)
    render(<SourceProvider><SourceChart label="Expenses" type="donut" variant="thin" height={200} data={expenses} formatValue={() => '$15,362.20'} centerLabel="Total expenses" /></SourceProvider>)
    const { center, radius } = options().series[0]
    const [inner, outer] = radius as [number, number]
    // The fixture's three 12px rows, two 12px gaps and 10px padding occupy 70px.
    expect(center[1] - outer).toBeGreaterThanOrEqual(8)
    expect(center[1] + outer).toBeLessThanOrEqual(200 - 70 - 12)
    expect(screen.getByRole('img', { name: 'Expenses' }).style.height).toBe('200px')
    const total = screen.getByText('$15,362.20')
    const fontSize = Number.parseFloat(total.style.fontSize)
    expect(fontSize).toBeGreaterThanOrEqual(14)
    expect('$15,362.20'.length * fontSize * .55).toBeLessThanOrEqual(inner * 2 - 8)
    expect(total.parentElement!.style.top).toBe(`${center[1]}px`)
  })

  it('reflows on resize without clearing the user’s legend selection', () => {
    let width = 360
    let resize = () => {}
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width)
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback } observe() {} disconnect() {} })
    render(<SourceProvider><SourceChart label="Expenses" type="donut" variant="thin" height={200} data={expenses} /></SourceProvider>)
    chartMock.getOption.mockReturnValue({ legend: [{ selected: { Payroll: false } }] })
    width = 235
    act(() => resize())
    expect(options().legend.selected).toEqual({ Payroll: false })
    expect((options().series[0].radius as [number, number])[1]).toBeLessThan(55)
  })

  it('retains the approved 300px catalog donut and its center position', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(304)
    render(<SourceProvider><SourceChart label="Acquisition" type="donut" height={300} data={expenses.slice(0, 6)} /></SourceProvider>)
    expect(options().series[0].radius).toEqual(['58%', '80%'])
    expect(options().series[0].center).toEqual(['50%', 132])
    expect(screen.getByRole('img', { name: 'Acquisition' }).style.height).toBe('300px')
  })
})

describe('cartesian axes', () => {
  type AxisOptions = {
    xAxis: { type: string; splitLine?: { show: boolean }; axisLabel: { formatter?: (value: number) => string } }
    yAxis: { type: string; splitLine?: { show: boolean }; axisLabel: { formatter?: (value: number) => string } }
  }
  const options = () => chartMock.setOption.mock.calls.at(-1)![0] as AxisOptions
  const series = [{ name: 'Paid', values: [31400, 42900] }]

  it('draws grid lines on the value axis only', () => {
    render(<SourceProvider><SourceChart label="Paid" type="bar" categories={['Sep', 'Oct']} series={series} /></SourceProvider>)
    expect(options().xAxis.type).toBe('category')
    expect(options().xAxis.splitLine?.show).toBe(false)
    expect(options().yAxis.splitLine?.show).toBe(true)
  })

  it('labels the value axis with formatValue when one is given, and leaves it alone otherwise', () => {
    const short = (value: number) => `$${value / 1000}k`
    render(<SourceProvider><SourceChart label="Paid" type="bar" categories={['Sep', 'Oct']} series={series} formatValue={short} /></SourceProvider>)
    expect(options().yAxis.axisLabel.formatter?.(40000)).toBe('$40k')
    render(<SourceProvider><SourceChart label="Paid" type="bar" variant="horizontal" categories={['Sep', 'Oct']} series={series} formatValue={short} /></SourceProvider>)
    expect(options().xAxis.axisLabel.formatter?.(20000)).toBe('$20k')
    expect(options().yAxis.splitLine?.show).toBe(false)
    render(<SourceProvider><SourceChart label="Paid" type="bar" categories={['Sep', 'Oct']} series={series} /></SourceProvider>)
    expect(options().yAxis.axisLabel.formatter).toBeUndefined()
  })
})

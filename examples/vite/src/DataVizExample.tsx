import { useState } from 'react'
import { Metric, Select, Switch } from '@idyeah/diya'
import { DataViz, type ChartType, type ChartSeries } from '@idyeah/diya/charts'
import { chartCategories, chartSeries } from './data'
import { Result } from './shared'

type ChartVariant = 'standard' | 'smooth' | 'stacked' | 'horizontal' | 'thin'

const chartTypes: ChartType[] = ['line', 'area', 'bar', 'donut', 'pie', 'combo', 'treemap']
const labelFor = (value: string) => value[0].toUpperCase() + value.slice(1)

export default function DataVizExample() {
  const [type, setType] = useState<ChartType>('line')
  const [variant, setVariant] = useState<ChartVariant>('standard')
  const [dense, setDense] = useState(false)
  const [legend, setLegend] = useState(true)
  const [grid, setGrid] = useState(true)
  const [tooltip, setTooltip] = useState(true)
  const [empty, setEmpty] = useState(false)
  const selected = chartSeries.slice(0, dense ? 6 : 3)
  const series: ChartSeries[] = selected.map((item, index) => ({
    ...item,
    type: type === 'combo' ? (index === selected.length - 1 ? 'line' : 'bar') : undefined,
  }))
  const data =
    type === 'treemap'
      ? [
          { name: 'Product', value: 620 },
          { name: 'Marketing', value: 380 },
          { name: 'Operations', value: 240 },
          ...(dense
            ? [
                { name: 'Support', value: 180 },
                { name: 'Research', value: 140 },
                { name: 'Infrastructure', value: 100 },
              ]
            : []),
        ]
      : selected.map((item) => ({
          name: item.name,
          value: item.values.reduce((sum, value) => sum + value, 0),
        }))
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const variants: ChartVariant[] =
    type === 'line'
      ? ['standard', 'smooth']
      : type === 'area'
        ? ['standard', 'stacked']
        : type === 'bar'
          ? ['standard', 'stacked', 'horizontal']
          : type === 'donut'
            ? ['standard', 'thin']
            : ['standard']
  return (
    <div className="example-stack">
      <div className="demo-controls">
        <Select
          label="Type"
          value={type}
          onValueChange={(value) => {
            setType(value as ChartType)
            setVariant('standard')
          }}
          options={chartTypes.map((value) => ({ value, label: labelFor(value) }))}
        />
        <Select
          label="Variant"
          value={variant}
          onValueChange={(value) => setVariant(value as ChartVariant)}
          options={variants.map((value) => ({ value, label: labelFor(value) }))}
        />
        <div className="demo-pills" role="group" aria-label="Data density">
          <button type="button" aria-pressed={!dense} onClick={() => setDense(false)}>
            Light data
          </button>
          <button type="button" aria-pressed={dense} onClick={() => setDense(true)}>
            Dense data
          </button>
        </div>
      </div>
      <div className="demo-controls">
        <Switch label="Legend" checked={legend} onCheckedChange={setLegend} />
        <Switch label="Grid" checked={grid} onCheckedChange={setGrid} />
        <Switch label="Tooltip" checked={tooltip} onCheckedChange={setTooltip} />
        <Switch label="Empty data" checked={empty} onCheckedChange={setEmpty} />
      </div>
      <DataViz
        type={type}
        variant={variant}
        title={type === 'treemap' ? 'Resource allocation' : 'Acquisition overview'}
        description="Illustrative values supplied by this example."
        categories={empty ? [] : chartCategories}
        series={empty ? [] : series}
        data={empty ? [] : data}
        legend={legend}
        grid={grid}
        tooltip={tooltip}
        valueDomain={variant === 'stacked' ? [0, 1000] : [0, 300]}
        height={300}
        summary={
          <Metric
            label={type === 'treemap' ? 'Total allocation' : 'Total visits'}
            value={empty ? '0' : total.toLocaleString()}
          />
        }
        footer="Illustrative data · No live tracking"
        showDataToggle
        dataCaption="Values supplied by the example"
      />
      <Result>
        {empty
          ? 'Empty dataset selected.'
          : `${dense ? 'Dense' : 'Light'} data · ${selected.length} ${['donut', 'pie', 'treemap'].includes(type) ? 'categories' : 'series'} · ${labelFor(type)} chart · 300px height`}
      </Result>
    </div>
  )
}

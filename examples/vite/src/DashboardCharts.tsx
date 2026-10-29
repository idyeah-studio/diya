import { Button, Metric } from '@idyeah/diya'
import { DataViz, type ChartSeries, type ChartDatum } from '@idyeah/diya/charts'
import { formatMoney } from './finance'

export type DashboardChartsProps = {
  appearance: 'light' | 'dark'
  categories: string[]
  series: ChartSeries[]
  expenses: ChartDatum[]
  netCents: number
  expenseTotalCents: number
  granularity: 'daily' | 'weekly'
  onGranularityChange: (value: 'daily' | 'weekly') => void
}

export default function DashboardCharts({ appearance, categories, series, expenses, netCents, expenseTotalCents, granularity, onGranularityChange }: DashboardChartsProps) {
  const formatChartMoney = (dollars: number) => formatMoney(Math.round(dollars * 100))
  return <div className="dashboard-charts">
    <DataViz title="Cash flow" type="bar" categories={categories} series={series} height={200} shadow
      palette={appearance === 'light' ? ['#3478F6', '#E49B31'] : ['#6B9FFB', '#F1BC63']} formatValue={formatChartMoney}
      actions={<div className="dashboard-chart-interval" role="group" aria-label="Cash flow grouping">{(['daily', 'weekly'] as const).map(value => <Button key={value} size="small" variant={granularity === value ? 'solid' : 'quiet'} shape="pill" aria-pressed={granularity === value} onClick={() => onGranularityChange(value)}>{value === 'daily' ? 'Daily' : 'Weekly'}</Button>)}</div>}
      summary={<Metric label="Net cash flow" value={formatMoney(netCents)} size="small" />}
      footer="Settled transactions · USD" dataCaption="Cash flow values" />
    <DataViz title="Expense breakdown" type="donut" variant="thin" data={expenses} height={200} shadow
      palette={appearance === 'light' ? ['#3478F6', '#27A477', '#8958D0', '#E49B31', '#D4545C', '#B661A9', '#239EBC', '#96724C', '#64758D'] : ['#6B9FFB', '#60C698', '#B298F0', '#F1BC63', '#ED9195', '#D89ACF', '#6EC8DD', '#C4A27B', '#95A6BF']}
      centerLabel="Total expenses" formatValue={formatChartMoney}
      summary={<span className="dashboard-chart-caption">{expenses.length} spending categories</span>}
      footer={formatMoney(expenseTotalCents) + ' settled · USD'} dataCaption="Expense category values" />
  </div>
}

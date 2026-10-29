'use client'
import { forwardRef, useCallback, useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart, TreemapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, AriaComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import { useDiyaAppearance, useDiyaLocale, useDiyaMessages } from '../DiyaProvider.js'
import { Button } from '../button/Button.js'
import { badgeForeground } from '../badge/badge-utils.js'
import { BRAND_GROUNDS } from '../internal/brand.js'
import { cx } from '../internal/cx.js'
import { chartMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    chart: typeof chartMessages
  }
}

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  TreemapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AriaComponent,
  SVGRenderer,
])
/** 'line', 'area', 'bar' and 'combo' plot `series` over `categories`; 'pie', 'donut' and 'treemap' plot `data`. */
export type ChartType = 'line' | 'area' | 'bar' | 'donut' | 'pie' | 'combo' | 'treemap'
export type ChartSeries = {
  /** Series name, shown in the legend, tooltip and data table. */
  name: string
  /** One value per category, in the same order; null leaves a gap. */
  values: (number | null)[]
  /** Overrides this series' palette color. */
  color?: string
  /** Draws this series as a line or bars, overriding the chart type; useful in 'combo'. */
  type?: 'line' | 'bar'
}
export type ChartDatum = {
  /** Slice or tile name, shown in the legend, tooltip and data table. */
  name: string
  /** Non-negative size; leave it out on a parent to use the sum of its children. */
  value?: number
  /** Nested tiles, for 'treemap' only. */
  children?: ChartDatum[]
  /** Overrides this item's palette color. */
  color?: string
}
type ResolvedDatum = Omit<ChartDatum, 'value' | 'children'> & {
  value: number
  children?: ResolvedDatum[]
}
function resolveData(items: ChartDatum[]): ResolvedDatum[] {
  return items.flatMap((item) => {
    const children = item.children ? resolveData(item.children) : undefined
    const value = item.value ?? children?.reduce((sum, child) => sum + child.value, 0)
    return value !== undefined && Number.isFinite(value) && value >= 0
      ? [{ ...item, value, children }]
      : []
  })
}
function dataRows(items: ResolvedDatum[], parent = ''): { name: string; value: number }[] {
  return items.flatMap((item) => {
    const name = parent ? parent + ' / ' + item.name : item.name
    return item.children?.length ? dataRows(item.children, name) : [{ name, value: item.value }]
  })
}
const compactLegendGap = 12
function compactCircularLayout(width: number, height: number, names: string[], fontFamily: string) {
  // Match ECharts' legend marker, label spacing, padding and wrapped row gaps.
  const availableWidth = Math.max(1, width - 10)
  let rowWidth = 0, rowHeight = 0, legendHeight = 10
  for (const name of new Set(names)) {
    const text = echarts.format.getTextRect(name, `13px ${fontFamily}`)
    const itemWidth = 15 + text.width
    const itemHeight = Math.max(10, text.height)
    if (rowWidth && rowWidth + compactLegendGap + itemWidth > availableWidth) {
      legendHeight += rowHeight + compactLegendGap
      rowWidth = 0
      rowHeight = 0
    }
    rowWidth += (rowWidth ? compactLegendGap : 0) + itemWidth
    rowHeight = Math.max(rowHeight, itemHeight)
  }
  legendHeight += rowHeight
  const plotHeight = Math.max(8, height - legendHeight - 12)
  return {
    centerY: (plotHeight + 8) / 2,
    outerRadius: Math.max(1, Math.min(Math.min(width, height) * .32, (plotHeight - 8) / 2)),
  }
}
/** DIYA's chart colors, "Vivid": bright system blue, orange, pink, green, violet, teal, indigo and red, ordered so neighbours stay apart. Bright hues sit below 3:1 on white, so every chart also ships its legend, tooltips and a data table. */
export const chartPalettes = {
  light: ['#007aff', '#ff9500', '#ff2d55', '#34c759', '#af52de', '#30b0c7', '#5856d6', '#ff3b30'],
  dark: ['#0a84ff', '#ff9f0a', '#ff375f', '#30d158', '#bf5af2', '#40c8e0', '#7d7aff', '#ffd60a'],
}
type RGB = [number, number, number]
const channel = (value: number) => { value /= 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4 }
const luminance = ([r, g, b]: RGB) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const contrast = (a: RGB, b: RGB) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
/** CIE Lab, for telling whether two series colors read as the same. */
function lab(rgb: RGB): RGB {
  const [x, y, z] = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]].map((row, i) => row.reduce((sum, weight, j) => sum + weight * channel(rgb[j]), 0) / [0.9505, 1, 1.089][i])
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}
const distance = (a: RGB, b: RGB) => Math.hypot(...lab(a).map((value, i) => value - lab(b)[i]))
/** Mixes `b` into `a` by `amount` (0 to 1), in sRGB. */
const mixColor = (a: RGB, b: RGB, amount: number): RGB => a.map((value, i) => value + (b[i] - value) * amount) as RGB
const hex = ([r, g, b]: RGB) => '#' + [r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')
type ChartColors = { text?: RGB; muted?: RGB; surface?: RGB }
/** Reads plain `#rgb`, `#rrggbb` and `rgb()`/`rgba()` values, as computed styles report them. */
function parseColor(value: string): RGB | undefined {
  const text = value.trim()
  const short = text.match(/^#([\da-f])([\da-f])([\da-f])$/i)
  if (short) return [1, 2, 3].map((i) => parseInt(short[i] + short[i], 16)) as RGB
  const long = text.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})(?:[\da-f]{2})?$/i)
  if (long) return [1, 2, 3].map((i) => parseInt(long[i], 16)) as RGB
  const rgb = text.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i)
  if (!rgb || rgb[4] === '0' || rgb[4] === '0%') return undefined
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
}
/** Resolves DIYA's color tokens where the chart sits, as sRGB; a canvas paints any color syntax the browser knows. */
function readColors(node: HTMLElement): ChartColors {
  if (typeof getComputedStyle !== 'function') return {}
  let context: CanvasRenderingContext2D | null = null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    context = canvas.getContext('2d', { willReadFrequently: true })
  } catch { /* No canvas, such as in a test DOM; plain values still parse. */ }
  const probe = document.createElement('span')
  probe.style.display = 'none'
  node.appendChild(probe)
  const read = (token: string): RGB | undefined => {
    probe.style.color = ''
    probe.style.color = `var(${token})`
    const value = getComputedStyle(probe).color
    if (!value || value.includes('var(')) return undefined
    if (!context) return parseColor(value)
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = '#000'
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
    return a > 0 ? [r, g, b] : parseColor(value)
  }
  const text = read('--diya-color-text')
  const colors = {
    text,
    muted: read('--diya-color-muted'),
    surface: read('--diya-color-raised'),
  }
  probe.remove()
  return colors
}
export type ChartProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Chart kind: 'line', 'area', 'bar' and 'combo' (bars with the last series as a line) use `series`; 'pie', 'donut' and 'treemap' use `data`. */
  type: ChartType
  /** Accessible name for the chart image (not shown). */
  label: string
  /** Category labels along the category axis, for line, area, bar and combo. */
  categories?: string[]
  /** Value series, for line, area, bar and combo. */
  series?: ChartSeries[]
  /** Slices or tiles, for pie, donut and treemap. */
  data?: ChartDatum[]
  /** Style tweak; defaults to 'standard'. 'smooth' curves lines (line, area, combo), 'stacked' stacks series (line, area, bar), 'horizontal' lays bars sideways (bar), 'thin' narrows the ring (donut). */
  variant?: 'standard' | 'smooth' | 'stacked' | 'horizontal' | 'thin'
  /** Shows the legend; defaults to true. Treemaps never show one. */
  legend?: boolean
  /** Shows value grid lines on cartesian charts; defaults to true. */
  grid?: boolean
  /** Shows a tooltip on hover; defaults to true. */
  tooltip?: boolean
  /** Fixed [min, max] for the value axis; by default it starts at 0 unless values go negative. */
  valueDomain?: [number, number]
  /** Chart height in pixels; defaults to 300. */
  height?: number
  /** Series or slice colors, in order; defaults to a colored brand first, then DIYA's Vivid chart palette for the theme. */
  palette?: string[]
  /** Text under a donut's total; defaults to "Total". */
  centerLabel?: string
  /** Formats every shown value (tooltips, value-axis labels, donut total, treemap labels, data table); defaults to the provider locale's number format. Keep it stable between renders. */
  formatValue?: (value: number) => string
}

/** A line, area, bar, combo, pie, donut or treemap chart. Data and formatting belong to the caller; rendering never fetches a service. */
export const Chart = forwardRef<HTMLDivElement, ChartProps>(function Chart({
  type,
  label,
  categories = [],
  series = [],
  data = [],
  variant = 'standard',
  legend = true,
  grid = true,
  tooltip = true,
  valueDomain,
  height = 300,
  palette,
  centerLabel,
  formatValue: formatValueProp,
  className,
  ...props
}: ChartProps, ref) {
  const t = useDiyaMessages('chart', chartMessages)
  const locale = useDiyaLocale()
  const localeFormatter = useCallback((value: number) => value.toLocaleString(locale), [locale])
  const formatValue = formatValueProp ?? localeFormatter
  const host = useRef<HTMLDivElement | null>(null)
  const chart = useRef<ReturnType<typeof echarts.init> | null>(null)
  const [chartWidth, setChartWidth] = useState(0)
  // The provider resolves the theme (including 'system') and the brand's accent tokens for it.
  const { theme, glass, fontFamily, brand: brandTokens } = useDiyaAppearance()
  // Layout is measured when options are set. A web font that arrives later
  // changes those measurements, so options are set again once it loads.
  const [fontEpoch, setFontEpoch] = useState(0)
  useEffect(() => {
    const fonts = typeof document === 'undefined' ? undefined : document.fonts
    if (!fonts) return
    let active = true
    const families = new Set(fontFamily.split(',').map((name) => name.trim().replace(/^['"]|['"]$/g, '')))
    const refresh = () => { if (active) setFontEpoch((epoch) => epoch + 1) }
    // Only this chart's own fonts matter; other faces loading elsewhere do not.
    const onLoaded = (event: Event) => {
      const faces = (event as Event & { fontfaces?: readonly FontFace[] }).fontfaces ?? []
      if (faces.some((face) => families.has(face.family.replace(/^['"]|['"]$/g, '')))) refresh()
    }
    fonts.addEventListener?.('loadingdone', onLoaded)
    const spec = `13px ${fontFamily}`
    let ready = false
    try { ready = fonts.check?.(spec) ?? false } catch { /* An unparsable family is treated as not loaded. */ }
    if (!ready) void fonts.load?.(spec).then(refresh, () => {})
    return () => {
      active = false
      fonts.removeEventListener?.('loadingdone', onLoaded)
    }
  }, [fontFamily])
  const light = theme === 'light'
  const circular = type === 'pie' || type === 'donut'
  const cartesian = !circular && type !== 'treemap'
  const showLegend = legend && type !== 'treemap'
  const compactCircular = circular && showLegend && height < 240
  const safeData = resolveData(data)
  const compactLayout = compactCircular && chartWidth > 0
    ? compactCircularLayout(chartWidth, height, safeData.map(item => item.name), fontFamily)
    : null
  const circularCenter = compactLayout?.centerY ?? (height * (compactCircular ? .36 : showLegend ? .44 : .5))
  const compactInnerRadius = compactLayout && compactLayout.outerRadius * (variant === 'thin' ? 56 / 64 : 46 / 64)
  const total = type === 'donut' ? formatValue(safeData.reduce((sum, item) => sum + item.value, 0)) : ''
  const defaultTotalSize = Math.max(14, Math.min(30, height * (compactCircular ? .09 : .1)))
  const totalWidth = compactInnerRadius && type === 'donut'
    ? echarts.format.getTextRect(total, `${defaultTotalSize}px ${fontFamily}`).width
    : 0
  const totalSize = compactInnerRadius && totalWidth
    ? Math.max(14, Math.min(defaultTotalSize, Math.floor(defaultTotalSize * (compactInnerRadius * 2 - 8) / totalWidth)))
    : defaultTotalSize
  const circularRadius = compactLayout
    ? type === 'pie' ? compactLayout.outerRadius : [compactInnerRadius!, compactLayout.outerRadius]
    : type === 'pie'
      ? compactCircular ? '64%' : '76%'
      : variant === 'thin'
        ? compactCircular ? ['56%', '64%'] : ['70%', '80%']
        : compactCircular ? ['46%', '64%'] : ['58%', '80%']
  const empty = cartesian
    ? !categories.length ||
      !series.some((item) => item.values.some((value) => value !== null && Number.isFinite(value)))
    : !safeData.some((item) => item.value > 0)
  useEffect(() => {
    const node = host.current
    if (!node || empty) return
    const instance = echarts.init(node, undefined, { renderer: 'svg' })
    chart.current = instance
    const resize = () => {
      instance.resize()
      setChartWidth(node.clientWidth)
    }
    setChartWidth(node.clientWidth)
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
    observer?.observe(node)
    if (!observer) window.addEventListener('resize', resize)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      chart.current = null
      instance.dispose()
    }
  }, [empty])
  useEffect(() => {
    if (!chart.current || !host.current) return
    // Surface and text come from the tokens where the chart sits, so a caller's overrides hold.
    const tokens = readColors(host.current)
    const onLight = light
    const grounds = BRAND_GROUNDS[onLight ? 'light' : 'dark']
    const surface = tokens.surface ?? parseColor(grounds.raised)!
    const ink = tokens.text ?? parseColor(grounds.text)!
    const text = hex(tokens.muted ?? (onLight ? [84, 84, 84] : [190, 190, 190]))
    const line = `rgba(${ink.join(',')},${onLight ? 0.08 : 0.1})`
    // A colored brand leads series 1; a brand too pale for the surface falls back to its readable ink.
    // A neutral brand (DIYA's default ink, or any gray) steps aside and the palette leads.
    const accent = parseColor(brandTokens.accent)
    const brand = accent && contrast(accent, surface) >= 3 ? accent : parseColor(brandTokens.accentInk) ?? accent ?? ink
    const neutral = Math.max(...brand) - Math.min(...brand) < 16
    // A palette color that reads as the brand's twin moves to the back, so the first series stay distinct.
    const rest = chartPalettes[onLight ? 'light' : 'dark']
    const twin = (color: string) => distance(parseColor(color)!, brand) < 25
    const colors = palette?.length ? palette : neutral ? rest : [hex(brand), ...rest.filter((color) => !twin(color)), ...rest.filter(twin)]
    const horizontal = type === 'bar' && variant === 'horizontal'
    // A fine gradient: bars soften toward their base, one or two lines glow down into the plot (more would muddy),
    // and donut segments catch a highlight.
    const solid = (color: string | undefined) => (color && /^#[0-9a-f]{6}$/i.test(color) ? color : undefined)
    const barFill = (color: string) =>
      horizontal
        ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: `${color}b3` }, { offset: 1, color }] }
        : { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color }, { offset: 1, color: `${color}b3` }] }
    const areaFill = (color: string) => ({
      type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [{ offset: 0, color: `${color}38` }, { offset: 1, color: `${color}00` }],
    })
    const sliceFill = (color: string) => ({
      type: 'linear', x: 0, y: 0, x2: 1, y2: 1,
      colorStops: [{ offset: 0, color: hex(mixColor(parseColor(color)!, [255, 255, 255], onLight ? 0.24 : 0.16)) }, { offset: 1, color }],
    })
    const axis = {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: text, fontSize: 13 },
      splitLine: { show: grid, lineStyle: { color: line } },
    }
    // Grid lines run along the value axis only, as `grid` promises; the category axis stays clean.
    const categoryOnly = { splitLine: { show: false } }
    // A caller's formatValue labels the value axis too, so ticks read like the tooltips ($40k, not 40,000).
    const valueLabel = formatValueProp ? { ...axis.axisLabel, formatter: (value: number) => formatValueProp(value) } : axis.axisLabel
    const negative = series.some((item) => item.values.some((value) => value !== null && value < 0))
    const domain =
      valueDomain && valueDomain.every(Number.isFinite) && valueDomain[1] > valueDomain[0]
        ? { min: valueDomain[0], max: valueDomain[1] }
        : negative
          ? {}
          : { min: 0 }
    const cleanValues = (values: (number | null)[]) =>
      values.map((value) => (value === null || !Number.isFinite(value) ? null : value))
    function chartNodes(items: ResolvedDatum[]): object[] {
      return items.map((item, index) => ({
        ...item,
        children: item.children ? chartNodes(item.children) : undefined,
        itemStyle: circular && solid(item.color ?? colors[index % colors.length])
          ? { color: sliceFill(solid(item.color ?? colors[index % colors.length])!) }
          : item.color ? { color: item.color } : undefined,
        label: { color: badgeForeground(item.color ?? colors[index % colors.length]) },
      }))
    }
    const chartData = chartNodes(safeData)
    const option: echarts.EChartsCoreOption = {
      animation: false,
      color: colors,
      textStyle: { fontFamily },
      aria: { enabled: true },
      tooltip: {
        show: tooltip,
        trigger: cartesian ? 'axis' : 'item',
        renderMode: 'richText',
        backgroundColor: hex(surface),
        textStyle: { color: hex(ink) },
        borderColor: line,
        confine: true,
        valueFormatter: formatValue,
      },
      legend: {
        show: showLegend,
        bottom: 0,
        textStyle: { color: text, fontSize: 13 },
        icon: 'circle',
        // Legend dots stay the solid series color, whatever the fill.
        data: circular
          ? safeData.map((item, index) => ({ name: item.name, itemStyle: { color: item.color ?? colors[index % colors.length] } }))
          : cartesian
            ? series.map((item, index) => ({ name: item.name, itemStyle: { color: item.color ?? colors[index % colors.length] } }))
            : undefined,
        itemWidth: 10,
        itemHeight: 10,
        itemGap: compactCircular ? compactLegendGap : 18,
        // A width change must retain the user's hidden/shown legend categories.
        selected: (chart.current.getOption?.()?.legend as { selected?: Record<string, boolean> }[] | undefined)?.[0]?.selected,
      },
      grid: { left: 12, right: 16, top: 16, bottom: showLegend ? 64 : 16, containLabel: true },
      ...(cartesian
        ? {
            xAxis: {
              ...axis,
              ...(horizontal ? { ...domain, axisLabel: valueLabel } : categoryOnly),
              type: horizontal ? 'value' : 'category',
              data: horizontal ? undefined : categories,
              boundaryGap: type === 'bar' || type === 'combo',
            },
            yAxis: {
              ...axis,
              ...(!horizontal ? { ...domain, axisLabel: valueLabel } : categoryOnly),
              type: horizontal ? 'category' : 'value',
              data: horizontal ? categories : undefined,
            },
          }
        : {}),
      series: circular
        ? [
            {
              type: 'pie',
              radius: circularRadius,
              center: ['50%', circularCenter],
              startAngle: 90,
              percentPrecision: 0,
              padAngle: type === 'pie' ? 0 : 2.5,
              minAngle: 3,
              avoidLabelOverlap: true,
              label: {
                show: type === 'pie',
                position: 'inside',
                formatter: '{d}%',
                fontSize: 13,
                fontWeight: 500,
              },
              labelLine: { show: false },
              emphasis: { scale: false },
              itemStyle: {
                borderRadius: type === 'pie' ? 0 : 5,
                borderWidth: type === 'pie' ? 1.5 : 0,
                borderColor: hex(surface),
              },
              data: chartData,
            },
          ]
        : type === 'treemap'
          ? [
              {
                type: 'treemap',
                roam: false,
                nodeClick: false,
                breadcrumb: { show: false },
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                visibleMin: 0,
                squareRatio: 1.2,
                label: {
                  show: true,
                  formatter: (item: { name: string; value: number }) =>
                    item.name + '\n' + formatValue(item.value),
                  fontSize: 13,
                  lineHeight: 24,
                  color: hex(ink),
                },
                upperLabel: { show: false },
                itemStyle: { borderWidth: 0, gapWidth: 4, borderRadius: 8 },
                levels: [
                  { itemStyle: { borderWidth: 0, gapWidth: 4 } },
                  { itemStyle: { borderWidth: 0, gapWidth: 4 } },
                ],
                data: chartData,
              },
            ]
          : series.map((item, index) => ({
              name: item.name,
              type:
                item.type ??
                (type === 'bar' || (type === 'combo' && index < series.length - 1)
                  ? 'bar'
                  : 'line'),
              data: cleanValues(item.values),
              smooth: variant === 'smooth',
              stack: variant === 'stacked' ? 'total' : undefined,
              showSymbol: false,
              lineStyle: { width: 2.5 },
              barMaxWidth: series.length > 3 ? 18 : 28,
              ...(() => {
                const color = solid(item.color ?? colors[index % colors.length])
                const bar = type === 'bar' || (type === 'combo' && index < series.length - 1) || item.type === 'bar'
                if (bar) return { itemStyle: { borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0], color: color ? barFill(color) : item.color } }
                return {
                  itemStyle: { color: color ?? item.color },
                  ...(color && variant !== 'stacked' && (type === 'area' || series.length <= 2)
                    ? { areaStyle: { opacity: 1, origin: 'start', color: areaFill(color) } }
                    : type === 'area' ? { areaStyle: { opacity: 0.14 } } : {}),
                }
              })(),
            })),
    }
    chart.current.setOption(option, { notMerge: true })
    chart.current.resize()
  }, [
    type,
    categories,
    series,
    data,
    variant,
    legend,
    grid,
    tooltip,
    valueDomain,
    palette,
    formatValue,
    theme,
    glass,
    brandTokens,
    fontFamily,
    fontEpoch,
    height,
    chartWidth,
    empty,
  ])
  if (empty)
    return (
      <div {...props} ref={ref} className={cx('diya-chart-frame', className)} style={{ minHeight: height, ...props.style }}>
        <p role="status">{t.empty}</p>
      </div>
    )
  return (
    <div {...props} ref={ref} className={cx('diya-chart-frame', className)}>
      <div ref={host} className="diya-data-viz" style={{ height }} role="img" aria-label={label} />
      {type === 'donut' && (
        <div
          className="diya-donut-total"
          style={{ top: circularCenter }}
          aria-hidden="true"
        >
          <strong style={{ fontSize: totalSize }}>{total}</strong>
          <span>{centerLabel ?? t.total}</span>
        </div>
      )}
    </div>
  )
})

export type DataVizProps = Omit<ChartProps, 'label' | keyof HTMLAttributes<HTMLDivElement>> & Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> & {
  /** Visible card heading; it is also the chart's accessible name, even when the header is hidden. */
  title: string
  /** Heading level of the title, h1 to h6. Defaults to 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Shows the title and description; defaults to true. */
  showHeader?: boolean
  /** Supporting text under the title. */
  description?: string
  /** Slot in the header corner, e.g. a Select for the time range. */
  actions?: ReactNode
  /** Slot above the chart, usually a headline number. */
  summary?: ReactNode
  /** Small content in the footer, e.g. the data source. */
  footer?: ReactNode
  /** Lifts the card with a shadow instead of a flat border; defaults to false. */
  shadow?: boolean
  /** Shows a button that reveals the chart's data as a table; defaults to true. */
  showDataToggle?: boolean
  /** Caption of the data table; defaults to "{title} data". */
  dataCaption?: string
}

/** A chart in a titled card, with an optional summary, actions and a show-data table. */
export const DataViz = forwardRef<HTMLElement, DataVizProps>(function DataViz({
  title,
  headingLevel = 3,
  showHeader = true,
  description,
  actions,
  summary,
  footer,
  shadow = false,
  showDataToggle = true,
  dataCaption,
  type,
  categories,
  series,
  data,
  variant,
  legend,
  grid,
  tooltip,
  valueDomain,
  height,
  palette,
  centerLabel,
  formatValue,
  className,
  ...props
}, ref) {
  const t = useDiyaMessages('chart', chartMessages)
  const locale = useDiyaLocale()
  const [showData, setShowData] = useState(false)
  const tableId = useId()
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  const circular = type === 'pie' || type === 'donut' || type === 'treemap'
  const rows = dataRows(resolveData(data ?? []))
  const format = formatValue ?? ((value: number) => value.toLocaleString(locale))
  const chart = { type, categories, series, data, variant, legend, grid, tooltip, valueDomain, height, palette, centerLabel, formatValue }
  return (
    <article {...props} ref={ref} className={cx('diya-analytics-card', className)} data-shadow={shadow}>
      {(showHeader || actions) && <header className="diya-analytics-header">
        {showHeader && <div>
          <Heading className="diya-analytics-title">{title}</Heading>
          {description && <p>{description}</p>}
        </div>}
        {actions && <div className="diya-analytics-tools">{actions}</div>}
      </header>}
      {summary && <div className="diya-analytics-metric">{summary}</div>}
      <Chart {...chart} label={title} />
      {showData && (
        <div className="diya-analytics-data-scroll" role="region" aria-label={t.dataTable(title)} tabIndex={0}>
          <table id={tableId} className="diya-analytics-data">
            <caption>{dataCaption ?? t.dataCaption(title)}</caption>
            <thead>
              <tr>
                {(circular
                  ? [t.category, t.value]
                  : [t.category, ...(series ?? []).map((item) => item.name)]
                ).map((name, index) => (
                  <th key={index} scope="col">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {circular
                ? rows.map((item, index) => (
                    <tr key={index}>
                      <th scope="row">{item.name}</th>
                      <td>{format(item.value)}</td>
                    </tr>
                  ))
                : (categories ?? []).map((name, index) => (
                    <tr key={index}>
                      <th scope="row">{name}</th>
                      {(series ?? []).map((item, seriesIndex) => (
                        <td key={seriesIndex}>
                          {item.values[index] == null || !Number.isFinite(item.values[index])
                            ? '—'
                            : format(item.values[index]!)}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
      {(footer || showDataToggle) && (
        <footer className="diya-analytics-footer">
          <span>{footer}</span>
          {showDataToggle && (
            <Button variant="quiet" size="small" aria-expanded={showData} aria-controls={showData ? tableId : undefined} onClick={() => setShowData(!showData)}>
              {showData ? t.hideData : t.showData}
            </Button>
          )}
        </footer>
      )}
    </article>
  )
})

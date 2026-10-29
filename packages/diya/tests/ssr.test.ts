// @vitest-environment node
import { expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import * as core from '../dist/index.js'
import { Chart, DataViz } from '../dist/data-viz/index.js'

it('imports and server-renders the public entries without browser globals', () => {
  expect(typeof window).toBe('undefined')
  expect('Chart' in core).toBe(false)
  const html = renderToString(createElement(core.DiyaProvider, null,
    createElement(core.PageHeader, { title: 'Server project', actions: createElement(core.Button, { disabled: true }, 'Save') }),
    createElement(core.TextInput, { label: 'Project name', name: 'project', value: 'Launch', onValueChange: () => {} }),
    createElement(core.Combobox, { label: 'Team', value: '', options: [{ value: 'design', label: 'Design' }], onValueChange: () => {} }),
    createElement(core.DatePicker, { label: 'Due date', value: '', onValueChange: () => {} }),
    createElement(core.Progress, { label: 'Upload', value: 40 }),
    createElement(Chart, { type: 'line', label: 'Revenue', categories: ['Jan'], series: [{ name: 'Revenue', values: [10] }] }),
    createElement(DataViz, { title: 'Regional mix', type: 'donut', data: [{ name: 'East', value: 12 }] }),
  ))
  expect(html).toContain('Server project')
  expect(html).toContain('Project name')
  expect(html).toContain('disabled=""')
  expect(html).toContain('Revenue')
})

// Lane T1 Oriel (L4): Card and Table size to the layout they sit in. A Card
// fills its grid column or container (no 420px cap), and a table with four
// columns or fewer fits a phone (no 680px floor). Wide tables still size
// themselves from their columns and scroll sideways.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Card, DiyaProvider, Table, type TableColumn } from '../dist/index.js'

const root = process.cwd()
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '')
const source = strip(readFileSync(resolve(root, 'src/styles.css'), 'utf8'))
const dist = strip(readFileSync(resolve(root, 'dist/styles.css'), 'utf8'))

/** Every declaration block whose selector list includes `selector` exactly. */
function rulesFor(css: string, selector: string) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.split(',').some((part) => part.trim() === selector))
    .map(([, , body]) => body)
}

type Row = { id: string; name: string; amount: number }
const rows: Row[] = [
  { id: 'a', name: 'Marlow & Finch', amount: 1860 },
  { id: 'b', name: 'Saltmarsh Coffee', amount: 980 },
]
const column = (key: string): TableColumn<Row> => ({ key, label: key, render: (row) => row.name })

describe('Card fills its container', () => {
  it('has no max-width in the source or the shipped stylesheet', () => {
    for (const css of [source, dist]) {
      const rules = rulesFor(css, '.diya-root .diya-card')
      expect(rules.length).toBeGreaterThan(0)
      for (const body of rules) expect(body).not.toMatch(/max-width/)
      expect(rules.some((body) => /width:\s*100%/.test(body))).toBe(true)
    }
  })

  it('still takes a max-width from style when the app wants one', () => {
    const { container } = render(
      <DiyaProvider>
        <Card title="Kiln Studio" style={{ maxWidth: 420 }}>Body</Card>
      </DiyaProvider>,
    )
    expect((container.querySelector('.diya-card') as HTMLElement).style.maxWidth).toBe('420px')
  })
})

describe('Table fits a phone', () => {
  it('sets no min-width on the table element in the source or the shipped stylesheet', () => {
    for (const css of [source, dist]) {
      const rules = rulesFor(css, '.diya-root .diya-table table')
      expect(rules.length).toBeGreaterThan(0)
      for (const body of rules) expect(body).not.toMatch(/min-width/)
    }
    expect(dist).not.toMatch(/min-width:\s*680px/)
  })

  it('leaves a table of four columns or fewer at the width of its container', () => {
    const { container } = render(
      <DiyaProvider>
        <Table label="Invoices" rows={rows} rowLabel={(row) => row.name} columns={[column('Customer'), column('Amount')]} bulkActions={[{ label: 'Delete', onAction: () => {}, destructive: true }]} />
      </DiyaProvider>,
    )
    const table = container.querySelector('table') as HTMLTableElement
    expect(table.style.width).toBe('')
    expect(table.style.minWidth).toBe('')
  })

  it('still sizes a wide table from its columns, so it scrolls sideways', () => {
    const { container } = render(
      <DiyaProvider>
        <Table label="Invoices" rows={rows} rowLabel={(row) => row.name} columns={['a', 'b', 'c', 'd', 'e'].map(column)} />
      </DiyaProvider>,
    )
    const table = container.querySelector('table') as HTMLTableElement
    expect(table.style.width).toBe('800px')
    expect(table.style.minWidth).toBe('100%')
  })
})

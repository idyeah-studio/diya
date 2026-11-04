'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useRef, useState } from 'react'
import { PatternSidebar } from './PatternSidebar'
import { PreviewSetting, PreviewOptions } from './PreviewControls'
import { Table, type TableColumn } from '@idyeah/diya'
import { Select } from '@idyeah/diya'
import { Avatar } from '@idyeah/diya'
import { Metric } from '@idyeah/diya'
import { Tag } from '@idyeah/diya'
import { Button, Dialog } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './PageHeaderLibrary.css'
type Project = { id: string; name: string; owner: string; status: string; budget: number }
const initialRows: Project[] = [
  ['Website launch', 'Alex Morgan', 'In progress', 12400],
  ['Mobile onboarding', 'Sam Lee', 'In review', 6800],
  ['Design system', 'Jordan Chen', 'In progress', 18500],
  ['Customer portal', 'Casey Park', 'Blocked', 24000],
  ['Analytics overview', 'Riley Brooks', 'Complete', 9200],
  ['Checkout refresh', 'Taylor Reed', 'In review', 7600],
  ['Account settings', 'Alex Morgan', 'Planned', 4300],
  ['Help center', 'Sam Lee', 'Complete', 5800],
  ['Search experience', 'Jordan Chen', 'In progress', 11000],
  ['Notifications', 'Casey Park', 'Planned', 3600],
  ['Billing flow', 'Riley Brooks', 'In review', 8900],
  ['Profile editor', 'Taylor Reed', 'Complete', 4200],
].map((row, index) => ({
  id: String(index + 1),
  name: String(row[0]),
  owner: String(row[1]),
  status: String(row[2]),
  budget: Number(row[3]),
}))
const baseColumns: TableColumn<Project>[] = [
  {
    key: 'name',
    width: 210,
    label: 'Project',
    sortValue: (row) => row.name,
    render: (row) => <span className="diya-table-project">{row.name}</span>,
  },
  {
    key: 'owner',
    width: 180,
    label: 'Owner',
    sortValue: (row) => row.owner,
    render: (row) => <span className="diya-table-owner">{row.owner}</span>,
  },
  {
    key: 'status',
    width: 142,
    label: 'Status',
    sortValue: (row) => row.status,
    render: (row) => (
      <Tag
        label={row.status}
        size="small"
        leading="dot"
        tone={
          row.status === 'Blocked'
            ? 'error'
            : row.status === 'Complete'
              ? 'success'
              : row.status === 'In review'
                ? 'warning'
                : row.status === 'In progress'
                  ? 'info'
                  : 'neutral'
        }
      >
        {row.status}
      </Tag>
    ),
  },
  {
    key: 'budget',
    width: 124,
    label: 'Budget',
    numeric: true,
    sortValue: (row) => row.budget,
    render: (row) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(row.budget),
  },
]
export function TableLibrary() {
  const typePointer = useRef(false)
  const [type, setType] = useState('Standard')
  const [density, setDensity] = useState('Comfortable')
  const [options, setOptions] = useState({
    Search: true,
    Filters: true,
    Selection: true,
    Actions: true,
    Pagination: true,
  })
  const [rows, setRows] = useState(initialRows)
  const [message, setMessage] = useState('')
  const [inspected, setInspected] = useState<{ row: Project; brief: boolean } | null>(null)
  const rich = type === 'Rich content' || type === 'Sticky columns'
  const columns: TableColumn<Project>[] = rich
    ? [
        {
          ...baseColumns[0],
          render: (row) => (
            <div>
              <span className="diya-table-project">{row.name}</span>
              <small className="diya-table-secondary">PRJ-{row.id.padStart(3, '0')}</small>
            </div>
          ),
        },
        {
          ...baseColumns[1],
          render: (row) => (
            <span className="diya-table-person">
              <Avatar name={row.owner} size="small" />
              {row.owner}
            </span>
          ),
        },
        baseColumns[2],
        baseColumns[3],
        {
          key: 'progress',
          width: 160,
          label: 'Progress',
          numeric: true,
          sortValue: (row) => Number(row.id) * 7,
          render: (row) => (
            <span className="diya-table-progress">
              <progress aria-label={`${row.name} progress`} max={100} value={Number(row.id) * 7} />
              <span>{Number(row.id) * 7}%</span>
            </span>
          ),
        },
        {
          key: 'date',
          width: 138,
          label: 'Updated',
          sortValue: (row) => Number(row.id),
          render: (row) => (
            <time dateTime={`2026-10-${row.id.padStart(2, '0')}`}>Oct {row.id}, 2026</time>
          ),
        },
        {
          key: 'metric',
          width: 120,
          label: 'Visitors',
          numeric: true,
          sortValue: (row) => Number(row.id) * 1240,
          render: (row) => (
            <Metric
              size="small"
              value={(Number(row.id) * 1240).toLocaleString('en-US')}
              change={{ value: '12%', direction: 'up', meaning: 'positive' }}
            />
          ),
        },
        {
          key: 'link',
          width: 140,
          label: 'Resource',
          render: (row) => (
            <button
              type="button"
              className="diya-table-resource"
              aria-label={`${row.name} project brief`}
              onClick={() => setInspected({ row, brief: true })}
            >
              Project brief
            </button>
          ),
        },
      ]
    : baseColumns
  return (
    <main id="content" className="gallery-study component-library pattern-library">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <PatternSidebar current="table" />
      <div className="component-document">
        <header className="component-document-heading">
          <h1>Table</h1>
          <LibraryActions id="table" />
        </header>
        <section className="pattern-stage" aria-label="Table playground">
          <div className="pattern-controls table-pattern-controls">
            <div className="catalog-select-setting">
              <Select
                className="table-type-select"
                label="Type"
                value={type}
                onPointerDown={() => {
                  typePointer.current = true
                }}
                onKeyDown={() => {
                  typePointer.current = false
                }}
                onChange={(event) => {
                  setType(event.target.value)
                  setMessage('')
                  if (typePointer.current) event.currentTarget.blur()
                  typePointer.current = false
                }}
                options={[
                  'Standard',
                  'Rich content',
                  'Sticky columns',
                  'Loading',
                  'Empty',
                ].map((value) => ({ value, label: value }))}
              />
            </div>
            <PreviewSetting
              label="Density"
              options={['Comfortable', 'Compact']}
              value={density}
              onChange={setDensity}
            />
            <PreviewOptions
              items={Object.entries(options).map(([label, checked]) => ({
                label,
                checked,
                disabled: type === 'Loading',
                onChange: (value: boolean) => setOptions({ ...options, [label]: value }),
              }))}
            />
          </div>
          <CustomizationScope id="table"><div className="pattern-canvas table-pattern-canvas">
            <Table
              key={type}
              sticky={type === 'Sticky columns'}
              loading={type === 'Loading'}
              label="Projects"
              rows={type === 'Empty' ? [] : rows}
              columns={columns}
              rowLabel={(row) => row.name}
              searchText={
                options.Search ? (row) => `${row.name} ${row.owner} ${row.status}` : undefined
              }
              filterOptions={
                options.Filters
                  ? [
                      {
                        key: 'status',
                        label: 'Status',
                        options: ['Planned', 'In progress', 'In review', 'Blocked', 'Complete'],
                        getValue: (row) => row.status,
                      },
                      {
                        key: 'owner',
                        label: 'Owner',
                        options: [...new Set(initialRows.map((row) => row.owner))],
                        getValue: (row) => row.owner,
                      },
                    ]
                  : undefined
              }
              density={density === 'Compact' ? 'compact' : 'comfortable'}
              selectable={options.Selection}
              pagination={options.Pagination}
              defaultPageSize={5}
              pageSizeOptions={[5, 10, 25]}
              bulkActions={
                options.Actions
                  ? [
                      {
                        label: 'Archive',
                        onAction: (ids) => {
                          setRows(rows.filter((row) => !ids.includes(row.id)))
                          setMessage(
                            `${ids.length} ${ids.length === 1 ? 'project' : 'projects'} archived in this preview.`
                          )
                        },
                      },
                    ]
                  : undefined
              }
              onRowOpen={options.Actions ? (row) => setInspected({ row, brief: false }) : undefined}
            />
            {rows.length < initialRows.length && (
              <Button
                variant="quiet"
                onClick={() => {
                  setRows(initialRows)
                  setMessage('Archived sample projects restored.')
                }}
              >
                Restore sample projects
              </Button>
            )}
          </div></CustomizationScope>
          <p className="pattern-feedback" role="status">
            {message}
          </p>
          <Dialog
            open={inspected !== null}
            onOpenChange={(open) => {
              if (!open) setInspected(null)
            }}
            title={
              inspected
                ? `${inspected.row.name}${inspected.brief ? ' · Project brief' : ''}`
                : 'Project details'
            }
            description={
              inspected?.brief
                ? 'Coordinate the design, implementation, and review of this project.'
                : undefined
            }
            size="small"
          >
            {inspected && (
              <dl className="catalog-review-list">
                <div>
                  <dt>Owner</dt>
                  <dd>{inspected.row.owner}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{inspected.row.status}</dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd>${inspected.row.budget.toLocaleString('en-US')}</dd>
                </div>
                <div>
                  <dt>Next step</dt>
                  <dd>Review scope and confirm the next milestone.</dd>
                </div>
              </dl>
            )}
          </Dialog>
        </section>
        <div className="pattern-notes">
          <span>Built with</span>
          <div>
            {['Search', 'Tag', 'Avatar', 'Metric', 'Menu', 'Button', 'Pagination'].map((name) => (
              <a key={name} href={`/explore?area=components&component=${name.toLowerCase()}`}>
                {name}
              </a>
            ))}
          </div>
          <p>
            Sort by a column heading. Select rows for bulk actions. Search and filters work
            together.
          </p>
        </div>
      </div>
    </main>
  )
}

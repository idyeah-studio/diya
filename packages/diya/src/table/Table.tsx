'use client'
import { forwardRef, Fragment, useState, type ForwardedRef, type HTMLAttributes, type ReactNode, type RefAttributes } from 'react'
import { Search } from '../search/Search.js'
import { Menu, type MenuItem } from '../menu/Menu.js'
import { Pagination } from '../pagination/Pagination.js'
import { Button } from '../button/Button.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { tableMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    table: typeof tableMessages
  }
}

export type TableColumn<T> = {
  /** Stable column identity, also used as the sort key. */
  key: string
  /** Visible column header text. */
  label: string
  /** Renders the cell for a row. */
  render: (row: T) => ReactNode
  /** Value the column sorts by; giving it makes the header a sort button. */
  sortValue?: (row: T) => string | number
  /** Right-aligns the column for numbers; defaults to false. */
  numeric?: boolean
  /** Column width in pixels; tables with more than four columns scroll sideways, using 160 for columns without one. */
  width?: number
}
export type TableFilter<T> = {
  /** Stable identity for this filter's state. */
  key: string
  /** Visible filter button text; the chosen option is appended, e.g. "Status: Active". */
  label: string
  /** Choices in the filter menu, as plain strings or value/label pairs; an "All" choice is added first. */
  options: (string | { value: string; label: string })[]
  /** Returns the row's value to compare with the chosen option's value. */
  getValue: (row: T) => string
}
export type TableBulkAction = {
  /** Visible button and menu item text. */
  label: string
  /** Called with the selected row ids (see `getRowId`) from the toolbar, or with one row's id from its menu; the selection then clears. */
  onAction: (ids: string[]) => void
  /** Marks the menu item as destructive; defaults to false. */
  destructive?: boolean
}
export type TableProps<T> = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** The table's title: shown as its heading unless `showTitle` is false, and always its caption and accessible name. */
  label: string
  /** Shows `label` as a visible heading above the table; defaults to true. */
  showTitle?: boolean
  /** Heading level of the visible title, h1 to h6. Defaults to 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** The data. Search, filters, sorting and pagination run on these rows in the browser. */
  rows: T[]
  /** Returns a row's unique id, used for keys and selection; defaults to the row's `id` field (a string or number, as a string). */
  getRowId?: (row: T) => string
  /** Column definitions, in display order. */
  columns: TableColumn<T>[]
  /** Short name for a row, used in its checkbox and menu accessible names, e.g. "Select Ada Lovelace". */
  rowLabel: (row: T) => string
  /** Text a row matches against; giving it shows the search field. */
  searchText?: (row: T) => string
  /** Filter menus in the toolbar; a non-empty list shows the filter UI. */
  filterOptions?: TableFilter<T>[]
  /** Row height; defaults to 'comfortable'. */
  density?: 'comfortable' | 'compact'
  /** Shows the search field; defaults to on when `searchText` is given. */
  search?: boolean
  /** Row checkboxes; defaults to on when there are bulk actions, a selection handler or `selectedIds`. */
  selectable?: boolean
  /** Shows pagination under the table; defaults to true. */
  pagination?: boolean
  /** Rows per page at first; defaults to 10. */
  defaultPageSize?: number
  /** Choices in the rows-per-page menu; defaults to [10, 25, 50]. */
  pageSizeOptions?: number[]
  /** Wide-table mode: pins the checkbox and first column left and the row menu right while scrolling sideways; defaults to false. */
  sticky?: boolean
  /** Shows skeleton rows and a loading status, and disables the tools; defaults to false. */
  loading?: boolean
  /** Actions for the selected rows; each also appears in a row's own menu. */
  bulkActions?: TableBulkAction[]
  /** Adds an "open" item (openLabel) to each row's menu, called with that row. */
  onRowOpen?: (row: T) => void
  /** Builds a row's menu items, replacing the open and bulk items; giving it shows the row menu. */
  rowActions?: (row: T) => MenuItem[]
  /** Selected row ids (see `getRowId`), for a controlled selection; leave it out to let the table keep its own. */
  selectedIds?: string[]
  /** Called with the full list of selected row ids whenever the selection changes. */
  onSelectionChange?: (ids: string[]) => void
  /** Empty-state heading when there are no rows; defaults to "No data yet". */
  emptyTitle?: string
  /** Empty-state text when there are no rows; defaults to "Items will appear here once they are added." */
  emptyDescription?: string
  /** Status text announced while loading; defaults to "Loading…". */
  loadingLabel?: string
  /** Text of the row menu item added by `onRowOpen`; defaults to "View details". */
  openLabel?: string
}
let warnedMissingId = false
function defaultRowId(row: unknown, index: number): string {
  const id = (row as { id?: unknown } | null)?.id
  if (typeof id === 'string' || typeof id === 'number') return String(id)
  if (!warnedMissingId) {
    warnedMissingId = true
    console.error('DIYA Table: a row has no string or number `id`. Pass `getRowId` to say which field identifies a row.')
  }
  return `diya-row-${index}`
}
/** A data table with optional search, filters, sorting, row selection, bulk and row actions, and pagination, all run in the browser. */
export const Table: <T>(props: TableProps<T> & RefAttributes<HTMLDivElement>) => ReactNode = forwardRef<HTMLDivElement, TableProps<any>>(function Table<T>({
  label,
  showTitle = true,
  headingLevel = 3,
  rows,
  getRowId,
  columns,
  rowLabel,
  searchText,
  filterOptions,
  density = 'comfortable',
  search,
  selectable,
  pagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  sticky = false,
  loading = false,
  bulkActions = [],
  onRowOpen,
  rowActions,
  selectedIds,
  onSelectionChange,
  emptyTitle,
  emptyDescription,
  loadingLabel,
  openLabel,
  className,
  ...props
}: TableProps<T>, ref: ForwardedRef<HTMLDivElement>) {
  const t = useDiyaMessages('table', tableMessages)
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  const ids = new Map<T, string>()
  rows.forEach((row, index) => ids.set(row, getRowId ? getRowId(row) : defaultRowId(row, index)))
  const idOf = (row: T) => ids.get(row) as string
  const [query, setQuery] = useState('')
  const [filterValue, setFilterValue] = useState<Record<string, string | null>>({})
  const activeFilter = (key: string) => typeof filterValue[key] === 'string'
  const showSearch = search ?? !!searchText
  const selection = selectable ?? (bulkActions.length > 0 || !!onSelectionChange || selectedIds !== undefined)
  const filters = !!filterOptions?.length
  const optionsOf = (filter: TableFilter<T>) => filter.options.map((option) => typeof option === 'string' ? { value: option, label: option } : option)
  const [sort, setSort] = useState<{ key: string; direction: 1 | -1 }>({ key: '', direction: 1 })
  const [localSelected, setLocalSelected] = useState<string[]>([])
  const selected = selectedIds ?? localSelected
  const showActions = !!(rowActions || bulkActions.length || onRowOpen)
  function setSelection(ids: string[]) {
    if (selectedIds === undefined) setLocalSelected(ids)
    onSelectionChange?.(ids)
  }
  function actionsFor(row: T): MenuItem[] {
    return (
      rowActions?.(row) ?? [
        ...(onRowOpen ? [{ id: 'open', label: openLabel ?? t.open, onSelect: () => onRowOpen(row) }] : []),
        ...bulkActions.map((action, index) => ({
          id: `bulk-${index}`,
          label: action.label,
          destructive: action.destructive,
          onSelect: () => action.onAction([idOf(row)]),
        })),
      ]
    )
  }
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const matches = rows.filter(
    (row) =>
      (!showSearch || !searchText || searchText(row).toLowerCase().includes(query.trim().toLowerCase())) &&
      (!filters ||
        !filterOptions ||
        filterOptions.every(
          (item) => !activeFilter(item.key) || item.getValue(row) === filterValue[item.key]
        ))
  )
  const sortColumn = columns.find((column) => column.key === sort.key)
  if (sortColumn?.sortValue)
    matches.sort((a, b) => {
      const x = sortColumn.sortValue!(a),
        y = sortColumn.sortValue!(b)
      return (
        (typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y))) * sort.direction
      )
    })
  const current = Math.min(page, Math.max(1, Math.ceil(matches.length / pageSize)))
  const visible = pagination ? matches.slice((current - 1) * pageSize, current * pageSize) : matches
  const activeSelection = selected.filter((id) => rows.some((row) => idOf(row) === id))
  const allSelected = visible.length > 0 && visible.every((row) => selected.includes(idOf(row)))
  const hasFilters =
    (showSearch && !!query.trim()) || (filters && filterOptions?.some(item => activeFilter(item.key)))
  const someSelected = visible.some((row) => selected.includes(idOf(row)))
  return (
    <div
      {...props}
      ref={ref}
      className={cx('diya-table', className)}
      data-density={density}
      data-sticky={sticky || undefined}
      data-selection={selection || undefined}
      data-rich={columns.length > 4 || undefined}
    >
      {(showTitle || filters || showSearch) && <div className="diya-table-toolbar">
        {showTitle && <Heading className="diya-table-title">{label}</Heading>}
        <div className="diya-table-tools">
          {filters && filterOptions && (
            <div className="diya-table-filters">
              {filterOptions.map((item) => (
                <div
                  key={item.key}
                  className="diya-table-filter"
                  data-active={activeFilter(item.key) || undefined}
                >
                  <Menu
                    disabled={loading}
                    label={activeFilter(item.key) ? t.filterValue(item.label, optionsOf(item).find((option) => option.value === filterValue[item.key])?.label || t.noValue) : item.label}
                    items={[
                      {
                        id: 'all-values',
                        label: t.all,
                        type: 'radio',
                        checked: !activeFilter(item.key),
                        onSelect: () => {
                          setFilterValue({ ...filterValue, [item.key]: null })
                          setPage(1)
                        },
                      },
                      ...optionsOf(item).map((option, index) => ({
                        id: 'value-' + index,
                        label: option.label || t.noValue,
                        type: 'radio' as const,
                        checked: filterValue[item.key] === option.value,
                        onSelect: () => {
                          setFilterValue({ ...filterValue, [item.key]: option.value })
                          setPage(1)
                        },
                      })),
                    ]}
                  />
                </div>
              ))}
              {filterOptions.some(item => activeFilter(item.key)) && (
                <button
                  type="button"
                  className="diya-table-clear"
                  onClick={() => {
                    setFilterValue({})
                    setPage(1)
                  }}
                >
                  {t.clearFilters}
                </button>
              )}
            </div>
          )}
          {showSearch && (
            <Search
              disabled={loading}
              size="small"
              label={t.searchLabel(label)}
              hideLabel
              placeholder={t.search}
              clearable
              value={query}
              onValueChange={(value) => {
                setQuery(value)
                setPage(1)
              }}
            />
          )}
        </div>
      </div>}
      {selection && activeSelection.length > 0 && (
        <div className="diya-table-bulk">
          <span role="status">{t.selected(activeSelection.length)}</span>
          {bulkActions.map((action, index) => (
            <Button
              key={`${index}-${action.label}`}
              size="small"
              variant="outline"
              disabled={loading}
              onClick={() => {
                action.onAction(activeSelection)
                setSelection([])
              }}
            >
              {action.label}
            </Button>
          ))}
          <Button size="small" variant="quiet" onClick={() => setSelection([])}>
            {t.clearSelection}
          </Button>
        </div>
      )}
      <div
        className="diya-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={t.scrollHint(label)}
        onFocus={(event) => {
          // Browsers leave a partly visible control where it is; bring it, and its focus ring, fully into view.
          const target = event.target as HTMLElement
          let keyboard = false
          try { keyboard = target !== event.currentTarget && target.matches(':focus-visible') } catch { /* Older engines lack :focus-visible. */ }
          if (keyboard) target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
        }}
      >
        <table
          aria-busy={loading}
          style={
            columns.length > 4
              ? {
                  width:
                    columns.reduce((sum, column) => sum + (column.width ?? 160), 0) +
                    (selection ? 48 : 0) +
                    (showActions ? 56 : 0),
                  minWidth: '100%',
                }
              : undefined
          }
        >
          <colgroup>
            {selection && <col style={{ width: 48 }} />}
            {columns.map((column) => (
              <col key={column.key} style={column.width ? { width: column.width } : undefined} />
            ))}
            {showActions && <col style={{ width: 56 }} />}
          </colgroup>
          <caption className="diya-sr-only">{label}</caption>
          <thead>
            <tr>
              {selection && (
                <th className="diya-table-check" data-pinned="selection" scope="col">
                  <input
                    type="checkbox"
                    aria-label={t.selectPage}
                    checked={allSelected}
                    disabled={loading || !visible.length}
                    ref={(node) => {
                      if (node) node.indeterminate = someSelected && !allSelected
                    }}
                    onChange={() =>
                      setSelection(
                        allSelected
                          ? selected.filter((id) => !visible.some((row) => idOf(row) === id))
                          : [...new Set([...selected, ...visible.map(idOf)])]
                      )
                    }
                  />
                </th>
              )}
              {columns.map((column, columnIndex) => (
                <th
                  scope="col"
                  data-pinned={columnIndex === 0 ? 'primary' : undefined}
                  key={column.key}
                  className={column.numeric ? 'diya-table-numeric' : undefined}
                  aria-sort={
                    column.sortValue
                      ? sort.key === column.key
                        ? sort.direction === 1
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      disabled={loading}
                      className="diya-table-sort"
                      onClick={() => {
                        setSort({
                          key: column.key,
                          direction: sort.key === column.key && sort.direction === 1 ? -1 : 1,
                        })
                        setPage(1)
                      }}
                    >
                      {column.label}
                      <svg
                        width="12"
                        height="14"
                        viewBox="0 0 12 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path
                          opacity={sort.key === column.key && sort.direction === -1 ? 0.25 : 1}
                          d="m3 5 3-3 3 3"
                        />
                        <path
                          opacity={sort.key === column.key && sort.direction === 1 ? 0.25 : 1}
                          d="m3 9 3 3 3-3"
                        />
                      </svg>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              {showActions && (
                <th scope="col" className="diya-table-actions">
                  <span className="diya-sr-only">{t.actions}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    {Array.from(
                      {
                        length:
                          columns.length +
                          Number(selection) +
                          Number(showActions),
                      },
                      (_, j) => (
                        <td key={j}>
                          <span className="diya-table-skeleton" aria-hidden="true" />
                        </td>
                      )
                    )}
                  </tr>
                ))
              : visible.map((row) => (
                  <Fragment key={idOf(row)}>
                    <tr data-selected={(selection && selected.includes(idOf(row))) || undefined}>
                      {selection && (
                        <td className="diya-table-check" data-pinned="selection">
                          <input
                            type="checkbox"
                            aria-label={t.selectRow(rowLabel(row))}
                            checked={selected.includes(idOf(row))}
                            onChange={() =>
                              setSelection(
                                selected.includes(idOf(row))
                                  ? selected.filter((id) => id !== idOf(row))
                                  : [...selected, idOf(row)]
                              )
                            }
                          />
                        </td>
                      )}
                      {columns.map((column, columnIndex) => (
                        <td
                          data-pinned={columnIndex === 0 ? 'primary' : undefined}
                          key={column.key}
                          className={column.numeric ? 'diya-table-numeric' : undefined}
                        >
                          {column.render(row)}
                        </td>
                      ))}
                      {showActions && (
                        <td className="diya-table-actions">
                          <Menu
                            label={t.rowActions(rowLabel(row))}
                            triggerIcon={
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <circle cx="5" cy="12" r="1.5" />
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="19" cy="12" r="1.5" />
                              </svg>
                            }
                            items={actionsFor(row)}
                          />
                        </td>
                      )}
                    </tr>
                  </Fragment>
                ))}
            {!loading && !visible.length && (
              <tr>
                <td
                  colSpan={
                    columns.length +
                    Number(selection) +
                    Number(showActions)
                  }
                >
                  <div className="diya-table-empty">
                    <strong>{hasFilters ? t.noMatches : emptyTitle ?? t.emptyTitle}</strong>
                    <p>
                      {hasFilters ? t.noMatchesDescription : emptyDescription ?? t.emptyDescription}
                    </p>
                    {hasFilters && (
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => {
                          setQuery('')
                          setFilterValue({})
                          setPage(1)
                        }}
                      >
                        {t.clearAll}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && (
        <p role="status" className="diya-table-loading">
          {loadingLabel ?? t.loading}
        </p>
      )}
      {pagination && !loading && (
        <Pagination
          page={current}
          total={matches.length}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}
    </div>
  )
})

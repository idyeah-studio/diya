# Pattern guide

Patterns combine the components into useful structures. Import them from
`@idyeah/diya`, except `DataViz` and `Chart`, which come from
`@idyeah/diya/charts`. All patterns render inside `DiyaProvider`. To see each
one working, open it in the
[catalog](https://diya13.ai/explore?area=patterns).

Want to see them working together? **[Oriel](https://oriel.diya13.ai)**
is a small invoicing app made only from DIYA. Its source is in
[`examples/oriel`](https://github.com/idyeah-studio/diya/tree/main/examples/oriel),
and `npm create diya@latest` can start your app from it.

```tsx
import { PageHeader, Table } from '@idyeah/diya'
import { DataViz } from '@idyeah/diya/charts'
```

Every pattern that renders a heading takes `headingLevel` (1 to 6), so it fits
your page's outline; the heading looks the same at every level.

| Pattern | Content and control |
| --- | --- |
| PageHeader | `title`, optional breadcrumbs/description/tags/actions/navigation slots; `headingLevel` (default 2); `surface` (default `true`; `false` sets it straight on the page, as an app screen's title). Omitted slots collapse. |
| SiteHeader | `brand`, optional navigation items (`{value,label,href?}`) with the current `value` and `onValueChange`; items with `href`, and the brand with `brandHref`, are real links through the provider's `linkComponent`. Controlled search, utilities and avatar slots. Mobile navigation opens/closes automatically. Search and icon hit areas are 40px high; avatar content retains its chosen size inside a centered slot. Narrow headers place Search on its own row. |
| Card | `title`, optional `description`, `tags`, `actions`, `media`, children and `footer`; `divided`, `shadow`. Images/content belong to the caller. |
| Dialog | `title`, children, optional `onConfirm`/footer; your own `trigger` element, or controlled `open`/`onOpenChange`. `confirmVariant="destructive"` for an action that deletes; `headingLevel`; size, `divided`, close/dismiss/loading options. |
| Table | Your rows/columns, `label`, `rowLabel`; optional `searchText`, `filterOptions`, `bulkActions`, `onRowOpen`, `rowActions` and selection; sorting, pagination (10 rows by default), density and sticky columns. |
| FileUpload | Controlled `files`, `onFilesChange`; optional `accept`, `maxBytes`, `onReject`, `multiple` (default off: a new file replaces the last), `disabled`. No network/upload behavior. |
| Form | Children and a real `onSubmit(event)`; optional `title` with `headingLevel`, actions/cancel/`loading`. Your app validates and handles submission. |
| Wizard | Steps with unique `id`, label/content, controlled `activeStep`, `onStepChange`, `onComplete`; `orientation` (`'horizontal'`/`'vertical'`), `showStepCount` (default on, "Step 1 of 3"), `loading`. |
| Drawer | Controlled `open`, `onOpenChange`, title/children; optional description/footer and `side` (`'left'`/`'right'`). Native modal dialog. |
| ContentState | `title`, optional description/icon/action. Announced as a status; set `urgent` to announce it as an alert. Useful for empty/error states. |
| SideNavigation | Groups (keyed by `id`) of items (keyed by `value`), controlled `value`. Items with `href` are real links through the provider's `linkComponent`, with `aria-current="page"` on the current one; without `href`, `onValueChange` tells your app which was chosen. Optional brand/collapsed state. An item's `count` is a quiet number after its label (`99+` above 99, a dot on the icon when collapsed); its accessible name keeps the real count, "Inbox, 12". |
| Chatbot | Your messages and controlled draft, `onSend`; `layout` (`'embedded'`/`'floating'`/`'full-page'`), `showTimestamps`, `showHeader`; optional attachments, `loading`, stop/retry/copy/open callbacks. Full-page fills its container's height, with the thread scrolling between the header and the composer. No AI service or simulated reply. Experimental in 1.0: props may change in a minor release. |
| DataViz | `title`, chart type/data; optional actions/summary/footer, shadow and exact-value data table. `formatValue` formats tooltips, value-axis labels and the data table alike; grid lines run along the value axis only. Separate chart renderer dependency. Experimental in 1.0, with `Chart`. |

## Tables

Rows need unique stable string IDs. Columns provide their rendering function
and optionally a sort value. Supply actions only when your app supports them.

With only `label`, `rows`, `columns` and `rowLabel`, a table sorts and pages
(10 rows a page) and nothing else. Each extra appears when you give it what it
needs:

| To show | Give |
| --- | --- |
| Search field | `searchText`. `search={false}` hides it again. |
| Filter menus | `filterOptions`, a non-empty `TableFilter[]` |
| Row checkboxes | `bulkActions`, `onSelectionChange` or `selectedIds`. `selectable` turns them on or off directly. |
| Row menu | `rowActions`, `bulkActions` or `onRowOpen` |
| Other page sizes | `defaultPageSize` (default 10) and `pageSizeOptions` (default `[10, 25, 50]`). `pagination={false}` shows every row. |

```tsx
<Table
  label="Projects"
  rows={projects}
  rowLabel={row => row.name}
  searchText={row => `${row.name} ${row.owner}`}
  columns={[
    { key: 'name', label: 'Project', render: row => row.name,
      sortValue: row => row.name, width: 240 },
    { key: 'owner', label: 'Owner', render: row => row.owner, width: 180 },
  ]}
  filterOptions={[
    { key: 'status', label: 'Status', options: ['Active', 'Paused'],
      getValue: row => row.status },
    { key: 'owner', label: 'Owner',
      options: [{ value: 'ana', label: 'Ana Ruiz' }, { value: 'li', label: 'Li Wei' }],
      getValue: row => row.ownerId },
  ]}
  onRowOpen={row => setOpenProject(row)}
  bulkActions={[
    { label: 'Archive', onAction: ids => archiveProjects(ids) },
    { label: 'Delete', onAction: ids => deleteProjects(ids), destructive: true },
  ]}
/>
```

- Set `sticky` for pinned leading columns and a pinned actions column. Give
  wide tables explicit column widths; intermediate columns scroll underneath.
- Set `loading` while your real request runs.
- `selectedIds`/`onSelectionChange` make selection controlled. Otherwise the
  pattern tracks selection locally. Filtering/pagination does not discard it.
- Each `filterOptions` item is a `TableFilter`: a unique `key`, the menu
  `label`, its `options` (plain strings, or `{ value, label }` when the shown
  text differs from the value) and `getValue(row)`, which returns the row's
  value to match. Filter state is kept by `key`, so two filters may share a
  label. Search, filtering, sorting and pagination are local; supply a bounded
  dataset. Remote datasets require your own server query UI.
- `bulkActions` appear in the toolbar once rows are selected. Each receives the
  selected IDs, and the selection clears afterwards. Each action is also listed
  in every row's menu, where it receives only that row's ID: `[row.id]`.
- `onRowOpen` adds an open item to each row's menu (`openLabel`, default
  "View details"). Use it to show a row's details in a Drawer or Dialog.
- `rowActions` replaces the row menu with your own Menu items. Nothing is
  archived or saved by the library itself.

## Forms, dialogs and wizards

Match field sizes and keep errors next to the relevant field. In `Form`, call
`event.preventDefault()` in your submission handler when handling data in
React. Your callback owns persistence and loading/error state.

Dialog confirmation can return `false` to stay open, or a Promise for an
asynchronous action. A rejected Promise leaves it open and displays an error.
A custom `footer` replaces the built-in actions, so provide your own dismissal
and loading controls.

Drawer and Dialog use native modal focus behavior. Keep their open state in
sync through `onOpenChange`; Escape requests dismissal and closing restores
focus. Use labels and a clear close action. Avoid nesting modal dialogs.

Wizard's `onStepChange` receives an attempted destination. Validate the current
step before updating `activeStep`; leaving it unchanged keeps the user on that
step. Completion belongs to `onComplete`. `loading` blocks repeated navigation.

File Upload's checks improve immediate feedback. Rejected files are reported
through `onReject`; your server still validates content, size and permissions.
The selected files are kept only in your caller state.

## Chatbot

Pass `{id, role: 'user' | 'assistant', text}` messages with unique IDs. On send,
append your user message, clear the draft and call your own AI service. Append
its reply when it succeeds. Keep `loading` true during the request and connect
`onStop` to a real cancellation operation when offered. If you stream the reply
into an assistant message, keep `loading` true until it is complete: the log is
marked busy meanwhile, so screen readers read the reply once, not word by word.
"Preparing a response…" shows only until the reply's first words arrive, and
the reply gets its Copy button once `loading` is off. A reply stopped partway
keeps what was written, and can be copied too.

`layout="full-page"` fills its container's width and height: the header and
composer stay put, and the thread takes the rest and scrolls, following the
latest message unless the reader has scrolled up. Give the container a height,
such as an app shell's main area in a `100dvh` flex or grid layout, or set one
on the Chatbot itself. A height set on an embedded or floating Chatbot is
filled the same way; without one, the thread is 280px tall (380px full-page).

```tsx
<Chatbot layout="full-page" style={{ height: '100dvh' }} title="Assistant" … />
```

A screen with its own heading, such as an `h1` beside a model picker, sets
`showHeader={false}`. The title and description leave the screen, and `title`
still names the chat region and its message log; a floating chat keeps its
close button.

Attachment selection hands File objects to your callback. `onRetry`, `onCopy`
and suggestion controls likewise call your handlers. The library sends no
messages or attachments anywhere. Keep sensitive data out of sample fixtures.

## Data visualization

Install `echarts` (6.1 or later) and import from `@idyeah/diya/charts`. Set
`type` to `line`, `area`, `bar`, `donut`, `pie`, `combo` or `treemap`; the
catalog's Data Viz page shows each.

| Chart family | Data |
| --- | --- |
| `line`/`area`/`bar`/`combo` | `categories` plus `series: {name,values,color?,type?}[]`; values match category order. `null` creates a gap. |
| `donut`/`pie` | `data: {name,value,color?}[]`; finite nonnegative values, with at least one positive value. |
| `treemap` | The same data shape, optionally nested `children`; an omitted parent value is summed from its children. |

Choose `variant` where appropriate: `smooth` for lines, `stacked` for Cartesian
series, `horizontal` for bars, `thin` for donut rings (default `standard`). `legend`, `grid`, `tooltip`
and `palette` control presentation. `formatValue` changes value formatting;
`centerLabel` labels the donut total.
`formatValue` applies to tooltips, data tables, donut totals and treemap labels;
Cartesian axis ticks use the renderer's default formatting.

Keep `height` (default 300px) and `valueDomain` constant when comparing simple
and dense views. More series/slices make the view dense; they do not require
a shorter plot or a different scale. Use `showDataToggle` to expose a real data
table. Labels and the table provide a text alternative to the chart.

This renderer covers these seven types. It is not a live data service, financial
analytics engine or dashboard backend. Header controls supplied through
`actions` must update your own data/props.

DataViz accepts `showHeader={false}` to hide the visible title and description
while keeping the chart's accessible name. Its optional `actions` slot still
works on its own.

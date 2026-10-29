# Portable package verification

Run `pnpm install --frozen-lockfile`, then `pnpm test`. The command rebuilds the
package and tests its public compiled exports rather than importing catalog code.

The suite checks real callbacks and native field attributes, disabled/read-only
states, error associations, keyboard selection, popup dismissal and tab order,
scoped portal placement, table filtering/sorting/selection, bulk and row-open
actions, single and multiple value shapes, asynchronous dialog confirmation,
drawer focus restoration, accessible chart data tables, and server rendering
without browser globals.

Table defaults are checked directly: 10 rows a page, `defaultPageSize` and
`pageSizeOptions`, no checkboxes until there are bulk actions or a selection
handler, no search until `searchText`, and filter state kept by `key` so two
filters with the same label stay independent. Display checks cover an
indeterminate Progress when there is no `value`, Badge `max`, Tag `tone`, Card
`tags`/`actions`, pill Tabs, Breadcrumbs `showHomeIcon`, Wizard
`showStepCount`, Chatbot `layout`/`showTimestamps` and single or `multiple`
FileUpload. Field checks include Select `onValueChange` beside the native
`onChange`, Switch `helperText`/`error`, the visible Slider label, Choice
option descriptions, and `className`/`style` landing on the field wrapper.
`inbox-contracts.test.tsx` covers List `current` (`aria-current="true"`) and
`unread` (named after the label, translatable), Side Navigation `count` (the
99+ cap, the real count in the name, a dot when collapsed), and a Chatbot
thread that fills the height it is given and follows the latest message when
it is resized. `aria-attributes.test.tsx` renders every core component, with
popups open and the Chatbot in each state, and fails on any `aria-*` attribute
WAI-ARIA doesn't define. `messages.test.tsx` checks `DiyaProvider` `messages`: overridden strings
render, missing keys keep their English defaults, function values interpolate,
and per-instance label props still win.

Boundary regressions cover real empty table filter values and prototype-like
filter labels, valid bulk selection after rows are removed, keyboard focus after
removing a Combobox chip, and native Dialog close/reopen while an old confirmation
is pending. Menu navigation recovers when disabled choices become available;
Tabs keeps a matching panel and keyboard stop when the supplied value is disabled.
DatePicker checks include reopening the selected month and keyboard navigation
across calendar boundaries.

HappyDOM supplies a DOM, not browser layout or accessibility conformance evidence.
The setup emulates the basic native dialog open/close boundary and defaults to the
anchored popup fallback. One test supplies the native popover API explicitly.
The SDK chart data-control tests stub the rendering engine; SSR uses the real optional
charts module. The financial consumer in `examples/vite` runs against the installed
packed `@idyeah/diya` artifact and the real ECharts SVG renderer. Its HappyDOM tests
supply chart host dimensions and basic native-dialog behavior, then reconcile
report KPIs, chart data tables, scoped ledger rows, local edits, and CSV exports.
Run that separate integration suite with `cd examples/vite && pnpm test`.

Native top-layer/inert behavior, visible focus, contrast, SVG chart
layout, resizing, tooltips, and all appearance/viewport combinations still need
real-browser checks.

Current API boundaries are deliberate: TextInput/TextArea/Search use controlled
values; custom controls use their documented callbacks rather than generic form
registration props; Combobox, Choice, Slider and DatePicker return one value by
default and a list or range with `multiple`/`range`; Slider uses a 0–100 domain;
DatePicker expects ISO date strings and formats them with the provider's
`locale`; Accordion owns
expansion state. Tooltip children are noninteractive content for its own button,
and selectable List row slots are noninteractive. Toast represents one
notification; the host owns its lifecycle and unmounts it after `onDismiss`.
Expandable table rows belong to the Pro advanced table and are not tested here.
Authentication, durable storage, permissions, uploads, chat services and other
backend integrations belong to the consuming application.

# Changelog

All notable changes to `@idyeah/diya` are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-07

First public release, under the MIT License.

### Added

- 26 React components and 13 patterns. `Chart` and `DataViz` are exported from
  `@idyeah/diya/charts` and render with the optional `echarts` peer dependency;
  everything else is exported from `@idyeah/diya`.
- `DiyaProvider` with Light, Dark and Glass appearances, brand color, font,
  locale and built-in text (`messages`, `defaultMessages`).
- `@idyeah/diya/styles.css`, with public `--diya-*` theme tokens and the DIYA
  Sans font (SIL Open Font License 1.1).
- `@idyeah/diya/api.json`, a machine-readable map of exports, props and tokens.
- api.json names the uncontrolled default (`defaultValue`, Switch `defaultChecked`) for every field that has one: Text Input, Text Area, Select, Combobox, Date Picker, Choice, Switch, Slider and Search.
- Support for React 18.3 and React 19, including Next.js App Router: the root
  entry has no `'use client'` directive, so `defaultMessages` and types can be
  imported in Server Components, and each interactive component carries its own
  directive.
- `Stack` and `Inline` layout primitives, with `gap` on a public spacing scale
  (`--diya-space-1` to `--diya-space-8`), `align`, `justify`, `wrap` and `as`.
- Every component takes `className`, `style` and its root element's other
  attributes, and forwards its ref: fields to their native control, Menu,
  Popover and Tooltip to the trigger, everything else to the root.
- `DiyaProvider`:
  - `theme="system"`, now the default, follows the OS Light or Dark setting in
    CSS, with no flash and nothing to run on the server;
  - it paints its own background and text color; `surface={false}` opts out;
  - `brandColor` is one brand color, or `{ light, dark }`, that sets the
    accent tokens: the main Button, selected pill Tabs, an on Switch, Slider
    and Progress; a colored brand also leads chart series 1, and a neutral one
    leaves the charts to DIYA's Vivid palette. Text on it is white whenever that reaches
    4.5:1, otherwise near-black;
  - `linkComponent` renders every `href` through your router's link, such as
    Next.js `Link`;
  - `useDiyaAppearance()` reports the theme in effect, Glass, the font and the
    brand's accent colors.
- Links: Button takes `href` and `asChild`, TextLink takes `asChild`, and Side
  Navigation, Breadcrumbs, Site Header and Menu items with an `href` are real
  links (`aria-current="page"` on the current one).
- Button `variant="destructive"`, and Dialog `confirmVariant="destructive"`.
- Menu and Popover take your own `trigger` element and a controlled `open`
  with `onOpenChange`; Popover content can be a plain node. Dialog takes a
  `trigger`. Tooltip wraps your own trigger, such as an icon-only Button.
- Forms: fields forward refs to their native controls, work uncontrolled
  (`defaultValue`, `defaultChecked`) and reset with their form, and pass native
  `name`, `onChange` and `onBlur` through, so react-hook-form's `register()`
  works without a `Controller`. Combobox and DatePicker take `name`.
- Slider takes `min`, `max` and `step`. DatePicker takes `min` and `max`, keeps
  one Tab stop in its calendar (arrows, Home/End and PageUp/PageDown move), and
  starts weeks on the locale's first day.
- `headingLevel` on every pattern that renders a heading; Form's `title` is
  optional.
- Pagination fits at 320 to 390px.
- DIYA's appearance: Dark sits on a near-black ground (`#111113`) with surfaces
  lifted only slightly; Light is white all the way down, with hairlines,
  spacing and type carrying the hierarchy. Status colors come from the Vivid
  family, each label at 4.5:1 or more on its tint. In-page surfaces lift with
  a soft shadow and a faint edge, and their titles are a quiet 15px.
- Glass is see-through frosted glass on every surface. Cards, chart cards,
  tables (clear rows on the card's glass) and inline alerts are the clearest
  pane, so the backdrop's light and shade pass visibly behind them; side
  navigation, headers, controls, menus, popovers, dialogs, drawers and toasts
  are denser, so text on them always reads. The material is neutral: its blur
  lifts saturation by 1.15 at most, so a backdrop arrives as soft light, never
  as a color wash. Each pane has a top-lit inner rim, a faint sheen across its
  top and a soft shadow, deeper for floating layers. To hold 4.5:1 over what
  the glass lets through, Light Glass's muted text is a step deeper, status
  tags and Metric changes keep a solid base under their tint, and pagination
  labels that sit on the backdrop get a soft frosted lift. Dialogs and drawers
  sit over a dimming layer. `prefers-reduced-transparency` and
  `prefers-contrast: more` get solid surfaces. A pill Tabs track is a capsule
  like its thumb.
- Button is a pill by default; `shape="rounded"` keeps the control corner.
  Pattern actions, Menu and Popover triggers and Table filters follow.
- `--diya-radius-surface`, the one corner Card, chart cards, Page Header, Form
  and Table share.
- `PageHeader` takes `surface={false}` to sit straight on the page.
- Figures are tabular: Metric, Table numbers, chart data and Progress line up
  digit for digit, in DIYA Sans's own 0 and 1. A positive or negative
  `Metric` change shows as a tinted chip.
- `Rating`, read-only stars for products, places and reviews. The stars fill
  to the nearest half of `value` (out of `max`, 5 by default); `count` adds
  the number of reviews and `showValue` the rating as a number. Screen readers
  hear one phrase, such as "Rated 4.3 out of 5, 128 reviews".
- `DataViz`'s `formatValue` labels the value axis too, and grid lines run
  along the value axis only.
- A `List` inside a `Card` or `Drawer` lines up with its title.
- `List` items take `current`, for the open item (`aria-current="true"` and a
  selected background), and `unread`: a heavier label, a dot at the row's end,
  and "unread" after the label for screen readers (`messages.list.unread`).
- Side Navigation items take `count`, a quiet number after the label. Above 99
  it shows `99+`; collapsed, a dot on the icon stands in for it. The item's
  accessible name keeps the real count, "Inbox, 12"
  (`messages.sideNavigation.count`).
- A `layout="full-page"` Chatbot fills its container's height: the header and
  composer stay put and the thread scrolls between them, following the latest
  message. A height set on any Chatbot is filled the same way; without one,
  the thread keeps its 280px (380px full-page).
- `npm create diya@latest` (the `create-diya` package, released with this one
  on the same version) starts a Next.js or Vite app with the provider, styles
  and agent notes in place, from Minimal or from Oriel, a four-screen
  invoicing app.
- [Oriel](https://oriel.diya13.ai), a demo app made only from DIYA, in
  `examples/oriel`.
- `bench/`: the bundle-size measurement, rerunnable with
  `node bench/measure.mjs`. One Button with `DiyaProvider` adds 2.3 KB of
  gzipped JavaScript to a Vite build.

### Renamed since the preview

The 0.1.0 preview builds shipped as <code>&#64;diya/ui</code>. The
package is now `@idyeah/diya`, and the names below changed before 1.0. There
are no aliases for the old names; TypeScript reports each one.

**Values and callbacks**

- One change pattern, `value` with `onValueChange`:
  - `DatePicker`: `onChange` → `onValueChange`.
  - `Combobox`: `onChange` → `onValueChange`.
  - `SiteHeader`: `onNavigate` → `onValueChange`, paired with its `value`.
  - `Select` gains `onValueChange(value)`; the native `onChange(event)` still
    works.
- `Choice`: `mode: 'single' | 'multiple'` → `multiple`. Single gives
  `value: string`; `multiple` gives `value: string[]`. `selectAll` is
  available only with `multiple`.
- `Combobox`: single gives `value: string` (`''` for none); `multiple` gives
  `value: string[]`.
- `Slider`: single gives `value: number`; `range` gives
  `value: [number, number]`.
- `DatePicker`: single gives an ISO date string (`''` for none); `range` gives
  `value: DateRange` (`{ start, end }`). `label` is now required.

**Props**

| Component | Before | 1.0 |
| --- | --- | --- |
| TextInput, TextArea, Select, Search | `fieldSize` | `size` |
| Form, Wizard | `pending` | `loading` |
| Chatbot | `busy` | `loading` |
| Chatbot | `type` | `layout` (`'embedded' \| 'floating' \| 'full-page'`) |
| Chatbot | `timestamps` | `showTimestamps` |
| Toast | `onClose` | `onDismiss` |
| Toast | `dismissible` | `showClose` |
| Card, Dialog | `divider` | `divided` |
| Card | `menu` | `actions` |
| Card | `tag` | `tags` |
| Button | `shape: 'rectangle'` | `shape: 'rounded'`, now the default |
| ContentState | `role: 'status' \| 'alert'` | `urgent` (`true` announces it as an alert) |
| Badge | `type` | `variant` (`'indicator' \| 'count'`) |
| Badge | `maximum` | `max` |
| Badge, Tag | `color` | `tone` |
| Slider | `labels` | `showValues` |
| Slider | `marks` | `showMarks` |
| Progress | `percentage` | `showValue` |
| Progress | `type` | `variant` (`'linear' \| 'circular'`) |
| Wizard | `summary` | `showStepCount` |
| Breadcrumbs | `homeIcon` | `showHomeIcon` |
| Tabs | `variant: 'pills'` | `variant: 'pill'` |
| Switch | `description` | `helperText` (Switch also gains `error`) |
| SideNavigationItem | `id` | `value` (`SideNavigationGroup` keeps `id`) |
| Table | `selection` | `selectable` |
| Table | `filter` (`{ label, values, value }`) | `filterOptions` (`TableFilter`: `{ key, label, options, getValue }`) |

Option values are lowercase: Wizard `orientation` (`'horizontal' | 'vertical'`),
Drawer `side` (`'left' | 'right'`), and Chart and DataViz `type` and
`variant`.

**Types**

| Before | 1.0 |
| --- | --- |
| `ComboOption` | `ComboboxOption` |
| `SiteNavigationItem` | `SiteHeaderItem` |
| `DateValue` | `DateRange` |
| `BadgeColor` | `Tone`, shared by Badge, Tag, Alert and Toast (`AlertTone` is `Tone` without `'neutral'`) |

**Removed**

- Dialog: `label` (the built-in trigger) and `inline`. Pass your own
  `trigger`, or control `open`.
- `brandColor` on Tag, Badge, Alert and Switch. Set it once on `DiyaProvider`.
- Table: `renderExpanded`, `onArchive`, `archiveLabel`, `onInspect` and
  `inspectLabel`. Use `bulkActions` for actions on selected rows (each also
  appears in a row's own menu) and `onRowOpen` (with `openLabel`) to open a
  row's details.
- Table: the `filters` and `actions` switches. The filter menus show when
  `filterOptions` has entries, and the row menu shows when `rowActions`,
  `bulkActions` or `onRowOpen` is given.
- Choice: `descriptions`. An option's `description` shows whenever it has one.

**Defaults**

- `DiyaProvider`: `theme` is `'system'` and the provider paints its surface.
  DIYA's own accent is a neutral ink: `#262626` with `#FAFAFA` text in Light,
  `#E8E8E8` with `#1C1C1C` text in Dark. The grays are neutral in both themes.
- Switch is a native checkbox with `role="switch"`; its ref is the input.
- Search is `rounded` by default, like the other fields.
- `--diya-text-caption` is 14px (was 13px), so small print reads more easily.
- Table: row checkboxes are opt-in. They show when you pass `bulkActions`,
  `onSelectionChange` or `selectedIds`, or set `selectable`. The search field
  shows when `searchText` is given. Tables show 10 rows a page
  (`defaultPageSize`, `pageSizeOptions`).
- Progress with no `value` is indeterminate.
- FileUpload: `multiple` defaults to `false`.
- Slider shows its label; `hideLabel` hides it visually.
- TextInput, TextArea, Select and Search put `className` and `style` on the
  outer field wrapper; every other attribute goes on the control.
- A nested `DiyaProvider` inherits `locale` and `messages` from the provider
  around it and overrides only what it sets.

**Tokens**

The `--library-*` custom properties are gone. The public ones were renamed:

| Before | 1.0 |
| --- | --- |
| `--library-text`, `--library-muted` | `--diya-color-text`, `--diya-color-muted` |
| `--library-surface`, `--library-recessed`, `--library-raised` | `--diya-color-surface`, `--diya-color-recessed`, `--diya-color-raised` |
| `--library-line` | `--diya-color-line` |
| `--library-active`, `--library-active-text` | `--diya-color-accent`, `--diya-color-accent-text` |
| `--library-hover`, `--library-selected` | `--diya-color-hover`, `--diya-color-selected` |
| `--library-destructive`, `--library-error` | `--diya-color-destructive`, `--diya-color-error` |
| `--library-glass` | `--diya-color-glass` |
| `--library-depth` | `--diya-shadow-raised` |
| `--diya-scrim` | `--diya-color-scrim` |
| `--library-tag-{status}-tone`, `--library-tag-{status}-surface` | `--diya-color-{status}`, `--diya-color-{status}-surface` |
| `--library-badge-{status}-fill`, `--library-badge-{status}-ink` | `--diya-color-{status}-fill`, `--diya-color-{status}-on-fill` |

New public tokens: `--diya-color-accent-soft` and `--diya-color-accent-ink`
(set by `brandColor`), `--diya-radius-control`, the corner every control
shares, and the spacing scale `--diya-space-1` to `--diya-space-8`.
`--diya-brand` is gone; use `brandColor`.

`{status}` is `success`, `warning`, `error` or `info`; the neutral badge pair
is `--diya-color-neutral-fill` and `--diya-color-neutral-on-fill`. Every other
`--library-*` property is now `--diya-internal-*`, which is private and may
change in any release. The README lists the public tokens.

**Styles**

- `styles.css` is wrapped in the `diya` cascade layer, so your own CSS and
  Tailwind's utilities win over DIYA's rules. DIYA's base styles reach only
  its own elements, never your markup elsewhere in the provider.
- Every class DIYA renders starts with `diya-`; for example,
  `.app-pattern-surface` is `.diya-app-pattern-surface`, `.text-input-sr-only`
  is `.diya-sr-only` and `.atom-description` is `.diya-switch-description`.
  Class names aren't covered by semver.

**api.json**

- Item ids are their first export's name in kebab-case: `link` is
  `text-link`, and `empty-state` is `content-state`. `stack` and `inline` are
  new, with `kind: "layout"`.
- Chatbot and Data Viz (`DataViz`, `Chart`) are `experimental`: outside semver
  until their API settles.
- Charts use DIYA's Vivid palette (bright blue, orange, pink, green, violet,
  teal, indigo, red) with a fine gradient: bars soften toward their base,
  donut segments catch a highlight, and one or two lines glow into the plot.
  Legend dots stay solid, and every chart keeps its data table.

[1.0.0]: https://github.com/idyeah-studio/diya/releases/tag/v1.0.0

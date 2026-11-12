# Changelog

All notable changes to `@idyeah/diya` are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-11-11

On the `next` tag. Becomes 1.1.0 after the preview check.

### Added

- Motion, on by default. Menu, Popover, Tooltip and the Combobox and Date
  Picker popups grow from their trigger. Dialog fades in and settles, Drawer
  slides in from its side, and the dimmed page fades with them. Toast rises
  from its edge; a floating Chatbot opens and closes like a popup, and new
  chat messages rise in. The Tabs indicator slides to the selected tab.
  Accordion sections grow open and shrink closed. Site Header's phone menu
  opens like a popup. Switch's thumb slides and Choice marks grow in. Progress
  eases to each new value. Buttons ease their hover and press, and fields,
  rows, tabs, calendar days and navigation items ease their colors.
  - Focus rings never animate.
  - Input never waits for an animation.
  - Nothing moves on page load, or when hidden content is shown again.
- Button press: a Button shrinks to 0.98 while pressed, and a wide one by at
  most about 2px a side; it lands at once and eases back. Under Reduce Motion
  a pressed Solid or Destructive Button moves toward its label color instead.
- `DiyaProvider` `motion`:
  - `"system"`, the default, animates and follows the device's Reduce Motion
    setting (Reduce Motion on Apple devices, Animation effects on Windows,
    Remove animations on Android);
  - `"reduced"` never slides or scales, only fades; indeterminate Progress
    breathes in place, as it does under the device setting;
  - `"off"` changes everything at once, with 1.0's timing; loading indicators
    still move.

  A nested provider inherits it. There is no `"full"`: DIYA never overrides a
  reader who asked for less motion.
- Every provider renders `data-motion`: its own `motion`, else its parent's,
  else `"system"`. Like `data-theme`, it's covered by semver.
- Public motion tokens, in a new `motion` group:
  - durations `--diya-duration-fast` (120ms), `--diya-duration-medium` (160ms)
    and `--diya-duration-slow` (240ms); exits take two-thirds of their enter;
  - `--diya-duration-scale` (`1`): `0.5` is twice as fast, `0` turns motion off
    from CSS alone, Tooltip's hover wait included;
  - curves `--diya-ease-enter`, `--diya-ease-exit` and `--diya-ease-move`.

  Set them on the provider (its `style`, or `.diya-root`) or above it; on an
  element inside a provider the durations have no effect. An override never
  brings motion back under `motion="off"`.
- `useDiyaAppearance().motion`: `"full"`, `"reduced"` or `"off"`, the motion in
  effect. Under `"system"` it reads `"full"` on the server and follows the
  device's Reduce Motion setting from mount, as `theme` does. The
  `DiyaAppearance` type gains this required field, so a mock typed as
  `DiyaAppearance` needs it.
- `api.json`:
  - token kinds `duration` and `easing`;
  - an optional `since` on props and tokens added after their item or after
    1.0.0 (`DiyaProvider` `motion` and the seven motion tokens say `1.1.0`);
  - each item's `tokens` list names the motion tokens its styles use.

  All of this is additive: `schemaVersion` stays 1.

### Changed

- Closing popups stay on the page briefly while they leave. Menu, Popover,
  Tooltip and the Combobox and Date Picker popups stay up to about 110ms;
  Dialog and Drawer stay up to 160ms (Firefox closes Dialog and Drawer at
  once). While they leave they are inert: no focus, clicks or screen reader.
  `onOpenChange` and the return of focus still happen at once. A close caused
  by scrolling, resizing or the trigger leaving the screen skips the exit.
  Unmounting a Dialog or Drawer instead of setting `open={false}` skips it too.
- Tests:
  - In unit tests, render inside `<DiyaProvider motion="off">`: closing
    popups leave at once and a tooltip shows on hover without its 300ms wait.
    In jsdom and happy-dom, popups already close at once, and
    `fireEvent.mouseEnter` shows a tooltip at once, as in 1.0.
  - In end-to-end tests, closing popups stay up to 160ms with
    `data-exiting="true"`, and Playwright's `getByRole` still finds them. Use
    web-first assertions (`await expect(menu).toBeHidden()`), not
    `isVisible()` or `count()`, or render `motion="off"` in your test build
    (for example `motion={process.env.NEXT_PUBLIC_E2E ? 'off' : undefined}`).
    Playwright's `reducedMotion: 'reduce'` isn't enough, since things still
    fade.
- Tooltip waits for a mouse to rest on its trigger for 300ms before it shows,
  so passing over a toolbar shows nothing. It shows at once on keyboard focus,
  on a tap, when moving from one tooltip to the next (the two swap at once,
  never overlapping), and with `motion="off"` or a duration scale of `0`. A
  mouse click on the trigger no longer shows it by itself. The bubble can
  still be hovered, to read it.
- Toast: `onDismiss` timing is unchanged; it's called at once, as in 1.0. Its
  exit then plays on an inert, unannounced copy, so the host unmounts the toast
  in `onDismiss` and can raise the next one straight away.
- Dialog and Drawer: in Light and Dark the dimmed page behind them is no
  longer blurred, so it can fade without showing the page twice. Glass keeps
  its blur at full strength from the first frame, still and never animated,
  and only its own lighter dim fades. `--diya-color-scrim` goes from
  `#00000088` to `#0000009e` in Light and Dark, to keep the page set back
  without the blur.
- Button: hover moves a Solid or Destructive fill 10% toward its label color,
  so it shows in Light and Dark, and the label stays at full strength. 1.0
  dimmed the whole button with a filter, label included. The hover is a layer
  over the fill, drawn with the Button's `::after`, so a Button whose
  background you set yourself (through `className` or `style`) still changes
  on hover.
- Underline Tabs no longer nudge their neighbors when the selection changes:
  each tab reserves the width of its bold label, so unselected underline tabs
  are slightly wider than in 1.0.
- Table's loading rows pulse gently (opacity 1 to 0.55 and back, 1.4s). The
  pulse keeps running under Reduce Motion and with `motion="off"`, as loading
  indicators do.
- When the provider's theme changes, transitions pause for that frame, so
  controls change with the page. A `theme="system"` change that comes from the
  device can't be paused in Chromium and WebKit.
- With Tailwind v4, its base styles hide `[hidden]` with `!important`, so
  Accordion sections open and close at once unless you add the one
  `@layer base` rule in the README's Tailwind section.
- DOM, which isn't covered by semver, so snapshot tests may change:
  - Tabs adds an `aria-hidden` indicator inside its tab list (none with
    `motion="off"`) and wraps each label in a `diya-tab-label` span. In pill
    Tabs the indicator holds a drawn copy of every tab's icon, label and
    badge, with no text of its own, so text queries still find each label
    once;
  - Accordion wraps each section's content in a `diya-accordion-body`
    element, its chevron is one path that turns, and a closed section keeps
    `hidden` but stays laid out at zero height, invisible and inert;
  - popups carry the class `diya-floating` and `data-side`, and closing ones
    `data-exiting="true"`;
  - the provider carries `data-theme-change` for the frames that paint a new
    theme.

### Package

- The tarball's unpacked budget is now 1,300,000 bytes. 1.1 unpacks to about
  1,274,000 bytes (1.0.1: 1,199,458) and packs to about 495,000. `styles.css`
  grows about 25 KB, 5.5 KB gzipped, and ships readable, with its comments;
  your bundler minifies it.

## [1.0.1] - 2026-11-11

### Fixed

- `Progress`: under Reduce Motion, indeterminate progress no longer freezes as
  a 35% bar or a 28% ring, which read as a stuck amount. It shows a full bar or
  ring that fades gently between faint and clear, so it still reads as working.
  Without Reduce Motion nothing changes. The indeterminate bar's width now comes
  from CSS instead of an inline style, and the rule uses no `!important`, so
  your own styles can still restyle it.
- `Drawer`: the docs no longer say it slides in from the side, which it doesn't
  in 1.0. The description and the `side` prop now say where it sits; `api.json`
  and the type declarations follow.

## [1.0.0] - 2026-11-07

First public release, under the MIT License.

### Added

- 30 React components and 13 patterns. `Chart` and `DataViz` are exported from
  `@idyeah/diya/charts` and render with the optional `echarts` peer dependency;
  everything else is exported from `@idyeah/diya`.
- `DiyaProvider` with Light, Dark and Glass appearances, brand color, font,
  locale and built-in text (`messages`, `defaultMessages`).
- `@idyeah/diya/styles.css`, with public `--diya-*` theme tokens and the DIYA
  Sans font (SIL Open Font License 1.1).
- `@idyeah/diya/api.json`, a machine-readable map of exports, props and tokens.
- api.json names the uncontrolled default (`defaultValue`, Switch `defaultChecked`) for every field that has one: Text Input, Text Area, Select, Combobox, Date Picker, Calendar, Choice, Switch, Slider and Search.
- Support for React 18.3 and React 19, including Next.js App Router: the root
  entry has no `'use client'` directive, so `defaultMessages` and types can be
  imported in Server Components, and each interactive component carries its own
  directive.
- `Prose` sets your own long-form HTML (articles, docs pages, changelogs and
  legal pages) in DIYA's type and rhythm, at three sizes, and leaves DIYA
  components inside it as they are. `CodeBlock` shows code with a Copy button
  that announces its result, and long lines scroll in a region the keyboard
  can reach.
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
- A loading Button keeps focus: it is `aria-disabled="true"` and `aria-busy`
  rather than natively disabled, and ignores clicks, Enter and Space, so a
  focused Save or Send stays focused while it works and still can't submit
  twice. Form's Submit, Dialog's confirm and Wizard's Continue follow.
  `disabled` is still the native attribute.
- Menu and Popover take your own `trigger` element and a controlled `open`
  with `onOpenChange`; Popover content can be a plain node. Dialog takes a
  `trigger`. Tooltip wraps your own trigger, such as an icon-only Button.
- Forms: fields forward refs to their native controls, work uncontrolled
  (`defaultValue`, `defaultChecked`) and reset with their form, and pass native
  `name`, `onChange` and `onBlur` through, so react-hook-form's `register()`
  works without a `Controller`. Combobox and DatePicker take `name`.
- A Choice option's `label` takes a node, not only a string: a consent box
  with real Terms and Privacy Policy links (a link opens without toggling the
  box), or a color swatch beside a color's name.
- Slider takes `formatValue`, such as `(value) => '$' + value`: it formats the
  values and marks it shows and sets each handle's `aria-valuetext`, both
  handles in range mode.
- Slider takes `min`, `max` and `step`. DatePicker takes `min` and `max`, keeps
  one Tab stop in its calendar (arrows, Home/End and PageUp/PageDown move), and
  starts weeks on the locale's first day.
- `Calendar`, the month grid DatePicker opens, kept on the page: for screens
  like booking a time or a day's agenda. It shares DatePicker's code, keyboard,
  `value` and `range` shapes, `min` and `max`, and adds a controlled `month`
  (`YYYY-MM`) with `onMonthChange`. Calendar and DatePicker take
  `isDateUnavailable` to mark days that can't be chosen, such as days with no
  open slots. Both follow the ARIA date grid pattern: a grid named by its
  month, weekday column headers, gridcells with `aria-selected` on chosen days
  and `aria-current="date"` on today. Each day's name includes its weekday
  ("Thursday, November 12, 2026"), and an unavailable day says so in words,
  through the `unavailableDay` message.
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
- `--diya-color-scrim` is set in Light and Dark (`#00000088`), not only under
  Glass, so an overlay or shadow built on it works everywhere. Dialog and
  Drawer share it, so a Drawer dims the page as much as a Dialog.
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
- `Form`, `Card`, `Drawer`, `Dialog`, `Wizard`, `Accordion`, `Table` and
  `Chatbot` style their own parts and your plain elements, never a DIYA
  component placed inside them: an `Alert` in a sign-in `Form` keeps its title
  color and spacing, a `Card` or `Form` in a `Drawer` or `Dialog` keeps its own
  header and footer, and a `Switch` in a `Table` cell stays a switch.
- `List` items take `current`, for the open item (`aria-current="true"` and a
  selected background), and `unread`: a heavier label, a dot at the row's end,
  and "unread" after the label for screen readers (`messages.list.unread`).
- Side Navigation items take `count`, a quiet number after the label. Above 99
  it shows `99+`; collapsed, a dot on the icon stands in for it. The item's
  accessible name keeps the real count, "Inbox, 12"
  (`messages.sideNavigation.count`).
- Side Navigation takes `footer`, for an account or workspace Menu pinned to
  the bottom of a full-height navigation, and `collapsedFooter` for the rail
  (it defaults to `footer`), following `brand` and `collapsedBrand`. A Menu,
  Avatar or Button in either slot keeps its own look.
- A `layout="full-page"` Chatbot fills its container's height: the header and
  composer stay put and the thread scrolls between them, following the latest
  message. A height set on any Chatbot is filled the same way; without one,
  the thread keeps its 280px (380px full-page).
- Chatbot `showHeader={false}` hides its header for a screen that has its own
  heading; `title` still names the chat region and its message log.
- A streaming Chatbot reply replaces "Preparing a response…": the line shows
  only until the reply's first words arrive. The reply gets its Copy button
  once it is complete or stopped.
- A person's Chatbot message is as wide as its text, up to 90% of the thread,
  in every layout.
- A tall Chatbot `welcome` stays at its top on a short screen; the thread
  follows the conversation from the first message. `diya-chat-welcome-title`
  styles the welcome's heading at any level, as a plain `h3` is styled.
- `npm create diya@latest` (the `create-diya` package, released with this one
  on the same version) starts a Next.js or Vite app with the provider, styles
  and agent notes in place, from Minimal or from Oriel, a four-screen
  invoicing app.
- [Oriel](https://oriel.diya13.ai), a demo app made only from DIYA, in
  `examples/oriel`.
- `bench/`: the bundle-size measurement, rerunnable with
  `node bench/measure.mjs`. One Button with `DiyaProvider` adds 2.3 KB of
  gzipped JavaScript to a Vite build.
- Charts use DIYA's Vivid palette (bright blue, orange, pink, green, violet,
  teal, indigo, red) with a fine gradient: bars soften toward their base,
  donut segments catch a highlight, and one or two lines glow into the plot.
  Legend dots stay solid, and every chart keeps its data table.

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
| Button | `shape: 'rectangle'` | `shape: 'rounded'`; the default is now `'pill'` |
| ContentState | `role: 'status' \| 'alert'` | `urgent` (`true` announces it as an alert) |
| Badge | `type` | `variant` (`'count' \| 'dot'`) |
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
  `#E8E8E8` with `#1C1C1C` text in Dark. The grays keep a slight cool cast in
  both themes.
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

[1.1.0]: https://github.com/idyeah-studio/diya/releases/tag/v1.1.0
[1.0.1]: https://github.com/idyeah-studio/diya/releases/tag/v1.0.1
[1.0.0]: https://github.com/idyeah-studio/diya/releases/tag/v1.0.0

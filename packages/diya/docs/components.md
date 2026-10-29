# Component guide

Import these from `@idyeah/diya`. Import `@idyeah/diya/styles.css` once and
render them inside `DiyaProvider`. Everything below is an ordinary React prop,
and your editor shows the full types. To see each component working, open it
in the [catalog](https://diya13.ai/explore?area=components).

```tsx
import { Button, DiyaProvider, TextInput } from '@idyeah/diya'
import '@idyeah/diya/styles.css'
```

Every component takes `className`, `style` and the other attributes of its
root element, and forwards its ref: to the native control on fields (the
`input`, `textarea` or `select`; the checkbox on Switch), to the trigger
button on Menu, Popover and Tooltip, and to the root element everywhere else.

## Layout

| Component | Start with | Useful options |
| --- | --- | --- |
| Stack | children | A column. `gap` (a step from `0` to `8`, or any CSS length; default `4`, 16px), `align`, `justify`, `wrap`, `as`. |
| Inline | children | A row that wraps. `gap` (default `2`, 8px), `align` (default `center`), `justify`, `wrap` (default on), `as`. |

## Inputs

| Component | Start with | Useful options |
| --- | --- | --- |
| Button | `onClick`, children | `variant`: solid/outline/quiet/destructive; `shape`: pill (default)/rounded; `size`; `loading`; `disabled`. `href` renders a link that looks like a Button, through the provider's `linkComponent`; `asChild` styles your own element, such as a router `Link`. |
| TextInput | `label`, `value`, `onValueChange` | `size`, `helperText`, `error`, `leadingIcon`, `clearable`, native input attributes. |
| TextArea | `label`, `value`, `onValueChange` | `size`, `rows`, `maxLength`, `showCount`, `resizable`, `error`. |
| Select | `label`, `options`, `value`, `onValueChange` | Native select keyboard behavior; `size`, `placeholder`, `helperText`, `error`, `disabled`. The native `onChange(event)` still works. |
| DatePicker | `label`, `value`, `onValueChange` | One ISO date (`YYYY-MM-DD`, `''` for none); `range` uses `{start,end}` (`DateRange`). `size`, `error`, `disabled`. `label` is required. |
| Combobox | `label`, `options`, `value`, `onValueChange` | One value as a string (`''` for none); `multiple` uses a string array. `size`, `helperText`, `error`, `disabled`. |
| Choice | `label`, `options`, `value`, `onValueChange` | Radios with a string by default; `multiple` gives checkboxes and a string array, and allows `selectAll`. An option's `description` shows whenever it has one; options can be `disabled`. `helperText`, `error`. |
| Switch | `label`, `checked`, `onCheckedChange` | A native checkbox with `role="switch"`; the ref is the `HTMLInputElement`. `defaultChecked`, `name`, `value` (sent while on), `size`, `helperText`, `error`, `hideLabel`, `disabled`. It uses the brand color when on. |
| Slider | `label`, `value`, `onValueChange` | One number by default; `range` uses `[start, end]`. `min` (default 0), `max` (default 100), `step` (default 1), `showValues` (default on), `showMarks`, `hideLabel`, `disabled`. |
| Search | `label`, `value`, `onValueChange` | Rounded by default, like the other fields; `shape="pill"`, `clearable`, `size`; normal input attributes. |

A controlled value updates only when your callback updates your React state.
Every field reports changes through `onValueChange`, Select included (Switch
uses `onCheckedChange`). Leave `value` out and pass `defaultValue` (or
`defaultChecked`) to let the field keep its own state; a form reset puts it
back. Native `name`, `onChange` and `onBlur` reach the control too, so
react-hook-form's `register()` works on TextInput, TextArea, Select, Switch,
Choice and Slider (Slider with `valueAsNumber: true`). Combobox and DatePicker
take `name` for plain forms and need a `Controller` with react-hook-form.

```tsx
const [plan, setPlan] = useState('')
<Select label="Plan" options={plans} value={plan} onValueChange={setPlan} />
```

On TextInput, TextArea, Select and Search, `className` and `style` go on the
field's outer wrapper, so `style={{ maxWidth: 320 }}` sizes the label, control
and helper text together. Every other attribute, such as `name`, `required`,
`autoComplete` or `data-*`, goes on the input itself.

Slider shows its label above the track; `hideLabel` hides it visually and the
inputs keep their accessible names.

### One value or several

Combobox, Choice, Slider and DatePicker take a value shaped like their mode.
By default they hold one value; `multiple` switches to a list and `range` to a
start/end pair.

```tsx
const options = [
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
]

const [team, setTeam] = useState('')            // '' means none
<Combobox label="Team" options={options} value={team} onValueChange={setTeam} />

const [teams, setTeams] = useState<string[]>([])
<Combobox label="Teams" multiple options={options} value={teams} onValueChange={setTeams} />
```

| Component | Default | With `multiple` / `range` |
| --- | --- | --- |
| Combobox | `value: string` | `multiple`: `value: string[]` |
| Choice | `value: string` (radios) | `multiple`: `value: string[]` (checkboxes) |
| Slider | `value: number` | `range`: `value: [number, number]` |
| DatePicker | `value: string` (ISO date) | `range`: `value: DateRange` (`{ start, end }`) |

```tsx
import { DatePicker, type DateRange } from '@idyeah/diya'

const [due, setDue] = useState('')              // '2026-10-14' once chosen
<DatePicker label="Due date" value={due} onValueChange={setDue} />

const [period, setPeriod] = useState<DateRange>({ start: '', end: '' })
<DatePicker label="Reporting period" range value={period} onValueChange={setPeriod} />
```

To switch modes at runtime, render two elements, each with its own state:
`{multiple ? <Combobox multiple value={list} … /> : <Combobox value={one} … />}`.
Or keep one element and spread the mode's props, with `as const` so
TypeScript sees which mode each branch is:

```tsx
const mode = many
  ? ({ multiple: true, value: list, onValueChange: setList } as const)
  : ({ multiple: false, value: one, onValueChange: setOne } as const)
<Combobox label="Teams" options={options} {...mode} />
```

**Wrapping a field.** Each mode has its own exported type:
`ComboboxSingleProps`/`ComboboxMultipleProps`, `ChoiceSingleProps`/
`ChoiceMultipleProps`, `SliderSingleProps`/`SliderRangeProps` and
`DatePickerSingleProps`/`DatePickerRangeProps`. Build a wrapper on the one you
need. `Omit` on the combined `ComboboxProps` loses the link between `multiple`
and `value`.

```tsx
import { Combobox, type ComboboxSingleProps } from '@idyeah/diya'

// A team picker that is always small.
export function TeamPicker(props: Omit<ComboboxSingleProps, 'size'>) {
  return <Combobox {...props} size="small" />
}
```

Combobox supports typing, enabled-option arrow navigation, Enter selection,
Escape dismissal and multiple-selection removal. Date Picker supports
calendar keyboard navigation and Escape: the month grid is one Tab stop, and
arrows, Home/End and PageUp/PageDown move within it. Weeks start on the
locale's first day, and `min` and `max` disable (and announce) the days
outside them. Popups preserve the provider's
appearance and stay within an open dialog's focus boundary.

Keep form field sizes consistent: use the same `size` (for example
`size="medium"`) on every field. Helper text and multiline fields naturally add
height below the control.

## Navigation

| Component | Start with | Behavior/options |
| --- | --- | --- |
| TextLink | `href`, children | Native link semantics; `leadingIcon`, `trailingIcon`, `inline`; `asChild` styles your own element, such as a router `Link`. Needs no provider. |
| Pagination | `page`, `total`, `pageSize`, `onPageChange` | `onPageSizeChange`, `pageSizeOptions` (default `[10, 25, 50]`), `showCount`, `showNumbers`; pages are 1-based. |
| Tabs | `label`, `items`, `value`, `onValueChange` | `variant`: underline/pill; `size`; item icon/badge/disabled/content. Arrows, Home/End and roving focus. |
| Breadcrumbs | `items: {label,href}[]` | Items are links through the provider's `linkComponent`. `showHomeIcon`, `collapsed`; `onNavigate` takes over plain clicks. |
| Menu | `label`, `items: {id,label,onSelect}[]` | Item icons, disabled/destructive, checkbox/radio checked state, separators. An item with `href` is a real link (`current` marks this page). `trigger` takes your own element; `triggerIcon` gives an icon-only trigger; `open` with `onOpenChange` controls it. |

Give Tabs unique values and Breadcrumbs real destinations. For Menu checkbox
or radio items, the caller updates `checked` after `onSelect`. Escape restores
trigger focus; Tab leaves according to the trigger's document position.

## Content and feedback

| Component | Start with | Behavior/options |
| --- | --- | --- |
| Tag | `label`, children | `tone`: neutral/brand/success/warning/error/info; `leading="dot"`, `size`, optional `onRemove`. |
| Metric | `value`, optional `label` | `unit`, `size`, `change` with direction/meaning/comparison; a positive or negative change shows as a tinted chip. Figures are tabular. Values are display strings. |
| Rating | `value` | Read-only stars from 0 to `max` (default 5). `count` shows the number of reviews after the stars, as `(128)`; `showValue` shows the rating as a number before them, as `4.3`; `size`. |
| Avatar | `name` | `src`, `size`, `shape`, `status`; initials fallback if the image fails. |
| List | `label`, `items` | `divided`, `size`; items can have description, leading/trailing content, `onSelect`, disabled. For an inbox, `current` marks the open item (`aria-current="true"` and a selected background) and `unread` gives a heavier label, a dot at the row's end, and "unread" after the label for screen readers. |
| Accordion | `items: {id,label,content}[]` | `multiple`, `divided`, `disabled`; expansion is managed internally. |
| Badge | `label` | `variant`: indicator/count; `tone`, `size`, `count`, `max` (default 99, shows `99+`), `showZero`. |
| Alert | `title`, children | `layout`: card/banner; `tone`: info/success/warning/error/brand; optional action and `onDismiss`; `urgent` for urgent announcements. |
| Progress | `label`, optional `value` | `variant`: linear/circular; `showValue` (default on). Value is 0–100. Without a `value` it is indeterminate: working, amount unknown. `indeterminate` forces that state. |
| Tooltip | `content`, your trigger as the child | Wraps one element, such as `<Button iconOnly aria-label="Delete">`, and wires hover, focus and its description. Or give `label` and noninteractive children for a built-in trigger. `placement`; closes with Escape. |
| Popover | `label`, children | Plain content, or `close => content` to close it from your own controls. `trigger` takes your own element; `open` with `onOpenChange` controls it. `placement`, `disabled`. |

Rating shows a rating; it doesn't collect one. Its stars fill to the nearest
half, so 4.3 shows four and a half stars, while the number (`showValue`) and
the accessible name keep one decimal. Values outside 0 to `max` are clamped,
and one that isn't a number shows as 0. Screen readers hear one phrase, such
as "Rated 4.3 out of 5, 128 reviews"; the `rating` messages change its words,
and the provider's `locale` formats its numbers. The stars are neutral, in the
text color. To ask people for a rating, as in a survey, use Choice with 1 to 5
as its options.

```tsx
<Rating value={4.3} count={128} showValue />
```

Tag, Badge, Alert and Toast share one `Tone` type:
`'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'info'`. Alert and
Toast take `AlertTone`, which is every tone except `neutral`.

`Toast` is the floating companion to Alert. Pass `onDismiss` and optionally
`duration` (milliseconds); `duration={0}` leaves dismissal to the user, and
`showClose={false}` hides the close button on a toast without an action. It
pauses automatic dismissal during hover/focus. Avoid putting critical,
time-sensitive instructions only in a toast.

**Composition limits:** List uses a button for selectable rows, so that row's
leading/trailing slots must be noninteractive. Use separate controls outside
the row when needed.

**Health colors:** use status colors consistently for meaning, and brand for
identity. Set meaningful accessible labels on dots/counts; a color alone does
not communicate status. Icon-only buttons need their own `aria-label`.

## How props are named

- A feature is a noun: either a switch (`legend`, `grid` and `tooltip` on
  charts) or the data it needs (`searchText` and `filterOptions` on tables).
- A built-in part you can show or hide is `show*` (`showClose`, `showValue`,
  `showMarks`, `showTimestamps`). `hideLabel` hides a field's label visually
  and keeps its accessible name.
- A behavior or state of the whole component is an adjective (`clearable`,
  `selectable`, `resizable`, `divided`, `collapsed`).
- `variant` picks a form, `tone` a status color, and `size` is `small`,
  `medium` or `large`.
- A value and its callback come as a pair: `value` with `onValueChange`, or
  `checked` with `onCheckedChange` on Switch.

## Good habits

- **Buttons in forms:** Button defaults to `type="button"`. Choose
  `type="submit"` explicitly in a form.
- **Loading and disabled:** set these while a real operation runs, and clear
  loading on both success and failure. Keep a field's `error` text actionable.
- **Icons:** any React icon can go in an icon slot. Give icon-only buttons an
  `aria-label`, and hide decorative SVGs from assistive technology.
- **Slots:** omitted Page Header and Card slots collapse. Put real controls in
  actions and plain content in labels.
- **Navigation:** use real links for destinations. A callback doesn't save,
  navigate, upload or generate a reply unless you connect that operation.
- **Glass:** place it over a quiet backdrop. Over a flat background it looks
  solid. Keep contrast and focus styles intact.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Controls look plain | Import `@idyeah/diya/styles.css` once and render inside `DiyaProvider`. |
| Your CSS reset flattens DIYA's buttons | DIYA's styles are in the `diya` cascade layer, so an unlayered reset wins. Put your reset in a layer before it: `@layer reset, diya;`. |
| Tailwind classes don't apply | Declare `@layer theme, base, diya, components, utilities;` before importing Tailwind and DIYA. |
| A field or tab doesn't update | Pass its value and update it in the callback. |
| A table has no checkboxes or search | Pass `bulkActions` or `onSelectionChange` for checkboxes, and `searchText` for search. |
| A string is still in English | Check the component and key against `defaultMessages`. |
| `@idyeah/diya/charts` can't find its renderer | Install `echarts` (version 6.1 or later). |
| A chart is blank | Supply matching `categories` and `series`, or positive `pie`/`donut`/`treemap` data, and give its container a width. |
| The font hasn't changed | DIYA Sans loads from `dist/fonts` beside `styles.css`; your bundler copies it. For another font, load it yourself and check the family name in `fontFamily`. |
| Glass looks solid | Check the backdrop behind it, browser support and the reader's transparency setting. |
| A button stays disabled | Clear `loading` on success and on failure. |
| An event handler errors in Next.js | Functions can't be passed from a Server Component. Move the component into a file that starts with `'use client'`. |

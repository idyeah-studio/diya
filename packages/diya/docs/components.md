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
`input`, `textarea` or `select`; the checkbox on Switch and Checkbox), to the
trigger button on Menu, Popover and Tooltip, and to the root element
everywhere else. Field's ref is its outer wrapper; your control keeps its own.

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
| Calendar | `label`, `value`, `onValueChange` | DatePicker's month grid, always on the page. The same values and `range`; `min`, `max`, `isDateUnavailable`, `size`, `disabled`, `hideLabel`. `month` (`YYYY-MM`) with `onMonthChange` controls the month on show. |
| Combobox | `label`, `options`, `value`, `onValueChange` | One value as a string (`''` for none); `multiple` uses a string array. `size`, `helperText`, `error`, `disabled`. |
| Choice | `label`, `options`, `value`, `onValueChange` | Radios with a string by default; `multiple` gives checkboxes and a string array, and allows `selectAll`. An option's `label` can be a node, such as text with `TextLink`s or a color swatch; its `description` shows whenever it has one; options can be `disabled`. `helperText`, `error`. A lone yes or no? Checkbox. |
| Checkbox | `label`, `checked`, `onCheckedChange` | A lone yes or no, sent with a form. The ref is the `HTMLInputElement`. `defaultChecked`, `name`, `value` (sent while checked), `indeterminate` (a dash, announced as mixed), `size`, `helperText`, `error`, `hideLabel`, `disabled`. Its `label` can hold `TextLink`s. Enter submits the form. |
| Switch | `label`, `checked`, `onCheckedChange` | A native checkbox with `role="switch"`; the ref is the `HTMLInputElement`. `defaultChecked`, `name`, `value` (sent while on), `size`, `helperText`, `error`, `hideLabel`, `disabled`. It uses the brand color when on. |
| Slider | `label`, `value`, `onValueChange` | One number by default; `range` uses `[start, end]`. `min` (default 0), `max` (default 100), `step` (default 1), `showValues` (default on), `showMarks`, `formatValue`, `hideLabel`, `disabled`. |
| Search | `label`, `value`, `onValueChange` | Rounded by default, like the other fields; `shape="pill"`, `clearable`, `size`; normal input attributes. |
| Field | `label`, one control as its child | A label, helper text and error around a control DIYA doesn't make. `helperText`, `error`, `required`, `disabled`, `hideLabel`, `id`. `framed` draws DIYA's field box around a control that has none; `size` sets the frame's height. A function child gets the ids and states (`FieldControlProps`). |

Switch acts now. Checkbox is a yes or no you send with a form. Choice picks
from a list.

A controlled value updates only when your callback updates your React state.
Every field reports changes through `onValueChange`, Select included (Switch
and Checkbox use `onCheckedChange`). Leave `value` out and pass
`defaultValue` (or `defaultChecked`) to let the field keep its own state; a
form reset puts it back. Native `name`, `onChange` and `onBlur` reach the
control too, so react-hook-form's `register()` works on TextInput, TextArea,
Select, Switch, Checkbox, Choice and Slider (Slider with
`valueAsNumber: true`; Checkbox gives `true` or `false`, or with a `value`,
that value or `false`). Combobox and
DatePicker take `name` for plain forms and need a `Controller` with
react-hook-form.

Show errors on submit, or on leaving a field you typed in; never while
typing. DIYA's fields read an error that appears when you leave them once,
politely ("Email: Enter a valid email"). On submit, only the field that gets
focus reads its error.

```tsx
const [plan, setPlan] = useState('')
<Select label="Plan" options={plans} value={plan} onValueChange={setPlan} />
```

On TextInput, TextArea, Select and Search, `className` and `style` go on the
field's outer wrapper, so `style={{ maxWidth: 320 }}` sizes the label, control
and helper text together. Every other attribute, such as `name`, `required`,
`autoComplete` or `data-*`, goes on the input itself.

Slider shows its label above the track; `hideLabel` hides it visually and the
inputs keep their accessible names. `formatValue`, such as
`(value) => '$' + value`, formats the numbers it shows (values and marks) and
sets each handle's `aria-valuetext`, so screen readers hear "$40", not "40".

A Checkbox's `label` can be a node as well as a string. For a consent box,
put `TextLink inline` in it, with real links. Write the label as a statement
in the reader's voice, never a question. A link opens without toggling the
box, Space still toggles it, and the links are their own Tab stops.

```tsx
<Checkbox
  name="terms"
  required
  label={<>I agree to the <TextLink inline href="/terms">Terms</TextLink> and the <TextLink inline href="/privacy">Privacy Policy</TextLink></>}
  error={termsError}
/>
```

Don't use Choice with one option for this: it announces a group and returns
an array. `indeterminate` shows a dash for "some chosen", on a box that
chooses all of a list of your own.

A Choice option's `label` can be a node as well as a string, such as text with
`TextLink`s or a color swatch. The option is named by the label's text, so
mark a color swatch `aria-hidden` and keep the color's name in words.

**Field.** If DIYA makes the control, use its own `label`, `helperText` and
`error`. Wrap anything else in Field: your own input, a native one DIYA
doesn't wrap (such as `type="time"` or `type="color"`), or a third-party
control. Field links the label, helper text and error to it for screen
readers. A group of controls under one question isn't a Field; give each
control its own.

```tsx
// A native input DIYA doesn't wrap.
<Field label="Start time" helperText="Your local time" error={startError}>
  <input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
</Field>

// A third-party control that takes the ids somewhere else.
<Field label="Color" error={colorError}>
  {(control) => <ColorPicker inputProps={control} />}
</Field>

// A payment provider's card iframe.
<Field label="Card number" framed error={cardError}>
  <div ref={cardMount} />
</Field>
```

`framed` draws DIYA's field box (fill, edge, corner, height and focus ring)
around a control that has none. Use it for a hosted card field. It keeps a
child iframe readable in Dark. A hosted iframe can't be linked to Field's
error, since ids don't cross frames, so Field says the error as focus
arrives there, and a label click moves focus into the iframe. If your
provider needs its own `focus()` to reach its input, call it from the label's
`onClick`. Pass the same label to the provider's own label option too.

In development, Field warns when it wraps one of DIYA's own fields, since
screen readers would hear two labels.

### One value or several

Combobox, Choice, Slider, DatePicker and Calendar take a value shaped like their mode.
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
| Calendar | `value: string` (ISO date) | `range`: `value: DateRange` (`{ start, end }`) |

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
`ChoiceMultipleProps`, `SliderSingleProps`/`SliderRangeProps`,
`DatePickerSingleProps`/`DatePickerRangeProps` and
`CalendarSingleProps`/`CalendarRangeProps`. Build a wrapper on the one you
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
outside them. `isDateUnavailable` marks any other day the same way: it is
announced and can't be chosen, and the arrows still move through it. The month
follows the ARIA date grid pattern: a `grid` named by the month, weekday column
headers with full names, a row per week, and each day a `gridcell` with
`aria-selected` when chosen (every day of a chosen range) and
`aria-current="date"` on today. Each day's name includes its weekday in the
provider's locale ("Thursday, November 12, 2026" in `en-US`), and an
unavailable day says so in words ("…, unavailable") as well as through
`aria-disabled`; the `unavailableDay` message in `calendar` and `datePicker`
changes that wording. Popups
preserve the provider's appearance and stay within an open dialog's focus
boundary.

Calendar is the same month grid, kept on the page, with the same keyboard: the
month buttons, then one day as a Tab stop. Use it where picking the day is the
screen's main job, such as booking a time. It has no surface of its own, so it
sits on a Card or straight on the page, and its days are as tall as a field of
the same `size`.

```tsx
import { Calendar } from '@idyeah/diya'

const [day, setDay] = useState('')
const [month, setMonth] = useState('2026-11')  // load that month's open slots
<Calendar
  label="Pick a day"
  value={day}
  onValueChange={setDay}
  month={month}
  onMonthChange={setMonth}
  min={today}
  isDateUnavailable={(date) => !openDays.has(date)}
/>
```

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
| Badge | `label` | `variant`: count/dot; `tone`, `size`, `count`, `max` (default 99, shows `99+`), `showZero`. |
| Alert | `title`, children | `layout`: card/banner; `tone`: info/success/warning/error/brand; optional action and `onDismiss`; `urgent` for urgent announcements. |
| Progress | `label`, optional `value` | `variant`: linear/circular; `showValue` (default on). Value is 0–100. Without a `value` it is indeterminate: working, amount unknown. `indeterminate` forces that state. |
| Spinner | `label` | A small ring in the text color for one busy part of a page. `size`: small/medium (default)/large, 16, 20 or 24px. `showLabel` shows the label beside it. It waits 400ms before it shows, so a quick load shows nothing. |
| Tooltip | `content`, your trigger as the child | Wraps one element, such as `<Button iconOnly aria-label="Delete">`, and wires hover, focus and its description. Or give `label` and noninteractive children for a built-in trigger. `placement`; closes with Escape. A mouse rests 300ms before it shows; keyboard focus, a tap and `motion="off"` show it at once. |
| Popover | `label`, children | Plain content, or `close => content` to close it from your own controls. `trigger` takes your own element; `open` with `onOpenChange` controls it. `placement`, `disabled`. |
| Prose | children | Your own HTML in DIYA's type: headings, paragraphs, links, lists, quotes, code, tables and images. `size`: small (15px, inside an app)/medium (default, 17px, articles and docs)/large (20px, long reads). Renders a `div`. Needs no provider context. |
| CodeBlock | `code` | `label` names it, such as `'TypeScript'` or `'app/page.tsx'`. Copy writes to the clipboard and announces the result; long lines scroll sideways in a region the keyboard can reach. No syntax colors. |

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

**Which "working" to use.** Ask these in order and stop at the first yes:

1. A button started it: Button `loading`. A confirm in a Dialog: Dialog
   `loading`, or a Promise from `onConfirm`.
2. You know how far along: Progress with a `value`.
3. You know the layout: show its shape with placeholders.
4. The whole view waits: circular Progress, large, with words.
5. One small part is busy: Spinner, beside words when the wait is more than a
   moment.

Never put your own Spinner inside a Button, and never use a Spinner for a
whole page. After a few seconds, words beat motion: "Still checking. This can
take a minute." A Spinner's `label` is read once, politely, when it appears.
When the work is done, say the result ("3 older invoices loaded") or move
focus to the first new item.

```tsx
<Spinner size="small" label="Loading older invoices" showLabel />
```

**VisuallyHidden** adds words to what's on screen: "12" can be read as
"12 unread messages". `aria-label` names a control that has no text. Never put
anything focusable inside it. It's a utility, renders a `span`, and works
without a provider.

```tsx
<span>12<VisuallyHidden> unread messages</VisuallyHidden></span>
```

Tag, Badge, Alert and Toast share one `Tone` type:
`'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'info'`. Alert and
Toast take `AlertTone`, which is every tone except `neutral`.

**Toasts.** Show a toast with `toast()` from any client code, such as an
event handler. Don't keep toast state yourself.

```tsx
import { toast } from '@idyeah/diya'

toast({ tone: 'success', title: 'Draft saved', description: 'Everyone on the project can see it.' })
toast({ title: '3 emails archived', action: { label: 'Undo', onClick: restore } })
```

`title` says what happened, with the real name, and names the close button
("Dismiss: Draft saved"). `duration` is in milliseconds (8000 by default;
`0` keeps it until closed). A toast with an `action` never times out. A later
call with the same `id` updates that toast in place. `toast.dismiss(id)`
closes one, and `toast.dismiss()` closes every toast `toast()` showed. Pointing at or focusing any
toast pauses them all.

There's one stack per page, in the outermost provider's corner: at most 3
toasts, or 2 under 600px wide. F8 moves focus to the newest toast, and Escape
closes the focused one. Inside an open Dialog or Drawer, toasts show inside
it. Avoid putting critical, time-sensitive instructions only in a toast.

`<Toast>` is for a toast whose life is tied to a component's state. Render it
while the state holds and pass `onDismiss`; it closes when you stop rendering
it, and `toast.dismiss()` leaves it alone. `showClose={false}` hides the close
button on a toast without an action. It joins the page's one stack and keeps
its own provider's look.

**Long-form content:** wrap articles, docs pages, changelog entries and legal
pages in `Prose`. It styles the plain elements inside it and only spaces any
DIYA component you place there, such as a `CodeBlock` or a `Card`, so those
keep their own look. It renders a `div`, so put it inside your own `article`
or `main`. HTML you render yourself, from Markdown for example, goes in through
`dangerouslySetInnerHTML`. Prose never runs sideways on a phone: long words and
links wrap, a plain `pre` wraps its lines, and table cells wrap. To let a wide
table scroll instead, wrap it in an element with `role="region"`, an
`aria-label` and `tabIndex={0}`. For code people copy, use `CodeBlock`; with
MDX, map `pre` to it.

```tsx
<article>
  <Prose>
    <h1>Release notes</h1>
    <p>Two new components for long-form content.</p>
    <CodeBlock label="Shell" code="npm install @idyeah/diya" />
  </Prose>
</article>
```

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
  `selectable`, `resizable`, `divided`, `collapsed`, `framed`).
- `variant` picks a form, `tone` a status color, and `size` is `small`,
  `medium` or `large`.
- A value and its callback come as a pair: `value` with `onValueChange`, or
  `checked` with `onCheckedChange` on Switch and Checkbox.

## Good habits

- **Buttons in forms:** Button defaults to `type="button"`. Choose
  `type="submit"` explicitly in a form.
- **Loading and disabled:** set these while a real operation runs, and clear
  loading on both success and failure. Keep a field's `error` text actionable.
  A loading Button keeps focus and is inert (`aria-disabled="true"` and
  `aria-busy`; clicks, Enter and Space do nothing, so it can't submit twice),
  so a focused Save or Send doesn't drop focus while it works. After 400ms a
  small spinner takes the place of the icon before the label, or else of the
  label, and the button keeps its exact size. It looks busy, not disabled,
  unless it's disabled too. An icon is a first child that renders a single
  `<svg>`, from any icon library or your own; an `<img>`, an icon font or a
  wrapped icon counts as label.
  Space the icon with the Button's `gap`, not a margin. With `href`, a loading
  Button stays a focusable link whose clicks do nothing. If the label holds an
  element, pass `loading` from the start (`loading={false}`). In tests, find
  it by role: `getByRole('button', { name: 'Save', busy: true })`. `disabled`
  sets the native attribute and takes the button out of the tab order.
  `aria-disabled` on a Button makes it unavailable but focusable, with `href`
  and `asChild` too: it looks unavailable, and clicks, Enter and Space do
  nothing. In DIYA's own colors its focus ring keeps full strength. A Button
  with your own classes or inline colors dims as a whole, ring included, so
  it never looks available while it has focus. Use it when focus may
  be on the button as it becomes unavailable, such as a Cancel while its form
  saves.
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
| A button stays disabled or busy | Clear `loading` on success and on failure. |
| A Spinner never shows in a test | It waits 400ms before it shows. Use `findBy…`, or advance fake timers. |
| A popup from another library can't be clicked in a Dialog | Pass `useDiyaPortalContainer()` as the library's portal container. Inside a Dialog or Drawer it returns the modal. |
| A toast shows in the wrong theme | Toasts show in the outermost provider, in its theme. A widget's own provider that mounts before your app's shows every toast; mount your app's provider first. |
| `toast()` does nothing | No `DiyaProvider` is mounted yet (the toast waits for one), or it ran on the server. Call it in the client. |
| A text query finds a toast or field error twice | A fresh toast or field error is also in a live region for a few seconds. Query inside the form or the stack with `within()`, or use exact text. In Playwright, pass `{ exact: true }` to `getByText`: a plain string matches substrings. |
| An event handler errors in Next.js | Functions can't be passed from a Server Component. Move the component into a file that starts with `'use client'`. |
| A menu or popover is still in the page right after closing | It's leaving, for about 110ms (a dialog or drawer, 160ms). Wait for it to go, use web-first assertions, or render tests with `motion="off"`. |
| Screenshots catch a half-open popup | Render with `motion="off"`; the device's Reduce Motion setting still fades. |
| Accordion sections open at once with Tailwind | Tailwind's base styles hide `[hidden]` with `!important`; add the `@layer base` rule from the README's Tailwind section. |

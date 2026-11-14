# Changelog

All notable changes to `@idyeah/diya` are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - Unreleased

Not released yet. This entry describes what 1.2.0 will ship.

### Added

- `toast()`: show a toast from any client code, with no state of your own.
  Call it in an event handler or your data code, such as
  `toast({ tone: 'success', title: 'Draft saved' })`. It returns the toast's
  id.
  - Options: `title` (required), `description`, `tone` (`'info'` by
    default), `action`, `duration` (8000ms by default; `0` keeps it until
    closed), `urgent` and `id`.
  - Every toast has a close button named for it.
  - A toast with an `action` never times out and is never pushed out to make
    room.
  - Call again with the same `id` to update a toast in place, such as
    "Saving…" then "Saved". It restarts its time.
  - `toast.dismiss(id)` closes one toast. `toast.dismiss()` closes every
    toast `toast()` showed, shown and waiting. A `<Toast>` closes when you
    stop rendering it.
  - Ids that `toast()` makes look like `diya-toast-1`. Ids that start with
    `diya-` are DIYA's, so don't use that prefix for your own.
  - It shows in the first-mounted outermost `DiyaProvider`, in that provider's
    theme. With no provider mounted yet, it waits and shows when one mounts.
    On the server it does nothing.
  - Types: `ToastOptions`.
- One stack of toasts per page. Toasts sit in one column in the corner,
  newest nearest the corner and 12px apart. At most 3 show, or 2 on screens
  under 600px wide. A new toast always shows: the oldest toast without an
  action leaves early to make room. If every shown toast has an action, the
  new one waits and appears when one goes.
- Toasts and the keyboard:
  - F8 moves focus to the newest toast's first button. While a toast shows,
    F8 is handled at the document level, unless your app already handled it
    (`defaultPrevented`).
  - Toasts sit after your app in the page's Tab order, oldest first.
  - After F8, Tab goes from the newest toast to the oldest, then back to where
    you pressed F8. Shift+Tab goes the other way. Once focus is back, or
    leaves the toasts, Tab follows the page again.
  - Escape on a toast, or running its action, closes it and returns focus:
    to where you pressed F8; else, for a `<Toast>`, to where focus was when it
    appeared; else to the last place you were outside the toasts. Never to
    the page's body.
  - A close button moves focus to the toast beside it.
  - Toasts never take focus on their own.
- `Field`: a label, helper text and error around a control DIYA doesn't make,
  such as your own input, a native one DIYA doesn't wrap (`type="time"`), or a
  third-party control. Pass one element, or a function that receives the ids
  and states (`FieldControlProps`).
  - `framed` draws DIYA's field box around a control that has none, such as a
    payment provider's card iframe. It gives a child iframe
    `color-scheme: light`, so hosted fields don't turn into white boxes in
    Dark.
  - For a hosted iframe, a label click moves focus into it, and its error is
    spoken when focus arrives, since ids can't reach inside a frame.
  - A child's own `id` wins over Field's `id`. In development Field warns
    when the two differ.
  - Types: `FieldProps` and `FieldControlProps`.
- `Checkbox`: a lone yes or no that's sent with a form, such as agreeing to
  terms. It has Switch's API: `checked` with `onCheckedChange`,
  `defaultChecked`, `name`, `required`, `helperText`, `error`, `hideLabel`,
  `disabled` and `size`. `indeterminate` shows a dash and is announced as
  mixed. Its `label` can hold inline `TextLink`s. Enter submits the form,
  where Switch toggles.
  - Left without a `value`, it renders no `value` attribute: a plain form post
    sends `"on"`, and react-hook-form's `register()` gives `true` or `false`.
    Pass `value` to send something else.
  - Switch acts now. Checkbox is a yes or no you send with a form. Choice
    picks from a list.
  - Types: `CheckboxProps`.
- `Spinner`: a small ring in the text color for one busy part of a page.
  `size` is `small`, `medium` (the default) or `large`: 16, 20 or 24px. `label` says what's loading, once, politely, when
  it appears. `showLabel` shows those words beside the ring.
  - It waits 400ms before it shows, so a quick load shows nothing. The wait
    is the same at every `--diya-duration-scale`; the scale changes only how
    it fades in and turns.
  - Under Reduce Motion it breathes in place, like Progress.
  - Types: `SpinnerProps`.
- `VisuallyHidden`: words that screen readers read and the screen doesn't
  show. It's a utility, not a component: it isn't counted, and it needs no
  provider. To name a control that has no text, use `aria-label` instead.
  Types: `VisuallyHiddenProps`.
- `useDiyaPortalContainer()`: where a popup from another library should
  render. Inside an open Dialog or Drawer it returns that modal's element;
  anywhere else, the nearest provider's portal. Pass it as the library's
  portal container (`container`, `portalContainer`, `menuPortalTarget` or
  `getPopupContainer`). It's `null` outside a provider and before the
  provider mounts.
- Nine theming tokens. Each one defaults to today's look, so nothing changes
  until you set it:
  - `--diya-color-focus`: every focus ring. It needs 3:1 against the
    surfaces; in Light, at least 5.1:1 against white, so it holds over Glass.
  - `--diya-color-heading`: component titles (Card, Dialog, Drawer, Page
    Header, Table, Form, Wizard, Content State, Data Viz and Prose headings).
  - `--diya-color-field` and `--diya-color-field-line`: the fill and edge of
    every field. An invalid field keeps the error border. Under Glass, a field
    stays see-through at your color.
  - `--diya-height-control-small`, `-medium` and `-large`: 32, 40 and 48px.
    The heights of Buttons, every field, Tabs and calendar days. Set the three
    together. Combobox can't go below 26px (32px at large).
  - `--diya-radius-popup`: Menu, Popover and the Combobox and Date Picker
    popups (16px × the corner scale).
  - `--diya-radius-modal`: Dialog and the Drawer's open edge (22px × the
    corner scale).
- Message keys: `toast.dismiss` ("Dismiss: Draft saved"), `toast.actionHint`
  ("Press F8 to reach Undo.") and a new `field` namespace with
  `errorAnnouncement` ("Email: Enter a valid email").
- Development warnings. In development only, DIYA writes "DIYA: …" messages
  to the console when something won't work as you expect. Examples: a popup
  from another library opened outside an open Dialog or Drawer, `toast()`
  called on the server or with no provider mounted, a Field wrapped around
  one of DIYA's own fields, and a Spinner with `showLabel` but no `label`.
  Production builds don't include them.
- `api.json`: the `field`, `checkbox` and `spinner` items, and
  `visually-hidden` with the new kind `utility`. The nine tokens, each with a
  `description`. The `field` messages. Token kinds and `since` as before.
  All of it is additive: `schemaVersion` stays 1.
- 33 components now (Field, Checkbox and Spinner are new). Still 13 patterns.

### Changed

Two entries change documented screen-reader and keyboard behavior, to fix a
toast that was read twice and an Escape that closed the Dialog under a toast:
"Screen readers" and "Escape on a focused toast" below.

- **Toasts stack.** Several toasts no longer cover each other. Every
  provider's `<Toast>`s and every `toast()` share the one column, in the
  outermost provider's corner.
  - Each toast keeps its own provider's look and motion: a `<Toast>` in a
    nested Dark provider still looks Dark.
  - A `<Toast>` always shows, and it counts toward the limit, so a `toast()`
    toast makes room for it or waits.
  - In 1.1, each provider drew its own toasts, and a nested provider's toasts
    covered the page's.
- **A nested provider's `<Toast>`s render in the page's one stack,** not inside
  that provider's element. They sit in a stand-in element that carries the
  provider's class, style, `data-theme` and `data-motion`, so your brand file
  and its `className` still reach them. CSS that finds them through the
  provider's `id`, its other attributes or its ancestors doesn't. A query for
  the provider's class finds two elements.
- **Screen readers.** Inside the stack, a `<Toast>`'s message no longer has
  `role="status"` or `role="alert"`. The stack reads each toast once, from
  its own live region, tone first: "Success: Draft saved." With an action, it
  adds "Press F8 to reach Undo." `urgent` still interrupts.
  - Toasts raised together are read together, in the order they arrived.
  - The stack's name and the words read for each toast come from the
    outermost provider's `messages`. A nested provider's `messages` still
    name its own toasts' close buttons.
- **The toast region** is a `region` landmark named "Notifications (F8)"
  while it holds a toast. The `toast.label` default changed from
  "Notification" to "Notifications (F8)". If you translated it, translate the
  new meaning: the whole list, and the key that reaches it.
- **Close buttons are named for their toast:** "Dismiss: Draft saved". A
  `<Toast>` without a title keeps "Dismiss alert".
- **Pausing.** Pointing at or focusing any toast pauses every toast on the
  page. In 1.1 only that toast paused. A hidden tab still pauses them all.
- **Escape on a focused toast closes only that toast.** It goes no further: a
  Dialog or Drawer around it stays open, and it doesn't bubble up to your own
  key handlers either, so an app-wide Escape handler doesn't receive it.
- **Toasts inside modals.** While a Dialog or Drawer is open, the toasts show
  inside the topmost one, above the dim and clickable, and move back when it
  closes. The same goes for your own `<dialog>` opened with `showModal()`, if
  it holds focus when a toast arrives. Inside a modal, toasts take its theme.
- **When other toasts are showing, a new one arrives in about 350ms:** they
  make room, then it arrives. A toast on its own arrives as before.
- **Under Glass, the page behind a toast is now evenly frosted.** In 1.1.1,
  text behind it showed faintly through on a phone.
- **DIYA's own fields announce an error that appears after you leave them.**
  TextInput, Search, TextArea, Select, Combobox, DatePicker, Switch, Choice and
  Checkbox say it once, politely: "Email: Enter a valid email." Errors that
  appear together, as on submit, aren't announced; the field that gets focus
  reads its own. If focus is already in the invalid field when you submit, as
  with Enter, its error is read once.
- **An error that appears when you leave a field by pressing elsewhere shows
  once the press ends,** so the button you pressed doesn't move under the
  pointer or your finger.
- **Button `loading` shows a small spinner instead of "···".** The cursor
  turns to `progress` at once. After 400ms the spinner takes the place of the
  icon before the label, and the words stay. Without such an icon it takes the
  label's place: the words turn transparent but keep their width, so the
  button keeps its exact size and nothing moves. An icon-only button swaps its
  icon for the spinner. When loading ends, the label, or the icon, fades back.
  - Any single `<svg>` rendered first counts as the icon: icons from
    lucide-react or any other library, your own icon and logo components, an
    `<svg>` in a Fragment. An `<img>`, an icon font, or an icon inside your own
    wrapper counts as label, as does every icon in browsers without CSS
    `:has()`. Space the icon with the Button's `gap` (or `column-gap` on the
    Button), not a margin on the icon: a margin shifts the spinner by half its
    width.
  - A loading Button looks busy, not disabled: full color and a `progress`
    cursor. Clicks, Enter and Space still do nothing; `aria-busy` and
    `aria-disabled` are unchanged.
  - A Button that is both `disabled` and `loading` looks disabled (dimmed,
    with the `not-allowed` cursor), with its spinner showing.
- **The Drawer's open edge is rounded like Dialog:** 22px × the corner scale,
  where it was 16px. A Drawer that fills a phone screen (440px or narrower) is
  square, so no dim shows in wedges at the screen's edge.
- **Choice and Checkbox boxes.** The small box sits 1px lower, so it centers on
  its line. The large box draws a 5×10 tick and a 10×2 bar, where they were
  4×8 and 8×2. Small and medium marks don't change.
- **Table's progress bars scale their corners** with `--diya-corner-scale`
  (no change at the default scale).
- **Combobox follows the control-height tokens** like the other fields
  (`--diya-height-control-*`). Its lowest height is 26px (32px at large).
- **Bundle size.** Every app with a `DiyaProvider` now carries the toast stack:
  about 5 KB gzip.

### Fixed

- In Safari, closing a Dialog or Drawer that was opened with the mouse returns
  focus to the control that opened it, not to the page (since 1.0.1). This
  covers a Dialog or Drawer mounted by its opener's click too.
- Closing a toast, or running its Undo, while you're typing elsewhere keeps
  your place: the next keystroke goes where you were typing.
- A Button with `href` keeps its link while it loads. It used to drop its
  `href`, so focus fell off it; now focus stays, as `loading` always promised.
  The link gets `aria-disabled="true"`, and clicks, middle clicks and Enter do
  nothing until loading ends. Your own `onKeyDown` still runs, with Enter
  stopped. A disabled `href` Button still drops its `href`. If your `linkComponent` is a
  wrapper, pass every prop through to the anchor; that's how the clicks are
  blocked.
- A disabled or loading Button with `asChild` blocks middle clicks too, so it
  can't open in a new tab.
- A loading Button with `asChild` on an `<input>` or `<img>` no longer
  crashes.
- In forced colors (such as Windows high contrast), a Destructive Button's
  words and icon show in the system's button text color, or its disabled
  color when disabled. Before, they were invisible.

### Not breaking, but worth a line

- The focus rings, component titles, field fill and edge, control heights,
  and popup and modal corners now read the new tokens. With the tokens unset,
  not a pixel changes.
- A nested provider resets the nine new tokens, so a value set in an outer
  provider's `style` stays there, as the 1.0 tokens always have. A brand file
  still reaches every provider.
- `.diya-sr-only`, Table's and Chatbot's hidden-text rules are now one rule.
  Class names aren't covered by semver; nothing looks different.

#### Button `loading`: edge cases

- A loading Button with `href` stays a link, with its `href`, and keeps
  focus. Clicks (modified and middle clicks too) and Enter do nothing;
  "Open in new tab" from the context menu still works. See Fixed.
- With `asChild` on an `<input>`, an `<img>` or another element that can't
  hold children, there's no spinner: a loading submit input keeps its words,
  turns its cursor to `progress` and ignores clicks. A component that
  ignores its children, such as one that renders a `label` prop, keeps its
  words while loading, as in 1.1.1, but shows no spinner. With `asChild`,
  your element must render its children for the spinner to show.
- Dialog's confirm button, Form's Submit and Wizard's forward button show it
  too.
- Under Reduce Motion the spinner breathes in place.
- In forced colors (such as Windows high contrast), a busy Button hides its
  words too and draws the system's button colors and border (the system's
  disabled color if it's also disabled), with no background image or
  shadow, over any colors you set on the Button. When
  loading ends, the words come back at once, without a fade. In forced
  colors a Button transitions only opacity, scale, translate, rotate and
  transform.
- The button's text no longer includes "···".
- On the beat, the words' fill turns transparent, with any text shadow,
  stroke or underline you gave them, and elements in the label fade out.
  One thing stays drawn: put a gradient made with `background-clip: text`
  on an element inside the label, not on the Button itself; on the Button it
  stays drawn under the spinner while it loads.
- The fade back animates the Button's `color`, so a border or ring you draw
  in `currentColor` on the Button (Tailwind's `border-current` or
  `ring-current`) goes out with the words and fades back with them.
- While it loads, a Button runs its own animation. One you set on the Button
  itself stops when loading starts and starts over when the label is back, so
  an entrance animation (such as `animate-in`) plays again after each load,
  and a loop (such as `animate-pulse`) jumps back to its start once. Put
  entrance animations on an element around the Button. Pulsing only while
  saving is fine: DIYA's spinner takes its place.
- An animation on the Button can't change how a Button loads, and neither
  can a Reduce Motion reset that is unlayered or in a layer after `diya`.
  One in `@layer base` (before `diya` in the Tailwind layer order) wins: the
  spinner shows at once on every load and the words come back without a
  fade, though nothing overlaps or goes blank. Keep the reset unlayered, or
  in a layer after `diya`, to keep the 400ms wait. If you use such a reset,
  include `animation-iteration-count: 1`; without it, every looping
  animation flickers, DIYA's spinner included.
- A part of the label with its own CSS animation stops while the Button is
  busy and starts over after each load. A Spinner you put in the label keeps
  its own wait and turn.
- Don't put a Spinner in a Button you give `loading`: the Button shows its
  own, and after an icon you'd see two rings.
- Style your own elements in a label, not the Button's inner spans: CSS that
  restyles those spans on hover garbles the Button's accessible name in
  Safari while it's hovered.
- If a Button's label holds an element, such as an icon or `<strong>`, pass
  `loading` from the start: `loading={false}` until it's busy. Then nothing
  in the label starts over when loading begins, and a page the browser has
  translated keeps working. (`loading={undefined}` counts as not passed.) A
  label of plain text is safe either way. Two things on a translated page
  work as in 1.1.1: without a `loading` prop, a label that swaps from plain
  text to elements crashes, and a plain label that changes its words
  (`'Save'` to `'Saved'`) keeps its old translation.

### For your tests

- **Find a toast by its region, not its role.** A `<Toast>` inside the stack
  has no `role="status"` or `role="alert"`, so `getByRole('status')` no
  longer finds it. Use
  `getByRole('region', { name: 'Notifications (F8)' })`, or find the toast
  by its text.
- **The stack's name is now "Notifications (F8)".** A query for
  "Notification" finds nothing. Use the new name, or a regular expression
  such as `/Notifications/`.
- **Close buttons:** a toast with a title is now "Dismiss: {title}". A
  `<Toast>` without a title is still "Dismiss alert".
- **Clear toasts between tests:** `afterEach(() => toast.dismiss())`, next to
  `motion="off"` in your test setup. It closes every toast `toast()` showed; a
  `<Toast>` goes when its test unmounts it.
- **A regular expression can find a fresh toast or field error twice.** A
  toast's words, and a field error that appears after you leave the field,
  are also read from a live region. They stay there for up to 5 seconds, or
  until the toast closes or the error clears. While they're there, a
  regular-expression text query (`getByText(/valid email/)`,
  `findByText(/changes are live/)`, Playwright's `getByText` with a pattern)
  finds two matches. Exact-text queries are unaffected: Testing Library's
  `getByText('Enter a valid email')`, or Playwright's
  `getByText('Enter a valid email', { exact: true })`. Playwright's `getByText`
  with a plain string matches substrings, so it finds two as well. Pick one:
  - look inside the form or the stack:
    `within(form).getByText(/valid email/)`, or
    `within(screen.getByRole('region', { name: 'Notifications (F8)' })).getByText(/Draft/)`;
  - query the field by its description:
    `expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(/valid email/)`;
  - use exact text: `getByText('Enter a valid email')`, or in Playwright
    `getByText('Enter a valid email', { exact: true })`.
- **Live-region copies under fake timers:** the copy appears one frame after
  the toast or error and leaves after 5 seconds. Advance timers by a frame to
  hear it, or past 5 seconds before a regular-expression query.
- **An effect that calls `toast()` shows it twice** in development under
  StrictMode, since StrictMode runs effects twice. Pass an `id`, and the
  second call updates the first. Better still, call `toast()` from the
  handler that did the work.
- **Pausing in tests:** `fireEvent.mouseEnter` and `mouseLeave`, and
  `fireEvent.focus` and `blur`, on a toast pause and resume it, as in 1.1.
  They now hold every toast's timer, not only that toast's.
- **Errors after a press:** an error that appears when you leave a field by
  clicking elsewhere shows once the press ends. With user-event, use
  `findBy…` after the click. Under fake timers, advance timers after it.
- **Spinner waits 400ms.** Use `findBy…` (or advance fake timers) to see it or
  hear its label.
- **Checkbox with react-hook-form:** `register('terms')` gives `true` or
  `false`, as a native checkbox does. With a `value`, it gives that value, or
  `false`.
- **DOM snapshots of anything inside a provider change.** Every outermost
  `DiyaProvider` adds a toast host to its portal when it mounts: two empty
  live regions and a `popover` element. `.diya-toast-region` now wraps the
  whole stack, and each toast is a `.diya-toast` in it. Class names and DOM
  aren't covered by semver; a placement override on `.diya-toast-region`
  still applies.
- **Button `loading` changes markup, not names.** The accessible name, the
  text and the layout are the same as in 1.1.1. A Button without a `loading`
  prop renders as in 1.1.1 until it first loads. A plain-text label renders as
  in 1.1.1 at rest, in the client and in server HTML (React's `<!-- -->`
  separators included), and its text is never moved or replaced. What
  changes:
  - **A plain-text label while loading** keeps its words where they are. A
    hidden spinner is added after them, where 1.1.1 put "···" before them, so
    `lastChild`, `:last-child` and snapshots change. The text is the words
    alone, so Playwright's exact `getByText('Save')` now finds the Button,
    where 1.1.1 found nothing ("···Save"). `getByText` finds the Button, as at
    rest.
  - **A label holding an element is wrapped from the first render** if the
    Button has a `loading` prop, even `loading={false}`. That counts an icon,
    `<strong>`, or a component that renders text, such as a translation
    component. The label sits in `span.diya-button-label`, the first element
    of a label with several parts in
    `span.diya-button-leading > span.diya-button-leading-content`, and a
    hidden spinner is added. A space after the first element is a text node between the
    two spans. Without a `loading` prop at first, the wrappers appear when it
    first loads, what's inside mounts once more, and they stay.
  - **Find that Button by its role:**
    `getByRole('button', { name: 'Save', busy: true })`. `getByText('Save')`
    finds the wrapper span, not the button, so
    `expect(getByText('Save')).toHaveAttribute('aria-busy', 'true')` fails. A
    click on the span reaches the button's `onClick`, but in happy-dom it
    doesn't submit a form (browsers and jsdom do). In Playwright, `getByText`
    finds a span with no box of its own: clicks, hovers and `toBeVisible()`
    work, but in Chromium its `boundingBox()` is `null` and a screenshot of it
    throws.
  - **An icon-only Button given `loading`** has a hidden spinner before its
    icon from the first render, so `:first-child` selectors and snapshots
    change. While it loads, its icon stays in the page, hidden.
  - **CSS on a Button's direct children,** such as `.diya-button > svg` or
    `> *`, misses the wrapped parts. Use `.diya-button svg`. The wrappers have
    no box, so gaps, `justify-content` and auto margins work as before.
  - **The Button's own spinner** is `span.diya-spinner.diya-button-spinner`,
    `aria-hidden`, and not displayed until it's needed. The
    `.diya-button-progress` element is gone. A `<Spinner>` you put in a Button
    is yours: it sits where an icon would. Don't also give that Button
    `loading`.
  - **While loading,** a Button carries `data-busy-turn` (and
    `data-busy-disabled` if it's also disabled); while its label fades back,
    `data-returning`. Snapshots taken then change. These attributes and the
    classes above are DIYA's own, not covered by semver: don't style or select
    by them.
  - **An `href` Button keeps its `href` while it loads,** with
    `aria-disabled="true"` and no `role` attribute. A test that expected no
    `href` now fails; expect the `href`. It also keeps `target`, `rel` and
    `download`, stays a Tab stop, and can be dragged; the status bar shows its
    URL on hover. Your `onKeyDown` still runs, with Enter stopped.
- **Development warnings:** test setups that fail on `console.warn` may see
  DIYA's new "DIYA: …" warnings. Each says what to do instead.
- **Translations typed as `DiyaMessages`** need the new keys
  (`toast.dismiss`, `toast.actionHint` and `field.errorAnnouncement`). Type a
  partial translation as `DiyaMessagesInput`, which accepts any subset. These
  keys are the only change that can break a 1.1 app's types.

## [1.1.1] - 2026-11-11

### Fixed

- `Dialog` and `Drawer`: a `Menu`, `Popover` or `Tooltip` inside an open
  `Drawer` opens on screen again. In 1.1.0 it opened off screen and couldn't
  be clicked, in every browser. The open panel kept a resting `scale` and
  `translate`, which made it the frame that fixed-position popups are placed
  against. It now rests with none, and its open motion is unchanged.
- `Dialog`, `Form` and `Wizard`: the `loading` docs no longer promise a
  spinner. The confirm, Submit and forward buttons show Button's own `loading`
  indicator, as they always have.

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

[1.1.1]: https://github.com/idyeah-studio/diya/releases/tag/v1.1.1
[1.1.0]: https://github.com/idyeah-studio/diya/releases/tag/v1.1.0
[1.0.1]: https://github.com/idyeah-studio/diya/releases/tag/v1.0.1
[1.0.0]: https://github.com/idyeah-studio/diya/releases/tag/v1.0.0

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://diya13.ai/brand/diya-dark.svg">
    <img src="https://diya13.ai/brand/diya.svg" alt="DIYA" width="136">
  </picture>
</h1>

**A library for your next app.** 29 components and 13 patterns for React. Free, MIT, yours to own.

[Catalog](https://diya13.ai/explore) ·
[Components](https://diya13.ai/explore?area=components) ·
[Patterns](https://diya13.ai/explore?area=patterns) ·
[Changelog](https://github.com/idyeah-studio/diya/blob/main/CHANGELOG.md)

## Start a new app

```sh
npm create diya@latest
# pnpm create diya · yarn create diya · bun create diya
```

It asks four things: a name, where to start, Next.js or Vite, and your brand
color. Then it installs with the package manager you ran it with and tells you
the one command left. The provider, the styles, Light and Dark, and notes for
your coding agent are already in place. Start from **Minimal**, one page with
a few pieces, or **Dashboard**, which is Oriel: a four-screen invoicing app on
Next.js.

For CI or a coding agent, pass the answers and it asks nothing:

```sh
npx --yes create-diya@latest my-app --template dashboard --brand "#2F6FEB"
```

`create-diya` is released with `@idyeah/diya`, on the same version.

## Install

Adding DIYA to an app you already have:

```sh
npm install @idyeah/diya
# pnpm add @idyeah/diya
# yarn add @idyeah/diya
# bun add @idyeah/diya
```

Works with React 18.3 and 19. TypeScript types are included, and DIYA Sans,
our typeface, ships inside the package.

## Use it

Import the styles once, wrap your app in `DiyaProvider` once, and use any
component inside it.

```tsx
import { useState } from 'react'
import { Button, DiyaProvider, Stack, TextInput } from '@idyeah/diya'
import '@idyeah/diya/styles.css'

export default function App() {
  const [name, setName] = useState('')
  return (
    <DiyaProvider>
      <Stack gap={4} align="start" style={{ maxWidth: 400, padding: 32 }}>
        <TextInput label="Project name" value={name} onValueChange={setName} />
        <Button disabled={!name.trim()} onClick={() => console.log(name)}>
          Continue
        </Button>
      </Stack>
    </DiyaProvider>
  )
}
```

No Tailwind, no account and no backend. The provider follows the visitor's
Light or Dark setting and paints its own background and text color, so the
first render reads on any page. It scopes DIYA's look and its popups to the
region it wraps; it changes nothing outside, sets no cookies and makes no
network calls. Your app owns state, navigation and what happens when someone
presses Continue.

`Stack` lays things out top to bottom and `Inline` side by side, with even
space between them. See [Layout](#layout).

Props, behavior and examples for every piece are in the
[component guide](https://github.com/idyeah-studio/diya/blob/main/packages/diya/docs/components.md)
and the [pattern guide](https://github.com/idyeah-studio/diya/blob/main/packages/diya/docs/patterns.md).
Your editor shows the full prop types.

Want to see a whole screen first? **[Oriel](https://oriel.diya13.ai)** is a small invoicing app made only from DIYA. Its source is in [`examples/oriel`](https://github.com/idyeah-studio/diya/tree/main/examples/oriel).

## Use it with an AI editor

Connect DIYA once and Claude Code, Cursor or VS Code look it up while they
write: the right component, its real props, code that compiles. Read-only, no
account.

```sh
claude mcp add --transport http diya https://diya13.ai/mcp
```

- **Cursor:** add `{ "mcpServers": { "diya": { "url": "https://diya13.ai/mcp" } } }` to `.cursor/mcp.json`.
- **VS Code:** `code --add-mcp '{"name":"diya","type":"http","url":"https://diya13.ai/mcp"}'`

Then ask it: "Build a settings page with DIYA." Prefer files?
[`/llms.txt`](https://diya13.ai/llms.txt) and `@idyeah/diya/api.json`
carry the same API.

## Notes for your coding agent

Apps made with `npm create diya` come with an `AGENTS.md` (and a one-line
`CLAUDE.md` that points to it) and a `.mcp.json` that connects Claude Code.
In an app you already have, a few lines in your own `AGENTS.md` do the same
job:

```md
## UI
This app uses DIYA (`@idyeah/diya`). Before writing UI, look components up in
https://diya13.ai/llms.txt or node_modules/@idyeah/diya/dist/api.json,
and use DIYA's components, with Stack and Inline for layout, before writing
your own markup or CSS.
```

## Next.js (App Router)

Import the styles in `app/layout.tsx` and wrap the app in `DiyaProvider`. The
layout can stay a Server Component: every DIYA component, `DiyaProvider`
included, is marked `'use client'` inside the package, so Next.js renders it as
a client component for you.

```tsx
// app/layout.tsx
import type { ReactNode } from 'react'
import { DiyaProvider } from '@idyeah/diya'
import '@idyeah/diya/styles.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DiyaProvider>{children}</DiyaProvider>
      </body>
    </html>
  )
}
```

`theme="system"`, the default, follows the visitor's OS in CSS alone, so the
server's HTML is already in the right colors: no flash, no script.

A Server Component can render DIYA components with plain props: text, numbers
and arrays of plain objects. Functions can't cross from the server, so
anything with a handler (`onClick`, `onValueChange`, a table column's `render`,
a filter's `getValue`) goes in a file that starts with `'use client'`:

```tsx
// app/project-name.tsx
'use client'
import { useState } from 'react'
import { Button, TextInput } from '@idyeah/diya'

export function ProjectName() {
  const [name, setName] = useState('')
  return (
    <>
      <TextInput label="Project name" value={name} onValueChange={setName} />
      <Button disabled={!name.trim()} onClick={() => console.log(name)}>
        Continue
      </Button>
    </>
  )
}
```

```tsx
// app/page.tsx (a Server Component)
import { PageHeader } from '@idyeah/diya'
import { ProjectName } from './project-name'

export default function Page() {
  return (
    <main>
      <PageHeader headingLevel={1} title="New project" description="Name it now; you can change it later." />
      <ProjectName />
    </main>
  )
}
```

The same rule covers the provider. A component, such as Next.js `Link` for
`linkComponent`, and translated strings that are functions, such as
`tag.remove`, can't be passed to `DiyaProvider` from a Server Component; Next.js
stops with "Functions cannot be passed directly to Client Components". Move the
provider into your own `'use client'` file and render that from the layout:

```tsx
// app/providers.tsx
'use client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { DiyaProvider } from '@idyeah/diya'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DiyaProvider linkComponent={Link} messages={{ tag: { remove: (label) => `Retirer ${label}` } }}>
      {children}
    </DiyaProvider>
  )
}
```

```tsx
// app/layout.tsx
import type { ReactNode } from 'react'
import { Providers } from './providers'
import '@idyeah/diya/styles.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

`defaultMessages` and the types are plain values, so Server Components can
import them too.

## Vite

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DiyaProvider } from '@idyeah/diya'
import '@idyeah/diya/styles.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DiyaProvider>
      <App />
    </DiyaProvider>
  </StrictMode>,
)
```

Then use any component inside `App`. Import DIYA's styles before your own, as
here; with Tailwind, see [Tailwind CSS](#tailwind-css).

## Layout

`Stack` puts its children in a column and `Inline` in a row, with even space
between them. Both take a `gap` from DIYA's spacing scale (`0` to `8`: 0, 4,
8, 12, 16, 24, 32, 48 and 64px) or any CSS length, plus `align`, `justify`,
`wrap` and `as`.

```tsx
<Stack gap={5} as="section">
  <PageHeader title="Billing" />
  <Inline gap={2} justify="end">
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </Inline>
</Stack>
```

`Inline` centers its children and wraps them onto the next line when the row
runs out of room. Their styles are deliberately weak, so your own `className`
or `style` can change any of it. The same scale is public as `--diya-space-1`
to `--diya-space-8` for your own CSS.

## Your CSS wins

Everything in `styles.css` sits in a CSS cascade layer named `diya`. Rules
outside a layer beat every layered rule, so your own CSS, and any `className`
or `style` you pass to a component, wins over DIYA's without `!important`.
DIYA's base styles also reach only its own elements: your headings, paragraphs
and links inside the provider keep the styles you give them. To give your own
articles DIYA's type, wrap them in `Prose`.

One thing to watch: a global reset of your own, such as
`button { background: none; border: 0 }` or `* { margin: 0; padding: 0 }`,
also beats DIYA when it isn't layered. Put it in a layer that comes before
DIYA's:

```css
/* At the top of your first stylesheet */
@layer reset, diya;

@layer reset {
  * { margin: 0; padding: 0; box-sizing: border-box; }
  button { background: none; border: 0; }
}
```

## Tailwind CSS

DIYA works with Tailwind v4. Name the layer order once, before Tailwind and
DIYA load, so DIYA sits above Tailwind's base styles and below its utilities:

```css
/* src/index.css */
@layer theme, base, diya, components, utilities;
@import "tailwindcss";
@import "@idyeah/diya/styles.css";
```

Utilities then win: `<Button className="w-full mt-6">` is full width, and
`<Stack className="gap-2">` changes the gap. Your own `p`, `h1` and `a` keep
Tailwind's styles. If you'd rather import DIYA's styles from JavaScript, keep
the `@layer` line at the top of your CSS and import `@idyeah/diya/styles.css`
before it.

## Links and routers

Anything DIYA renders from an `href` (Button, Menu items, Breadcrumbs, Side
Navigation and Site Header items) is a plain `<a>` unless you give the
provider your router's link with `linkComponent`. With Next.js, set it in a
client file, as in [Next.js](#nextjs-app-router):

```tsx
<DiyaProvider linkComponent={Link}>
  <Button href="/billing">Billing</Button>
</DiyaProvider>
```

`asChild` styles your own element instead of rendering one. Button and
TextLink take it:

```tsx
<Button asChild>
  <Link href="/billing">Billing</Link>
</Button>
```

DIYA's classes, attributes and handlers merge into your child, and the ref
reaches it. TextLink with `asChild` needs no provider, so it renders in a
Server Component.

## Forms

Fields work controlled (`value` with `onValueChange`, `checked` with
`onCheckedChange`) or uncontrolled (`defaultValue`, `defaultChecked`). Native
`name`, `onChange`, `onBlur` and the ref reach the native control, and
`onValueChange` still fires, so a plain `<form>` posts every field and a form
reset puts them back.

react-hook-form's `register()` works on TextInput, TextArea, Select, Switch,
Choice and Slider with no `Controller`: values come back on submit, and an
error moves focus to its field.

```tsx
const { register, handleSubmit } = useForm<{ name: string; volume: number; alerts: boolean }>()

<form onSubmit={handleSubmit(save)}>
  <Stack gap={4}>
    <TextInput label="Name" {...register('name', { required: 'Add a name' })} />
    <Slider label="Volume" {...register('volume', { valueAsNumber: true })} />
    <Switch label="Email alerts" {...register('alerts')} />
    <Button type="submit">Save</Button>
  </Stack>
</form>
```

Slider needs `valueAsNumber: true` to give you a number. Combobox and
DatePicker need a `Controller`; in a plain form they post their value through
`name`. Calendar takes no `name`, so it always goes through a `Controller`.

## Charts

Charts have their own entry point, `@idyeah/diya/charts`, and draw with
[Apache ECharts](https://echarts.apache.org). ECharts is an optional peer
dependency, so apps without charts don't carry it. Install it when you need a
chart:

```sh
npm install echarts
```

```tsx
import { DataViz } from '@idyeah/diya/charts'

export function WeeklyActivity() {
  return (
    <DataViz
      title="Weekly activity"
      type="line"
      categories={['Mon', 'Tue', 'Wed']}
      series={[{ name: 'Visits', values: [32, 54, 48] }]}
      valueDomain={[0, 100]}
    />
  )
}
```

Render it inside the same `DiyaProvider`. `DataViz` is a chart in a titled
card, with an optional table of the exact values; `Chart` is the bare chart.
Charts are experimental in 1.0: their props may still change in a minor
release.
Both draw `line`, `area`, `bar`, `combo`, `pie`, `donut` and `treemap`. Charts
use the data you pass and render as SVG. They don't fetch anything.

## Theme

Four props on `DiyaProvider` cover most apps: `theme`, `brandColor`,
`fontFamily` and `glass`.

```tsx
<DiyaProvider brandColor="#2F6FEB" fontFamily="'Inter', sans-serif">
```

- `theme` is `"system"` by default: Light or Dark follows the visitor's OS
  setting, in CSS, from the first paint. Set `"light"` or `"dark"` to fix it.
  `useDiyaAppearance()` tells your own code which one is showing (on the
  server it says Light, then follows the OS once mounted).
- `brandColor` is your one brand color. It fills the main Button, selected
  pill Tabs, an on Switch, Slider and Progress, leads chart series 1 when it
  has color (otherwise charts use DIYA's Vivid palette), and tints
  brand-tone Tags and Badges. Text on it is white whenever white reads at
  4.5:1, otherwise near-black. Pass `{ light, dark }` to use a different color
  in each theme, such as a lighter one for Dark.
- The provider paints its own background and text color. Set
  `surface={false}` when your layout already paints the page.
- `fontFamily` names a font; it doesn't load one. DIYA Sans needs nothing,
  since it comes with the styles. For any other font, load it first
  (`next/font`, Fontsource or a `<link>`), then name it here.

| To change | Do this |
| --- | --- |
| Brand | Set `brandColor`. It sets `--diya-color-accent`, `--diya-color-accent-text`, `--diya-color-accent-soft` and `--diya-color-accent-ink` for you. |
| Surfaces | Set `--diya-color-surface`, `--diya-color-raised` and `--diya-color-text` as a readable group. |
| Corners | Set `--diya-corner-scale` (`0` is square, `2` is twice as round). Fields, selects and rounded Buttons share `--diya-radius-control`; Card, chart cards, Page Header, Form and Table share `--diya-radius-surface`. |
| Chart series | Pass `palette`, or a `color` on a series or data item. |
| Size and behavior | Use each component's props. |

For deeper changes, override the [public tokens](#tokens). Or build a theme in
the [catalog](https://diya13.ai/explore) with Customize, then press
Get theme: you get one `diya-theme.css` file to import after the styles, and a
few props.

A nested `DiyaProvider` can give one region its own look. It inherits
`locale`, `messages` and `linkComponent` from the provider around it, but not
`theme`, `glass`, `brandColor` or `fontFamily`, so set those on each provider.

## Glass

Glass is one prop: `glass`.

```tsx
<DiyaProvider theme="dark" glass>
```

It's a finish, not a theme, so it works over Light and Dark. Headers, popups
and tabs get a translucent, blurred surface. Glass wants something behind it:
over a flat background it looks solid. Where the browser can't blur, or the
reader has asked for less transparency, DIYA uses its solid surfaces instead.
Keep the backdrop quiet enough that text stays readable.

## Translation

Every built-in string (button labels, empty states, screen-reader text) can
be replaced through `DiyaProvider`. Pass only the strings you want to change,
grouped by component. Anything you leave out stays in English.

```tsx
<DiyaProvider
  locale="fr-FR"
  messages={{
    table: { emptyTitle: 'Rien pour le moment', noMatches: 'Aucun résultat' },
    pagination: { previous: 'Précédent', next: 'Suivant' },
    tag: { remove: (label) => `Retirer ${label}` },
  }}
>
```

- `defaultMessages` lists every key with its English default; use it as the
  template for a full translation. `DiyaMessages` is its type, and
  `DiyaMessagesInput` is the partial shape `messages` accepts.
- A value is a string, or a function when the string includes something, such
  as a label or a count. In Next.js, pass functions from a client file (see
  [Next.js](#nextjs-app-router)).
- A label prop on one component (`openLabel`, `loadingLabel`, `confirmLabel`,
  `backLabel`, `userLabel` and the like) still wins over `messages` for that
  instance.
- `locale` formats dates and numbers, for example the DatePicker field and
  calendar month. It defaults to `en-US`. Your own content, such as table
  cells, stays as you render it.
- A nested `DiyaProvider` adds to the strings and locale of the one around it
  and changes only what it sets; a key set to `undefined` keeps the inherited
  string.

## Tokens

These CSS custom properties are public. They are safe to override on
`DiyaProvider`'s `style`. To change one region, wrap it in a nested
`DiyaProvider` with its own `style`: a few values, such as table shadows and
header edges, are worked out once per provider from these tokens.

| Group | Tokens |
| --- | --- |
| Text | `--diya-color-text`, `--diya-color-muted` |
| Surfaces | `--diya-color-surface`, `--diya-color-recessed`, `--diya-color-raised` |
| Lines | `--diya-color-line` |
| Brand | `--diya-color-accent` (fills), `--diya-color-accent-text` (text on the fill), `--diya-color-accent-soft` (a quiet tint) and `--diya-color-accent-ink` (brand-colored text on the page). `brandColor` sets all four; set them together if you override them. |
| States | `--diya-color-hover`, `--diya-color-selected` |
| Destructive actions | `--diya-color-destructive` |
| Statuses | For each of `success`, `warning`, `error` and `info`: `--diya-color-{status}` for text and icons on a surface, `--diya-color-{status}-surface` behind them, and `--diya-color-{status}-fill` with `--diya-color-{status}-on-fill` for solid badges. `--diya-color-error` also colors error messages, a falling Metric and invalid Combobox and DatePicker borders; other fields mark an invalid value with a dashed border. |
| Neutral badge | `--diya-color-neutral-fill`, `--diya-color-neutral-on-fill` |
| Glass and overlays | `--diya-color-glass` (the translucent fill when Glass is on), `--diya-color-scrim` (behind dialogs and drawers; unset by default) |
| Font | `--diya-font`, set by `DiyaProvider` from `fontFamily` |
| Type scale | `--diya-text-caption`, `--diya-text-body`, `--diya-text-large`, `--diya-text-title`, `--diya-text-heading`, `--diya-text-display`, `--diya-text-hero` |
| Line height | `--diya-leading-tight`, `--diya-leading-body` |
| Space | `--diya-space-1` to `--diya-space-8`: 4, 8, 12, 16, 24, 32, 48 and 64px |
| Shape and depth | `--diya-corner-scale`; `--diya-radius-control`, the one corner every control shares; `--diya-radius-surface`, the one corner every in-page surface shares; `--diya-shadow-raised` for cards, dialogs, toasts and floating menus; `--diya-elevation` scales popup and table shadows (`0` removes them) |

```tsx
<DiyaProvider
  brandColor="#2F6FEB"
  style={{
    '--diya-color-surface': '#F7F7F5',
    '--diya-corner-scale': 1.5,
  } as React.CSSProperties}
>
```

Set `brandColor` and `fontFamily` as props rather than overriding the accent
tokens and `--diya-font` directly. In your own CSS, `.diya-root` is the
provider; with `theme="system"` its `data-theme` is `system`, so write Light
and Dark overrides inside `@media (prefers-color-scheme: …)` as well as for
`[data-theme='light']` and `[data-theme='dark']`. Set a status family's four tokens
together, and check each pair in Light, Dark and Glass. Every public token,
with its defaults and the tokens it pairs with, is also listed in
`@idyeah/diya/api.json`.

## Stability

DIYA follows [semver](https://semver.org). In 1.x, these change only in a
major version:

- entry points and export names, both values and types;
- prop names, types, whether a prop is required, defaults and controlled pairs
  (such as `value` with `onValueChange`);
- documented keyboard and screen-reader behavior;
- `DiyaProvider` props;
- public token names and what they mean (their values may be tuned in a minor
  release);
- message keys and their arguments;
- `api.json` within `schemaVersion: 1`, where only additions are allowed;
- peer dependency ranges.

Not covered, so don't build on them: `.diya-*` class names, DOM structure,
anything named `--diya-internal-*`, file paths inside `dist`, and anything
marked `"stability": "experimental"` in `api.json`. In 1.0 that's Chatbot and
the charts (`DataViz` and `Chart`).

## License and fonts

DIYA is MIT licensed; see
[LICENSE](https://github.com/idyeah-studio/diya/blob/main/LICENSE). DIYA Sans
is a modified version of Mona Sans, licensed under the SIL Open Font License
1.1 rather than MIT. Its license, `OFL.txt`, ships beside the font files in
`dist/fonts`. ECharts is an optional Apache-2.0 peer dependency and isn't
bundled. Details are in
[NOTICE](https://github.com/idyeah-studio/diya/blob/main/NOTICE).

## Coming from the preview?

Swap <code>&#64;diya/ui</code> for `@idyeah/diya` in your imports and remove
the vendored `.tgz`. Some props were renamed for 1.0; the
[changelog](https://github.com/idyeah-studio/diya/blob/main/CHANGELOG.md)
lists each one.

## Relight, coming to DIYA Pro

We're building Relight: upload any picture of a screen from your own product
(a screenshot, a wireframe, a whiteboard photo, even a napkin sketch), answer a
few questions, and get it back as React code made from DIYA components, for any
kind of app: dashboards, settings, sign-up flows, landing pages, admin tools. It isn't ready yet; for now it's a
[list](https://diya13.ai/#pro). While we build it, four promises:

1. The library stays MIT.
2. Pro never gets a component the library lacks.
3. Pro's code needs nothing from us but `@idyeah/diya`.
4. Library screens stay free and MIT. Relight's screens are yours.

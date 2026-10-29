# Oriel

A small invoicing app made only from DIYA components. It's live at
[oriel.diya13.ai](https://oriel.diya13.ai).

Four screens, each one file you can read top to bottom:

| Screen | File | What it shows |
| --- | --- | --- |
| Overview | `app/Overview.tsx` | Card, Metric, a DataViz bar chart, List, Tag, Button with `href` |
| Invoices | `app/invoices/Invoices.tsx` | Table with search, filters, selection and bulk actions; a destructive Dialog; two Drawers with Combobox, DatePicker, TextInput and TextArea; Toast |
| Customers | `app/customers/Customers.tsx` | Search, pill Tabs with counts, Cards with a Menu of links, ContentState |
| Settings | `app/settings/Settings.tsx` | Form with react-hook-form's `register()` on every field (DatePicker through `Controller`), plus theme, brand color and Glass changed live |

The rest is the frame:

- `app/providers.tsx` is a `'use client'` file, because it gives
  `DiyaProvider` Next.js `Link` as its `linkComponent`. It also keeps the
  three props Settings changes: `theme`, `brandColor` and `glass`.
- `components/Shell.tsx` puts Side Navigation on wide screens and Site Header,
  with its own phone menu, on narrow ones.
- `app/oriel.css` is the app's only CSS: the page grid and Glass's backdrop.
  Layout inside the screens is `Stack` and `Inline`.
- `lib/store.tsx` keeps the data in memory, so a refresh starts over. Swap
  its functions for calls to your own API.
- `lib/brand.tsx` holds the app's name and its wordmark: lowercase "oriel" in
  DIYA Sans, drawn as outlines, with the dot of the i in warm orange. The
  letters take the text color, so the mark follows Light, Dark and Glass. The
  tab icons sit beside the pages: `app/favicon.ico`, `app/icon1.png` (16px,
  a lowercase o and the warm dot), `app/icon2.png` and `app/icon3.png` (the
  "Or" tile) and `app/apple-icon.png`.

Everything is invented: the studio, its customers and their invoices.
"Today" is fixed at 21 October 2026, so the screens read the same on any day.

## Run it

From the repository root:

```sh
pnpm install
pnpm build
pnpm --filter ./examples/oriel dev
```

`pnpm build` builds the package first, since the app uses its built output.
Then open the address `next dev` prints.

## Link preview

`app/layout.tsx` gives every page the same card: `public/demo-only/og.jpg`,
the app's real Overview at 1200×630, by absolute URL. Share the home page as
`https://oriel.diya13.ai/`, with the trailing slash; X caches a card
per exact URL. The `demo-only` folder stays out of the create-diya template.

## Make it yours

`components/DemoBar.tsx` is the one demo-only part: the strip that links each
screen to its source. Delete the file and its line in `components/Shell.tsx`.

## Deploying

Oriel is its own Vercel project, separate from the DIYA site:

- Root Directory: `examples/oriel`.
- `vercel.json` installs and builds from the repository root.
- Git deployments are off; production is deployed from a release tag:

```sh
git checkout v1.0.0
vercel deploy --prod
```

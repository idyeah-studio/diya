# Vite example: a financial dashboard

A small React 18 app built with `@idyeah/diya` and `@idyeah/diya/charts`: one
`DiyaProvider`, accounts, a ledger table, charts, filters and Settings with
Light, Dark and Glass. It uses the package from this repository, the same way
an app would use it from npm.

## Run it

From the repository root:

```sh
pnpm install
pnpm build
pnpm --filter ./examples/vite dev
```

Open http://127.0.0.1:3022. `pnpm build` builds the package first, since the
example uses its built output. Run it again after you change the package's
source.

Other commands, also from the root:

```sh
pnpm --filter ./examples/vite build   # type-check and production build
pnpm --filter ./examples/vite test    # the example's tests
pnpm --filter ./examples/vite preview # serve the production build
```

## What to try

- Pick an account and a reporting period. The overview, balances and charts
  update together.
- Search the ledger, filter by status or type, and sort columns.
- Open a transaction, edit its memo or category, and mark rows reviewed.
- Export the statement as CSV.
- Switch Light, Dark and Glass in Settings.

Everything stays in memory, and a refresh restores the sample data. All
companies and transactions are made up. There is no bank connection or payment
processing.

## Where things live

| File | What it does |
| --- | --- |
| `src/App.tsx` | Dashboard state, DIYA components, ledger actions and CSV export |
| `src/DashboardCharts.tsx` | The charts, imported from `@idyeah/diya/charts` |
| `src/finance.ts` | Sample data, filters, balances and chart data |
| `src/theme.ts` | Brand color, font and public token overrides for Light and Dark |
| `src/dashboard.css` | The app's own layout |

Amounts are kept in integer cents. The sample ledger is fixed at
October 23, 2026 and doesn't read the live clock.

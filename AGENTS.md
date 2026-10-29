# Notes for coding agents and contributors

DIYA is a pnpm workspace: the `@idyeah/diya` package (`packages/diya`), the
`npm create diya` CLI (`packages/create-diya`), three example apps
(`examples/*`), and the diya13.ai site (`apps/site`). Read
[CONTRIBUTING.md](CONTRIBUTING.md) for the house rules; this file is the short
version for automated work.

## Build and test

Node 22.12+ and pnpm 10 (`corepack enable`). From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build                    # the package, into packages/diya/dist
pnpm typecheck && pnpm test   # the package's tests
pnpm test:create && pnpm check:templates
pnpm build:site               # the package, then the site against it
pnpm typecheck:site && pnpm test:site && pnpm verify:site
pnpm scan:leaks
```

The site and the examples get their own copy of the package, refreshed by
`pnpm build`. Rebuild the package before testing anything that uses it.

## The countdown stays pixel-identical

Until `LAUNCH_AT` in `apps/site/lib/launch.ts` (2026-11-07 00:00 PST), `/` is
the countdown; at that moment the landing page replaces it and the catalog
(`/explore`, `/ask`, `/changelog`, `/mcp`, `llms.txt`, `api.json`) opens, with
no deploy. Don't change that logic, the countdown's components
(`components/LaunchCountdown.tsx`, `components/ConceptLanding.tsx`,
`components/ConceptBackdrop.*`), its styles in `app/globals.css`, or the frozen
font `app/fonts/DIYASans-countdown.woff2` (its hash is tested).

If a change could reach the countdown, prove it didn't: build the site before
and after, serve each with `DIYA_NOW=2026-11-01T12:00:00Z pnpm --filter diya-site start`,
fix the browser clock to the same time, screenshot `/` in Light and Dark at
1440×900 and 390×844, and expect 0 changed pixels. `DIYA_NOW` past the launch
moment shows the launched site (every Vercel deployment ignores `DIYA_NOW`);
`DIYA_CATALOG_PREVIEW=1` opens the catalog early, unindexed.

## Rules

- Never commit `.env*`, `.vercel/`, build output or secrets. Configuration
  comes from the environment (`apps/site/db/ENV.md`); a postal address is only
  ever `DIYA_POSTAL_ADDRESS`.
- `pnpm scan:leaks` must pass. Don't weaken its rules to make it pass.
- `README.md` at the root is a copy of `packages/diya/README.md`, and
  `CHANGELOG.md` of `packages/diya/CHANGELOG.md`; edit the package's and copy.
- create-diya's Dashboard template is generated from `examples/oriel`: change
  Oriel, run `pnpm sync:oriel`, commit both.
- Keep `.github/workflows/release.yml` as it is: npm trusted publishing is
  bound to that file name and its `release` environment.
- US spelling, plain words, no reader-facing text under 13px, no native
  `title` tooltips.

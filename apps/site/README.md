# DIYA site and catalog

This app is `diya13.ai`: the landing page and the catalog for DIYA, a
free MIT React library published on npm as `@idyeah/diya`. It deploys to the
Vercel project `diya` (Root Directory `apps/site`, Node 22).

## Launch

`lib/launch.ts` holds `LAUNCH_AT`, 2026-11-07 00:00 PST. Until then `/` shows
the countdown and `/explore` returns 404 unless `DIYA_CATALOG_PREVIEW=1` is
set. The countdown reaching zero doesn't deploy or publish anything. There are
no ZIP or tarball downloads: the catalog's Get code drawer points to
`npm install @idyeah/diya`, and Get theme hands out one `diya-theme.css` file
and a few props.

## The library

The site depends on `@idyeah/diya` as `workspace:*`, and pnpm injects it
(`injectWorkspacePackages` in `pnpm-workspace.yaml`): the site gets its own copy
of `packages/diya` in `node_modules`, resolved against the site's React, the way
an app installing it from npm would, and the copy refreshes whenever the
package's build script runs. The site imports it only through the package's
`exports` map, which points into `dist`, the files npm publishes. So the site
is always built against the package this commit would publish. Build the
package before the site:

```sh
pnpm --filter @idyeah/diya build
pnpm --filter diya-site build
```

The package's README is the npm page and the GitHub front page; edit
`packages/diya/README.md`, and keep the root `README.md` identical
(`node scripts/tarball.mjs --check` fails when they differ). `/changelog`
reads `packages/diya/CHANGELOG.md`, and DIYA Sans comes from
`packages/diya/src/fonts`.

## Local catalog review

From the repository root, on Node 22:

```sh
DIYA_CATALOG_PREVIEW=1 pnpm --filter diya-site exec next dev --hostname 127.0.0.1 --port 3017
```

Open `http://127.0.0.1:3017/explore`.

## Screens

`/explore?area=screens` is the Screens gallery, and `&screen=<id>` one screen.
Each screen is one file, `screens/<id>.tsx`, written to the contract in
[`screens/README.md`](screens/README.md) and listed in
`components/screens/screens-data.ts`. Posters (pages waiting on a DIYA piece)
live in `screens/posters/` and are only ever thumbnails.

The catalog previews a screen in an iframe at a real 1440×900 or 390×844
viewport, not under the site's own layout and styles. That frame is a small
static Vite app, `screens-frame/`, that renders a screen the way a fresh
`npm create diya` Vite app does, and it's built into `public/screens-frame/`
(gitignored): `pnpm --filter diya-site build` builds it before `next build`,
so Vercel's build command needs nothing extra. In development, keep it
rebuilding beside `next dev`:

```sh
pnpm --filter diya-site dev:frame
```

Then `/screens-frame?screen=sign-in&theme=dark&glass=0` is the bare page
(`&poster=1` for a poster). The gallery's thumbnails come from the built frame
with `pnpm --filter diya-site screens:thumbs` (see `scripts/README.md`).

## Checks

From the repository root, after building the package:

```sh
pnpm --filter diya-site typecheck
pnpm --filter diya-site test:catalog
pnpm --filter diya-site test:lib
pnpm --filter diya-site test:scripts
pnpm --filter diya-site build
pnpm --filter diya-site verify:production
pnpm --filter diya-site check:snippets   # Get code files and every screen, with strict tsc
```

The waitlist's environment is in `db/ENV.md`.

# DIYA site scripts

Small Node tools for the DIYA site. They use only Node's standard library, so there is nothing to install. Use Node 22.12+.

```sh
pnpm --filter diya-site test:scripts
```

## Production gates

`verify-production-gates.mjs` starts the existing production build on a free loopback port, once with the catalog off, once with it on, and once past the launch moment, and checks status codes, indexing metadata, the countdown's launch route, the launch card and the brand assets. The retired ZIP routes (`/api/preview-*`) must not exist in any mode, and must not appear in the build's route table. Build first, then run it:

```sh
pnpm --filter @idyeah/diya build
pnpm --filter diya-site build
pnpm --filter diya-site verify:production
```

## Get code snippets

`check-snippets.mjs` type-checks every Get code "complete file", and every Screens file in `screens/`, against the SDK's types, with the real `tsc` (screens also against `lucide-react`). Pass `--sdk <dist>` to check against another build, such as `packages/diya/dist`.

## Screens thumbnails

`screens-thumbnails.mjs` renders the Screens gallery's thumbnails from the built preview frame: every ready screen and every poster, rendered at 1120×700 and saved at 896×560 in Light and Dark, as compact JPEGs in `public/screens/thumbs/`. Each capture waits until the screen is truly ready: nothing `aria-busy`, no skeletons, charts drawn, images and fonts loaded, and the page quiet for a moment. A screen that never gets there is still captured, but the run names it and exits with an error, so look at those by eye. It serves `public/` itself on port 3106 (`--port` to change it). Playwright isn't a dependency of this repo, so point the script at a copy:

```sh
pnpm --filter diya-site build:frame
PLAYWRIGHT=<path to the playwright package> pnpm --filter diya-site screens:thumbs
```

`--only sign-in,team` renders just those; `--all` adds screens still being built, and `--out <dir>` writes elsewhere, to check the pipeline without touching `public/`.

## Fonts

`fonts/build-diya-sans.py` rebuilds the DIYA Sans files in `packages/diya/src/fonts` from their sources.

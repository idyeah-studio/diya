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

`check-snippets.mjs` type-checks every Get code "complete file" against the SDK's types, with the real `tsc`. Pass `--sdk <dist>` to check against another build, such as `packages/diya/dist`.

## Fonts

`fonts/build-diya-sans.py` rebuilds the DIYA Sans files in `packages/diya/src/fonts` from their sources.

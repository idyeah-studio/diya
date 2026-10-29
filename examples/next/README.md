# Next.js example: Server Components

A one-page Next.js App Router app that checks DIYA works with Server
Components. CI builds it on React 18 and 19.

- `app/page.tsx` is a Server Component. It renders DIYA components with plain
  props and reads `defaultMessages` on the server.
- `app/providers.tsx` starts with `'use client'` and wraps the page in
  `DiyaProvider`. Put the provider in a client file like this when you pass it
  functions, such as a translated `messages` entry.
- `app/layout.tsx` imports `@idyeah/diya/styles.css` once.

## Run it

From the repository root:

```sh
pnpm install
pnpm build
pnpm --filter ./examples/next build
pnpm --filter ./examples/next start
```

Open http://127.0.0.1:3024. `pnpm build` builds the package first, since the
example uses its built output.

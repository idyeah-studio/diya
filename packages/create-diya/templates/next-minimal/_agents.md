# Notes for coding agents

This is a Next.js (App Router) app built with DIYA (`@idyeah/diya`), a React
component library. Reach for a DIYA component or pattern before writing your
own, and read DIYA's docs before guessing at props.

## Where DIYA's docs live

- https://diya13.ai/llms.txt: a short index of every component and pattern.
- https://diya13.ai/llms-full.txt: all of it, with props and examples, in one file.
- `node_modules/@idyeah/diya/dist/api.json`: every prop, type, default and token,
  exact for the installed version, and readable offline.
- DIYA's MCP server, https://diya13.ai/mcp, looks up components, props,
  complete files and theming while you write. Read-only, no account. `.mcp.json`
  in this folder already connects Claude Code. Elsewhere:
  - Claude Code: `claude mcp add --transport http diya https://diya13.ai/mcp`
  - Cursor: `{ "mcpServers": { "diya": { "url": "https://diya13.ai/mcp" } } }`
    in `.cursor/mcp.json`

## How this app is wired

- `app/providers.tsx` wraps the app in `DiyaProvider`. Change the brand there with
  `brandColor`; don't override the accent tokens by hand.
- `app/globals.css` names the CSS layer order, then imports DIYA's styles. Keep
  that `@layer` line first. Adding Tailwind v4? The order is already right:
  put `@import "tailwindcss";` above the DIYA import.
- Anything with a handler (`onClick`, `onValueChange`, a Table column's `render`)
  goes in a file that starts with `'use client'`. Plain props render fine from a
  Server Component.
- `href` on Button, Menu, Breadcrumbs and Side Navigation goes through Next.js
  `Link`, set once as `linkComponent` on the provider.

## Conventions

- Lay out with `Stack` (a column) and `Inline` (a row) and their `gap`, which
  takes DIYA's scale from 0 to 8 (0 to 64px), before writing layout CSS.
- Style with `className` or `style`. DIYA's CSS sits in `@layer diya`, so yours wins.
- Don't depend on `.diya-*` class names or DOM structure; semver doesn't cover them.

## Commands

- `{{dev}}`: start on http://localhost:3000
- `{{build}}`: production build, which also type-checks

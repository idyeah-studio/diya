# Notes for coding agents

This is a Next.js (App Router) invoicing app built with DIYA
(`@idyeah/diya`), a React component library. Reach for a DIYA component or
pattern before writing your own, and read DIYA's docs before guessing at props.

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

- `app/providers.tsx` wraps the app in `DiyaProvider`, with Next.js `Link` as
  `linkComponent`. The default look (theme, brand color, Glass) is set there;
  Settings changes it live. Change the brand with `brandColor`; don't override
  the accent tokens by hand.
- `components/Shell.tsx` is the frame around every screen. Each screen is a
  folder in `app/` with a small `page.tsx` and a client component beside it.
- `lib/` holds the sample data and the store. Replace them with your own data
  layer; the screens only read and call what the store exposes.
- Anything with a handler (`onClick`, `onValueChange`, a Table column's `render`)
  goes in a file that starts with `'use client'`.

## Conventions

- Lay out with `Stack` (a column) and `Inline` (a row) and their `gap`, which
  takes DIYA's scale from 0 to 8 (0 to 64px), before writing layout CSS.
- Style with `className` or `style`. DIYA's CSS sits in `@layer diya`, so yours wins.
- Don't depend on `.diya-*` class names or DOM structure; semver doesn't cover them.

## Commands

- `{{dev}}`: start on http://localhost:3000
- `{{build}}`: production build, which also type-checks

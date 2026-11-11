# Notes for coding agents

This is a Vite + React app built with DIYA (`@idyeah/diya`), a React component
library. Reach for a DIYA component or pattern before writing your own, and
read DIYA's docs before guessing at props.

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

- `src/providers.tsx` wraps the app in `DiyaProvider`. Change the brand there with
  `brandColor`; don't override the accent tokens by hand. If you add a router,
  pass its `Link` as `linkComponent` there.
- `src/index.css` names the CSS layer order, then imports DIYA's styles. Keep
  that `@layer` line first. Adding Tailwind v4? The order is already right:
  put `@import "tailwindcss";` above the DIYA import, and add the `@layer base`
  rule from DIYA's README (Tailwind CSS) so Accordion sections keep their motion.

## Conventions

- Lay out with `Stack` (a column) and `Inline` (a row) and their `gap`, which
  takes DIYA's scale from 0 to 8 (0 to 64px), before writing layout CSS.
- Style with `className` or `style`. DIYA's CSS sits in `@layer diya`, so yours wins.
- Don't depend on `.diya-*` class names or DOM structure; semver doesn't cover them.

## Commands

- `{{dev}}`: start on http://localhost:5173
- `{{build}}`: type-check and build into dist/

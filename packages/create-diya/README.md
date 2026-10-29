# create-diya

Start a React app with [DIYA](https://diya13.ai), running in about a minute.

```sh
npm create diya@latest
# pnpm create diya · yarn create diya · bun create diya
```

It asks four things: a name, where to start (Minimal, or Dashboard), Next.js or
Vite, and your brand color. Then it installs with the package manager you ran it
with and tells you the one command left. Dashboard is
[Oriel](https://oriel.diya13.ai), a four-screen invoicing app on Next.js,
so it skips the framework question.

Every app comes wired: `DiyaProvider` with `theme="system"` (and Next.js `Link`
as `linkComponent`), DIYA's styles behind a CSS layer order that leaves room for
Tailwind, and notes for your coding agent: `AGENTS.md`, a one-line `CLAUDE.md`,
and `.mcp.json` pointing Claude Code at DIYA's docs server.

## Without questions

With no terminal attached (CI, or a coding agent), or with `--yes`, it asks
nothing and uses the defaults for anything you don't pass.

```sh
npx --yes create-diya@latest my-app --template dashboard --brand "#2F6FEB"
npm create diya@latest my-app -- --framework vite
```

With npm, put `--` before the options. (If you forget, create-diya still works
out what you meant.)

| Option | Values | Default |
| --- | --- | --- |
| `[folder]` | a name, or `.` for an empty current folder | `my-app` |
| `--template` | `minimal`, `dashboard` | `minimal` |
| `--framework` | `next`, `vite` (Dashboard is Next.js only) | `next` |
| `--brand` | a hex color such as `#2F6FEB` | DIYA's near-black |
| `--pm` | `npm`, `pnpm`, `yarn`, `bun` | the one you ran it with |
| `--no-install` | skip the install | installs |
| `--no-agents` | leave out `AGENTS.md`, `CLAUDE.md` and `.mcp.json` | included |
| `-y`, `--yes` | ask nothing | asks, when there's a terminal |

It never writes into a folder that already has files in it. It needs Node 20.19
or newer, which Next.js 16 and Vite 8 need too.

## Working on create-diya

```sh
node --test test/*.test.mjs           # the CLI and the Oriel sync
node scripts/check-templates.mjs      # templates agree with each other
node scripts/sync-oriel.mjs --check   # templates/next-dashboard matches examples/oriel
```

The templates in `templates/` are real apps. CI scaffolds each one against the
freshly packed `@idyeah/diya`, installs it and runs its production build.
`templates/next-dashboard` is generated from `examples/oriel` by
`scripts/sync-oriel.mjs`; edit Oriel, not the copy.

MIT licensed.

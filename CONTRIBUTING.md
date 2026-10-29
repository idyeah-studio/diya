# Contributing to DIYA

Thanks for helping. Bug reports, fixes, accessibility improvements and docs
corrections are all welcome. For a new component, prop or pattern, please open a
feature request first so we can agree on the shape before you write the code.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Security
problems go through private reporting; see [SECURITY.md](SECURITY.md).

## Setup

You need **Node 22.12 or newer** and **pnpm 10** (the exact version is pinned in
`package.json`; `corepack enable` picks it up).

```sh
git clone https://github.com/idyeah-studio/diya.git
cd diya
pnpm install
pnpm build
```

The repository is a small pnpm workspace:

| Folder                 | What it is                                                         |
| ---------------------- | ------------------------------------------------------------------ |
| `packages/diya`        | The `@idyeah/diya` package: source, styles, fonts and tests        |
| `packages/diya/bench`  | How we measure bundle size, rerunnable (see its README)            |
| `packages/create-diya` | `npm create diya`: the CLI, its templates and their checks         |
| `examples/oriel`       | Oriel, a four-screen app made only from DIYA                       |
| `examples/vite`        | A dashboard built with the package, used as a working check        |
| `examples/next`        | A Next.js App Router smoke test for Server Components              |
| `apps/site`            | diya13.ai: the landing page, the catalog, `/mcp` and `llms.txt`    |
| `scripts`              | Repository checks shared by CI and your machine                    |

`@idyeah/diya` and `create-diya` release together, on one version and one tag.

## Scripts

Run these from the repository root.

| Command                  | What it does                                                     |
| ------------------------ | ---------------------------------------------------------------- |
| `pnpm build`             | Builds the package into `packages/diya/dist`                     |
| `pnpm typecheck`         | Type-checks the package                                          |
| `pnpm test`              | Builds, then runs the package tests (Vitest)                     |
| `pnpm example:vite`      | Builds the Vite example against your local package               |
| `pnpm example:next`      | Builds the Next example against your local package               |
| `pnpm example:oriel`     | Builds Oriel against your local package                          |
| `pnpm test:create`       | Runs create-diya's tests                                         |
| `pnpm check:templates`   | Checks create-diya's templates, and that Dashboard matches Oriel |
| `pnpm sync:oriel`        | Rebuilds create-diya's Dashboard template from `examples/oriel` |
| `pnpm bench`             | Measures bundle size against other libraries (installs to a temp folder) |
| `pnpm lint:package`      | Runs publint and Are the Types Wrong on the package              |
| `pnpm check:tarball`     | Compares each npm tarball with its package's `tarball.snapshot` |
| `pnpm snapshot:tarball`  | Rewrites the snapshots after an intended change to package files |
| `pnpm scan:leaks`        | Scans the repository and the tarball for secrets and stray paths |
| `pnpm build:site`        | Builds the package, then the site against it                     |
| `pnpm typecheck:site`    | Type-checks the site                                             |
| `pnpm test:site`         | Runs the site's tests (build the package first)                  |
| `pnpm verify:site`       | Serves the site's production build and checks its launch gates  |

To work on the dashboard example with live reload:

```sh
pnpm build
pnpm --filter ./examples/vite dev
```

Rebuild the package (`pnpm build`) when you change its source; the examples use
the built output, the same way an app installing from npm would.

create-diya's Dashboard template is generated from `examples/oriel`. Change
Oriel, then run `pnpm sync:oriel` and commit both. Code that only the live
demo needs (its "View this screen's source" bar, for example) carries an
`@demo-only` comment, and the sync leaves it out.

## Tests

Every change to behavior needs a test in `packages/diya/tests`. The tests run
against the built package's public entry points, not the source files, so they
check what people actually install. Good tests here describe what a person
does and sees: they click, type and press keys with Testing Library, and they
look elements up by role and accessible name.

Before you open a pull request, run:

```sh
pnpm typecheck && pnpm test && pnpm lint:package && pnpm check:tarball && pnpm example:vite
pnpm test:create && pnpm check:templates   # if you touched create-diya or Oriel
pnpm test:site && pnpm build:site && pnpm verify:site   # if you touched the site
```

CI runs the same checks, plus the Next example on React 18 and 19, Oriel, the
site, and every create-diya template scaffolded and built against your branch's
package.

The site (`apps/site`) uses the package the way an app installing it from npm
would: pnpm gives it its own copy, refreshed by `pnpm build`, and the site
imports only what the package exports. Until the launch moment in `apps/site/lib/launch.ts`, its home
page is a countdown; see [AGENTS.md](AGENTS.md) before you touch it.

## Craft rules

DIYA has a few house rules. Reviews will ask about them, so it saves time to
check them first.

- **Readable text.** No reader-facing text below 13px, including captions,
  badges, helper text and chart labels.
- **No native `title` tooltips.** Use DIYA's `Tooltip` component for hover and
  focus hints. Native tooltips cannot be styled, are slow to appear, and do not
  show up for keyboard or touch users.
- **No colored left-edge bars** on cards, alerts, list items or tiles. Show
  tone with the icon, the surface color or the text instead.
- **Three appearances.** Check every visual change in Light, Dark and Glass.
  Use the public tokens (`--diya-*`) rather than fixed colors, and keep text
  contrast at WCAG AA or better in all three.
- **Small screens.** Check at 320px wide. Nothing should overflow sideways or
  hide content that is not reachable another way.
- **Accessibility.** Everything works with a keyboard alone, with a visible
  focus ring. Use native elements where they exist, give every control an
  accessible name, keep focus where people expect it when popups open and
  close, and respect `prefers-reduced-motion`.
- **Plain words.** Default labels and messages are short and plain. New
  user-facing strings go through the message catalog so people can translate
  them.

## Public API and versioning

DIYA follows [semantic versioning](https://semver.org). These are covered, so
breaking them needs a major release:

- entry points and export names, both values and types;
- prop names, types, whether they are required, defaults, and controlled pairs
  (such as `value` with `onValueChange`);
- documented keyboard and accessibility behavior;
- `DiyaProvider` props;
- public token names and what they mean (their values may change in a minor
  release);
- message keys and their arguments;
- `api.json` within `schemaVersion: 1`, where only additions are allowed;
- peer dependency ranges.

These are **not** covered and may change in any release:

- `.diya-*` class names and the DOM structure;
- `--diya-internal-*` custom properties;
- file paths inside `dist`;
- anything marked `"stability": "experimental"` in `api.json`.

If your pull request changes covered API, say so in the description.

## Sign your commits (DCO)

We use the [Developer Certificate of Origin](https://developercertificate.org).
It is a short statement that you wrote the change, or have the right to submit
it, under the project's license. You agree to it by adding a `Signed-off-by`
line to each commit:

```sh
git commit -s -m "Fix Select focus after clearing"
```

That adds `Signed-off-by: Your Name <you@example.com>`, using the name and
email in your git config. Forgot? `git commit --amend -s` fixes the last
commit, and `git rebase --signoff main` fixes a whole branch.

## Pull requests

- Keep each pull request to one change. Small ones get reviewed faster.
- Fill in the checklist in the template.
- If the package contents change on purpose (a new file in `dist`), run
  `pnpm snapshot:tarball` and commit the updated snapshot.
- Do not bump the version or edit the changelog; that happens at release.

Contributions are released under the [MIT License](LICENSE). The DIYA Sans font
files are under the SIL Open Font License; see [NOTICE](NOTICE).

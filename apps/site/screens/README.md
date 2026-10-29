# Screens: the contract for every screen file

A Screen is one complete page that a reader copies into their own app. The file
`apps/site/screens/<id>.tsx` is the single source:

- the site previews exactly this file;
- Get code hands out exactly this file's text;
- the tests compile this file on its own.

If a rule below and a screen disagree, the screen is wrong.

## The file

- **One file per screen**, named `<id>.tsx`, where `<id>` is the kebab-case id
  in `components/screens/screens-data.ts`.
- **Its first lines** are, in order:
  1. `'use client'`
  2. `// <Display name>: a DIYA screen. Install: npm i @idyeah/diya lucide-react`,
     with ` echarts@6` appended when the file imports `@idyeah/diya/charts`. The
     display name is the registry's `name`, such as `Sign in`.
  3. `// Next.js: save as app/<route>/page.tsx. Vite: save as src/<FileName>.tsx and render it inside your DiyaProvider.`
     `<FileName>` is the PascalCase name, such as `SignIn`.
- **Imports come only from** `react`, `@idyeah/diya`, `@idyeah/diya/charts` (only
  for charts) and `lucide-react`. No `next/*`, no relative imports, no CSS
  imports, and no other packages.
- **There is exactly one export:** `export default function <FileName>Screen()`. Types
  and helpers stay private to the file.
- **No `DiyaProvider` in the file.** The reader's app already has one (Get code,
  step 2), and the site's preview frame supplies it.
- **Icons are Lucide only.** Wrap the screen in
  `<LucideProvider size={18} strokeWidth={1.6}>` so Lucide matches DIYA's own
  line icons. Pass `size` on a single icon only when the layout truly needs it.
- **Styles** live in one `const css = \`...\`` at the bottom of the file,
  rendered as the first child: `<style>{css}</style>`.
  - Every class name starts with the screen id (`.sign-in-card`,
    `.sign-in-footer`), so two screens on one site never collide.
  - Use DIYA's tokens (`var(--diya-color-*)`, `var(--diya-text-*)`,
    `--diya-corner-scale`, the spacing DIYA's own components use). Hard-coded
    colors are only allowed where a brand's rules require them (the Google
    "G").
  - Media queries are fine, because a screen is a whole page. A full-page screen
    sets `min-height: 100dvh` on its root.
  - Don't restyle DIYA components' internals (`.diya-*`). Compose them; style
    only your own layout.
- **Keep it readable.** Aim for under about 600 lines. Sample data goes in
  `const`s at the top. A short comment marks each place a reader will change
  (data, API calls); nothing else gets commented.

## The design bar

The bar is premium the way Apple is: clean, calm and generous with whitespace.
The approved reference is the Sign in screen, `sign-in.tsx`. Match its craft.

- **Whitespace:** generous outer margins and roomy space between groups. Give
  each view one clear focal point. Hierarchy comes from type, size and space,
  not from boxes, borders or color.
- **Containers:** few of them. Don't put cards inside cards, and use dividers
  only where they truly separate.
- **Color:** true neutrals. Color carries meaning (status, the one primary
  action), never decoration.
- **Data-heavy screens** (dashboards, tables, inboxes) keep that whitespace
  around and between sections, but rows stay compact enough to scan.
- **Alignment:** align to one grid, so edges line up and spacing repeats in a
  rhythm. Nothing should look nudged.

## What it must get right

- **Words.** US spelling, plain words and sentence case. No lorem ipsum.
  - People, companies and products are invented. Emails use `example.com`. No
    real person, company, street address or phone number.
  - The voice is slightly engaging, with light humor where it helps, never
    marketing-cheery.
- **Size, tooltips, edges.** No reader-facing text under 13px, no native `title`
  attributes, and no colored left-edge bars on cards, alerts or tiles.
- **Accessibility.**
  - One `<h1>`, plus landmarks where they fit (`main`, `nav`, `header`, `aside`).
  - Every control is labeled, and icon-only buttons have an `aria-label`.
  - Lucide icons are hidden from screen readers by default; keep them
    decorative.
  - Visible focus (DIYA's), and everything is reachable by keyboard.
  - Color is never the only signal.
  - When a step or view changes, focus moves to its heading. Results are
    announced (DIYA's Alert or a polite live region).
  - Fields use the right `autoComplete`, `inputMode` and `type`.
- **Appearance and width.** It looks right in Light, Dark and on Glass, where the
  preview paints a photo backdrop. It works from 320px to 1920px wide with no
  horizontal page scroll.
- **States are reachable by interacting**, not by preview-only switches.
  - Every action that would call a server is a clearly marked stub
    (`// Replace with your API call`). It waits a moment and can fail in a
    documented, natural way (for example, the password `wrong`).
  - Loading, empty, error and success states are all reachable.
  - The registry's `tryThis` line tells readers how to reach them.
- **Brand logos.**
  - Only the official Google "G" and GitHub mark, only on sign-in and sign-up,
    drawn inline from the official artwork, never recolored or reshaped.
  - Next to them, add a one-line comment: they're trademarks of their owners,
    not covered by DIYA's MIT license, and must follow each brand's guidelines
    (link both).
  - Card networks and integrations use text and monograms, never logos.

## How it's checked

- `tests/screens-contract.test.ts` checks:
  - the header lines, and that the install line matches whether the file
    uses charts;
  - the import allowlist and the single default export;
  - no `DiyaProvider`, and the `LucideProvider` is there;
  - no `title=`;
  - no `font-size` under 13px in the css;
  - class-name prefixes.
- `tests/screens-compile.test.ts` compiles each file on its own with strict
  `tsc` (unused locals and parameters, `verbatimModuleSyntax`), against the
  built `@idyeah/diya` and `lucide-react`.
- Before a screen is marked ready, it's also checked by eye:
  - in the preview at 1440×900 and 390×844, in Light, Dark and Glass;
  - pasted into a fresh `npm create diya` app, both Next.js and Vite.

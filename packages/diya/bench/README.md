# Bundle size: how we measure it

When we say one DIYA Button with its provider adds **2.3 KB** of gzipped
JavaScript, this is where the number comes from. You can rerun it in about a
minute, and change anything you don't agree with.

```sh
pnpm build                          # the package, so there's something to pack
node bench/measure.mjs              # DIYA, packed from this folder, plus Radix Themes, shadcn, Mantine and MUI
node bench/measure.mjs --only diya  # just DIYA, which is quicker
node bench/measure.mjs --diya 1.0.0 # a published version instead (any npm spec, or a .tgz path)
```

It installs everything into a temporary folder and deletes it afterwards
(`--keep` leaves it so you can look), so none of these libraries go near this
repository or its lockfile. You need Node 22 and npm, and network access for
the install.

## The method

- **Build:** a fresh Vite 7.3.7 + React 19.3.1 app, production build, with
  Rollup and esbuild pinned (Rollup 4.64.12, esbuild 0.28.2), because their
  output moves between releases. Every version is in `measure.mjs`.
- **What's measured:** each file in `variants/` becomes `src/main.tsx`, one
  build at a time. Each renders the smallest real use of a library: a Button,
  then a Button and a Table.
- **The number:** the `gzip -9 -n` size of all the JavaScript Vite writes,
  minus the same for a page that renders a plain `<button>` with React alone.
  DIYA's variants render inside `StrictMode`, so they're compared with a
  `StrictMode` baseline; the others don't, so they're compared with a plain one.
  Node's zlib comes out about 0.1% bigger than the gzip tool, so the script
  uses the tool when it can and says which one it used.
- **Providers count.** DIYA is measured with `DiyaProvider`, Mantine with
  `MantineProvider` and Radix Themes with `Theme`. MUI needs neither. We also
  show DIYA's Button without its provider, but don't compare that number with
  the others.
- **shadcn** is its stock Button recipe (Slot, cva, clsx and tailwind-merge).
  Tailwind's own CSS isn't counted.
- **CSS is shown, not added in.** DIYA's styles are all or nothing: one file,
  16.8 KB gzipped, however many components you use.

## Latest results

`@idyeah/diya` 1.0.0 on Node 22.23, measured with `gzip -9 -n`.

| Variant | JS, gzip | Added JS, gzip | CSS, gzip |
| --- | ---: | ---: | ---: |
| React alone, in StrictMode | 69.0 KB | · | · |
| React alone | 69.0 KB | · | · |
| DIYA Button, with DiyaProvider | 71.4 KB | +2.3 KB | 16.8 KB |
| DIYA Button, no provider | 69.9 KB | +0.8 KB | 16.8 KB |
| DIYA Stack, TextInput and Button | 73.3 KB | +4.2 KB | 16.8 KB |
| DIYA Button and Table | 79.1 KB | +10.1 KB | 16.8 KB |
| All of DIYA (import *) | 99.2 KB | +30.2 KB | 16.8 KB |
| Radix Themes Button, with Theme | 76.7 KB | +7.7 KB | 80.6 KB |
| shadcn's Button recipe (Tailwind's CSS not counted) | 79.6 KB | +10.6 KB | · |
| Mantine Button, with MantineProvider | 84.5 KB | +15.5 KB | 36.2 KB |
| MUI Button | 106.2 KB | +37.1 KB | · |
| Radix Themes Button and Table | 82.8 KB | +13.8 KB | 80.6 KB |
| Mantine Button and Table | 91.0 KB | +22.0 KB | 36.2 KB |
| MUI Button, Table and pagination | 147.0 KB | +78.0 KB | · |

What this doesn't show: the DIYA Sans font is 140 KB as woff2 (the italic,
148 KB, loads only if you use italics), and isn't downloaded at all when you set
`fontFamily`. The charts' ECharts is an optional peer dependency, measured
separately because it's heavy.

Think the method is unfair to someone? Open an issue with the variant you'd
write instead, and we'll rerun it.

# {{name}}

A small invoicing app on Next.js, built only from
[DIYA](https://diya13.ai) components. It has four screens (Overview,
Invoices, Customers and Settings), sample data, and no sign-in. Make it yours.

```sh
{{dev}}
```

Then open http://localhost:3000.

- `app/providers.tsx` holds the DIYA provider: Light or Dark, your brand color,
  Glass, and Next.js `Link`. Settings changes the look live and remembers it in
  this browser.
- `lib/brand.tsx` holds the app's name and wordmark in one place: put your own
  name there and the sidebar, page titles and metadata follow.
  Its `backdrop` takes an image URL for Glass to blur, calmed so labels stay
  readable.
- `components/Shell.tsx` is the frame: side navigation on wide screens, a header
  with a menu on narrow ones.
- `lib/` holds the sample data and the in-memory store. Swap them for your own API
  and the screens keep working.

Docs: [components](https://diya13.ai/explore?area=components) ·
[patterns](https://diya13.ai/explore?area=patterns) ·
[for coding agents](https://diya13.ai/llms.txt)

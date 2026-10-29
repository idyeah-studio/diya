// Oriel, DIYA's reference app: a small invoicing app made only from DIYA.
// It's its own Vercel project, so these are plain external links.
export const ORIEL_URL = 'https://oriel.diya13.ai'
export const ORIEL_SOURCE_URL = 'https://github.com/idyeah-studio/diya/tree/main/examples/oriel'

export type OrielScreen = { name: string; href: string; shows: string }

export const ORIEL_SCREENS = {
  overview: { name: 'Overview', href: `${ORIEL_URL}/`, shows: 'Metrics, a bar chart and a list of invoices that need a nudge.' },
  invoices: {
    name: 'Invoices',
    href: `${ORIEL_URL}/invoices`,
    shows: 'A table with search, filters and bulk actions, a delete confirm and two drawers.',
  },
  customers: { name: 'Customers', href: `${ORIEL_URL}/customers`, shows: 'Cards with search, pill tabs and a menu on each.' },
  settings: {
    name: 'Settings',
    href: `${ORIEL_URL}/settings`,
    shows: 'A react-hook-form form, and the theme, brand color and Glass changed live.',
  },
} satisfies Record<string, OrielScreen>

/** The Oriel screen that shows each catalog pattern working, by pattern id. */
export const ORIEL_SCREEN_FOR_PATTERN: Record<string, OrielScreen> = {
  'page-header': ORIEL_SCREENS.overview,
  'side-navigation': ORIEL_SCREENS.overview,
  'data-viz': ORIEL_SCREENS.overview,
  table: ORIEL_SCREENS.invoices,
  dialog: ORIEL_SCREENS.invoices,
  drawer: ORIEL_SCREENS.invoices,
  card: ORIEL_SCREENS.customers,
  'empty-state': ORIEL_SCREENS.customers,
  form: ORIEL_SCREENS.settings,
}

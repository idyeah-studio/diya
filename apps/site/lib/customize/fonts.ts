/** The 17 faces the customizer offers. Self-hosted ones ship with their OFL licence;
    DIYA Sans, the default, ships inside the SDK itself. */
export type CatalogFont = {
  label: string
  family: string
  asset?: string
  weight?: string
  unicode?: string
}
export const catalogFonts = {
  inter: {
    label: 'Inter',
    family: '"DIYA Inter", sans-serif',
    asset: 'inter',
    weight: '100 900',
    unicode:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  manrope: {
    label: 'Manrope',
    family: '"DIYA Manrope", sans-serif',
    asset: 'manrope',
    weight: '200 800',
    unicode:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  'dm-sans': {
    label: 'DM Sans',
    family: '"DIYA DM Sans", sans-serif',
    asset: 'dm-sans',
    weight: '100 1000',
    unicode:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  'plus-jakarta-sans': {
    label: 'Plus Jakarta Sans',
    family: '"DIYA Plus Jakarta Sans", sans-serif',
    asset: 'plus-jakarta-sans',
    weight: '200 800',
    unicode:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  outfit: {
    label: 'Outfit',
    family: '"DIYA Outfit", sans-serif',
    asset: 'outfit',
    weight: '100 900',
    unicode:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  'space-grotesk': {
    label: 'Space Grotesk',
    family: '"DIYA Space Grotesk", sans-serif',
    asset: 'space-grotesk',
    weight: '300 700',
    unicode:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  'work-sans': {
    label: 'Work Sans',
    family: '"DIYA Work Sans", sans-serif',
    asset: 'work-sans',
    weight: '100 900',
    unicode:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  figtree: {
    label: 'Figtree',
    family: '"DIYA Figtree", sans-serif',
    asset: 'figtree',
    weight: '300 900',
    unicode:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  'source-sans-3': {
    label: 'Source Sans 3',
    family: '"DIYA Source Sans 3", sans-serif',
    asset: 'source-sans-3',
    weight: '200 900',
    unicode:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  lora: {
    label: 'Lora',
    family: '"DIYA Lora", serif',
    asset: 'lora',
    weight: '400 700',
    unicode:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  'source-serif-4': {
    label: 'Source Serif 4',
    family: '"DIYA Source Serif 4", serif',
    asset: 'source-serif-4',
    weight: '200 900',
    unicode:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  'roboto-mono': {
    label: 'Roboto Mono',
    family: '"DIYA Roboto Mono", monospace',
    asset: 'roboto-mono',
    weight: '100 700',
    unicode:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  'diya-sans': { label: 'DIYA Sans', family: '"DIYA Sans", "DIYA Sans Fallback", Arial, sans-serif' },
  sans: { label: 'Arial', family: 'Arial, Helvetica, sans-serif' },
  system: {
    label: 'System sans',
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },
  serif: { label: 'Georgia', family: 'Georgia, "Times New Roman", serif' },
  mono: {
    label: 'System mono',
    family: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
} as const satisfies Record<string, CatalogFont>
export function fontFaceCss(id: keyof typeof catalogFonts, baseUrl = '/fonts/customize/') {
  const font: CatalogFont = catalogFonts[id]
  if (!font.asset) return ''
  const family = font.family.split(',')[0]
  return `@font-face { font-family: ${family}; font-style: normal; font-display: swap; font-weight: ${font.weight}; src: url('${baseUrl}${font.asset}.woff2') format('woff2'); unicode-range: ${font.unicode}; }`
}

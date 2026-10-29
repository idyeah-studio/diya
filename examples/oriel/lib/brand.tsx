// The app's name and logo. BRAND_ID picks the brand, and every visible name
// follows: the sidebar wordmark, page titles, metadata, the demo note, toasts and
// the CSV name. The browser-tab icons are app/favicon.ico, app/icon1.png (16px),
// app/icon2.png and app/icon3.png, and app/apple-icon.png; swap them with the mark.
import type { CSSProperties } from 'react'

export type BrandId = 'oriel' | 'lumora' | 'solvi'

/** The brand the app wears. */
export const BRAND_ID: BrandId = 'oriel'

// backdrop: an image for Glass to blur, e.g. '/backdrop.jpg' in public/ (calmed in app/oriel.css).
export const BRANDS: Record<BrandId, { name: string; slug: string; idea: string; backdrop?: string }> = {
  oriel: { name: 'Oriel', slug: 'oriel', idea: 'An oriel is a window that lets light in. The dot of the i is that light, and the word ends on DIYA’s own tailed l.' },
  lumora: { name: 'Lumora', slug: 'lumora', idea: 'From lumen, light. The mark is rim light, the bright edge where light catches a sphere.' },
  solvi: { name: 'Solvi', slug: 'solvi', idea: 'From sol, the sun. The dot of the i is a small sun; alone, it rises over the horizon.' },
}

export const BRAND = BRANDS[BRAND_ID]

/* Warm Vivid stops: amber into orange into a coral rose. */
const WARM = ['#ffd27a', '#ff9f0a', '#ff5a3c']

/*
 * Oriel: lowercase "oriel" in DIYA Sans (width 112, weight 470), drawn as
 * outlines with its tracking and r–i kerning built in, so it reads the same
 * without the font. The letters take the text color (currentColor); the dot of
 * the i is a true circle of warm light, colored by .wm-dot in the app's CSS.
 */
const ORIEL_VIEWBOX = '34 -733.8 2045 742.8'
const ORIEL_INK =
  'M314.0 9Q251.0 9 199.5 -9.5Q148.0 -28 111.0 -64.0Q74.0 -100 54.0 -150.0Q34.0 -200 34.0 -263Q34.0 -346 68.5 -407.0Q103.0 -468 166.0 -502.0Q229.0 -536 314.0 -536Q377.0 -536 428.5 -517.5Q480.0 -499 517.0 -463.0Q554.0 -427 574.0 -376.5Q594.0 -326 594.0 -263Q594.0 -182 559.5 -120.5Q525.0 -59 462.5 -25.0Q400.0 9 314.0 9ZM314.0 -74Q368.0 -74 407.5 -96.5Q447.0 -119 469.0 -161.5Q491.0 -204 491.0 -263Q491.0 -307 479.0 -342.5Q467.0 -378 443.5 -402.5Q420.0 -427 387.5 -440.0Q355.0 -453 314.0 -453Q260.0 -453 220.0 -430.5Q180.0 -408 158.0 -365.5Q136.0 -323 136.0 -263Q136.0 -219 148.5 -184.0Q161.0 -149 184.0 -124.5Q207.0 -100 240.0 -87.0Q273.0 -74 314.0 -74ZM687.0 0V-527H779.0L784.0 -433H788.0Q805.0 -482 846.5 -508.5Q888.0 -535 942.0 -535Q954.0 -535 964.0 -534.0Q974.0 -533 982.0 -532V-437Q974.0 -439 963.0 -439.5Q952.0 -440 941.0 -440Q896.0 -440 863.0 -424.0Q830.0 -408 811.0 -376.5Q792.0 -345 789.0 -299V0ZM1069.0 0V-527H1171.0V0ZM1538.0 9Q1453.0 9 1392.0 -24.5Q1331.0 -58 1298.5 -119.0Q1266.0 -180 1266.0 -261Q1266.0 -346 1298.5 -407.5Q1331.0 -469 1391.5 -502.5Q1452.0 -536 1536.0 -536Q1625.0 -536 1685.5 -499.5Q1746.0 -463 1774.0 -397.5Q1802.0 -332 1796.0 -244H1368.0Q1370.0 -186 1391.0 -147.0Q1412.0 -108 1450.5 -88.0Q1489.0 -68 1540.0 -68Q1599.0 -68 1639.5 -92.5Q1680.0 -117 1692.0 -158H1791.0Q1782.0 -106 1747.0 -68.5Q1712.0 -31 1658.0 -11.0Q1604.0 9 1538.0 9ZM1368.0 -299 1360.0 -311H1703.0L1694.0 -299Q1695.0 -353 1675.5 -389.0Q1656.0 -425 1620.0 -443.0Q1584.0 -461 1536.0 -461Q1486.0 -461 1449.0 -441.5Q1412.0 -422 1391.5 -386.0Q1371.0 -350 1368.0 -299ZM1997.0 0Q1959.0 0 1934.5 -12.0Q1910.0 -24 1898.0 -48.5Q1886.0 -73 1886.0 -110V-729H1988.0V-129Q1988.0 -101 1999.5 -91.5Q2011.0 -82 2033.0 -82H2079.0V0Z'
const ORIEL_DOT =
  'M1184.75 -670.0C1184.75 -705.20815279975 1156.20815279975 -733.75 1121.0 -733.75C1085.79184720025 -733.75 1057.25 -705.20815279975 1057.25 -670.0C1057.25 -634.79184720025 1085.79184720025 -606.25 1121.0 -606.25C1156.20815279975 -606.25 1184.75 -634.79184720025 1184.75 -670.0Z'

function OrielWord() {
  return (
    <svg viewBox={ORIEL_VIEWBOX} className="wm-word" aria-hidden="true" focusable="false">
      <path fill="currentColor" d={ORIEL_INK} />
      <path className="wm-dot" d={ORIEL_DOT} />
    </svg>
  )
}

/** Oriel's monogram: "Or" on an ink tile, the app icon from 32px up. */
function OrielTile() {
  return (
    <svg viewBox="0 0 32 32" className="mark-tile" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7.52" fill="#17171A" />
      <path
        fill="#F6F5F1"
        transform="translate(5.859 21.976) scale(0.01640)"
        d="M414.0 9Q327.0 9 256.5 -17.0Q186.0 -43 136.0 -92.0Q86.0 -141 59.5 -210.0Q33.0 -279 33.0 -365Q33.0 -451 59.5 -519.5Q86.0 -588 136.0 -637.0Q186.0 -686 256.5 -712.0Q327.0 -738 414.0 -738Q502.0 -738 572.0 -712.0Q642.0 -686 692.0 -637.0Q742.0 -588 768.5 -519.5Q795.0 -451 795.0 -365Q795.0 -278 768.5 -209.0Q742.0 -140 691.5 -91.5Q641.0 -43 571.0 -17.0Q501.0 9 414.0 9ZM414.0 -99Q491.0 -99 546.5 -130.5Q602.0 -162 632.5 -221.0Q663.0 -280 663.0 -365Q663.0 -428 645.5 -477.5Q628.0 -527 595.5 -561.0Q563.0 -595 517.0 -612.5Q471.0 -630 414.0 -630Q338.0 -630 282.0 -599.0Q226.0 -568 195.5 -509.0Q165.0 -450 165.0 -365Q165.0 -301 182.5 -251.5Q200.0 -202 232.5 -168.0Q265.0 -134 311.0 -116.5Q357.0 -99 414.0 -99ZM893.0 0V-531H1004.0L1010.0 -440H1015.0Q1032.0 -488 1072.5 -513.0Q1113.0 -538 1166.0 -538Q1177.0 -538 1187.0 -537.5Q1197.0 -537 1204.0 -536V-422Q1196.0 -423 1185.5 -424.0Q1175.0 -425 1164.0 -425Q1119.0 -425 1086.5 -409.5Q1054.0 -394 1036.0 -363.0Q1018.0 -332 1016.0 -287V0Z"
      />
    </svg>
  )
}

/** Lumora: rim light, the bright edge where light catches a sphere. */
function Halo({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 100 100" className="wm-halo" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={WARM[2]} />
          <stop offset="0.55" stopColor={WARM[1]} />
          <stop offset="1" stopColor={WARM[0]} />
        </linearGradient>
      </defs>
      <path fillRule="evenodd" fill={`url(#${id}-g)`} d="M50 4a46 46 0 1 1 0 92a46 46 0 1 1 0-92ZM57 6a37 37 0 1 0 0 74a37 37 0 1 0 0-74Z" />
    </svg>
  )
}

/** Solvi: a small sun; on its own, rising over the horizon. */
function Sun({ id, className = 'wm-sun', horizon = false }: { id: string; className?: string; horizon?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={WARM[0]} />
          <stop offset="1" stopColor={WARM[2]} />
        </linearGradient>
      </defs>
      {horizon ? (
        <>
          <path d="M14 70a36 36 0 0 1 72 0Z" fill={`url(#${id}-g)`} />
          <rect x="6" y="78" width="88" height="8" rx="4" fill={WARM[1]} />
        </>
      ) : (
        <circle cx="50" cy="50" r="50" fill={`url(#${id}-g)`} />
      )}
    </svg>
  )
}

/** The wordmark, sized by its font size. The name is the accessible text; the marks are decorative. */
/** `uid` keeps gradient ids unique when the same wordmark renders twice on a page. */
export function Wordmark({ brand = BRAND_ID, size = 20, uid = '', style }: { brand?: BrandId; size?: number; uid?: string; style?: CSSProperties }) {
  const key = `wm-${brand}-${size}${uid}`
  const common = { className: `wm wm-${brand}`, style: { fontSize: size, ...style } }
  if (brand === 'oriel') {
    // The outlines spell "oriel". Give the app another name and the sidebar sets
    // that name in the same type instead, so the name changes in one place.
    const { name } = BRANDS.oriel
    return (
      <span {...common} role="img" aria-label={name}>
        {name === 'Oriel' ? <OrielWord /> : <span aria-hidden="true">{name}</span>}
      </span>
    )
  }
  if (brand === 'lumora')
    return (
      <span {...common} role="img" aria-label="Lumora">
        <Halo id={key} />
        <span aria-hidden="true">lumora</span>
      </span>
    )
  return (
    <span {...common} role="img" aria-label="Solvi">
      <span aria-hidden="true">Solv</span>
      <span className="wm-i" aria-hidden="true">
        ı<Sun id={key} />
      </span>
    </span>
  )
}

/** The mark alone, for the app icon and tight spaces. */
export function BrandMark({ brand = BRAND_ID, size = 28 }: { brand?: BrandId; size?: number }) {
  const key = `mk-${brand}-${size}`
  return (
    <span className={`mark mark-${brand}`} style={{ width: size, height: size }} aria-hidden="true">
      {brand === 'oriel' ? <OrielTile /> : brand === 'lumora' ? <Halo id={key} /> : <Sun id={key} className="mark-sun" horizon />}
    </span>
  )
}

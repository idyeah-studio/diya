/** sRGB colour helpers for customization. Hex in, hex out; no CSS parsing. */

export type Rgba = { r: number; g: number; b: number; a: number }

const HEX = /^#([\da-f]{6})([\da-f]{2})?$/i

/** `#RRGGBB` or `#RRGGBBAA` (as the SDK's own line tokens use). */
export function isHex(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value)
}

/** Accepts what people type: optional `#`, three or six digits. */
export function normalizeHex(value: string): string | null {
  let digits = value.trim().replace(/^#/, '')
  if (/^[\da-f]{3}$/i.test(digits)) digits = digits.replace(/./g, (d) => d + d)
  return /^[\da-f]{6}$/i.test(digits) ? '#' + digits.toUpperCase() : null
}

export function parseHex(hex: string): Rgba {
  const m = HEX.exec(hex)
  if (!m) throw new Error(`Not a hex colour: ${hex}`)
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: m[2] ? parseInt(m[2], 16) / 255 : 1 }
}

const channel = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')

export function toHex({ r, g, b, a }: Rgba): string {
  const rgb = '#' + channel(r) + channel(g) + channel(b)
  return (a >= 1 ? rgb : rgb + channel(a * 255)).toUpperCase()
}

/** Paint `top` over an opaque `bottom`. */
export function composite(top: string, bottom: string): string {
  const t = parseHex(top)
  const b = parseHex(bottom)
  return toHex({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 })
}

/** Linear sRGB interpolation, like `color-mix(in srgb, a w%, b)` for opaque colours. */
export function mix(a: string, b: string, weightOfA: number): string {
  const x = parseHex(a)
  const y = parseHex(b)
  const w = Math.min(1, Math.max(0, weightOfA))
  return toHex({ r: x.r * w + y.r * (1 - w), g: x.g * w + y.g * (1 - w), b: x.b * w + y.b * (1 - w), a: x.a * w + y.a * (1 - w) })
}

export function withAlpha(hex: string, alpha: number): string {
  return toHex({ ...parseHex(hex), a: alpha })
}

function luminance(hex: string) {
  const { r, g, b } = parseHex(hex)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG contrast ratio. A translucent foreground is composited onto the background first. */
export function contrast(foreground: string, background: string): number {
  const bg = parseHex(background).a < 1 ? composite(background, '#FFFFFF') : background
  const fg = parseHex(foreground).a < 1 ? composite(foreground, bg) : foreground
  const a = luminance(fg)
  const b = luminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** The more legible of black and white on `fill`, as the SDK's own badges choose. */
export function inkFor(fill: string): string {
  return contrast('#FFFFFF', fill) >= contrast('#000000', fill) ? '#FFFFFF' : '#000000'
}

/** Relative luminance (0 black, 1 white) of an opaque colour. */
export function lightness(hex: string): number {
  const { r, g, b } = parseHex(hex)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/**
 * Move `color` toward `toward` only as far as needed to reach `minimum`
 * contrast against every colour in `against`. Returns `color` unchanged
 * when it already passes, and `toward` if nothing in between does. `passes`
 * replaces the check when readability depends on more than one pair.
 */
export function ensureContrast(color: string, against: string[], minimum: number, toward: string, passes?: (candidate: string) => boolean): string {
  const ok = passes ?? ((c: string) => against.every((bg) => contrast(c, bg) >= minimum))
  if (ok(color)) return color
  for (let step = 1; step <= 40; step++) {
    const candidate = mix(toward, color, step / 40)
    if (ok(candidate)) return candidate
  }
  return toward
}

/**
 * Move `color` toward `toward` as far as possible (up to `limit`) while
 * `keeps` still holds (for muted text: as quiet as it can be while staying
 * readable).
 */
export function softenWhile(color: string, toward: string, keeps: (candidate: string) => boolean, limit = 0.6): string {
  let best = color
  for (let step = 1; step <= 30; step++) {
    const candidate = mix(toward, color, (step / 30) * limit)
    if (keeps(candidate)) best = candidate
    else break
  }
  return best
}

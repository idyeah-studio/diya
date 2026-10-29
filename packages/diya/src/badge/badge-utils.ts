'use client'
export function normalizeHex(value: string): string | null {
  const hex = value.trim().replace(/^#/, '')
  if (/^[\da-f]{3}$/i.test(hex))
    return `#${[...hex]
      .map((x) => x + x)
      .join('')
      .toUpperCase()}`
  return /^[\da-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : null
}
export function badgeForeground(hex: string): '#000000' | '#FFFFFF' {
  const color = normalizeHex(hex) ?? '#808080'
  const channels = [1, 3, 5].map((index) => {
    const value = parseInt(color.slice(index, index + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#FFFFFF'
}
export function countLabel(count: number, maximum: number) {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  const safeMax = Number.isFinite(maximum) ? Math.max(1, Math.floor(maximum)) : 99
  return { count: safeCount, text: safeCount > safeMax ? `${safeMax}+` : String(safeCount) }
}

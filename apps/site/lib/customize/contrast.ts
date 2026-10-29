import { statusNames, themes, type Appearance, type AppearancePath, type Theme } from './appearance'
import type { CustomizeItem } from './registry'
import { composite, contrast } from './color'
import { neutralSet, statusSet } from './tokens'

export type ContrastIssue = {
  theme: Theme
  /** What the person sees, in their words. */
  label: string
  ratio: number
  minimum: number
  /** The setting most likely to fix it. */
  path: AppearancePath
  /** Every setting that takes part in the pair, most likely first. */
  paths: AppearancePath[]
  /** The pair as it renders. */
  foreground: string
  background: string
}

const round = (n: number) => Math.floor(n * 100) / 100
const STATUS_LABEL = { success: 'Success', warning: 'Warning', error: 'Error', info: 'Info' } as const

/**
 * The pairs a customization must keep readable, in both themes, checked
 * against what actually renders. Text needs 4.5:1 (WCAG 1.4.3); control
 * edges and selected marks 3:1 (WCAG 1.4.11). Decorative dividers
 * (`lines`) are exempt, as in the SDK. Derived colours (accent ink, status
 * inks and tones, alert inks) are checked too: a mid-tone fill can leave no
 * legible ink.
 */
export function contrastIssues(appearance: Appearance, item?: CustomizeItem): ContrastIssue[] {
  return contrastPairs(appearance, item).filter((pair) => pair.ratio < pair.minimum)
}

/** Every pair contrastIssues checks, readable or not. */
export function contrastPairs(appearance: Appearance, item?: CustomizeItem): ContrastIssue[] {
  const issues: ContrastIssue[] = []
  /* An item only answers for what it renders; the full library (no item)
     answers for everything. */
  /* Combobox draws its focus ring in the accent, though it has no accent role. */
  const usesAccent = !item || !!item.roles.accent || item.kind === 'pattern' || item.id === 'button' || item.id === 'combobox'
  const usesStatus = !item || !!item.status
  for (const theme of themes) {
    const { text, background, raised, accent } = appearance.colors[theme]
    const n = neutralSet(appearance, theme)
    const color = (role: string) => `colors.${theme}.${role}` as AppearancePath
    const check = (label: string, fg: string, bg: string, minimum: number, path: AppearancePath, ...others: AppearancePath[]) => {
      const ratio = contrast(fg, bg)
      issues.push({ theme, label, ratio: round(ratio), minimum, path, paths: [path, ...others], foreground: fg, background: bg })
    }
    check('Text on the background', text, background, 4.5, color('text'), color('background'))
    check('Text on raised surfaces', text, raised, 4.5, color('text'), color('raised'))
    check('Text on glass surfaces', text, composite(n.glass, background), 4.5, color('text'), color('background'), color('raised'))
    check('Quieter text on raised surfaces', n.muted, raised, 4.5, color('text'), color('raised'), color('background'))
    if (usesAccent) {
      check('Text on the accent', n.accentInk, accent, 4.5, color('accent'))
      check('Accent against the background', accent, background, 3, color('accent'), color('background'))
      check('Accent on raised surfaces', accent, raised, 3, color('accent'), color('raised'))
    }
    check('Field and control edges', composite(n.controlLine, raised), raised, 3, color('text'), color('raised'))
    check('Field and control edges on the background', composite(n.controlLine, background), background, 3, color('text'), color('background'))
    if (!usesStatus) continue
    for (const status of statusNames) {
      const s = statusSet(appearance, theme, status)
      /* Pairs kept from the SDK read as well as the SDK's own: its decision. */
      if (s.sdkKept) continue
      const path = `status.${theme}.${status}` as AppearancePath
      const name = STATUS_LABEL[status]
      check(`${name} badge text`, s.ink, s.fill, 4.5, path)
      check(`${name} tag text`, s.tone, s.surfaceOnRaised, 4.5, path, color('raised'))
      /* Alerts tint raised surfaces; light alerts draw their icon and action
         in the tone, dark ones in the tone this customization supplies. */
      check(`${name} alert icon and action`, s.tone, s.alertBg, 4.5, path, color('raised'))
    }
  }
  return issues
}

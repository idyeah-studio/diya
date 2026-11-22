import { componentIds, patternIds, type CatalogRoute } from './catalog-route'
import { customizeItems } from './customize/registry'
import { screenById, screens } from '../components/screens/screens-data'
import { itemReference } from '../components/reference/api'
import { guidance } from '../components/reference/guidance'

/** The page's own address: one URL per catalog page, whatever link led there. */
export function catalogPath(route: CatalogRoute) {
  if (route.area === 'components') return `/explore?area=components&component=${route.id}`
  if (route.area === 'patterns') return `/explore?pattern=${route.id}`
  if (route.area === 'screens') return screenPath(route.id)
  return `/explore?area=${route.area}`
}

/** The Screens gallery, or one screen's page. */
export function screenPath(id: string | null) {
  return id ? `/explore?area=screens&screen=${id}` : '/explore?area=screens'
}

/** The browser title, for example "Table — DIYA" or "Sign in: Screens — DIYA". */
export function catalogTitle(route: CatalogRoute) {
  if (route.area === 'skills') return 'Skills & Prompts — DIYA'
  if (route.area === 'pro') return 'Relight — DIYA'
  if (route.area === 'motion') return 'Motion — DIYA'
  if (route.area === 'screens') {
    const screen = screenById(route.id)
    return screen ? `${screen.name}: Screens — DIYA` : 'Screens — DIYA'
  }
  return `${customizeItems[route.id].title} — DIYA`
}

/**
 * The page's own one-line description, for search results and share cards,
 * built from what the site already says, so it never goes stale: a
 * component's or pattern's first sentence in api.json (with its catalog
 * guidance when that sentence is very short), a screen's own line
 * in screens-data, the Screens count, and the Motion and Relight pages' ledes.
 * For example, Table: "A data table with optional search, filters, sorting,
 * row selection, bulk and row actions, and pagination, all run in the browser."
 */
export function catalogDescription(route: CatalogRoute) {
  // Skills & Prompts was retired before launch and its links redirect; the line is the library's.
  if (route.area === 'skills') return 'React components, patterns and whole screens, free under MIT.'
  if (route.area === 'pro') return 'Relight is coming to DIYA Pro: from a sketch to a screen you own, as working DIYA code.'
  if (route.area === 'motion')
    return 'DIYA moves only when something changes because of you: quick and quiet, and you can turn it off.'
  if (route.area === 'screens') {
    const screen = screenById(route.id)
    if (!screen) {
      const ready = screens.filter((entry) => entry.status === 'ready').length
      return `${ready} whole screens for React, ready to paste: one file each, with sample data and every state already working.`
    }
    return screen.status === 'poster' ? `${screen.description} Waiting on ${screen.waitingOn}.` : screen.description
  }
  if (route.id in plainWords) return plainWords[route.id]
  const item = customizeItems[route.id]
  const described = itemReference(route.id)?.description
  if (!described) return `${item.title}, a DIYA ${item.kind} for React.`
  const sentence = firstSentence(described)
  // Too short to tell a person much ("A styled anchor."): add when to use it.
  return sentence.length < 24 ? `${sentence} ${guidance[route.id].use}` : sentence
}

/** The few pages whose api.json sentence leans on code (role="switch", `open`) and needs plain words. */
const plainWords: Record<string, string> = {
  switch: 'An on/off toggle with a label and optional helper text or error.',
  search: 'A search field with a magnifier icon, labeled for screen readers.',
  dialog: 'A modal dialog for a short task or decision that has to happen before going on: confirm, rename, a quick form.',
}

/**
 * api.json's description reads for a coding agent; a person needs only its
 * first sentence, up to any semicolon, without the parenthesized props
 * ("A small count (`variant="count"`) or dot…") and without the clause that
 * names a prop in code ("…controlled through `open`."), which reads as a
 * broken sentence once the code marks are gone.
 */
function firstSentence(text: string) {
  const sentence = /^.*?[.!?]["”]?(?=\s|$)/.exec(text)?.[0] ?? text
  let clause = sentence.split(';')[0].replace(/\s*\([^)]*`[^)]*\)/g, '').trim()
  const code = clause.indexOf('`')
  if (code >= 0) {
    const before = clause.slice(0, code)
    // Cut at the last joining word before the code, or failing that the last comma.
    const joins = [...before.matchAll(/,?\s+(?:with|through|when|via|using|by|if)\s/g)]
    const cut = joins.length ? joins[joins.length - 1].index : before.lastIndexOf(',')
    clause = (cut > 0 ? before.slice(0, cut) : clause.replaceAll('`', '')).trim()
  }
  return /[.!?]["”]?$/.test(clause) ? clause : `${clause}.`
}

/** Every component and pattern page, in sidebar order. */
export function catalogItemPaths() {
  return [
    ...componentIds.map((id) => catalogPath({ area: 'components', id })),
    ...patternIds.map((id) => catalogPath({ area: 'patterns', id })),
  ]
}

/**
 * The Screens pages a launched site lists: the gallery and every ready
 * screen. Posters and screens still being built stay out of the sitemap.
 */
export function screenItemPaths() {
  return [screenPath(null), ...screens.filter((screen) => screen.status === 'ready').map((screen) => screenPath(screen.id))]
}

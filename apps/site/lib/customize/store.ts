import {
  getPath,
  parseOverrides,
  withOverrides,
  DEFAULT_APPEARANCE,
  type AppearancePath,
  type Overrides,
} from './appearance'
import { legacyOptionValues, optionSchemas } from './options'
import { isItemId, type ItemId } from './registry'

export type ItemCustomization = { overrides: Overrides; options: Record<string, string | boolean> }
export type CustomizeState = {
  schemaVersion: 2
  /** Library-wide brand; null until someone sets it. */
  brand: Overrides | null
  items: Partial<Record<ItemId, ItemCustomization>>
}

export const STORAGE_KEY = 'diya-customize-v2'
export const EMPTY_STATE: CustomizeState = Object.freeze({ schemaVersion: 2, brand: null, items: Object.freeze({}) }) as CustomizeState


/**
 * Before one brand colour, `brand` tinted only brand-tone tags, badges and
 * alerts, and the accent was separate. The accent the person saw on buttons
 * wins; a lone old brand (other than the old periwinkle default) becomes
 * the brand in both themes.
 */
function migrateBrand(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Object.hasOwn(raw, 'brand')) return raw
  const { brand, ...rest } = raw as Record<string, unknown>
  const accents = Object.hasOwn(rest, 'colors.light.accent') || Object.hasOwn(rest, 'colors.dark.accent')
  if (accents || typeof brand !== 'string' || brand.toUpperCase() === '#747CFF') return rest
  return { ...rest, 'colors.light.accent': brand, 'colors.dark.accent': brand }
}

/** Strict parse of stored state. Anything unexpected is dropped, never trusted. */
export function parseState(raw: unknown): CustomizeState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_STATE
  const value = raw as Record<string, unknown>
  if (value.schemaVersion !== 2) return EMPTY_STATE
  let brand: Overrides | null = null
  try {
    brand = value.brand === null || value.brand === undefined ? null : parseOverrides(migrateBrand(value.brand))
  } catch {
    brand = null
  }
  const items: CustomizeState['items'] = {}
  if (value.items && typeof value.items === 'object' && !Array.isArray(value.items)) {
    for (const [id, entry] of Object.entries(value.items as Record<string, unknown>)) {
      if (!isItemId(id) || !entry || typeof entry !== 'object') continue
      const e = entry as Record<string, unknown>
      try {
        const overrides = parseOverrides(e.overrides ?? {})
        /* Only options this item defines, with values it accepts: stale or
           foreign values would otherwise be sent to the download and fail. */
        const options: Record<string, string | boolean> = {}
        const schema = optionSchemas[id] ?? {}
        if (e.options && typeof e.options === 'object' && !Array.isArray(e.options))
          for (const [k, raw] of Object.entries(e.options as Record<string, unknown>)) {
            const v = typeof raw === 'string' ? legacyOptionValues[id]?.[k]?.[raw] ?? raw : raw
            if (Object.hasOwn(schema, k) && schema[k].values.includes(v as string | boolean)) options[k] = v as string | boolean
          }
        items[id] = { overrides, options }
      } catch {
        /* one bad item does not cost the others */
      }
    }
  }
  return { schemaVersion: 2, brand, items }
}

/* ---- external store ---------------------------------------------------- */

let cachedRaw: string | null | undefined
let cached: CustomizeState = EMPTY_STATE
/** Set when storage refused a write: keep this session's edits in memory. */
let memoryOnly = false
const listeners = new Set<() => void>()

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function getSnapshot(): CustomizeState {
  if (memoryOnly) return cached
  const raw = readRaw()
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try {
      cached = raw ? parseState(JSON.parse(raw)) : EMPTY_STATE
    } catch {
      cached = EMPTY_STATE
    }
  }
  return cached
}

export function getServerSnapshot(): CustomizeState {
  return EMPTY_STATE
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Replace the state. If storage is unavailable or full, edits live in memory for this session. */
export function setState(update: (state: CustomizeState) => CustomizeState) {
  const next = update(getSnapshot())
  const raw = JSON.stringify(next)
  try {
    window.localStorage.setItem(STORAGE_KEY, raw)
    cachedRaw = raw
    /* Storage works (again): follow it, and other tabs, from here on. */
    memoryOnly = false
  } catch {
    memoryOnly = true
  }
  cached = next
  for (const listener of listeners) listener()
}

/* ---- edits ------------------------------------------------------------- */

const item = (state: CustomizeState, id: ItemId): ItemCustomization =>
  state.items[id] ?? { overrides: {}, options: {} }

/* Translucent is a choice even when it matches the default: the full
   library opens in glass unless someone explicitly chose otherwise. */
function dropDefaults(overrides: Overrides): Overrides | null {
  const kept = Object.fromEntries(
    Object.entries(overrides).filter(([p, v]) => p === 'translucent' || getPath(DEFAULT_APPEARANCE, p as AppearancePath) !== v),
  ) as Overrides
  return Object.keys(kept).length ? kept : null
}

export function setBrandValue(path: AppearancePath, value: string | number | boolean) {
  setState((s) => {
    withOverrides(DEFAULT_APPEARANCE, { [path]: value }) // validates
    return { ...s, brand: dropDefaults({ ...(s.brand ?? {}), [path]: value }) }
  })
}

export function setItemValue(id: ItemId, path: AppearancePath, value: string | number | boolean) {
  setState((s) => {
    withOverrides(DEFAULT_APPEARANCE, { [path]: value })
    const current = item(s, id)
    /* Typing the inherited value back in is not a customization. */
    const inherited = getPath(withOverrides(DEFAULT_APPEARANCE, s.brand ?? {}), path)
    const { [path]: _previous, ...rest } = current.overrides
    const overrides = value === inherited && path !== 'translucent' ? rest : { ...rest, [path]: value }
    return { ...s, items: { ...s.items, [id]: { ...current, overrides } } }
  })
}

/** Set the brand colour for Light and Dark in one step. */
export function setBrandColor(light: string, dark: string) {
  setState((s) => {
    const next = { ...(s.brand ?? {}), 'colors.light.accent': light, 'colors.dark.accent': dark }
    withOverrides(DEFAULT_APPEARANCE, next) // validates
    return { ...s, brand: dropDefaults(next) }
  })
}

/** Back to DIYA's neutral brand in both themes. */
export function clearBrandColor() {
  setState((s) => {
    const { 'colors.light.accent': _light, 'colors.dark.accent': _dark, ...rest } = s.brand ?? {}
    return { ...s, brand: Object.keys(rest).length ? rest : null }
  })
}

/** Forget one brand value, so it is DIYA's default again. */
export function clearBrandValue(path: AppearancePath) {
  setState((s) => {
    const { [path]: _removed, ...rest } = s.brand ?? {}
    return { ...s, brand: Object.keys(rest).length ? rest : null }
  })
}

/** Stop overriding one field on an item, so it follows the brand again. */
export function followBrand(id: ItemId, path: AppearancePath) {
  setState((s) => {
    const current = item(s, id)
    const { [path]: _removed, ...rest } = current.overrides
    return { ...s, items: { ...s.items, [id]: { ...current, overrides: rest } } }
  })
}

export function setItemOption(id: ItemId, key: string, value: string | boolean) {
  setState((s) => {
    const current = item(s, id)
    return { ...s, items: { ...s.items, [id]: { ...current, options: { ...current.options, [key]: value } } } }
  })
}

/** Forget everything this item set (its own values and options). */
export function resetItem(id: ItemId) {
  setState((s) => {
    const { [id]: _removed, ...rest } = s.items
    return { ...s, items: rest }
  })
}

/** Replace the whole brand (used to undo a reset). */
export function setBrand(brand: Overrides | null) {
  setState((s) => ({ ...s, brand: brand && Object.keys(brand).length ? parseOverrides(brand) : null }))
}

/** Put an item's customization back exactly as it was (used to undo a reset). */
export function restoreItem(id: ItemId, saved: ItemCustomization | undefined) {
  setState((s) => {
    const { [id]: _current, ...rest } = s.items
    return { ...s, items: saved ? { ...rest, [id]: saved } : rest }
  })
}

export function resetBrand() {
  setState((s) => ({ ...s, brand: null }))
}

/** Choices made explicitly for an item (its own or the brand's), even if they equal a default. */
export function explicitChoices(state: CustomizeState, id: ItemId | null): AppearancePath[] {
  const paths = new Set<AppearancePath>(Object.keys(state.brand ?? {}) as AppearancePath[])
  if (id) for (const p of Object.keys(state.items[id]?.overrides ?? {})) paths.add(p as AppearancePath)
  return [...paths].filter((p) => p === 'translucent')
}

/* A brand that only records Translucent off changes nothing you can see. */
export const brandVisible = (brand: Overrides | null) =>
  !!brand && Object.entries(brand).some(([p, v]) => !(p === 'translucent' && v === false))

export function isCustomized(state: CustomizeState, id: ItemId) {
  const own = state.items[id]
  return brandVisible(state.brand) || !!(own && (Object.keys(own.overrides).length || Object.keys(own.options).length))
}


/** Test helper: forget the in-memory fallback. */
export function resetStoreForTests() {
  memoryOnly = false
  cachedRaw = undefined
  cached = EMPTY_STATE
}

// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectiveAppearance } from './appearance'
import {
  EMPTY_STATE,
  STORAGE_KEY,
  followBrand,
  getServerSnapshot,
  getSnapshot,
  isCustomized,
  parseState,
  resetBrand,
  resetStoreForTests,
  resetItem,
  setBrandValue,
  setItemOption,
  setItemValue,
  subscribe,
} from './store'

beforeEach(() => {
  window.localStorage.clear()
  resetStoreForTests()
})

describe('stored state is parsed strictly', () => {
  it('drops anything unexpected instead of trusting it', () => {
    expect(parseState(null)).toEqual(EMPTY_STATE)
    expect(parseState({ schemaVersion: 1, brand: {} })).toEqual(EMPTY_STATE)
    const state = parseState({
      schemaVersion: 2,
      brand: { 'colors.light.accent': '#1f4e7a' },
      items: {
        tabs: { overrides: { corners: 4 }, options: { size: 'Large', '<script>': 'x', dense: true } },
        button: { overrides: {}, options: { size: 'huge', shape: 'rectangle', legacy: true } },
        'not-an-item': { overrides: {} },
        badge: { overrides: { 'colors.light.accent': 'javascript:alert(1)' } },
      },
    })
    expect(state.brand).toEqual({ 'colors.light.accent': '#1F4E7A' })
    /* Options outside an item's schema are dropped, so they can never reach a download. */
    expect(state.items.tabs).toEqual({ overrides: { corners: 4 }, options: {} })
    /* A value renamed before 1.0 is migrated rather than dropped. */
    expect(state.items.button).toEqual({ overrides: {}, options: { shape: 'rounded' } })
    expect(state.items).not.toHaveProperty('not-an-item')
    expect(state.items).not.toHaveProperty('badge')
  })

  it('survives corrupt storage', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')
    expect(getSnapshot()).toEqual(EMPTY_STATE)
  })

  it('always renders the server as uncustomized, so hydration matches', () => {
    setBrandValue('font', 'lora')
    expect(getServerSnapshot()).toBe(EMPTY_STATE)
  })
})

describe('editing', () => {
  it('layers an item’s own value over the brand, then follows the brand again', () => {
    setBrandValue('colors.light.accent', '#7A2E1F')
    setItemValue('tabs', 'colors.light.accent', '#1F4E7A')
    const state = getSnapshot()
    expect(effectiveAppearance(state.brand, state.items.tabs?.overrides).colors.light.accent).toBe('#1F4E7A')
    expect(effectiveAppearance(state.brand, state.items.badge?.overrides).colors.light.accent).toBe('#7A2E1F')
    followBrand('tabs', 'colors.light.accent')
    const after = getSnapshot()
    expect(effectiveAppearance(after.brand, after.items.tabs?.overrides).colors.light.accent).toBe('#7A2E1F')
  })

  it('forgets a brand value set back to the default', () => {
    setBrandValue('corners', 4)
    setBrandValue('corners', 10)
    expect(getSnapshot().brand).toBeNull()
  })

  it('rejects invalid values before storing them', () => {
    expect(() => setBrandValue('corners', 99)).toThrow()
    expect(() => setItemValue('tabs', 'colors.dark.text', 'red')).toThrow()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('resets an item or the brand independently', () => {
    setBrandValue('font', 'lora')
    setItemValue('tabs', 'corners', 4)
    setItemOption('tabs', 'size', 'Large')
    expect(isCustomized(getSnapshot(), 'tabs')).toBe(true)
    resetItem('tabs')
    expect(getSnapshot().items.tabs).toBeUndefined()
    expect(isCustomized(getSnapshot(), 'tabs')).toBe(true) // the brand still applies
    resetBrand()
    expect(isCustomized(getSnapshot(), 'tabs')).toBe(false)
  })

  it('persists and notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)
    setItemValue('badge', 'colors.light.accent', '#1F4E7A')
    expect(listener).toHaveBeenCalled()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).items.badge.overrides['colors.light.accent']).toBe('#1F4E7A')
    unsubscribe()
  })

  it('keeps edits for the session when storage refuses to write', () => {
    const real = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => ({
        getItem: () => null,
        setItem: () => {
          throw new DOMException('Storage is full', 'QuotaExceededError')
        },
        removeItem: () => {},
        clear: () => {},
      }),
    })
    try {
      expect(() => setItemValue('badge', 'corners', 4)).not.toThrow()
      expect(getSnapshot().items.badge?.overrides.corners).toBe(4)
      setBrandValue('font', 'lora')
      expect(getSnapshot().brand).toEqual({ font: 'lora' })
      expect(getSnapshot().items.badge?.overrides.corners).toBe(4)
    } finally {
      if (real) Object.defineProperty(window, 'localStorage', real)
      else delete (window as { localStorage?: Storage }).localStorage
    }
  })

  it('drops an item value typed back to what it inherits', () => {
    setBrandValue('colors.light.accent', '#7A2E1F')
    setItemValue('tabs', 'colors.light.accent', '#1F4E7A')
    setItemValue('tabs', 'colors.light.accent', '#7A2E1F')
    expect(getSnapshot().items.tabs?.overrides).toEqual({})
  })

  it('remembers an explicit Translucent choice even when it matches the default', () => {
    setBrandValue('translucent', false)
    expect(getSnapshot().brand).toEqual({ translucent: false })
    setItemValue('tabs', 'translucent', false)
    expect(getSnapshot().items.tabs?.overrides).toEqual({ translucent: false })
  })

  it('returns the same snapshot object until something changes', () => {
    setBrandValue('font', 'lora')
    expect(getSnapshot()).toBe(getSnapshot())
  })
})

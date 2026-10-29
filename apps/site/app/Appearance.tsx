'use client'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
export type Theme = 'dark' | 'light'
const AppearanceContext = createContext<{
  theme: Theme
  light: boolean
  glass: boolean
  /** True while the theme follows the visitor's setting (a first visit, nothing saved yet). */
  followsSystem: boolean
  changeTheme: (value: Theme) => void
  changeGlass: (value: boolean) => void
} | null>(null)
const LIGHT_QUERY = '(prefers-color-scheme: light)'
export function AppearanceProvider({ initialTheme, initialGlass, children }: {
  initialTheme: Theme
  initialGlass: boolean
  children: ReactNode
}) {
  const [theme, setTheme] = useState(initialTheme)
  const [glass, setGlass] = useState(initialGlass)
  const [followsSystem, setFollowsSystem] = useState(false)
  // SYSTEM_THEME_SCRIPT (components/site/system-theme.ts) marks a launched
  // page with nothing saved; from here the setting is followed live.
  useEffect(() => {
    if (!followsSystem && document.documentElement.dataset.themeSource !== 'system') return
    const query = window.matchMedia(LIGHT_QUERY)
    const follow = () => {
      const value: Theme = query.matches ? 'light' : 'dark'
      document.documentElement.dataset.theme = value
      setTheme(value)
    }
    setFollowsSystem(true)
    follow()
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [followsSystem])
  function changeTheme(value: Theme) {
    setFollowsSystem(false)
    delete document.documentElement.dataset.themeSource
    setTheme(value)
    document.documentElement.dataset.theme = value
    document.cookie = `diya-theme=${value}; Path=/; Max-Age=31536000; SameSite=Lax`
  }
  function changeGlass(value: boolean) {
    setGlass(value)
    document.documentElement.dataset.glass = String(value)
    document.cookie = `diya-glass=${value}; Path=/; Max-Age=31536000; SameSite=Lax`
  }
  return <AppearanceContext.Provider value={{ theme, light: theme === 'light', glass, followsSystem, changeTheme, changeGlass }}>{children}</AppearanceContext.Provider>
}
export function useAppearance() {
  const appearance = useContext(AppearanceContext)
  if (!appearance) throw new Error('AppearanceProvider is required')
  return appearance
}
export function Appearance() {
  const { theme, glass, changeTheme, changeGlass } = useAppearance()
  const panel = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node) && panel.current) panel.current.open = false
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panel.current?.open) {
        panel.current.open = false
        panel.current.querySelector('summary')?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [])
  return (
    <details className="appearance-popover" ref={panel}>
      <summary aria-label="Appearance">
        <Icon name={theme === 'dark' ? 'moon' : 'sun'} />
      </summary>
      <div className="appearance-panel material">
        <strong>Appearance</strong>
        <fieldset className="segmented">
          <legend className="sr-only">Color scheme</legend>
          {(['light', 'dark'] as const).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="theme"
                checked={theme === value}
                onChange={() => changeTheme(value)}
              />
              <span>
                <Icon
                  name={value === 'light' ? 'sun' : 'moon'}
                  size={15}
                />
                {value[0].toUpperCase() + value.slice(1)}
              </span>
            </label>
          ))}
        </fieldset>
        <label className="glass-row">
          <span>
            <b>Glass</b>
            <small>A finish. One prop: <code>glass</code></small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={glass}
            onChange={(e) => changeGlass(e.target.checked)}
          />
          <span className="switch-track" aria-hidden="true" />
        </label>
      </div>
    </details>
  )
}

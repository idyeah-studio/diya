'use client'
import { useCallback, useSyncExternalStore } from 'react'

/**
 * The one remembered package manager, for every install command on the site:
 * the landing and header chips, the catalog sidebar, Get code and Get theme.
 * A choice made anywhere updates everywhere in this tab (a window event) and
 * in other tabs (the `storage` event).
 */
export const PACKAGE_MANAGER_KEY = 'diya:package-manager'
export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const
export type PackageManager = (typeof PACKAGE_MANAGERS)[number]

const INSTALL: Record<PackageManager, string> = { npm: 'npm install', pnpm: 'pnpm add', yarn: 'yarn add', bun: 'bun add' }
const CHANGE_EVENT = 'diya:package-manager-change'

export const isPackageManager = (value: unknown): value is PackageManager =>
  typeof value === 'string' && (PACKAGE_MANAGERS as readonly string[]).includes(value)

export function installCommand(manager: PackageManager, packages = '@idyeah/diya') {
  return `${INSTALL[manager]} ${packages}`
}

const CREATE: Record<PackageManager, string> = {
  npm: 'npm create diya@latest',
  pnpm: 'pnpm create diya',
  yarn: 'yarn create diya',
  bun: 'bun create diya',
}

/** How to start a new app with create-diya, in the given package manager. */
export function createCommand(manager: PackageManager) {
  return CREATE[manager]
}

/** Accepts the plain value or a JSON string, so either writer's format reads back. */
export function parsePackageManager(value: string | null | undefined): PackageManager {
  const plain = value?.replace(/^"|"$/g, '')
  return isPackageManager(plain) ? plain : 'npm'
}

// Storage can be missing or throw (private windows, blocked site data), so
// the page keeps its own copy and works without it.
let memory: PackageManager | null = null
let memoryOnly = false

function read(): PackageManager {
  if (memoryOnly) return memory ?? 'npm'
  try {
    return parsePackageManager(window.localStorage.getItem(PACKAGE_MANAGER_KEY))
  } catch {
    return memory ?? 'npm'
  }
}

export function setPackageManager(manager: PackageManager) {
  memory = manager
  try {
    window.localStorage.setItem(PACKAGE_MANAGER_KEY, manager)
    memoryOnly = false
  } catch {
    memoryOnly = true
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === PACKAGE_MANAGER_KEY || event.key === null) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', storage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', storage)
  }
}

/** The remembered package manager; npm on the server and until storage is read. */
export function usePackageManager() {
  return useSyncExternalStore(subscribe, read, () => 'npm' as const)
}

/** The same value with its setter, for controls that change it. */
export function usePackageManagerChoice(): [PackageManager, (value: PackageManager) => void] {
  return [usePackageManager(), useCallback(setPackageManager, [])]
}

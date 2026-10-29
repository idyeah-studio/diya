'use client'
import { useEffect, useRef, useState } from 'react'
import {
  PACKAGE_MANAGERS,
  installCommand,
  setPackageManager,
  usePackageManager,
  type PackageManager,
} from './package-manager'

/**
 * The install command, ready to copy, in the remembered package manager.
 *
 * - `hero`: the machined well, with a package-manager picker and a Copy key.
 * - `compact`: the header's small chip.
 * - `menu`: one full-width row for the phone menu sheet.
 *
 * Every instance shares `diya:package-manager` with Get code, so a choice made
 * anywhere shows everywhere.
 */
export function InstallChip({ variant = 'hero' }: { variant?: 'hero' | 'compact' | 'menu' }) {
  const manager = usePackageManager()
  const command = installCommand(manager)
  const { state, message, copy, code } = useCopy(command)
  const label = `Copy install command: ${command}`
  const status = (
    <span role="status" className={variant === 'hero' && state === 'failed' ? 'site-chip-note' : 'sr-only'}>
      {message}
    </span>
  )

  if (variant === 'menu')
    return (
      <>
        <button type="button" className="site-menu-row" data-state={state} aria-label={label} onClick={copy}>
          <span>{state === 'copied' ? 'Copied' : 'Copy install'}</span>
          <code ref={code} className="site-mono">
            {command}
          </code>
        </button>
        {status}
      </>
    )

  const [, verb, pkg] = command.split(' ')
  return (
    <div className="site-chip" data-variant={variant} data-state={state} role="group" aria-label="Install DIYA">
      {variant === 'hero' && (
        <>
          <label className="site-chip-pm">
            <select aria-label="Package manager" value={manager} onChange={(event) => setPackageManager(event.target.value as PackageManager)}>
              {PACKAGE_MANAGERS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <span aria-hidden="true">{manager}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </label>
          <span className="site-chip-sep" aria-hidden="true" />
        </>
      )}
      <code ref={code} className="site-chip-cmd">
        <span className="site-chip-manager">{manager} </span>
        {verb} <b>{pkg}</b>
      </code>
      <button type="button" className="site-chip-key" aria-label={label} onClick={copy}>
        {state === 'copied' ? <CheckIcon /> : <CopyIcon />}
        <span className="site-chip-key-text">{state === 'copied' ? 'Copied' : 'Copy'}</span>
      </button>
      {status}
    </div>
  )
}

type CopyState = 'idle' | 'copied' | 'failed'

function useCopy(text: string) {
  const [state, setState] = useState<CopyState>('idle')
  const [message, setMessage] = useState('')
  const code = useRef<HTMLElement>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    window.clearTimeout(timer.current)
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setState('copied')
      setMessage('Install command copied.')
      timer.current = window.setTimeout(() => {
        setState('idle')
        setMessage('')
      }, 2000)
    } catch {
      setState('failed')
      setMessage('Copy didn’t work. The command is selected; press Command+C or Ctrl+C.')
      // Select after the full command is shown, so the selection covers all of it.
      window.requestAnimationFrame(() => {
        const node = code.current
        const selection = window.getSelection()
        if (!node || !selection) return
        const range = document.createRange()
        range.selectNodeContents(node)
        selection.removeAllRanges()
        selection.addRange(range)
      })
    }
  }

  return { state, message, copy, code }
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

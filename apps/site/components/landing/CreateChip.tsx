'use client'
import { useEffect, useRef, useState } from 'react'
import {
  PACKAGE_MANAGERS,
  createCommand,
  installCommand,
  setPackageManager,
  usePackageManager,
  type PackageManager,
} from '../site/package-manager'
import { codeTaken } from '../../lib/code-taken'

/**
 * The launched hero's lead command: start a new app with `create-diya`, in
 * the remembered package manager. The same machined well as the hero's
 * install chip (it shares `.site-chip`'s styles and the package-manager
 * choice), so switching to pnpm here switches it everywhere.
 */
export function CreateChip() {
  const manager = usePackageManager()
  const command = createCommand(manager)
  const { state, message, copy, code } = useCopy(command, 'Command copied.', 'install/create-diya')
  const [, verb, pkg] = command.split(' ')
  return (
    <div className="site-chip" data-variant="hero" data-state={state} role="group" aria-label="Start a new app with DIYA">
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
      <code ref={code} className="site-chip-cmd">
        <span className="site-chip-manager">{manager} </span>
        {verb} <b>{pkg}</b>
      </code>
      <button type="button" className="site-chip-key" aria-label={`Copy command: ${command}`} onClick={copy}>
        {state === 'copied' ? <CheckIcon /> : <CopyIcon />}
        <span className="site-chip-key-text">{state === 'copied' ? 'Copied' : 'Copy'}</span>
      </button>
      <span role="status" className={state === 'failed' ? 'site-chip-note' : 'sr-only'}>
        {message}
      </span>
    </div>
  )
}

/** The line under the hero's actions, for people adding DIYA to an app they already have. */
export function InstallLine() {
  const command = installCommand(usePackageManager())
  const { state, message, copy, code } = useCopy(command, 'Install command copied.', 'install/npm')
  return (
    <p className="ld-also">
      Adding it to an app you have?{' '}
      <button type="button" className="ld-also-copy" data-state={state} aria-label={`Copy install command: ${command}`} onClick={copy}>
        <code ref={code}>{command}</code>
        <span aria-hidden="true">{state === 'copied' ? <CheckIcon size={14} /> : <CopyIcon size={14} />}</span>
      </button>
      <span role="status" className={state === 'failed' ? 'site-chip-note' : 'sr-only'}>
        {message}
      </span>
    </p>
  )
}

type CopyState = 'idle' | 'copied' | 'failed'

/** `item` names the command for the Code taken count. */
function useCopy(text: string, copiedMessage: string, item: string) {
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
      setMessage(copiedMessage)
      codeTaken(item, 'copy')
      timer.current = window.setTimeout(() => {
        setState('idle')
        setMessage('')
      }, 2000)
    } catch {
      setState('failed')
      setMessage('Copy didn’t work. The command is selected; press Command+C or Ctrl+C.')
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

function CopyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
    </svg>
  )
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

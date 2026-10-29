'use client'
// @demo-only file: "Your image", the fifth backdrop in Settings. Choose a file or
// drop one on the tile; it applies at once, stays in this browser, and is calmed
// for Glass (lib/uploaded-backdrop.ts). The template takes an image in
// lib/brand.tsx instead.
import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { Button } from '@idyeah/diya'
import { DEFAULT_LOOK, useLook } from '@/app/providers'
import { ACCEPTED, UploadProblem, applyFile, removeImage, useUploadState, type Strength } from '@/lib/uploaded-backdrop'
import './backdrop-upload.css'

const STRENGTHS: { value: Strength; label: string }[] = [
  { value: 'subtle', label: 'Subtle' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'strong', label: 'Strong' },
]
const ERRORS = {
  type: 'That file isn’t an image we can use. Try JPG, PNG or WebP.',
  size: 'That’s over 10 MB. Try a smaller version.',
}

export function BackdropUpload() {
  const { look, setLook } = useLook()
  const upload = useUploadState()
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const active = look.backdrop === 'image' && !!upload.url
  const strength = look.strength ?? 'balanced'

  async function take(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      await applyFile(file)
      setLook({ backdrop: 'image' })
    } catch (problem) {
      setError(problem instanceof UploadProblem ? ERRORS[problem.kind] : ERRORS.type)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  const choose = () => input.current?.click()
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files')

  const sub = busy
    ? 'Getting it ready…'
    : dragging
      ? 'Drop it to use it.'
      : active
        ? 'In use now.'
        : upload.url
          ? 'Use it again.'
          : 'Choose or drop a JPG, PNG or WebP, up to 10 MB.'

  // Arrow keys move through the strengths, as in any radio group.
  function onStrengthKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const at = STRENGTHS.findIndex((s) => s.value === strength)
    const next = STRENGTHS[(at + step + STRENGTHS.length) % STRENGTHS.length]
    setLook({ strength: next.value })
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-value='${next.value}']`)?.focus()
  }

  return (
    <div className="byo-wrap">
      <div
        className="byo"
        data-dragging={dragging || undefined}
        data-active={active || undefined}
        onDragEnter={(e) => hasFiles(e) && (e.preventDefault(), setDragging(true))}
        onDragOver={(e) => hasFiles(e) && (e.preventDefault(), (e.dataTransfer.dropEffect = 'copy'))}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          take(e.dataTransfer.files[0])
        }}
      >
        <button
          type="button"
          className="byo-main"
          aria-describedby={`${id}-help`}
          aria-pressed={active}
          onClick={() => (upload.url && !active ? setLook({ backdrop: 'image' }) : choose())}
        >
          <span className="byo-thumb" aria-hidden="true">
            {upload.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={upload.url} alt="" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </span>
          <span className="byo-text">
            <span className="byo-title">Your image</span>
            <span className="byo-sub" aria-live="polite">
              {sub}
            </span>
          </span>
        </button>
        {upload.url && (
          <span className="byo-actions">
            <Button size="small" variant="quiet" onClick={choose} disabled={busy}>
              Replace
            </Button>
            <Button
              size="small"
              variant="quiet"
              disabled={busy}
              onClick={() => {
                removeImage()
                setError(null)
                if (look.backdrop === 'image') setLook({ backdrop: DEFAULT_LOOK.backdrop })
              }}
            >
              Remove
            </Button>
          </span>
        )}
        <input
          ref={input}
          type="file"
          accept={ACCEPTED.join(',')}
          className="byo-input"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => take(e.target.files?.[0])}
        />
      </div>

      {active && (
        <div className="byo-strength" role="radiogroup" aria-label="Image strength" onKeyDown={onStrengthKey}>
          {STRENGTHS.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              data-value={s.value}
              aria-checked={strength === s.value}
              tabIndex={strength === s.value ? 0 : -1}
              onClick={() => setLook({ strength: s.value })}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="byo-error" role="alert">
          {error}
        </p>
      )}
      {upload.url && !upload.remembered && !error && (
        <p className="byo-note" role="status">
          Using it for this visit. This browser won’t let us keep it, so it won’t be here next time.
        </p>
      )}
      <p className="byo-note" id={`${id}-help`}>
        Stays in this browser. Never uploaded.
      </p>
    </div>
  )
}

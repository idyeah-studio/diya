'use client'
import { forwardRef, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { Button } from '../button/Button.js'
import { Icon } from '../Icon.js'
import { useDiyaLocale, useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { fileUploadMessages } from './file-upload-messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    fileUpload: typeof fileUploadMessages
  }
}

export type FileRejection = {
  /** The file that was not added. */
  file: File
  /** Why: 'type' fails `accept`, 'size' exceeds `maxBytes`. */
  reason: 'type' | 'size'
}
/** Other attributes, `className`, `style` and the ref go on the outer section. */
export type FileUploadProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> & {
  /** The selected files; the caller owns this list. */
  files: readonly File[]
  /** Called with the full next list after files are added or removed. */
  onFilesChange: (files: File[]) => void
  /** Accepted types, as in the native input: extensions and MIME types, e.g. ".pdf,image/*". Others are rejected. */
  accept?: string
  /** Largest allowed file size in bytes; larger files are rejected. */
  maxBytes?: number
  /** Keeps adding to the list instead of replacing the single file; defaults to false. */
  multiple?: boolean
  /** Disables dropping, choosing and removing; defaults to false. */
  disabled?: boolean
  /** Visible heading in the drop zone; it is also the region's accessible name. Defaults to "Add your files". */
  title?: string
  /** Heading level of the title, 1–6; defaults to 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Text under the heading; defaults to "Drop files here or choose from your device." Pass null to hide it. */
  description?: ReactNode
  /** Small text under the button, e.g. accepted types and size limit. */
  helperText?: ReactNode
  /** Choose button text; defaults to "Choose files". */
  chooseLabel?: string
  /** Called with the files that were not added and why; a short error also shows. */
  onReject?: (rejections: FileRejection[]) => void
}

/** A drop zone and file picker with a removable file list. Selects local files; upload, persistence and server validation belong to the caller. */
export const FileUpload = forwardRef<HTMLElement, FileUploadProps>(function FileUpload({ files, onFilesChange, accept = '', maxBytes, multiple = false, disabled = false, title: titleProp, headingLevel = 3, description: descriptionProp, helperText, chooseLabel, onReject, className, ...props }, ref) {
  const t = useDiyaMessages('fileUpload', fileUploadMessages)
  const locale = useDiyaLocale()
  const title = titleProp ?? t.title
  const Heading = `h${headingLevel}` as const
  const description = descriptionProp === undefined ? t.description : descriptionProp
  const picker = useRef<HTMLInputElement>(null)
  const chooseButton = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const rules = accept.split(',').map(rule => rule.trim().toLowerCase()).filter(Boolean)
  function add(incoming: FileList | null) {
    if (!incoming || disabled) return
    const accepted: File[] = []
    const rejected: FileRejection[] = []
    for (const file of Array.from(incoming)) {
      const name = file.name.toLowerCase()
      const mime = file.type.toLowerCase()
      const matches = !rules.length || rules.some(rule => rule.startsWith('.') ? name.endsWith(rule) : rule.endsWith('/*') ? mime.startsWith(rule.slice(0, -1)) : mime === rule)
      if (!matches) rejected.push({ file, reason: 'type' })
      else if (maxBytes !== undefined && Number.isFinite(maxBytes) && maxBytes >= 0 && file.size > maxBytes) rejected.push({ file, reason: 'size' })
      else accepted.push(file)
    }
    if (accepted.length) {
      const next = multiple ? [...files, ...accepted].filter((file, index, all) => all.findIndex(other => other.name === file.name && other.size === file.size && other.lastModified === file.lastModified) === index) : accepted.slice(0, 1)
      onFilesChange(next)
    }
    setError(rejected.length ? t.rejected(rejected.length) : '')
    if (rejected.length) onReject?.(rejected)
  }
  return <section {...props} ref={ref} className={cx('diya-workflow-surface diya-upload', className)} aria-label={title} aria-disabled={disabled || undefined}>
    <div className="diya-upload-drop" data-dragging={dragging || undefined} onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); add(event.dataTransfer.files) }}>
      <span className="diya-workflow-symbol"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" /></svg></span>
      <Heading className="diya-upload-title">{title}</Heading>{description && <p>{description}</p>}
      <Button ref={chooseButton} variant="outline" disabled={disabled} onClick={() => picker.current?.click()}>{chooseLabel ?? t.choose}</Button>
      <input ref={picker} type="file" hidden disabled={disabled} accept={accept || undefined} multiple={multiple} onChange={event => { add(event.target.files); event.target.value = '' }} />
      {helperText && <small>{helperText}</small>}
    </div>
    {error && <p className="diya-workflow-error" role="alert">{error}</p>}
    {!!files.length && <ul className="diya-upload-files">{files.map(file => <li key={`${file.name}-${file.size}-${file.lastModified}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 3h9l5 5v13H5V3Zm9 0v6h5" /></svg>
      <span><strong>{file.name}</strong><small>{file.size < 1024 * 1024 ? t.kilobytes(Math.max(1, Math.round(file.size / 1024)).toLocaleString(locale, { useGrouping: false })) : t.megabytes((file.size / 1024 / 1024).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false }))}</small></span>
      <Button variant="quiet" iconOnly disabled={disabled} aria-label={t.remove(file.name)} onClick={() => { onFilesChange(files.filter(item => item !== file)); chooseButton.current?.focus() }}><Icon name="close" /></Button>
    </li>)}</ul>}
    <span className="diya-workflow-sr" role="status">{t.selected(files.length)}</span>
  </section>
})

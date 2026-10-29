'use client'
import { forwardRef, useEffect, useRef, useState, type HTMLAttributes } from 'react'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { avatarMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    avatar: typeof avatarMessages
  }
}
export type AvatarProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  /** The person's name: the avatar's accessible name, and the source of the visible initials (first letters of the first two words). */
  name: string
  /** Image URL; if it fails to load, the initials show instead, or a person icon when `name` is empty. */
  src?: string
  /** Avatar diameter. Defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** 'circle' or a rounded square. Defaults to 'circle'. */
  shape?: 'circle' | 'rounded'
  /** Shows a presence dot and adds the status to the accessible name. */
  status?: 'online' | 'away' | 'busy'
}
/** A person's picture or initials, with an optional presence dot. */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar({ name, src, size = 'medium', shape = 'circle', status, className, ...props }, ref) {
  const t = useDiyaMessages('avatar', avatarMessages)
  const [failed, setFailed] = useState<string | undefined>()
  const image = useRef<HTMLImageElement>(null)
  useEffect(() => {
    // A cached failure may finish before hydration can attach the error handler.
    if (src && image.current?.complete && image.current.naturalWidth === 0) setFailed(src)
  }, [src])
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase()
  return <span {...props} ref={ref} className={cx('diya-avatar', className)} data-size={size} data-shape={shape} role="img" aria-label={`${name || t.user}${status ? `, ${t[status]}` : ''}`}>
    {src && failed !== src ? <img ref={image} src={src} alt="" onError={() => setFailed(src)} /> : initials ? <span aria-hidden="true">{initials}</span> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>}
    {status && <span className="diya-avatar-status" data-status={status} aria-hidden="true" />}
  </span>
})

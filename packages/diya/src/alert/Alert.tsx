'use client'
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import type { Tone } from '../badge/Badge.js'
import { alertMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    alert: typeof alertMessages
  }
}
/** Alerts carry a status, so every tone except neutral. */
export type AlertTone = Exclude<Tone, 'neutral'>
export type AlertProps = Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> & {
  /** 'card' is a contained box; 'banner' is a full-width strip with its content in one row. Defaults to 'card'. */
  layout?: 'card' | 'banner'
  /** 'info' for information, 'success' done, 'warning' needs care, 'error' failed, 'brand' the provider's brand color; sets the icon and color and is announced before the message. Defaults to 'info'. */
  tone?: AlertTone
  /** Visible bold first line. */
  title?: string
  /** Visible message. */
  children: ReactNode
  /** One visible button after the message; `label` is its text. */
  action?: { label: string; onClick: () => void }
  /** When given, shows a close button that calls it. */
  onDismiss?: () => void
  /** Announces immediately as `role="alert"`, interrupting a screen reader; otherwise it is a polite status. Use for errors that need action. */
  urgent?: boolean
}
/** An inline message that reports a status, with an optional action and close button. */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert({ layout = 'card', tone = 'info', title, children, action, onDismiss, urgent = false, className, ...props }, ref) {
  const t = useDiyaMessages('alert', alertMessages)
  return <div {...props} ref={ref} className={cx('diya-alert', className)} data-tone={tone} data-layout={layout}>
    <svg className="diya-alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {tone === 'warning' ? <><path d="m12 3 10 18H2Z" /><path d="M12 9v5m0 3v.1" /></> : <><circle cx="12" cy="12" r="9" />{tone === 'success' ? <path d="m8 12 3 3 5-6" /> : tone === 'error' ? <path d="m9 9 6 6m0-6-6 6" /> : <path d="M12 11v6m0-10v.1" />}</>}
    </svg>
    <div className="diya-alert-copy">
      <div role={urgent ? 'alert' : 'status'} aria-atomic="true"><span className="diya-alert-sr">{t[tone]}: </span>{title && <p className="diya-alert-title">{title}</p>}<div className="diya-alert-description">{children}</div></div>
      {action && <button type="button" className="diya-alert-action" onClick={action.onClick}>{action.label}</button>}
    </div>
    {onDismiss && <button type="button" className="diya-alert-dismiss" aria-label={t.dismiss} onClick={onDismiss}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>}
  </div>
})

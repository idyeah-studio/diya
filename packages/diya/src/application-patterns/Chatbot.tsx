'use client'
import { forwardRef, useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { Button } from '../button/Button.js'
import { Icon } from '../Icon.js'
import { cx } from '../internal/cx.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { chatbotMessages } from './chatbot-messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    chatbot: typeof chatbotMessages
  }
}

export type ChatMessage = {
  /** Stable key for the message. */
  id: string
  /** Who wrote it; assistant messages get a Copy button, once they are no longer being written. */
  role: 'user' | 'assistant'
  /** The message, shown as plain text. */
  text: string
  /** Preformatted time shown after the author when `showTimestamps` is on, e.g. "9:41". */
  timestamp?: string
}
export type ChatbotProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'children' | 'onCopy'> & {
  /** Visible header title; it also names the chat region and its message log. */
  title: string
  /** The conversation, oldest first; the caller owns this list. */
  messages: readonly ChatMessage[]
  /** The composer's text; the caller owns this state. */
  value: string
  /** Called with the composer's new text on every keystroke. */
  onValueChange: (value: string) => void
  /** Called with the trimmed text and current attachments on Send, Enter or a suggestion; clear `value` and append messages yourself. */
  onSend: (text: string, attachments: readonly File[]) => void
  /** A response is on its way: blocks sending and offers Stop when `onStop` is given. Until the reply starts, "Preparing a response…" shows; once the newest message is the assistant's, as when a reply streams in, it goes and the log is `aria-busy`, so screen readers read the reply once it is complete. Defaults to false. */
  loading?: boolean
  /** Shows a Stop button in place of Send while loading. */
  onStop?: () => void
  /** Shows a Retry button in the notice row. */
  onRetry?: () => void
  /** Files attached to the next message; the caller owns this list. */
  attachments?: readonly File[]
  /** Shows the Attach button; called with the chosen files (replacing the list), or an empty list on Remove. */
  onAttachmentsChange?: (files: File[]) => void
  /** Accepted attachment types, as in the native file input, e.g. "image/*,.pdf". */
  accept?: string
  /** Small text under the header title. */
  description?: ReactNode
  /** Shows the header with `title` and `description`; defaults to true. Turn it off when your page already has a heading for the chat: `title` still names the chat region and its message log, and a floating chat keeps its close button. */
  showHeader?: boolean
  /** Shown in the thread before the first message. */
  welcome?: ReactNode
  /** Starter prompts shown as pills before the first message; choosing one sends it. */
  suggestions?: readonly string[]
  /** Small text under the composer, such as a disclaimer or an error. */
  notice?: ReactNode
  /** 'embedded' fills its container's width (default), 'floating' is a narrow raised panel, right-aligned, with a close button when `onOpenChange` is given, 'full-page' fills its container's width and height. The header and composer stay put while the thread scrolls; a height you set on the Chatbot is filled the same way. */
  layout?: 'embedded' | 'floating' | 'full-page'
  /** Shows each message's `timestamp`; defaults to false. */
  showTimestamps?: boolean
  /** Whether the chat is shown; defaults to true. When false, an "Open chat" button shows if `onOpenChange` is given. */
  open?: boolean
  /** Called with the next open state from the close and "Open chat" buttons. */
  onOpenChange?: (open: boolean) => void
  /** Called with the message on Copy instead of writing its text to the clipboard. */
  onCopy?: (message: ChatMessage) => void | Promise<void>
  /** Author name shown on the person's messages; defaults to "You". */
  userLabel?: string
  /** Author name shown on assistant messages; defaults to "Assistant". */
  assistantLabel?: string
}

/** A controlled conversation surface with a message log and composer. It makes no AI, network or simulated-response requests. */
export const Chatbot = forwardRef<HTMLElement, ChatbotProps>(function Chatbot({ title, messages, value, onValueChange, onSend, loading = false, onStop, onRetry, attachments = [], onAttachmentsChange, accept, description, showHeader = true, welcome, suggestions = [], notice, layout = 'embedded', showTimestamps = false, open = true, onOpenChange, onCopy, userLabel, assistantLabel, className, ...props }, ref) {
  const t = useDiyaMessages('chatbot', chatbotMessages)
  const id = useId()
  const composer = useRef<HTMLTextAreaElement>(null)
  const reopen = useRef<HTMLButtonElement>(null)
  const thread = useRef<HTMLDivElement>(null)
  const follows = useRef(true)
  const previousOpen = useRef(open)
  const previousLoading = useRef(loading)
  const actionHadFocus = useRef(false)
  const copyOperation = useRef(0)
  const copyContext = useRef({ open, title, messages })
  copyContext.current = { open, title, messages }
  const [copyNotice, setCopyNotice] = useState('')
  useEffect(() => {
    copyOperation.current += 1
    setCopyNotice('')
    return () => { copyOperation.current += 1 }
  }, [open])
  useEffect(() => { if (follows.current && thread.current) thread.current.scrollTop = thread.current.scrollHeight }, [messages, loading, open])
  // A thread that fills its container changes height with it; keep the latest message in view unless the reader scrolled up.
  useEffect(() => {
    const node = thread.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => { if (follows.current) node.scrollTop = node.scrollHeight })
    observer.observe(node)
    return () => observer.disconnect()
  }, [open])
  useEffect(() => {
    if (previousOpen.current !== open) {
      if (open) composer.current?.focus()
      else reopen.current?.focus()
    }
    previousOpen.current = open
  }, [open])
  useEffect(() => {
    if (previousLoading.current && !loading && actionHadFocus.current) { composer.current?.focus(); actionHadFocus.current = false }
    previousLoading.current = loading
  }, [loading])
  function send(text = value) {
    if (!text.trim() || loading) return
    follows.current = true
    copyOperation.current += 1
    setCopyNotice('')
    onSend(text.trim(), attachments)
    composer.current?.focus()
  }
  async function copy(message: ChatMessage) {
    const request = ++copyOperation.current
    setCopyNotice('')
    const current = () => request === copyOperation.current && copyContext.current.open && copyContext.current.title === title &&
      copyContext.current.messages.some(entry => entry.id === message.id && entry.role === message.role && entry.text === message.text)
    try {
      if (onCopy) await onCopy(message)
      else { if (!navigator.clipboard) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(message.text) }
      if (current()) setCopyNotice(t.copied)
    } catch { if (current()) setCopyNotice(t.copyUnavailable) }
  }
  if (!open) return onOpenChange ? <Button ref={reopen} onClick={() => onOpenChange(true)}>{t.openChat}</Button> : null
  // A reply being written into the log is held back from screen readers until it is complete. Before it
  // starts, the log stays live and shows "Preparing a response…", which goes once the reply's first words arrive.
  const writing = loading && messages[messages.length - 1]?.role === 'assistant'
  const closable = layout === 'floating' && onOpenChange
  return <section aria-label={title} {...props} ref={ref} className={cx('diya-chat diya-app-pattern-surface', className)} data-presentation={layout}>
    {(showHeader || closable) && <header className="diya-chat-header"><div>{showHeader && <><strong>{title}</strong>{description && <small>{description}</small>}</>}</div>{closable && <Button variant="quiet" iconOnly aria-label={t.closeChat} onClick={() => onOpenChange(false)}><Icon name="close" /></Button>}</header>}
    <div className="diya-chat-thread" ref={thread} role="log" aria-label={t.messages(title)} aria-live="polite" aria-relevant="additions text" aria-busy={writing || undefined} onScroll={() => { const node = thread.current; if (node) follows.current = node.scrollHeight - node.scrollTop - node.clientHeight < 50 }}>
      {!messages.length && (welcome || suggestions.length > 0) && <div className="diya-chat-welcome">{welcome}{suggestions.length > 0 && <div className="diya-chat-suggestions">{suggestions.map(suggestion => <Button key={suggestion} variant="outline" shape="pill" disabled={loading} onClick={() => send(suggestion)}>{suggestion}</Button>)}</div>}</div>}
      {messages.map((message, index) => <article key={message.id} className="diya-chat-message" data-role={message.role}><small>{message.role === 'user' ? userLabel ?? t.you : assistantLabel ?? t.assistant}{showTimestamps && message.timestamp && ` · ${message.timestamp}`}</small><p>{message.text}</p>{message.role === 'assistant' && !(writing && index === messages.length - 1) && <Button size="small" variant="quiet" onClick={() => void copy(message)}>{t.copy}</Button>}</article>)}
      {loading && !writing && <p role="status">{t.preparing}</p>}
    </div>
    <form className="diya-chat-composer" onSubmit={event => { event.preventDefault(); send() }}>
      <label className="diya-chat-sr-only" htmlFor={`${id}-message`}>{t.message}</label><textarea ref={composer} id={`${id}-message`} rows={2} placeholder={t.placeholder} value={value} onChange={event => onValueChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send() } }} />
      {attachments.length > 0 && <small>{attachments.map(file => file.name).join(', ')}{onAttachmentsChange && <button type="button" disabled={loading} onClick={() => { onAttachmentsChange([]); composer.current?.focus() }}>{t.remove}</button>}</small>}
      <div>{onAttachmentsChange ? <label className="diya-chat-attach"><Icon name="paperclip" size={16} />{t.attach}<input type="file" multiple disabled={loading} accept={accept} onChange={event => { onAttachmentsChange(Array.from(event.target.files ?? [])); event.target.value = ''; composer.current?.focus() }} /><span className="diya-chat-sr-only"> {t.attachFiles}</span></label> : <span />}
        {loading && onStop ? <Button onFocus={() => { actionHadFocus.current = true }} onBlur={event => { if (event.relatedTarget) actionHadFocus.current = false }} onClick={() => { onStop(); composer.current?.focus() }}>{t.stop}</Button> : <Button type="submit" disabled={loading || !value.trim()}>{t.send}</Button>}
      </div>
    </form>
    <div className="diya-chat-notice" role="status">{notice}{notice && copyNotice ? ' ' : ''}{copyNotice}{onRetry && <Button variant="quiet" size="small" disabled={loading} onClick={() => { onRetry(); composer.current?.focus() }}>{t.retry}</Button>}</div>
  </section>
})

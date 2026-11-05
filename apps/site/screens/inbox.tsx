'use client'
// Inbox: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/inbox/page.tsx. Vite: save as src/Inbox.tsx and render it inside your DiyaProvider.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Alert, Avatar, Button, ContentState, Drawer, List, Menu, SideNavigation, Tag, TextArea, Toast, Tooltip, useDiyaAppearance } from '@idyeah/diya'
import { Archive, ArrowLeft, FileImage, FileText, FolderInput, Hourglass, Inbox, LucideProvider, Mail, MailDot, PanelRight, Paperclip, Send, ShieldAlert } from 'lucide-react'

// Your help desk, who's signed in, and the conversations in each folder.
const PRODUCT = 'Portico'
const ME = 'Ines Moreau'

type FolderId = 'inbox' | 'waiting' | 'archive' | 'spam'
type Attachment = { name: string; size: string }
type Note = { from: string; time: string; body: string; files?: Attachment[] }
type Conversation = { id: string; folder: FolderId; name: string; email: string; subject: string; when: string; unread: boolean; notes: Note[] }

const FOLDERS: { id: FolderId; label: string; icon: ReactNode; empty: [string, string] }[] = [
  { id: 'inbox', label: 'Inbox', icon: <Inbox />, empty: ['Inbox zero', 'Every customer has an answer. Go stretch your legs.'] },
  { id: 'waiting', label: 'Waiting', icon: <Hourglass />, empty: ['Nobody to wait on', 'Conversations rest here while you wait for a customer to write back.'] },
  { id: 'archive', label: 'Archive', icon: <Archive />, empty: ['Nothing archived', 'Archived conversations land here: out of the way, never gone.'] },
  { id: 'spam', label: 'Spam', icon: <ShieldAlert />, empty: ['No spam', 'The filter is earning its keep.'] },
]

const CONVERSATIONS: Conversation[] = [
  { id: 'priya', folder: 'inbox', name: 'Priya Natarajan', email: 'priya@example.com', subject: 'Charged twice for October', when: '9:41 AM', unread: false, notes: [
    { from: 'Priya Natarajan', time: 'Today, 9:41 AM', body: 'Hi there,\n\nOur card was charged $49 twice on October 31 for the Studio plan. I’ve attached the statement. Could you refund the extra charge?\n\nThanks,\nPriya', files: [{ name: 'card-statement.png', size: '214 KB' }] },
  ] },
  { id: 'tomas', folder: 'inbox', name: 'Tomás Herrera', email: 'tomas@example.com', subject: 'Calendar sync stopped on Monday', when: '8:15 AM', unread: true, notes: [
    { from: 'Tomás Herrera', time: 'Yesterday, 4:02 PM', body: 'Since Monday, new bookings don’t show up in my phone’s calendar. The old ones are still there. Did something change?' },
    { from: ME, time: 'Yesterday, 5:20 PM', body: 'Sorry about that, Tomás. Could you send a screenshot of Settings, then Calendar? It shows whether the connection is still active.' },
    { from: 'Tomás Herrera', time: 'Today, 8:15 AM', body: 'Here you go. It says the connection expired three days ago.', files: [{ name: 'calendar-settings.png', size: '388 KB' }] },
  ] },
  { id: 'amara', folder: 'inbox', name: 'Amara Okafor', email: 'amara@example.com', subject: 'Adding a second location', when: 'Yesterday', unread: true, notes: [
    { from: 'Amara Okafor', time: 'Yesterday, 2:47 PM', body: 'We’re opening a second studio in January. Can one account handle both, with separate schedules and staff? And does it change what we pay?' },
  ] },
  { id: 'kenji', folder: 'inbox', name: 'Kenji Watanabe', email: 'kenji@example.com', subject: 'Exporting bookings to a spreadsheet', when: '2 days ago', unread: true, notes: [
    { from: 'Kenji Watanabe', time: '3 days ago, 10:12 AM', body: 'Is there a way to get all of October’s bookings into a spreadsheet for our accountant?' },
    { from: ME, time: '3 days ago, 11:30 AM', body: 'There is. Go to Bookings, set the dates to October, then choose Export. You’ll get a CSV file that opens in any spreadsheet app.' },
    { from: 'Kenji Watanabe', time: '2 days ago, 9:05 AM', body: 'Perfect, that worked. Attaching it in case anyone else asks what it looks like.', files: [{ name: 'bookings-october.csv', size: '56 KB' }] },
  ] },
  { id: 'leila', folder: 'inbox', name: 'Leila Haddad', email: 'leila@example.com', subject: 'Thank you from the front desk', when: '3 days ago', unread: false, notes: [
    { from: 'Leila Haddad', time: '3 days ago, 8:30 AM', body: 'Just a note to say the new waitlist saved our Saturday. Three cancellations, three spots filled before we even noticed. The front desk says thank you!' },
  ] },
  { id: 'sven', folder: 'inbox', name: 'Sven Lindqvist', email: 'sven@example.com', subject: 'VAT number on invoices', when: 'Last week', unread: false, notes: [
    { from: 'Sven Lindqvist', time: 'A week ago, 3:18 PM', body: 'Our accountant needs our VAT number on each invoice. Can you add it, starting with October’s? It’s attached for reference.', files: [{ name: 'invoice-2026-10.pdf', size: '92 KB' }] },
    { from: ME, time: 'A week ago, 4:02 PM', body: 'Done for every invoice from now on: there’s a VAT number field under Billing, then Details. I’ve also sent you a corrected October invoice.' },
  ] },
  { id: 'grace', folder: 'waiting', name: 'Grace Liu', email: 'grace@example.com', subject: 'Moving over from our old booking app', when: '6 days ago', unread: false, notes: [
    { from: 'Grace Liu', time: '6 days ago, 1:10 PM', body: `We’d like to switch to ${PRODUCT}, but we have three years of client history. Can you bring it over?` },
    { from: ME, time: '6 days ago, 2:45 PM', body: 'We can. Export your clients as a CSV from your current app and reply with it attached. We’ll import it within a day.' },
  ] },
  { id: 'omar', folder: 'waiting', name: 'Omar Farouk', email: 'omar@example.com', subject: 'Refund for unused months', when: 'Last week', unread: false, notes: [
    { from: 'Omar Farouk', time: '9 days ago, 11:20 AM', body: 'We closed the studio in September but were billed through October. Can we get those months back?' },
    { from: ME, time: '9 days ago, 12:05 PM', body: 'I’m sorry to hear about the studio, Omar. What was the last day you took bookings? I’ll refund everything after it.' },
  ] },
  { id: 'mateo', folder: 'archive', name: 'Mateo Rossi', email: 'mateo@example.com', subject: 'Password reset email never came', when: '3 weeks ago', unread: false, notes: [
    { from: 'Mateo Rossi', time: '3 weeks ago, 9:00 AM', body: 'I asked for a password reset three times. Nothing, not even in spam.' },
    { from: ME, time: '3 weeks ago, 9:40 AM', body: 'Your address had a typo on our side, Mateo. Fixed it and sent a fresh link. Sorry for the runaround!' },
  ] },
  { id: 'hana', folder: 'archive', name: 'Hana Kim', email: 'hana@example.com', subject: 'Booking two classes at once', when: '3 weeks ago', unread: false, notes: [
    { from: 'Hana Kim', time: '3 weeks ago, 6:15 PM', body: 'Can my clients book a class and the open studio right after it in one go?' },
    { from: ME, time: '3 weeks ago, 9:10 AM', body: 'Yes: turn on Bundles under Services, then pair the two. Clients see them as one booking.' },
  ] },
]

// Replace with your API calls. The stub waits a moment. A reply that mentions
// “fail” fails the first time, so you can see the error and try again.
const failedOnce = new Set<string>()
async function api(route: '/replies' | '/conversations/move' | '/conversations/read', body: Record<string, string | boolean>) {
  await new Promise((resolve) => setTimeout(resolve, route === '/replies' ? 1100 : 300))
  if (route === '/replies' && /fail/i.test(String(body.text)) && !failedOnce.has(String(body.text))) {
    failedOnce.add(String(body.text))
    return false
  }
  return true
}

const firstName = (name: string) => name.split(' ')[0]
const narrow = () => window.matchMedia('(max-width: 760px)').matches

export default function InboxScreen() {
  const [mail, setMail] = useState(CONVERSATIONS)
  const [folder, setFolder] = useState<FolderId>('inbox')
  const [openId, setOpenId] = useState('priya')
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ id: number; text: string }>()
  const listTitle = useRef<HTMLHeadingElement>(null)
  const readTitle = useRef<HTMLHeadingElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const settle = useRef(false)
  const focus = useFocusAfterRender()
  const hint = useId()
  const { glass } = useDiyaAppearance()

  const place = FOLDERS.find((entry) => entry.id === folder)!
  const shown = mail.filter((entry) => entry.folder === folder)
  const current = shown.find((entry) => entry.id === openId)
  const unread = (id: FolderId) => mail.filter((entry) => entry.folder === id && entry.unread).length
  const currentRow = () => list.current?.querySelector<HTMLElement>('[aria-current="true"]')
  const say = (text: string) => setToast({ id: Date.now(), text })

  const change = (id: string, patch: Partial<Conversation>) =>
    setMail((all) => all.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))

  function open(id: string, by: 'pointer' | 'key' = 'pointer') {
    setOpenId(id)
    if (mail.find((entry) => entry.id === id)?.unread) {
      change(id, { unread: false })
      void api('/conversations/read', { id, unread: false })
    }
    if (by === 'key') return focus(currentRow)
    setView('detail')
    if (narrow()) focus(() => readTitle.current)
  }

  const settled = () => {
    if (!settle.current) return
    settle.current = false
    setTimeout(() => listTitle.current?.focus())
  }

  function goTo(id: string) {
    settle.current = foldersOpen
    setFolder(id as FolderId)
    setOpenId('')
    setView('list')
    setFoldersOpen(false)
    focus(() => listTitle.current)
  }

  function back() {
    setView('list')
    focus(currentRow)
  }

  function move(to: FolderId) {
    if (!current) return
    const index = shown.indexOf(current)
    const rest = shown.filter((entry) => entry !== current)
    const next = rest[index] ?? rest[index - 1]
    change(current.id, { folder: to })
    void api('/conversations/move', { id: current.id, to })
    say(to === 'archive' ? 'Conversation archived.' : `Moved to ${FOLDERS.find((entry) => entry.id === to)?.label}.`)
    if (next && !narrow()) {
      open(next.id)
      focus(() => readTitle.current)
    } else {
      setOpenId('')
      setView('list')
      focus(() => listTitle.current)
    }
  }

  function markUnread() {
    if (!current) return
    change(current.id, { unread: true })
    void api('/conversations/read', { id: current.id, unread: true })
    say('Marked as unread.')
    if (narrow()) back()
  }

  function sent(id: string, text: string) {
    setMail((all) => all.map((entry) =>
      entry.id === id ? { ...entry, when: 'Just now', notes: [...entry.notes, { from: ME, time: 'Just now', body: text }] } : entry
    ))
    setDrafts((all) => ({ ...all, [id]: '' }))
    say(`Reply sent to ${firstName(mail.find((entry) => entry.id === id)?.name ?? '')}.`)
  }

  function step(event: KeyboardEvent<HTMLUListElement>) {
    const key = event.key.toLowerCase()
    if (event.metaKey || event.ctrlKey || event.altKey || (key !== 'j' && key !== 'k')) return
    const index = shown.findIndex((entry) => entry.id === openId)
    const next = index === -1 ? shown[0] : shown[index + (key === 'j' ? 1 : -1)]
    event.preventDefault()
    if (next) open(next.id, 'key')
  }

  const groups = [{ id: 'folders', items: FOLDERS.map(({ id, label, icon }) => ({ value: id, label, icon, count: unread(id) })) }]
  const total = unread(folder)

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="inbox" data-view={view} data-empty={shown.length === 0 || undefined} data-glass={glass || undefined}>
        <style>{css}</style>
        <aside className="inbox-side" aria-label={PRODUCT}>
          <div className="inbox-side-full">
            <SideNavigation className="inbox-nav inbox-nav-full" label="Folders" brand={<Brand />} showGroups={false} groups={groups} value={folder} onValueChange={goTo}
              footer={<p className="inbox-me"><Avatar name={ME} size="small" status="online" />{ME}</p>} />
          </div>
          <div className="inbox-side-rail">
            <SideNavigation className="inbox-nav" label="Folders" brand={<Brand />} collapsedBrand={<Mark />} collapsed showGroups={false} groups={groups} value={folder} onValueChange={goTo}
              footer={<Avatar name={ME} size="small" status="online" />} />
          </div>
        </aside>

        <main className="inbox-main" aria-labelledby={`${hint}-title`}>
          <div className="inbox-list">
            <header className="inbox-list-head">
              <div className="inbox-phone-bar">
                <Brand />
                <Button variant="quiet" className="inbox-folders" onClick={() => setFoldersOpen(true)}>
                  Folders <PanelRight />
                </Button>
              </div>
              <div className="inbox-list-titles">
                <h1 ref={listTitle} id={`${hint}-title`} tabIndex={-1} className="inbox-title">{place.label}</h1>
                {shown.length > 0 && (
                  <p className="inbox-muted">{total ? `${total} unread of ${shown.length}` : `${shown.length} conversations, all read`}</p>
                )}
              </div>
            </header>
            {shown.length > 0 ? (
              <div className="inbox-scroll">
                <List
                  ref={list}
                  label={`${place.label} conversations`}
                  aria-describedby={hint}
                  onKeyDown={step}
                  items={shown.map((entry) => ({
                    id: entry.id,
                    label: entry.name,
                    description: entry.subject,
                    leading: <Avatar name={entry.name} size="small" />,
                    trailing: <When entry={entry} />,
                    current: entry.id === openId,
                    unread: entry.unread,
                    onSelect: () => open(entry.id),
                  }))}
                />
                <p id={hint} className="inbox-hint">Tip: with a conversation focused, J and K open the next and previous one.</p>
              </div>
            ) : (
              <ContentState className="inbox-empty" headingLevel={2} icon={place.icon} title={place.empty[0]} description={place.empty[1]} />
            )}
          </div>

          <section className="inbox-reader" aria-label="Conversation">
            {current ? (
              <article className="inbox-read" aria-labelledby={`${hint}-subject`}>
                <div className="inbox-toolbar">
                  <Button variant="quiet" className="inbox-phone-only inbox-nudge" aria-label={`Back to ${place.label}`} onClick={back}>
                    <ArrowLeft /> {place.label}
                  </Button>
                  <span className="inbox-toolbar-gap" />
                  <Tooltip content="Archive">
                    <Button variant="quiet" iconOnly aria-label="Archive" disabled={folder === 'archive'} onClick={() => move('archive')}><Archive /></Button>
                  </Tooltip>
                  <Tooltip content="Mark unread">
                    <Button variant="quiet" iconOnly aria-label="Mark unread" onClick={markUnread}><MailDot /></Button>
                  </Tooltip>
                  <Menu
                    label="Move to"
                    trigger={<Button variant="quiet" iconOnly aria-label="Move to"><FolderInput /></Button>}
                    items={FOLDERS.filter((entry) => entry.id !== folder).map((entry) => ({ id: entry.id, label: entry.label, icon: entry.icon, onSelect: () => move(entry.id) }))}
                  />
                </div>
                <header className="inbox-subject">
                  <h2 ref={readTitle} id={`${hint}-subject`} tabIndex={-1} className="inbox-subject-title">{current.subject}</h2>
                  <p className="inbox-muted">{current.email} · {current.notes.length === 1 ? '1 message' : `${current.notes.length} messages`}</p>
                </header>
                <ol className="inbox-thread">
                  {current.notes.map((note, index) => (
                    <li key={index} className="inbox-note">
                      <div className="inbox-note-head">
                        <Avatar name={note.from} size="small" aria-hidden="true" />
                        <strong className="inbox-note-from">{note.from === ME ? `${ME} (you)` : note.from}</strong>
                        <span className="inbox-muted">{note.time}</span>
                      </div>
                      <p className="inbox-note-body">{note.body}</p>
                      {note.files && (
                        <ul className="inbox-files" aria-label="Attachments">
                          {note.files.map((file) => (
                            <li key={file.name}>
                              <Tag leading={file.name.endsWith('.png') ? <FileImage /> : <FileText />}>{file.name} · {file.size}</Tag>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
                <Reply key={current.id} to={current} draft={drafts[current.id] ?? ''}
                  onDraft={(text) => setDrafts((all) => ({ ...all, [current.id]: text }))} onSent={(text) => sent(current.id, text)} />
              </article>
            ) : (
              shown.length > 0 && (
                <ContentState className="inbox-empty" headingLevel={2} icon={<Mail />} title="No conversation open"
                  description="Pick one from the list to read it here." />
              )
            )}
          </section>
        </main>

        <Drawer className="inbox-drawer" open={foldersOpen} onOpenChange={setFoldersOpen} onClose={settled} side="right" title="Folders">
          <SideNavigation className="inbox-nav inbox-nav-sheet" label="Folders" showGroups={false} groups={groups} value={folder} onValueChange={goTo} />
        </Drawer>
        {toast && <Toast key={toast.id} tone="success" duration={4000} onDismiss={() => setToast(undefined)}>{toast.text}</Toast>}
      </div>
    </LucideProvider>
  )
}

function Reply({ to, draft, onDraft, onSent }: { to: Conversation; draft: string; onDraft: (text: string) => void; onSent: (text: string) => void }) {
  const [error, setError] = useState<string>()
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)

  async function send() {
    if (busy) return
    if (!draft.trim()) {
      setError('Write a reply first.')
      return field.current?.focus()
    }
    setBusy(true)
    setFailed(false)
    const ok = await api('/replies', { id: to.id, text: draft.trim() })
    setBusy(false)
    if (ok) onSent(draft.trim())
    else setFailed(true)
    field.current?.focus()
  }

  return (
    <form className="inbox-reply" noValidate aria-label="Reply" onSubmit={(event) => { event.preventDefault(); void send() }}>
      {failed && (
        <Alert className="inbox-alert" tone="error" urgent title="Your reply didn’t send." action={{ label: 'Try again', onClick: () => void send() }}>
          The connection dropped on the way out. Your reply is still here.
        </Alert>
      )}
      <TextArea ref={field} className="inbox-reply-field" label={`Reply to ${firstName(to.name)}`} rows={4} value={draft} error={error} readOnly={busy}
        onValueChange={(text) => { onDraft(text); setError(undefined) }}
        onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void send() } }} />
      <div className="inbox-reply-actions">
        <span className="inbox-muted inbox-hint-inline">⌘ or Ctrl + Enter sends</span>
        <Button type="submit" loading={busy}><Send /> Send</Button>
      </div>
    </form>
  )
}

function When({ entry }: { entry: Conversation }) {
  const files = entry.notes.some((note) => note.files)
  return (
    <span className="inbox-when">
      {files && <Paperclip size={14} />}
      {files && <span className="inbox-sr">Has attachments, </span>}
      {entry.when}
    </span>
  )
}

function Mark() {
  return <span className="inbox-mark" aria-hidden="true">{PRODUCT[0]}</span>
}

function Brand() {
  return <span className="inbox-brand"><Mark /> {PRODUCT}</span>
}

function useFocusAfterRender() {
  const [target, setTarget] = useState<{ find: () => HTMLElement | null | undefined }>()
  useEffect(() => target?.find()?.focus(), [target])
  return (find: () => HTMLElement | null | undefined) => setTarget({ find })
}

const css = `
.inbox {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  height: 100dvh;
  min-height: 100dvh;
  color: var(--diya-color-text);
}
.inbox-side { display: flex; flex-direction: column; min-height: 0; overflow-y: auto; padding: var(--diya-space-5) var(--diya-space-3); border-right: 1px solid var(--diya-color-line); }
.inbox-nav { flex: 1; width: auto; border: 0; border-radius: 0; background: transparent; backdrop-filter: none; box-shadow: none; overflow: visible; }
.inbox-nav-full,
.inbox-nav-sheet { padding: 0; }
.inbox-side-full,
.inbox-side-rail { display: flex; flex: 1 0 auto; flex-direction: column; }
.inbox-side-rail { display: none; }
.inbox-brand { display: inline-flex; align-items: center; gap: var(--diya-space-3); font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; }
.inbox-mark {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: calc(9px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent);
  color: var(--diya-color-accent-text);
  font-size: var(--diya-text-body);
  font-weight: 650;
}
.inbox-me { display: flex; align-items: center; gap: var(--diya-space-3); margin: 0; padding: var(--diya-space-4) var(--diya-space-3) 0; border-top: 1px solid var(--diya-color-line); font-size: var(--diya-text-caption); }
.inbox-main { display: grid; grid-template-columns: 360px minmax(0, 1fr); min-width: 0; min-height: 0; }
.inbox-list { display: flex; flex-direction: column; min-width: 0; min-height: 0; border-right: 1px solid var(--diya-color-line); }
.inbox-list-head { display: flex; align-items: center; gap: var(--diya-space-2); padding: var(--diya-space-5) var(--diya-space-5) var(--diya-space-3); }
.inbox-list-titles { display: grid; gap: var(--diya-space-1); min-width: 0; }
.inbox-title { margin: 0; font-size: 28px; font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; }
.inbox-title:focus,
.inbox-subject-title:focus { outline: none; }
.inbox-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.inbox-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 0 var(--diya-space-3) var(--diya-space-4); }
.inbox-when { display: inline-flex; align-items: center; gap: var(--diya-space-1); white-space: nowrap; font-variant-numeric: tabular-nums; }
.inbox-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.inbox-hint { margin: var(--diya-space-4) var(--diya-space-3) 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: var(--diya-leading-body); }
.inbox-empty { width: calc(100% - 2 * var(--diya-space-4)); max-width: 440px; margin: auto; }
.inbox[data-empty] .inbox-main { grid-template-columns: minmax(0, 1fr); }
.inbox[data-empty] .inbox-reader { display: none; }
.inbox-reader { display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow-y: auto; padding: var(--diya-space-3) var(--diya-space-7) var(--diya-space-7); }
.inbox[data-glass] .inbox-reader { background: color-mix(in srgb, var(--diya-color-raised) 64%, transparent); backdrop-filter: blur(24px) saturate(1.3); }
.inbox-read { width: 100%; max-width: 720px; margin-inline: auto; }
.inbox-toolbar { display: flex; align-items: center; gap: var(--diya-space-1); min-height: 56px; }
.inbox-toolbar-gap { flex: 1; }
.inbox-phone-only,
.inbox-phone-bar { display: none; }
.inbox-subject { display: grid; gap: var(--diya-space-2); padding: var(--diya-space-4) 0 var(--diya-space-6); border-bottom: 1px solid var(--diya-color-line); }
.inbox-subject-title { margin: 0; font-size: var(--diya-text-heading); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; text-wrap: balance; }
.inbox-thread { margin: 0; padding: 0; list-style: none; }
.inbox-note { display: grid; gap: var(--diya-space-3); padding: var(--diya-space-6) 0; border-bottom: 1px solid var(--diya-color-line); }
.inbox-note-head { display: flex; flex-wrap: wrap; align-items: center; column-gap: var(--diya-space-3); row-gap: var(--diya-space-1); }
.inbox-note-from { font-size: var(--diya-text-body); font-weight: 600; }
.inbox-note-head > .inbox-muted { margin-left: auto; font-variant-numeric: tabular-nums; }
.inbox-note-body { margin: 0; padding-left: 44px; font-size: var(--diya-text-body); line-height: var(--diya-leading-body); white-space: pre-line; overflow-wrap: anywhere; }
.inbox-files { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); margin: 0; padding: 0 0 0 44px; list-style: none; }
.inbox-reply { display: grid; gap: var(--diya-space-3); padding-top: var(--diya-space-6); }
.inbox-reply-field,
.inbox-alert { max-width: none; }
.inbox-reply-actions { display: flex; align-items: center; justify-content: flex-end; gap: var(--diya-space-4); }
@media (hover: none) { .inbox-hint, .inbox-hint-inline { display: none; } }
@media (max-width: 1100px) {
  .inbox { grid-template-columns: auto minmax(0, 1fr); }
  .inbox-main { grid-template-columns: 320px minmax(0, 1fr); }
  .inbox-side { padding: 0; }
  .inbox-side-full { display: none; }
  .inbox-side-rail { display: flex; }
  .inbox-reader { padding-inline: var(--diya-space-5); }
}
@media (max-width: 760px) {
  .inbox,
  .inbox-main { grid-template-columns: minmax(0, 1fr); }
  .inbox-side, .inbox-hint, .inbox-hint-inline { display: none; }
  .inbox-phone-only { display: inline-flex; }
  .inbox-list { border-right: 0; }
  .inbox-list-head { flex-direction: column; align-items: stretch; gap: var(--diya-space-3); padding: 0 var(--diya-space-4) var(--diya-space-3); }
  .inbox-phone-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-3); height: 56px; }
  .inbox-nudge { margin-left: calc(var(--diya-space-4) * -1); }
  .inbox-folders { margin-right: calc(var(--diya-space-3) * -1); }
  .inbox-scroll { padding-inline: var(--diya-space-2); }
  .inbox[data-view='list'] .inbox-reader,
  .inbox[data-view='detail'] .inbox-list { display: none; }
  .inbox-reader { padding: var(--diya-space-2) var(--diya-space-4) var(--diya-space-6); }
  .inbox-note-body, .inbox-files { padding-left: 0; }
}
`

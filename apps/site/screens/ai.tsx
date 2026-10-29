'use client'
// AI assistant: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/assistant/page.tsx. Vite: save as src/Assistant.tsx and render it inside your DiyaProvider.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Avatar, Button, Chatbot, Dialog, Drawer, Menu, Select, SideNavigation, TextInput, Toast, type ChatMessage } from '@idyeah/diya'
import { CircleAlert, Ellipsis, LucideProvider, PanelLeft, Pencil, Sparkles, SquarePen, Trash } from 'lucide-react'

// Your assistant, its models, and the chats it remembers.
const PRODUCT = 'Lumen'
const USER = 'Mariam Saleh'
const MODELS = [
  { value: 'swift', label: 'Swift', note: 'Swift answers in a moment. Good for everyday questions.' },
  { value: 'deep', label: 'Deep', note: 'Deep takes longer and thinks harder. Good for plans and numbers.' },
]
const SUGGESTIONS = [
  'Plan a weekend in Kyoto on a budget',
  'Turn my meeting notes into an email',
  'Explain compound interest like I’m 12',
  'Write a two-minute toast for a friend',
]

type Group = 'today' | 'week' | 'older'
type Chat = { id: string; title: string; group: Group; messages: ChatMessage[] }

const GROUPS: { id: Group; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Previous 7 days' },
  { id: 'older', label: 'Older' },
]

const thread = (id: string, ...texts: string[]): ChatMessage[] =>
  texts.map((text, index) => ({ id: `${id}-${index}`, role: index % 2 ? 'assistant' : 'user', text }))

const CHATS: Chat[] = [
  { id: 'lisbon', title: 'Three days in Lisbon', group: 'today', messages: thread('lisbon',
    'Plan three days in Lisbon for two, about $900 total, not counting flights.',
    'Here’s a plan that lands near $860 for two.\n\nDay 1: Alfama on foot, the castle walls at sunset ($34), and grilled sardines for dinner ($45).\nDay 2: a day trip to Sintra by train ($19), with the palace gardens rather than the palace ($40).\nDay 3: the riverside to Belém, custard tarts on the way ($12), and a slow last dinner ($80).\n\nA guesthouse for three nights is about $480; transit passes, about $50.',
    'Can we swap the castle for something outdoors and free?',
    'Easily. Walk up to one of the hilltop viewpoints instead: same sunset, no ticket, and fewer people. Bring something to drink. That saves $34, so the trip comes to about $826.') },
  { id: 'toast', title: 'A toast for Ana’s wedding', group: 'today', messages: thread('toast',
    'Help me start a wedding toast for my best friend Ana. Funny, but not roast-level.',
    'Try opening with how you met, then turn it toward who she is now:\n\n“I met Ana when we were both terrible at volleyball. Twenty years later, she’s still the first person to cheer when someone else scores.”\n\nTell me one story about her and Daniel, and I’ll build the middle around it.') },
  { id: 'kitchen', title: 'Kitchen remodel budget', group: 'week', messages: thread('kitchen',
    'We have $28,000 for a kitchen remodel. Where does the money usually go?',
    'A common split for a mid-range remodel:\n\nCabinets: 30% ($8,400)\nLabor: 20% ($5,600)\nAppliances: 15% ($4,200)\nCounters: 12% ($3,360)\nFloors, lighting and plumbing: 13% ($3,640)\nContingency: 10% ($2,800)\n\nThe contingency isn’t optional. Walls hide surprises.',
    'Cabinets feel expensive. Can we keep the boxes and replace the doors?',
    'Often, yes. Refacing (new doors, drawer fronts and hardware on the old boxes) usually costs 40 to 50% of new cabinets. If the boxes are solid and square, that could save about $4,000.',
    'They’re solid. What about quartz versus butcher block?',
    'Quartz: about $3,200 for your size, no sealing, very hard to stain. Butcher block: about $1,400, warm and easy to repair, but it needs oiling every few months and dislikes standing water.\n\nA popular middle path: quartz around the sink, butcher block on the island.',
    'Love that. Add the savings back and show me the new total.',
    'With refaced cabinets and split counters:\n\nCabinets: $4,400\nLabor: $5,600\nAppliances: $4,200\nCounters: $2,300\nFloors, lighting and plumbing: $3,640\nContingency: $2,800\n\nTotal: $22,940, which leaves $5,060 of your $28,000.',
    'Should we spend the extra or keep it?',
    'Keep half as extra cushion, and spend the rest where you touch the kitchen every day: a better faucet, soft-close drawers and lighting under the cabinets. Those are the things you still notice in year five.',
    'How long will all this take?',
    'Plan on six to eight weeks once materials arrive: a week of demolition, two weeks for cabinets and counters, then finishing. Set up a temporary kitchen with a microwave and a kettle. You’ll thank yourself.',
    'Last one: what should I ask contractors?',
    'Five questions worth asking:\n\n1. Who’s on site each day, and who runs the job?\n2. What’s in the bid, and what counts as a change order?\n3. Are permits included?\n4. What’s the payment schedule? Avoid paying more than a third up front.\n5. Can I talk to two clients from the last year?') },
  { id: 'index', title: 'Index funds, simply', group: 'week', messages: thread('index',
    'What’s an index fund, in two sentences?',
    'It’s one purchase that buys you a small slice of hundreds of companies at once, following a list such as the 500 largest. You don’t pick winners; you own the whole market, usually for very low fees.') },
  { id: 'cover', title: 'Cover letter for Halden Labs', group: 'week', messages: thread('cover',
    'Tighten this opening: “I am writing to apply for the product designer role at Halden Labs.”',
    'Lead with something only you can say: “I’ve spent four years making scheduling software feel calm, and Halden Labs’ product designer role is where I’d like to do it next.”') },
  { id: 'sourdough', title: 'Sourdough starter rescue', group: 'older', messages: thread('sourdough',
    'My sourdough starter smells like nail polish. Is it dead?',
    'Not dead, just hungry. That smell means it ran out of food. Discard all but a spoonful, feed it equal weights of flour and water twice a day, and it should smell sweet and yeasty again in two or three days.') },
]

// The stub's canned answers, picked by topic.
const ANSWERS: [RegExp, string][] = [
  [/kyoto|weekend|trip/i, 'Here’s a calm, affordable weekend in Kyoto.\n\nSaturday: go early to the Fushimi Inari gates before the crowds, then lunch at a standing noodle bar. Spend the afternoon in the lanes of Higashiyama.\n\nSunday: rent a bike for about ¥1,000 and follow the Kamo River north to the Philosopher’s Path. Most temples along it charge ¥400 to ¥600.\n\nFor two, plan on about ¥38,000 with a guesthouse, bus passes and simple meals.'],
  [/notes|email/i, 'Happy to. Paste your notes, and I’ll shape them into an email: a clear subject, a two-line summary, the decisions, and who owns what by when.\n\nHere’s the shape I’ll aim for:\n\nSubject: Recap and next steps from Thursday\n\nHi team,\nWe agreed to ship the beta on Nov 20 and keep pricing as it is until January.\n\nNext steps\nPriya: final copy by Nov 16\nMarcus: testing done by Nov 18'],
  [/interest/i, 'Imagine a jar that adds 10% to whatever is inside it, once a year.\n\nYou put in $100. After a year, the jar adds $10, so you have $110.\nThe next year, it adds 10% of $110, which is $11. Now you have $121.\n\nThat extra dollar is the whole trick: you earn money on money you already earned. Leave the jar alone for 30 years, and the $100 grows to about $1,745.'],
  [/toast|wedding|friend/i, 'Here’s a toast you can say in about two minutes:\n\n“For anyone who doesn’t know me, I’m the friend who has been borrowing Sam’s jacket since 2014.\n\nSam is the person who remembers your coffee order and your mother’s birthday. Tonight, I get to watch someone remember Sam’s.\n\nSo please raise a glass: to the two of you, and to many more years of keeping each other warm.”'],
]
const GENERAL = 'Here’s how I’d start:\n\n1. Say in one sentence what a good result looks like.\n2. List what you already know, and what you’d still need to find out.\n3. Pick the smallest step you can finish today.\n\nTell me a little more about your situation, and I’ll make this specific.'

// Replace with your model call. The stub waits a moment, then streams a canned
// answer a word at a time; Stop aborts the signal. A prompt that mentions
// “fail” fails once, so you can see Retry.
async function reply(prompt: string, files: string[], options: { model: string; retry: boolean; signal: AbortSignal; onText: (text: string) => void }) {
  await wait(options.model === 'deep' ? 1800 : 900, options.signal)
  if (/fail/i.test(prompt) && !options.retry) throw new Error('No reply')
  const read = files.length ? `I’ve read ${files.join(' and ')}. ` : ''
  const answer = ANSWERS.find(([topic]) => topic.test(prompt))?.[1] ?? GENERAL
  for (const word of (read + answer).match(/\S+\s*/g) ?? []) {
    options.onText(word)
    await wait(35, options.signal)
  }
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason) }, { once: true })
  })
}

// Replace with your API call. The stub waits a moment and always succeeds.
async function api(route: '/chats/rename' | '/chats/delete', body: Record<string, unknown>) {
  await new Promise((resolve) => setTimeout(resolve, 700))
  return { ok: true, route, body }
}

type Status = 'ready' | 'busy' | 'stopped' | 'failed'
type Run = { chatId: string; prompt: string; files: string[]; replyId: string; retry: boolean; controller: AbortController }

const NOTICES: Record<Status, ReactNode> = {
  ready: `${PRODUCT} can make mistakes. Check important info.`,
  busy: `${PRODUCT} can make mistakes. Check important info.`,
  stopped: 'You stopped that reply. Retry to start it over.',
  failed: (
    <span className="ai-failed">
      <CircleAlert size={16} /> That reply didn’t come through. Retry, and {PRODUCT} will start over.
    </span>
  ),
}

let created = 0
const newId = () => `new-${Date.now().toString(36)}-${(created += 1)}`
// A short title from the first prompt. Your model can write a better one.
const titleFrom = (text: string) => {
  const clean = text.replace(/\.+$/, '')
  if (clean.length <= 28) return clean
  let title = ''
  for (const word of clean.split(/\s+/)) {
    if (`${title} ${word}`.length > 28) break
    title = title ? `${title} ${word}` : word
  }
  return `${title.replace(/(\s+(a|an|and|for|in|into|like|of|on|the|to|with))+$/i, '') || clean.slice(0, 27)}…`
}

export default function AssistantScreen() {
  const [chats, setChats] = useState(CHATS)
  const [openId, setOpenId] = useState('')
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [model, setModel] = useState('swift')
  const [status, setStatus] = useState<Status>('ready')
  const [dialog, setDialog] = useState<'rename' | 'delete' | 'clear'>()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [toast, setToast] = useState('')
  const run = useRef<Run>(undefined)
  const removed = useRef<string[]>([])
  const settle = useRef(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const focus = useFocusAfterRender()
  const chat = chats.find((entry) => entry.id === openId)

  const edit = (id: string, change: (messages: ChatMessage[]) => ChatMessage[]) =>
    setChats((list) => list.map((entry) => (entry.id === id ? { ...entry, messages: change(entry.messages) } : entry)))

  async function answer(next: Run) {
    run.current = next
    setStatus('busy')
    const write = (text: string) =>
      edit(next.chatId, (messages) =>
        messages.some((message) => message.id === next.replyId)
          ? messages.map((message) => (message.id === next.replyId ? { ...message, text: message.text + text } : message))
          : [...messages, { id: next.replyId, role: 'assistant', text }]
      )
    try {
      await reply(next.prompt, next.files, { model, retry: next.retry, signal: next.controller.signal, onText: write })
      if (run.current === next) setStatus('ready')
    } catch {
      if (run.current === next) setStatus(next.controller.signal.aborted ? 'stopped' : 'failed')
    }
  }

  function send(text: string, attached: readonly File[]) {
    const names = attached.map((file) => file.name)
    const message: ChatMessage = { id: newId(), role: 'user', text: names.length ? `${text}\n\nAttached: ${names.join(', ')}` : text }
    let chatId = openId
    if (chat) edit(chatId, (messages) => [...messages, message])
    else {
      chatId = newId()
      setChats((list) => [{ id: chatId, title: titleFrom(text), group: 'today', messages: [message] }, ...list])
      setOpenId(chatId)
    }
    setDraft('')
    setFiles([])
    void answer({ chatId, prompt: text, files: names, replyId: newId(), retry: false, controller: new AbortController() })
  }

  function retry() {
    const last = run.current
    if (!last) return
    edit(last.chatId, (messages) => messages.filter((message) => message.id !== last.replyId))
    void answer({ ...last, replyId: newId(), retry: true, controller: new AbortController() })
  }

  function open(id: string) {
    run.current?.controller.abort()
    run.current = undefined
    setStatus('ready')
    setOpenId(id)
    setDraft('')
    setFiles([])
    setHistoryOpen(false)
    focus(titleRef.current)
  }

  const settled = () => {
    if (!settle.current) return
    settle.current = false
    setTimeout(() => titleRef.current?.focus())
  }
  const openFromSheet = (id: string) => {
    settle.current = true
    open(id)
  }

  async function remove(ids: string[]) {
    await api('/chats/delete', { ids })
    removed.current = ids
  }

  function closeDialog(next: boolean) {
    if (next) return
    setDialog(undefined)
    const ids = removed.current
    if (!ids.length) return
    removed.current = []
    setChats((list) => list.filter((entry) => !ids.includes(entry.id)))
    setToast(ids.length > 1 ? 'All chats cleared.' : 'Chat deleted.')
    settle.current = true
    open('')
  }

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="ai">
        <style>{css}</style>
        <aside className="ai-rail" aria-label="Chats">
          <p className="ai-brand">
            <span className="ai-mark" aria-hidden="true"><Sparkles /></span>
            {PRODUCT}
          </p>
          <NewChat onClick={() => open('')} />
          <History chats={chats} value={openId} onOpen={open} />
          <p className="ai-account">
            <Avatar name={USER} size="small" aria-hidden="true" />
            {USER}
          </p>
        </aside>

        <main className="ai-main">
          <header className="ai-header">
            <Button variant="quiet" iconOnly aria-label="Show chats" className="ai-show-history" onClick={() => setHistoryOpen(true)}>
              <PanelLeft />
            </Button>
            <h1 ref={titleRef} tabIndex={-1} className="ai-title">{chat?.title ?? 'New chat'}</h1>
            <Select label="Model" hideLabel className="ai-model" options={MODELS} value={model} onValueChange={setModel} />
            <Menu
              label="Chat options"
              triggerIcon={<Ellipsis />}
              items={[
                { id: 'rename', label: 'Rename', icon: <Pencil />, disabled: !chat, onSelect: () => setDialog('rename') },
                { id: 'delete', label: 'Delete', icon: <Trash />, destructive: true, disabled: !chat, onSelect: () => setDialog('delete') },
                { id: 'clear', label: 'Clear all chats', destructive: true, separatorBefore: true, disabled: !chats.length, onSelect: () => setDialog('clear') },
              ]}
            />
          </header>
          <Chatbot
            className="ai-chat"
            layout="full-page"
            title={PRODUCT}
            description={MODELS.find((entry) => entry.value === model)?.note}
            assistantLabel={PRODUCT}
            messages={chat?.messages ?? []}
            value={draft}
            onValueChange={setDraft}
            onSend={send}
            loading={status === 'busy'}
            onStop={() => run.current?.controller.abort()}
            onRetry={status === 'stopped' || status === 'failed' ? retry : undefined}
            attachments={files}
            onAttachmentsChange={setFiles}
            accept="image/*,.pdf,.csv,.txt,.docx,.xlsx"
            suggestions={SUGGESTIONS}
            notice={NOTICES[status]}
            welcome={
              <div className="ai-welcome">
                <span className="ai-welcome-mark" aria-hidden="true"><Sparkles /></span>
                <h2 className="ai-welcome-title">What are we working on?</h2>
                <p className="ai-welcome-text">Ask a question, paste a draft or attach a file. {PRODUCT} is good with plans, numbers and first drafts.</p>
              </div>
            }
          />
        </main>

        <Drawer className="ai-drawer" open={historyOpen} onOpenChange={setHistoryOpen} onClose={settled} side="left" title="Chats">
          <div className="ai-drawer-body">
            <NewChat onClick={() => openFromSheet('')} />
            <History chats={chats} value={openId} onOpen={openFromSheet} />
          </div>
        </Drawer>

        {chat && (
          <RenameDialog key={chat.id} open={dialog === 'rename'} title={chat.title} onClose={() => setDialog(undefined)}
            onSave={async (title) => {
              await api('/chats/rename', { id: chat.id, title })
              setChats((list) => list.map((entry) => (entry.id === chat.id ? { ...entry, title } : entry)))
              setToast('Chat renamed.')
            }} />
        )}
        <Dialog
          open={dialog === 'delete' || dialog === 'clear'}
          onOpenChange={closeDialog}
          onClose={settled}
          size="small"
          title={dialog === 'clear' ? 'Clear all chats?' : 'Delete this chat?'}
          description={
            dialog === 'clear'
              ? `All ${chats.length} chats and their messages will be deleted. This can’t be undone.`
              : `“${chat?.title}” and its ${chat?.messages.length} messages will be deleted. This can’t be undone.`
          }
          confirmVariant="destructive"
          confirmLabel={dialog === 'clear' ? 'Clear all' : 'Delete chat'}
          onConfirm={() => remove(dialog === 'clear' ? chats.map((entry) => entry.id) : [openId])}
        />
        {toast && <Toast tone="success" duration={4000} onDismiss={() => setToast('')}>{toast}</Toast>}
      </div>
    </LucideProvider>
  )
}

function History({ chats, value, onOpen }: { chats: Chat[]; value: string; onOpen: (id: string) => void }) {
  if (!chats.length) {
    return (
      <p className="ai-history-empty">
        <strong className="ai-strong">No chats yet.</strong> Your conversations will show up here.
      </p>
    )
  }
  const groups = GROUPS.map((group) => ({
    ...group,
    items: chats.filter((entry) => entry.group === group.id).map((entry) => ({ value: entry.id, label: entry.title })),
  })).filter((group) => group.items.length > 0)
  return <SideNavigation className="ai-history" label="Chat history" groups={groups} value={value} onValueChange={onOpen} />
}

function NewChat({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" className="ai-new" onClick={onClick}>
      <SquarePen /> New chat
    </Button>
  )
}

function RenameDialog(props: { open: boolean; title: string; onClose: () => void; onSave: (title: string) => Promise<void> }) {
  const [name, setName] = useState(props.title)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const form = useId()
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (props.open) field.current?.select()
  }, [props.open])
  const cancel = () => {
    setName(props.title)
    setError(undefined)
    props.onClose()
  }

  async function save() {
    const title = name.trim()
    if (!title) {
      setError('Give the chat a name.')
      return field.current?.focus()
    }
    setBusy(true)
    await props.onSave(title)
    setBusy(false)
    props.onClose()
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => !next && props.onClose()}
      onDismiss={cancel}
      size="small"
      title="Rename chat"
      footer={
        <>
          <Button variant="quiet" onClick={cancel}>Cancel</Button>
          <Button type="submit" form={form} loading={busy}>Save</Button>
        </>
      }
    >
      <form id={form} noValidate onSubmit={(event) => { event.preventDefault(); void save() }}>
        <TextInput ref={field} label="Name" autoComplete="off" maxLength={60} value={name} error={error}
          onValueChange={(value) => { setName(value); setError(undefined) }} />
      </form>
    </Dialog>
  )
}

function useFocusAfterRender() {
  const [target, setTarget] = useState<{ node: HTMLElement | null }>()
  useEffect(() => target?.node?.focus(), [target])
  return (node: HTMLElement | null) => setTarget({ node })
}

const css = `
.ai {
  display: grid;
  grid-template-columns: 272px minmax(0, 1fr);
  height: 100dvh;
  min-height: 100dvh;
  color: var(--diya-color-text);
}
.ai-rail {
  display: flex;
  flex-direction: column;
  gap: var(--diya-space-4);
  min-height: 0;
  overflow-y: auto;
  padding: var(--diya-space-5) var(--diya-space-3);
  border-right: 1px solid var(--diya-color-line);
}
.ai-brand {
  display: flex;
  align-items: center;
  gap: var(--diya-space-3);
  margin: 0;
  padding: 0 var(--diya-space-3) var(--diya-space-2);
  font-size: var(--diya-text-large);
  font-weight: 600;
  letter-spacing: -0.01em;
}
.ai-mark,
.ai-welcome-mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: calc(9px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent);
  color: var(--diya-color-accent-text);
}
.ai-new { width: 100%; }
.ai-account {
  display: flex;
  align-items: center;
  gap: var(--diya-space-3);
  margin: auto 0 0;
  padding: var(--diya-space-4) var(--diya-space-3) 0;
  border-top: 1px solid var(--diya-color-line);
  font-size: var(--diya-text-caption);
}
.ai-history { width: auto; padding: 0; border: 0; border-radius: 0; background: transparent; backdrop-filter: none; box-shadow: none; overflow: visible; }
.ai-history-empty { margin: 0; padding: var(--diya-space-2) var(--diya-space-3); color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: var(--diya-leading-body); }
.ai-strong { display: block; color: var(--diya-color-text); font-weight: 600; }
.ai-main {
  display: flex;
  flex-direction: column;
  gap: var(--diya-space-3);
  min-width: 0;
  min-height: 0;
  padding: var(--diya-space-3) var(--diya-space-6) var(--diya-space-5);
}
.ai-header { display: flex; align-items: center; gap: var(--diya-space-2); width: 100%; max-width: 880px; min-height: 56px; margin-inline: auto; }
.ai-show-history { display: none; }
.ai-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: var(--diya-text-title);
  font-weight: 600;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ai-title:focus { outline: none; }
.ai-model { width: 112px; }
.ai-chat { flex: 1 1 0; width: 100%; max-width: 880px; min-height: 0; margin-inline: auto; }
.ai-welcome { display: grid; justify-items: center; gap: var(--diya-space-3); padding-top: var(--diya-space-6); }
.ai-welcome-mark { width: 44px; height: 44px; border-radius: calc(13px * var(--diya-corner-scale, 1)); }
.ai-welcome-title { margin: var(--diya-space-2) 0 0; font-size: var(--diya-text-heading); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; }
.ai-welcome-text { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.ai-failed { display: inline-flex; align-items: center; gap: var(--diya-space-2); color: var(--diya-color-error); }
.ai-drawer-body { display: grid; gap: var(--diya-space-4); }
@media (max-height: 720px) {
  .ai-welcome { padding-top: 0; }
  .ai-welcome-mark,
  .ai-welcome-text { display: none; }
}
@media (max-width: 880px) {
  .ai { grid-template-columns: minmax(0, 1fr); }
  .ai-rail { display: none; }
  .ai-show-history { display: inline-flex; }
  .ai-main { padding: var(--diya-space-2) var(--diya-space-3) var(--diya-space-3); gap: var(--diya-space-2); }
  .ai-model { width: 96px; }
  .ai-welcome-title { font-size: var(--diya-text-title); }
}
`

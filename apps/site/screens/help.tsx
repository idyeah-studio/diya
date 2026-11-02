'use client'
// Help center & FAQ: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/help/page.tsx. Vite: save as src/HelpCenter.tsx and render it inside your DiyaProvider.
import { useRef, useState, type ReactNode } from 'react'
import { Accordion, Button, Card, Chatbot, ContentState, Search, SiteHeader, type ChatMessage } from '@idyeah/diya'
import { ArrowRight, Blocks, ChevronRight, CreditCard, Inbox, LucideProvider, MessageCircle, Rocket, SearchX, ShieldCheck, SquarePen } from 'lucide-react'

// Your product, its help topics and the articles people search.
const PRODUCT = 'Newel'
const TOPICS = [
  { id: 'start', name: 'Getting started', about: 'Your first form, workspace and team.', count: 12, icon: <Rocket /> },
  { id: 'forms', name: 'Building forms', about: 'Questions, logic, design and payments.', count: 26, icon: <SquarePen /> },
  { id: 'responses', name: 'Responses', about: 'Notifications, exports and reports.', count: 15, icon: <Inbox /> },
  { id: 'integrations', name: 'Integrations', about: 'Webhooks, spreadsheets, chat and the API.', count: 18, icon: <Blocks /> },
  { id: 'billing', name: 'Billing and plans', about: 'Upgrades, invoices and refunds.', count: 9, icon: <CreditCard /> },
  { id: 'account', name: 'Account and security', about: 'Sign-in, roles, and where your data lives.', count: 11, icon: <ShieldCheck /> },
]
type Article = { id: string; title: string; summary: string; topic: string }
const ARTICLES: Article[] = [
  { id: 'first-form', topic: 'start', title: 'Create your first form', summary: 'Start from a template or a blank page, and share a link in under five minutes.' },
  { id: 'invite', topic: 'start', title: 'Invite your team', summary: 'Add editors and viewers, and choose who gets to see responses.' },
  { id: 'import', topic: 'start', title: 'Bring your forms from another tool', summary: 'Paste a public form link and we copy its questions over.' },
  { id: 'logic', topic: 'forms', title: 'Show or skip questions with conditional logic', summary: 'Ask follow-ups only when an earlier answer calls for them.' },
  { id: 'payments', topic: 'forms', title: 'Take payments in a form', summary: 'Charge a fixed price or let people choose an amount, through your payment provider.' },
  { id: 'design', topic: 'forms', title: 'Change your form’s look', summary: 'Fonts, colors, a logo and a background, or your own CSS on Business.' },
  { id: 'save-later', topic: 'forms', title: 'Let people save and finish later', summary: 'Respondents get a link by email that brings them back to where they left off.' },
  { id: 'custom-domain', topic: 'forms', title: 'Use your own domain', summary: 'Host your forms at an address like forms.yourcompany.com with one DNS record.' },
  { id: 'notifications', topic: 'responses', title: 'Get an email for every response', summary: 'Or a daily summary, sent to you and anyone else on the form.' },
  { id: 'export-csv', topic: 'responses', title: 'Export responses to CSV', summary: 'Download every answer, or only the ones your current filter shows.' },
  { id: 'delete-responses', topic: 'responses', title: 'Delete responses', summary: 'Remove one, a few or all of them. Deleted responses can’t be brought back.' },
  { id: 'webhooks', topic: 'integrations', title: 'Send responses to a webhook', summary: 'Post each new response to your own server as signed JSON.' },
  { id: 'sheets', topic: 'integrations', title: 'Sync responses to a spreadsheet', summary: 'Each response becomes a row, and edits sync both ways.' },
  { id: 'chat', topic: 'integrations', title: 'Post responses to your team chat', summary: 'Pick a channel, and choose which answers show in the message.' },
  { id: 'change-plan', topic: 'billing', title: 'Change or cancel your plan', summary: 'Changes take effect right away, and we refund unused time on annual plans.' },
  { id: 'refund', topic: 'billing', title: 'Ask for a refund', summary: 'Annual plans are refunded in full within 30 days. Here’s how to ask.' },
  { id: 'invoices', topic: 'billing', title: 'Download invoices and receipts', summary: 'Every charge, as a PDF, with your company details on it.' },
  { id: 'two-step', topic: 'account', title: 'Turn on two-step sign-in', summary: 'Add a code from an authenticator app each time you sign in.' },
  { id: 'sso', topic: 'account', title: 'Set up single sign-on', summary: 'Let your team sign in through your company’s identity provider, on Business.' },
  { id: 'data', topic: 'account', title: 'Where your data is stored', summary: 'Choose US or EU hosting when you create a workspace. Both are encrypted at rest.' },
]
const POPULAR_SEARCHES = ['refund', 'export', 'custom domain', 'logic', 'webhook']
const POPULAR = ['webhooks', 'export-csv', 'logic', 'change-plan', 'custom-domain']
const FAQ = [
  { id: 'free', label: 'Is there a free plan?', content: 'Yes, and it isn’t a trial. Free covers 3 forms and 100 responses a month, for as long as you like. Paid plans start at $19 a month for unlimited forms.' },
  { id: 'move', label: 'Can I bring my forms from another tool?', content: 'Yes. Paste a public form link on the Import page and we copy its questions over. Give the logic and design a quick look afterward.' },
  { id: 'data', label: 'Where is my data stored?', content: 'In the US or the EU. You choose when you create a workspace, and every response is encrypted in transit and at rest.' },
  { id: 'later', label: 'Can people save a form and finish it later?', content: 'Turn on Save progress in a form’s settings. People get a link by email that brings them back to where they left off, for up to 30 days.' },
  { id: 'refunds', label: 'How do refunds work?', content: 'Monthly plans aren’t refunded, but you can cancel any time and keep your plan until the month ends. Annual plans are refunded in full within 30 days.' },
  { id: 'nonprofit', label: 'Do you have nonprofit or education pricing?', content: 'Yes: half off any paid plan. Send us a note from the contact page with a little about your organization.' },
]

const topicName = (id: string) => TOPICS.find((topic) => topic.id === id)?.name ?? ''
const articleHref = (article: Article) => `/help/${article.topic}/${article.id}`
const terms = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map((word) => (word.length > 3 ? word.replace(/s$/, '') : word))
const haystack = (article: Article) => `${article.title} ${article.summary}`.toLowerCase()

// Search over titles and summaries: every word must appear, title matches first.
function findArticles(query: string) {
  const words = terms(query)
  if (!words.length) return []
  return ARTICLES.filter((article) => words.every((word) => haystack(article).includes(word)))
    .sort((a, b) => Number(words.some((w) => b.title.toLowerCase().includes(w))) - Number(words.some((w) => a.title.toLowerCase().includes(w))))
}

const SKIP = new Set(['what', 'when', 'with', 'have', 'that', 'this', 'from', 'your', 'does', 'there', 'about', 'would', 'could', 'should', 'please', 'help', 'need', 'want', 'into', 'just'])
let failedLast = false

// Replace with your API call. The stub waits a moment, then answers from the
// articles above, or hands over to a person when asked for one. A message with
// "fail" in it fails once, as if the connection dropped; Retry goes through.
async function askSupport(text: string): Promise<string | null> {
  await new Promise((resolve) => setTimeout(resolve, 1200))
  if (/fail/i.test(text) && !failedLast) return (failedLast = true), null
  failedLast = false
  if (/\b(person|human|someone|agent)\b/i.test(text)) return 'Okay. Amara from our support team will join this chat in about 4 minutes. If you have to go, we’ll email you at the address on your account.'
  const words = terms(text).filter((word) => word.length > 3 && !SKIP.has(word))
  const score = (article: Article) => words.filter((word) => haystack(article).includes(word)).length * 2 + words.filter((word) => article.title.toLowerCase().includes(word)).length
  const best = ARTICLES.map((article) => ({ article, score: score(article) }))
    .sort((a, b) => b.score - a.score)[0]
  if (!best?.score) return 'I couldn’t find an article about that one. Say “person” and someone from support will pick it up from here.'
  return `This one should help: “${best.article.title}.” ${best.article.summary} If it doesn’t, say “person” and I’ll bring someone in.`
}

export default function HelpCenterScreen() {
  const [query, setQuery] = useState('')
  const [chat, setChat] = useState({ started: false, open: false })
  const field = useRef<HTMLInputElement>(null)
  const results = findArticles(query)
  const searching = query.trim() !== ''
  const openChat = () => setChat({ started: true, open: true })

  function pick(term: string) {
    setQuery(term)
    field.current?.focus()
  }

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="help">
        <style>{css}</style>
        <SiteHeader
          brand={<Brand />}
          brandHref="/"
          brandLabel={`${PRODUCT} Support, home`}
          value="help"
          items={[
            { value: 'help', label: 'Help center', href: '/help' },
            { value: 'docs', label: 'Docs', href: '/docs' },
            { value: 'contact', label: 'Contact', href: '/contact' },
          ]}
        />
        <main className="help-main">
          <header className="help-hero">
            <h1 className="help-title">How can we help?</h1>
            <p className="help-lede">Answers to the questions people ask us most, from your first form to your hundredth.</p>
            <form role="search" className="help-search" onSubmit={(event) => event.preventDefault()}>
              <Search ref={field} className="help-search-field" size="large" label="Search the help center" hideLabel placeholder="Search articles, like “export”" clearable
                autoComplete="off" value={query} onValueChange={setQuery} />
            </form>
            <div className="help-pills" role="group" aria-label="Popular searches">
              <span className="help-pills-label" aria-hidden="true">Popular:</span>
              {POPULAR_SEARCHES.map((term) => (
                <Button key={term} variant="outline" size="small" onClick={() => pick(term)}>{term}</Button>
              ))}
            </div>
          </header>

          <div className={searching ? 'help-found' : 'help-hidden'}>
            <p className={results.length ? 'help-count' : 'help-hidden'} role="status">
              {searching && (results.length ? `${results.length} ${results.length === 1 ? 'article matches' : 'articles match'} “${query.trim()}”` : `No articles match “${query.trim()}”`)}
            </p>
            {searching && (results.length ? (
              <ul className="help-results" aria-label="Search results">
                {results.map((article) => (
                  <li key={article.id}>
                    <ArticleLink article={article} summary />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="help-none">
                <ContentState
                  icon={<SearchX />}
                  headingLevel={2}
                  title="Nothing matches that yet"
                  description="Try fewer words, or different ones. Or skip the searching: a person can usually answer in a few minutes."
                  action={{ label: 'Chat with support', onClick: openChat }}
                />
                <p className="help-none-more">Rather write it all down? <a className="help-link" href="/contact">Send us a message</a></p>
              </div>
            ))}
          </div>

          <section className="help-section" aria-labelledby="help-topics">
            <h2 id="help-topics" className="help-heading">Browse by topic</h2>
            <ul className="help-topics">
              {TOPICS.map((topic) => (
                <li key={topic.id}>
                  <Card className="help-topic" title={topic.name} description={topic.about}
                    tags={<span className="help-topic-icon" aria-hidden="true">{topic.icon}</span>}
                    footer={
                      <a className="help-topic-link" href={`/help/${topic.id}`}>
                        <span className="help-hidden">{topic.name}, </span>{topic.count} articles <ArrowRight aria-hidden="true" />
                      </a>
                    }
                  />
                </li>
              ))}
            </ul>
          </section>

          <div className="help-pair">
            <section aria-labelledby="help-popular">
              <h2 id="help-popular" className="help-heading">Popular articles</h2>
              <ul className="help-list">
                {POPULAR.map((id) => ARTICLES.find((article) => article.id === id)!).map((article) => (
                  <li key={article.id}>
                    <ArticleLink article={article} />
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="help-faq">
              <h2 id="help-faq" className="help-heading">Questions people ask</h2>
              <Accordion className="help-faq" items={FAQ.map((item) => ({ ...item, content: <p className="help-answer">{item.content}</p> }))} />
            </section>
          </div>

          <section className="help-stuck" aria-labelledby="help-stuck">
            <span className="help-stuck-icon" aria-hidden="true"><MessageCircle /></span>
            <h2 id="help-stuck" className="help-heading">Still stuck?</h2>
            <p className="help-lede">A real person answers chat weekdays, 6 AM to 6 PM Pacific, usually within five minutes. Outside those hours, leave a message and we’ll pick it up first thing.</p>
            <div className="help-stuck-actions">
              <Button onClick={openChat}><MessageCircle /> Chat with us</Button>
              <Button variant="outline" href="/contact">Send a message</Button>
            </div>
          </section>
        </main>

        <SupportChat started={chat.started} open={chat.open} onOpenChange={(open) => setChat({ started: true, open })} />
      </div>
    </LucideProvider>
  )
}

function SupportChat({ started, open, onOpenChange }: { started: boolean; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [replying, setReplying] = useState(false)
  const [failed, setFailed] = useState<string>()

  async function answer(text: string) {
    setFailed(undefined)
    setReplying(true)
    const reply = await askSupport(text)
    setReplying(false)
    if (reply === null) return setFailed(text)
    setMessages((all) => [...all, { id: `a${Date.now()}`, role: 'assistant', text: reply }])
  }

  function send(text: string) {
    setMessages((all) => [...all, { id: `u${Date.now()}`, role: 'user', text }])
    setDraft('')
    void answer(text)
  }

  return (
    <div className="help-chat" hidden={!started}>
      <Chatbot
        layout="floating"
        title={`${PRODUCT} support`}
        description="Answers from the help center, and a person when you need one."
        assistantLabel={PRODUCT}
        open={open}
        onOpenChange={onOpenChange}
        onKeyDown={(event) => event.key === 'Escape' && onOpenChange(false)}
        messages={messages}
        value={draft}
        onValueChange={setDraft}
        onSend={send}
        loading={replying}
        onRetry={failed ? () => void answer(failed) : undefined}
        notice={failed && 'That message didn’t reach us. Check your connection, then try again.'}
        welcome={<p className="help-welcome">Hi. Ask anything about {PRODUCT}. I’ll check the help center first, and get you a person if that doesn’t do it.</p>}
        suggestions={['How do I export responses?', 'Can I get a refund?', 'I’d like to talk to a person']}
      />
    </div>
  )
}

function ArticleLink({ article, summary }: { article: Article; summary?: boolean }) {
  return (
    <a className="help-article" href={articleHref(article)}>
      <span className="help-article-text">
        <span className="help-article-title">{article.title}</span>
        {summary && <span className="help-article-summary">{article.summary}</span>}
        <span className="help-article-topic">{topicName(article.topic)}</span>
      </span>
      <ChevronRight aria-hidden="true" className="help-article-chevron" />
    </a>
  )
}

function Brand(): ReactNode {
  return (
    <span className="help-brand">
      <span className="help-mark" aria-hidden="true">{PRODUCT[0]}</span>
      {PRODUCT}
      <span className="help-brand-sub">Support</span>
    </span>
  )
}

const css = `
.help { min-height: 100dvh; color: var(--diya-color-text); }
.help-brand { display: inline-flex; align-items: center; gap: var(--diya-space-2); font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; }
.help-mark {
  display: grid; place-items: center; width: 28px; height: 28px; margin-inline-end: 2px;
  border-radius: calc(9px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text);
  font-size: var(--diya-text-body); font-weight: 650; line-height: 1;
}
.help-brand-sub { color: var(--diya-color-muted); font-weight: 400; }
.help-main { display: grid; gap: var(--diya-space-8); max-width: 1120px; margin: 0 auto; padding: var(--diya-space-8) var(--diya-space-6) calc(var(--diya-space-8) * 1.5); }
.help-hero { display: grid; justify-items: center; gap: var(--diya-space-4); text-align: center; padding-top: var(--diya-space-6); }
.help-title { margin: 0; font-size: var(--diya-text-hero); font-weight: 600; line-height: 1.1; letter-spacing: -0.03em; text-wrap: balance; }
.help-lede { max-width: 560px; margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-large); line-height: var(--diya-leading-body); text-wrap: pretty; }
.help-search { width: 100%; max-width: 560px; margin-top: var(--diya-space-4); }
.help-search .help-search-field { max-width: none; }
.help-pills { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--diya-space-2); }
.help-pills-label { margin-inline-end: var(--diya-space-1); color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.help-found { display: grid; gap: var(--diya-space-4); width: 100%; max-width: 600px; margin: calc(var(--diya-space-5) * -1) auto 0; }
.help-count { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.help-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.help-results { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--diya-color-line); }
.help-none { display: grid; justify-items: center; gap: var(--diya-space-3); }
.help-none-more { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.help-link { color: var(--diya-color-text); text-decoration: underline; text-underline-offset: 0.2em; border-radius: 3px; }
.help-link:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: 2px; }
.help-section { display: grid; gap: var(--diya-space-5); }
.help-heading { margin: 0; font-size: var(--diya-text-heading); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; }
.help-topics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--diya-space-4); margin: 0; padding: 0; list-style: none; }
.help-topics > li { display: flex; }
.help-topic { position: relative; height: 100%; transition: border-color 0.15s ease; }
.help-topic:hover { border-color: color-mix(in srgb, var(--diya-color-text) 32%, transparent); }
.help-topic:has(.help-topic-link:focus-visible) { outline: 2px solid var(--diya-color-text); outline-offset: 2px; }
.help-topic-icon {
  display: grid; place-items: center; width: 40px; height: 40px;
  border-radius: calc(12px * var(--diya-corner-scale, 1));
  background: color-mix(in srgb, var(--diya-color-text) 6%, transparent);
}
.help-topic-link { display: inline-flex; align-items: center; gap: var(--diya-space-1); color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-variant-numeric: tabular-nums; text-decoration: none; outline: none; }
.help-topic-link::after { content: ''; position: absolute; inset: 0; border-radius: inherit; }
.help-topic-link svg { width: 16px; height: 16px; transition: transform 0.15s ease; }
.help-topic:hover .help-topic-link { color: var(--diya-color-text); }
.help-topic:hover .help-topic-link svg { transform: translateX(2px); }
.help-pair { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: var(--diya-space-8); align-items: start; }
.help-pair > section { display: grid; gap: var(--diya-space-4); }
.help-list { margin: 0; padding: 0; list-style: none; }
.help-article {
  display: flex; align-items: center; gap: var(--diya-space-4); padding: var(--diya-space-4) var(--diya-space-3);
  border-bottom: 1px solid var(--diya-color-line); color: var(--diya-color-text); text-decoration: none;
}
.help-article:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: -2px; border-radius: calc(8px * var(--diya-corner-scale, 1)); }
.help-article-text { display: grid; flex: 1; gap: 2px; min-width: 0; }
.help-article-title { font-size: var(--diya-text-body); font-weight: 500; line-height: var(--diya-leading-body); }
.help-article:hover .help-article-title { text-decoration: underline; text-underline-offset: 0.2em; }
.help-article-summary { color: var(--diya-color-text); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.help-article-topic { color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.help-article-chevron { flex-shrink: 0; color: var(--diya-color-muted); }
.help-answer { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: 1.6; text-wrap: pretty; }
.help-stuck { display: grid; justify-items: center; gap: var(--diya-space-3); text-align: center; }
.help-stuck-icon {
  display: grid; place-items: center; width: 48px; height: 48px; margin-bottom: var(--diya-space-2);
  border-radius: 50%; background: color-mix(in srgb, var(--diya-color-text) 6%, transparent);
}
.help-stuck-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--diya-space-3); margin-top: var(--diya-space-3); }
.help-chat { position: fixed; z-index: 30; right: max(var(--diya-space-5), env(safe-area-inset-right)); bottom: max(var(--diya-space-5), env(safe-area-inset-bottom)); width: min(380px, calc(100vw - 2 * var(--diya-space-4))); display: flex; justify-content: flex-end; }
.help-chat[hidden] { display: none; }
.help-chat > section { width: 100%; }
.help-faq { max-width: none; }
.help-welcome { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
@media (prefers-reduced-motion: reduce) { .help-topic, .help-topic-link svg { transition: none; } }
@media (max-width: 960px) {
  .help-topics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .help-pair { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-7); }
}
@media (max-width: 640px) {
  .help-main { gap: var(--diya-space-7); padding: var(--diya-space-6) var(--diya-space-4) var(--diya-space-8); }
  .help-hero { padding-top: var(--diya-space-4); }
  .help-title { font-size: var(--diya-text-display); }
  .help-lede { font-size: var(--diya-text-body); }
  .help-found { margin-top: calc(var(--diya-space-4) * -1); }
  .help-topics { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-3); }
  .help-chat { right: var(--diya-space-4); bottom: max(var(--diya-space-4), env(safe-area-inset-bottom)); }
}
`

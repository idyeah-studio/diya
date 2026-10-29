'use client'
// Application form: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/apply/page.tsx. Vite: save as src/Application.tsx and render it inside your DiyaProvider.
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { Alert, Button, Choice, Dialog, FileUpload, Select, TextArea, TextInput, TextLink, useDiyaAppearance } from '@idyeah/diya'
import { ArrowLeft, Check, CircleCheck, LucideProvider, Plus, X } from 'lucide-react'

// The studio, the role, and where the draft is kept on this device.
const STUDIO = 'Harbor & Finch'
const ROLE = { title: 'Senior Product Designer', where: 'Remote in the US, or our Portland studio', type: 'Full time', pay: '$165,000 to $195,000' }
const DRAFT_KEY = 'application-draft-senior-product-designer'
const YEARS = Array.from({ length: 27 }, (_, i) => String(2026 - i)).map((year) => ({ value: year, label: year }))
const HEARD = ['A friend or colleague', 'LinkedIn', 'Our newsletter', 'A design community', 'A conference talk', 'Somewhere else'].map((label) => ({ value: label, label }))
const RATING = [
  { value: '1', label: '1, I’d rather not' }, { value: '2', label: '2' }, { value: '3', label: '3, It’s fine' },
  { value: '4', label: '4' }, { value: '5', label: '5, It’s my favorite part' },
]
const NEXT = [
  'Two designers read your portfolio, usually within the week.',
  'If it’s a fit, a 30-minute call with Ruth Adeyemi, our design director.',
  'A paid two-day exercise, then a morning with the team.',
]

// Replace with your API call. The stub waits a moment, then fails when the
// email is offline@example.com. Every other application goes through.
async function sendApplication(application: Draft, resume: File | undefined) {
  await new Promise((resolve) => setTimeout(resolve, 1200))
  return application.email.trim().toLowerCase() !== 'offline@example.com' && resume !== undefined
}

type Position = { id: string; company: string; title: string; from: string; to: string }
type Draft = {
  first: string; last: string; email: string; phone: string; city: string; positions: Position[]
  portfolio: string; linkedin: string; other: string; heard: string; rating: string; essay: string; keep: string[]
}
type View = 'form' | 'review' | 'sent'
type Section = 'about' | 'experience' | 'portfolio' | 'resume' | 'questions'
const position = (): Position => ({ id: Math.random().toString(36).slice(2, 8), company: '', title: '', from: '', to: 'now' })
const EMPTY: Draft = { first: '', last: '', email: '', phone: '', city: '', positions: [position()], portfolio: '', linkedin: '', other: '', heard: '', rating: '', essay: '', keep: [] }
const SECTIONS: { id: Section; title: string }[] = [
  { id: 'about', title: 'About you' }, { id: 'experience', title: 'Experience' }, { id: 'portfolio', title: 'Portfolio' },
  { id: 'resume', title: 'Résumé' }, { id: 'questions', title: 'A few questions' },
]
const isUrl = (text: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(text.trim())

// Every problem, in the order the fields appear, keyed by the field's id.
function problems(d: Draft, resume?: File) {
  const found: [string, string][] = []
  const need = (ok: boolean, id: string, message: string) => { if (!ok) found.push([id, message]) }
  need(!!d.first.trim(), 'first', 'Enter your first name.')
  need(!!d.last.trim(), 'last', 'Enter your last name.')
  need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()), 'email', d.email.trim() ? 'Enter an email address like name@example.com.' : 'Enter your email address.')
  need(!!d.city.trim(), 'city', 'Enter the city you live in.')
  d.positions.forEach((p, i) => {
    const which = d.positions.length > 1 ? ` for position ${i + 1}` : ''
    need(!!p.company.trim(), `${p.id}-company`, `Enter the company${which}.`)
    need(!!p.title.trim(), `${p.id}-title`, `Enter your title${which}.`)
    need(!!p.from, `${p.id}-from`, `Choose the year you started${which}.`)
    need(!p.from || p.to === 'now' || p.to >= p.from, `${p.id}-to`, `The end year comes after the start${which}.`)
  })
  need(isUrl(d.portfolio), 'portfolio', d.portfolio.trim() ? 'Enter a full link, like https://example.com/work.' : 'Add a link to your portfolio.')
  need(!d.linkedin.trim() || isUrl(d.linkedin), 'linkedin', 'Enter a full LinkedIn link, or leave it empty.')
  need(!!resume, 'resume', 'Add your résumé.')
  need(!!d.rating, 'rating', 'Choose how much you enjoy presenting.')
  need(d.essay.trim().length >= 40, 'essay', d.essay.trim() ? 'Write a little more: a few sentences is plenty.' : 'Tell us about a decision you’d defend.')
  return found
}

function focusField(id: string) {
  const node = document.getElementById(`application-${id}`)
  const target = node?.matches('input, select, textarea') ? node : node?.querySelector<HTMLElement>('input, button, select, textarea')
  target?.focus()
  target?.scrollIntoView({ block: 'center' })
}

export default function ApplicationScreen() {
  const { glass } = useDiyaAppearance()
  const [draft, setDraft] = useState(EMPTY)
  const [resume, setResume] = useState<File>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [summary, setSummary] = useState<[string, string][]>([])
  const [view, setView] = useState<View>('form')
  const [saved, setSaved] = useState<string>()
  const [restored, setRestored] = useState<string>()
  const [restarting, setRestarting] = useState(false)
  const loaded = useRef(false)
  const touched = useRef(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const [focusNext, setFocusNext] = useState<{ to: 'title' | 'summary' | Section }>()

  // Loads a saved draft once, in the browser. Storage can be missing or full, so every use is guarded.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const stored = JSON.parse(raw) as { draft: Draft; at: string }
        setDraft({ ...EMPTY, ...stored.draft })
        setRestored(stored.at)
        setSaved(stored.at)
      }
    } catch { /* No draft, then. */ }
    loaded.current = true
  }, [])

  // Saves the draft a moment after each change. Files stay out of it.
  useEffect(() => {
    if (!loaded.current || !touched.current || view === 'sent' || typeof window === 'undefined') return
    const timer = setTimeout(() => {
      const at = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date())
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, at }))
        setSaved(at)
      } catch {
        setSaved('')
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [draft, view])

  useEffect(() => {
    if (!focusNext) return
    if (focusNext.to === 'title') titleRef.current?.focus()
    else if (focusNext.to === 'summary') summaryRef.current?.focus()
    else {
      const heading = document.getElementById(`application-section-${focusNext.to}`)
      heading?.focus()
      heading?.scrollIntoView({ block: 'start' })
    }
  }, [focusNext])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    touched.current = true
    setDraft((now) => ({ ...now, [key]: value }))
    setErrors((now) => ({ ...now, [key]: '' }))
  }
  const setPosition = (id: string, key: keyof Position, value: string) => {
    touched.current = true
    setDraft((now) => ({ ...now, positions: now.positions.map((p) => (p.id === id ? { ...p, [key]: value } : p)) }))
    setErrors((now) => ({ ...now, [`${id}-${key}`]: '' }))
  }
  const field = (key: 'first' | 'last' | 'email' | 'phone' | 'city' | 'portfolio' | 'linkedin' | 'other') => ({
    id: `application-${key}`, className: 'application-full', value: draft[key], error: errors[key] || undefined, onValueChange: (value: string) => set(key, value),
  })

  function review() {
    const found = problems(draft, resume)
    setErrors(Object.fromEntries(found))
    setSummary(found)
    if (found.length) return setFocusNext({ to: 'summary' })
    setView('review')
    setFocusNext({ to: 'title' })
  }

  function edit(section: Section) {
    setView('form')
    setFocusNext({ to: section })
  }

  function startOver() {
    try { window.localStorage.removeItem(DRAFT_KEY) } catch { /* Nothing to remove. */ }
    setDraft({ ...EMPTY, positions: [position()] })
    setResume(undefined)
    setErrors({})
    setSummary([])
    setRestored(undefined)
    setSaved(undefined)
    touched.current = false
  }

  function sent() {
    try { window.localStorage.removeItem(DRAFT_KEY) } catch { /* Nothing to remove. */ }
    setView('sent')
    setFocusNext({ to: 'title' })
  }

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="application" data-glass={glass || undefined}>
        <style>{css}</style>
        <header className="application-bar">
          <a className="application-brand" href="/careers"><span className="application-mark" aria-hidden="true">H</span>{STUDIO}</a>
          {view !== 'sent' && (
            <span className="application-saved">
              {saved ? <><Check /> Draft saved {saved}</> : saved === '' ? 'Can’t save a draft on this device' : 'Drafts save as you type'}
            </span>
          )}
        </header>
        <main className="application-main">
          {view === 'sent' ? (
            <div className="application-done">
              <CircleCheck className="application-done-icon" size={40} strokeWidth={1.4} />
              <h1 ref={titleRef} tabIndex={-1} className="application-title">Application sent.</h1>
              <p className="application-lede" role="status">
                We reply to everyone within 10 days. A copy is on its way to <strong className="application-strong">{draft.email.trim()}</strong>.
              </p>
              <h2 className="application-h3">What happens next</h2>
              <ol className="application-next">{NEXT.map((step) => <li key={step}>{step}</li>)}</ol>
              <TextLink href="/careers" leadingIcon={<ArrowLeft />}>See the other open roles</TextLink>
            </div>
          ) : view === 'review' ? (
            <Review titleRef={titleRef} draft={draft} resume={resume} onEdit={edit} onSent={sent} />
          ) : (
            <>
              <div className="application-intro">
                <TextLink href="/careers" leadingIcon={<ArrowLeft />}>All open roles</TextLink>
                <h1 ref={titleRef} tabIndex={-1} className="application-title">{ROLE.title}</h1>
                <p className="application-meta">{ROLE.where} · {ROLE.type} · {ROLE.pay}</p>
                <p className="application-lede">
                  About 15 minutes. We save a draft on this device as you go, so you can leave and come back. Everything is required unless it says optional.
                </p>
              </div>
              {restored && (
                <Alert className="application-full" tone="info" title="Welcome back" onDismiss={() => setRestored(undefined)} action={{ label: 'Start over', onClick: () => setRestarting(true) }}>
                  We filled in the draft you saved at {restored}. Résumés aren’t kept in drafts, so add yours again.
                </Alert>
              )}
              {summary.length > 0 && (
                <Alert ref={summaryRef} tabIndex={-1} className="application-full" tone="error" title={`Fix ${summary.length === 1 ? 'one thing' : `${summary.length} things`} before you review`}>
                  <ul className="application-problems">
                    {summary.map(([id, message]) => (
                      <li key={id}>
                        <TextLink inline href={`#application-${id}`} onClick={(event) => { event.preventDefault(); focusField(id) }}>{message}</TextLink>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
              <form className="application-form" noValidate aria-label={`Apply for ${ROLE.title}`} onSubmit={(event) => { event.preventDefault(); review() }}>
                <Part id="about" title="About you">
                  <div className="application-pair">
                    <TextInput label="First name" autoComplete="given-name" {...field('first')} />
                    <TextInput label="Last name" autoComplete="family-name" {...field('last')} />
                  </div>
                  <TextInput label="Email" type="email" inputMode="email" autoComplete="email" spellCheck={false} {...field('email')} />
                  <div className="application-pair">
                    <TextInput label="Phone (optional)" type="tel" inputMode="tel" autoComplete="tel" {...field('phone')} />
                    <TextInput label="City" autoComplete="address-level2" helperText="Remote is fine. It helps with time zones." {...field('city')} />
                  </div>
                </Part>

                <Part id="experience" title="Experience" lede="Start with your current or most recent role. Two or three is plenty.">
                  {draft.positions.map((p, i) => (
                    <fieldset key={p.id} className="application-position">
                      <legend className="application-h3 application-legend">Position {i + 1}</legend>
                      {draft.positions.length > 1 && (
                        <Button variant="quiet" size="small" className="application-remove" aria-label={`Remove position ${i + 1}`}
                          onClick={() => { set('positions', draft.positions.filter((other) => other.id !== p.id)); setTimeout(() => document.getElementById('application-add')?.focus()) }}>
                          <X /> Remove
                        </Button>
                      )}
                      <div className="application-position-body">
                        <div className="application-pair">
                          <TextInput className="application-full" id={`application-${p.id}-company`} label="Company" autoComplete="organization" value={p.company}
                            error={errors[`${p.id}-company`] || undefined} onValueChange={(v) => setPosition(p.id, 'company', v)} />
                          <TextInput className="application-full" id={`application-${p.id}-title`} label="Title" autoComplete="organization-title" value={p.title}
                            error={errors[`${p.id}-title`] || undefined} onValueChange={(v) => setPosition(p.id, 'title', v)} />
                        </div>
                        <div className="application-pair">
                          <Select className="application-full" id={`application-${p.id}-from`} label="Started" placeholder="Year" options={YEARS} value={p.from}
                            error={errors[`${p.id}-from`] || undefined} onValueChange={(v) => setPosition(p.id, 'from', v)} />
                          <Select className="application-full" id={`application-${p.id}-to`} label="Ended" options={[{ value: 'now', label: 'I still work here' }, ...YEARS]} value={p.to}
                            error={errors[`${p.id}-to`] || undefined} onValueChange={(v) => setPosition(p.id, 'to', v)} />
                        </div>
                      </div>
                    </fieldset>
                  ))}
                  {draft.positions.length < 6 && (
                    <Button id="application-add" variant="outline" className="application-start"
                      onClick={() => { const next = position(); set('positions', [...draft.positions, next]); setTimeout(() => focusField(`${next.id}-company`)) }}>
                      <Plus /> Add another position
                    </Button>
                  )}
                </Part>

                <Part id="portfolio" title="Portfolio" lede="Case studies beat polish. Show us how you think, not only how it looks.">
                  <TextInput label="Portfolio link" type="url" inputMode="url" autoComplete="url" spellCheck={false} placeholder="https://" {...field('portfolio')} />
                  <TextInput label="LinkedIn (optional)" type="url" inputMode="url" autoComplete="off" spellCheck={false} {...field('linkedin')} />
                  <TextInput label="Anything else we should see? (optional)" helperText="A side project, a talk, or the password to your portfolio." {...field('other')} />
                </Part>

                <Part id="resume" title="Résumé">
                  <FileUpload className="application-full" id="application-resume" files={resume ? [resume] : []} accept=".pdf,.doc,.docx" maxBytes={10 * 1024 * 1024} headingLevel={3}
                    title="Add your résumé" description="Drop it here, or choose it from your device." helperText="PDF or Word, up to 10 MB." chooseLabel="Choose a file"
                    onFilesChange={(files) => { setResume(files[0]); setErrors((now) => ({ ...now, resume: '' })) }} />
                  {errors.resume && <p className="application-error">{errors.resume}</p>}
                </Part>

                <Part id="questions" title="A few questions">
                  <Select className="application-full" id="application-heard" label="How did you hear about us? (optional)" placeholder="Choose one" options={HEARD} value={draft.heard} onValueChange={(v) => set('heard', v)} />
                  <Choice id="application-rating" label="How much do you enjoy presenting work to clients?" helperText="There’s no wrong answer. It helps us pair you with the right team."
                    options={RATING} value={draft.rating} error={errors.rating || undefined} onValueChange={(v) => set('rating', v)} />
                  <TextArea className="application-full" id="application-essay" label="Tell us about a design decision you’d defend, and one you’d take back." rows={7} maxLength={1500} showCount
                    helperText="A few paragraphs is plenty. No need to polish." value={draft.essay} error={errors.essay || undefined} onValueChange={(v) => set('essay', v)} />
                  <Choice multiple label="Other roles (optional)" options={[{ value: 'keep', label: 'Keep my application on file for 12 months for other roles' }]}
                    value={draft.keep} onValueChange={(v) => set('keep', v)} />
                </Part>

                <div className="application-submit">
                  <Button type="submit" size="large">Review application</Button>
                  <p className="application-muted">
                    Nothing is sent until you review it. By applying, you agree to our <TextLink inline href="/privacy">Privacy Policy</TextLink>.
                  </p>
                </div>
              </form>
            </>
          )}
        </main>
        <Dialog open={restarting} onOpenChange={setRestarting} size="small" title="Start over?" description="This clears your draft from this device."
          confirmLabel="Clear my draft" confirmVariant="destructive" dismissLabel="Keep it" onConfirm={startOver} />
      </div>
    </LucideProvider>
  )
}

function Part({ id, title, lede, children }: { id: Section; title: string; lede?: string; children: ReactNode }) {
  return (
    <section className="application-section" aria-labelledby={`application-section-${id}`}>
      <div className="application-head">
        <h2 id={`application-section-${id}`} tabIndex={-1} className="application-h2">{title}</h2>
        {lede && <p className="application-muted">{lede}</p>}
      </div>
      {children}
    </section>
  )
}

type ReviewProps = { titleRef: Ref<HTMLHeadingElement>; draft: Draft; resume?: File; onEdit: (section: Section) => void; onSent: () => void }

function Review({ titleRef, draft: d, resume, onEdit, onSent }: ReviewProps) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const alertRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const optional = (text: string) => text.trim() || <span className="application-muted">Not given</span>
  const rows: Record<Section, [string, ReactNode][]> = {
    about: [['Name', `${d.first.trim()} ${d.last.trim()}`], ['Email', d.email.trim()], ['Phone', optional(d.phone)], ['City', d.city.trim()]],
    experience: d.positions.map((p) => [p.title.trim(), `${p.company.trim()}, ${p.from} to ${p.to === 'now' ? 'now' : p.to}`]),
    portfolio: [['Portfolio', d.portfolio.trim()], ['LinkedIn', optional(d.linkedin)], ['Also', optional(d.other)]],
    resume: [['File', resume ? `${resume.name}, ${Math.max(1, Math.round(resume.size / 1024))} KB` : '']],
    questions: [
      ['Heard from', optional(d.heard)], ['Presenting', RATING.find((r) => r.value === d.rating)?.label ?? ''],
      ['Your answer', <span className="application-quote">{d.essay.trim()}</span>], ['Other roles', d.keep.length ? 'Keep on file for 12 months' : 'Just this role'],
    ],
  }

  async function send() {
    setBusy(true)
    setFailed(false)
    const ok = await sendApplication(d, resume)
    setBusy(false)
    if (ok) return onSent()
    setFailed(true)
    setTimeout(() => alertRef.current?.focus())
  }

  return (
    <div className="application-review">
      <div className="application-intro">
        <h1 ref={titleRef} tabIndex={-1} className="application-title">Review your application</h1>
        <p className="application-lede">For {ROLE.title} at {STUDIO}. Check it over, then send. You can still change anything.</p>
      </div>
      {failed && (
        <Alert ref={alertRef} tabIndex={-1} className="application-full" tone="error" urgent title="Your application didn’t send" action={{ label: 'Try again', onClick: send }}>
          Something went wrong on our side. Nothing is lost, and your draft is still saved on this device.
        </Alert>
      )}
      {SECTIONS.map((section) => (
        <section key={section.id} className="application-summary" aria-labelledby={`${id}-${section.id}`}>
          <div className="application-summary-head">
            <h2 id={`${id}-${section.id}`} className="application-h2">{section.title}</h2>
            <TextLink asChild>
              <button type="button" className="application-link" aria-label={`Edit ${section.title.toLowerCase()}`} onClick={() => onEdit(section.id)}>Edit</button>
            </TextLink>
          </div>
          <dl className="application-facts">
            {rows[section.id].map(([term, value], i) => <div key={i}><dt>{term}</dt><dd>{value}</dd></div>)}
          </dl>
        </section>
      ))}
      <div className="application-submit">
        <Button size="large" loading={busy} onClick={send}>{busy ? 'Sending' : 'Send application'}</Button>
        <Button variant="quiet" disabled={busy} onClick={() => onEdit('about')}><ArrowLeft /> Back to editing</Button>
      </div>
    </div>
  )
}

const css = `
.application { min-height: 100dvh; color: var(--diya-color-text); }
.application-bar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-4);
  padding: var(--diya-space-3) var(--diya-space-6);
  border-bottom: 1px solid var(--diya-color-line);
  background: color-mix(in srgb, var(--diya-color-surface) 82%, transparent);
  backdrop-filter: blur(20px) saturate(1.2);
}
.application-brand { display: inline-flex; align-items: center; gap: var(--diya-space-3); min-height: 40px; color: inherit; font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; text-decoration: none; }
.application-brand:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 4px; border-radius: var(--diya-radius-control); }
.application-mark {
  display: grid; place-items: center; width: 28px; height: 28px;
  border-radius: calc(9px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text);
  font-size: var(--diya-text-body); font-weight: 650; line-height: 1;
}
.application-saved { display: inline-flex; align-items: center; gap: var(--diya-space-2); color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-variant-numeric: tabular-nums; white-space: nowrap; }
.application-main { display: grid; gap: var(--diya-space-6); width: 100%; max-width: 688px; margin: 0 auto; padding: var(--diya-space-7) var(--diya-space-5) var(--diya-space-8); }
.application[data-glass] .application-main {
  max-width: 760px;
  margin-block: var(--diya-space-6);
  padding-inline: var(--diya-space-7);
  border: 1px solid var(--diya-color-line);
  border-radius: calc(24px * var(--diya-corner-scale, 1));
  background: color-mix(in srgb, var(--diya-color-raised) 66%, transparent);
  backdrop-filter: blur(28px) saturate(1.15);
}
.application-intro { display: grid; justify-items: start; gap: var(--diya-space-3); }
.application-title { margin: var(--diya-space-2) 0 0; font-size: var(--diya-text-display); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.03em; text-wrap: balance; }
.application-title:focus,
.application-h2:focus { outline: none; }
.application-meta { margin: 0; font-size: var(--diya-text-body); font-weight: 500; }
.application-lede { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-large); line-height: var(--diya-leading-body); text-wrap: pretty; }
.application-strong { color: var(--diya-color-text); font-weight: 600; overflow-wrap: anywhere; }
.application-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: var(--diya-leading-body); }
.application-problems { display: grid; gap: var(--diya-space-1); margin: var(--diya-space-2) 0 0; padding-inline-start: 1.2em; }
.application-form { display: grid; gap: var(--diya-space-7); }
.application-section { display: grid; gap: var(--diya-space-5); padding-top: var(--diya-space-6); border-top: 1px solid var(--diya-color-line); }
.application-head { display: grid; gap: var(--diya-space-1); }
.application-h2 { margin: 0; font-size: var(--diya-text-title); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.015em; scroll-margin-top: 96px; }
.application-h3 { margin: 0 0 var(--diya-space-1); padding: 0; font-size: var(--diya-text-body); font-weight: 600; }
.application-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--diya-space-4); align-items: start; }
.application-position { position: relative; min-width: 0; margin: 0; padding: var(--diya-space-5); border: 1px solid var(--diya-color-line); border-radius: var(--diya-radius-surface); }
.application-legend { float: left; width: 100%; margin: 0 0 var(--diya-space-4); line-height: 32px; }
.application-position-body { clear: both; display: grid; gap: var(--diya-space-4); }
.application-remove { position: absolute; top: var(--diya-space-5); right: var(--diya-space-4); }
.application-start { justify-self: start; }
.application-full { width: 100%; max-width: none; margin-inline: 0; }
.application-error { margin: calc(-1 * var(--diya-space-2)) 0 0; color: var(--diya-color-error); font-size: var(--diya-text-caption); }
.application-submit { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-4); padding-top: var(--diya-space-6); border-top: 1px solid var(--diya-color-line); }
.application-submit .application-muted { flex: 1 1 260px; }
.application-review { display: grid; gap: var(--diya-space-6); }
.application-summary { display: grid; gap: var(--diya-space-3); }
.application-summary-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--diya-space-4); }
.application-link { padding: 0; border: 0; background: none; font: inherit; font-size: var(--diya-text-body); cursor: pointer; }
.application-facts { display: grid; margin: 0; font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.application-facts div { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: var(--diya-space-4); padding-block: var(--diya-space-3); border-top: 1px solid var(--diya-color-line); }
.application-facts dt { color: var(--diya-color-muted); }
.application-facts dd { margin: 0; overflow-wrap: anywhere; }
.application-quote { white-space: pre-line; }
.application-done { display: grid; justify-items: start; gap: var(--diya-space-4); padding-top: var(--diya-space-7); }
.application-done-icon { color: var(--diya-color-success); }
.application-done .application-h3 { margin-top: var(--diya-space-4); }
.application-next { display: grid; gap: var(--diya-space-3); margin: 0 0 var(--diya-space-4); padding-inline-start: var(--diya-space-5); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); }
.application-next li::marker { color: var(--diya-color-muted); font-variant-numeric: tabular-nums; }
@media (prefers-reduced-transparency: reduce) {
  .application-bar { background: var(--diya-color-surface); backdrop-filter: none; }
  .application[data-glass] .application-main { background: var(--diya-color-raised); backdrop-filter: none; }
}
@media (max-width: 800px) {
  .application[data-glass] .application-main { max-width: none; margin: 0; padding-inline: var(--diya-space-5); border: 0; border-radius: 0; }
}
@media (max-width: 560px) {
  .application-bar { padding-inline: var(--diya-space-4); }
  .application-main,
  .application[data-glass] .application-main { padding: var(--diya-space-5) var(--diya-space-4) var(--diya-space-7); }
  .application-title { font-size: var(--diya-text-heading); }
  .application-lede { font-size: var(--diya-text-body); }
  .application-pair { grid-template-columns: minmax(0, 1fr); }
  .application-position { padding: var(--diya-space-4); }
  .application-remove { top: var(--diya-space-4); right: var(--diya-space-3); }
  .application-facts div { grid-template-columns: minmax(0, 1fr); gap: 0; }
}
@media (max-width: 380px) {
  .application-saved { white-space: normal; text-align: end; }
}
`

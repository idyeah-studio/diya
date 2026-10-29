'use client'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button, DiyaProvider, TextInput, TextLink } from '@idyeah/diya'
import './diya-styles'
import { useAppearance } from '../../app/Appearance'
import { CHOICES, choiceLabel, FORM_TOKEN_REFRESH_MS, MIN_FILL_MS, OTHER_TEXT_MAX, type Choice } from '../../lib/waitlist/config'
import { emailProblem, maskEmail, suggestEmail } from '../../lib/waitlist/email-address'
import { emailKey, noteKeyMatches, readLocalNote, writeLocalNote, type LocalNote } from '../../lib/waitlist/local-note'
import './ProWaitlist.css'

export type ProWaitlistProps = {
  /** Where the form sits; stored with the signup. */
  source: 'landing' | 'catalog'
  /** Heading level for the success and already-joined headings. Defaults to 3. */
  headingLevel?: 2 | 3 | 4
}

export const WAITLIST_PATH = '/api/waitlist'

export const WAITLIST_COPY = {
  question: 'What would you rebuild first?',
  hint: 'Optional. It tells us what Relight should learn first.',
  otherLabel: 'Which screen?',
  otherHelp: `A few words. Up to ${OTHER_TEXT_MAX} characters.`,
  emailLabel: 'Your email',
  placeholder: 'name@example.com',
  submit: 'Join the Relight waitlist',
  busy: 'Joining…',
  busyStatus: 'Adding you to the list.',
  founding: 'The first 200 on the list get early access and the founding price for a year, no card.',
  privacy:
    'Relight news only, and not much of it. We never sell your email, and every message has a one-click way off the list.',
  emailEmpty: 'Add your email so we can tell you when Relight is ready.',
  emailMalformed: 'That doesn’t look like an email yet. Check the @ and the part after it.',
  server: 'That didn’t go through, and it’s on our side. Your details are still here; try again in a moment.',
  offline: 'You seem to be offline. Your details are still here for when you’re back.',
  rateLimited: 'That’s a lot of tries in a row. Give it a minute, then try again.',
  listBusy: 'The list is busy right now. Your details are still here; give it a few minutes, then try again.',
  closed: 'The list isn’t taking new names right now, so nothing was saved. Your details are still here; try again later.',
} as const
const COPY = WAITLIST_COPY

const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false

/**
 * A form token must be a moment old before the server believes a person sent
 * it, so a just-fetched one waits this long. Tests set it to 0.
 */
export const FORM_TIMING = { settleMs: MIN_FILL_MS + 150 }
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)))

type FormToken = { value: string; at: number }

type View = 'form' | 'sent' | 'already' | 'returning' | 'closed'

/**
 * The Relight waitlist (DIYA Pro) form: pill question, email, button, founding line, privacy line and every state.
 * When the list isn't taking signups it renders nothing visible, and an ancestor marked `data-waitlist-block`
 * (or the landing's `.ld-join`) hides with it, so no "coming soon" stub is ever shown.
 */
export function ProWaitlist({ source, headingLevel = 3 }: ProWaitlistProps) {
  const { theme, glass } = useAppearance()
  const id = useId()
  const emailId = `${id}-email`
  const hintId = `${id}-hint`
  const Heading = headingLevel === 2 ? 'h2' : headingLevel === 4 ? 'h4' : 'h3'

  const [view, setView] = useState<View>('form')
  const [choice, setChoice] = useState<Choice | null>(null)
  const [other, setOther] = useState('')
  const [email, setEmail] = useState('')
  const [tried, setTried] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [note, setNote] = useState<LocalNote | null>(null)

  const formToken = useRef<FormToken | null>(null)
  const honeypot = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const moveFocus = useRef(false)

  const problem = tried ? emailProblem(email) : null
  const emailError = problem === 'empty' ? COPY.emailEmpty : problem === 'malformed' ? COPY.emailMalformed : undefined

  /** Asks whether the list is open and takes a fresh form token. Null when the server can't be reached. */
  async function loadStatus(): Promise<boolean | null> {
    const response = await fetch(WAITLIST_PATH, { cache: 'no-store' })
    if (!response.ok) return null
    const status = (await response.json()) as { open?: boolean; formToken?: string }
    formToken.current = typeof status.formToken === 'string' ? { value: status.formToken, at: Date.now() } : null
    return status.open === false ? false : true
  }

  useEffect(() => {
    const saved = readLocalNote()
    if (saved) {
      setNote(saved)
      setView('returning')
    }
    let live = true
    loadStatus()
      .then((open) => {
        if (live && open === false) setView((current) => (current === 'form' ? 'closed' : current))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  // The typo hint waits for a pause in typing, so it never shifts the button mid-click.
  useEffect(() => {
    const timer = window.setTimeout(() => setSuggestion(suggestEmail(email)), 500)
    return () => window.clearTimeout(timer)
  }, [email])

  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    if (view === 'form') {
      const input = document.getElementById(emailId) as HTMLInputElement | null
      input?.focus()
      input?.select()
    } else {
      heading.current?.focus()
    }
  }, [view, emailId])

  function showForm() {
    moveFocus.current = true
    setFormError('')
    setView('form')
    // A new address gets a new token.
    loadStatus().catch(() => {})
  }

  /** A token that is there, younger than a day, and old enough to count as a person's. Null if the list closed. */
  async function readyToken(refresh: boolean): Promise<FormToken | null | 'closed'> {
    if (refresh || !formToken.current || Date.now() - formToken.current.at > FORM_TOKEN_REFRESH_MS) {
      formToken.current = null
      if ((await loadStatus()) === false) return 'closed'
    }
    const token = formToken.current
    if (token) await wait(token.at + FORM_TIMING.settleMs - Date.now())
    return token
  }

  async function send(token: FormToken) {
    return fetch(WAITLIST_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        choice,
        other: choice === 'other' ? other : undefined,
        source,
        website: honeypot.current?.value ?? '',
        formToken: token.value,
      }),
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setTried(true)
    setFormError('')
    setSuggestion(suggestEmail(email))
    if (emailProblem(email)) {
      document.getElementById(emailId)?.focus()
      return
    }
    if (offline()) {
      setFormError(COPY.offline)
      return
    }
    setBusy(true)
    try {
      let token = await readyToken(false)
      if (token === 'closed') return setFormError(COPY.closed)
      if (!token) return setFormError(COPY.server)
      let response = await send(token)
      // A token from another network or a day-old tab: take a fresh one and try once more.
      if (response.status === 409) {
        token = await readyToken(true)
        if (token === 'closed') return setFormError(COPY.closed)
        if (!token) return setFormError(COPY.server)
        response = await send(token)
      }
      if (response.ok) await succeeded()
      else if (response.status === 503) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setFormError(body.error === 'busy' ? COPY.listBusy : COPY.closed)
      } else setFormError(response.status === 429 ? COPY.rateLimited : COPY.server)
    } catch {
      setFormError(offline() ? COPY.offline : COPY.server)
    } finally {
      setBusy(false)
    }
  }

  async function succeeded() {
    const address = email.trim()
    const key = await emailKey(address)
    const previous = readLocalNote()
    const same = !!previous && !!key && (await noteKeyMatches(previous.key, address))
    const next: LocalNote = {
      v: 1,
      at: same ? previous.at : new Date().toISOString(),
      hint: maskEmail(address),
      key,
      choice: choice ?? (same ? previous.choice : null),
      ...(same && previous.confirmed ? { confirmed: true, founding: previous.founding } : {}),
    }
    writeLocalNote(next)
    setNote(next)
    setSentTo(address)
    moveFocus.current = true
    setView(same ? 'already' : 'sent')
  }

  const pickLabel = choiceLabel(choice)

  // Closed on arrival: nothing to show. The marker lets the block around the form hide too.
  if (view === 'closed') return <div className="pro-waitlist" data-waitlist-closed="" hidden />

  return (
    <DiyaProvider surface={false} theme={theme} glass={glass} className="pro-waitlist">
      <div className="rw-frame" data-source={source} data-view={view}>
        {view === 'form' && (
          <form className="rw-form" noValidate onSubmit={submit} aria-label="Join the Relight waitlist">
            <fieldset className="rw-question" aria-describedby={hintId}>
              <legend className="rw-legend">{COPY.question}</legend>
              <p className="rw-hint" id={hintId}>
                {COPY.hint}
              </p>
              <div className="rw-pills">
                {CHOICES.map((option) => (
                  <label className="rw-pill" key={option.value}>
                    <input
                      type="radio"
                      name={`${id}-choice`}
                      value={option.value}
                      checked={choice === option.value}
                      onChange={() => setChoice(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {choice === 'other' && (
              <TextInput
                className="rw-field"
                label={COPY.otherLabel}
                helperText={COPY.otherHelp}
                maxLength={OTHER_TEXT_MAX}
                autoComplete="off"
                value={other}
                onValueChange={setOther}
              />
            )}

            <div className="rw-email">
              <TextInput
                id={emailId}
                className="rw-field"
                label={COPY.emailLabel}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={COPY.placeholder}
                error={emailError}
                value={email}
                onValueChange={setEmail}
              />
              {suggestion && suggestion !== email.trim() && (
                <p className="rw-typo">
                  Did you mean <strong>{suggestion}</strong>?{' '}
                  <button
                    type="button"
                    className="rw-link-button"
                    onClick={() => {
                      setEmail(suggestion)
                      setSuggestion(null)
                      document.getElementById(emailId)?.focus()
                    }}
                  >
                    Use that
                  </button>
                </p>
              )}
            </div>

            <div className="rw-honeypot" aria-hidden="true">
              <label>
                Leave this empty
                <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
              </label>
            </div>

            <div className="rw-submit">
              <Button type="submit" size="large" shape="pill" loading={busy}>
                {busy ? COPY.busy : COPY.submit}
              </Button>
            </div>
            <p className="rw-error" role="alert">
              {formError}
            </p>
            <p className="rw-founding">{COPY.founding}</p>
            <p className="rw-privacy">
              {COPY.privacy}{' '}
              <TextLink href="/privacy" inline>
                Privacy
              </TextLink>
            </p>
          </form>
        )}

        {view === 'sent' && (
          <div className="rw-done">
            <Heading ref={heading} tabIndex={-1}>
              Check your inbox to confirm.
            </Heading>
            <p>
              We sent one link to <strong className="rw-address">{sentTo}</strong>. Your spot counts once you click it.
            </p>
            {pickLabel && <p className="rw-muted">You picked {pickLabel}. Noted.</p>}
            <p className="rw-muted">It can take a minute. If it isn’t there, check spam.</p>
            <Button variant="quiet" className="rw-again" onClick={showForm}>
              Wrong address? Use a different email
            </Button>
          </div>
        )}

        {view === 'already' && (
          <div className="rw-done">
            <Heading ref={heading} tabIndex={-1}>
              You’re already on the list.
            </Heading>
            <p>
              <strong className="rw-address">{sentTo}</strong> is on it, so there’s nothing else to do.
            </p>
            {!note?.confirmed && <p className="rw-muted">If you haven’t confirmed yet, the link is in our email to you.</p>}
            <Button variant="quiet" className="rw-again" onClick={showForm}>
              Use a different email
            </Button>
          </div>
        )}

        {view === 'returning' && note && (
          <div className="rw-done">
            <Heading ref={heading} tabIndex={-1}>
              You’re on the Relight list.
            </Heading>
            <p>
              Signed up as <strong className="rw-address">{note.hint}</strong>. We’ll write when it’s ready.
            </p>
            {note.confirmed && note.founding === true && (
              <p>You’re one of the first 200, so early access and the founding price are yours when Relight opens.</p>
            )}
            {note.confirmed && note.founding === false && (
              <p>The 200 founding spots had gone when you confirmed, but you’ll hear the moment Relight opens.</p>
            )}
            {!note.confirmed && <p className="rw-muted">If you haven’t confirmed yet, the link is in our email to you.</p>}
            <Button variant="quiet" className="rw-again" onClick={showForm}>
              Add another email
            </Button>
          </div>
        )}

        <p className="rw-status" role="status">
          {busy ? COPY.busyStatus : ''}
        </p>
      </div>
    </DiyaProvider>
  )
}

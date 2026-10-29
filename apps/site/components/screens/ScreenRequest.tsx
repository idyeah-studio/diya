'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button, Choice, DiyaProvider, FileUpload, TextArea, TextInput, TextLink, type FileRejection } from '@idyeah/diya'
import { useAppearance } from '../../app/Appearance'
import { IMAGE_ACCEPT, ORIGINAL_IMAGE_MAX_BYTES, TEXT_COUNTER_FROM, TEXT_MAX, TEXT_MIN } from '../../lib/screen-requests/config'
import { cleanText, textLength } from '../../lib/screen-requests/text'
import { ShrinkError, shrinkImage, type ShrunkImage } from '../../lib/screen-requests/shrink'
import { FORM_TOKEN_REFRESH_MS, MIN_FILL_MS } from '../../lib/waitlist/config'
import { emailProblem } from '../../lib/waitlist/email-address'
import { screenById } from './screens-data'
import './ScreenRequest.css'

export const REQUESTS_PATH = '/api/screen-requests'

export const REQUEST_COPY = {
  heading: 'Don’t see your screen?',
  line: 'Describe it, add a picture if you have one, and I’ll reply with what it would take.',
  closed: 'Requests open with the launch.',
  textLabel: 'What screen do you need?',
  textPlaceholder: 'A support queue where each priority has its own column.',
  textEmpty: 'Describe the screen you need.',
  textShort: 'Tell me a little more. At least 20 characters.',
  pictureLabel: 'Add a picture (optional)',
  pictureDescription: 'Drop a screenshot, sketch or photo.',
  pictureHelp: 'PNG, JPEG or WebP, up to 20\u00a0MB.',
  pictureChoose: 'Choose a picture',
  pictureType: 'That file isn’t a picture I can use. Choose a PNG, JPEG or WebP.',
  pictureSize: 'That picture is over 20 MB. Choose a smaller one, or take a screenshot of it.',
  pictureTooDetailed: 'That picture is still too big after shrinking. Try a screenshot of just the part that matters.',
  pictureUnreadable: 'That picture didn’t open. Choose another, or take a screenshot of it.',
  pictureRefused: 'That picture didn’t go through. Choose another, or take a screenshot of it.',
  picturePreparing: 'Getting it ready…',
  pictureReady: 'Ready to send',
  remove: 'Remove',
  emailLabel: 'Email',
  emailHelp: 'So I can reply.',
  emailEmpty: 'Add your email so I can reply.',
  emailMalformed: 'That doesn’t look like an email yet. Check the @ and the part after it.',
  notifyGroup: 'Updates',
  notify: 'Also tell me when it’s ready',
  privacy: 'I’ll use this only to reply about your request.',
  submit: 'Send request',
  sending: 'Sending…',
  sendingStatus: 'Sending your request.',
  sentHeading: 'Got it',
  again: 'Send another',
  rateLimited: 'Too many requests from here. Try again in an hour.',
  server: 'That didn’t go through. Try again in a moment.',
  full: 'I’ve had a lot of requests today. Try again tomorrow.',
  offline: 'You seem to be offline. Your request is still here for when you’re back.',
} as const
const COPY = REQUEST_COPY

/** The text a poster's "Want this one?" starts the request with. */
export const posterPrefill = (name: string) => `I’d like the ${name} screen.`

/**
 * A form token must be a moment old before the server believes a person sent
 * it, so a just-fetched one waits this long. Tests set it to 0.
 */
export const REQUEST_TIMING = { settleMs: MIN_FILL_MS + 150 }
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)))
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false

function poster(id: string | null | undefined) {
  const screen = screenById(id)
  return screen?.status === 'poster' ? screen : null
}

/** The poster still counts while the words name it; rewritten into another screen, it's left off. */
export function posterStillMeant(posterId: string | null, text: string) {
  const name = poster(posterId)?.name
  return name && text.toLowerCase().includes(name.toLowerCase()) ? posterId : null
}

function bytes(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`
}

type FormToken = { value: string; at: number }
type Picture = { name: string; url: string | null; image: ShrunkImage | null }

/**
 * "Don't see your screen?" at the end of the Screens gallery. Open, it takes a
 * description, an optional picture (shrunk in the browser) and an email, and
 * sends them privately to DIYA. Closed (before launch, or without its
 * services), it keeps the heading and says when it opens.
 */
export function ScreenRequest({ open, want = null }: { open: boolean; want?: string | null }) {
  const [closed, setClosed] = useState(!open)
  return (
    <section id="request" className="screens-request" aria-labelledby="screens-request-title" data-open={!closed}>
      <div className="screens-request-intro">
        <h3 id="screens-request-title">{COPY.heading}</h3>
        <p>{closed ? COPY.closed : COPY.line}</p>
      </div>
      {!closed && <RequestForm want={want} onClosed={() => setClosed(true)} />}
    </section>
  )
}

function RequestForm({ want, onClosed }: { want: string | null; onClosed: () => void }) {
  const { theme, glass } = useAppearance()
  const initialPoster = poster(want)
  const [view, setView] = useState<'form' | 'sent'>('form')
  const [text, setText] = useState(initialPoster ? posterPrefill(initialPoster.name) : '')
  const [posterId, setPosterId] = useState(initialPoster?.id ?? null)
  const [email, setEmail] = useState('')
  const [notify, setNotify] = useState(false)
  const [picture, setPicture] = useState<Picture | null>(null)
  const [pictureError, setPictureError] = useState('')
  const [pictureStatus, setPictureStatus] = useState('')
  const [tried, setTried] = useState(false)
  const [serverField, setServerField] = useState<'text' | 'email' | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [sentTo, setSentTo] = useState('')

  const formToken = useRef<FormToken | null>(null)
  const honeypot = useRef<HTMLInputElement>(null)
  const textField = useRef<HTMLTextAreaElement>(null)
  const emailField = useRef<HTMLInputElement>(null)
  const uploadRegion = useRef<HTMLElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const removeButton = useRef<HTMLButtonElement>(null)
  /** The picture being prepared, so a quick Send waits for it. */
  const preparing = useRef<Promise<ShrunkImage | null> | null>(null)
  const lastPrefill = useRef(initialPoster ? posterPrefill(initialPoster.name) : '')
  const focusNext = useRef<'card' | 'text' | 'choose' | 'remove' | null>(null)

  // A "Want this one?" on another poster, on the same page: take it, unless the person already wrote their own words.
  useEffect(() => {
    const next = poster(want)
    if (!next) return
    const prefill = posterPrefill(next.name)
    const previous = lastPrefill.current
    setPosterId(next.id)
    setText((current) => (!current.trim() || current === previous ? prefill : current))
    lastPrefill.current = prefill
  }, [want])

  const length = textLength(cleanText(text))
  const textError =
    serverField === 'text' || tried ? (length === 0 ? COPY.textEmpty : length < TEXT_MIN ? COPY.textShort : undefined) : undefined
  const problem = tried || serverField === 'email' ? emailProblem(email) : null
  const emailError =
    problem === 'empty' ? COPY.emailEmpty : problem === 'malformed' || (serverField === 'email' && !problem) ? COPY.emailMalformed : undefined

  async function loadStatus(): Promise<boolean | null> {
    const response = await fetch(REQUESTS_PATH, { cache: 'no-store' })
    if (!response.ok) return null
    const status = (await response.json()) as { open?: boolean; formToken?: string }
    formToken.current = typeof status.formToken === 'string' ? { value: status.formToken, at: Date.now() } : null
    return status.open !== false
  }

  useEffect(() => {
    let live = true
    loadStatus()
      .then((isOpen) => {
        if (live && isOpen === false) onClosed()
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const target = focusNext.current
    if (!target) return
    focusNext.current = null
    if (target === 'card') card.current?.focus()
    else if (target === 'text') textField.current?.focus()
    else if (target === 'remove') removeButton.current?.focus()
    else uploadRegion.current?.querySelector<HTMLButtonElement>('button')?.focus()
  })

  // The preview's address is let go when the picture changes or the form leaves.
  useEffect(() => () => void (picture?.url && URL.revokeObjectURL(picture.url)), [picture])

  function choose(files: File[]) {
    const file = files[0]
    if (!file) return
    setPictureError('')
    const pending: Picture = { name: file.name, url: null, image: null }
    setPicture(pending)
    setPictureStatus(COPY.picturePreparing)
    focusNext.current = 'remove'
    const job = shrinkImage(file).then(
      (image) => {
        if (preparing.current !== job) return null
        setPicture({ name: file.name, url: URL.createObjectURL(image.blob), image })
        setPictureStatus(`Picture added: ${file.name}, ${bytes(image.blob.size)}.`)
        return image
      },
      (error: unknown) => {
        if (preparing.current !== job) return null
        setPicture(null)
        setPictureStatus('')
        setPictureError(error instanceof ShrinkError && error.reason === 'too_big' ? COPY.pictureTooDetailed : COPY.pictureUnreadable)
        focusNext.current = 'choose'
        return null
      },
    )
    preparing.current = job
  }

  function reject(rejections: FileRejection[]) {
    setPictureError(rejections.some((r) => r.reason === 'type') ? COPY.pictureType : COPY.pictureSize)
  }

  function removePicture() {
    preparing.current = null
    setPicture(null)
    setPictureError('')
    setPictureStatus('Picture removed.')
    focusNext.current = 'choose'
  }

  /** A token that is there, younger than a day, and old enough to count as a person's. */
  async function readyToken(refresh: boolean): Promise<FormToken | null | 'closed'> {
    if (refresh || !formToken.current || Date.now() - formToken.current.at > FORM_TOKEN_REFRESH_MS) {
      formToken.current = null
      if ((await loadStatus()) === false) return 'closed'
    }
    const token = formToken.current
    if (token) await wait(token.at + REQUEST_TIMING.settleMs - Date.now())
    return token
  }

  function send(token: FormToken, image: ShrunkImage | null) {
    const body = new FormData()
    body.set('text', text)
    body.set('email', email)
    if (notify) body.set('notify', '1')
    const meant = posterStillMeant(posterId, text)
    if (meant) body.set('poster', meant)
    if (image) body.set('image', new File([image.blob], `picture.${image.type === 'image/webp' ? 'webp' : 'jpg'}`, { type: image.type }))
    body.set('website', honeypot.current?.value ?? '')
    body.set('formToken', token.value)
    return fetch(REQUESTS_PATH, { method: 'POST', body })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setTried(true)
    setServerField(null)
    setFormError('')
    if (length < TEXT_MIN) return textField.current?.focus()
    if (emailProblem(email)) return emailField.current?.focus()
    if (offline()) return setFormError(COPY.offline)
    setBusy(true)
    try {
      const image = picture ? await preparing.current : null
      if (picture && !image) return
      let token = await readyToken(false)
      if (token === 'closed') return onClosed()
      if (!token) return setFormError(COPY.server)
      let response = await send(token, image)
      // A token from another network or a day-old tab: take a fresh one and try once more.
      if (response.status === 409) {
        token = await readyToken(true)
        if (token === 'closed') return onClosed()
        if (!token) return setFormError(COPY.server)
        response = await send(token, image)
      }
      if (response.ok) return succeeded()
      const body = (await response.json().catch(() => ({}))) as { error?: string; field?: string }
      if (response.status === 400 && (body.field === 'text' || body.field === 'email')) {
        setServerField(body.field)
        ;(body.field === 'text' ? textField : emailField).current?.focus()
      } else if (response.status === 413 || body.field === 'image') {
        setPictureError(COPY.pictureRefused)
      } else if (response.status === 429) setFormError(COPY.rateLimited)
      else if (response.status === 503 && body.error === 'busy') setFormError(COPY.full)
      else setFormError(COPY.server)
    } catch {
      setFormError(offline() ? COPY.offline : COPY.server)
    } finally {
      setBusy(false)
    }
  }

  function succeeded() {
    setSentTo(email.trim())
    focusNext.current = 'card'
    setView('sent')
  }

  function another() {
    setText('')
    lastPrefill.current = ''
    setPosterId(null)
    setNotify(false)
    preparing.current = null
    setPicture(null)
    setPictureError('')
    setPictureStatus('')
    setTried(false)
    setFormError('')
    focusNext.current = 'text'
    setView('form')
    // A new request gets a new token.
    loadStatus().catch(() => {})
  }

  const counter = text.length >= TEXT_COUNTER_FROM

  return (
    <DiyaProvider
      surface={false}
      theme={theme}
      glass={glass}
      // The picture's own messages say what was wrong; FileUpload's general one would repeat it.
      messages={{ fileUpload: { rejected: () => '' } }}
      className="screens-request-body"
    >
      {view === 'sent' ? (
        <div ref={card} className="screens-request-done" tabIndex={-1} role="group" aria-labelledby="screens-request-done">
          <span className="screens-request-tick" aria-hidden="true" />
          <h4 id="screens-request-done">{COPY.sentHeading}</h4>
          <p>
            Thanks. I’ll reply to <strong>{sentTo}</strong>.
          </p>
          <Button variant="outline" shape="pill" onClick={another}>
            {COPY.again}
          </Button>
        </div>
      ) : (
        <form className="screens-request-form" noValidate onSubmit={submit} aria-label="Request a screen">
          <TextArea
            ref={textField}
            className="screens-request-field"
            label={COPY.textLabel}
            name="text"
            placeholder={COPY.textPlaceholder}
            maxLength={TEXT_MAX}
            showCount={counter}
            rows={4}
            value={text}
            onValueChange={(value) => {
              setText(value)
              if (serverField === 'text') setServerField(null)
            }}
            error={textError}
          />

          <div className="screens-request-picture">
            {picture ? (
              <div className="screens-request-preview" data-ready={!!picture.image}>
                <div className="screens-request-thumb">
                  {picture.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={picture.url} alt={`Preview of ${picture.name}`} />
                  ) : (
                    <span className="screens-request-spinner" aria-hidden="true" />
                  )}
                </div>
                <p>
                  <strong>{picture.name}</strong>
                  <span>{picture.image ? `${bytes(picture.image.blob.size)} · ${COPY.pictureReady}` : COPY.picturePreparing}</span>
                </p>
                <Button ref={removeButton} variant="quiet" size="small" shape="pill" onClick={removePicture} aria-label={`${COPY.remove} ${picture.name}`}>
                  {COPY.remove}
                </Button>
              </div>
            ) : (
              <FileUpload
                ref={uploadRegion}
                className="screens-request-upload"
                files={[]}
                onFilesChange={choose}
                onReject={reject}
                accept={IMAGE_ACCEPT}
                maxBytes={ORIGINAL_IMAGE_MAX_BYTES}
                title={COPY.pictureLabel}
                headingLevel={4}
                description={COPY.pictureDescription}
                chooseLabel={COPY.pictureChoose}
                helperText={COPY.pictureHelp}
              />
            )}
            <p className="screens-request-error" role="alert">
              {pictureError}
            </p>
          </div>

          <TextInput
            ref={emailField}
            className="screens-request-field"
            label={COPY.emailLabel}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="name@example.com"
            helperText={COPY.emailHelp}
            error={emailError}
            value={email}
            onValueChange={(value) => {
              setEmail(value)
              if (serverField === 'email') setServerField(null)
            }}
          />

          <Choice
            multiple
            hideLabel
            className="screens-request-notify"
            label={COPY.notifyGroup}
            options={[{ value: 'notify', label: COPY.notify }]}
            value={notify ? ['notify'] : []}
            onValueChange={(values) => setNotify(values.includes('notify'))}
          />

          <div className="screens-request-honeypot" aria-hidden="true">
            <label>
              Leave this empty
              <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          <div className="screens-request-send">
            <p className="screens-request-privacy">
              {COPY.privacy}{' '}
              <TextLink href="/privacy#screen-requests" inline>
                Privacy
              </TextLink>
            </p>
            <Button type="submit" size="large" shape="pill" loading={busy}>
              {busy ? COPY.sending : COPY.submit}
            </Button>
            <p className="screens-request-error" role="alert">
              {formError}
            </p>
          </div>
        </form>
      )}
      <p className="screens-request-sr" role="status">
        {busy ? COPY.sendingStatus : pictureStatus}
      </p>
    </DiyaProvider>
  )
}

import { CHOICES, LEGACY_LOCAL_NOTE_KEY, LOCAL_NOTE_KEY, type Choice } from './config'

/**
 * What this browser remembers after joining: a masked address ("v•••@idyeah.studio"),
 * a short one-way key to recognise the same address again, the pick, and the
 * founding answer once the confirmed page has seen it. Never the address itself.
 */
export type LocalNote = {
  v: 1
  at: string
  hint: string
  key: string
  choice: Choice | null
  confirmed?: boolean
  founding?: boolean
}

/** Moves a note saved under the pre-2026-10-20 key to the current one, once. */
function moveLegacyNote() {
  const legacy = window.localStorage.getItem(LEGACY_LOCAL_NOTE_KEY)
  if (legacy === null) return
  if (window.localStorage.getItem(LOCAL_NOTE_KEY) === null) window.localStorage.setItem(LOCAL_NOTE_KEY, legacy)
  window.localStorage.removeItem(LEGACY_LOCAL_NOTE_KEY)
}

export function readLocalNote(): LocalNote | null {
  try {
    moveLegacyNote()
    const raw = window.localStorage.getItem(LOCAL_NOTE_KEY)
    if (!raw) return null
    const note = JSON.parse(raw) as Partial<LocalNote>
    if (note?.v !== 1 || typeof note.hint !== 'string' || typeof note.key !== 'string') return null
    return {
      v: 1,
      at: typeof note.at === 'string' ? note.at : '',
      hint: note.hint,
      key: note.key,
      choice: CHOICES.some((c) => c.value === note.choice) ? (note.choice as Choice) : null,
      confirmed: note.confirmed === true || undefined,
      founding: typeof note.founding === 'boolean' ? note.founding : undefined,
    }
  } catch {
    return null
  }
}

export function writeLocalNote(note: LocalNote) {
  try {
    window.localStorage.setItem(LOCAL_NOTE_KEY, JSON.stringify(note))
  } catch {}
}

export function clearLocalNote() {
  try {
    window.localStorage.removeItem(LOCAL_NOTE_KEY)
    window.localStorage.removeItem(LEGACY_LOCAL_NOTE_KEY)
  } catch {}
}

const KEY_SALT = 'diya-waitlist:'
/** The salt before 2026-10-20. A note moved from the old storage key still carries a key made with it. */
const LEGACY_KEY_SALT = 'diya-rebuild:'

/** First 16 hex characters of SHA-256, enough to recognise the same address; empty when crypto is unavailable. */
export async function emailKey(email: string, salt = KEY_SALT) {
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}${email.trim().toLowerCase()}`))
    return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return ''
  }
}

/** Whether a saved note's key belongs to `email`, whichever salt made it. */
export async function noteKeyMatches(noteKey: string, email: string) {
  if (!noteKey) return false
  return noteKey === (await emailKey(email)) || noteKey === (await emailKey(email, LEGACY_KEY_SALT))
}

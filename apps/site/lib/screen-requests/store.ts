import type { ImageType } from './image'

export type RequestStatus = 'new' | 'replied' | 'closed'

export type RequestImage = { bytes: Uint8Array; type: ImageType }

export type ScreenRequestInput = {
  /** Lowercased. */
  email: string
  text: string
  /** The poster whose "Want this one?" opened the form, if any. */
  posterId: string | null
  /** The separate, optional "Also tell me when it's ready". */
  notifyWhenReady: boolean
  consentVersion: string
  image: RequestImage | null
  /** Keyed one-way hash of the IP address, as the waitlist keeps for rate limits. */
  ipHash: string
}

export type ScreenRequest = Omit<ScreenRequestInput, 'image' | 'text' | 'ipHash'> & {
  id: string
  createdAt: Date
  /** Null once trimmed: past its time, kept only for "when it's ready". */
  text: string | null
  image: RequestImage | null
  ipHash: string | null
  /** For "when it's ready" without a poster, named by hand on reply. */
  screenName: string | null
  status: RequestStatus
  repliedAt: Date | null
  /** When the screen shipped and its "when it's ready" email went out, recorded by hand. */
  shippedAt: Date | null
}

/**
 * The clean-up. A request is past its time once its reply is older than
 * `repliedBefore`, or it arrived unanswered before `unansweredBefore`. Then it
 * is deleted, unless it asked for "when it's ready", its screen hasn't
 * shipped and it arrived after `readySince`: that one is trimmed to the email,
 * the poster or screen name, the consent version and the dates. Closed
 * requests are always deleted.
 */
export type PurgeRule = {
  repliedBefore: Date
  unansweredBefore: Date
  readySince: Date
}

/**
 * Where requests live. Neon in production; memory for tests and local
 * development. Both keep the same rules.
 */
export interface ScreenRequestStore {
  /** Records one attempt under a hashed key and returns how many fall inside the window, this one included. */
  countAttempt(keyHash: string, windowMs: number, now: Date): Promise<number>
  insert(input: ScreenRequestInput, now: Date): Promise<ScreenRequest>
  /** Takes back a request whose notification couldn't be sent, so a retry doesn't leave a twin. */
  remove(id: string): Promise<void>
  /** Applies the clean-up (see PurgeRule). Returns how many were deleted and how many trimmed. */
  purge(rule: PurgeRule): Promise<{ deleted: number; trimmed: number }>
}

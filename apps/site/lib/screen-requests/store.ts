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

export type ScreenRequest = Omit<ScreenRequestInput, 'image'> & {
  id: string
  createdAt: Date
  image: RequestImage | null
  status: RequestStatus
  repliedAt: Date | null
}

/** What the clean-up deletes, besides every closed request. */
export type PurgeRule = {
  /** Replied requests whose reply is older than this. */
  repliedBefore: Date
  /** Unanswered requests that arrived before this. */
  unansweredBefore: Date
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
  /** Deletes closed requests, replied ones past their time and unanswered ones past theirs. Returns how many went. */
  purge(rule: PurgeRule): Promise<number>
}

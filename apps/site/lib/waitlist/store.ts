import type { Choice, Source } from './config'

export type Signup = {
  id: string
  /** Lowercased. */
  email: string
  choice: Choice | null
  otherText: string | null
  /** Where the person first joined. */
  source: Source
  consentVersion: string
  founding: boolean
  createdAt: Date
  updatedAt: Date
  confirmedAt: Date | null
  unsubscribedAt: Date | null
  lastEmailAt: Date | null
}

export type SignupInput = {
  email: string
  choice: Choice | null
  otherText: string | null
  source: Source
  consentVersion: string
}

export type TokenPurpose = 'confirm' | 'unsubscribe'

export type ConfirmResult =
  | { status: 'confirmed'; founding: boolean; already: boolean }
  | { status: 'expired' | 'invalid' }

/**
 * Where the list lives. The Neon implementation is production; the memory
 * one backs tests and local development. Both keep the same rules.
 */
export interface WaitlistStore {
  /** Records one attempt under a hashed key and returns how many fall inside the window, this one included. */
  countAttempt(keyHash: string, windowMs: number, now: Date): Promise<number>
  findByEmail(email: string): Promise<Signup | null>
  /** Adds the address when it isn't there yet; an existing row comes back untouched. */
  insertSignup(input: SignupInput, now: Date): Promise<Signup>
  /** Called only once an email is on its way: a new pick replaces the old one, an empty pick keeps it. */
  updatePick(signupId: string, input: Pick<SignupInput, 'choice' | 'otherText' | 'consentVersion'>, now: Date): Promise<void>
  /** Reserves the address's one email for the gap; false when one went out too recently. */
  claimEmailSlot(signupId: string, now: Date, gapMs: number): Promise<boolean>
  /** Gives the slot back after a send fails, so a retry can send. */
  releaseEmailSlot(signupId: string, claimedAt: Date): Promise<void>
  addToken(signupId: string, purpose: TokenPurpose, tokenHash: string, expiresAt: Date | null, now: Date): Promise<void>
  /** Confirms by a confirm-token hash; founding goes to the first `foundingLimit` confirmations. People who left stay off. */
  confirm(tokenHash: string, now: Date, foundingLimit: number): Promise<ConfirmResult>
  /**
   * Deletes addresses that never confirmed and whose last confirmation email
   * (or signup, if none went out) is older than `before`. People who left stay,
   * so they're never written to again.
   */
  purgeUnconfirmed(before: Date): Promise<void>
  /** Marks the address unsubscribed by an unsubscribe-token hash and forgets its pick. Repeat calls are fine. */
  unsubscribe(tokenHash: string, now: Date): Promise<boolean>
}

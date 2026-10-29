import type { ConfirmResult, Signup, SignupInput, TokenPurpose, WaitlistStore } from './store'
import { ATTEMPT_RETENTION_MS } from './config'

export type Attempt = { keyHash: string; at: Date }

/** countAttempt in memory: records one attempt and counts the key's attempts inside the window, pruning old ones. */
export function countAttemptIn(attempts: Attempt[], keyHash: string, windowMs: number, now: Date) {
  const prune = now.getTime() - ATTEMPT_RETENTION_MS
  for (let i = attempts.length - 1; i >= 0; i--) if (attempts[i].at.getTime() < prune) attempts.splice(i, 1)
  attempts.push({ keyHash, at: now })
  const since = now.getTime() - windowMs
  return attempts.filter((a) => a.keyHash === keyHash && a.at.getTime() > since).length
}

type Token = { signupId: string; purpose: TokenPurpose; expiresAt: Date | null; usedAt: Date | null }

/** The list in memory, for tests and local development. Same rules as the Neon store. */
export class MemoryWaitlistStore implements WaitlistStore {
  readonly signups = new Map<string, Signup>()
  readonly tokens = new Map<string, Token>()
  readonly attempts: Attempt[] = []
  private nextId = 1

  async countAttempt(keyHash: string, windowMs: number, now: Date) {
    return countAttemptIn(this.attempts, keyHash, windowMs, now)
  }

  async findByEmail(email: string) {
    const signup = this.byEmail(email)
    return signup ? { ...signup } : null
  }

  async insertSignup(input: SignupInput, now: Date) {
    const existing = this.byEmail(input.email)
    if (existing) return { ...existing }
    const signup: Signup = {
      id: String(this.nextId++),
      ...input,
      founding: false,
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      unsubscribedAt: null,
      lastEmailAt: null,
    }
    this.signups.set(signup.id, signup)
    return { ...signup }
  }

  async updatePick(signupId: string, input: Pick<SignupInput, 'choice' | 'otherText' | 'consentVersion'>, now: Date) {
    const signup = this.signups.get(signupId)
    if (!signup) return
    if (input.choice) {
      signup.choice = input.choice
      signup.otherText = input.otherText
    }
    signup.consentVersion = input.consentVersion
    signup.updatedAt = now
  }

  async claimEmailSlot(signupId: string, now: Date, gapMs: number) {
    const signup = this.signups.get(signupId)
    if (!signup || signup.unsubscribedAt) return false
    if (signup.lastEmailAt && signup.lastEmailAt.getTime() > now.getTime() - gapMs) return false
    signup.lastEmailAt = now
    return true
  }

  async releaseEmailSlot(signupId: string, claimedAt: Date) {
    const signup = this.signups.get(signupId)
    if (signup?.lastEmailAt?.getTime() === claimedAt.getTime()) signup.lastEmailAt = null
  }

  async addToken(signupId: string, purpose: TokenPurpose, tokenHash: string, expiresAt: Date | null) {
    this.tokens.set(tokenHash, { signupId, purpose, expiresAt, usedAt: null })
  }

  async confirm(tokenHash: string, now: Date, foundingLimit: number): Promise<ConfirmResult> {
    const token = this.tokens.get(tokenHash)
    const signup = token?.purpose === 'confirm' ? this.signups.get(token.signupId) : undefined
    if (!token || !signup || signup.unsubscribedAt) return { status: 'invalid' }
    if (token.usedAt) {
      return signup.confirmedAt ? { status: 'confirmed', founding: signup.founding, already: true } : { status: 'invalid' }
    }
    if (token.expiresAt && token.expiresAt.getTime() < now.getTime()) return { status: 'expired' }
    token.usedAt = now
    const already = !!signup.confirmedAt
    if (!signup.confirmedAt) {
      const taken = [...this.signups.values()].filter((s) => s.founding).length
      signup.founding = taken < foundingLimit
      signup.confirmedAt = now
    }
    signup.updatedAt = now
    return { status: 'confirmed', founding: signup.founding, already }
  }

  async purgeUnconfirmed(before: Date) {
    for (const [id, signup] of this.signups) {
      const clock = signup.lastEmailAt ?? signup.createdAt
      if (signup.confirmedAt || signup.unsubscribedAt || clock.getTime() >= before.getTime()) continue
      this.signups.delete(id)
      for (const [hash, token] of this.tokens) if (token.signupId === id) this.tokens.delete(hash)
    }
  }

  async unsubscribe(tokenHash: string, now: Date) {
    const token = this.tokens.get(tokenHash)
    const signup = token?.purpose === 'unsubscribe' ? this.signups.get(token.signupId) : undefined
    if (!signup) return false
    signup.unsubscribedAt ??= now
    signup.choice = null
    signup.otherText = null
    signup.updatedAt = now
    return true
  }

  byEmail(email: string) {
    return [...this.signups.values()].find((s) => s.email === email)
  }
}

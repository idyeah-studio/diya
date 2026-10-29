import { countAttemptIn, type Attempt } from '../waitlist/memory-store'
import type { PurgeRule, ScreenRequest, ScreenRequestInput, ScreenRequestStore } from './store'

/** Requests in memory, for tests and local development. Same rules as the Neon store. */
export class MemoryScreenRequestStore implements ScreenRequestStore {
  readonly requests = new Map<string, ScreenRequest>()
  readonly attempts: Attempt[] = []
  private nextId = 1

  async countAttempt(keyHash: string, windowMs: number, now: Date) {
    return countAttemptIn(this.attempts, keyHash, windowMs, now)
  }

  async insert(input: ScreenRequestInput, now: Date) {
    const request: ScreenRequest = { ...input, id: String(this.nextId++), createdAt: now, status: 'new', repliedAt: null }
    this.requests.set(request.id, request)
    return { ...request }
  }

  async remove(id: string) {
    this.requests.delete(id)
  }

  async purge({ repliedBefore, unansweredBefore }: PurgeRule) {
    let gone = 0
    for (const [id, request] of this.requests) {
      const expired =
        request.status === 'closed' ||
        (request.repliedAt ? request.repliedAt < repliedBefore : request.createdAt < unansweredBefore)
      if (expired && this.requests.delete(id)) gone++
    }
    return gone
  }

  /** Marks a request answered, as the manual query in db/ENV.md does. */
  reply(id: string, at: Date) {
    const request = this.requests.get(id)
    if (request) Object.assign(request, { status: 'replied', repliedAt: at })
  }

  close(id: string) {
    const request = this.requests.get(id)
    if (request) request.status = 'closed'
  }
}

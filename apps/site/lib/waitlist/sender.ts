import type { ComposedEmail } from './emails'

export type OutboundEmail = ComposedEmail & { to: string }

export interface WaitlistSender {
  send(email: OutboundEmail): Promise<void>
}

export type PostmarkConfig = {
  serverToken: string
  /** The message stream ID, e.g. "diya-waitlist". */
  stream: string
  /** "Vishal <diya@idyeah.studio>". */
  from: string
  /** Defaults to DEFAULT_REPLY_TO in config.ts, the public alias. */
  replyTo: string
}

const POSTMARK_URL = 'https://api.postmarkapp.com/email'

/** Postmark over its HTTP API, no SDK. Open and link tracking are off on every send. */
export class PostmarkSender implements WaitlistSender {
  constructor(
    private readonly config: PostmarkConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async send(email: OutboundEmail) {
    const response = await this.fetcher(POSTMARK_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': this.config.serverToken,
      },
      body: JSON.stringify({
        From: this.config.from,
        To: email.to,
        ReplyTo: this.config.replyTo,
        Subject: email.subject,
        TextBody: email.text,
        HtmlBody: email.html,
        MessageStream: this.config.stream,
        Tag: email.tag,
        TrackOpens: false,
        TrackLinks: 'None',
        Headers: email.headers.map((h) => ({ Name: h.name, Value: h.value })),
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      // Only the status and Postmark's numeric code: its message text can quote the address.
      let code = ''
      try {
        const body = (await response.json()) as { ErrorCode?: unknown }
        if (typeof body.ErrorCode === 'number') code = `, Postmark code ${body.ErrorCode}`
      } catch {}
      throw new Error(`Postmark refused the message: HTTP ${response.status}${code}`)
    }
  }
}

/** Records messages instead of sending them. Tests read `sent`; local dev prints the links. */
export class FakeSender implements WaitlistSender {
  readonly sent: OutboundEmail[] = []
  failNext = false

  constructor(private readonly log = false) {}

  async send(email: OutboundEmail) {
    if (this.failNext) {
      this.failNext = false
      throw new Error('fake send failure')
    }
    this.sent.push(email)
    if (this.log) console.info(`[waitlist] would email ${email.to}: ${email.subject}\n${email.text}`)
  }
}

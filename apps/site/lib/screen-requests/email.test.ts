import { describe, expect, it, vi } from 'vitest'
import { PostmarkSender } from '../waitlist/sender'
import { repliedQuery, screenNameQuery, screenRequestEmail } from './email'
import type { ScreenRequest } from './store'

const WEBP = Uint8Array.from([...Buffer.from('RIFF'), 9, 0, 0, 0, ...Buffer.from('WEBPVP8 '), 1, 2, 3])

const request = (extra: Partial<ScreenRequest> = {}): ScreenRequest => ({
  id: '12',
  createdAt: new Date('2026-11-08T12:10:00Z'),
  email: 'maya@studio.co',
  text: 'A support queue where each priority has its own column.\nAgents drag tickets between them.',
  posterId: null,
  notifyWhenReady: false,
  consentVersion: '2026-11-07',
  image: null,
  ipHash: 'h',
  screenName: null,
  status: 'new',
  repliedAt: null,
  shippedAt: null,
  ...extra,
})

describe('The email to DIYA for each request', () => {
  it('carries the words, the poster, the picture as an attachment, and replies to the person', () => {
    const email = screenRequestEmail({
      request: request({ posterId: 'board', notifyWhenReady: true, image: { bytes: WEBP, type: 'image/webp' } }),
      posterName: 'Board',
      siteUrl: 'https://diya13.ai',
    })
    expect(email.subject).toBe('Screen request: Board')
    expect(email.replyTo).toBe('maya@studio.co')
    expect(email.tag).toBe('screen-request')
    expect(email.headers).toEqual([])
    expect(email.attachments).toEqual([{ name: 'screen-request-12.webp', contentType: 'image/webp', content: WEBP }])
    expect(email.text).toContain('A support queue where each priority has its own column.\nAgents drag tickets between them.')
    expect(email.text).toContain('From: maya@studio.co')
    expect(email.text).toContain('Poster: Board (https://diya13.ai/explore?area=screens&screen=board)')
    expect(email.text).toContain('Picture: attached, screen-request-12.webp, 1 KB')
    expect(email.text).toContain('Wants an email when it’s ready: yes')
    expect(email.text).toContain('Received: Nov 8, 2026, 4:10 AM Pacific, request 12')
    expect(email.text).toContain(repliedQuery('12'))
    expect(email.html).toContain('screen-request-12.webp')
  })

  it('without a poster, the subject is the request’s first words; without a picture, nothing is attached', () => {
    const email = screenRequestEmail({ request: request({ text: `${'A long description of a screen '.repeat(4)}` }), posterName: null, siteUrl: 'https://diya13.ai' })
    expect(email.subject).toBe('Screen request: A long description of a screen A long description of a…')
    expect(email.subject.length).toBeLessThanOrEqual('Screen request: '.length + 60)
    expect(email.attachments).toEqual([])
    expect(email.text).toContain('Picture: none')
    expect(email.text).toContain('Wants an email when it’s ready: no')
    expect(email.text).not.toContain('Poster:')
  })

  it('escapes the person’s words in the HTML, and keeps line breaks out of the subject', () => {
    const email = screenRequestEmail({
      request: request({ text: '<script>alert(1)</script>\nand "quotes" & more words here', email: 'a@b.co' }),
      posterName: null,
      siteUrl: 'https://diya13.ai',
    })
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(email.html).toContain('&quot;quotes&quot; &amp; more')
    expect(email.subject).not.toMatch(/[\r\n]/)
  })

  it('asks for the screen’s name when the person wants to hear when it’s ready and there’s no poster', () => {
    const ask = 'name the screen when you reply:\n' + screenNameQuery('12')
    const plain = screenRequestEmail({ request: request({ notifyWhenReady: true }), posterName: null, siteUrl: 'https://diya13.ai' })
    expect(plain.text).toContain(ask)
    expect(plain.html).toContain(`set screen_name = &#39;Name of the screen&#39; where id = 12;`)
    const fromPoster = screenRequestEmail({ request: request({ notifyWhenReady: true, posterId: 'board' }), posterName: 'Board', siteUrl: 'https://diya13.ai' })
    expect(fromPoster.text).not.toContain('screen_name')
    expect(screenRequestEmail({ request: request(), posterName: null, siteUrl: 'https://diya13.ai' }).text).not.toContain('screen_name')
  })

  it('the mark-as-replied query only ever takes a number', () => {
    expect(repliedQuery('12')).toBe(`update diya_screen_requests set status = 'replied', replied_at = now() where id = 12;`)
    expect(repliedQuery('1; drop table x')).toContain('where id = NaN;')
  })
})

describe('Postmark, for a screen request', () => {
  it('sends the picture as a base64 attachment with Reply-To the person, tracking off', async () => {
    const fetcher = vi.fn(async () => new Response('{"ErrorCode":0}', { status: 200 }))
    const sender = new PostmarkSender(
      { serverToken: 'pm-token', stream: 'diya-waitlist', from: 'Vishal <diya@idyeah.studio>', replyTo: 'Vishal <diya@idyeah.studio>' },
      fetcher as unknown as typeof fetch,
    )
    const email = screenRequestEmail({ request: request({ image: { bytes: WEBP, type: 'image/webp' } }), posterName: null, siteUrl: 'https://diya13.ai' })
    await sender.send({ ...email, to: 'diya@idyeah.studio' })
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({
      From: 'Vishal <diya@idyeah.studio>',
      To: 'diya@idyeah.studio',
      ReplyTo: 'maya@studio.co',
      Tag: 'screen-request',
      TrackOpens: false,
      TrackLinks: 'None',
      Headers: [],
    })
    expect(body.Attachments).toEqual([{ Name: 'screen-request-12.webp', Content: Buffer.from(WEBP).toString('base64'), ContentType: 'image/webp' }])
  })

  it('a message without a picture carries no Attachments, and keeps the configured Reply-To when it has none of its own', async () => {
    const fetcher = vi.fn(async () => new Response('{"ErrorCode":0}', { status: 200 }))
    const sender = new PostmarkSender({ serverToken: 't', stream: 's', from: 'f@x.dev', replyTo: 'Vishal <diya@idyeah.studio>' }, fetcher as unknown as typeof fetch)
    const email = screenRequestEmail({ request: request(), posterName: null, siteUrl: 'https://diya13.ai' })
    await sender.send({ ...email, replyTo: undefined, to: 'diya@idyeah.studio' })
    const body = JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.ReplyTo).toBe('Vishal <diya@idyeah.studio>')
    expect(body).not.toHaveProperty('Attachments')
  })
})

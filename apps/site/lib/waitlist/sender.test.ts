import { describe, expect, it, vi } from 'vitest'
import { POSTAL_ADDRESS_IN_TRANSACTIONAL, postalAddress } from './config'
import { emailProblem, maskEmail, suggestEmail } from './email-address'
import { alreadyOnListEmail, confirmationEmail, welcomeEmail } from './emails'
import { PostmarkSender } from './sender'
import { emailLinks } from './service'

const links = emailLinks('https://diya13.ai', 'tok')
/** A stand-in for DIYA_POSTAL_ADDRESS; the real one lives only in the deployment's environment. */
const ADDRESS = 'PO Box 100, Springfield, ST 00000'

describe('Postmark sender', () => {
  const config = { serverToken: 'pm-token', stream: 'diya-waitlist', from: 'Vishal <diya@idyeah.studio>', replyTo: 'Vishal <diya@idyeah.studio>' }
  const message = { ...confirmationEmail({ confirmUrl: 'https://diya13.ai/waitlist/confirm?token=c', choice: 'dashboard', links }), to: 'maya@studio.co' }

  it('posts to the Postmark API on the DIYA stream with tracking off and the unsubscribe headers', async () => {
    const fetcher = vi.fn(async () => new Response('{"ErrorCode":0}', { status: 200 }))
    await new PostmarkSender(config, fetcher as unknown as typeof fetch).send(message)
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.postmarkapp.com/email')
    expect((init.headers as Record<string, string>)['X-Postmark-Server-Token']).toBe('pm-token')
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({
      From: 'Vishal <diya@idyeah.studio>',
      ReplyTo: 'Vishal <diya@idyeah.studio>',
      To: 'maya@studio.co',
      MessageStream: 'diya-waitlist',
      TrackOpens: false,
      TrackLinks: 'None',
      Subject: 'Confirm your spot on the Relight list',
      Tag: 'waitlist-confirm',
    })
    expect(body.TextBody).toContain('Confirm my email: https://diya13.ai/waitlist/confirm?token=c')
    expect(body.Headers).toEqual([
      { Name: 'List-Unsubscribe', Value: '<https://diya13.ai/api/waitlist/unsubscribe?token=tok>, <mailto:diya@idyeah.studio?subject=Leave%20the%20DIYA%20Pro%20list>' },
      { Name: 'List-Unsubscribe-Post', Value: 'List-Unsubscribe=One-Click' },
    ])
    // The picture goes inline, named by cid in the HTML.
    expect(body.Attachments.map((a: Record<string, string>) => [a.Name, a.ContentType, a.ContentID])).toEqual([
      ['relight.jpg', 'image/jpeg', 'cid:relight'],
    ])
  })

  it('throws when Postmark refuses the message', async () => {
    const fetcher = vi.fn(async () => Response.json({ ErrorCode: 300, Message: "Invalid 'To' address: 'maya@studio.co'" }, { status: 422 }))
    await expect(new PostmarkSender(config, fetcher as unknown as typeof fetch).send(message)).rejects.toThrow(/^Postmark refused the message: HTTP 422, Postmark code 300$/)
  })
})

describe('Emails', () => {
  it('the confirmation is short, from Vishal, with one button and the full footer', () => {
    const email = confirmationEmail({ confirmUrl: 'https://diya13.ai/waitlist/confirm?token=c', choice: 'admin-table', links })
    expect(email.text.startsWith('Hi,')).toBe(true)
    expect(email.text).toContain('First thing you’d rebuild: an admin table. Noted.')
    expect(email.text).toContain('The first 200 to confirm get early access')
    expect(email.text).toContain('\n\n— Vishal\n\n')
    expect(email.html.match(/Confirm my email/g)).toHaveLength(1)
    expect(email.html).toContain('font-family:-apple-system')
    expect(email.html).not.toMatch(/<script/i)
    expect(email.text).toContain('Leave the list: https://diya13.ai/waitlist/unsubscribe?token=tok')
  })

  it('opening any of them loads nothing: the one picture rides inside, with words for when pictures are off', () => {
    for (const [email, art] of [
      [confirmationEmail({ confirmUrl: 'https://diya13.ai/waitlist/confirm?token=c', choice: null, links }), 'relight'],
      [alreadyOnListEmail({ choice: null, links }), 'relight'],
      [welcomeEmail({ founding: false, links }), 'relight'],
      [welcomeEmail({ founding: true, links }), 'founding'],
    ] as const) {
      const images = [...email.html.matchAll(/<img[^>]*\ssrc="([^"]*)"[^>]*\salt="([^"]+)"/g)].map((m) => m[1])
      expect(images).toEqual([`cid:${art}`])
      expect(email.html).not.toMatch(/url\(|@import|<link/i)
      expect(email.attachments!.map((a) => [a.contentId, a.contentType])).toEqual([[art, 'image/jpeg']])
      // A real JPEG, not a placeholder.
      expect([...email.attachments![0].content.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff])
      // Relight's name and tag stay live text, so they never shrink with the picture.
      expect(email.html).toContain('>Relight</td>')
      expect(email.html).toContain('Coming to DIYA Pro')
    }
  })

  it('the welcome is the founding record, or says the founding spots are taken', () => {
    const founding = welcomeEmail({ founding: true, links })
    expect(founding.subject).toBe('Your founding ticket for Relight')
    expect(founding.tag).toBe('waitlist-welcome')
    expect(founding.text).toContain('you’re one of the first 200')
    expect(founding.text).toContain('Keep this email. It’s your ticket.')
    expect(founding.text).toContain('Leave the list: https://diya13.ai/waitlist/unsubscribe?token=tok')
    expect(founding.headers[1]).toEqual({ name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' })
    const listed = welcomeEmail({ founding: false, links })
    expect(listed.subject).toBe('You’re on the Relight list')
    expect(listed.text).toContain('The 200 founding spots went fast')
    expect(listed.text).not.toContain('founding price')
  })

  it('escapes everything it puts into HTML', () => {
    const email = confirmationEmail({ confirmUrl: 'https://diya13.ai/x?a=1&b="2"', choice: null, links })
    expect(email.html).toContain('https://diya13.ai/x?a=1&amp;b=&quot;2&quot;')
    expect(email.text).not.toContain('First thing you’d rebuild')
  })

  it('the already-on-the-list email says nothing changes', () => {
    const email = alreadyOnListEmail({ choice: 'other', links })
    expect(email.subject).toBe('You’re already on the Relight list')
    expect(email.text).toContain('Good news: you’re already on the list.')
    expect(email.text).toContain('First thing you’d rebuild: something of your own. Noted.')
    expect(email.text.endsWith('IDYeah Studio LLC')).toBe(true)
  })

  it('every footer names DIYA’s public contact, never a personal address', () => {
    for (const email of [
      confirmationEmail({ confirmUrl: 'https://diya13.ai/waitlist/confirm?token=c', choice: null, links }),
      alreadyOnListEmail({ choice: null, links }),
      welcomeEmail({ founding: true, links }),
    ]) {
      expect(email.text).toContain('Questions about your data: diya@idyeah.studio')
      expect(email.html).toContain('<a href="mailto:diya@idyeah.studio"')
      expect(email.headers[0].value).toContain('<mailto:diya@idyeah.studio?subject=Leave%20the%20DIYA%20Pro%20list>')
      expect(`${email.text}${email.html}`).not.toContain('vishal@')
    }
  })

  it('leaves the postal address out of transactional footers by default, and prints it when switched on', () => {
    vi.stubEnv('DIYA_POSTAL_ADDRESS', ADDRESS)
    try {
      expect(POSTAL_ADDRESS_IN_TRANSACTIONAL).toBe(false)
      const on = confirmationEmail({ confirmUrl: 'https://diya13.ai/waitlist/confirm?token=c', choice: null, links, postalAddress: true })
      expect(on.text).toContain(`IDYeah Studio LLC · ${ADDRESS}`)
      expect(on.html).toContain(`IDYeah Studio LLC · ${ADDRESS}`)
      for (const off of [
        confirmationEmail({ confirmUrl: 'https://diya13.ai/waitlist/confirm?token=c', choice: null, links }),
        confirmationEmail({ confirmUrl: 'https://diya13.ai/waitlist/confirm?token=c', choice: null, links, postalAddress: false }),
        alreadyOnListEmail({ choice: null, links }),
        alreadyOnListEmail({ choice: null, links, postalAddress: false }),
        welcomeEmail({ founding: false, links }),
      ]) {
        expect(off.text).not.toContain(ADDRESS)
        expect(off.html).not.toContain(ADDRESS)
        expect(off.text.endsWith('IDYeah Studio LLC')).toBe(true)
        // The way off the list never depends on the switch.
        expect(off.text).toContain('Leave the list: https://diya13.ai/waitlist/unsubscribe?token=tok')
      }
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('prints no address anywhere when DIYA_POSTAL_ADDRESS is unset or blank, even when switched on', () => {
    for (const value of [undefined, '', '   ']) {
      vi.stubEnv('DIYA_POSTAL_ADDRESS', value)
      try {
        expect(postalAddress()).toBeNull()
        for (const email of [
          confirmationEmail({ confirmUrl: 'https://diya13.ai/waitlist/confirm?token=c', choice: null, links, postalAddress: true }),
          alreadyOnListEmail({ choice: null, links, postalAddress: true }),
        ]) {
          expect(email.text.endsWith('IDYeah Studio LLC')).toBe(true)
          expect(email.text).not.toContain('IDYeah Studio LLC ·')
          expect(email.html).not.toContain('IDYeah Studio LLC ·')
        }
      } finally {
        vi.unstubAllEnvs()
      }
    }
  })
})

describe('Email addresses', () => {
  it('validates loosely', () => {
    expect(emailProblem('')).toBe('empty')
    expect(emailProblem('  ')).toBe('empty')
    expect(emailProblem('maya')).toBe('malformed')
    expect(emailProblem('maya@studio')).toBe('malformed')
    expect(emailProblem('maya@@studio.co')).toBe('malformed')
    expect(emailProblem('maya..b@studio.co')).toBe('malformed')
    expect(emailProblem(' maya+diya@studio.co ')).toBeNull()
  })

  it('suggests a fix for common domain typos only', () => {
    expect(suggestEmail('maya@gmial.com')).toBe('maya@gmail.com')
    expect(suggestEmail('Maya@Hotmial.com')).toBe('Maya@hotmail.com')
    expect(suggestEmail('maya@gmail.com')).toBeNull()
    expect(suggestEmail('maya@studio.co')).toBeNull()
    expect(suggestEmail('@gmial.com')).toBeNull()
  })

  it('masks an address for the local note', () => {
    expect(maskEmail('theo@pellowbooks.example')).toBe('t•••@pellowbooks.example')
    expect(maskEmail('nope')).toBe('•••')
  })
})

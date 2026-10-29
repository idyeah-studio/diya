import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppearanceProvider } from '../app/Appearance'
import { FORM_TIMING, ProWaitlist, WAITLIST_COPY as COPY } from '../components/waitlist/ProWaitlist'
import { emailKey } from '../lib/waitlist/local-note'

vi.mock('../components/waitlist/diya-styles', () => ({}))

type Reply = { status: number; body?: unknown } | Error
let posts: Record<string, unknown>[]
/** Every request in order: 'GET' for a status/token fetch, 'POST' for a submit. */
let calls: string[]
let status: Reply
let replies: Reply[]

function respond(reply: Reply) {
  if (reply instanceof Error) return Promise.reject(reply)
  return Promise.resolve(new Response(JSON.stringify(reply.body ?? {}), { status: reply.status }))
}

beforeEach(() => {
  FORM_TIMING.settleMs = 0
  posts = []
  calls = []
  status = { status: 200, body: { open: true, formToken: '123.abc' } }
  replies = [{ status: 202, body: { ok: true } }]
  window.localStorage.clear()
  vi.spyOn(globalThis, 'fetch').mockImplementation(((_url: string, init?: RequestInit) => {
    calls.push(init?.method === 'POST' ? 'POST' : 'GET')
    if (!init || init.method !== 'POST') return respond(status)
    posts.push(JSON.parse(String(init.body)))
    return respond(replies.length > 1 ? replies.shift()! : replies[0])
  }) as typeof fetch)
})
afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true })
})

async function mount(props: Partial<Parameters<typeof ProWaitlist>[0]> = {}) {
  const view = render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <ProWaitlist source="landing" {...props} />
    </AppearanceProvider>,
  )
  await act(async () => {})
  return view
}

const emailField = () => screen.getByLabelText(COPY.emailLabel) as HTMLInputElement
const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: COPY.submit }))
    // The submit waits a beat for its token; let that and the reply settle.
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}
const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } })

describe('Relight waitlist form', () => {
  it('reads in order: question, pills, email, button, founding line, privacy line', async () => {
    const { container } = await mount()
    const text = container.textContent!
    const order = [COPY.question, 'Dashboard', 'Something else', COPY.emailLabel, COPY.submit, COPY.founding, COPY.privacy]
    const positions = order.map((s) => text.indexOf(s))
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('/privacy')
  })

  it('uses native radios in one group for the optional question', async () => {
    await mount()
    const group = screen.getByRole('group', { name: COPY.question })
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios.map((r) => r.labels?.[0]?.textContent)).toEqual(['Dashboard', 'Settings', 'Admin table', 'Landing', 'Something else'])
    expect(new Set(radios.map((r) => r.name)).size).toBe(1)
    expect(radios.some((r) => r.required)).toBe(false)
    expect(group.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(group.getAttribute('aria-describedby')!)!.textContent).toBe(COPY.hint)
  })

  it('sets up the email field for addresses', async () => {
    await mount()
    const input = emailField()
    expect(input.type).toBe('email')
    expect(input.autocomplete).toBe('email')
    expect(input.getAttribute('spellcheck')).toBe('false')
    expect(input.getAttribute('autocapitalize')).toBe('off')
  })

  it('"Something else" opens a text field of up to 80 characters', async () => {
    await mount()
    expect(screen.queryByLabelText(COPY.otherLabel)).toBeNull()
    fireEvent.click(screen.getByLabelText('Something else'))
    const other = screen.getByLabelText(COPY.otherLabel) as HTMLInputElement
    expect(other.maxLength).toBe(80)
    type(other, 'Billing history')
    type(emailField(), 'maya@studio.co')
    await submit()
    expect(posts[0]).toMatchObject({ choice: 'other', other: 'Billing history' })
  })

  it('submits without a pick', async () => {
    await mount()
    type(emailField(), 'maya@studio.co')
    await submit()
    expect(posts[0]).toMatchObject({ email: 'maya@studio.co', choice: null, source: 'landing', website: '', formToken: '123.abc' })
    expect(posts[0]).not.toHaveProperty('elapsedMs')
  })

  it('validates an empty and a malformed address on submit and focuses the field', async () => {
    await mount()
    await submit()
    expect(posts).toHaveLength(0)
    expect(emailField().getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText(COPY.emailEmpty)).toBeTruthy()
    expect(document.activeElement).toBe(emailField())
    type(emailField(), 'maya@studio')
    expect(screen.getByText(COPY.emailMalformed)).toBeTruthy()
    type(emailField(), 'maya@studio.co')
    expect(screen.queryByText(COPY.emailMalformed)).toBeNull()
  })

  it('suggests a fix for a mistyped domain', async () => {
    vi.useFakeTimers()
    try {
      await mount()
      type(emailField(), 'maya@gmial.com')
      await act(async () => {
        vi.advanceTimersByTime(600)
      })
      expect(screen.getByText('maya@gmail.com')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Use that' }))
      expect(emailField().value).toBe('maya@gmail.com')
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows the busy state while joining', async () => {
    let finish!: (r: Response) => void
    vi.mocked(fetch).mockImplementation(((_: string, init?: RequestInit) =>
      init?.method === 'POST' ? new Promise<Response>((r) => (finish = r)) : respond(status)) as typeof fetch)
    await mount()
    type(emailField(), 'maya@studio.co')
    await submit()
    const button = screen.getByRole('button', { name: /Joining/ })
    expect(button.getAttribute('aria-busy')).toBe('true')
    // Still focused and inert, not natively disabled.
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect((button as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByRole('status').textContent).toBe(COPY.busyStatus)
    await act(async () => finish(new Response('{"ok":true}', { status: 202 })))
    // Let the success path finish inside this test, so its note can't leak into the next.
    await screen.findByRole('heading', { name: 'Check your inbox to confirm.' })
  })

  it('on success replaces the form, focuses the heading and shows the full address', async () => {
    await mount({ headingLevel: 2 })
    fireEvent.click(screen.getByLabelText('Admin table'))
    type(emailField(), 'Maya@Studio.co')
    await submit()
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Check your inbox to confirm.' })).toBeTruthy())
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }))
    expect(screen.getByText('Maya@Studio.co')).toBeTruthy()
    expect(screen.queryByRole('form')).toBeNull()
    // No number, no founding claim before confirmation.
    expect(document.body.textContent).not.toMatch(/#\d|number \d|first 200/)
  })

  it('keeps a masked note, never the address', async () => {
    await mount()
    type(emailField(), 'maya@studio.co')
    await submit()
    await screen.findByRole('heading', { name: 'Check your inbox to confirm.' })
    const raw = window.localStorage.getItem('diya:waitlist')!
    expect(raw).not.toContain('maya@studio.co')
    expect(JSON.parse(raw)).toMatchObject({ v: 1, hint: 'm•••@studio.co', choice: null })
  })

  it('"Wrong address?" brings the form back with the address selected', async () => {
    await mount()
    type(emailField(), 'maya@studio.co')
    await submit()
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Wrong address? Use a different email' }))
    })
    expect(document.activeElement).toBe(emailField())
    expect(emailField().value).toBe('maya@studio.co')
  })

  it.each([
    [{ status: 500 }, COPY.server],
    [{ status: 502 }, COPY.server],
    [{ status: 429 }, COPY.rateLimited],
    [new TypeError('Failed to fetch'), COPY.server],
  ] as [Reply, string][])('shows the right error and keeps what was typed (%#)', async (reply, message) => {
    replies = [reply]
    await mount()
    fireEvent.click(screen.getByLabelText('Settings'))
    type(emailField(), 'maya@studio.co')
    await submit()
    expect((await screen.findByRole('alert')).textContent).toBe(message)
    expect(emailField().value).toBe('maya@studio.co')
    expect((screen.getByLabelText('Settings') as HTMLInputElement).checked).toBe(true)
  })

  it('says so when offline, without sending', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
    await mount()
    type(emailField(), 'maya@studio.co')
    await submit()
    expect(posts).toHaveLength(0)
    expect((await screen.findByRole('alert')).textContent).toBe(COPY.offline)
  })

  it('hides itself, with no stub, when the list is closed', async () => {
    status = { status: 200, body: { open: false } }
    const { container } = await mount()
    expect(screen.queryByLabelText(COPY.emailLabel)).toBeNull()
    expect(screen.queryByRole('heading')).toBeNull()
    expect(container.textContent).toBe('')
    expect(container.querySelector('[data-waitlist-closed]')?.hasAttribute('hidden')).toBe(true)
    expect(document.body.textContent).not.toMatch(/opens soon|setting it up/i)
  })

  it('keeps the form and says so inline if the list closes before submit', async () => {
    replies = [{ status: 503, body: { error: 'closed' } }]
    await mount()
    type(emailField(), 'maya@studio.co')
    await submit()
    expect((await screen.findByRole('alert')).textContent).toBe(COPY.closed)
    expect(emailField().value).toBe('maya@studio.co')
    expect(document.body.textContent).not.toMatch(/opens soon|setting it up/i)
  })

  it('greets a returning browser from its masked note, with founding only as yes or no after confirmation', async () => {
    window.localStorage.setItem(
      'diya:waitlist',
      JSON.stringify({ v: 1, at: '2026-11-07T08:03:00Z', hint: 'v•••@idyeah.studio', key: 'k', choice: 'dashboard', confirmed: true, founding: true }),
    )
    await mount()
    expect(screen.getByRole('heading', { name: 'You’re on the Relight list.' })).toBeTruthy()
    expect(screen.getByText('v•••@idyeah.studio')).toBeTruthy()
    expect(screen.getByText(/You’re one of the first 200/)).toBeTruthy()
    // Returning on load never steals focus.
    expect(document.activeElement).toBe(document.body)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add another email' }))
    })
    expect(document.activeElement).toBe(emailField())
  })

  it('recognises the same address again and says it is already on the list', async () => {
    window.localStorage.setItem(
      'diya:waitlist',
      JSON.stringify({ v: 1, at: '2026-11-07T08:03:00Z', hint: 'm•••@studio.co', key: await emailKey('maya@studio.co'), choice: 'dashboard' }),
    )
    await mount()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add another email' }))
    })
    fireEvent.click(screen.getByLabelText('Landing'))
    type(emailField(), 'MAYA@studio.co')
    await submit()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'You’re already on the list.' })).toBeTruthy())
    // A repeat inside the day changes nothing on the server, so the page promises nothing about the pick.
    expect(screen.queryByText(/changed your pick/)).toBeNull()
  })

  it('moves a note saved under the old storage key, once, and still recognises its address', async () => {
    // Notes written before 2026-10-20 sit under the old key, with a key made with the old salt.
    window.localStorage.setItem(
      'diya:rebuild',
      JSON.stringify({ v: 1, at: '2026-11-07T08:03:00Z', hint: 'm•••@studio.co', key: await emailKey('maya@studio.co', 'diya-rebuild:'), choice: 'dashboard', confirmed: true, founding: true }),
    )
    await mount()
    expect(screen.getByRole('heading', { name: 'You’re on the Relight list.' })).toBeTruthy()
    expect(window.localStorage.getItem('diya:rebuild')).toBeNull()
    expect(JSON.parse(window.localStorage.getItem('diya:waitlist')!)).toMatchObject({ hint: 'm•••@studio.co', confirmed: true })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add another email' }))
    })
    type(emailField(), 'maya@studio.co')
    await submit()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'You’re already on the list.' })).toBeTruthy())
    // Rewritten under the current salt, keeping what the old note knew.
    expect(JSON.parse(window.localStorage.getItem('diya:waitlist')!)).toMatchObject({
      key: await emailKey('maya@studio.co'),
      confirmed: true,
      founding: true,
    })
  })

  it('fetches a fresh form token before submitting when its own is nearly a day old', async () => {
    await mount()
    expect(calls).toEqual(['GET'])
    const real = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(real + 23 * 60 * 60_000 + 60_000)
    status = { status: 200, body: { open: true, formToken: 'fresh.token' } }
    type(emailField(), 'maya@studio.co')
    await submit()
    // Token fetch, then the post: wait for both rather than a fixed beat, which a loaded runner can outlast.
    await waitFor(() => expect(calls).toEqual(['GET', 'GET', 'POST']))
    expect(posts[0].formToken).toBe('fresh.token')
  })

  it('takes a fresh token and tries once more when the server refuses the token', async () => {
    replies = [{ status: 409, body: { error: 'token' } }, { status: 202, body: { ok: true } }]
    await mount()
    type(emailField(), 'maya@studio.co')
    status = { status: 200, body: { open: true, formToken: 'second.token' } }
    await submit()
    await waitFor(() => expect(calls).toEqual(['GET', 'POST', 'GET', 'POST']))
    expect(posts.map((p) => p.formToken)).toEqual(['123.abc', 'second.token'])
    await screen.findByRole('heading', { name: 'Check your inbox to confirm.' })
  })

  it('says the list is busy, keeping the details, when the send cap is reached', async () => {
    replies = [{ status: 503, body: { error: 'busy' } }]
    await mount()
    type(emailField(), 'maya@studio.co')
    await submit()
    expect((await screen.findByRole('alert')).textContent).toBe(COPY.listBusy)
    expect(emailField().value).toBe('maya@studio.co')
  })

  it('"Use a different email" takes a fresh token', async () => {
    await mount()
    type(emailField(), 'maya@studio.co')
    await submit()
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Wrong address? Use a different email' }))
    })
    await waitFor(() => expect(calls).toEqual(['GET', 'POST', 'GET']))
  })

  it('works when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    await mount()
    type(emailField(), 'maya@studio.co')
    await submit()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Check your inbox to confirm.' })).toBeTruthy())
  })

  it('hides the honeypot from people and assistive tech and sends its value', async () => {
    const { container } = await mount()
    const trap = container.querySelector('input[name="website"]') as HTMLInputElement
    expect(trap.tabIndex).toBe(-1)
    expect(trap.closest('[aria-hidden="true"]')).toBeTruthy()
    type(emailField(), 'bot@x.dev')
    trap.value = 'http://spam'
    await submit()
    expect(posts[0].website).toBe('http://spam')
  })
})

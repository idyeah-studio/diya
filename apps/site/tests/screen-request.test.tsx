import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { AppearanceProvider } from '../app/Appearance'
import { posterPrefill, REQUEST_COPY as COPY, REQUEST_TIMING, ScreenRequest } from '../components/screens/ScreenRequest'
import { ShrinkError, shrinkImage } from '../lib/screen-requests/shrink'

type Reply = { status: number; body?: unknown } | Error
let posts: FormData[]
let gets: number
let status: Reply
let replies: Reply[]

function respond(reply: Reply) {
  if (reply instanceof Error) return Promise.reject(reply)
  return Promise.resolve(new Response(JSON.stringify(reply.body ?? {}), { status: reply.status }))
}

/** What the fake canvas was asked to write: its size, the type and the quality. */
let encodes: { width: number; height: number; type: string; quality: number }[]
let writesWebp: boolean
let encodedBytes: number
let bitmap: { width: number; height: number }

beforeEach(() => {
  REQUEST_TIMING.settleMs = 0
  posts = []
  gets = 0
  status = { status: 200, body: { open: true, formToken: '123.abc' } }
  replies = [{ status: 202, body: { ok: true } }]
  vi.spyOn(globalThis, 'fetch').mockImplementation(((_url: string, init?: RequestInit) => {
    if (init?.method !== 'POST') {
      gets++
      return respond(status)
    }
    posts.push(init.body as FormData)
    return respond(replies.length > 1 ? replies.shift()! : replies[0])
  }) as typeof fetch)

  encodes = []
  writesWebp = true
  encodedBytes = 400 * 1024
  bitmap = { width: 4000, height: 3000 }
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ ...bitmap, close: vi.fn() })))
  const context = { drawImage: vi.fn(), fillRect: vi.fn(), clearRect: vi.fn(), fillStyle: '', imageSmoothingQuality: 'low' }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, done, type = 'image/png', quality) {
    encodes.push({ width: this.width, height: this.height, type, quality: quality as number })
    // A browser that can't write WebP hands back a PNG.
    const written = type === 'image/webp' && !writesWebp ? 'image/png' : type
    done(new Blob([new Uint8Array(encodedBytes)], { type: written }))
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true })
})

async function mount(props: { open?: boolean; want?: string | null } = {}) {
  const view = render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <ScreenRequest open={props.open ?? true} want={props.want ?? null} />
    </AppearanceProvider>,
  )
  await settle()
  return view
}

const settle = () => act(async () => void (await new Promise((resolve) => setTimeout(resolve, 20))))
const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } })
const textField = () => screen.getByLabelText(COPY.textLabel) as HTMLTextAreaElement
const emailField = () => screen.getByLabelText(COPY.emailLabel) as HTMLInputElement
const send = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: COPY.submit }))
  })
  await settle()
}
const fill = () => {
  type(textField(), 'A support queue where each priority has its own column.')
  type(emailField(), 'maya@studio.co')
}
function picture(name = 'queue.png', typeName = 'image/png', size?: number) {
  const file = new File([new Uint8Array(1024)], name, { type: typeName })
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size })
  return file
}
async function choose(file: File) {
  const input = document.querySelector<HTMLInputElement>('#request input[type=file]')!
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
  await settle()
}

describe('Screen request form', () => {
  it('reads in order: heading, line, description, picture, email, the choice, privacy line, button', async () => {
    const { container } = await mount()
    const text = container.textContent!
    const order = [COPY.heading, COPY.line, COPY.textLabel, COPY.pictureLabel, COPY.emailLabel, COPY.emailHelp, COPY.notify, COPY.privacy, COPY.submit]
    const positions = order.map((s) => text.indexOf(s))
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Don’t see your screen?')
    expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('/privacy#screen-requests')
    expect(document.querySelectorAll('[title]')).toHaveLength(0)
    expect(text).not.toMatch(/\$|price|free/i)
  })

  it('sets up each field: a 2,000-character description, an email field for addresses, and an unticked choice', async () => {
    await mount()
    expect(textField().maxLength).toBe(2000)
    expect(textField().placeholder).toBe(COPY.textPlaceholder)
    expect(emailField().type).toBe('email')
    expect(emailField().autocomplete).toBe('email')
    const notify = screen.getByRole('checkbox', { name: COPY.notify }) as HTMLInputElement
    expect(notify.checked).toBe(false)
    const upload = screen.getByRole('region', { name: COPY.pictureLabel })
    expect(within(upload).getByRole('button', { name: COPY.pictureChoose })).toBeTruthy()
    expect(upload.querySelector('input[type=file]')!.getAttribute('accept')).toBe('image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp')
  })

  it('shows the character count only near the limit', async () => {
    await mount()
    type(textField(), 'x'.repeat(1799))
    expect(screen.queryByText(/\/ 2000/)).toBeNull()
    type(textField(), 'x'.repeat(1800))
    expect(screen.getByText('1800 / 2000')).toBeTruthy()
  })

  it('sends the request as multipart with the token, the honeypot and the separate choice', async () => {
    await mount()
    fill()
    fireEvent.click(screen.getByRole('checkbox', { name: COPY.notify }))
    await send()
    expect(posts).toHaveLength(1)
    const body = posts[0]
    expect(Object.fromEntries([...body.entries()].map(([k, v]) => [k, String(v)]))).toEqual({
      text: 'A support queue where each priority has its own column.',
      email: 'maya@studio.co',
      notify: '1',
      website: '',
      formToken: '123.abc',
    })
  })

  it('leaves the choice out when it isn’t ticked', async () => {
    await mount()
    fill()
    await send()
    expect(posts[0].has('notify')).toBe(false)
  })
})

describe('From a poster', () => {
  it('starts with “I’d like the Board screen.” and sends which poster it came from', async () => {
    await mount({ want: 'board' })
    expect(textField().value).toBe('I’d like the Board screen.')
    type(emailField(), 'maya@studio.co')
    await send()
    expect(posts[0].get('text')).toBe(posterPrefill('Board'))
    expect(posts[0].get('poster')).toBe('board')
  })

  it('ignores a screen that isn’t a poster, or a name it doesn’t know', async () => {
    for (const want of ['sign-in', 'nope']) {
      const view = await mount({ want })
      expect(textField().value).toBe('')
      view.unmount()
    }
  })

  it('another poster’s link on the same page swaps the opening line, but never the person’s own words', async () => {
    const view = await mount({ want: 'board' })
    const rerender = (want: string) =>
      view.rerender(
        <AppearanceProvider initialTheme="light" initialGlass={false}>
          <ScreenRequest open want={want} />
        </AppearanceProvider>,
      )
    rerender('create-edit')
    expect(textField().value).toBe(posterPrefill('Create & edit'))
    type(textField(), 'My own words: a SaaS landing page for a bakery.')
    rerender('landing')
    expect(textField().value).toBe('My own words: a SaaS landing page for a bakery.')
    type(emailField(), 'maya@studio.co')
    await send()
    expect(posts[0].get('poster')).toBe('landing')
  })

  it('leaves the poster off once the words no longer name it', async () => {
    await mount({ want: 'board' })
    type(textField(), 'A calendar for booking studio rooms by the hour.')
    type(emailField(), 'maya@studio.co')
    await send()
    expect(posts[0].has('poster')).toBe(false)
  })
})

describe('The picture', () => {
  it('is shrunk in the browser to 2,000px on its longest side as WebP at 0.85, then previewed with a Remove button', async () => {
    await mount()
    await choose(picture())
    expect(encodes).toEqual([{ width: 2000, height: 1500, type: 'image/webp', quality: 0.85 }])
    const preview = screen.getByRole('img', { name: 'Preview of queue.png' })
    expect(preview.getAttribute('src')).toBe('blob:preview')
    expect(screen.getByText('400 KB · Ready to send')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove queue.png' }))
    expect(screen.getByRole('status').textContent).toBe('Picture added: queue.png, 400 KB.')
    fill()
    await send()
    const image = posts[0].get('image') as File
    expect(image.type).toBe('image/webp')
    expect(image.size).toBe(400 * 1024)
    expect(image.name).toBe('picture.webp')
  })

  it('falls back to JPEG on a white page where the browser can’t write WebP', async () => {
    writesWebp = false
    bitmap = { width: 1200, height: 3200 }
    await mount()
    await choose(picture('tall.jpg', 'image/jpeg'))
    expect(encodes.map((e) => [e.width, e.height, e.type])).toEqual([
      [750, 2000, 'image/webp'],
      [750, 2000, 'image/jpeg'],
    ])
    fill()
    await send()
    expect((posts[0].get('image') as File).type).toBe('image/jpeg')
  })

  it('Remove takes it away, and focus returns to Choose a picture', async () => {
    await mount()
    await choose(picture())
    fireEvent.click(screen.getByRole('button', { name: 'Remove queue.png' }))
    await settle()
    expect(screen.queryByRole('img')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: COPY.pictureChoose }))
    fill()
    await send()
    expect(posts[0].has('image')).toBe(false)
  })

  it('refuses a file that isn’t a picture, and one over 20 MB, each with one clear message', async () => {
    await mount()
    await choose(picture('notes.txt', 'text/plain'))
    expect(screen.getAllByRole('alert').filter((a) => a.textContent).map((a) => a.textContent)).toEqual([COPY.pictureType])
    await choose(picture('huge.png', 'image/png', 21 * 1024 * 1024))
    expect(screen.getAllByRole('alert').filter((a) => a.textContent).map((a) => a.textContent)).toEqual([COPY.pictureSize])
    expect(encodes).toHaveLength(0)
    await choose(picture())
    expect(screen.getAllByRole('alert').filter((a) => a.textContent)).toHaveLength(0)
  })

  it('says so when the picture stays too big to send even after shrinking', async () => {
    encodedBytes = 3.2 * 1024 * 1024
    await mount()
    await choose(picture())
    expect(screen.getByText(COPY.pictureTooDetailed)).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('says so when the picture can’t be opened', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => Promise.reject(new Error('bad image'))))
    await mount()
    await choose(picture())
    expect(screen.getByText(COPY.pictureUnreadable)).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: COPY.pictureChoose }))
  })
})

describe('Shrinking', () => {
  it('steps down until the picture is under 3 MB, and gives up past the last step', async () => {
    encodedBytes = 3.2 * 1024 * 1024
    await expect(shrinkImage(picture())).rejects.toEqual(new ShrinkError('too_big'))
    expect(encodes.map((e) => [e.width, e.quality])).toEqual([
      [2000, 0.85],
      [2000, 0.7],
      [1500, 0.7],
      [1000, 0.7],
    ])
  })

  it('leaves a small picture at its own size', async () => {
    bitmap = { width: 800, height: 600 }
    const shrunk = await shrinkImage(picture())
    expect([shrunk.width, shrunk.height, shrunk.type]).toEqual([800, 600, 'image/webp'])
  })
})

describe('Errors', () => {
  it('checks the description and the email before sending, and focuses the first problem', async () => {
    await mount()
    await send()
    expect(posts).toHaveLength(0)
    expect(screen.getByText(COPY.textEmpty)).toBeTruthy()
    expect(screen.getByText(COPY.emailEmpty)).toBeTruthy()
    expect(document.activeElement).toBe(textField())
    type(textField(), 'A kanban board')
    expect(screen.getByText(COPY.textShort)).toBeTruthy()
    type(textField(), 'A kanban board with swimlanes')
    await send()
    expect(document.activeElement).toBe(emailField())
    type(emailField(), 'maya@studio')
    expect(screen.getByText(COPY.emailMalformed)).toBeTruthy()
    expect(emailField().getAttribute('aria-invalid')).toBe('true')
  })

  const cases: [string, Reply, string][] = [
    ['too many from one place', { status: 429, body: { error: 'rate_limited', scope: 'ip' } }, COPY.rateLimited],
    ['too many from one email', { status: 429, body: { error: 'rate_limited', scope: 'email' } }, COPY.rateLimitedEmail],
    ['the daily cap', { status: 503, body: { error: 'busy' } }, COPY.full],
    ['a server error', { status: 500, body: { error: 'server' } }, COPY.server],
    ['a failed email', { status: 502, body: { error: 'server' } }, COPY.server],
    ['no connection', new TypeError('Failed to fetch'), COPY.server],
  ]
  it.each(cases)('%s says so and keeps everything typed', async (_, reply, message) => {
    replies = [reply]
    await mount()
    fill()
    await choose(picture())
    await send()
    expect(screen.getByText(message).getAttribute('role')).toBe('alert')
    expect(textField().value).toBe('A support queue where each priority has its own column.')
    expect(emailField().value).toBe('maya@studio.co')
    expect(screen.getByRole('img', { name: 'Preview of queue.png' })).toBeTruthy()
  })

  it('says you’re offline without trying', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
    await mount()
    fill()
    await send()
    expect(posts).toHaveLength(0)
    expect(screen.getByText(COPY.offline)).toBeTruthy()
  })

  it('shows the server’s word on a field inline', async () => {
    replies = [{ status: 400, body: { error: 'invalid', field: 'email' } }]
    await mount()
    fill()
    await send()
    expect(screen.getByText(COPY.emailMalformed)).toBeTruthy()
    expect(document.activeElement).toBe(emailField())
  })

  it('says the picture didn’t go through when the server refuses it', async () => {
    replies = [{ status: 413, body: { error: 'too_large' } }]
    await mount()
    fill()
    await choose(picture())
    await send()
    expect(screen.getByText(COPY.pictureRefused)).toBeTruthy()
  })

  it('takes a fresh token once when the server doesn’t believe this one', async () => {
    replies = [{ status: 409, body: { error: 'token' } }, { status: 202, body: { ok: true } }]
    await mount()
    expect(gets).toBe(1)
    fill()
    await send()
    expect(gets).toBe(2)
    expect(posts).toHaveLength(2)
    expect(screen.getByText(COPY.sentHeading)).toBeTruthy()
  })
})

describe('After sending', () => {
  it('shows a calm card with the address, moves focus to it, and Send another starts fresh', async () => {
    await mount({ want: 'board' })
    type(emailField(), 'maya@studio.co')
    await choose(picture())
    await send()
    const card = screen.getByRole('group', { name: COPY.sentHeading })
    expect(card.textContent).toContain('Thanks. I’ll reply to maya@studio.co.')
    expect(document.activeElement).toBe(card)
    expect(screen.queryByLabelText(COPY.textLabel)).toBeNull()
    fireEvent.click(within(card).getByRole('button', { name: COPY.again }))
    await settle()
    expect(textField().value).toBe('')
    expect(emailField().value).toBe('maya@studio.co')
    expect(screen.queryByRole('img')).toBeNull()
    expect(document.activeElement).toBe(textField())
    type(textField(), 'Another screen, with a long enough description.')
    await send()
    expect(posts[1].has('poster')).toBe(false)
  })
})

describe('Closed', () => {
  it('keeps the heading and says when requests open, without asking the server', async () => {
    const { container } = await mount({ open: false })
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(COPY.heading)
    expect(container.textContent).toContain(COPY.closed)
    expect(container.querySelector('form')).toBeNull()
    expect(gets).toBe(0)
  })

  it('closes when the server says it isn’t taking requests', async () => {
    status = { status: 200, body: { open: false } }
    const { container } = await mount()
    expect(container.textContent).toContain(COPY.closed)
    expect(container.querySelector('form')).toBeNull()
  })
})

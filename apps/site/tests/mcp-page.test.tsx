import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiyaProvider } from '@idyeah/diya'

/* As in mcp-connect.test.tsx: read the installed api.json, which the test config's alias hides. */
vi.mock('../components/reference/api-data', async () => {
  const { readFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  return { default: JSON.parse(readFileSync(join(process.cwd(), 'node_modules/@idyeah/diya/dist/api.json'), 'utf8')) }
})

const { McpPage, CHECK_PROPS } = await import('../components/mcp/McpPage')
const { CHECK_TIMEOUT, TOOLS_LIST } = await import('../components/mcp/ServerStatus')
const { MCP_INSTALL, MCP_URL, API } = await import('../components/reference/api')
const { mcpDefinitions } = await import('../lib/mcp/definitions')
const definitions = await mcpDefinitions()

/** The server's answer to tools/list, with `n` tools. */
const toolsAnswer = (n: number) =>
  new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { tools: Array.from({ length: n }, (_, i) => ({ name: `t${i}`, inputSchema: {} })) } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

function renderPage() {
  return render(
    <DiyaProvider>
      <McpPage definitions={definitions} />
    </DiyaProvider>
  )
}
const statusLine = () => document.querySelector('.mcp-status') as HTMLElement
const region = () => document.querySelector('p.mcp-sr[role="status"]') as HTMLElement

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('the /mcp page', () => {
  it('names itself and the address, with the version from the server, never typed', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'DIYA’s MCP server' })).toBeTruthy()
    expect(screen.getByText(`@idyeah/diya ${API.version}`)).toBeTruthy()
    expect(definitions.version).toBe(API.version)
    expect(screen.getByRole('button', { name: 'Copy server address' })).toBeTruthy()
    expect(document.querySelector('.mcp-address code')?.textContent).toBe(MCP_URL)
  })

  it('lists every tool, prompt and resource the server has, in its order', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderPage()
    const list = document.querySelector('dl.mcp-defs') as HTMLElement
    const names = [...list.querySelectorAll('dt')].map((dt) => dt.textContent)
    expect(names).toEqual([...definitions.tools, ...definitions.prompts, ...definitions.resources].map((d) => d.name))
    expect(names).toEqual(['search_components', 'get_component', 'get_setup', 'get_theme', 'list_tokens', 'build_screen', 'diya://rules'])
  })

  it('names Button props in "Check it worked" that Button really has', () => {
    expect(CHECK_PROPS).toEqual(['asChild', 'href', 'loading', 'variant'])
  })

  it('says what it keeps in the privacy page’s own words, so the two never disagree', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderPage()
    const keeps = screen.getByRole('heading', { name: 'What it sees and keeps' })
    const words = [keeps.nextElementSibling, keeps.nextElementSibling?.nextElementSibling].map((p) => p?.textContent ?? '').join(' ')
    const privacy = readFileSync(join(process.cwd(), 'app/privacy/page.tsx'), 'utf8').replace(/\s+/g, ' ')
    for (const fact of ['“date range picker”', 'kept for a year', 'No IP address, no account, nothing that says who asked.', 'by day']) {
      expect(words, fact).toContain(fact)
      expect(privacy, fact).toContain(fact)
    }
    expect(within(keeps.nextElementSibling!.nextElementSibling as HTMLElement).getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('/privacy#this-site')
  })
})

describe('the status line', () => {
  it('checks once, by asking the server for its tool list, and says how many it has', async () => {
    let answer!: (response: Response) => void
    const fetch = vi.fn(() => new Promise<Response>((resolve) => (answer = resolve)))
    vi.stubGlobal('fetch', fetch)
    renderPage()
    expect(statusLine().textContent).toBe('Checking the server…')
    expect(statusLine().dataset.state).toBe('checking')
    expect(fetch).toHaveBeenCalledTimes(1)
    const [endpoint, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(endpoint).toBe('/mcp')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual(TOOLS_LIST)
    expect(init.headers).toMatchObject({ Accept: 'application/json, text/event-stream' })
    await act(async () => answer(toolsAnswer(3)))
    await waitFor(() => expect(statusLine().textContent).toBe(`Answering now · DIYA ${API.version} · 3 tools`))
    expect(statusLine().dataset.state).toBe('answering')
  })

  it('is read in place: not a live region, and nothing is said on load', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => toolsAnswer(5)))
    renderPage()
    await waitFor(() => expect(statusLine().dataset.state).toBe('answering'))
    for (const node of [statusLine(), ...statusLine().querySelectorAll('*')]) {
      expect(node.getAttribute('role')).toBeNull()
      expect(node.getAttribute('aria-live')).toBeNull()
    }
    expect(region().textContent).toBe('')
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('says the server didn’t answer when it fails, and Check again checks, keeps focus and says the result once', async () => {
    const user = userEvent.setup()
    const fetch = vi.fn(async () => new Response('busy', { status: 503 }))
    vi.stubGlobal('fetch', fetch)
    renderPage()
    await waitFor(() => expect(statusLine().dataset.state).toBe('failed'))
    expect(statusLine().textContent).toBe(
      'The server didn’t answer just now. Agents retry on their own; if it lasts, tell us on GitHub. Check again'
    )
    expect(within(statusLine()).getByRole('link', { name: 'tell us on GitHub' }).getAttribute('href')).toBe(
      'https://github.com/idyeah-studio/diya/issues/new/choose'
    )
    fetch.mockImplementation(async () => toolsAnswer(5))
    await user.click(within(statusLine()).getByRole('button', { name: 'Check again' }))
    expect(document.activeElement).toBe(statusLine())
    await waitFor(() => expect(statusLine().dataset.state).toBe('answering'))
    await waitFor(() => expect(region().textContent).toBe(`The server is answering now: DIYA ${API.version}, 5 tools.`))
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('says the server didn’t answer when it never replies, after a wait, or answers with something else', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const fetch = vi.fn(
      (_: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))
    )
    vi.stubGlobal('fetch', fetch)
    const { unmount } = renderPage()
    await act(async () => vi.advanceTimersByTime(CHECK_TIMEOUT - 1))
    expect(statusLine().dataset.state).toBe('checking')
    await act(async () => vi.advanceTimersByTime(1))
    expect(statusLine().dataset.state).toBe('failed')
    unmount()
    vi.useRealTimers()

    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>not the server</html>', { status: 200 })))
    renderPage()
    await waitFor(() => expect(statusLine().dataset.state).toBe('failed'))
  })

  it('stops asking when the page goes away', async () => {
    let signal: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn((_: string, init: RequestInit) => ((signal = init.signal ?? undefined), new Promise(() => {}))))
    const { unmount } = renderPage()
    unmount()
    expect(signal?.aborted).toBe(true)
  })
})

describe('copy keys', () => {
  it('copy what they name, show Copied, and say it once', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    renderPage()
    const key = screen.getByRole('button', { name: 'Copy server address' })
    await user.click(key)
    expect(writeText).toHaveBeenCalledWith(MCP_URL)
    expect(key.textContent).toBe('Copied')
    await waitFor(() => expect(region().textContent).toBe('Server address copied.'))
  })

  it('select the text and say how to copy it when the clipboard refuses', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Copy Claude Code command' }))
    await waitFor(() => expect(document.querySelector('.mcp-error')).toBeTruthy())
    const help = document.querySelector('.mcp-error') as HTMLElement
    expect(help.textContent).toBe('!Copy didn’t work. The text is selected above; press Command+C or Ctrl+C.')
    expect(help.querySelector('.mcp-bang')?.getAttribute('aria-hidden')).toBe('true')
    await waitFor(() => expect(region().textContent).toBe('Copy didn’t work. The text is selected above; press Command+C or Ctrl+C.'))
    const code = screen.getByText(MCP_INSTALL.claude)
    expect(document.activeElement).toBe(code)
    expect(code.getAttribute('aria-describedby')).toBe(help.id)
    expect(window.getSelection()?.toString()).toBe(MCP_INSTALL.claude)
  })

  it('drop under long commands on phones, and stay beside short values such as the address', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderPage()
    const long = (text: string) =>
      [...document.querySelectorAll('.mcp-copy-text')].find((code) => code.textContent === text)?.closest('.mcp-copy')?.hasAttribute('data-long')
    expect(long(MCP_URL)).toBe(false)
    expect(long(MCP_INSTALL.claude)).toBe(true)
    expect(long(MCP_INSTALL.codex)).toBe(true)
    expect(long(MCP_INSTALL.cursorJson)).toBe(true)
  })

  it('look pressed when Copied in Dark too: the Copied rule is as specific as the Dark one, and after it (VIS-01)', () => {
    const css = readFileSync(join(process.cwd(), 'components/mcp/mcp-page.css'), 'utf8')
    const dark = css.indexOf(".diya-root[data-theme='dark'] .mcp-page .mcp-copy-key.diya-button {")
    const copied = css.indexOf(".diya-root .mcp-page .mcp-copy-key.diya-button[data-state='copied'] {")
    expect(dark).toBeGreaterThan(-1)
    expect(copied).toBeGreaterThan(dark)
  })

  it('each have their own name', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderPage()
    const names = screen.getAllByRole('button', { hidden: true, name: /^Copy / }).map((button) => button.getAttribute('aria-label'))
    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual([
      'Copy server address',
      'Copy Claude Code command',
      'Copy Cursor settings',
      'Copy VS Code command',
      'Copy Codex command',
      'Copy address for other agents',
    ])
  })
})

describe('Connect it', () => {
  it('has a tab per agent, and a native Select for phones that drives the same panels', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const user = userEvent.setup()
    renderPage()
    const tabs = within(screen.getByRole('tablist', { name: 'Your agent' })).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Claude Code', 'Cursor', 'VS Code', 'Codex', 'Other agents'])
    const select = screen.getByRole('combobox', { name: 'Your agent' }) as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    expect([...select.options].filter((o) => !o.disabled).map((o) => o.textContent)).toEqual(tabs.map((tab) => tab.textContent))

    await user.selectOptions(select, 'codex')
    expect(screen.getByRole('tab', { name: 'Codex' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').textContent).toContain(`codex mcp add diya --url ${MCP_URL}`)

    await user.click(screen.getByRole('tab', { name: 'Cursor' }))
    expect(select.value).toBe('cursor')
    expect(within(screen.getByRole('tabpanel')).getByRole('link', { name: 'Add to Cursor' }).getAttribute('href')).toBe(MCP_INSTALL.cursorLink)
  })
})

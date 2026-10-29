import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiyaProvider } from '@idyeah/diya'
import { llmsIndex, itemBrief } from '../components/reference/ai-docs'
import { MCP_INSTALL, MCP_URL } from '../components/reference/api'
import { ReferencePanel } from '../components/reference/ReferencePanel'

/* As in ai-channel.test.tsx: read the installed api.json, which the test config's alias hides. */
vi.mock('../components/reference/api-data', async () => {
  const { readFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  return { default: JSON.parse(readFileSync(join(process.cwd(), 'node_modules/@idyeah/diya/dist/api.json'), 'utf8')) }
})

describe('Connect your editor', () => {
  it('sits beside Copy for AI and gives each editor one line to paste', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(
      <DiyaProvider>
        <ReferencePanel path="/explore?area=components&component=switch" />
      </DiyaProvider>
    )
    const panel = screen.getByRole('region', { name: 'Using Switch' })
    await user.click(within(panel).getByRole('button', { name: 'Connect your editor' }))
    const popup = await screen.findByRole('dialog', { name: 'Connect your editor' })
    expect(popup.textContent).toContain(
      'Your AI looks DIYA up while it writes: the right component, its real props, code that compiles. Read-only, no account.'
    )
    expect(popup.textContent).toContain('claude mcp add --transport http diya https://diya13.ai/mcp')
    await user.click(within(popup).getByRole('button', { name: 'Copy Claude Code command' }))
    expect(writeText).toHaveBeenCalledWith('claude mcp add --transport http diya https://diya13.ai/mcp')
    expect(within(popup).getByRole('status').textContent).toBe('Claude Code command copied.')

    await user.click(within(popup).getByRole('tab', { name: 'Cursor' }))
    const cursor = within(popup).getByRole('link', { name: 'Add to Cursor' })
    expect(cursor.getAttribute('href')).toBe(MCP_INSTALL.cursorLink)
    expect(popup.textContent).toContain('"url": "https://diya13.ai/mcp"')

    await user.click(within(popup).getByRole('tab', { name: 'VS Code' }))
    expect(within(popup).getByRole('link', { name: 'Add to VS Code' }).getAttribute('href')).toBe(MCP_INSTALL.vscodeLink)
    expect(popup.textContent).toContain(`code --add-mcp '{"name":"diya","type":"http","url":"https://diya13.ai/mcp"}'`)
    expect(popup.querySelector('[title]')).toBeNull()
  })

  it('install links carry exactly the server entry each editor expects', () => {
    const cursor = new URL(MCP_INSTALL.cursorLink)
    expect(cursor.protocol).toBe('cursor:')
    expect(cursor.searchParams.get('name')).toBe('diya')
    expect(JSON.parse(atob(cursor.searchParams.get('config')!))).toEqual({ url: MCP_URL })
    expect(MCP_INSTALL.vscodeLink.startsWith('vscode:mcp/install?')).toBe(true)
    expect(JSON.parse(decodeURIComponent(MCP_INSTALL.vscodeLink.split('?')[1]))).toEqual({ name: 'diya', type: 'http', url: MCP_URL })
    expect(JSON.parse(MCP_INSTALL.cursorJson)).toEqual({ mcpServers: { diya: { url: MCP_URL } } })
  })

  it('llms.txt and every Copy for AI brief name the server', () => {
    expect(llmsIndex()).toContain(`- [MCP server](${MCP_URL}): `)
    expect(llmsIndex()).toContain(MCP_INSTALL.claude)
    expect(itemBrief('button')).toContain(`${MCP_URL} (MCP server for your editor)`)
  })
})

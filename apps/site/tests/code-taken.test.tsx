import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, DiyaProvider } from '@idyeah/diya'

/*
 * "Code taken" reaches Vercel Web Analytics only after the code is on the
 * clipboard or saved, with exactly two catalog-made properties, and a
 * failing tracker never gets in the way of the copy.
 */
const track = vi.hoisted(() => vi.fn())
vi.mock('@vercel/analytics', () => ({ track }))

const { CODE_TAKEN, catalogItem, codeTaken } = await import('../lib/code-taken')
const { GetCodeDrawer } = await import('../components/GetCodeDrawer')
const { GetScreenCodeDrawer } = await import('../components/screens/GetScreenCodeDrawer')
const { CopyForAi } = await import('../components/reference/CopyForAi')
const { InstallChip } = await import('../components/site/InstallChip')
const { CreateChip, InstallLine } = await import('../components/landing/CreateChip')
const { setPackageManager } = await import('../components/site/package-manager')
const { screenById } = await import('../components/screens/screens-data')
const { readScreenSource } = await import('../components/screens/screen-source')

type LiveScreen = Parameters<typeof GetScreenCodeDrawer>[0]['screen']

const taken = () => track.mock.calls.map(([name, properties]) => [name, properties])

beforeEach(() => {
  track.mockReset()
  window.localStorage.clear()
  setPackageManager('npm')
  vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
  const dialog = Object.getPrototypeOf(document.createElement('dialog'))
  vi.spyOn(dialog, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
    this.open = true
  })
  vi.spyOn(dialog, 'close').mockImplementation(function (this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('codeTaken', () => {
  it('sends only catalog-shaped items, with exactly two properties', () => {
    codeTaken('component/button', 'copy')
    codeTaken('screen/sign-in', 'download')
    for (const bad of ['', null, undefined, 'button', 'component/Button', 'component/a b', 'person/vishal@example.com', 'screen/../x'])
      codeTaken(bad, 'copy')
    expect(taken()).toEqual([
      [CODE_TAKEN, { item: 'component/button', action: 'copy' }],
      [CODE_TAKEN, { item: 'screen/sign-in', action: 'download' }],
    ])
    for (const [, properties] of track.mock.calls) expect(Object.keys(properties)).toHaveLength(2)
  })

  it('names catalog ids by kind, and nothing else', () => {
    expect(catalogItem('button')).toBe('component/button')
    expect(catalogItem('table')).toBe('pattern/table')
    expect(catalogItem('not-in-the-catalog')).toBeNull()
  })

  it('never throws when the tracker does', () => {
    track.mockImplementationOnce(() => {
      throw new Error('blocked')
    })
    expect(() => codeTaken('component/button', 'copy')).not.toThrow()
  })
})

describe('Code taken on the site', () => {
  it('Get code counts the item’s own code, not the setup steps', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <DiyaProvider>
          <Button onClick={() => setOpen(true)}>Get Button code</Button>
          <GetCodeDrawer id="button" open={open} onOpenChange={setOpen} />
        </DiyaProvider>
      )
    }
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Get Button code' }))
    await user.click(await screen.findByRole('button', { name: 'Copy install command' }))
    await user.click(screen.getByRole('button', { name: 'Copy styles and provider' }))
    expect(track).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Copy Button example' }))
    await waitFor(() => expect(taken()).toEqual([[CODE_TAKEN, { item: 'component/button', action: 'copy' }]]))
  })

  it('a failed copy counts nothing', async () => {
    const user = userEvent.setup()
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new DOMException('Clipboard blocked', 'NotAllowedError'))
    render(<CopyForAi brief="# Table" title="Table" id="table" />)
    await user.click(screen.getByRole('button', { name: 'Copy for AI' }))
    await screen.findByText(/Copy didn’t work/)
    expect(track).not.toHaveBeenCalled()
  })

  it('Copy for AI counts the component or pattern it describes', async () => {
    const user = userEvent.setup()
    render(<CopyForAi brief="# Table" title="Table" id="table" />)
    await user.click(screen.getByRole('button', { name: 'Copy for AI' }))
    await waitFor(() => expect(taken()).toEqual([[CODE_TAKEN, { item: 'pattern/table', action: 'copy' }]]))
  })

  it('a screen’s file counts as copied or downloaded', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:screen')
    const saved = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()
    onTestFinished(() => {
      URL.createObjectURL = saved.create
      URL.revokeObjectURL = saved.revoke
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const entry = screenById('dashboard') as LiveScreen
    render(
      <DiyaProvider>
        <GetScreenCodeDrawer screen={entry} source={readScreenSource('dashboard')!} open onOpenChange={() => undefined} />
      </DiyaProvider>
    )
    const drawer = await screen.findByRole('dialog', { name: 'Get code' })
    await user.click(within(drawer).getByRole('button', { name: 'Copy install command' }))
    expect(track).not.toHaveBeenCalled()
    await user.click(within(drawer).getByRole('button', { name: 'Copy Analytics dashboard screen file' }))
    await user.click(within(drawer).getByRole('button', { name: 'Download Dashboard.tsx' }))
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    await waitFor(() =>
      expect(taken()).toEqual([
        [CODE_TAKEN, { item: 'screen/dashboard', action: 'copy' }],
        [CODE_TAKEN, { item: 'screen/dashboard', action: 'download' }],
      ])
    )
  })

  it('the install and create commands count as install/npm and install/create-diya', async () => {
    const user = userEvent.setup()
    render(
      <>
        <InstallChip />
        <CreateChip />
        <InstallLine />
      </>
    )
    await user.click(screen.getAllByRole('button', { name: 'Copy install command: npm install @idyeah/diya' })[0])
    await user.click(screen.getByRole('button', { name: /^Copy command: npm create diya/ }))
    await waitFor(() => expect(track).toHaveBeenCalledTimes(2))
    const line = screen.getAllByRole('button', { name: 'Copy install command: npm install @idyeah/diya' })[1]
    await user.click(line)
    await waitFor(() =>
      expect(taken()).toEqual([
        [CODE_TAKEN, { item: 'install/npm', action: 'copy' }],
        [CODE_TAKEN, { item: 'install/create-diya', action: 'copy' }],
        [CODE_TAKEN, { item: 'install/npm', action: 'copy' }],
      ])
    )
  })

  it('a tracker that throws still leaves the code copied', async () => {
    const user = userEvent.setup()
    track.mockImplementation(() => {
      throw new Error('blocked')
    })
    render(<CopyForAi brief="# Table" title="Table" id="table" />)
    await user.click(screen.getByRole('button', { name: 'Copy for AI' }))
    expect(await screen.findByRole('button', { name: 'Copied for AI' })).toBeTruthy()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# Table')
  })
})

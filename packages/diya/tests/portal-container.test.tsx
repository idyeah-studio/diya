// useDiyaPortalContainer(): where another library's popup should render. The open Dialog or
// Drawer's own element inside it, otherwise the nearest provider's portal, otherwise null.
import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { StrictMode, useState } from 'react'
import { Button, Dialog, DiyaProvider, Drawer, useDiyaPortalContainer } from '../dist/index.js'
import { subscribeModals, topModal } from '../dist/internal/modal-stack.js'

function Probe({ seen }: { seen: (HTMLElement | null)[] }) {
  seen.push(useDiyaPortalContainer())
  return null
}

describe('useDiyaPortalContainer()', () => {
  it('null before mount and outside a provider', () => {
    const seen: (HTMLElement | null)[] = []
    render(<Probe seen={seen} />)
    expect(seen.every((value) => value === null)).toBe(true)
    // The server, and the first render inside a provider, have no element yet.
    const first: (HTMLElement | null)[] = []
    expect(renderToString(<DiyaProvider><Probe seen={first} /></DiyaProvider>)).toContain('diya-portal-root')
    expect(first).toEqual([null])
  })

  it("the provider's portal on a page", () => {
    const seen: (HTMLElement | null)[] = []
    const { container } = render(<DiyaProvider><Probe seen={seen} /></DiyaProvider>)
    expect(seen[0]).toBeNull()
    expect(seen.at(-1)).toBe(container.querySelector('.diya-portal-root'))
  })

  it('the <dialog> inside an open Dialog and Drawer', () => {
    const inDialog: (HTMLElement | null)[] = []
    const inDrawer: (HTMLElement | null)[] = []
    const { container } = render(
      <DiyaProvider>
        <Dialog title="Edit project" open onOpenChange={() => {}}><Probe seen={inDialog} /></Dialog>
        <Drawer title="Filters" open onOpenChange={() => {}}><Probe seen={inDrawer} /></Drawer>
      </DiyaProvider>,
    )
    expect(inDialog.at(-1)).toBe(container.querySelector('dialog.diya-dialog'))
    expect(inDrawer.at(-1)).toBe(container.querySelector('dialog.diya-drawer-modal'))
  })

  it('a provider nested inside a modal returns its own portal', () => {
    const seen: (HTMLElement | null)[] = []
    const { container } = render(
      <DiyaProvider>
        <Dialog title="Edit project" open onOpenChange={() => {}}>
          <DiyaProvider theme="dark"><Probe seen={seen} /></DiyaProvider>
        </Dialog>
      </DiyaProvider>,
    )
    const dialog = container.querySelector('dialog')!
    const portal = dialog.querySelector('.diya-root .diya-portal-root')
    expect(portal).not.toBeNull()
    expect(seen.at(-1)).toBe(portal)
  })

  it('StrictMode settles on the same element', () => {
    const seen: (HTMLElement | null)[] = []
    const { container } = render(<StrictMode><DiyaProvider><Dialog title="Edit" open onOpenChange={() => {}}><Probe seen={seen} /></Dialog></DiyaProvider></StrictMode>)
    expect(seen.at(-1)).toBe(container.querySelector('dialog'))
  })
})

describe('the modal stack', () => {
  it('follows Dialog and Drawer as they open and close, topmost last', () => {
    function Page() {
      const [drawer, setDrawer] = useState(false)
      const [dialog, setDialog] = useState(false)
      return (
        <DiyaProvider>
          <Button onClick={() => setDrawer(true)}>Drawer</Button>
          <Drawer title="Filters" open={drawer} onOpenChange={setDrawer}>
            <Button onClick={() => setDialog(true)}>Dialog</Button>
            <Dialog title="Edit" open={dialog} onOpenChange={setDialog}><Button onClick={() => setDialog(false)}>Done</Button></Dialog>
          </Drawer>
        </DiyaProvider>
      )
    }
    const view = render(<Page />)
    expect(topModal(document)).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Drawer' }))
    expect(topModal(document)).toBe(document.querySelector('dialog.diya-drawer-modal'))
    fireEvent.click(view.getByRole('button', { name: 'Dialog' }))
    expect(topModal(document)).toBe(document.querySelector('dialog.diya-dialog'))
    fireEvent.click(view.getByRole('button', { name: 'Done' }))
    expect(topModal(document)).toBe(document.querySelector('dialog.diya-drawer-modal'))
  })

  it('unmounting an open Dialog removes it from the modal stack before its node is detached', () => {
    const order: string[] = []
    const view = render(<DiyaProvider><Dialog title="Edit" open onOpenChange={() => {}}><p>Body</p></Dialog></DiyaProvider>)
    const dialog = view.container.querySelector('dialog')!
    expect(topModal(document)).toBe(dialog)
    const stop = subscribeModals(document, () => order.push(`stack changed; dialog ${dialog.isConnected ? 'still in the page' : 'already detached'}`))
    view.unmount()
    stop()
    expect(order).toEqual(['stack changed; dialog still in the page'])
    expect(topModal(document)).toBeNull()
  })

  it('unmounting an open Drawer does the same', () => {
    const order: string[] = []
    const view = render(<DiyaProvider><Drawer title="Filters" open onOpenChange={() => {}}><p>Body</p></Drawer></DiyaProvider>)
    const drawer = view.container.querySelector('dialog')!
    const stop = subscribeModals(document, () => order.push(drawer.isConnected ? 'connected' : 'detached'))
    view.unmount()
    stop()
    expect(order).toEqual(['connected'])
    expect(topModal(document)).toBeNull()
  })
})

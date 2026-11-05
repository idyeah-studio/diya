import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { Button, Dialog, DiyaProvider, Menu, Popover, TextLink, Tooltip } from '@idyeah/diya'

// In `next dev`, an element a Server Component passes to a client component
// arrives as a lazy reference whose payload is already resolved. Children.only
// threw on it: "React.Children.only expected to receive a single React element child."
function fromServer(element: ReactElement): ReactElement {
  const payload = { status: 'fulfilled', value: element, then: (resolve: (value: ReactElement) => void) => resolve(element) }
  return { $$typeof: Symbol.for('react.lazy'), _payload: payload, _init: (chunk: typeof payload) => chunk.value } as unknown as ReactElement
}

describe('elements sent lazily from a Server Component', () => {
  it('Tooltip wires its trigger', () => {
    render(<DiyaProvider><Tooltip content="Saved two minutes ago">{fromServer(<button type="button">Status</button>)}</Tooltip></DiyaProvider>)
    const trigger = screen.getByRole('button', { name: 'Status' })
    fireEvent.focus(trigger)
    expect(screen.getByRole('tooltip').textContent).toBe('Saved two minutes ago')
  })
  it('Button and TextLink with asChild style the child', () => {
    render(<DiyaProvider>
      <Button asChild>{fromServer(<a href="/billing">Billing</a>)}</Button>
      <TextLink asChild>{fromServer(<a href="/plans">Plans</a>)}</TextLink>
    </DiyaProvider>)
    expect(screen.getByRole('link', { name: 'Billing' }).className).toBe('diya-button')
    expect(screen.getByRole('link', { name: 'Plans' }).className).toBe('diya-text-link')
  })
  it('Dialog, Popover and Menu open from a trigger', () => {
    render(<DiyaProvider>
      <Dialog title="Rename project" trigger={fromServer(<button type="button">Rename</button>)}>Pick a new name.</Dialog>
      <Popover label="Filters" trigger={fromServer(<button type="button">Filters</button>)}>Only open invoices.</Popover>
      <Menu label="Actions" items={[{ id: 'archive', label: 'Archive' }]} trigger={fromServer(<button type="button">Actions</button>)} />
    </DiyaProvider>)
    expect(screen.getByRole('button', { name: 'Rename' }).getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    expect(screen.getByRole('button', { name: 'Filters' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: 'Actions' })).toBeTruthy()
  })
})

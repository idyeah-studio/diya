import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, forwardRef, useState, type AnchorHTMLAttributes } from 'react'
import { renderToString } from 'react-dom/server'
import {
  Breadcrumbs, Button, Dialog, DiyaProvider, Drawer, Menu, Pagination, Popover, SideNavigation, SiteHeader, Tabs, TextLink, Tooltip,
} from '../dist/index.js'

// Stands in for Next.js Link: a forwardRef anchor that marks itself and records client navigations.
const visits: string[] = []
const RouterLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(function RouterLink({ onClick, ...props }, ref) {
  return <a ref={ref} data-router="yes" {...props} onClick={(event) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    event.preventDefault()
    visits.push(props.href)
  }} />
})

describe('Button: links, asChild and destructive', () => {
  it('renders href through the provider link component, with every Button attribute', () => {
    visits.length = 0
    const ref = createRef<HTMLButtonElement | HTMLAnchorElement>()
    render(<DiyaProvider linkComponent={RouterLink}><Button ref={ref} href="/billing" variant="outline" className="mine" data-testid="go">Billing</Button></DiyaProvider>)
    const link = screen.getByRole('link', { name: 'Billing' })
    expect(link.getAttribute('data-router')).toBe('yes')
    expect(link.className).toBe('diya-button mine')
    expect(link.getAttribute('data-variant')).toBe('outline')
    expect(link.getAttribute('data-shape')).toBe('pill')
    expect(link.getAttribute('type')).toBe(null)
    expect(ref.current).toBe(link)
    fireEvent.click(link)
    expect(visits).toEqual(['/billing'])
  })

  it('falls back to a plain anchor and blocks a disabled or loading link', () => {
    visits.length = 0
    const clicked = vi.fn()
    const { rerender } = render(<Button href="/docs" target="_blank" rel="noopener">Docs</Button>)
    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/docs')
    expect(link.getAttribute('target')).toBe('_blank')
    rerender(<Button href="/docs" disabled onClick={clicked}>Docs</Button>)
    const disabled = screen.getByRole('link', { name: 'Docs' })
    expect(disabled.hasAttribute('href')).toBe(false)
    expect(disabled.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(disabled)
    expect(clicked).not.toHaveBeenCalled()
    rerender(<Button href="/docs" loading>Docs</Button>)
    expect(screen.getByRole('link', { name: /Docs/ }).getAttribute('aria-busy')).toBe('true')
  })

  it('styles the caller element with asChild and reaches its ref', () => {
    visits.length = 0
    const ours = createRef<HTMLButtonElement | HTMLAnchorElement>()
    const clicked = vi.fn()
    render(<Button ref={ours} asChild variant="quiet" onClick={clicked}><RouterLink href="/team">Team</RouterLink></Button>)
    const link = screen.getByRole('link', { name: 'Team' })
    expect(link.getAttribute('data-router')).toBe('yes')
    expect(link.getAttribute('data-variant')).toBe('quiet')
    expect(link.classList.contains('diya-button')).toBe(true)
    expect(ours.current).toBe(link)
    fireEvent.click(link)
    expect(clicked).toHaveBeenCalledOnce()
    expect(visits).toEqual(['/team'])
  })

  it('stops a disabled asChild element before the router sees the click', () => {
    visits.length = 0
    render(<Button asChild disabled><RouterLink href="/team">Team</RouterLink></Button>)
    const link = screen.getByRole('link', { name: 'Team' })
    expect(link.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(link)
    expect(visits).toEqual([])
  })

  it('offers a destructive variant and keeps the native button default', () => {
    const ref = createRef<HTMLButtonElement | HTMLAnchorElement>()
    render(<Button ref={ref} variant="destructive" style={{ marginTop: 4 }}>Delete project</Button>)
    const button = screen.getByRole('button', { name: 'Delete project' })
    expect(button.getAttribute('data-variant')).toBe('destructive')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.style.marginTop).toBe('4px')
    expect(ref.current).toBe(button)
  })
})

describe('TextLink', () => {
  it('renders without a provider, server-side too, and wraps a router link with asChild', () => {
    expect(renderToString(<TextLink href="/a">Read more</TextLink>)).toContain('class="diya-text-link"')
    const ref = createRef<HTMLAnchorElement>()
    render(<TextLink ref={ref} asChild trailingIcon="→" className="mine"><RouterLink href="/guide">Guide</RouterLink></TextLink>)
    const link = screen.getByRole('link', { name: 'Guide' })
    expect(link.getAttribute('data-router')).toBe('yes')
    expect(link.className).toBe('diya-text-link mine')
    expect(link.querySelector('[aria-hidden="true"]')?.textContent).toBe('→')
    expect(ref.current).toBe(link)
  })
})

describe('navigation items with href', () => {
  it('SideNavigation renders links through linkComponent with aria-current; buttons stay buttons', async () => {
    visits.length = 0
    const user = userEvent.setup()
    const ref = createRef<HTMLElement>()
    render(<DiyaProvider linkComponent={RouterLink}><SideNavigation ref={ref} className="mine" value="home" groups={[{ id: 'main', items: [
      { value: 'home', label: 'Home', href: '/' },
      { value: 'billing', label: 'Billing', href: '/billing' },
      { value: 'off', label: 'Archived', href: '/archived', disabled: true },
      { value: 'help', label: 'Help' },
    ] }]} /></DiyaProvider>)
    const nav = screen.getByRole('navigation', { name: 'Application navigation' })
    expect(ref.current).toBe(nav)
    expect(nav.classList.contains('mine')).toBe(true)
    expect(nav.classList.contains('diya-app-pattern-surface')).toBe(true)
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Billing' }).getAttribute('data-router')).toBe('yes')
    expect((screen.getByRole('button', { name: 'Archived' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Help' })).toBeDefined()
    await user.click(screen.getByRole('link', { name: 'Billing' }))
    expect(visits).toEqual(['/billing'])
  })

  it('SideNavigation hands plain clicks to onValueChange when it is given', async () => {
    visits.length = 0
    const change = vi.fn()
    render(<DiyaProvider linkComponent={RouterLink}><SideNavigation value="home" onValueChange={change} groups={[{ id: 'main', items: [{ value: 'billing', label: 'Billing', href: '/billing' }] }]} /></DiyaProvider>)
    await userEvent.setup().click(screen.getByRole('link', { name: 'Billing' }))
    expect(change).toHaveBeenCalledWith('billing')
    expect(visits).toEqual([])
  })

  it('Breadcrumbs and SiteHeader route their links, brand included', () => {
    const ref = createRef<HTMLDivElement>()
    render(<DiyaProvider linkComponent={RouterLink}>
      <Breadcrumbs className="crumbs" items={[{ label: 'Projects', href: '/projects' }, { label: 'Atlas', href: '/projects/atlas' }]} />
      <SiteHeader ref={ref} brand="Acme" brandHref="/" value="docs" items={[{ value: 'docs', label: 'Docs', href: '/docs' }, { value: 'blog', label: 'Blog' }]} />
    </DiyaProvider>)
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(crumbs.classList.contains('crumbs')).toBe(true)
    expect(within(crumbs).getByRole('link', { name: 'Projects' }).getAttribute('data-router')).toBe('yes')
    expect(within(crumbs).getByText('Atlas').getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('data-router')).toBe('yes')
    const docs = screen.getByRole('link', { name: 'Docs' })
    expect(docs.getAttribute('data-router')).toBe('yes')
    expect(docs.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'Blog' })).toBeDefined()
    expect(ref.current?.classList.contains('diya-site-header-container')).toBe(true)
  })

  it('collapsed Breadcrumbs put the folded pages in the menu as real links', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider linkComponent={RouterLink}><Breadcrumbs collapsed items={[
      { label: 'Home', href: '/' }, { label: 'Projects', href: '/projects' }, { label: 'Atlas', href: '/projects/atlas' }, { label: 'Settings', href: '/projects/atlas/settings' },
    ]} /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'More pages' }))
    const item = screen.getByRole('menuitem', { name: 'Projects' })
    expect(item.tagName).toBe('A')
    expect(item.getAttribute('href')).toBe('/projects')
    expect(item.getAttribute('data-router')).toBe('yes')
  })
})

describe('Menu and Popover triggers', () => {
  it('Menu link items route, mark the current page and close the menu', async () => {
    visits.length = 0
    const user = userEvent.setup()
    render(<DiyaProvider linkComponent={RouterLink}><Menu label="Workspace" items={[
      { id: 'settings', label: 'Settings', href: '/settings', current: true },
      { id: 'billing', label: 'Billing', href: '/billing' },
      { id: 'sign-out', label: 'Sign out', onSelect: () => {} },
    ]} /></DiyaProvider>)
    const trigger = screen.getByRole('button', { name: 'Workspace' })
    expect(trigger.getAttribute('data-shape')).toBe('pill')
    await user.click(trigger)
    expect(screen.getByRole('menuitem', { name: 'Settings' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('menuitem', { name: 'Sign out' }).tagName).toBe('BUTTON')
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Billing' }))
    await user.keyboard('{Enter}')
    expect(visits).toEqual(['/billing'])
    expect(screen.queryByRole('menu')).toBe(null)
    expect(document.activeElement).toBe(trigger)
  })

  it('Menu takes a trigger slot, a controlled open state and root attributes on the trigger', async () => {
    const user = userEvent.setup()
    const ref = createRef<HTMLButtonElement>()
    const changes: boolean[] = []
    function Example() {
      const [open, setOpen] = useState(false)
      return <DiyaProvider><Menu ref={ref} label="Project actions" open={open} onOpenChange={(next) => { changes.push(next); setOpen(next) }}
        trigger={<Button iconOnly variant="quiet" aria-label="More actions">⋯</Button>}
        items={[{ id: 'rename', label: 'Rename', onSelect: () => {} }]} /></DiyaProvider>
    }
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'More actions' })
    expect(ref.current).toBe(trigger)
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    await user.click(trigger)
    expect(screen.getByRole('menu', { name: 'Project actions' })).toBeDefined()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBe(null)
    expect(changes).toEqual([true, false])
    expect(document.activeElement).toBe(trigger)
    render(<Menu label="Sort" className="mine" data-testid="sort" items={[]} />)
    expect(screen.getByTestId('sort').classList.contains('mine')).toBe(true)
  })

  it('Popover accepts plain content, opens from outside and reports changes', async () => {
    const change = vi.fn()
    const { rerender } = render(<DiyaProvider><Popover label="Filters" open={false} onOpenChange={change}><p>Only active projects</p></Popover></DiyaProvider>)
    expect(screen.queryByRole('dialog')).toBe(null)
    rerender(<DiyaProvider><Popover label="Filters" open onOpenChange={change}><p>Only active projects</p></Popover></DiyaProvider>)
    expect(screen.getByRole('dialog', { name: 'Filters' }).textContent).toBe('Only active projects')
    await act(async () => { fireEvent.keyDown(document, { key: 'Escape' }) })
    expect(change).toHaveBeenLastCalledWith(false)
  })

  it('Popover still renders a function child and uses its own trigger slot', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Popover label="Share" trigger={<Button variant="outline">Share project</Button>}>{(close) => <Button onClick={close}>Done</Button>}</Popover></DiyaProvider>)
    const trigger = screen.getByRole('button', { name: 'Share project' })
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Share' })).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).toBe(null)
    expect(document.activeElement).toBe(trigger)
  })
})

describe('Tooltip wraps a child trigger', () => {
  it('wires hover, focus and aria-describedby onto the child, keeping its own description', async () => {
    const user = userEvent.setup()
    const ref = createRef<HTMLButtonElement>()
    const clicked = vi.fn()
    // motion="off": hovering shows the bubble at once, as in 1.0, so the test can check it straight away.
    render(<DiyaProvider motion="off"><Tooltip ref={ref} content="Deletes it for everyone"><Button iconOnly aria-label="Delete" aria-describedby="hint" onClick={clicked}>×</Button></Tooltip><p id="hint">Hint</p></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(ref.current).toBe(button)
    expect(button.parentElement?.classList.contains('diya-tooltip-anchor')).toBe(false)
    await user.tab()
    const tip = screen.getByRole('tooltip')
    expect(tip.textContent).toBe('Deletes it for everyone')
    expect(button.getAttribute('aria-describedby')).toBe(`hint ${tip.id}`)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).toBe(null)
    expect(button.getAttribute('aria-describedby')).toBe('hint')
    await user.hover(button)
    expect(screen.getByRole('tooltip')).toBeDefined()
    await user.click(button)
    expect(clicked).toHaveBeenCalledOnce()
  })

  it('keeps the label mode, with root attributes on the anchor and the ref on its button', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<DiyaProvider><Tooltip ref={ref} label="About access" content="Invited people only" className="mine">?</Tooltip></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'About access' })
    expect(ref.current).toBe(button)
    expect(button.parentElement?.className).toBe('diya-tooltip-anchor mine')
  })
})

describe('Dialog and Drawer', () => {
  it('opens from a trigger slot, returns focus to it and confirms destructively', async () => {
    const user = userEvent.setup()
    const ref = createRef<HTMLDialogElement>()
    const removed = vi.fn()
    render(<DiyaProvider><Dialog ref={ref} className="mine" headingLevel={2} title="Delete project?" trigger={<Button variant="destructive">Delete</Button>}
      confirmLabel="Delete project" confirmVariant="destructive" onConfirm={removed}>This can't be undone.</Dialog></DiyaProvider>)
    const trigger = screen.getByRole('button', { name: 'Delete' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(screen.queryByRole('button', { name: 'Open dialog' })).toBe(null)
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Delete project?' })
    expect(ref.current).toBe(dialog)
    expect(dialog.classList.contains('mine')).toBe(true)
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Delete project?' })).toBeDefined()
    const confirm = within(dialog).getByRole('button', { name: 'Delete project' })
    expect(confirm.getAttribute('data-variant')).toBe('destructive')
    await user.click(confirm)
    expect(removed).toHaveBeenCalledOnce()
    expect((dialog as HTMLDialogElement).open).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('renders nothing visible without a trigger until open is set', () => {
    const { rerender, container } = render(<DiyaProvider><Dialog title="Settings" open={false} /></DiyaProvider>)
    expect(Array.from(container.querySelectorAll('button')).filter((button) => !button.closest('dialog')).length).toBe(0)
    rerender(<DiyaProvider><Dialog title="Settings" open /></DiyaProvider>)
    expect((screen.getByRole('dialog', { name: 'Settings' }) as HTMLDialogElement).open).toBe(true)
  })

  it('Drawer takes headingLevel, a ref and root attributes', () => {
    const ref = createRef<HTMLDialogElement>()
    render(<DiyaProvider><Drawer ref={ref} open onOpenChange={() => {}} title="Filters" headingLevel={2} className="mine" data-testid="drawer">Body</Drawer></DiyaProvider>)
    const drawer = screen.getByTestId('drawer')
    expect(ref.current).toBe(drawer)
    expect(drawer.classList.contains('mine')).toBe(true)
    expect(drawer.classList.contains('diya-drawer-modal')).toBe(true)
    expect(within(drawer).getByRole('heading', { level: 2, name: 'Filters' })).toBeDefined()
  })

  it('Drawer closes on a click on the dimmed page, like Dialog, and not on a click inside it', () => {
    const change = vi.fn()
    render(<DiyaProvider><Drawer open onOpenChange={change} title="Filters" data-testid="drawer"><p>Body</p></Drawer></DiyaProvider>)
    const drawer = screen.getByTestId('drawer')
    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue({ left: 600, right: 1040, top: 0, bottom: 900, x: 600, y: 0, width: 440, height: 900, toJSON: () => ({}) })
    fireEvent.click(screen.getByText('Body'), { clientX: 700, clientY: 100 })
    fireEvent.click(drawer, { clientX: 800, clientY: 100 })
    expect(change).not.toHaveBeenCalled()
    // The backdrop belongs to the dialog element, so a click there lands on it, outside its box.
    fireEvent.click(drawer, { clientX: 200, clientY: 100 })
    expect(change).toHaveBeenCalledWith(false)
  })
})

describe('escape hatches on Pagination and Tabs', () => {
  it('passes className, style, attributes and the ref to the root', () => {
    const pagination = createRef<HTMLDivElement>()
    const tabs = createRef<HTMLDivElement>()
    render(<>
      <Pagination ref={pagination} className="pages" data-testid="pages" page={1} total={40} pageSize={10} onPageChange={() => {}} />
      <Tabs ref={tabs} className="sections" style={{ maxWidth: 400 }} label="Sections" value="a" onValueChange={() => {}} items={[{ value: 'a', label: 'A', content: 'One' }]} />
    </>)
    expect(pagination.current).toBe(screen.getByTestId('pages'))
    expect(pagination.current?.className).toBe('diya-pagination pages')
    expect(tabs.current?.className).toBe('diya-tabs sections')
    expect(tabs.current?.style.maxWidth).toBe('400px')
    // Previous and Next keep their words as the accessible name when they shrink to arrows.
    expect(screen.getByRole('button', { name: 'Next' })).toBeDefined()
  })
})

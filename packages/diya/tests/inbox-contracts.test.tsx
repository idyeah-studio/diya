// The parts of an inbox or assistant screen: List marks the open and unread
// rows, Side Navigation shows quiet item counts, and Chatbot's thread fills
// the height it is given while following the latest message.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Avatar, Chatbot, DiyaProvider, List, Menu, SideNavigation, defaultMessages, type ChatMessage, type SideNavigationGroup } from '../dist/index.js'

afterEach(() => { vi.unstubAllGlobals() })

describe('List current and unread', () => {
  const inbox = (open = vi.fn()) => [
    { id: 'plan', label: 'Quarterly plan', description: 'Ana Ruiz', current: true, onSelect: () => open('plan') },
    { id: 'review', label: 'Design review', description: 'Li Wei', unread: true, onSelect: () => open('review') },
    { id: 'invoice', label: 'Invoice 1042', description: 'Billing', trailing: 'Today', unread: true, onSelect: () => open('invoice') },
  ]

  it('marks the open row with aria-current="true" on its button, and no other row', () => {
    render(<DiyaProvider><List label="Inbox" items={inbox()} /></DiyaProvider>)
    const list = screen.getByRole('list', { name: 'Inbox' })
    const plan = within(list).getByRole('button', { name: /^Quarterly plan/ })
    expect(plan.getAttribute('aria-current')).toBe('true')
    expect(plan.closest('li')?.hasAttribute('aria-current')).toBe(false)
    expect(list.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  it('marks a row that is not selectable on its list item', () => {
    render(<DiyaProvider><List label="Steps" items={[{ id: 'one', label: 'Upload' }, { id: 'two', label: 'Review', current: true }]} /></DiyaProvider>)
    const [upload, review] = within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('listitem')
    expect(review.getAttribute('aria-current')).toBe('true')
    expect(upload.hasAttribute('aria-current')).toBe(false)
  })

  it('says "unread" after the label, keeps the dot out of the name, and stays a normal button', async () => {
    const open = vi.fn()
    const user = userEvent.setup()
    render(<DiyaProvider><List label="Inbox" items={inbox(open)} /></DiyaProvider>)
    // The name starts with the label and its state ("Design review, unread"); the description and trailing text follow.
    const unread = (label: string) => new RegExp(`^${label}\\s?, unread\\b`)
    const review = screen.getByRole('button', { name: unread('Design review') })
    expect(screen.getByRole('button', { name: unread('Invoice 1042') })).toBeDefined()
    expect(screen.getByRole('button', { name: /^Quarterly plan/ }).textContent).not.toMatch(/unread/)
    expect(review.getAttribute('data-unread')).toBe('true')
    const dot = review.querySelector('.diya-list-unread')
    expect(dot?.getAttribute('aria-hidden')).toBe('true')
    expect(dot?.textContent).toBe('')
    // Keyboard: every row is a Tab stop and Enter opens it.
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(review)
    await user.keyboard('{Enter}')
    expect(open).toHaveBeenCalledWith('review')
  })

  it('takes the unread word from messages', () => {
    expect(defaultMessages.list.unread).toBe('unread')
    render(<DiyaProvider messages={{ list: { unread: 'non lu' } }}><List label="Boîte" items={[{ id: 'a', label: 'Plan', unread: true }]} /></DiyaProvider>)
    expect(within(screen.getByRole('listitem')).getByText(', non lu')).toBeDefined()
  })

  it('leaves rows unmarked by default', () => {
    const { container } = render(<DiyaProvider><List label="Files" items={[{ id: 'a', label: 'Brief', onSelect: () => {} }, { id: 'b', label: 'Notes' }]} /></DiyaProvider>)
    expect(container.querySelectorAll('[aria-current], [data-unread], .diya-list-unread, .diya-sr-only')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Brief' })).toBeDefined()
  })
})

describe('Side Navigation counts', () => {
  const groups: SideNavigationGroup[] = [{ id: 'mail', label: 'Mail', items: [
    { value: 'inbox', label: 'Inbox', href: '/inbox', count: 12, icon: <svg data-testid="inbox-icon" /> },
    { value: 'drafts', label: 'Drafts', count: 0 },
    { value: 'archive', label: 'Archive', count: 250 },
    { value: 'help', label: 'Help' },
  ] }]

  it('shows a quiet count after the label and names the item with the real count', () => {
    render(<DiyaProvider><SideNavigation value="inbox" groups={groups} /></DiyaProvider>)
    const inbox = screen.getByRole('link', { name: 'Inbox, 12' })
    expect(inbox.getAttribute('aria-current')).toBe('page')
    const count = inbox.querySelector('.diya-side-navigation-count')
    expect(count?.textContent).toBe('12')
    expect(count?.getAttribute('aria-hidden')).toBe('true')
    // Badge's cap: 99+ on screen, the real number in the name.
    const archive = screen.getByRole('button', { name: 'Archive, 250' })
    expect(archive.querySelector('.diya-side-navigation-count')?.textContent).toBe('99+')
    // No count, or 0, adds nothing.
    for (const name of ['Drafts', 'Help']) {
      const item = screen.getByRole('button', { name })
      expect(item.hasAttribute('aria-label')).toBe(false)
      expect(item.querySelector('.diya-side-navigation-count')).toBe(null)
    }
  })

  it('keeps the count in the name when collapsed and shows a dot on the icon instead of the number', () => {
    render(<DiyaProvider><SideNavigation value="inbox" collapsed groups={groups} /></DiyaProvider>)
    const inbox = screen.getByRole('link', { name: 'Inbox, 12' })
    expect(inbox.textContent).toBe('')
    expect(screen.getByTestId('inbox-icon').parentElement?.querySelector('.diya-side-navigation-dot')).not.toBe(null)
    const archive = screen.getByRole('button', { name: 'Archive, 250' })
    expect(archive.querySelector('.diya-side-navigation-icon')?.textContent).toBe('A')
    expect(archive.querySelector('.diya-side-navigation-dot')).not.toBe(null)
    expect(screen.getByRole('button', { name: 'Drafts' }).querySelector('.diya-side-navigation-dot')).toBe(null)
  })

  it('still chooses the item by click and keyboard', async () => {
    const change = vi.fn()
    const user = userEvent.setup()
    render(<DiyaProvider><SideNavigation value="inbox" onValueChange={change} groups={groups} /></DiyaProvider>)
    await user.click(screen.getByRole('link', { name: 'Inbox, 12' }))
    expect(change).toHaveBeenLastCalledWith('inbox')
    screen.getByRole('button', { name: 'Archive, 250' }).focus()
    await user.keyboard('{Enter}')
    expect(change).toHaveBeenLastCalledWith('archive')
  })

  it('takes the counted name from messages', () => {
    expect(defaultMessages.sideNavigation.count('Inbox', 3)).toBe('Inbox, 3')
    render(<DiyaProvider messages={{ sideNavigation: { count: (label, count) => `${label} (${count} non lus)` } }}><SideNavigation value="inbox" groups={groups} /></DiyaProvider>)
    expect(screen.getByRole('link', { name: 'Inbox (12 non lus)' })).toBeDefined()
  })
})

describe('Side Navigation footer', () => {
  const groups: SideNavigationGroup[] = [{ id: 'main', items: [{ value: 'home', label: 'Home' }, { value: 'reports', label: 'Reports' }] }]
  const account = <Menu label="Account" triggerIcon={<Avatar name="Alex Morgan" />} items={[{ id: 'out', label: 'Sign out', onSelect: () => {} }]} />

  it('renders the footer last, after the groups, outside the item rows', () => {
    const { container } = render(<DiyaProvider><SideNavigation value="home" groups={groups} brand="Oriel" footer={<>{account}<span>Alex Morgan</span></>} /></DiyaProvider>)
    const nav = container.querySelector('nav')!
    const footer = nav.lastElementChild!
    expect(footer.className).toBe('diya-side-navigation-footer')
    expect(footer.textContent).toContain('Alex Morgan')
    // The account menu is its own button, not a navigation item.
    const trigger = screen.getByRole('button', { name: 'Account' })
    expect(footer.contains(trigger)).toBe(true)
    expect(trigger.hasAttribute('aria-current')).toBe(false)
    expect(screen.getAllByRole('button').filter((button) => !footer.contains(button)).map((button) => button.textContent)).toEqual(['Home', 'Reports'])
  })

  it('shows collapsedFooter when collapsed, falling back to footer, and nothing without a footer', () => {
    const view = render(<DiyaProvider><SideNavigation collapsed value="home" groups={groups} footer={<span>Alex Morgan</span>} collapsedFooter={<span>AM</span>} /></DiyaProvider>)
    expect(view.container.querySelector('.diya-side-navigation-footer')!.textContent).toBe('AM')
    view.rerender(<DiyaProvider><SideNavigation collapsed value="home" groups={groups} footer={<span>Alex Morgan</span>} /></DiyaProvider>)
    expect(view.container.querySelector('.diya-side-navigation-footer')!.textContent).toBe('Alex Morgan')
    view.rerender(<DiyaProvider><SideNavigation value="home" groups={groups} collapsedFooter={<span>AM</span>} /></DiyaProvider>)
    expect(view.container.querySelector('.diya-side-navigation-footer')).toBe(null)
  })

  it('pins the footer to the bottom, and keeps item rules on the group rows so the footer is left alone', () => {
    const css = readFileSync(resolve(process.cwd(), 'dist/styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const body = (selector: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selectors]) => selectors.trim() === selector).map(([, , text]) => text).join(';')
    expect(body('.diya-root .diya-side-navigation:has(> .diya-side-navigation-footer)')).toMatch(/display:\s*flex;\s*flex-direction:\s*column/)
    expect(body('.diya-root .diya-side-navigation > .diya-side-navigation-footer')).toMatch(/margin:\s*auto 0 0/)
    const reaching = [...css.matchAll(/([^{}]+)\{/g)].map(([, selectors]) => selectors.trim()).filter((selectors) => /\.diya-side-navigation\s+(button|a|small|\[aria-current\])/.test(selectors))
    expect(reaching).toEqual([])
  })
})

describe('Chatbot thread height', () => {
  const css = readFileSync(resolve(process.cwd(), 'dist/styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const rule = (selector: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.split(',').some((part) => part.trim() === selector))
    .map(([, , body]) => body).join(';')

  it('lets the thread take the height between header and composer instead of a fixed one', () => {
    const thread = rule('.diya-root .diya-chat-thread')
    expect(thread).toMatch(/flex:\s*1 1 280px/)
    expect(thread).toMatch(/min-height:\s*0/)
    expect(thread).toMatch(/overflow:\s*auto/)
    expect(thread).not.toMatch(/(^|;)\s*height:/)
    expect(rule(".diya-root .diya-chat[data-presentation='full-page'] .diya-chat-thread")).toMatch(/flex-basis:\s*380px/)
    // Full-page fills its container's height and may shrink inside a flex or grid app shell.
    expect(rule(".diya-root .diya-chat[data-presentation='full-page']")).toMatch(/height:\s*100%;\s*min-height:\s*0/)
    for (const part of ['header', 'composer', 'notice']) expect(rule(`.diya-root .diya-chat-${part}`), part).toMatch(/flex:\s*none/)
  })

  it('takes a height from style on any layout', () => {
    render(<DiyaProvider><Chatbot title="Help" layout="floating" style={{ height: 520 }} messages={[]} value="" onValueChange={() => {}} onSend={() => {}} /></DiyaProvider>)
    expect(screen.getByRole('region', { name: 'Help' }).style.height).toBe('520px')
  })

  it('keeps the latest message in view when the thread is resized, unless the reader scrolled up', () => {
    const observers: { callback: () => void; disconnect: ReturnType<typeof vi.fn>; targets: Element[] }[] = []
    vi.stubGlobal('ResizeObserver', class {
      callback: () => void
      disconnect = vi.fn()
      targets: Element[] = []
      constructor(callback: () => void) { this.callback = callback; observers.push(this) }
      observe(target: Element) { this.targets.push(target) }
      unobserve() {}
    })
    const messages: ChatMessage[] = [{ id: '1', role: 'user', text: 'Hello' }, { id: '2', role: 'assistant', text: 'Hi there' }]
    const view = render(<DiyaProvider><Chatbot title="Help" layout="full-page" messages={messages} value="" onValueChange={() => {}} onSend={() => {}} /></DiyaProvider>)
    const thread = screen.getByRole('log', { name: 'Help messages' })
    const observer = observers.find((entry) => entry.targets.includes(thread))!
    expect(observer).toBeDefined()
    let height = 1000
    Object.defineProperty(thread, 'scrollHeight', { configurable: true, get: () => height })
    Object.defineProperty(thread, 'clientHeight', { configurable: true, get: () => 200 })
    // At the end: a resize keeps the end in view.
    thread.scrollTop = 800
    fireEvent.scroll(thread)
    height = 1100
    act(() => observer.callback())
    expect(thread.scrollTop).toBe(1100)
    // Scrolled up to read: a resize leaves the reader where they are.
    thread.scrollTop = 100
    fireEvent.scroll(thread)
    act(() => observer.callback())
    expect(thread.scrollTop).toBe(100)
    view.unmount()
    expect(observer.disconnect).toHaveBeenCalled()
  })
})

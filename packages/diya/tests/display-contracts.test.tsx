import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Badge, Breadcrumbs, Card, Chatbot, DiyaProvider, FileUpload, Progress, Tabs, Tag, Wizard } from '../dist/index.js'

describe('display props', () => {
  it('treats Progress without a value as indeterminate', () => {
    render(<DiyaProvider><Progress label="Syncing" /></DiyaProvider>)
    const bar = screen.getByRole('progressbar', { name: 'Syncing' })
    expect(bar.hasAttribute('aria-valuenow')).toBe(false)
    expect(bar.getAttribute('aria-valuetext')).toBe('In progress')
    expect(screen.queryByText(/%$/)).toBe(null)
  })

  it('shows a Progress value, a circular variant, and hides the number with showValue={false}', () => {
    const view = render(<DiyaProvider><Progress label="Upload" value={40} /></DiyaProvider>)
    const bar = screen.getByRole('progressbar', { name: 'Upload' })
    expect(bar.getAttribute('aria-valuenow')).toBe('40')
    expect(bar.hasAttribute('aria-valuetext')).toBe(false)
    expect(screen.getByText('40%')).toBeTruthy()
    view.rerender(<DiyaProvider><Progress label="Upload" value={40} variant="circular" showValue={false} /></DiyaProvider>)
    expect(bar.closest('.diya-progress')?.getAttribute('data-variant')).toBe('circular')
    expect(screen.queryByText('40%')).toBe(null)
    view.rerender(<DiyaProvider><Progress label="Upload" value={40} indeterminate /></DiyaProvider>)
    expect(bar.hasAttribute('aria-valuenow')).toBe(false)
  })

  it('caps a Badge count at max and keeps the real count in its name', () => {
    render(<DiyaProvider><Badge variant="count" count={150} label="messages" /><Badge variant="count" count={12} max={9} tone="error" label="alerts" /></DiyaProvider>)
    expect(screen.getByRole('img', { name: '150 messages' }).textContent).toBe('99+')
    const alerts = screen.getByRole('img', { name: '12 alerts' })
    expect(alerts.textContent).toBe('9+')
    expect(alerts.getAttribute('data-color')).toBe('error')
  })

  it('applies a Tag tone and names its remove button', () => {
    const remove = vi.fn()
    render(<DiyaProvider><Tag label="Paid" tone="success" onRemove={remove}>Paid</Tag></DiyaProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Paid' }))
    expect(remove).toHaveBeenCalledOnce()
    expect(screen.getByText('Paid').closest('.diya-tag')?.getAttribute('data-color')).toBe('success')
  })

  it('renders Card tags and actions slots', () => {
    render(<DiyaProvider><Card title="Atlas" tags={<span>Draft</span>} actions={<button type="button">More for Atlas</button>}>Body</Card></DiyaProvider>)
    const card = screen.getByRole('article', { name: 'Atlas' })
    expect(card.querySelector('.diya-card-tag')?.textContent).toBe('Draft')
    expect(screen.getByRole('button', { name: 'More for Atlas' }).closest('.diya-card-menu')).not.toBe(null)
  })

  it('uses the pill Tabs variant', () => {
    render(<DiyaProvider><Tabs label="Views" variant="pill" value="one" onValueChange={() => {}} items={[{ value: 'one', label: 'One', content: 'First' }]} /></DiyaProvider>)
    expect(screen.getByRole('tablist', { name: 'Views' }).closest('.diya-tabs')?.getAttribute('data-variant')).toBe('pill')
  })

  it('swaps the first breadcrumb for a home icon with showHomeIcon and keeps its name', () => {
    const items = [{ label: 'Home', href: '#home' }, { label: 'Projects', href: '#projects' }]
    const view = render(<DiyaProvider><Breadcrumbs items={items} /></DiyaProvider>)
    expect(screen.getByRole('link', { name: 'Home' }).textContent).toBe('Home')
    view.rerender(<DiyaProvider><Breadcrumbs showHomeIcon items={items} /></DiyaProvider>)
    const home = screen.getByRole('link', { name: 'Home' })
    expect(home.textContent).toBe('')
    expect(home.querySelector('svg')).not.toBe(null)
  })

  it('shows the Wizard step count by default and hides it with showStepCount={false}', () => {
    const steps = [{ id: 'one', label: 'Details', content: 'Details form' }, { id: 'two', label: 'Review', content: 'Review form' }]
    const view = render(<DiyaProvider><Wizard steps={steps} activeStep={0} onStepChange={() => {}} onComplete={() => {}} /></DiyaProvider>)
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    view.rerender(<DiyaProvider><Wizard steps={steps} activeStep={0} showStepCount={false} onStepChange={() => {}} onComplete={() => {}} /></DiyaProvider>)
    expect(screen.queryByText('Step 1 of 2')).toBe(null)
  })

  it('sets the Chatbot layout and shows timestamps only with showTimestamps', () => {
    const messages = [{ id: 'one', role: 'assistant' as const, text: 'Hello', timestamp: '09:30' }]
    const chat = (props: { layout?: 'embedded' | 'floating' | 'full-page'; showTimestamps?: boolean }) =>
      <DiyaProvider><Chatbot title="Help" messages={messages} value="" onValueChange={() => {}} onSend={() => {}} {...props} /></DiyaProvider>
    const view = render(chat({}))
    const surface = () => screen.getByRole('region', { name: 'Help' })
    expect(surface().getAttribute('data-presentation')).toBe('embedded')
    expect(screen.queryByText(/09:30/)).toBe(null)
    view.rerender(chat({ layout: 'full-page', showTimestamps: true }))
    expect(surface().getAttribute('data-presentation')).toBe('full-page')
    expect(screen.getByText(/09:30/)).toBeTruthy()
  })

  it('keeps one file by default and adds several with multiple', () => {
    const files = [new File(['a'], 'a.txt', { type: 'text/plain' }), new File(['b'], 'b.txt', { type: 'text/plain' })]
    const changes = vi.fn()
    const pick = (container: HTMLElement) => {
      const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
      fireEvent.change(input, { target: { files } })
      return input
    }
    const single = render(<DiyaProvider><FileUpload files={[]} onFilesChange={changes} /></DiyaProvider>)
    expect(pick(single.container).multiple).toBe(false)
    expect(changes).toHaveBeenLastCalledWith([files[0]])
    single.unmount()
    const several = render(<DiyaProvider><FileUpload multiple files={[]} onFilesChange={changes} /></DiyaProvider>)
    expect(pick(several.container).multiple).toBe(true)
    expect(changes).toHaveBeenLastCalledWith(files)
  })
})

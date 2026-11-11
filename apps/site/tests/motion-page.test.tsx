import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AppearanceProvider } from '../app/Appearance'
import { CatalogProvider } from '../components/CatalogProvider'
import { CatalogSearchProvider } from '../components/CatalogSearchProvider'
import { MotionPage } from '../components/catalog/MotionPage'

// The package's own api.json, as the site ships it.
const api = JSON.parse(readFileSync(join(process.cwd(), 'node_modules/@idyeah/diya/dist/api.json'), 'utf8')) as { tokens: Record<string, { group?: string }> }

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

function page() {
  return render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <CatalogProvider>
        <CatalogSearchProvider>
          <MotionPage />
        </CatalogSearchProvider>
      </CatalogProvider>
    </AppearanceProvider>
  )
}

const publicMotionTokens = Object.entries(api.tokens)
  .filter(([, token]) => token.group === 'motion')
  .map(([name]) => name)
  .sort()

describe('the Motion page', () => {
  it('names only the public motion tokens, all seven, and never an internal one', () => {
    const { container } = page()
    expect(publicMotionTokens).toHaveLength(7)
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/--diya-internal|--diya-motion-|proposed|Decision/)
    const listed = [...container.querySelectorAll('.motion-tokens dt code')].map((code) => code.textContent).sort()
    expect(listed).toEqual(publicMotionTokens)
    // Every token the page names, in its code and in the lanes.
    const named = new Set([...container.querySelectorAll('code, pre')].flatMap((code) => code.textContent?.match(/--diya-[a-z-]+/g) ?? []))
    expect(named.size).toBe(7)
    for (const token of named) expect(publicMotionTokens).toContain(token)
  })

  it('is a catalog page with its own foot entry marked current', () => {
    page()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Motion')
    const foot = screen.getByRole('list', { name: 'More from DIYA' })
    const entry = within(foot).getByRole('link', { name: 'Motion' })
    expect(entry.getAttribute('href')).toBe('/explore?area=motion')
    expect(entry.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('navigation', { name: 'Choose a component' }).querySelector('[aria-current]')).toBeNull()
  })

  it('gives the README’s setup steps as copyable code', () => {
    page()
    for (const name of ['default provider', 'provider with motion off', 'provider with reduced motion', 'nested provider', 'duration scale', 'test render', 'install command for 1.0'])
      screen.getByRole('button', { name: new RegExp(`Copy ${name}`) })
    const text = document.body.textContent ?? ''
    expect(text).toContain('<DiyaProvider motion="off">')
    expect(text).toContain('.diya-root { --diya-duration-scale: 0.5; }')
    expect(text).toContain('npm install @idyeah/diya@~1.0.1')
  })

  it('runs the lanes on the provider: Motion is its `motion` prop and Speed its duration scale', async () => {
    const user = userEvent.setup()
    const { container } = page()
    const scope = () => container.querySelector<HTMLElement>('.motion-scope')!
    expect(scope().dataset.motion).toBe('system')
    expect(scope().style.getPropertyValue('--diya-duration-scale')).toBe('1')
    await user.click(screen.getByRole('radio', { name: 'Reduced' }))
    expect(scope().dataset.motion).toBe('reduced')
    expect(container.querySelector<HTMLElement>('.motion-lanes')!.dataset.mode).toBe('reduced')
    await user.click(screen.getByRole('radio', { name: 'Off' }))
    expect(container.querySelector<HTMLElement>('.motion-lanes')!.dataset.mode).toBe('off')
    await user.click(screen.getByRole('radio', { name: '0.1×' }))
    expect(scope().style.getPropertyValue('--diya-duration-scale')).toBe('10')
    await user.click(screen.getByRole('button', { name: 'Play' }))
    expect(container.querySelector('.motion-lanes')!.hasAttribute('data-played')).toBe(true)
  })
})

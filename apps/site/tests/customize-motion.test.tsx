// Customize's Motion row: it sets the preview's motion, and Get code and Get theme carry it,
// only when it isn't "Match device".
import { useState, type ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, DiyaProvider } from '@idyeah/diya'
import { Appearance, AppearanceProvider } from '../app/Appearance'
import { ButtonLibrary } from '../components/ButtonLibrary'
import { CatalogProvider } from '../components/CatalogProvider'
import { GetCodeDrawer } from '../components/GetCodeDrawer'
import { providerProps } from '../lib/customize/theme'
import { effectiveAppearance } from '../lib/customize/appearance'
import { getSnapshot, resetStoreForTests, setBrandValue } from '../lib/customize/store'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

beforeEach(() => {
  window.localStorage.clear()
  resetStoreForTests()
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList)
  const dialog = Object.getPrototypeOf(document.createElement('dialog'))
  vi.spyOn(dialog, 'showModal').mockImplementation(function (this: HTMLDialogElement) { this.open = true })
  vi.spyOn(dialog, 'close').mockImplementation(function (this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  })
})

function Catalog() {
  return (
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <header className="site-header"><Appearance /></header>
      <CatalogProvider><ButtonLibrary /></CatalogProvider>
    </AppearanceProvider>
  )
}
function GetCode() {
  const [open, setOpen] = useState(false)
  return <DiyaProvider><Button onClick={() => setOpen(true)}>Open</Button><GetCodeDrawer id="button" open={open} onOpenChange={setOpen} /></DiyaProvider>
}
const states = [
  { choice: 'Match device', motion: 'system', prop: null, hint: 'Your theme follows the device’s setting.' },
  { choice: 'Reduced', motion: 'reduced', prop: 'motion="reduced"', hint: 'Your theme sets motion="reduced": fades, nothing slides.' },
  { choice: 'Off', motion: 'off', prop: 'motion="off"', hint: 'Your theme turns motion off with motion="off".' },
] as const

describe('Customize Motion', () => {
  it('sets the preview\'s motion from the Finish section, and says where to see it', async () => {
    const user = userEvent.setup()
    render(<Catalog />)
    await user.click(screen.getByRole('button', { name: /^Customiz/ }))
    const panel = screen.getByRole('complementary', { name: 'Customize Your brand' })
    const preview = () => document.querySelector('.customize-scope--button')!
    for (const { choice, motion, hint } of [...states].reverse()) {
      await user.click(within(panel).getByRole('radio', { name: choice }))
      expect(effectiveAppearance(getSnapshot().brand).motion).toBe(motion)
      // "Match device" leaves the preview following the device, as the rest of the catalog does.
      expect(preview().getAttribute('data-motion')).toBe(motion)
      expect(within(panel).getByTestId('customize-motion-hint').textContent).toBe(`${hint} Open a menu or switch tabs in the preview to see it.`)
    }
  })

  for (const { choice, motion, prop } of states) {
    it(`${choice}: Get theme ${prop ? `adds ${prop}` : 'adds nothing'}`, async () => {
      if (motion !== 'system') setBrandValue('motion', motion)
      setBrandValue('colors.light.accent', '#8A3D1F')
      setBrandValue('colors.dark.accent', '#F0B48A')
      const props = providerProps(effectiveAppearance(getSnapshot().brand))
      expect(props.filter((p) => p.name === 'motion').map((p) => p.jsx)).toEqual(prop ? [prop] : [])
      const user = userEvent.setup()
      render(<Catalog />)
      await user.click(screen.getByRole('button', { name: /^Customiz/ }))
      await user.click(within(screen.getByRole('complementary', { name: 'Customize Your brand' })).getByRole('button', { name: 'Get theme' }))
      const drawer = await screen.findByRole('dialog', { name: 'Get theme' })
      expect(within(drawer).getByRole('textbox', { name: 'Provider props' }).textContent).toBe(
        `<DiyaProvider\n  brandColor={{ light: '#8A3D1F', dark: '#F0B48A' }}${prop ? `\n  ${prop}` : ''}\n>`,
      )
      expect(within(drawer).getByText('Motion').nextElementSibling!.textContent).toBe(choice)
    })

    it(`${choice}: Get code ${prop ? `adds ${prop}` : 'adds nothing'}`, async () => {
      if (motion !== 'system') setBrandValue('motion', motion)
      const user = userEvent.setup()
      render(<GetCode />)
      await user.click(screen.getByRole('button', { name: 'Open' }))
      const drawer = await screen.findByRole('dialog', { name: 'Get code' })
      await waitFor(() => expect(within(drawer).getByRole('textbox', { name: 'Styles and provider' }).textContent).toBe(
        `import '@idyeah/diya/styles.css'\nimport { DiyaProvider } from '@idyeah/diya'\n\n<DiyaProvider theme="light"${prop ? ` ${prop}` : ''}>\n  {children}\n</DiyaProvider>`,
      ))
    })
  }
})

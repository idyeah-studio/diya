import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps, ComponentType } from 'react'
import { AppearanceProvider } from '../app/Appearance'
import { CatalogProvider } from '../components/CatalogProvider'
import { DataVizLibrary } from '../components/DataVizLibrary'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

// Hold the real loading boundary open; production browser checks cover chunk delivery.
vi.mock('next/dynamic', () => ({
  default: (_load: unknown, options: { loading: ComponentType }) => options.loading,
}))

function renderLoadingChart() {
  render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <CatalogProvider><DataVizLibrary /></CatalogProvider>
    </AppearanceProvider>
  )
  return within(screen.getByRole('region', { name: 'Data Viz playground' }))
}

describe('Data Viz while its chart engine loads', () => {
  it('provides one loading announcement and prevents premature data-table interaction', () => {
    const preview = renderLoadingChart()
    expect(preview.getAllByRole('status')).toHaveLength(1)
    expect(preview.getByRole('status').textContent).toBe('Loading chart…')
    expect(preview.getByRole('heading', { name: 'Acquisition overview' })).toBeTruthy()
    expect(preview.getByRole('button', { name: 'Show data table' }).hasAttribute('disabled')).toBe(true)
  })

  it('keeps loading content coherent when type and visibility controls change', async () => {
    const user = userEvent.setup()
    const preview = renderLoadingChart()
    await user.selectOptions(preview.getByRole('combobox', { name: 'Type' }), 'Treemap')
    expect(preview.getByRole('heading', { name: 'Resource allocation' })).toBeTruthy()
    expect(preview.getByText('Total allocation')).toBeTruthy()
    await user.click(preview.getByRole('checkbox', { name: 'Header' }))
    expect(preview.queryByRole('heading', { name: 'Resource allocation' })).toBeNull()
    await user.click(preview.getByRole('checkbox', { name: 'Metric' }))
    expect(preview.queryByText('Total allocation')).toBeNull()
    await user.click(preview.getByRole('checkbox', { name: 'Footer' }))
    expect(preview.queryByRole('button', { name: 'Show data table' })).toBeNull()
    expect(preview.getAllByRole('status')).toHaveLength(1)
  })
})

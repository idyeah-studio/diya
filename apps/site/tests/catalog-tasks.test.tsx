import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps, ReactNode } from 'react'
import { AppearanceProvider } from '../app/Appearance'
import { CatalogProvider } from '../components/CatalogProvider'
import { WorkflowPreview } from '../components/WorkflowPreview'
import { ApplicationPreview } from '../components/ApplicationPreview'
import { CollectionsLibrary } from '../components/CollectionsLibrary'
import { AlertLibrary } from '../components/AlertLibrary'
import { CardLibrary } from '../components/CardLibrary'
import { PageHeaderLibrary } from '../components/PageHeaderLibrary'
import { TableLibrary } from '../components/TableLibrary'
import { UtilityLibrary } from '../components/UtilityLibrary'
import { DataAtomsLibrary } from '../components/DataAtomsLibrary'
import { TabsLibrary } from '../components/TabsLibrary'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))
vi.mock('../components/LibraryDownload', () => ({ LibraryDownload: () => null }))

beforeEach(() => {
  const dialog = Object.getPrototypeOf(document.createElement('dialog'))
  vi.spyOn(dialog, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
    this.open = true
    this.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  })
  vi.spyOn(dialog, 'close').mockImplementation(function (this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  })
})
function renderCatalog(children: ReactNode) {
  return render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <CatalogProvider>{children}</CatalogProvider>
    </AppearanceProvider>
  )
}
const workflow = {
  multiple: true,
  helper: true,
  secondary: true,
  extended: true,
  orientation: 'Horizontal',
  showStepCount: true,
  side: 'Right',
  description: true,
  footer: true,
  state: 'Empty',
  action: true,
} as const
const application = {
  layout: 'Embedded',
  suggestions: true,
  showTimestamps: true,
  collapsed: false,
  groups: true,
} as const

async function createProject(user: ReturnType<typeof userEvent.setup>, name = 'Team launch') {
  await user.type(screen.getByRole('textbox', { name: 'Project name' }), name)
  await user.type(screen.getByRole('textbox', { name: 'Owner email' }), 'alex@example.com')
}
async function closeDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close dialog' }))
}

describe('complete catalog workflow examples', () => {
  it('validates, creates a real local record, and clears submitted form fields', async () => {
    const user = userEvent.setup()
    renderCatalog(<WorkflowPreview {...workflow} pattern="form" />)
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(screen.getByText('Enter a project name.')).toBeDefined()
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Project name' }))
    await createProject(user)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Priority' }), 'high')
    await user.click(screen.getByRole('combobox', { name: 'Team' }))
    await user.click(screen.getByRole('option', { name: 'Engineering' }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: /Due date/ }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'Confirm the launch scope.'
    )
    await user.click(screen.getByRole('switch', { name: 'Project updates' }))
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(
      within(screen.getByRole('list', { name: 'Created projects' })).getByText('Team launch')
    ).toBeDefined()
    expect((screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement).value).toBe(
      ''
    )
    expect((screen.getByRole('textbox', { name: 'Owner email' }) as HTMLInputElement).value).toBe(
      ''
    )
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(
      within(screen.getByRole('list', { name: 'Created projects' })).getAllByRole('listitem')
    ).toHaveLength(1)
    await user.click(
      within(screen.getByRole('list', { name: 'Created projects' })).getByRole('button', {
        name: /Team launch/,
      })
    )
    const saved = screen.getByRole('dialog', { name: 'Team launch' })
    expect(saved.textContent).toContain('High')
    expect(saved.textContent).toContain('Engineering')
    expect(saved.textContent).toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(saved.textContent).toContain('Confirm the launch scope.')
    expect(saved.textContent).toContain('Project updatesOff')
  })
  it('creates from the empty state, and resets to the original example', async () => {
    const user = userEvent.setup()
    renderCatalog(<WorkflowPreview {...workflow} pattern="empty-state" />)
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Project name' }))
    await createProject(user)
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(document.activeElement).toBe(
      screen.getByRole('region', { name: 'Project recovery results' })
    )
    expect(
      within(screen.getByRole('list', { name: 'Projects' })).getByText('Team launch')
    ).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Reset example' }))
    expect(screen.getByRole('heading', { name: 'No projects yet' })).toBeDefined()
  })
  it.each([
    ['No results', 'Clear filters'],
    ['Error', 'Try again'],
  ])('recovers %s into visible sample records', async (state, label) => {
    const user = userEvent.setup()
    renderCatalog(<WorkflowPreview {...workflow} state={state} pattern="empty-state" />)
    await user.click(screen.getByRole('button', { name: label }))
    expect(
      within(screen.getByRole('list', { name: 'Projects' })).getAllByRole('listitem')
    ).toHaveLength(3)
    expect(screen.queryByRole('button', { name: label })).toBeNull()
  })
  it('reviews all chosen Wizard preferences before creating and can start again', async () => {
    const user = userEvent.setup()
    renderCatalog(<WorkflowPreview {...workflow} pattern="wizard" />)
    await createProject(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Priority' }), 'high')
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'Confirm the launch scope.'
    )
    await user.click(screen.getByRole('switch', { name: 'Project updates' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    const review = screen.getByRole('region', { name: 'Create project' })
    expect(review.textContent).toContain('High')
    expect(review.textContent).toContain('Confirm the launch scope.')
    expect(review.textContent).toContain('Project updatesOff')
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(screen.getByRole('heading', { name: 'Project created' })).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Create another' }))
    expect((screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement).value).toBe(
      ''
    )
  })
  it.each([true, false])(
    'discards cancelled Drawer edits and retains save with Footer=%s',
    async (footer) => {
      const user = userEvent.setup()
      renderCatalog(<WorkflowPreview {...workflow} pattern="drawer" footer={footer} />)
      await user.click(screen.getByRole('button', { name: 'Open drawer' }))
      expect(screen.queryByRole('group', { name: 'Project actions' }) !== null).toBe(!footer)
      const field = screen.getByRole('textbox', { name: 'Project name' })
      await user.clear(field)
      await user.type(field, 'Discard this')
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      await user.click(screen.getByRole('button', { name: 'Open drawer' }))
      expect(
        (screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement).value
      ).toBe('Veylo launch')
      await user.clear(screen.getByRole('textbox', { name: 'Project name' }))
      await user.type(screen.getByRole('textbox', { name: 'Project name' }), 'Saved launch')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await user.click(screen.getByRole('button', { name: 'Open drawer' }))
      expect(
        (screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement).value
      ).toBe('Saved launch')
    }
  )
})

describe('truthful tabbed content', () => {
  it('uses actual content counts and opens file details', async () => {
    const user = userEvent.setup()
    renderCatalog(<TabsLibrary />)
    await user.click(screen.getByRole('radio', { name: 'Count' }))
    expect(
      within(screen.getByRole('list', { name: 'Project milestones' })).getAllByRole('listitem')
    ).toHaveLength(3)
    expect(screen.getByRole('tab', { name: /Overview.*3 milestones/ })).toBeDefined()
    await user.click(screen.getByRole('tab', { name: /Activity/ }))
    expect(
      within(screen.getByRole('list', { name: 'Project activity' })).getAllByRole('listitem')
    ).toHaveLength(2)
    await user.click(screen.getByRole('tab', { name: /Files/ }))
    expect(
      within(screen.getByRole('list', { name: 'Project files' })).getAllByRole('listitem')
    ).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: /Project brief/ }))
    expect(screen.getByRole('dialog', { name: 'Project brief' }).textContent).toContain(
      'Alex Morgan'
    )
  })
})

describe('meaningful component actions', () => {
  it('opens useful List document details', async () => {
    const user = userEvent.setup()
    renderCatalog(<CollectionsLibrary component="list" />)
    await user.click(screen.getByRole('button', { name: /Project brief/ }))
    expect(screen.getByRole('dialog', { name: 'Project brief' }).textContent).toContain(
      'Alex Morgan'
    )
  })
  it('renames with validation, duplicates, and deletes a selected local project', async () => {
    const user = userEvent.setup()
    renderCatalog(<CollectionsLibrary component="menu" />)
    await user.click(screen.getByRole('button', { name: 'Project actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }))
    const name = screen.getByRole('textbox', { name: 'Project name' })
    await user.clear(name)
    await user.click(screen.getByRole('button', { name: 'Save name' }))
    expect(screen.getByText('Enter a project name.')).toBeDefined()
    await user.type(name, 'Avyra')
    await user.click(screen.getByRole('button', { name: 'Save name' }))
    expect(screen.getByText('Use a different project name.')).toBeDefined()
    await user.clear(name)
    await user.type(name, 'Veylo launch')
    await user.click(screen.getByRole('button', { name: 'Save name' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(
      within(screen.getByRole('table', { name: 'Sample projects' })).getByText('Veylo launch')
    ).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Project actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate' }))
    expect(
      (screen.getByRole('combobox', { name: 'Project' }) as HTMLSelectElement).selectedOptions[0]
        .textContent
    ).toBe('Veylo launch copy')
    await user.click(screen.getByRole('checkbox', { name: 'Destructive' }))
    await user.click(screen.getByRole('button', { name: 'Project actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete project' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete project' })
    )
    expect(
      within(screen.getByRole('table', { name: 'Sample projects' })).queryByText(
        'Veylo launch copy'
      )
    ).toBeNull()
  })
  it('recovers after deleting every sample project', async () => {
    const user = userEvent.setup()
    renderCatalog(<CollectionsLibrary component="menu" />)
    await user.click(screen.getByRole('checkbox', { name: 'Destructive' }))
    for (let index = 0; index < 3; index++) {
      await user.click(screen.getByRole('button', { name: 'Project actions' }))
      await user.click(screen.getByRole('menuitem', { name: 'Delete project' }))
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete project' })
      )
    }
    expect(screen.getByRole('heading', { name: 'No projects left' })).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Restore projects' }))
    expect(
      within(screen.getByRole('table', { name: 'Sample projects' })).getAllByRole('row')
    ).toHaveLength(4)
  })
  it('copies an actual local project URL and executes the displayed shortcut', async () => {
    const user = userEvent.setup()
    const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderCatalog(<CollectionsLibrary component="menu" />)
    await user.click(screen.getByRole('checkbox', { name: 'Shortcuts' }))
    await user.click(screen.getByRole('button', { name: 'Project actions' }))
    await user.keyboard('{Alt>}{Shift>}l{/Shift}{/Alt}')
    expect(copy).toHaveBeenCalledWith(expect.stringContaining('#project-nuvio'))
    expect(screen.getByText('Local project link copied.')).toBeDefined()
  })
  it('sorts real rows and changes visible Table columns without removing the last column', async () => {
    const user = userEvent.setup()
    renderCatalog(<CollectionsLibrary component="menu" />)
    await user.click(screen.getByRole('radio', { name: 'Single' }))
    await user.click(screen.getByRole('button', { name: 'Sort by' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Updated' }))
    const table = screen.getByRole('table', { name: 'Sample projects' })
    expect(within(table).getAllByRole('row')[1].textContent).toContain('Avyra')
    await user.click(screen.getByRole('radio', { name: 'Multiple' }))
    await user.click(screen.getByRole('button', { name: 'Visible columns' }))
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Status' }))
    expect(
      (screen.getByRole('menuitemcheckbox', { name: 'Name' }) as HTMLButtonElement).disabled
    ).toBe(true)
    expect(within(table).queryByRole('columnheader', { name: 'Status' })).toBeNull()
  })
  it('uses Popover preferences to change the visible content and density', async () => {
    const user = userEvent.setup()
    renderCatalog(<CollectionsLibrary component="popover" />)
    await user.click(screen.getByRole('button', { name: 'Display preferences' }))
    await user.click(screen.getByRole('switch', { name: 'Notifications' }))
    await user.click(screen.getByRole('switch', { name: 'Compact view' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    const list = screen.getByRole('list', { name: 'Notification preferences' })
    expect(list.textContent).toContain('Notification summaries are off.')
    expect(list.textContent).toContain('Compact rows')
    expect(list.getAttribute('data-size')).toBe('small')
  })
  it('opens real Alert details and resolves an Error into a reviewable brief', async () => {
    const user = userEvent.setup()
    renderCatalog(<AlertLibrary />)
    await user.click(screen.getByRole('checkbox', { name: 'Action' }))
    await user.click(screen.getByRole('button', { name: 'View updates' }))
    expect(screen.getByRole('dialog', { name: 'What’s new' }).textContent).toContain(
      'Display preferences'
    )
    await closeDialog(user)
    await user.click(screen.getByRole('radio', { name: 'Error' }))
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByRole('dialog', { name: 'Project brief' }).textContent).toContain(
      'Alex Morgan'
    )
    await closeDialog(user)
    expect(screen.getByText('Project brief ready')).toBeDefined()
    await user.click(screen.getByRole('radio', { name: 'Warning' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('Changes saved')).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'View project' }))
    expect(screen.getByRole('dialog', { name: 'Website launch' }).textContent).toContain(
      'Saved in this local preview.'
    )
  })
})

describe('coherent pattern navigation and details', () => {
  it('gives Link a real catalog destination', () => {
    renderCatalog(<DataAtomsLibrary component="link" />)
    expect(screen.getByRole('link', { name: 'Explore Text Input' }).getAttribute('href')).toBe(
      '/explore?area=components&component=text-input'
    )
  })
  it('keeps hidden-label metrics accessible by their names', async () => {
    const user = userEvent.setup()
    renderCatalog(<DataAtomsLibrary component="metric" />)
    await user.click(screen.getByRole('checkbox', { name: 'Label' }))
    expect(screen.getByRole('group', { name: 'Revenue' })).toBeDefined()
    expect(screen.queryByText('Revenue')).toBeNull()
  })
  it('opens breadcrumb destinations and restores the full path', async () => {
    const user = userEvent.setup()
    renderCatalog(<UtilityLibrary component="breadcrumbs" />)
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(
      within(screen.getByRole('region', { name: 'Breadcrumb destination' })).getByRole('heading', {
        name: 'Home',
      })
    ).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Projects' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Open Veylo settings' }))
    expect(
      within(screen.getByRole('region', { name: 'Breadcrumb destination' })).getByRole('heading', {
        name: 'Settings',
      })
    ).toBeDefined()
  })
  it('opens Card details and creates a selectable local copy', async () => {
    const user = userEvent.setup()
    renderCatalog(<CardLibrary />)
    await user.click(screen.getByRole('button', { name: 'View project' }))
    expect(screen.getByRole('dialog', { name: 'Website launch' }).textContent).toContain(
      'Alex Morgan'
    )
    await closeDialog(user)
    await user.click(screen.getByRole('button', { name: 'Card actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate project' }))
    const copies = screen.getByRole('list', { name: 'Project copies' })
    await user.click(within(copies).getByRole('button', { name: /Website launch · Copy 1/ }))
    expect(screen.getByRole('dialog', { name: 'Website launch · Copy 1' })).toBeDefined()
  })
  it('shares a copyable preview URL and opens Page Header resources', async () => {
    const user = userEvent.setup()
    const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderCatalog(<PageHeaderLibrary />)
    await user.click(screen.getByRole('button', { name: 'Share project' }))
    const link = screen.getByRole('textbox', { name: 'Preview link' }) as HTMLInputElement
    expect(link.readOnly).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(copy).toHaveBeenCalledWith(link.value)
    await closeDialog(user)
    await user.click(screen.getByRole('tab', { name: 'Files' }))
    await user.click(screen.getByRole('button', { name: /Project brief/ }))
    expect(screen.getByRole('dialog', { name: 'Project brief' }).textContent).toContain('Goal')
    await closeDialog(user)
    await user.click(screen.getByRole('link', { name: 'Projects' }))
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Projects directory' }))
    await user.click(
      within(screen.getByRole('list', { name: 'Projects' })).getByRole('button', {
        name: /Website launch/,
      })
    )
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Website launch' }))
    expect(screen.getByRole('tab', { name: 'Files' }).getAttribute('aria-selected')).toBe('true')
  })
  it('opens a real Table brief and restores archived sample records', async () => {
    const user = userEvent.setup()
    renderCatalog(<TableLibrary />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'Rich content')
    await user.click(screen.getByRole('button', { name: 'Website launch project brief' }))
    expect(
      screen.getByRole('dialog', { name: 'Website launch · Project brief' }).textContent
    ).toContain('Alex Morgan')
    await closeDialog(user)
    await user.click(screen.getByRole('button', { name: 'Actions for Website launch' }))
    await user.click(screen.getByRole('menuitem', { name: 'Archive' }))
    await user.click(screen.getByRole('button', { name: 'Restore sample projects' }))
    expect(screen.getByRole('button', { name: 'Website launch project brief' })).toBeDefined()
  })
  it('uses Side Navigation destinations for real local content and preferences', async () => {
    const user = userEvent.setup()
    renderCatalog(<ApplicationPreview {...application} pattern="side-navigation" />)
    await user.click(screen.getByRole('button', { name: /Nuvio/ }))
    expect(screen.getByRole('dialog', { name: 'Nuvio' }).textContent).toContain('Alex Morgan')
    await closeDialog(user)
    await user.click(screen.getByRole('button', { name: 'People' }))
    expect(
      within(screen.getByRole('list', { name: 'Workspace people' })).getAllByRole('listitem')
    ).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('switch', { name: 'Email notifications' }))
    expect(screen.getByRole('status').textContent).toContain('off')
    await user.click(screen.getByRole('button', { name: 'Support' }))
    await user.click(screen.getByRole('button', { name: 'Where are changes saved?' }))
    expect(screen.getByText(/No account or remote workspace is changed/)).toBeDefined()
  })
  it('labels scripted Chatbot replies and keeps attachment names in the local conversation', async () => {
    const user = userEvent.setup()
    renderCatalog(<ApplicationPreview {...application} pattern="chatbot" />)
    expect(screen.getByRole('status').textContent).toContain('No AI service is connected')
    await user.upload(
      screen.getByLabelText('Attach files'),
      new File(['brief'], 'brief.txt', { type: 'text/plain' })
    )
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Find a project file')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    const messages = screen.getByRole('log', { name: 'Project assistant messages' })
    expect(messages.textContent).toContain('Attached: brief.txt')
    expect(messages.textContent).toContain('Example reply: Nuvio has a project brief')
    expect(within(messages).getAllByRole('article')).toHaveLength(2)
    expect(within(messages).getAllByText(/ · \d/)).toHaveLength(2)
    expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement).value).toBe('')
  })
})

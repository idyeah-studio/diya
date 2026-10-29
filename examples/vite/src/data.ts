export const componentEntries = [
  ['button', 'Button'], ['text-input', 'Text Input'], ['text-area', 'Text Area'], ['select', 'Select'], ['date-picker', 'Date Picker'], ['combobox', 'Combobox'], ['choice', 'Choice'], ['switch', 'Switch'], ['slider', 'Slider'], ['search', 'Search'],
  ['link', 'Text Link'], ['pagination', 'Pagination'], ['tabs', 'Tabs'], ['breadcrumbs', 'Breadcrumbs'], ['menu', 'Menu'], ['tag', 'Tag'], ['metric', 'Metric'], ['avatar', 'Avatar'], ['list', 'List'], ['accordion', 'Accordion'], ['badge', 'Badge'], ['alert', 'Alert'], ['progress', 'Progress'], ['tooltip', 'Tooltip'], ['popover', 'Popover'],
] as const
export const patternEntries = [
  ['page-header', 'Page Header'], ['site-header', 'Site Header'], ['card', 'Card'], ['dialog', 'Dialog'], ['table', 'Table'], ['file-upload', 'File Upload'], ['form', 'Form'], ['wizard', 'Wizard'], ['drawer', 'Drawer'], ['empty-state', 'Content State'], ['side-navigation', 'Side Navigation'], ['chatbot', 'Chatbot'], ['data-viz', 'Data Viz'],
] as const
export type ComponentId = typeof componentEntries[number][0]
export type PatternId = typeof patternEntries[number][0]
export type ExampleId = ComponentId | PatternId

export const teamOptions = [
  { value: 'design', label: 'Design' }, { value: 'engineering', label: 'Engineering' }, { value: 'product', label: 'Product' }, { value: 'marketing', label: 'Marketing' }, { value: 'archived', label: 'Archived team', disabled: true },
]
export const priorityOptions = [{ value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]
export type Project = { id: string; name: string; owner: string; status: 'In progress' | 'In review' | 'Complete'; tasks: number }
export const initialProjects: Project[] = [
  { id: 'launch', name: 'Website launch', owner: 'Morgan Lee', status: 'In progress', tasks: 12 },
  { id: 'onboarding', name: 'Mobile onboarding', owner: 'Sam River', status: 'In review', tasks: 8 },
  { id: 'system', name: 'Design system', owner: 'Jordan Vale', status: 'Complete', tasks: 24 },
  { id: 'research', name: 'Customer research', owner: 'Morgan Lee', status: 'In progress', tasks: 6 },
  { id: 'docs', name: 'Product documentation', owner: 'Jordan Vale', status: 'In review', tasks: 9 },
  { id: 'navigation', name: 'Navigation update', owner: 'Sam River', status: 'Complete', tasks: 7 },
  { id: 'settings', name: 'Workspace settings', owner: 'Jordan Vale', status: 'In progress', tasks: 5 },
]
export const chartCategories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
export const chartSeries = [
  { name: 'Direct', values: [120, 156, 142, 210, 192, 258] },
  { name: 'Organic', values: [86, 110, 124, 148, 173, 198] },
  { name: 'Referral', values: [42, 55, 63, 77, 90, 102] },
  { name: 'Social', values: [65, 82, 71, 96, 112, 134] },
  { name: 'Email', values: [32, 46, 39, 58, 65, 81] },
  { name: 'Paid', values: [94, 115, 108, 138, 156, 184] },
]

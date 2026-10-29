import { componentIds, patternIds } from '../catalog-route'

export type ItemId = (typeof componentIds)[number] | (typeof patternIds)[number]
type ColorRole = 'accent' | 'raised' | 'lines'

export type CustomizeItem = {
  id: ItemId
  title: string
  kind: 'component' | 'pattern'
  /** What Text means here; Background always means "behind it". */
  text: string
  /** Optional roles this item actually uses, with what each colours here. `accent` is the brand colour. */
  roles: Partial<Record<ColorRole, string>>
  /** Which status colours this item shows, if any. */
  status?: string
  /** A sentence for anything a customization can't reach on this item. */
  note?: string
}

/*
 * Roles come from the tokens each component's CSS reads, checked selector
 * by selector against packages/diya/src/styles.css (2026-10-17):
 * a role is listed only where changing it visibly changes the component,
 * not where it only draws a focus ring or is overridden later. The brand
 * (accent) reaches everything through DiyaProvider's brandColor, including
 * brand-tone Badge, Tag and Alert. Patterns list the roles of the surfaces
 * and components they are built from.
 */
const items: CustomizeItem[] = [
  { id: 'button', title: 'Button', kind: 'component', text: 'Labels and icons on outline and quiet buttons', roles: { accent: 'Fill of solid buttons', lines: 'Edge of outline buttons' } },
  { id: 'text-input', title: 'Text Input', kind: 'component', text: 'Labels, typed text and field edges', roles: {} },
  { id: 'text-area', title: 'Text Area', kind: 'component', text: 'Labels, typed text and field edges', roles: {} },
  { id: 'select', title: 'Select', kind: 'component', text: 'Label, chosen option and field edge', roles: {} },
  { id: 'date-picker', title: 'Date Picker', kind: 'component', text: 'Label, dates and field edge', roles: { accent: 'Selected day', raised: 'Calendar panel', lines: 'Calendar edge' }, status: 'Error: invalid date' },
  { id: 'combobox', title: 'Combobox', kind: 'component', text: 'Label, typed text and field edge', roles: { raised: 'Option list', lines: 'Option list edge' }, status: 'Error: invalid entry' },
  { id: 'choice', title: 'Choice', kind: 'component', text: 'Option labels and unchecked boxes', roles: { accent: 'Checked boxes and radios' } },
  { id: 'switch', title: 'Switch', kind: 'component', text: 'Label', roles: { accent: 'Track when on', lines: 'Edge of the track' } },
  { id: 'slider', title: 'Slider', kind: 'component', text: 'Label and value', roles: { accent: 'Filled part of the track and the handle', lines: 'Tick marks and the handle’s edge' } },
  { id: 'search', title: 'Search', kind: 'component', text: 'Query, icon and field edge', roles: {} },
  { id: 'link', title: 'Text Link', kind: 'component', text: 'Link text and underline', roles: {} },
  { id: 'pagination', title: 'Pagination', kind: 'component', text: 'Page numbers and arrows', roles: {} },
  { id: 'tabs', title: 'Tabs', kind: 'component', text: 'Tab labels', roles: { accent: 'Selected pill tab', raised: 'Track behind pill tabs, in glass', lines: 'Line under underline tabs' } },
  { id: 'breadcrumbs', title: 'Breadcrumbs', kind: 'component', text: 'Path and separators', roles: {} },
  { id: 'menu', title: 'Menu', kind: 'component', text: 'Menu items', roles: { raised: 'Menu panel', lines: 'Panel edge and dividers' } },
  { id: 'tag', title: 'Tag', kind: 'component', text: 'Neutral tags', roles: { accent: 'Brand tags, as a soft tint' }, status: 'Success, warning, error and info tags' },
  { id: 'metric', title: 'Metric', kind: 'component', text: 'Label and value', roles: {}, status: 'Rises (success) and falls (error)' },
  { id: 'rating', title: 'Rating', kind: 'component', text: 'Stars, number and review count', roles: {} },
  { id: 'avatar', title: 'Avatar', kind: 'component', text: 'Initials', roles: {}, status: 'Presence dot' },
  { id: 'list', title: 'List', kind: 'component', text: 'Row text', roles: { lines: 'Dividers between rows' } },
  { id: 'accordion', title: 'Accordion', kind: 'component', text: 'Headings and content', roles: { lines: 'Dividers between sections' } },
  { id: 'badge', title: 'Badge', kind: 'component', text: 'Neutral badges', roles: { accent: 'Brand badges' }, status: 'Success, warning, error and info badges' },
  { id: 'alert', title: 'Alert', kind: 'component', text: 'Message text', roles: { accent: 'Brand alerts' }, status: 'Info, success, warning and error alerts' },
  { id: 'progress', title: 'Progress', kind: 'component', text: 'Label and percentage', roles: { accent: 'Completed part' } },
  { id: 'tooltip', title: 'Tooltip', kind: 'component', text: 'The element it describes', roles: { accent: 'Tooltip bubble', lines: 'Edge of the trigger' } },
  { id: 'popover', title: 'Popover', kind: 'component', text: 'Popover content', roles: { raised: 'Popover panel', lines: 'Panel edge' } },
  { id: 'page-header', title: 'Page Header', kind: 'pattern', text: 'Title, description, breadcrumbs and edges', roles: { accent: 'Primary action', raised: 'Header surface' } },
  { id: 'site-header', title: 'Site Header', kind: 'pattern', text: 'Brand and navigation links', roles: { accent: 'Primary action', raised: 'Header bar', lines: 'Header edge' } },
  { id: 'side-navigation', title: 'Side Navigation', kind: 'pattern', text: 'Navigation items and the selected item', roles: { lines: 'Panel edge' } },
  { id: 'card', title: 'Card', kind: 'pattern', text: 'Title, body and the card’s edge', roles: { accent: 'Primary action', raised: 'Card surface' } },
  { id: 'table', title: 'Table', kind: 'pattern', text: 'Headers and cells', roles: { accent: 'Primary actions and selection', raised: 'Table surface', lines: 'Row dividers' }, status: 'Status cells' },
  { id: 'data-viz', title: 'Data Viz', kind: 'pattern', text: 'Titles and figures', roles: { accent: 'The first chart series, when the brand has color', raised: 'Chart cards' }, note: 'With a neutral brand, charts use DIYA’s Vivid palette; axis labels and tooltips keep DIYA’s chart styling.' },
  { id: 'form', title: 'Form', kind: 'pattern', text: 'Labels, fields and help text', roles: { accent: 'Submit button' } },
  { id: 'wizard', title: 'Wizard', kind: 'pattern', text: 'Step names and content', roles: { accent: 'Current step and progress', raised: 'Wizard surface' } },
  { id: 'file-upload', title: 'File Upload', kind: 'pattern', text: 'Instructions and file names', roles: { accent: 'Browse button', lines: 'Drop zone edge' } },
  { id: 'chatbot', title: 'Chatbot', kind: 'pattern', text: 'Messages and your own message bubbles', roles: { accent: 'Send button' } },
  { id: 'dialog', title: 'Dialog', kind: 'pattern', text: 'Title and message', roles: { accent: 'Confirm button', raised: 'Dialog surface' } },
  { id: 'drawer', title: 'Drawer', kind: 'pattern', text: 'Title and content', roles: { accent: 'Primary action', raised: 'Drawer surface' } },
  { id: 'empty-state', title: 'Content State', kind: 'pattern', text: 'Heading and explanation', roles: { accent: 'Recovery action' } },
]

export const customizeItems: Readonly<Record<ItemId, CustomizeItem>> = Object.freeze(
  Object.fromEntries(items.map((item) => [item.id, item])) as Record<ItemId, CustomizeItem>,
)

export function isItemId(value: unknown): value is ItemId {
  return typeof value === 'string' && Object.hasOwn(customizeItems, value)
}

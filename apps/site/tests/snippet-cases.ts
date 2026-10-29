import type { Playground } from '../components/code/playground'
import { snippetFor, type Snippet } from '../components/code/snippets'
import { componentIds, patternIds } from '../lib/catalog-route'
import type { ItemId } from '../lib/customize/registry'

export const ids: ItemId[] = [...componentIds, ...patternIds]

/** Non-default playgrounds per item, chosen to reach every branch that changes the code. */
export const variants: Record<ItemId, { playground: Playground; options?: Record<string, string | boolean> }[]> = {
  button: [
    { playground: { Type: 'Icon', Size: 'Large', Icon: [], State: 'Loading' }, options: { shape: 'rounded' } },
    { playground: { Type: 'Normal', Size: 'Small', Icon: ['Leading', 'Trailing'], State: 'Disabled' } },
  ],
  'text-input': [
    { playground: { Size: 'Large', Options: ['Leading icon', 'Clear action'], State: 'Error' } },
    { playground: { Options: ['Label', 'Helper text'], State: 'Read-only' } },
  ],
  'text-area': [{ playground: { Size: 'Small', Options: ['Count', 'Helper text'], State: 'Disabled' } }],
  select: [{ playground: { Size: 'Small', Options: ['Leading icon'], State: 'Error' } }],
  'date-picker': [
    { playground: { Type: 'Range', Options: [], State: 'Error' } },
    { playground: { Size: 'Large', State: 'Disabled' } },
  ],
  combobox: [{ playground: { Type: 'Multiple', Options: ['Label'], State: 'Error', Size: 'Small' } }],
  choice: [
    { playground: { Type: 'Multiple', Size: 'Large', Options: ['Label', 'Descriptions', 'Select all', 'Helper text'], State: 'Error' } },
    { playground: { Options: ['Descriptions', 'Helper text'], State: 'Disabled' } },
  ],
  switch: [
    { playground: { Size: 'Small', Color: 'Brand', 'Brand color': '#ff5500', Options: ['Helper text'], State: 'Error' } },
    { playground: { Options: [], State: 'Disabled' } },
  ],
  slider: [
    { playground: { Type: 'Range', Step: '5', Options: ['Markers'], State: 'Disabled' } },
    { playground: { Step: '10', Options: ['Values', 'Markers'] } },
  ],
  search: [
    { playground: { Size: 'Large', Style: 'Pill', Options: ['Helper text'], State: 'Error' } },
    { playground: { Options: ['Label'], State: 'Read-only' } },
  ],
  link: [
    { playground: { Type: 'Inline', Options: ['Leading icon', 'Trailing icon'] } },
    { playground: { Options: ['Trailing icon'] } },
  ],
  pagination: [
    { playground: { Options: ['Page numbers'], State: 'Empty' } },
    { playground: { Options: [] } },
  ],
  tabs: [
    { playground: { Type: 'Pills', Size: 'Small', Icon: ['Leading'], Badge: 'Count', State: 'Disabled' } },
    { playground: { Badge: 'Indicator' } },
  ],
  breadcrumbs: [{ playground: { Options: ['Home icon', 'Collapse'] } }],
  menu: [
    { playground: { Type: 'Actions', Options: ['Shortcuts', 'Destructive'], State: 'Disabled' } },
    { playground: { Type: 'Single' } },
    { playground: { Type: 'Multiple', State: 'Disabled' } },
  ],
  tag: [
    { playground: { Size: 'Large', Color: 'Brand', 'Brand color': '#00aa88', Leading: 'Icon', Options: ['Removable'] } },
    { playground: { Color: 'Success', Leading: 'Dot' } },
  ],
  metric: [{ playground: { Size: 'Large', Options: [] } }],
  rating: [
    { playground: { Size: 'Large', Options: ['Number'] } },
    { playground: { Size: 'Small', Options: ['Number', 'Review count'] } },
  ],
  avatar: [{ playground: { Size: 'Small', Shape: 'Rounded', Status: 'Busy' } }],
  list: [
    { playground: { Size: 'Large', Leading: 'Avatar', Options: [], State: 'Disabled' } },
    { playground: { Leading: 'None', Options: ['Divider'] } },
    { playground: { Options: ['Description', 'Metadata', 'Current', 'Unread'] } },
  ],
  accordion: [{ playground: { Style: 'Plain', Expand: 'Multiple', State: 'Disabled' } }],
  badge: [
    { playground: { Variant: 'Count', Size: 'Large', Color: 'Error' } },
    { playground: { Color: 'Brand', 'Brand color': '#123456' } },
  ],
  alert: [
    { playground: { Type: 'Alert', Status: 'Warning', Options: ['Title', 'Action', 'Dismiss'] } },
    { playground: { Type: 'Toast', Status: 'Brand', 'Brand color': '#aa00ff', Options: ['Action'] } },
    { playground: { Type: 'Toast', Status: 'Error', Options: ['Dismiss'] } },
  ],
  progress: [
    { playground: { Type: 'Circular', Mode: 'Indeterminate', 'Progress value': '60', Options: ['Percentage'] } },
    { playground: { 'Progress value': '35', Options: [] } },
  ],
  tooltip: [{ playground: { Position: 'Left' } }],
  popover: [{ playground: { Position: 'Top', State: 'Disabled' } }],
  'page-header': [
    { playground: { Options: ['Description', 'Primary action'], Preview: 'Mobile' } },
    { playground: { Options: [] } },
  ],
  'site-header': [
    { playground: { Options: ['Search', 'Settings'] } },
    { playground: { Options: ['Navigation', 'Notifications', 'Support'] } },
    { playground: { Options: ['Notifications', 'Support', 'Avatar'] } },
    { playground: { Options: [] } },
  ],
  'side-navigation': [
    { playground: { Options: ['Collapsed'] } },
    { playground: { Options: ['Groups', 'Counts'] } },
  ],
  card: [
    { playground: { Options: ['Image', 'Shadow', 'Primary action'] } },
    { playground: { Options: ['Tag'] } },
  ],
  table: [
    { playground: { Type: 'Rich content', Density: 'Compact', Options: ['Search', 'Selection'] } },
    { playground: { Type: 'Sticky columns', Options: ['Actions', 'Pagination'] } },
    { playground: { Type: 'Loading', Options: ['Filters', 'Actions'] } },
    { playground: { Type: 'Empty', Options: [] } },
  ],
  'data-viz': [
    { playground: { Type: 'Bar', Variant: 'Stacked', Data: 'Dense', Options: ['Legend', 'Shadow'] } },
    { playground: { Type: 'Treemap', Variant: 'Standard', Options: ['Header', 'Footer'] } },
    { playground: { Type: 'Donut', Variant: 'Thin', Options: ['Metric', 'Period', 'Tooltip'] } },
    { playground: { Type: 'Combo', Variant: 'Standard' } },
  ],
  form: [
    { playground: { Options: ['Secondary action'] } },
    { playground: { Options: [] } },
  ],
  wizard: [{ playground: { Layout: 'Vertical', Options: [] } }],
  'file-upload': [{ playground: { Options: [] } }],
  chatbot: [
    { playground: { Type: 'Floating', Options: ['Timestamps'] } },
    { playground: { Type: 'Full-page' } },
  ],
  dialog: [{ playground: { Size: 'Large', Options: ['Divider'] } }],
  drawer: [{ playground: { Position: 'Left', Options: ['Description'] } }],
  'empty-state': [
    { playground: { Type: 'Error', Options: [] } },
    { playground: { Type: 'No results' } },
  ],
}

export type Case = { label: string; id: ItemId; snippet: Snippet }
export const cases: Case[] = ids.flatMap((id) => [
  { label: `${id} (default)`, id, snippet: snippetFor(id, {}) },
  ...variants[id].map((variant, index) => ({
    label: `${id} (variant ${index + 1})`,
    id,
    snippet: snippetFor(id, variant.playground, variant.options),
  })),
])


import { CATEGORIES, screens } from '../screens/screens-data'

/** Everything the catalog lists, in sidebar order. Search reads every area. */
export const componentGroups = [
  { title: 'Inputs', items: [
    { id: 'button', title: 'Button', keywords: 'action icon button' },
    { id: 'text-input', title: 'Text Input', keywords: 'field email password input textfield' },
    { id: 'text-area', title: 'Text Area', keywords: 'textarea multiline field' },
    { id: 'select', title: 'Select', keywords: 'dropdown combobox picker' },
    { id: 'date-picker', title: 'Date Picker', keywords: 'date calendar range' },
    { id: 'calendar', title: 'Calendar', keywords: 'date day month booking schedule agenda availability range' },
    { id: 'combobox', title: 'Combobox', keywords: 'search select multiple multiselect autocomplete typeahead tags' },
    { id: 'choice', title: 'Choice', keywords: 'radio checkbox single multiple' },
    { id: 'switch', title: 'Switch', keywords: 'toggle boolean on off' },
    { id: 'slider', title: 'Slider', keywords: 'range value volume' },
    { id: 'search', title: 'Search', keywords: 'find filter query' },
  ] },
  { title: 'Navigation', items: [
    { id: 'link', title: 'Text Link', keywords: 'anchor inline navigation' },
    { id: 'pagination', title: 'Pagination', keywords: 'page results paging' },
    { id: 'tabs', title: 'Tabs', keywords: 'pill underline tab' },
    { id: 'breadcrumbs', title: 'Breadcrumbs', keywords: 'path hierarchy breadcrumb' },
    { id: 'menu', title: 'Menu', keywords: 'dropdown actions context menu' },
  ] },
  { title: 'Content', items: [
    { id: 'tag', title: 'Tag', keywords: 'label chip removable' },
    { id: 'metric', title: 'Metric', keywords: 'number statistic trend delta value' },
    { id: 'rating', title: 'Rating', keywords: 'stars reviews score product feedback' },
    { id: 'avatar', title: 'Avatar', keywords: 'profile image initials user' },
    { id: 'list', title: 'List', keywords: 'rows items divider' },
    { id: 'accordion', title: 'Accordion', keywords: 'expand collapse disclosure faq' },
    { id: 'prose', title: 'Prose', keywords: 'article docs markdown typography blog changelog terms long-form text' },
    { id: 'code-block', title: 'Code Block', keywords: 'code snippet copy clipboard pre monospace' },
  ] },
  { title: 'Feedback', items: [
    { id: 'badge', title: 'Badge', keywords: 'indicator count status dot' },
    { id: 'alert', title: 'Alert', keywords: 'toast notification message status banner snackbar error warning success' },
    { id: 'progress', title: 'Progress', keywords: 'loading spinner percentage circular linear' },
  ] },
  { title: 'Overlays', items: [
    { id: 'tooltip', title: 'Tooltip', keywords: 'hint help hover' },
    { id: 'popover', title: 'Popover', keywords: 'floating panel popup' },
  ] },
] as const

export const patternGroups = [
  { title: 'Navigation', items: [
    { id: 'page-header', title: 'Page Header', keywords: 'title actions tabs breadcrumb' },
    { id: 'site-header', title: 'Site Header', keywords: 'navbar navigation menu brand' },
    { id: 'side-navigation', title: 'Side Navigation', keywords: 'sidebar menu collapsed groups' },
  ] },
  { title: 'Content & data', items: [
    { id: 'card', title: 'Card', keywords: 'content media image actions' },
    { id: 'table', title: 'Table', keywords: 'rows columns records sort filter search data grid' },
    { id: 'data-viz', title: 'Data Viz', keywords: 'dashboard charts graph pie donut treemap line area bar' },
  ] },
  { title: 'Workflows', items: [
    { id: 'form', title: 'Form', keywords: 'fields input validation submit project' },
    { id: 'wizard', title: 'Wizard', keywords: 'steps multi-step onboarding flow stepper progress' },
    { id: 'file-upload', title: 'File Upload', keywords: 'attachment files dropzone drag drop' },
    { id: 'chatbot', title: 'Chatbot', keywords: 'chat assistant conversation message ai' },
  ] },
  { title: 'Feedback & overlays', items: [
    { id: 'dialog', title: 'Dialog', keywords: 'modal confirmation alert overlay' },
    { id: 'drawer', title: 'Drawer', keywords: 'panel sheet overlay details' },
    { id: 'empty-state', title: 'Content State', keywords: 'no results missing unavailable feedback retry empty blank zero error offline loading skeleton 404' },
  ] },
] as const

/** Every screen, by category. Which of them a build lists is the sidebar's call (see CatalogSearchProvider). */
export const screenGroups = CATEGORIES.map((category) => ({
  title: category,
  items: screens
    .filter((screen) => screen.category === category)
    .map((screen) => ({ id: screen.id, title: screen.name, keywords: screen.keywords, soon: screen.status === 'poster' })),
}))

export type CatalogListArea = 'components' | 'patterns' | 'screens'
export type ComponentId = (typeof componentGroups)[number]['items'][number]['id']
export type PatternId = (typeof patternGroups)[number]['items'][number]['id']

type Group = { title: string; items: readonly { id: string; title: string; keywords: string; soon?: boolean }[] }

export const catalogGroups: Record<CatalogListArea, readonly Group[]> = {
  components: componentGroups,
  patterns: patternGroups,
  screens: screenGroups,
}

export function catalogHref(area: CatalogListArea, id: string) {
  if (area === 'screens') return `/explore?area=screens&screen=${id}`
  return area === 'components' ? `/explore?area=components&component=${id}` : `/explore?pattern=${id}`
}

/** Only the items in `ids`; groups left empty drop out. */
export function onlyItems(groups: readonly Group[], ids: ReadonlySet<string>) {
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => ids.has(item.id)) }))
    .filter((group) => group.items.length > 0)
}

/** Groups whose items match every word of `query`: title, keywords and, unless `byGroup` is false, the group's title. */
export function filterGroups(groups: readonly Group[], query: string, byGroup = true) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  // "datepicker" finds Date Picker and "multi step" finds multi-step: spaces and hyphens don't count.
  const flat = (text: string) => text.replace(/[\s-]+/g, '')
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const text = `${item.title} ${item.keywords} ${byGroup ? group.title : ''}`.toLowerCase()
        return terms.every((term) => text.includes(term) || flat(text).includes(flat(term)))
      }),
    }))
    .filter((group) => group.items.length > 0)
}

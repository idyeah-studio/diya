import type { ItemId } from '../../lib/customize/registry'

/**
 * Short, plain guidance under each playground and in the AI channel: when
 * to reach for an item, when something else fits better, and what DIYA
 * already does for accessibility (and what is left to you).
 */
export type Guidance = { use: string; instead?: string; access: string }

export const guidance: Record<ItemId, Guidance> = {
  button: {
    use: 'For an action on this page: save, send, open a dialog. One solid button per area marks the main action; outline and quiet ones sit beside it.',
    instead: 'Going to another page? Use Text Link, or a Button with href.',
    access: 'A native button, so Enter and Space work. An icon-only button needs an aria-label. Loading sets aria-busy and keeps the label for screen readers.',
  },
  'text-input': {
    use: 'For one line of free text: a name, an email, a URL.',
    instead: 'Several lines? Text Area. A fixed set of answers? Select or Choice.',
    access: 'The label is always tied to the field, even when hidden. Helper text and errors are announced with it, and an error sets aria-invalid.',
  },
  'text-area': {
    use: 'For longer text: a description, a note, a message.',
    instead: 'One short line? Text Input.',
    access: 'Labelled like Text Input. The character count is part of the field’s description, so it is read with the field.',
  },
  select: {
    use: 'For one choice from a list of about five to fifteen known options.',
    instead: 'Two to four options? Choice shows them all at once. A long list people search? Combobox.',
    access: 'A native select, so every platform’s own keyboard and screen reader support comes with it.',
  },
  'date-picker': {
    use: 'For a date or a start and end date, typed or picked from a calendar.',
    instead: 'A date far in the past, like a birthday? A plain Text Input is often quicker.',
    access: 'The field takes typed dates. In the calendar, arrow keys move by day and week, and Escape closes it.',
  },
  calendar: {
    use: 'For a screen where picking the day is the main job: booking a time, or choosing the day an agenda shows. The month stays on the page.',
    instead: 'A date inside a form? Date Picker keeps it to one field.',
    access: 'An ARIA date grid named by its month, with one Tab stop: arrow keys move by day and week, Page Up/Down by month, Home/End to the week’s ends. Chosen days are announced as selected and today as the current date; unavailable days are announced and can’t be chosen.',
  },
  combobox: {
    use: 'For one or several choices from a long list people would rather search than scroll.',
    instead: 'Under fifteen options? Select or Choice is simpler.',
    access: 'Follows the ARIA combobox pattern: arrows move through options, Enter picks, Escape closes, and the active option is announced.',
  },
  choice: {
    use: 'For two to six options that should all be visible: radios for one, checkboxes for several.',
    instead: 'An on/off setting that applies at once? Switch.',
    access: 'Native radios and checkboxes in a fieldset whose legend is the label, so the group is announced with each option.',
  },
  switch: {
    use: 'For a setting that takes effect the moment it flips, like notifications.',
    instead: 'Part of a form that is saved with a button? A checkbox (Choice with multiple) reads more honestly.',
    access: 'role="switch" with its state announced as on or off. Space toggles it.',
  },
  slider: {
    use: 'For a value where the rough position matters more than the exact number: volume, a price range.',
    instead: 'An exact number? Text Input with type="number".',
    access: 'Native range inputs, each with its own accessible name. Arrow keys and Page Up/Down move the handle.',
  },
  search: {
    use: 'For filtering or searching what is on the page or in the app.',
    instead: 'A form field that happens to hold a query? Text Input.',
    access: 'type="search" with a label, so Escape clears it in most browsers and it is announced as a search field.',
  },
  link: {
    use: 'For going somewhere: another page, a section, a document.',
    instead: 'Running an action? Button.',
    access: 'A real anchor with an underline in running text, so it is not marked by color alone.',
  },
  pagination: {
    use: 'For long lists split into pages, with the count of results.',
    instead: 'A feed people read straight through? A "Show more" Button may suit better.',
    access: 'A labelled navigation region. Each page number is named, and the current one carries aria-current.',
  },
  tabs: {
    use: 'For switching between related views of the same thing without leaving the page.',
    instead: 'Steps in order? Wizard. Separate pages? Side Navigation or links.',
    access: 'Follows the ARIA tabs pattern: one Tab stop for the list, arrow keys move between tabs, and each panel is labelled by its tab.',
  },
  breadcrumbs: {
    use: 'For showing where a page sits in a deep hierarchy, with a way back up.',
    instead: 'A flat app with a few sections? Leave them out.',
    access: 'A labelled navigation with an ordered list; the current page is marked with aria-current="page".',
  },
  menu: {
    use: 'For a short list of actions or options behind one button: row actions, sort order, visible columns.',
    instead: 'Navigation between pages? Links. A choice inside a form? Select.',
    access: 'Follows the ARIA menu button pattern: arrows and typeahead move through items, Escape closes and returns focus to the button.',
  },
  tag: {
    use: 'For categories, statuses or active filters, as short labels.',
    instead: 'A count or a dot that flags something new? Badge.',
    access: 'Color is never the only signal: the text says the status. A removable tag’s button is named "Remove" plus the tag’s label.',
  },
  metric: {
    use: 'For one headline number with its change, like revenue this month.',
    instead: 'A trend over time? Data Viz.',
    access: 'The change is announced as increased, decreased or unchanged, and whether that is good, not just shown as an arrow and a color.',
  },
  rating: {
    use: 'For how people rated something, such as a product, a place or an app. Add the review count, so the stars carry their weight.',
    instead: 'Asking people for a rating? Choice, with 1 to 5 as its options. A score that isn’t out of stars? Metric.',
    access: 'One image, named like "Rated 4.3 out of 5, 128 reviews"; the stars themselves are hidden. Stars fill to the nearest half, and the name keeps the exact value.',
  },
  avatar: {
    use: 'For a person: their photo, or initials when there is none.',
    access: 'Named by the person’s name. A presence dot is announced as part of that name, not by color alone.',
  },
  list: {
    use: 'For a vertical list of items people scan or open: files, people, recent activity, an inbox with its open and unread items.',
    instead: 'Rows with several columns to sort and filter? Table.',
    access: 'A real list. Selectable rows are native buttons, so they are reachable by Tab and work with Enter and Space. The open row carries aria-current, and an unread row says "unread" after its label.',
  },
  accordion: {
    use: 'For long content people only need parts of, such as FAQs or settings groups.',
    instead: 'Content everyone needs? Show it. Views of the same thing? Tabs.',
    access: 'Each heading holds a button with aria-expanded that controls its section.',
  },
  prose: {
    use: 'For writing people read from top to bottom: articles, docs pages, changelog entries, terms and privacy pages. Put your own headings, paragraphs, lists, tables and quotes inside, or HTML rendered from Markdown.',
    instead: 'A line of text with a link? Text Link. Code people copy? Code Block, which Prose spaces like the rest of the page.',
    access: 'Prose styles your markup and leaves its structure to you: one h1, headings in order and alt text on images. Links are underlined, not marked by color alone, and keep DIYA’s focus ring. A wide table scrolls in a region you name with aria-label and give tabIndex={0}.',
  },
  'code-block': {
    use: 'For code or a command people copy: an install line, a config file, an API call.',
    instead: 'A name or value inside a sentence? A plain code element in Prose.',
    access: 'The code sits in a region named after its label, so long lines scroll with the keyboard. Copy is a real button, and its result is announced politely; if the browser blocks the clipboard, the code is selected instead.',
  },
  badge: {
    use: 'For a small count or dot on something else: unread messages, a new item.',
    instead: 'A status in words? Tag.',
    access: 'Every badge needs a label, which screen readers hear in place of the dot or number.',
  },
  alert: {
    use: 'For a message about the page or a task: saved, needs attention, failed. Toast is the same message, floated and temporary.',
    instead: 'Something that needs a decision before going on? Dialog.',
    access: 'An urgent alert is announced at once (role="alert"); others politely. The tone is said in words, not just shown in color.',
  },
  progress: {
    use: 'For how far along a task is, or that something is still working.',
    instead: 'A measured value, not a task? Metric.',
    access: 'A native progressbar with a label and value. An indeterminate one says it is busy without a number.',
  },
  tooltip: {
    use: 'For a short, optional hint about a control, like what an icon button does.',
    instead: 'Anything people must read, or anything interactive? Put it on the page, or use Popover.',
    access: 'Shown on hover and on keyboard focus, dismissed with Escape, and tied to its trigger with aria-describedby.',
  },
  popover: {
    use: 'For a small panel of controls beside a button: display preferences, a quick filter.',
    instead: 'A decision that blocks the page? Dialog. A list of actions? Menu.',
    access: 'Opens from a button with aria-expanded. Tab moves through the panel’s content, and closing returns focus to the button.',
  },
  'page-header': {
    use: 'For the top of a page: its title, where it sits, what it is about and its main actions.',
    access: 'Renders the page’s heading. Breadcrumbs and tabs inside keep their own navigation semantics.',
  },
  'site-header': {
    use: 'For the bar across the top of an app or site: brand, navigation, search and account.',
    instead: 'An app with many sections? Pair it with Side Navigation.',
    access: 'Labelled navigation that folds into a menu button when space runs out, so every link stays reachable by keyboard.',
  },
  'side-navigation': {
    use: 'For moving between the main sections of an app, grouped, with an optional collapsed rail.',
    instead: 'Five or fewer top-level sections? Site Header’s navigation may be enough.',
    access: 'A labelled navigation; the current item carries aria-current="page". Collapsed, each icon keeps its name. A count is part of its item’s name, such as "Inbox, 12".',
  },
  card: {
    use: 'For one self-contained item in a grid or list: a project, a plan, an article.',
    instead: 'Many items compared side by side? Table.',
    access: 'The title is a heading, so cards are easy to skim with a screen reader. Keep only one main action per card.',
  },
  table: {
    use: 'For rows people compare, sort, filter, select and act on.',
    instead: 'A simple list without columns? List.',
    access: 'A real table with a caption, column headers and sort state in aria-sort. Row actions and selection are buttons and checkboxes with names.',
  },
  'data-viz': {
    use: 'For trends and proportions: a line over time, a share of the whole.',
    instead: 'One number? Metric.',
    access: 'The chart has a text label, and "Show data" opens the same numbers as a table for anyone who can’t read the chart.',
  },
  form: {
    use: 'For a set of fields submitted together, with Submit and an optional Cancel.',
    instead: 'Long or branching? Wizard.',
    access: 'A native form, so Enter submits. Labels, helper text and errors come from each field; move focus to the first error after a failed submit.',
  },
  wizard: {
    use: 'For a task split into steps in order, like creating a project.',
    instead: 'A few fields? One Form.',
    access: 'The step list says which step is current and how many there are. Focus moves to the new step’s heading when the step changes.',
  },
  'file-upload': {
    use: 'For choosing files to send: drag and drop, or the file picker.',
    access: 'The drop zone is also a real file input with a label, so it works without dragging. Rejected files come back to you with the reason, so you can say why.',
  },
  chatbot: {
    use: 'For a conversation surface you connect to your own assistant or support. Full-page fills the height you give it, such as a whole screen, and the conversation scrolls between the header and the composer. A screen with its own heading turns the header off with showHeader={false}.',
    access: 'Messages live in a log that announces new replies politely. The title names the chat and its log, even with the header hidden. The composer is labelled and sends with Enter.',
  },
  dialog: {
    use: 'For a short task or decision that has to happen before going on: confirm, rename, a quick form.',
    instead: 'Longer content or a side task? Drawer.',
    access: 'A modal dialog named by its title. Focus moves in, stays in, and returns to what opened it; Escape closes it.',
  },
  drawer: {
    use: 'For a side task with more room than a dialog: details, filters, an edit form.',
    instead: 'A quick yes or no? Dialog.',
    access: 'Modal like Dialog: named by its title, traps focus, closes with Escape and returns focus.',
  },
  'empty-state': {
    use: 'For a region with nothing to show yet, no results, or an error, with the next step.',
    access: 'The title is a heading. An urgent state is announced at once; others politely.',
  },
}

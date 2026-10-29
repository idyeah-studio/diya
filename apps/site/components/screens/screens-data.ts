/**
 * Every Screen the catalog lists: 33 whole pages and 3 posters for pages
 * that wait on a DIYA piece. The order here is the gallery's and the
 * sidebar's: categories in CATEGORIES order, each screen in its category's
 * order, posters last in theirs.
 *
 * A screen's file is `apps/site/screens/<id>.tsx` (see screens/README.md);
 * a poster's is `apps/site/screens/posters/<id>.tsx`, used only for its
 * thumbnail and never offered as code.
 *
 * - `name` is the display name: the gallery card, the page's heading and the
 *   file's second line ("// Sign in: a DIYA screen.").
 * - `component` is the file's identifier: `export default function
 *   <component>Screen()`, saved in Vite as `src/<component>.tsx`.
 * - `route` is the suggested Next.js route: `app/<route>/page.tsx`.
 * - `status`: `building` until the screen passes its checks, then `ready`.
 *   Building screens show only in preview builds (DIYA_CATALOG_PREVIEW=1).
 */

export const CATEGORIES = [
  'Sign-in & onboarding',
  'App core',
  'Data & documents',
  'Account & admin',
  'Communication, AI & help',
  'Marketing',
  'Commerce & scheduling',
  'Forms & system',
] as const

export type ScreenCategory = (typeof CATEGORIES)[number]
export type ScreenStatus = 'ready' | 'building' | 'poster'

type ScreenBase = {
  id: string
  name: string
  category: ScreenCategory
  /** One plain line for the gallery card and the page. */
  description: string
  /** The page's shape, in a few words. */
  layout: string
  /** Suggested Next.js route, without `app/` or `/page.tsx`; '' is the home page. */
  route: string
  /** PascalCase file identifier, without the `Screen` suffix. */
  component: string
  /** Imports `@idyeah/diya/charts`, so the install line adds `echarts@6`. */
  charts: boolean
  /** Extra words the catalog search matches. */
  keywords: string
}

export type LiveScreen = ScreenBase & {
  status: 'ready' | 'building'
  /** One line on how to reach the interesting states. */
  tryThis: string
}

export type PosterScreen = ScreenBase & {
  status: 'poster'
  /** The DIYA piece this page waits for, as a short phrase: "Waiting on <waitingOn>". */
  waitingOn: string
  /** One more line for the poster's page. */
  note: string
}

export type ScreenEntry = LiveScreen | PosterScreen

export const screens: readonly ScreenEntry[] = [
  // Sign-in & onboarding
  {
    id: 'sign-in',
    name: 'Sign in',
    category: 'Sign-in & onboarding',
    description: 'Email and password, Google and GitHub, and every way back in when a password slips someone’s mind.',
    layout: 'Centered card',
    route: 'sign-in',
    component: 'SignIn',
    charts: false,
    status: 'building',
    tryThis: 'Sign in with the password “wrong” to see the error, or choose Forgot password to walk through the code and reset steps.',
    keywords: 'login log in auth password forgot reset magic link two-step code',
  },
  {
    id: 'sign-up',
    name: 'Sign up',
    category: 'Sign-in & onboarding',
    description: 'A split page: reasons to join on one side, a short form with a password meter on the other.',
    layout: 'Split screen',
    route: 'sign-up',
    component: 'SignUp',
    charts: false,
    status: 'building',
    tryThis: 'Use taken@example.com to see the “already registered” path, or type a short password and watch the meter.',
    keywords: 'register create account join trial invite',
  },
  {
    id: 'onboarding',
    name: 'Onboarding wizard',
    category: 'Sign-in & onboarding',
    description: 'Four steps from a fresh account to a set-up workspace, and Back keeps every answer.',
    layout: 'Step flow',
    route: 'onboarding',
    component: 'Onboarding',
    charts: false,
    status: 'building',
    tryThis: 'Try the workspace URL “acme” to find it taken, skip a required field to land on its error, then finish for the all-set screen.',
    keywords: 'wizard steps setup first run workspace invite welcome',
  },
  {
    id: 'getting-started',
    name: 'Getting started',
    category: 'Sign-in & onboarding',
    description: 'A first-run home that answers “what’s next?” with a setup checklist, tasks and templates.',
    layout: 'App home with checklist',
    route: 'getting-started',
    component: 'GettingStarted',
    charts: false,
    status: 'building',
    tryThis: 'Tick off the checklist until it says you’re done, then hide it; open a task to see its drawer.',
    keywords: 'welcome home checklist first run setup tasks templates',
  },

  // App core
  {
    id: 'dashboard',
    name: 'Analytics dashboard',
    category: 'App core',
    description: 'The owner’s home screen: key figures, a traffic chart, top pages and campaigns, in one app frame.',
    layout: 'Sidebar app shell',
    route: 'dashboard',
    component: 'Dashboard',
    charts: true,
    status: 'building',
    tryThis: 'Change the date range to reload the figures, pick a range with no data for the empty state, or choose Last year to see an error with Retry.',
    keywords: 'analytics metrics kpi charts overview admin reports',
  },
  {
    id: 'record-detail',
    name: 'Record detail',
    category: 'App core',
    description: 'The page after a row click: a project’s summary, milestones, people and files, with tabs for the rest.',
    layout: 'Detail with side column',
    route: 'projects/[id]',
    component: 'RecordDetail',
    charts: false,
    status: 'building',
    tryThis: 'Switch tabs, archive the project to see it turn read-only, or rename it “fail” to see a save error.',
    keywords: 'detail record project customer order ticket overview',
  },
  {
    id: 'task-list',
    name: 'Task list',
    category: 'App core',
    description: 'Tasks grouped by status, with filters, quick search and a drawer for details and comments.',
    layout: 'Grouped list',
    route: 'tasks',
    component: 'TaskList',
    charts: false,
    status: 'building',
    tryThis: 'Filter to Mine, search for something that isn’t there, or open a task to comment and change its status.',
    keywords: 'todo tasks project issues status assignee due',
  },
  {
    id: 'search-results',
    name: 'Search results',
    category: 'App core',
    description: 'One search box, results by type, and filters that tuck into a drawer on phones.',
    layout: 'Filters + results',
    route: 'search',
    component: 'SearchResults',
    charts: false,
    status: 'building',
    tryThis: 'Search for “zebra” to find nothing, add a filter or two, then narrow the window to see the filters move into a drawer.',
    keywords: 'find query filters results directory global search',
  },
  {
    id: 'board',
    name: 'Board',
    category: 'App core',
    description: 'Cards in columns that you drag from one stage to the next.',
    layout: 'Columns of cards',
    route: 'board',
    component: 'Board',
    charts: false,
    status: 'poster',
    waitingOn: 'drag and drop',
    note: 'Until it lands, the task list covers the same work with a “Move to” menu.',
    keywords: 'kanban board columns drag drop cards stages',
  },

  // Data & documents
  {
    id: 'resource-table',
    name: 'Resource table',
    category: 'Data & documents',
    description: 'Orders in a full-width table with search, filters, bulk actions and a drawer for each row.',
    layout: 'Full-width data',
    route: 'orders',
    component: 'ResourceTable',
    charts: false,
    status: 'building',
    tryThis: 'Select a few rows for bulk actions, search for “zzz” to empty the table, or add an order and watch it arrive.',
    keywords: 'table orders products admin data grid crud bulk export',
  },
  {
    id: 'file-manager',
    name: 'File manager',
    category: 'Data & documents',
    description: 'Folders and files in a grid or a list, with uploads, sharing and a storage meter.',
    layout: 'Browse with grid or list',
    route: 'files',
    component: 'FileManager',
    charts: false,
    status: 'building',
    tryThis: 'Switch between grid and list, upload a file named “broken” to see a failure with Retry, or open an empty folder.',
    keywords: 'files folders documents assets upload storage drive share',
  },
  {
    id: 'activity',
    name: 'Notifications & audit log',
    category: 'Data & documents',
    description: 'What happened and who did it: a notifications feed by day, and an audit log for security reviews.',
    layout: 'Single-column feed',
    route: 'activity',
    component: 'Activity',
    charts: false,
    status: 'building',
    tryThis: 'Mark everything as read to reach “All caught up”, or switch to the audit log and filter by person.',
    keywords: 'notifications feed audit log events history mentions',
  },
  {
    id: 'invoice',
    name: 'Invoice & quote',
    category: 'Data & documents',
    description: 'A printable invoice with line items and totals, and its payment history alongside.',
    layout: 'Printable document',
    route: 'invoices/[id]',
    component: 'Invoice',
    charts: false,
    status: 'building',
    tryThis: 'Send the invoice, record a payment to mark it paid, or press Print to see the paper version.',
    keywords: 'invoice quote receipt billing print payment',
  },
  {
    id: 'create-edit',
    name: 'Create & edit',
    category: 'Data & documents',
    description: 'A long form with side settings for drafting, scheduling and publishing.',
    layout: 'Form + side settings',
    route: 'products/new',
    component: 'CreateEdit',
    charts: false,
    status: 'poster',
    waitingOn: 'a rich-text editor',
    note: 'The form and its settings are ready to build; the body needs bold, links and lists before it’s worth pasting.',
    keywords: 'create edit form publish draft post editor',
  },

  // Account & admin
  {
    id: 'settings',
    name: 'Account settings',
    category: 'Account & admin',
    description: 'Profile, notifications, security and appearance, with a danger zone that asks twice.',
    layout: 'Section nav + sections',
    route: 'settings',
    component: 'Settings',
    charts: false,
    status: 'building',
    tryThis: 'Change a field to see unsaved changes, use taken@example.com as your email for the error, or delete the account by typing its name.',
    keywords: 'settings preferences profile security password account appearance',
  },
  {
    id: 'billing',
    name: 'Billing & plan',
    category: 'Account & admin',
    description: 'The current plan, usage meters, payment method and invoices, with an honest way to cancel.',
    layout: 'Stacked cards',
    route: 'settings/billing',
    component: 'Billing',
    charts: false,
    status: 'building',
    tryThis: 'Change plans to compare them, or cancel to pick a reason and see when access ends.',
    keywords: 'billing subscription plan usage payment invoices upgrade cancel',
  },
  {
    id: 'team',
    name: 'Team & roles',
    category: 'Account & admin',
    description: 'Members, pending invites and roles, with a seat count that says when you’re full.',
    layout: 'Table + dialogs',
    route: 'settings/team',
    component: 'Team',
    charts: false,
    status: 'building',
    tryThis: 'Invite people until the seats run out, or try to remove the last owner.',
    keywords: 'team members roles permissions invite users seats',
  },
  {
    id: 'api-keys',
    name: 'API keys & integrations',
    category: 'Account & admin',
    description: 'Integrations to switch on, keys to create and revoke, and a chart of recent requests.',
    layout: 'Settings with table + chart',
    route: 'settings/api-keys',
    component: 'ApiKeys',
    charts: true,
    status: 'building',
    tryThis: 'Create a key to see it shown once, revoke one, or turn on an integration that needs setting up.',
    keywords: 'api keys tokens integrations webhooks developer',
  },
  {
    id: 'profile',
    name: 'User profile',
    category: 'Account & admin',
    description: 'A person’s page: who they are, what they work on and what they’ve done lately.',
    layout: 'Profile header + tabs',
    route: 'profile',
    component: 'Profile',
    charts: false,
    status: 'building',
    tryThis: 'Switch between your own profile and a teammate’s, then open a new member’s activity for the empty state.',
    keywords: 'profile user person member about people',
  },

  // Communication, AI & help
  {
    id: 'ai',
    name: 'AI assistant',
    category: 'Communication, AI & help',
    description: 'A full-page chat with history and suggestions, and a marked spot to connect your own model.',
    layout: 'Conversation',
    route: 'assistant',
    component: 'Assistant',
    charts: false,
    status: 'building',
    tryThis: 'Pick a suggestion, stop a reply halfway, or ask “fail” to see the error with Retry.',
    keywords: 'ai chat assistant chatbot conversation llm',
  },
  {
    id: 'inbox',
    name: 'Inbox',
    category: 'Communication, AI & help',
    description: 'Folders, messages and a reading pane, taking turns one pane at a time on phones.',
    layout: 'Three panes',
    route: 'inbox',
    component: 'Inbox',
    charts: false,
    status: 'building',
    tryThis: 'Open a message to reply, switch to an empty folder, or narrow the window to watch the panes take turns.',
    keywords: 'inbox email messages support tickets mail',
  },
  {
    id: 'help',
    name: 'Help center & FAQ',
    category: 'Communication, AI & help',
    description: 'Search, topics, popular articles and an FAQ, with a way to reach a person when none of it helps.',
    layout: 'Search hero + cards',
    route: 'help',
    component: 'HelpCenter',
    charts: false,
    status: 'building',
    tryThis: 'Search for “refund”, then for something that isn’t there, or open “Still stuck?” to send a question.',
    keywords: 'help support faq articles knowledge base',
  },
  {
    id: 'docs',
    name: 'Docs article',
    category: 'Communication, AI & help',
    description: 'A readable article with docs navigation, an “On this page” index and a helpful-or-not question at the end.',
    layout: 'Three-column reading',
    route: 'docs/[slug]',
    component: 'DocsArticle',
    charts: false,
    status: 'building',
    tryThis: 'Switch the platform tabs in the code sample, then answer “Was this helpful?” both ways.',
    keywords: 'docs documentation article blog guide reading',
  },
  {
    id: 'contact',
    name: 'Contact & support',
    category: 'Communication, AI & help',
    description: 'Ways to reach you on one side and a short form on the other, ending with a request number.',
    layout: 'Info column + form',
    route: 'contact',
    component: 'Contact',
    charts: false,
    status: 'building',
    tryThis: 'Send the form empty to see the errors, or write “fail” in the message for a failure that keeps what you typed.',
    keywords: 'contact support sales demo form message',
  },

  // Marketing
  {
    id: 'pricing',
    name: 'Pricing',
    category: 'Marketing',
    description: 'Three plans, a monthly or yearly switch, a usage calculator and the full comparison.',
    layout: 'Plan grid + comparison',
    route: 'pricing',
    component: 'Pricing',
    charts: false,
    status: 'building',
    tryThis: 'Switch to yearly, slide the calculator to the top end, or contact sales from the enterprise strip.',
    keywords: 'pricing plans tiers subscription compare',
  },
  {
    id: 'waitlist',
    name: 'Waitlist & coming soon',
    category: 'Marketing',
    description: 'A full-bleed page that collects emails and tells people where they are in line.',
    layout: 'Full-bleed hero',
    route: 'waitlist',
    component: 'Waitlist',
    charts: false,
    status: 'building',
    tryThis: 'Join with any email to get your place, use taken@example.com to hear you’re already in, or leave out the @ for the error.',
    keywords: 'waitlist coming soon launch early access maintenance',
  },
  {
    id: 'changelog',
    name: 'Changelog & roadmap',
    category: 'Marketing',
    description: 'Dated release notes you can filter, and a roadmap where people vote on what comes next.',
    layout: 'Dated entries',
    route: 'changelog',
    component: 'Changelog',
    charts: false,
    status: 'building',
    tryThis: 'Filter to Fixed, subscribe for updates, or switch to the roadmap and vote.',
    keywords: 'changelog release notes updates roadmap new',
  },
  {
    id: 'status',
    name: 'Status page',
    category: 'Marketing',
    description: 'Is it up? Each service’s uptime, a response-time chart and the incident history.',
    layout: 'Single-column board',
    route: 'status',
    component: 'Status',
    charts: true,
    status: 'building',
    tryThis: 'Open a past incident for its timeline, subscribe to updates, or change the sample services at the top of the file to see an outage.',
    keywords: 'status uptime incidents outage health monitoring',
  },
  {
    id: 'landing',
    name: 'SaaS landing page',
    category: 'Marketing',
    description: 'A launch page with a hero, a live product preview, features, a pricing teaser and a sign-up.',
    layout: 'Long marketing page',
    route: '',
    component: 'Landing',
    charts: false,
    status: 'poster',
    waitingOn: 'marketing sections',
    note: 'A hero, feature blocks and a footer first, so the whole page is DIYA and nothing is borrowed.',
    keywords: 'landing marketing home hero launch homepage',
  },

  // Commerce & scheduling
  {
    id: 'listing',
    name: 'Product listing with filters',
    category: 'Commerce & scheduling',
    description: 'A grid of products with a filter sidebar, sorting and pages. It works for jobs and directories too.',
    layout: 'Filter sidebar + grid',
    route: 'shop',
    component: 'Listing',
    charts: false,
    status: 'building',
    tryThis: 'Apply filters until nothing matches, clear them all, or add an item to the cart.',
    keywords: 'shop store catalog products filters grid ecommerce marketplace',
  },
  {
    id: 'product',
    name: 'Product detail',
    category: 'Commerce & scheduling',
    description: 'Pictures on one side; name, price, options and Add to cart on the other, with reviews below.',
    layout: 'Image + info split',
    route: 'products/[id]',
    component: 'ProductDetail',
    charts: false,
    status: 'building',
    tryThis: 'Pick a size that’s sold out to get “Notify me”, or add to cart to see it confirmed.',
    keywords: 'product detail item store shop reviews',
  },
  {
    id: 'checkout',
    name: 'Checkout',
    category: 'Commerce & scheduling',
    description: 'Contact, shipping, delivery and payment on one page, with the order summary always in view.',
    layout: 'Form + sticky summary',
    route: 'checkout',
    component: 'Checkout',
    charts: false,
    status: 'building',
    tryThis: 'Apply the code SAVE10, then a made-up one, choose a country that isn’t shipped to, or pay to see processing and the confirmation.',
    keywords: 'checkout cart payment order shipping ecommerce',
  },
  {
    id: 'book',
    name: 'Book a time',
    category: 'Commerce & scheduling',
    description: 'The page a customer books from: pick a day, pick a time, add your details, done.',
    layout: 'Host card + time picker',
    route: 'book',
    component: 'Booking',
    charts: false,
    status: 'building',
    tryThis: 'Pick a day with no times left, take a slot that’s just been taken, or book one to see the confirmation.',
    keywords: 'booking appointment calendar schedule demo meeting',
  },
  {
    id: 'agenda',
    name: 'Bookings agenda',
    category: 'Commerce & scheduling',
    description: 'The staff side of bookings: the day’s appointments as a list, a drawer for each and a quick way to add one.',
    layout: 'Agenda list',
    route: 'bookings',
    component: 'Agenda',
    charts: false,
    status: 'building',
    tryThis: 'Step to a day with nothing booked, open a booking for its details, or add a new one.',
    keywords: 'agenda bookings appointments schedule calendar staff',
  },

  // Forms & system
  {
    id: 'application',
    name: 'Application form',
    category: 'Forms & system',
    description: 'A long form done kindly: clear sections, a résumé upload and an error summary that links to each field.',
    layout: 'Long single column',
    route: 'apply',
    component: 'Application',
    charts: false,
    status: 'building',
    tryThis: 'Submit with empty fields to see the error summary, then fix them and submit for what happens next.',
    keywords: 'application form apply job registration survey grant',
  },
  {
    id: 'errors',
    name: 'Error & system pages',
    category: 'Forms & system',
    description: 'Not found, server error, no access, maintenance, expired link and offline: calm pages for bad moments.',
    layout: 'Centered message',
    route: 'errors',
    component: 'ErrorPages',
    charts: false,
    status: 'building',
    tryThis: 'Move between the pages, copy the error ID on the server error, or request access on the no-access page.',
    keywords: 'error 404 500 403 not found maintenance offline expired',
  },
]

export const screenIds: readonly string[] = screens.map((screen) => screen.id)

const byId = new Map(screens.map((screen) => [screen.id, screen]))

export function screenById(id: string | null | undefined): ScreenEntry | undefined {
  return id ? byId.get(id) : undefined
}

/**
 * Whether a screen shows in the catalog: ready screens and posters always;
 * building ones only in preview builds, with an "In progress" tile.
 */
export function screenIsListed(screen: ScreenEntry, preview: boolean) {
  return screen.status !== 'building' || preview
}

/** Preview builds list screens that are still being built. */
export function screensPreview(env: Record<string, string | undefined> = process.env) {
  return env.DIYA_CATALOG_PREVIEW === '1'
}

/** The screens a build lists, in gallery order. */
export function listedScreens(preview: boolean) {
  return screens.filter((screen) => screenIsListed(screen, preview))
}

/** Where Get code tells a Next.js app to save the file. */
export function nextPath(screen: Pick<ScreenEntry, 'route'>) {
  return screen.route ? `app/${screen.route}/page.tsx` : 'app/page.tsx'
}

/** Where Get code tells a Vite app to save the file. */
export function vitePath(screen: Pick<ScreenEntry, 'component'>) {
  return `src/${screen.component}.tsx`
}

/** The preview frame's address for a screen or poster. */
export function frameHref(screen: Pick<ScreenEntry, 'id' | 'status'>, theme: 'light' | 'dark', glass: boolean) {
  const query = new URLSearchParams({ screen: screen.id, theme, glass: glass ? '1' : '0' })
  if (screen.status === 'poster') query.set('poster', '1')
  return `/screens-frame?${query}`
}

/** Light and dark thumbnails, written by scripts/screens-thumbnails.mjs. */
export function thumbnailSrc(id: string, theme: 'light' | 'dark') {
  return `/screens/thumbs/${id}-${theme}.jpg`
}

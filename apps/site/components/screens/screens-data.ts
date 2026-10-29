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
    status: 'ready',
    tryThis: 'Use the password wrong to see the error, or submit with empty fields. Any other password opens two-step sign-in, where 000000 fails and any other six digits sign you in. Forgot password and Email me a sign-in link both lead to Check your email.',
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
    status: 'ready',
    tryThis: 'Submit with empty fields to see the errors, and type a password to watch the meter. taken@example.com is already registered; any other email leads to Check your email. Open your invite to join Northwind Studio with the email locked in.',
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
    status: 'ready',
    tryThis: 'Continue with the name empty to see its error, or name the workspace Acme to find its URL taken. On Team, Enter adds an address and a repeat gets flagged. Pick a template and create the workspace to see it ready.',
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
    status: 'ready',
    tryThis: 'Open a step for its drawer, then finish it for a toast or skip it; open a skipped step to put it back. An iCal link that doesn\'t end in .ics fails to connect. Finish every step, then hide the checklist.',
    keywords: 'welcome home checklist first run setup tasks templates',
  },

  // App core
  {
    id: 'dashboard',
    name: 'Analytics dashboard',
    category: 'App core',
    description: 'A subscription business at a glance: revenue, subscribers and churn, two charts and the customers who matter most.',
    layout: 'Sidebar app shell',
    route: 'dashboard',
    component: 'Dashboard',
    charts: true,
    status: 'ready',
    tryThis: 'Change the date range to reload every panel, or pick All time to watch the revenue chart time out, then Retry. Switch to the Sandbox workspace from the account menu at the foot of the sidebar for the empty state, then connect billing. Click a customer for a quick look.',
    keywords: 'analytics metrics kpi charts overview admin reports',
  },
  {
    id: 'record-detail',
    name: 'Record detail',
    category: 'App core',
    description: 'One customer, everything about them: plan and health, activity, invoices and notes, with the facts at hand on the side.',
    layout: 'Detail with side column',
    route: 'customers/[id]',
    component: 'RecordDetail',
    charts: false,
    status: 'ready',
    tryThis: 'Switch tabs to load each one, filter Activity by Support for the empty state, edit and save the notes, or delete the customer and undo it.',
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
    status: 'ready',
    tryThis: 'Pick a recent search, type “onbaording” for a suggestion, “zebra” for tips, then filter by team; on a phone, filters move to a drawer.',
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
    status: 'ready',
    tryThis: 'Pick Today for an empty shop, All time for a timeout with Try again, search “zzz”, select rows to export or archive, or open #1048 and mark it shipped.',
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
    status: 'ready',
    tryThis: 'Open Photography for an empty folder, upload a file over 25 MB, rename Logo mark.svg to Logo primary.svg, or select several files in the list.',
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
    status: 'ready',
    tryThis: 'Change your name to see unsaved changes, save taken@example.com as your email for the error, use wrong as your current password or 000000 as the two-step code, or delete the account by typing your email.',
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
    status: 'ready',
    tryThis: 'Upgrade from the trial banner: the card on file has expired, so the payment fails until you update it (4000 0000 0000 0002 is declined). Try Starter to see why it doesn\'t fit, or cancel to pick a reason.',
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
    status: 'ready',
    tryThis: 'Invite two people to run out of seats, change your own role or Leave team to see why the last owner stays, or select everyone and remove them to see an empty team.',
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
    status: 'ready',
    tryThis: 'Pick a suggestion and press Stop halfway, or ask anything with “fail” in it to see the error with Retry. Attach a file, open Kitchen remodel budget for a long thread, or use Chat options to rename, delete or clear every chat.',
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
    status: 'ready',
    tryThis: 'Open a message to mark it read and watch the count drop. Reply with “fail” in it to see a send error, then Try again. Archive all six for Inbox zero, or open Spam for an empty folder. With a row focused, J and K move through messages.',
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
    status: 'ready',
    tryThis: 'Change any filter to see it load. Pick Lighting and drag the price below $90 to find nothing, then Clear filters. On a phone, filters open from the Filters button.',
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
    status: 'ready',
    tryThis: 'Pick Graphite to find it sold out and ask to be notified. Choose Sage, Large, raise the quantity to 3 and Add to bag for the stock error; anything else adds and shows a toast. Arrow keys move through the pictures.',
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
    status: 'ready',
    tryThis: 'Pay with empty fields for the error summary. Apply DIYA10, then any other code. Use declined@example.com to have the card declined; any other email places the order.',
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

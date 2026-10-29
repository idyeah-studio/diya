'use client'
// User profile: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/profile/page.tsx. Vite: save as src/Profile.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Avatar, Button, Combobox, Drawer, List, Progress, Select, Tabs, Tag, TextArea, TextInput, Toast, useDiyaAppearance,
  type ListItem,
} from '@idyeah/diya'
import {
  CalendarDays, Clock, FileText, GitPullRequestArrow, LucideProvider, Mail, MapPin, MessageCircle, MessageSquare, Pencil,
  Plus, Send, UserPlus, Users,
} from 'lucide-react'

// Wire this to your session: true when the signed-in person owns this profile.
const isOwnProfile = true

// Your product, and the person this page is about.
const PRODUCT = 'Copperline'
type Person = { name: string; pronouns: string; role: string; location: string; timeZone: string; about: string; skills: string[] }
const PERSON: Person = {
  name: 'Aiko Tanaka',
  pronouns: 'she/her',
  role: 'Senior product designer',
  location: 'Osaka, Japan',
  timeZone: 'Asia/Tokyo',
  about:
    'I look after Copperline’s design system: the tokens, the components and the rules that keep forty screens feeling like one product. Before this I designed ticket machines for train stations, so I care a lot about people in a hurry. Ask me about color contrast, or the best ramen near Umeda.',
  skills: ['Design systems', 'Accessibility', 'Prototyping', 'Color', 'Design tokens', 'Workshops'],
}
const DETAILS = { team: 'Design Systems', manager: 'Folake Adeyemi', email: 'aiko.tanaka@example.com', joined: 'March 2022' }
const PROJECTS = [
  { id: 'tokens', name: 'Tokens 2.0', role: 'Lead', due: 'Due Dec 12', progress: 68 },
  { id: 'checkout', name: 'Checkout redesign', role: 'Design review', due: 'Due Nov 20', progress: 40 },
  { id: 'audit', name: 'Accessibility audit, Q4', role: 'Contributor', due: 'Due Dec 3', progress: 85 },
]
const TIME_ZONES = [
  { value: 'Asia/Tokyo', label: 'Japan (GMT+9)' },
  { value: 'Asia/Kolkata', label: 'India (GMT+5:30)' },
  { value: 'Europe/Berlin', label: 'Central Europe (GMT+1)' },
  { value: 'Europe/London', label: 'United Kingdom (GMT)' },
  { value: 'America/New_York', label: 'US Eastern (GMT−5)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (GMT−8)' },
]
const PRONOUNS = [
  { value: '', label: 'Don’t show' },
  { value: 'she/her', label: 'she/her' },
  { value: 'he/him', label: 'he/him' },
  { value: 'they/them', label: 'they/them' },
]
const SKILLS = ['Accessibility', 'Color', 'Content design', 'Design systems', 'Design tokens', 'Illustration', 'Motion',
  'Prototyping', 'Research', 'Typography', 'Workshops'].map((skill) => ({ value: skill, label: skill }))

type Activity = { id: string; kind: 'publish' | 'comment' | 'review' | 'join' | 'share'; text: string; where: string; when: string }
type Teammate = { name: string; role: string; city: string; timeZone: string }

// Replace with your API calls. Each waits a moment, so the tabs show their loading state.
async function getActivity(): Promise<Activity[]> {
  await wait(1100)
  return [
    { id: 'a1', kind: 'publish', text: 'Published the new color ramps', where: 'Tokens 2.0', when: '2 hours ago' },
    { id: 'a2', kind: 'comment', text: '“Can the order summary stay pinned on phones?”', where: 'Checkout redesign', when: 'Yesterday' },
    { id: 'a3', kind: 'review', text: 'Approved 6 component changes', where: 'Design system library', when: 'Oct 27' },
    { id: 'a4', kind: 'share', text: 'Shared “Motion guidelines, first draft”', where: 'Design Systems', when: 'Oct 24' },
    { id: 'a5', kind: 'join', text: 'Joined Accessibility audit, Q4', where: 'Invited by Folake Adeyemi', when: 'Oct 20' },
  ]
}
async function getTeam(): Promise<Teammate[]> {
  await wait(1100)
  return [
    { name: 'Folake Adeyemi', role: 'Design director', city: 'Lagos', timeZone: 'Africa/Lagos' },
    { name: 'Mateo Ruiz', role: 'Product designer', city: 'Mexico City', timeZone: 'America/Mexico_City' },
    { name: 'Ananya Iyer', role: 'Design engineer', city: 'Bengaluru', timeZone: 'Asia/Kolkata' },
    { name: 'Lukas Becker', role: 'Content designer', city: 'Berlin', timeZone: 'Europe/Berlin' },
    { name: 'Sione Tupou', role: 'Researcher', city: 'Auckland', timeZone: 'Pacific/Auckland' },
  ]
}
async function saveProfile(person: Person) {
  await wait(900)
  return person
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const localTime = (timeZone: string, now: Date) => now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })
const ICONS = { publish: Send, comment: MessageSquare, review: GitPullRequestArrow, join: UserPlus, share: FileText }

export default function ProfileScreen() {
  const { glass } = useDiyaAppearance()
  const [person, setPerson] = useState(PERSON)
  const [tab, setTab] = useState('overview')
  const [activity, setActivity] = useState<Activity[]>()
  const [team, setTeam] = useState<Teammate[]>()
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(0)
  const now = useNow()
  const first = person.name.split(' ')[0]

  useEffect(() => {
    if (tab === 'activity' && !activity) getActivity().then(setActivity)
    if (tab === 'team' && !team) getTeam().then(setTeam)
  }, [tab, activity, team])

  const overview = (
    <div className="profile-overview">
      <div className="profile-column">
        <section className="profile-section" aria-labelledby="profile-about">
          <h2 id="profile-about" className="profile-heading">About</h2>
          {person.about ? (
            <p className="profile-about">{person.about}</p>
          ) : isOwnProfile ? (
            <button type="button" className="profile-empty" onClick={() => setEditing(true)}>
              <Plus /> Add a few words about yourself
            </button>
          ) : (
            <p className="profile-muted">{first} hasn’t written anything here yet.</p>
          )}
        </section>
        <section className="profile-section" aria-labelledby="profile-skills">
          <h2 id="profile-skills" className="profile-heading">Skills</h2>
          {person.skills.length ? (
            <ul className="profile-tags">
              {person.skills.map((skill) => <li key={skill}><Tag>{skill}</Tag></li>)}
            </ul>
          ) : (
            <p className="profile-muted">{isOwnProfile ? 'Add skills so people know what to ask you about.' : 'No skills listed yet.'}</p>
          )}
        </section>
        <section className="profile-section" aria-labelledby="profile-projects">
          <h2 id="profile-projects" className="profile-heading">Current projects</h2>
          <ul className="profile-projects">
            {PROJECTS.map((project) => (
              <li key={project.id} className="profile-project">
                <div>
                  <a className="profile-project-name" href={`/projects/${project.id}`}>{project.name}</a>
                  <p className="profile-muted profile-small">{project.role} · {project.due}</p>
                </div>
                <Progress className="profile-progress" label={`${project.name}, done`} value={project.progress} />
              </li>
            ))}
          </ul>
        </section>
      </div>
      <aside className="profile-section" aria-labelledby="profile-details">
        <h2 id="profile-details" className="profile-heading">Details</h2>
        <dl className="profile-facts">
          <div><dt><Users /> Team</dt><dd>{DETAILS.team}</dd></div>
          <div><dt><UserPlus /> Reports to</dt><dd><a className="profile-link" href="/people/folake-adeyemi">{DETAILS.manager}</a></dd></div>
          <div><dt><Mail /> Email</dt><dd><a className="profile-link" href={`mailto:${DETAILS.email}`}>{DETAILS.email}</a></dd></div>
          <div><dt><CalendarDays /> Joined</dt><dd>{DETAILS.joined}</dd></div>
        </dl>
      </aside>
    </div>
  )

  const activityItems: ListItem[] = (activity ?? []).map((item) => {
    const Icon = ICONS[item.kind]
    return { id: item.id, label: item.text, description: `${item.where} · ${item.when}`, leading: <span className="profile-activity-icon"><Icon /></span> }
  })
  const teamItems: ListItem[] = (team ?? []).map((mate) => ({
    id: mate.name, label: mate.name, description: `${mate.role} · ${mate.city}, ${localTime(mate.timeZone, now)}`, leading: <Avatar name={mate.name} />,
  }))

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="profile" data-glass={glass || undefined}>
        <style>{css}</style>
        <header className="profile-band">
          <div className="profile-bar">
            <a className="profile-brand" href="/">
              <span className="profile-mark" aria-hidden="true">{PRODUCT[0]}</span>
              {PRODUCT}
            </a>
            <a className="profile-link profile-back" href="/people">All people</a>
          </div>
        </header>

        <main className="profile-main">
          <section className="profile-head" aria-labelledby="profile-name">
            <Avatar className="profile-avatar" name={person.name} size="large" />
            <div className="profile-identity">
              <h1 id="profile-name" className="profile-name">
                {person.name}
                {person.pronouns && <span className="profile-pronouns">{person.pronouns}</span>}
              </h1>
              <p className="profile-role">{person.role} · {DETAILS.team}</p>
              <p className="profile-meta">
                <span><MapPin /> {person.location}</span>
                <span><Clock /> {localTime(person.timeZone, now)} for {first}</span>
              </p>
            </div>
            <div className="profile-actions">
              {isOwnProfile ? (
                <>
                  <Button onClick={() => setEditing(true)}><Pencil /> Edit profile</Button>
                  <Button variant="outline" href="/messages/me"><MessageCircle /> Message</Button>
                </>
              ) : (
                <Button href="/messages/aiko-tanaka"><MessageCircle /> Message {first}</Button>
              )}
            </div>
          </section>

          <Tabs className="profile-tabs" label={`${person.name}’s profile`} value={tab} onValueChange={setTab} items={[
            { value: 'overview', label: 'Overview', content: overview },
            { value: 'activity', label: 'Activity', content: (
              <div className="profile-panel">
                {activity
                  ? <List className="profile-list" label={`${first}’s recent activity`} divided items={activityItems} />
                  : <Skeleton label="Loading activity" />}
              </div>
            ) },
            { value: 'team', label: 'Team', content: (
              <section className="profile-panel" aria-labelledby="profile-team">
                <div className="profile-team-head">
                  <h2 id="profile-team" className="profile-heading">{DETAILS.team} team</h2>
                  {team && <p className="profile-muted">{first} and {team.length} others</p>}
                </div>
                {team
                  ? <List className="profile-list" label={`${DETAILS.team} team`} divided items={teamItems} />
                  : <Skeleton label="Loading the team" />}
              </section>
            ) },
          ]} />
        </main>

        {isOwnProfile && (
          <EditDrawer open={editing} person={person} onOpenChange={setEditing}
            onSaved={(next) => { setPerson(next); setEditing(false); setSaved(Date.now()) }} />
        )}
        {saved > 0 && (
          <Toast key={saved} tone="success" title="Profile saved" onDismiss={() => setSaved(0)} duration={5000}>
            Your teammates see the changes right away.
          </Toast>
        )}
      </div>
    </LucideProvider>
  )
}

function EditDrawer({ open, person, onOpenChange, onSaved }: {
  open: boolean; person: Person; onOpenChange: (open: boolean) => void; onSaved: (person: Person) => void
}) {
  const [draft, setDraft] = useState(person)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const nameField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setDraft(person)
    setError(undefined)
  }, [open, person])

  const set = (patch: Partial<Person>) => setDraft({ ...draft, ...patch })

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!draft.name.trim()) {
      setError('Enter the name people know you by.')
      return nameField.current?.focus()
    }
    setBusy(true)
    const next = await saveProfile({ ...draft, name: draft.name.trim(), about: draft.about.trim() })
    setBusy(false)
    onSaved(next)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Edit profile" description="Everyone at your company can see this."
      footer={
        <div className="profile-drawer-actions">
          <Button variant="quiet" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="profile-edit" loading={busy}>Save changes</Button>
        </div>
      }>
      <form id="profile-edit" className="profile-form" noValidate onSubmit={save}>
        <TextInput ref={nameField} label="Name" autoComplete="name" value={draft.name} error={error}
          onValueChange={(name) => { set({ name }); setError(undefined) }} />
        <div className="profile-pair profile-pair-wide">
          <TextInput label="Role" autoComplete="organization-title" value={draft.role} onValueChange={(role) => set({ role })} />
          <Select label="Pronouns" options={PRONOUNS} value={draft.pronouns} onValueChange={(pronouns) => set({ pronouns })} />
        </div>
        <div className="profile-pair">
          <TextInput label="Location" autoComplete="address-level2" value={draft.location} onValueChange={(location) => set({ location })} />
          <Select label="Time zone" options={TIME_ZONES} value={draft.timeZone} onValueChange={(timeZone) => set({ timeZone })} />
        </div>
        <TextArea label="About" rows={5} maxLength={400} showCount value={draft.about}
          helperText="What you work on, and what people can ask you about." onValueChange={(about) => set({ about })} />
        <Combobox label="Skills" multiple options={SKILLS} value={draft.skills} onValueChange={(skills) => set({ skills })} />
      </form>
    </Drawer>
  )
}

function Skeleton({ label }: { label: string }) {
  return (
    <div className="profile-skeleton" role="status" aria-label={label}>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="profile-skeleton-row" aria-hidden="true">
          <span className="profile-bone profile-bone-round" />
          <span className="profile-skeleton-text">
            <span className="profile-bone" style={{ width: `${62 - row * 9}%` }} />
            <span className="profile-bone profile-bone-short" />
          </span>
        </div>
      ))}
    </div>
  )
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(tick)
  }, [])
  return now
}

const css = `
.profile { min-height: 100dvh; color: var(--diya-color-text); --profile-gutter: var(--diya-space-7); }
.profile-band {
  height: 200px;
  background:
    radial-gradient(60% 120% at 18% 0%, color-mix(in srgb, var(--diya-color-surface) 70%, transparent), transparent 70%),
    radial-gradient(50% 140% at 92% 100%, color-mix(in srgb, var(--diya-color-text) 7%, transparent), transparent 70%),
    linear-gradient(120deg, color-mix(in srgb, var(--diya-color-text) 7%, var(--diya-color-surface)), color-mix(in srgb, var(--diya-color-text) 3%, var(--diya-color-surface)));
}
.profile[data-glass] .profile-band {
  background: color-mix(in srgb, var(--diya-color-surface) 46%, transparent);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
}
.profile-bar, .profile-main { width: 100%; max-width: 1120px; margin: 0 auto; padding-inline: var(--profile-gutter); }
.profile-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-4); padding-block: var(--diya-space-5); }
.profile-brand { display: inline-flex; align-items: center; gap: 10px; border-radius: 8px; color: inherit; font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; text-decoration: none; }
.profile-mark {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: calc(8px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-body); font-weight: 650; line-height: 1;
}
.profile-link { border-radius: 4px; color: inherit; text-decoration: none; }
.profile-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.profile-brand:focus-visible, .profile-link:focus-visible, .profile-project-name:focus-visible, .profile-empty:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 3px; }
.profile-back { color: var(--diya-color-muted); font-size: var(--diya-text-body); }

.profile-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: var(--diya-space-5); margin-top: -64px; }
.profile-avatar.profile-avatar { width: 128px; height: 128px; font-size: 44px; font-weight: 450; letter-spacing: -0.02em; box-shadow: 0 0 0 5px var(--diya-color-surface); }
.profile[data-glass] .profile-avatar { box-shadow: 0 0 0 5px color-mix(in srgb, var(--diya-color-surface) 70%, transparent); }
.profile-identity { display: grid; grid-column: 1 / -1; gap: var(--diya-space-2); min-width: 0; }
.profile-name { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--diya-space-1) var(--diya-space-3); margin: 0; font-size: var(--diya-text-display); font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.025em; }
.profile-pronouns { color: var(--diya-color-muted); font-size: var(--diya-text-body); font-weight: 400; letter-spacing: 0; }
.profile-role { margin: 0; font-size: var(--diya-text-large); }
.profile-meta { display: flex; flex-wrap: wrap; gap: var(--diya-space-2) var(--diya-space-5); margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.profile-meta span { display: inline-flex; align-items: center; gap: 6px; }
.profile-actions { display: flex; flex-wrap: wrap; gap: var(--diya-space-3); grid-row: 1; grid-column: 2; }

.profile-tabs { margin-top: var(--diya-space-7); padding-bottom: var(--diya-space-8); }
.profile-overview { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: var(--diya-space-8); padding-top: var(--diya-space-6); }
.profile-column { display: grid; gap: var(--diya-space-7); align-content: start; }
.profile-section, .profile-panel { display: grid; gap: var(--diya-space-4); align-content: start; }
.profile-panel { max-width: 760px; padding-top: var(--diya-space-6); }
.profile-team-head { display: grid; gap: 2px; }
.profile-heading { margin: 0; font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; }
.profile-about { max-width: 36em; margin: 0; font-size: var(--diya-text-large); line-height: 1.6; text-wrap: pretty; }
.profile-muted { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.profile-small { margin-top: 2px; font-size: var(--diya-text-caption); }
.profile-empty {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--diya-space-2); width: 100%; max-width: 36em;
  padding: var(--diya-space-6) var(--diya-space-5); border: 1px dashed color-mix(in srgb, var(--diya-color-text) 22%, transparent);
  border-radius: var(--diya-radius-surface); background: none; color: var(--diya-color-muted); font: inherit; font-size: var(--diya-text-body); cursor: pointer;
}
.profile-empty:hover { color: var(--diya-color-text); border-color: color-mix(in srgb, var(--diya-color-text) 40%, transparent); }
.profile-tags { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); margin: 0; padding: 0; list-style: none; }
.profile-projects { margin: 0; padding: 0; list-style: none; }
.profile-project { display: grid; grid-template-columns: minmax(0, 1fr) 200px; align-items: center; gap: var(--diya-space-5); padding-block: var(--diya-space-4); border-top: 1px solid var(--diya-color-line); }
.profile-project:last-child { border-bottom: 1px solid var(--diya-color-line); }
.profile-project-name { border-radius: 4px; color: inherit; font-size: var(--diya-text-body); font-weight: 550; text-decoration: none; }
.profile-project-name:hover { text-decoration: underline; text-underline-offset: 3px; }
.profile-progress { width: 100%; }
.profile-facts { display: grid; gap: var(--diya-space-4); margin: 0; }
.profile-facts div { display: grid; gap: 4px; }
.profile-facts dt { display: inline-flex; align-items: center; gap: 8px; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.profile-facts dd { margin: 0 0 0 26px; font-size: var(--diya-text-body); overflow-wrap: anywhere; }

.profile-list.profile-list { max-width: none; }
.profile-activity-icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: color-mix(in srgb, var(--diya-color-text) 6%, transparent); color: var(--diya-color-muted); }

.profile-skeleton { display: grid; gap: var(--diya-space-5); padding-block: var(--diya-space-3); }
.profile-skeleton-row { display: flex; align-items: center; gap: var(--diya-space-4); }
.profile-skeleton-text { display: grid; flex: 1; gap: 8px; }
.profile-bone { display: block; height: 14px; border-radius: 6px; background: color-mix(in srgb, var(--diya-color-text) 8%, transparent); animation: profile-pulse 1.4s ease-in-out infinite; }
.profile-bone-short { width: 28%; height: 12px; }
.profile-bone-round { width: 40px; height: 40px; flex: none; border-radius: 50%; }
@keyframes profile-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { .profile-bone { animation: none; } }

.profile-form { display: grid; gap: var(--diya-space-4); }
.profile-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--diya-space-4); }
.profile-pair-wide { grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); }
.profile-drawer-actions { display: flex; justify-content: flex-end; gap: var(--diya-space-3); width: 100%; }

@media (prefers-reduced-transparency: reduce) {
  .profile[data-glass] .profile-band { background: var(--diya-color-raised); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
@media (max-width: 900px) {
  .profile { --profile-gutter: var(--diya-space-5); }
  .profile-overview { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-7); }
}
@media (max-width: 520px) {
  .profile { --profile-gutter: var(--diya-space-4); }
  .profile-band { height: 168px; }
  .profile-head { margin-top: -52px; gap: var(--diya-space-4); }
  .profile-avatar.profile-avatar { width: 104px; height: 104px; font-size: 36px; }
  .profile-name { font-size: 28px; }
  .profile-actions { grid-row: 3; grid-column: 1 / -1; }
  .profile-actions > * { flex: 1; }
  .profile-tabs { margin-top: var(--diya-space-6); }
  .profile-project { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-3); }
  .profile-pair.profile-pair { grid-template-columns: minmax(0, 1fr); }
}
`

'use client'
// Team & roles: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/settings/team/page.tsx. Vite: save as src/Team.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Avatar, Button, Card, ContentState, Dialog, Menu, Progress, Select, SideNavigation, Stack, Table, Tag, TextInput, TextLink, Toast, type AlertTone } from '@idyeah/diya'
import { Bell, Check, CreditCard, Ellipsis, LucideProvider, Menu as MenuIcon, Minus, Palette, Shield, UserPlus, UserRound, Users } from 'lucide-react'

// Your product, the workspace, and what the demo account shows. You are Priya, the only owner.
const PRODUCT = 'Mullion'
const WORKSPACE = 'Bramble & Finch'
const SEATS = 10
const ME = 'priya'

type Role = 'owner' | 'admin' | 'editor' | 'viewer'
const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: 'owner', label: 'Owner', hint: 'Can do everything, including billing and deleting the workspace.' },
  { value: 'admin', label: 'Admin', hint: 'Can invite people, remove them and change their roles.' },
  { value: 'editor', label: 'Editor', hint: 'Can create and edit projects.' },
  { value: 'viewer', label: 'Viewer', hint: 'Can look around and comment, but not edit.' },
]

type Member = { id: string; name: string; email: string; role: Role; seen: string; order: number }
const MEMBERS: Member[] = [
  { id: 'priya', name: 'Priya Natarajan', email: 'priya@example.com', role: 'owner', seen: 'Active now', order: 0 },
  { id: 'tomas', name: 'Tomás Herrera', email: 'tomas@example.com', role: 'admin', seen: '2 hours ago', order: 1 },
  { id: 'amara', name: 'Amara Okafor', email: 'amara@example.com', role: 'editor', seen: 'Yesterday', order: 2 },
  { id: 'kenji', name: 'Kenji Watanabe', email: 'kenji@example.com', role: 'editor', seen: '3 days ago', order: 3 },
  { id: 'leah', name: 'Leah Goldberg', email: 'leah@example.com', role: 'editor', seen: '5 days ago', order: 4 },
  { id: 'noor', name: 'Noor Haddad', email: 'noor@example.com', role: 'viewer', seen: 'Last week', order: 5 },
  { id: 'mateus', name: 'Mateus Silva', email: 'mateus@example.com', role: 'editor', seen: '10 days ago', order: 6 },
  { id: 'daniel', name: 'Daniel Mensah', email: 'daniel@example.com', role: 'viewer', seen: 'Last month', order: 7 },
]

type Invite = { id: string; email: string; role: Role; sent: string }
const INVITES: Invite[] = [{ id: 'sofia', email: 'sofia.lindqvist@example.com', role: 'editor', sent: '2 days ago, by Priya' }]

const PERMISSIONS: { label: string; roles: Role[] }[] = [
  { label: 'See projects and files', roles: ['owner', 'admin', 'editor', 'viewer'] },
  { label: 'Comment and leave reviews', roles: ['owner', 'admin', 'editor', 'viewer'] },
  { label: 'Create and edit projects', roles: ['owner', 'admin', 'editor'] },
  { label: 'Invite and remove people', roles: ['owner', 'admin'] },
  { label: 'Change roles', roles: ['owner', 'admin'] },
  { label: 'Manage billing and the plan', roles: ['owner'] },
  { label: 'Delete the workspace', roles: ['owner'] },
]

const NAV = [
  { id: 'account', label: 'Account', items: [
    { value: 'profile', label: 'Profile', href: '/settings#profile', icon: <UserRound /> },
    { value: 'security', label: 'Security', href: '/settings#security', icon: <Shield /> },
    { value: 'notifications', label: 'Notifications', href: '/settings#notifications', icon: <Bell /> },
    { value: 'appearance', label: 'Appearance', href: '/settings#appearance', icon: <Palette /> },
  ] },
  { id: 'workspace', label: 'Workspace', items: [
    { value: 'billing', label: 'Billing & plan', href: '/settings/billing', icon: <CreditCard /> },
    { value: 'team', label: 'Team', href: '/settings/team', icon: <Users /> },
  ] },
]

type Route = '/invites' | '/invites/resend' | '/invites/revoke' | '/members/role' | '/members/remove'

// Replace with your API call. The stub waits a moment, then can't deliver an
// invite to nobody@example.com. Everything else goes through. Bad addresses,
// people already here and running out of seats are caught before sending.
async function api(route: Route, body: Record<string, unknown> = {}) {
  await new Promise((resolve) => setTimeout(resolve, 700))
  if (route === '/invites') return !(body.emails as string[]).includes('nobody@example.com')
  return true
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const first = (name: string) => name.split(' ')[0]
const roleLabel = (role: Role) => ROLES.find((item) => item.value === role)?.label ?? role
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`

type Notice = { tone: AlertTone; title: string; text: string; id: number }

export default function TeamScreen() {
  const [members, setMembers] = useState(MEMBERS)
  const [invites, setInvites] = useState(INVITES)
  const [removing, setRemoving] = useState<string[]>()
  const [blocked, setBlocked] = useState<Member>()
  const [inviting, setInviting] = useState(false)
  const [emails, setEmails] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [role, setRole] = useState<Role>('editor')
  const [problem, setProblem] = useState<string>()
  const [busy, setBusy] = useState<string>()
  const [left, setLeft] = useState(false)
  const [notice, setNotice] = useState<Notice>()
  const membersRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef<HTMLHeadingElement>(null)
  const leftRef = useRef<HTMLHeadingElement>(null)
  const focus = useFocusAfterRender()
  const owners = members.filter((member) => member.role === 'owner')
  const seatsLeft = SEATS - members.length - invites.length
  const notify = (tone: AlertTone, title: string, text: string) => setNotice({ tone, title, text, id: Date.now() })
  const doomed = members.filter((member) => removing?.includes(member.id))

  useEffect(() => {
    if (left) leftRef.current?.focus()
  }, [left])

  function askRemove(ids: string[]) {
    const keepsOwner = owners.some((owner) => !ids.includes(owner.id))
    if (!keepsOwner) return setBlocked(owners[0])
    setRemoving(ids)
  }

  async function remove() {
    if (!removing) return
    await api('/members/remove', { ids: removing })
    setMembers(members.filter((member) => !removing.includes(member.id)))
    if (removing.includes(ME)) return setLeft(true)
    focus(membersRef.current)
    notify('success', doomed.length === 1 ? `${doomed[0].name} was removed` : `${plural(doomed.length, 'person', 'people')} removed`, `Their projects and files stay with ${WORKSPACE}, and ${plural(doomed.length, 'seat')} opened up.`)
  }

  async function changeRole(member: Member, next: Role) {
    if (member.role === 'owner' && next !== 'owner' && owners.length === 1) return setBlocked(member)
    setMembers((list) => list.map((item) => (item.id === member.id ? { ...item, role: next } : item)))
    await api('/members/role', { id: member.id, role: next })
    notify('success', `${member.id === ME ? 'You’re' : `${first(member.name)} is`} now ${next === 'owner' || next === 'admin' ? 'an' : 'a'} ${roleLabel(next).toLowerCase()}`, ROLES.find((item) => item.value === next)?.hint ?? '')
  }

  // Splits typed or pasted text into addresses. Good ones become tags; the rest stay in the field with a reason.
  function take(text: string) {
    const next = [...emails]
    const rest: string[] = []
    let reason: string | undefined
    for (const email of text.split(/[\s,;]+/).map((part) => part.trim().toLowerCase()).filter(Boolean)) {
      const why = !EMAIL.test(email)
        ? `“${email}” isn’t a complete email address.`
        : members.some((member) => member.email === email)
          ? `${email} is already on the team.`
          : invites.some((invite) => invite.email === email)
            ? `${email} already has an invite. You can resend it from Pending invites.`
            : undefined
      if (why) {
        rest.push(email)
        reason ??= why
      } else if (!next.includes(email)) next.push(email)
    }
    setEmails(next)
    setDraft(rest.join(', '))
    setProblem(reason)
    return { next, ok: !reason }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if ((event.key === 'Enter' || event.key === ',') && draft.trim()) {
      event.preventDefault()
      take(draft)
    } else if (event.key === 'Backspace' && !draft && emails.length) setEmails(emails.slice(0, -1))
  }

  async function send() {
    const { next, ok } = draft.trim() ? take(draft) : { next: emails, ok: true }
    if (!ok) return false
    if (!next.length) {
      setProblem('Add at least one email address.')
      return false
    }
    if (next.length > seatsLeft) {
      setProblem(seatsLeft <= 0
        ? `Every seat is taken. Remove someone, or add seats in Billing & plan.`
        : `You have ${plural(seatsLeft, 'seat')} left, so invite up to ${plural(seatsLeft, 'person', 'people')}, or add seats in Billing & plan.`)
      return false
    }
    if (!(await api('/invites', { emails: next, role }))) {
      setProblem('We couldn’t deliver one of these. Check the spelling of each address, then try again.')
      return false
    }
    setInvites([...next.map((email) => ({ id: email, email, role, sent: 'Just now, by you' })), ...invites])
    notify('success', next.length === 1 ? 'Invite sent' : `${next.length} invites sent`, `${next.join(', ')} can join as ${roleLabel(role).toLowerCase()}${next.length === 1 ? '' : 's'}. The link works for 7 days.`)
  }

  async function resend(invite: Invite) {
    setBusy(invite.id)
    await api('/invites/resend', { id: invite.id })
    setBusy(undefined)
    setInvites((list) => list.map((item) => (item.id === invite.id ? { ...item, sent: 'Just now, by you' } : item)))
    notify('success', 'Invite sent again', `${invite.email} has a fresh link, good for 7 days.`)
  }

  async function revoke(invite: Invite) {
    setBusy(invite.id)
    await api('/invites/revoke', { id: invite.id })
    setBusy(undefined)
    setInvites((list) => list.filter((item) => item.id !== invite.id))
    focus(pendingRef.current)
    notify('info', 'Invite revoked', `The link in ${invite.email}’s inbox no longer works, and the seat is free again.`)
  }

  function openInvite() {
    setEmails([])
    setDraft('')
    setRole('editor')
    setProblem(undefined)
    setInviting(true)
  }

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <div className="team">
        <a className="team-skip" href="#team-main">Skip to content</a>
        <header className="team-side">
          <p className="team-brand">
            <span className="team-mark" aria-hidden="true">{PRODUCT[0]}</span>
            {PRODUCT}
          </p>
          <p className="team-section">Settings</p>
          <SideNavigation className="team-nav" label="Settings" value="team" groups={NAV} />
        </header>

        <main className="team-main" id="team-main" tabIndex={-1}>
          <div className="team-column">
            <div className="team-bar">
              <p className="team-brand">
                <span className="team-mark" aria-hidden="true">{PRODUCT[0]}</span>
                {PRODUCT}
              </p>
              <Menu label="Settings sections" triggerIcon={<MenuIcon />} items={NAV.flatMap((group) => group.items.map((item) => ({ id: item.value, label: item.label, icon: item.icon, href: item.href, current: item.value === 'team' })))} />
            </div>
            {left ? (
              <div className="team-head">
                <h1 ref={leftRef} tabIndex={-1} className="team-title">You left {WORKSPACE}</h1>
                <p className="team-lede">Your own projects and files stay with the team. An owner can invite you back anytime.</p>
              </div>
            ) : (
              <Stack gap={7}>
                <header className="team-top">
                  <div className="team-head">
                    <h1 className="team-title">Team</h1>
                    <p className="team-lede">Everyone in {WORKSPACE}, and what they can do.</p>
                  </div>
                  <Button className="team-invite" onClick={openInvite}><UserPlus /> Invite people</Button>
                  <div className="team-seats">
                    <p className="team-seat-count">
                      <strong>{SEATS - seatsLeft} of {SEATS} seats used</strong>
                      <span>{plural(members.length, 'member')}{invites.length > 0 && `, ${plural(invites.length, 'invite')}`}</span>
                    </p>
                    <Progress className="team-wide" label={`Seats used: ${SEATS - seatsLeft} of ${SEATS}`} value={((SEATS - seatsLeft) / SEATS) * 100} showValue={false} />
                    <p className="team-note">
                      {seatsLeft > 0 ? `${plural(seatsLeft, 'seat')} left.` : 'Every seat is taken.'} <TextLink href="/settings/billing" inline>Add seats</TextLink>
                    </p>
                  </div>
                </header>

                <div ref={membersRef} tabIndex={-1} className="team-members">
                  {members.length === 1 ? (
                    <ContentState
                      className="team-wide"
                      headingLevel={2}
                      icon={<Users />}
                      title="It’s just you for now"
                      description={`Invite your team to share projects, files and reviews. You have ${plural(seatsLeft, 'seat')} free.`}
                      action={{ label: 'Invite people', onClick: openInvite }}
                    />
                  ) : (
                    <>
                    <div className="team-desk">
                    <Table
                      label="Members"
                      headingLevel={2}
                      rows={members}
                      rowLabel={(member) => member.name}
                      pagination={false}
                      bulkActions={[{ label: 'Remove from team', destructive: true, onAction: (ids) => askRemove(ids.filter((id) => id !== ME)) }]}
                      rowActions={(member) => [
                        member.id === ME
                          ? { id: 'leave', label: 'Leave team', onSelect: () => askRemove([ME]) }
                          : { id: 'remove', label: 'Remove from team', destructive: true, onSelect: () => askRemove([member.id]) },
                      ]}
                      columns={[
                        {
                          key: 'name',
                          label: 'Name',
                          width: 250,
                          sortValue: (member) => member.name,
                          render: (member) => (
                            <span className="team-person">
                              <Avatar name={member.name} size="small" />
                              <span>{member.name}</span>
                              {member.id === ME && <Tag size="small">You</Tag>}
                            </span>
                          ),
                        },
                        { key: 'email', label: 'Email', width: 230, render: (member) => member.email, sortValue: (member) => member.email },
                        {
                          key: 'role',
                          label: 'Role',
                          width: 150,
                          sortValue: (member) => ROLES.findIndex((item) => item.value === member.role),
                          render: (member) => (
                            <Select size="small" hideLabel label={`Role for ${member.name}`} options={ROLES} value={member.role} onValueChange={(value) => changeRole(member, value as Role)} />
                          ),
                        },
                        { key: 'seen', label: 'Last active', width: 130, render: (member) => member.seen, sortValue: (member) => member.order },
                      ]}
                    />
                    </div>
                    {/* Phones get the same members as stacked rows, so no column is cut off. */}
                    <section className="team-phone" aria-labelledby="team-members-phone">
                      <h2 id="team-members-phone" className="team-subtitle">Members</h2>
                      <ul className="team-rows">
                        {members.map((member) => (
                          <li key={member.id} className="team-row">
                            <Avatar name={member.name} size="small" />
                            <span className="team-row-text">
                              <span className="team-row-name"><span>{member.name}</span>{member.id === ME && <Tag size="small">You</Tag>}</span>
                              <span className="team-row-meta">{member.email}</span>
                            </span>
                            <span className="team-row-role">
                              <Select size="small" hideLabel label={`Role for ${member.name}`} options={ROLES} value={member.role} onValueChange={(value) => changeRole(member, value as Role)} />
                            </span>
                            <Menu label={`More for ${member.name}`} triggerIcon={<Ellipsis />} items={[
                              member.id === ME
                                ? { id: 'leave', label: 'Leave team', onSelect: () => askRemove([ME]) }
                                : { id: 'remove', label: 'Remove from team', destructive: true, onSelect: () => askRemove([member.id]) },
                            ]} />
                          </li>
                        ))}
                      </ul>
                    </section>
                    </>
                  )}
                </div>

                <section className="team-block" aria-labelledby="team-pending">
                  <h2 id="team-pending" ref={pendingRef} tabIndex={-1} className="team-subtitle">Pending invites</h2>
                  {invites.length === 0 ? (
                    <p className="team-note">No pending invites. Everyone you’ve invited has joined, which is nice.</p>
                  ) : (
                    <>
                    <div className="team-desk">
                    <Table
                      label="Pending invites"
                      showTitle={false}
                      rows={invites}
                      rowLabel={(invite) => invite.email}
                      pagination={false}
                      columns={[
                        { key: 'email', label: 'Email', width: 260, render: (invite) => invite.email },
                        { key: 'role', label: 'Role', width: 110, render: (invite) => roleLabel(invite.role) },
                        { key: 'sent', label: 'Sent', width: 150, render: (invite) => invite.sent },
                        {
                          key: 'actions',
                          label: 'Actions',
                          width: 200,
                          render: (invite) => (
                            <span className="team-actions">
                              <Button size="small" variant="outline" loading={busy === invite.id} aria-label={`Resend invite to ${invite.email}`} onClick={() => resend(invite)}>Resend</Button>
                              <Button size="small" variant="quiet" disabled={busy === invite.id} aria-label={`Revoke invite to ${invite.email}`} onClick={() => revoke(invite)}>Revoke</Button>
                            </span>
                          ),
                        },
                      ]}
                    />
                    </div>
                    <ul className="team-rows team-phone" aria-label="Pending invites">
                      {invites.map((invite) => (
                        <li key={invite.id} className="team-row team-row-invite">
                          <span className="team-row-text">
                            <span className="team-row-name">{invite.email}</span>
                            <span className="team-row-meta">{roleLabel(invite.role)} · Sent {invite.sent.charAt(0).toLowerCase() + invite.sent.slice(1)}</span>
                          </span>
                          <span className="team-actions">
                            <Button size="small" variant="outline" loading={busy === invite.id} aria-label={`Resend invite to ${invite.email}`} onClick={() => resend(invite)}>Resend</Button>
                            <Button size="small" variant="quiet" disabled={busy === invite.id} aria-label={`Revoke invite to ${invite.email}`} onClick={() => revoke(invite)}>Revoke</Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                    </>
                  )}
                </section>

                <Card headingLevel={2} title="Roles" description="What each role can do. Everyone uses a seat, whatever their role.">
                  <dl className="team-role-list">
                    {ROLES.map((item) => (
                      <div key={item.value}>
                        <dt>{item.label}</dt>
                        <dd>{item.hint}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="team-scroll" role="region" aria-label="What each role can do" tabIndex={0}>
                    <table className="team-grid">
                      <caption className="team-hidden">What each role can do</caption>
                      <thead>
                        <tr>
                          <th scope="col"><span className="team-hidden">Permission</span></th>
                          {ROLES.map((item) => <th key={item.value} scope="col">{item.label}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {PERMISSIONS.map((permission) => (
                          <tr key={permission.label}>
                            <th scope="row">{permission.label}</th>
                            {ROLES.map((item) => (
                              <td key={item.value}>
                                {permission.roles.includes(item.value) ? <Check className="team-yes" /> : <Minus className="team-no" />}
                                <span className="team-hidden">{permission.roles.includes(item.value) ? 'Yes' : 'No'}</span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </Stack>
            )}
          </div>
        </main>

        <Dialog
          open={inviting}
          onOpenChange={(open) => !open && setInviting(false)}
          title="Invite people"
          headingLevel={2}
          description={`They’ll get an email with a link to join ${WORKSPACE}. ${seatsLeft > 0 ? `You have ${plural(seatsLeft, 'seat')} left.` : 'Every seat is taken right now.'}`}
          confirmLabel={emails.length > 1 ? `Send ${emails.length} invites` : 'Send invite'}
          onConfirm={send}
        >
          <Stack gap={4}>
            <TextInput
              label="Email addresses"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              helperText="Press Enter or a comma after each one. Pasting a list works too."
              value={draft}
              error={problem}
              onKeyDown={onKeyDown}
              onValueChange={(value) => {
                setProblem(undefined)
                if (/[\s,;]/.test(value.trim())) take(value)
                else setDraft(value)
              }}
            />
            {emails.length > 0 && (
              <ul className="team-tags" aria-label="People to invite">
                {emails.map((email) => (
                  <li key={email}>
                    <Tag label={email} onRemove={() => setEmails(emails.filter((item) => item !== email))}>{email}</Tag>
                  </li>
                ))}
              </ul>
            )}
            <Select
              label="Role"
              options={ROLES.filter((item) => item.value !== 'owner')}
              helperText={ROLES.find((item) => item.value === role)?.hint}
              value={role}
              onValueChange={(value) => setRole(value as Role)}
            />
          </Stack>
        </Dialog>

        <Dialog
          open={removing !== undefined}
          onOpenChange={(open) => !open && setRemoving(undefined)}
          title={removing?.includes(ME) ? `Leave ${WORKSPACE}?` : doomed.length === 1 ? `Remove ${doomed[0].name}?` : `Remove ${plural(doomed.length, 'person', 'people')}?`}
          headingLevel={2}
          description={removing?.includes(ME)
            ? 'You lose access right away. Your projects and files stay with the team.'
            : `${doomed.length === 1 ? `${first(doomed[0].name)} loses` : 'They lose'} access right away. Their projects and files stay with ${WORKSPACE}, and ${plural(doomed.length, 'seat')} ${doomed.length === 1 ? 'opens' : 'open'} up.`}
          confirmLabel={removing?.includes(ME) ? 'Leave team' : doomed.length === 1 ? 'Remove' : `Remove ${doomed.length}`}
          confirmVariant="destructive"
          onConfirm={remove}
        />

        <Dialog
          open={blocked !== undefined}
          onOpenChange={(open) => !open && setBlocked(undefined)}
          title={`${WORKSPACE} needs an owner`}
          headingLevel={2}
          description={`${blocked?.id === ME ? 'You’re' : `${blocked?.name} is`} the only owner, so ${blocked?.id === ME ? 'you' : 'they'} can’t leave or take another role yet. Make someone else an owner first, with the Role menu in their row.`}
          dismissLabel="Got it"
        />

        {notice && (
          <Toast key={notice.id} tone={notice.tone} title={notice.title} duration={6000} onDismiss={() => setNotice(undefined)}>
            {notice.text}
          </Toast>
        )}
      </div>
    </LucideProvider>
  )
}

function useFocusAfterRender() {
  const [target, setTarget] = useState<{ node: HTMLElement | null }>()
  useEffect(() => target?.node?.focus(), [target])
  return (node: HTMLElement | null) => setTarget({ node })
}

const css = `
.team { min-height: 100dvh; display: grid; grid-template-columns: 272px minmax(0, 1fr); color: var(--diya-color-text); }
.team-skip { position: absolute; z-index: 10; top: var(--diya-space-3); left: var(--diya-space-4); padding: var(--diya-space-2) var(--diya-space-4); border-radius: var(--diya-radius-control); background: var(--diya-color-raised); color: var(--diya-color-text); font-size: var(--diya-text-body); }
.team-skip:not(:focus) { width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.team-side { position: sticky; top: 0; display: flex; flex-direction: column; gap: var(--diya-space-5); height: 100dvh; box-sizing: border-box; overflow-y: auto; padding: var(--diya-space-6) var(--diya-space-4); }
.team-brand { display: flex; align-items: center; gap: var(--diya-space-3); margin: 0; padding: 0 var(--diya-space-3); font-size: var(--diya-text-large); font-weight: 600; }
.team-mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: calc(10px * var(--diya-corner-scale, 1)); background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-large); font-weight: 650; line-height: 1; }
.team-section,
.team-title { margin: 0; font-size: 28px; font-weight: 600; line-height: var(--diya-leading-tight); letter-spacing: -0.02em; }
.team-section { margin-top: var(--diya-space-5); padding: 0 var(--diya-space-3); }
.team-title:focus,
.team-subtitle:focus,
.team-members:focus,
.team-main:focus { outline: none; }
.team-nav { width: auto; padding: 0; border: 0; background: transparent; backdrop-filter: none; }
.team-main { min-width: 0; padding: 112px var(--diya-space-7) var(--diya-space-8); border-left: 1px solid var(--diya-color-line); }
.team-column { max-width: 880px; }
.team-bar,
.team-phone,
.team-role-list { display: none; }
.team-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: var(--diya-space-6) var(--diya-space-5); }
.team-head { display: grid; gap: var(--diya-space-2); }
.team-lede,
.team-note { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); line-height: var(--diya-leading-body); text-wrap: pretty; }
.team-seats { grid-column: 1 / -1; display: grid; gap: var(--diya-space-2); max-width: 420px; }
.team-seat-count { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--diya-space-1) var(--diya-space-3); margin: 0; font-size: var(--diya-text-body); }
.team-seat-count span { color: var(--diya-color-muted); }
.team-note { font-size: var(--diya-text-caption); }
.team-wide { width: 100%; max-width: none; }
.team-person { display: inline-flex; align-items: center; gap: var(--diya-space-3); font-weight: 500; }
.team-block { display: grid; gap: var(--diya-space-4); }
.team-subtitle { margin: 0; font-size: var(--diya-text-body); font-weight: 600; line-height: var(--diya-leading-tight); }
.team-actions { display: inline-flex; gap: var(--diya-space-2); }
.team-scroll { position: relative; overflow-x: auto; border-radius: var(--diya-radius-control); }
.team-scroll:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: 2px; }
.team-grid { width: 100%; min-width: 480px; border-collapse: collapse; font-size: var(--diya-text-body); }
.team-grid th,
.team-grid td { padding: var(--diya-space-3) var(--diya-space-2); border-bottom: 1px solid var(--diya-color-line); text-align: center; }
.team-grid tr:last-child > * { border-bottom: 0; }
.team-grid th[scope='row'],
.team-grid thead th:first-child { width: 44%; padding-left: 0; text-align: left; font-weight: 400; }
.team-grid thead th { color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-weight: 500; }
.team-yes { vertical-align: middle; }
.team-no { vertical-align: middle; color: var(--diya-color-muted); opacity: 0.6; }
.team-tags { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); margin: 0; padding: 0; list-style: none; }
.team-rows { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--diya-color-line); }
.team-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: var(--diya-space-3); padding: var(--diya-space-3) 0; border-bottom: 1px solid var(--diya-color-line); }
.team-row-role { width: 112px; }
.team-row-invite { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-2); }
.team-row-text { display: grid; gap: 2px; min-width: 0; }
.team-row-name { display: flex; flex-wrap: wrap; align-items: center; gap: 2px var(--diya-space-2); min-width: 0; font-size: var(--diya-text-body); font-weight: 500; overflow-wrap: anywhere; }
.team-row-meta { overflow: hidden; color: var(--diya-color-muted); font-size: var(--diya-text-caption); text-overflow: ellipsis; white-space: nowrap; }
.team-role-list { gap: var(--diya-space-4); margin: 0; }
.team-role-list div { display: grid; gap: 2px; }
.team-role-list dt { font-size: var(--diya-text-body); font-weight: 500; }
.team-role-list dd { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: var(--diya-leading-body); }
.team-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 860px) {
  .team { grid-template-columns: minmax(0, 1fr); }
  .team-side { display: none; }
  .team-main { padding: 0 var(--diya-space-4) var(--diya-space-7); border-left: 0; }
  .team-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-4); height: 56px; margin-bottom: var(--diya-space-5); }
  .team-bar .team-brand { padding: 0; }
}
@media (max-width: 640px) {
  .team-desk,
  .team-scroll { display: none; }
  .team-phone { display: grid; gap: var(--diya-space-4); }
  ul.team-phone { display: block; }
  .team-role-list { display: grid; }
}
@media (max-width: 560px) {
  .team-top { grid-template-columns: minmax(0, 1fr); }
  .team-invite { justify-self: start; }
}
`

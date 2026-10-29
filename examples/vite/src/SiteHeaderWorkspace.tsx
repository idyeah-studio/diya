// Shared composition from the portable Site Header recipe.
import React, { useState, useRef } from 'react'
import { SiteHeader, Avatar, Menu, List, ContentState, Button, Card, Tag, Dialog } from '@idyeah/diya'
import '@idyeah/diya/styles.css'

export default function Demo() {
  const [section, setSection] = useState('projects')
  const [query, setQuery] = useState('')
  const [summaries, setSummaries] = useState(true)
  const [unread, setUnread] = useState(true)
  const [owners, setOwners] = useState(true)
  const [panel, setPanel] = useState<string | null>(null)
  const frame = useRef<HTMLDivElement>(null)
  const projects = [
    { id: 'nuvio', name: 'Nuvio', summary: 'A calmer workspace for planning team projects.', owner: 'Alex Morgan', status: 'In progress', tone: 'info', milestone: 'Workspace review · Oct 22' },
    { id: 'avyra', name: 'Avyra', summary: 'A welcoming onboarding flow for new members.', owner: 'Samira Chen', status: 'In review', tone: 'warning', milestone: 'Flow review · Oct 23' },
    { id: 'kelmio', name: 'Kelmio', summary: 'Clear reporting for a growing product team.', owner: 'Eli Brooks', status: 'Ready', tone: 'success', milestone: 'Team walkthrough · Oct 24' },
  ] as const
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const matches = projects.filter(project => terms.every(term => (project.name + ' ' + project.summary + ' ' + project.owner + ' ' + project.status).toLowerCase().includes(term)))
  const activeProject = projects.find(project => project.id === panel)
  return <div className="diya-header-example" ref={frame}>
    <style>{'.diya-header-example{container-type:inline-size;border:1px solid var(--diya-color-line);border-radius:16px;overflow:clip;background:var(--diya-color-surface)}.diya-header-example-body{padding:24px;min-height:240px}.diya-header-example-heading{margin:0 0 8px;font-size:24px;line-height:32px}.diya-header-example-body>p{margin:0 0 24px;color:var(--diya-color-muted);font-size:14px;line-height:1.6}.diya-header-example-projects{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:16px}.diya-header-example-meta{display:grid;gap:16px;font-size:13px;line-height:1.5;color:var(--diya-color-muted)}.diya-header-example-owner{display:flex;align-items:center;gap:8px}@container(max-width:640px){.diya-header-example-body{padding:24px 16px}}'}</style>
    <SiteHeader brand="Veylo" brandLabel="Veylo home" onBrandClick={() => { setSection('projects'); setQuery('') }}
      items={['Projects', 'Activity', 'People'].map(label => ({ value: label.toLowerCase(), label }))}
      value={section} onValueChange={setSection}
      navigationLabel="Veylo navigation"
      search={{ value: query, onValueChange: value => { setQuery(value); setSection('projects') }, onSubmit: () => setSection('projects'), label: 'Search projects', placeholder: 'Search projects' }}
      utilities={<Menu label={unread ? 'Notifications, 1 unread' : 'Notifications, 0 unread'} triggerIcon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>} items={unread ? [
        { id: 'review', label: 'Review the Avyra signup flow', onSelect: () => { setUnread(false); setPanel('avyra') } },
        { id: 'read', label: 'Mark as read', onSelect: () => setUnread(false) },
      ] : [{ id: 'read', label: 'You are all caught up', disabled: true, onSelect: () => {} }]} />}
      avatar={<Menu label="Account for Alex Morgan" triggerIcon={<Avatar name="Alex Morgan" size="small" />} items={[
        { id: 'profile', label: 'View profile', onSelect: () => setPanel('profile') },
        { id: 'summaries', label: 'Show project summaries', type: 'checkbox', checked: summaries, onSelect: () => setSummaries(value => !value) },
        { id: 'owners', label: 'Show project owners', type: 'checkbox', checked: owners, onSelect: () => setOwners(value => !value) },
        { id: 'help', label: 'Search tips', onSelect: () => setPanel('help') },
      ]} />} />
    <section className="diya-header-example-body" aria-label="Workspace content">
      <h3 className="diya-header-example-heading">{section[0].toUpperCase() + section.slice(1)}</h3>
      <p>{section === 'projects' ? 'Keep your team’s next steps in view.' : section === 'people' ? 'A small team with a shared focus.' : 'Recent updates from your team.'}</p>
      {section === 'projects' && <p role="status" aria-label="Project search results">{matches.length} {matches.length === 1 ? 'project' : 'projects'}{query.trim() ? ' found' : ''}</p>}
      {section === 'projects' && (matches.length ? <div className="diya-header-example-projects">{matches.map(project => <Card key={project.id} title={project.name} description={summaries ? project.summary : undefined} tags={<Tag label={project.name + ' status'} tone={project.tone} size="small">{project.status}</Tag>} footer={<Button variant="quiet" size="small" aria-label={'View ' + project.name} onClick={() => setPanel(project.id)}>View project</Button>}><div className="diya-header-example-meta">{owners && <span className="diya-header-example-owner"><Avatar name={project.owner} size="small" />{project.owner}</span>}<span>{project.milestone}</span></div></Card>)}</div> : <ContentState title="No matching projects" description="Try another project name, owner, or keyword." action={{ label: 'Clear search', onClick: () => { setQuery(''); frame.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus() } }} />)}
      {section === 'activity' && <List label="Team activity" divided items={[
        { id: 'review', label: 'Samira shared feedback on Avyra', description: 'Signup flow review · 12 min ago', onSelect: () => setPanel('avyra') },
        { id: 'ready', label: 'Eli prepared Kelmio for review', description: 'Reporting views · 38 min ago', onSelect: () => setPanel('kelmio') },
      ]} />}
      {section === 'people' && <List label="Workspace people" divided items={projects.map(project => ({ id: project.owner, label: project.owner, description: project.name, leading: <Avatar name={project.owner} size="small" /> }))} />}
    </section>
    <Dialog open={panel !== null} onOpenChange={open => { if (!open) setPanel(null) }} title={activeProject?.name ?? (panel === 'profile' ? 'Alex Morgan' : 'Search tips')} description={activeProject?.summary} size="small">
      {activeProject ? <><p>Owner: {activeProject.owner}</p><p>Status: {activeProject.status}</p><p>{activeProject.milestone}</p></> : panel === 'profile' ? <p>Product designer · Alex owns Nuvio and works with Samira and Eli.</p> : <p>Search by project name, owner, status, or a word in its summary. Clear the query to see every project.</p>}
    </Dialog>
  </div>
}


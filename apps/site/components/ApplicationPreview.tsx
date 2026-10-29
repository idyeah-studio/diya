'use client'
import { useRef, useState } from 'react'
import {
  Accordion,
  Avatar,
  Chatbot,
  Dialog,
  Inline,
  List,
  Menu,
  SideNavigation,
  Switch,
  type ChatMessage,
} from '@idyeah/diya'
import { Icon } from './Icon'
type Props = {
  pattern: 'chatbot' | 'side-navigation'
  layout: 'Embedded' | 'Floating' | 'Full-page'
  suggestions: boolean
  showTimestamps: boolean
  collapsed: boolean
  groups: boolean
  /** Side Navigation item counts. */
  counts?: boolean
}
export function ApplicationPreview(p: Props) {
  const [value, setValue] = useState(''),
    [attachments, setAttachments] = useState<File[]>([]),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [open, setOpen] = useState(true),
    [section, setSection] = useState('projects')
  const sequence = useRef(0)
  const [notifications, setNotifications] = useState(true)
  const [project, setProject] = useState<string | null>(null)
  const projects = [
    { id: 'nuvio', label: 'Nuvio', description: 'Workspace planning · Alex Morgan' },
    { id: 'avyra', label: 'Avyra', description: 'Onboarding review · Samira Chen' },
    { id: 'kelmio', label: 'Kelmio', description: 'Reporting walkthrough · Eli Brooks' },
  ]
  if (p.pattern === 'chatbot') {
    const chat = (
      <Chatbot
        title="Project assistant"
        description="A conversation pattern for your app."
        layout={p.layout.toLowerCase() as 'embedded' | 'floating' | 'full-page'}
        showTimestamps={p.showTimestamps}
        messages={messages}
        value={value}
        onValueChange={setValue}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        open={open}
        onOpenChange={setOpen}
        suggestions={
          p.suggestions
            ? ['Summarize project updates', 'Help me plan the next step', 'Find a project file']
            : []
        }
        welcome="What would you like to work on?"
        notice="Locally scripted preview · No AI service is connected."
        onSend={(text, files) => {
          const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
          setMessages((items) => [
            ...items,
            {
              id: String(++sequence.current),
              role: 'user',
              text:
                text +
                (files.length ? ` · Attached: ${files.map((file) => file.name).join(', ')}` : ''),
              timestamp,
            },
            {
              id: String(++sequence.current),
              role: 'assistant',
              timestamp,
              text: text.toLowerCase().includes('file')
                ? 'Example reply: Nuvio has a project brief, Avyra has review notes, and Kelmio has a walkthrough checklist.'
                : text.toLowerCase().includes('next') || text.toLowerCase().includes('plan')
                  ? 'Example reply: Review the Avyra feedback, confirm Nuvio’s scope, then walk through Kelmio with the team.'
                  : 'Example reply: Nuvio is in progress, Avyra is in review, and Kelmio is ready for a walkthrough.',
            },
          ])
          setValue('')
          setAttachments([])
        }}
      />
    )
    // Full-page fills the height it is given: here, a frame about the height of the screen.
    return p.layout === 'Full-page' ? <div className="catalog-chat-page">{chat}</div> : chat
  }
  const count = (value: number) => (p.counts ? value : undefined)
  const account = (
    <Menu
      label="Account for Alex Morgan"
      triggerIcon={<Avatar name="Alex Morgan" size="small" />}
      items={[
        { id: 'profile', label: 'View profile', onSelect: () => setSection('people') },
        { id: 'settings', label: 'Account settings', onSelect: () => setSection('settings') },
      ]}
    />
  )
  return (
    <div className="catalog-navigation-demo">
      <SideNavigation
        brand="Veylo"
        collapsedBrand="v."
        footer={<Inline gap={2}>{account}<span>Alex Morgan</span></Inline>}
        collapsedFooter={account}
        collapsed={p.collapsed}
        showGroups={p.groups}
        value={section}
        onValueChange={setSection}
        groups={[
          {
            id: 'work',
            label: 'Work',
            items: [
              { value: 'projects', label: 'Projects', icon: <Icon name="layers" />, count: count(4) },
              { value: 'activity', label: 'Activity', icon: <Icon name="activity" />, count: count(128) },
              { value: 'people', label: 'People', icon: <Icon name="users" /> },
            ],
          },
          {
            id: 'preferences',
            label: 'Preferences',
            items: [
              { value: 'settings', label: 'Settings', icon: <Icon name="settings" /> },
              { value: 'support', label: 'Support', icon: <Icon name="help" /> },
            ],
          },
        ]}
      />
      <section
        className="catalog-navigation-content"
        aria-label={`${section[0].toUpperCase() + section.slice(1)} workspace`}
      >
        <h3>{section[0].toUpperCase() + section.slice(1)}</h3>
        {section === 'projects' && (
          <List
            label="Workspace projects"
            divided
            items={projects.map((item) => ({ ...item, onSelect: () => setProject(item.label) }))}
          />
        )}
        {section === 'activity' && (
          <List
            label="Recent workspace activity"
            divided
            items={[
              {
                id: 'review',
                label: 'Samira reviewed Avyra',
                description: 'Signup flow · Today',
                onSelect: () => setProject('Avyra'),
              },
              {
                id: 'walkthrough',
                label: 'Eli prepared Kelmio',
                description: 'Team walkthrough · Yesterday',
                onSelect: () => setProject('Kelmio'),
              },
            ]}
          />
        )}
        {section === 'people' && (
          <List
            label="Workspace people"
            divided
            items={[
              { id: 'alex', label: 'Alex Morgan', description: 'Product designer · Nuvio' },
              { id: 'samira', label: 'Samira Chen', description: 'Design lead · Avyra' },
              { id: 'eli', label: 'Eli Brooks', description: 'Front-end engineer · Kelmio' },
            ]}
          />
        )}
        {section === 'settings' && (
          <>
            <Switch
              label="Email notifications"
              checked={notifications}
              onCheckedChange={setNotifications}
              helperText="A summary of project updates."
            />
            <p role="status">
              Notification summaries are {notifications ? 'on' : 'off'} in this preview.
            </p>
          </>
        )}
        {section === 'support' && (
          <Accordion
            divided
            items={[
              {
                id: 'navigate',
                label: 'How do I find my projects?',
                content:
                  'Choose Projects to browse the workspace. Select a project to see its owner and current focus.',
              },
              {
                id: 'preview',
                label: 'Where are changes saved?',
                content:
                  'These fictional records and preferences stay in this local preview. No account or remote workspace is changed.',
              },
            ]}
          />
        )}
      </section>
      <Dialog
        open={project !== null}
        onOpenChange={(open) => {
          if (!open) setProject(null)
        }}
        title={project ?? 'Project details'}
        size="small"
      >
        <List
          label="Project details"
          items={[
            {
              id: 'owner',
              label: 'Owner',
              description: projects
                .find((item) => item.label === project)
                ?.description.split(' · ')[1],
            },
            {
              id: 'focus',
              label: 'Current focus',
              description:
                project === 'Avyra'
                  ? 'Incorporate feedback on the signup flow.'
                  : project === 'Kelmio'
                    ? 'Review reporting views with the team.'
                    : 'Confirm the workspace scope and next milestone.',
            },
          ]}
        />
      </Dialog>
    </div>
  )
}

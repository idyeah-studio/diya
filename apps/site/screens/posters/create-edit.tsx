'use client'
// Create & edit: a poster for a DIYA screen that waits on a rich-text editor. Thumbnail only; never offered as code.
import { Button, DatePicker, Prose, Select, Switch, Tag, TextInput } from '@idyeah/diya'
import {
  ArrowLeft,
  Bold,
  ChevronDown,
  Code,
  Eye,
  Globe,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  LucideProvider,
  Plus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react'
import type { ReactNode } from 'react'

const PUBLICATION = 'Plinth'
const TAGS = ['Houses', 'Daylight', 'Small spaces']
const VISIBILITY = [
  { value: 'public', label: 'Everyone' },
  { value: 'members', label: 'Members only' },
  { value: 'paid', label: 'Paid members' },
]
const TIMES = ['8:00 AM', '9:00 AM', '10:00 AM', '12:00 PM'].map((time) => ({ value: time, label: time }))

// Every tool shows on a wide screen; a phone keeps the ones marked `phone`.
type Tool = { label: string; icon: ReactNode; pressed?: boolean; phone?: boolean }
const TOOLS: Tool[][] = [
  [
    { label: 'Bold', icon: <Bold />, pressed: true, phone: true },
    { label: 'Italic', icon: <Italic />, phone: true },
    { label: 'Strikethrough', icon: <Strikethrough /> },
    { label: 'Inline code', icon: <Code /> },
  ],
  [
    { label: 'Heading 2', icon: <Heading2 /> },
    { label: 'Heading 3', icon: <Heading3 /> },
  ],
  [
    { label: 'Bulleted list', icon: <List />, phone: true },
    { label: 'Numbered list', icon: <ListOrdered /> },
    { label: 'Quote', icon: <Quote /> },
  ],
  [
    { label: 'Link', icon: <Link />, phone: true },
    { label: 'Image', icon: <Image />, phone: true },
  ],
  [
    { label: 'Undo', icon: <Undo2 /> },
    { label: 'Redo', icon: <Redo2 /> },
  ],
]
const wideOnly = (shown?: boolean) => (shown ? '' : ' create-edit-poster-wide-only')

export default function CreateEditPoster() {
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <div className="create-edit-poster">
        <header className="create-edit-poster-bar">
          <div className="create-edit-poster-where">
            <Button variant="quiet" iconOnly aria-label="All posts">
              <ArrowLeft />
            </Button>
            <span className="create-edit-poster-crumb">{PUBLICATION}</span>
            <span className="create-edit-poster-slash" aria-hidden="true">/</span>
            <h1 className="create-edit-poster-title">New post</h1>
          </div>
          <div className="create-edit-poster-actions">
            <Button variant="quiet" className="create-edit-poster-wide-only">
              <Eye /> Preview
            </Button>
            <Button variant="outline" className="create-edit-poster-wide-only">Save draft</Button>
            <Button>Publish</Button>
          </div>
        </header>

        <div className="create-edit-poster-work">
          <main className="create-edit-poster-editor">
            <div className="create-edit-poster-toolbar" role="toolbar" aria-label="Formatting">
              <button type="button" className="create-edit-poster-style">
                Paragraph <ChevronDown />
              </button>
              {TOOLS.map((group, index) => (
                <div key={index} className={`create-edit-poster-group${wideOnly(group.some((tool) => tool.phone))}`}>
                  {group.map((tool) => (
                    <Button key={tool.label} variant="quiet" shape="rounded" size="small" iconOnly aria-label={tool.label}
                      aria-pressed={tool.pressed} className={`create-edit-poster-tool${wideOnly(tool.phone)}`}>
                      {tool.icon}
                    </Button>
                  ))}
                </div>
              ))}
            </div>

            <article className="create-edit-poster-page" aria-label="Post">
              <p className="create-edit-poster-headline">A house built around one window</p>
              <p className="create-edit-poster-dek">
                Lucía Ferreira had a narrow lot, a modest budget and one rule: every room gets the morning.
              </p>
              <p className="create-edit-poster-byline">By Priya Natarajan · 6 min read · 1,184 words</p>
              <Prose className="create-edit-poster-body">
                <p>
                  When she bought the lot at the end of the lane, the neighbors assumed she’d build up. She built toward
                  the light instead: one tall window facing southeast, and a plan that follows the sun from breakfast
                  to dinner.
                </p>
                <h2>Start with the morning</h2>
                <p>
                  The kitchen sits exactly where the light lands at seven. “I wanted to wake up and find the house
                  already warm,” Ferreira says. Her architect, <a href="#jun-watanabe">Jun Watanabe</a>, drew the
                  window first and the walls second, then spent a winter moving <em>cardboard</em> furniture around a
                  scale model.
                </p>
                <ul>
                  <li><strong>Kitchen:</strong> first light, from 6:40 a.m.</li>
                  <li><strong>Reading nook:</strong> midday, tucked under the sill</li>
                  <li><strong>Dining table:</strong> the last warm hour, around five</li>
                </ul>
                <blockquote>
                  <p>Decide what the light is for before you decide what the room is for.</p>
                </blockquote>
                <p>
                  None of it was expensive. The window is one standard size, ordered twice and stacked, and the stairs
                  <strong> double as a bookshelf</strong>
                  <span className="create-edit-poster-caret" aria-hidden="true" />
                </p>
              </Prose>
            </article>
          </main>

          <aside className="create-edit-poster-side" aria-label="Post settings">
            <section className="create-edit-poster-section" aria-labelledby="create-edit-poster-status">
              <div className="create-edit-poster-status">
                <h2 id="create-edit-poster-status" className="create-edit-poster-label">Status</h2>
                <Tag leading="dot">Draft</Tag>
              </div>
              <p className="create-edit-poster-note">Last saved at 9:41 AM by you.</p>
            </section>

            <section className="create-edit-poster-section" aria-labelledby="create-edit-poster-publish">
              <h2 id="create-edit-poster-publish" className="create-edit-poster-label">Publishing</h2>
              <Select label="Who can read it" options={VISIBILITY} defaultValue="public" leadingIcon={<Globe />} />
              <div className="create-edit-poster-pair">
                <DatePicker label="Publish on" defaultValue="2026-11-10" />
                <Select label="Time" options={TIMES} defaultValue="9:00 AM" />
              </div>
              <Switch label="Email it to 4,812 subscribers" defaultChecked />
            </section>

            <section className="create-edit-poster-section" aria-labelledby="create-edit-poster-cover">
              <h2 id="create-edit-poster-cover" className="create-edit-poster-label">Cover image</h2>
              <div className="create-edit-poster-cover" role="img" aria-label="Morning light through a tall arched window, falling across a pale floor" />
              <div className="create-edit-poster-file">
                <span>window-at-seven.jpg</span>
                <Button variant="quiet" size="small" className="create-edit-poster-flush">Replace</Button>
              </div>
              <TextInput label="Alt text" defaultValue="Morning light through an arched window" />
            </section>

            <section className="create-edit-poster-section" aria-labelledby="create-edit-poster-tags">
              <h2 id="create-edit-poster-tags" className="create-edit-poster-label">Tags</h2>
              <div className="create-edit-poster-tags">
                {TAGS.map((tag) => (
                  <Tag key={tag} onRemove={() => undefined}>{tag}</Tag>
                ))}
                <Button variant="quiet" size="small">
                  <Plus /> Add tag
                </Button>
              </div>
            </section>

            <section className="create-edit-poster-section" aria-labelledby="create-edit-poster-seo">
              <div className="create-edit-poster-status">
                <h2 id="create-edit-poster-seo" className="create-edit-poster-label">Search preview</h2>
                <Button variant="quiet" size="small" className="create-edit-poster-flush">Edit</Button>
              </div>
              <div className="create-edit-poster-serp">
                <p className="create-edit-poster-serp-site">
                  <span className="create-edit-poster-serp-mark" aria-hidden="true">P</span>
                  plinth.example.com › notes
                </p>
                <p className="create-edit-poster-serp-title">A house built around one window · {PUBLICATION}</p>
                <p className="create-edit-poster-serp-text">
                  Lucía Ferreira had a narrow lot, a modest budget and one rule: every room gets the morning. Here’s
                  how one tall window shaped the whole plan.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </LucideProvider>
  )
}

const css = `
.create-edit-poster {
  --create-edit-poster-pane: var(--diya-color-surface);
  --create-edit-poster-side: var(--diya-color-recessed);
  --create-edit-poster-bar: var(--diya-color-surface);
  --create-edit-poster-blur: none;
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr;
  color: var(--diya-color-text);
  background: var(--create-edit-poster-pane);
}
[data-glass='true'] .create-edit-poster {
  --create-edit-poster-pane: transparent;
  --create-edit-poster-side: color-mix(in srgb, var(--diya-color-raised) 46%, transparent);
  --create-edit-poster-bar: color-mix(in srgb, var(--diya-color-raised) 62%, transparent);
  --create-edit-poster-blur: blur(28px) saturate(1.15);
}
.create-edit-poster-bar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--diya-space-4);
  min-height: 64px;
  padding: var(--diya-space-2) var(--diya-space-5) var(--diya-space-2) var(--diya-space-4);
  border-bottom: 1px solid var(--diya-color-line);
  background: var(--create-edit-poster-bar);
  backdrop-filter: var(--create-edit-poster-blur);
}
.create-edit-poster-where,
.create-edit-poster-actions { display: flex; align-items: center; gap: var(--diya-space-2); min-width: 0; }
.create-edit-poster-crumb,
.create-edit-poster-slash { color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.create-edit-poster-crumb { margin-left: var(--diya-space-1); }
.create-edit-poster-title { margin: 0; font-size: var(--diya-text-body); font-weight: 600; letter-spacing: -0.005em; white-space: nowrap; }

.create-edit-poster-work { display: grid; grid-template-columns: minmax(0, 1fr) 384px; }
.create-edit-poster-editor { min-width: 0; padding: var(--diya-space-6) var(--diya-space-7) var(--diya-space-8); }
.create-edit-poster-page { width: 100%; max-width: calc(var(--diya-text-large) * 34); margin-inline: auto; }

.create-edit-poster-toolbar {
  display: flex;
  width: max-content;
  max-width: 100%;
  margin-inline: auto;
  align-items: center;
  gap: var(--diya-space-1);
  padding: var(--diya-space-1);
  border: 1px solid var(--diya-color-line);
  border-radius: calc(12px * var(--diya-corner-scale, 1));
  background: var(--diya-color-raised);
  box-shadow: 0 1px 2px color-mix(in srgb, black 6%, transparent);
  overflow-x: auto;
  scrollbar-width: none;
}
[data-glass='true'] .create-edit-poster-toolbar {
  background: color-mix(in srgb, var(--diya-color-raised) 72%, transparent);
  backdrop-filter: var(--create-edit-poster-blur);
}
.create-edit-poster-group { display: flex; align-items: center; gap: 2px; padding-left: var(--diya-space-1); border-left: 1px solid var(--diya-color-line); }
.create-edit-poster-tool[aria-pressed='true'] { background: var(--diya-color-selected); }
.create-edit-poster-style {
  display: inline-flex;
  align-items: center;
  gap: var(--diya-space-2);
  height: 32px;
  margin-right: var(--diya-space-1);
  padding: 0 var(--diya-space-2) 0 var(--diya-space-3);
  border: 0;
  border-radius: var(--diya-radius-control);
  background: none;
  color: var(--diya-color-text);
  font: inherit;
  font-size: var(--diya-text-caption);
  font-weight: 500;
  white-space: nowrap;
}
.create-edit-poster-style svg { color: var(--diya-color-muted); }

.create-edit-poster-page { padding-top: var(--diya-space-7); }
.create-edit-poster-headline {
  margin: 0;
  font-size: clamp(36px, 4.2vw, 50px);
  font-weight: 650;
  line-height: 1.06;
  letter-spacing: -0.032em;
  text-wrap: balance;
}
.create-edit-poster-dek {
  margin: var(--diya-space-4) 0 0;
  color: var(--diya-color-muted);
  font-size: var(--diya-text-title);
  line-height: 1.45;
  letter-spacing: -0.008em;
  text-wrap: pretty;
}
.create-edit-poster-byline { margin: var(--diya-space-4) 0 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.create-edit-poster-body { margin-top: var(--diya-space-6); padding-top: var(--diya-space-6); border-top: 1px solid var(--diya-color-line); }
.create-edit-poster-caret {
  display: inline-block;
  width: 2px;
  height: 1.15em;
  margin-left: 1px;
  vertical-align: -0.2em;
  border-radius: 1px;
  background: var(--diya-color-text);
}

.create-edit-poster-side {
  display: grid;
  align-content: start;
  padding: var(--diya-space-5) var(--diya-space-6) var(--diya-space-7);
  border-left: 1px solid var(--diya-color-line);
  background: var(--create-edit-poster-side);
  backdrop-filter: var(--create-edit-poster-blur);
}
.create-edit-poster-section { display: grid; gap: var(--diya-space-4); padding-block: var(--diya-space-5); }
.create-edit-poster-section + .create-edit-poster-section { border-top: 1px solid var(--diya-color-line); }
.create-edit-poster-section:first-child { padding-top: 0; }
.create-edit-poster-label { margin: 0; font-size: var(--diya-text-body); font-weight: 600; letter-spacing: -0.005em; }
.create-edit-poster-status { display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-3); min-height: 32px; }
.create-edit-poster-note { margin: calc(var(--diya-space-2) * -1) 0 0; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.create-edit-poster-pair { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: var(--diya-space-3); }

.create-edit-poster-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: calc(12px * var(--diya-corner-scale, 1));
  background:
    radial-gradient(60% 70% at 34% 38%, #d8d4cd99, #0000 70%),
    linear-gradient(180deg, #0000 71%, #0000001a 71.4%, #0000 74%),
    linear-gradient(180deg, #aca79f 0%, #9a958d 71%, #b7b1a8 71.4%, #8f8a82 100%);
  box-shadow: inset 0 0 0 1px #0000000f;
}
.create-edit-poster-cover::before {
  content: '';
  position: absolute;
  left: 26%;
  top: 9%;
  width: 17%;
  height: 62%;
  border-radius: 999px 999px 1px 1px;
  background:
    linear-gradient(90deg, #0000 48%, #a39e96 48% 52%, #0000 52%),
    linear-gradient(180deg, #0000 47%, #a39e96 47% 50%, #0000 50%),
    radial-gradient(120% 80% at 40% 30%, #ffffff, #f6f4ef 55%, #e7e3dc);
  box-shadow: 0 0 0 4px #8d887f, 0 0 40px 6px #f4f1ea80;
}
.create-edit-poster-cover::after {
  content: '';
  position: absolute;
  left: 27%;
  top: 72%;
  width: 52%;
  height: 34%;
  background: linear-gradient(105deg, #fffdf8e6, #fffdf8b3 45%, #fffdf800 90%);
  clip-path: polygon(0 0, 30% 0, 100% 100%, 42% 100%);
  filter: blur(1.5px);
}
.create-edit-poster-file { display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-3); margin-top: calc(var(--diya-space-2) * -1); color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.create-edit-poster-flush { margin-right: calc(var(--diya-space-4) * -1); }
.create-edit-poster-tags { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-2); }

.create-edit-poster-serp {
  display: grid;
  gap: var(--diya-space-1);
  padding: var(--diya-space-4);
  border: 1px solid var(--diya-color-line);
  border-radius: calc(12px * var(--diya-corner-scale, 1));
  background: var(--diya-color-surface);
}
[data-glass='true'] .create-edit-poster-serp { background: color-mix(in srgb, var(--diya-color-raised) 60%, transparent); }
.create-edit-poster-serp p { margin: 0; }
.create-edit-poster-serp-site { display: flex; align-items: center; gap: var(--diya-space-2); color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.create-edit-poster-serp-mark {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--diya-color-accent);
  color: var(--diya-color-accent-text);
  font-size: 13px;
  font-weight: 650;
}
.create-edit-poster-serp-title { margin-top: var(--diya-space-1) !important; color: var(--diya-color-info); font-size: var(--diya-text-large); line-height: 1.3; }
.create-edit-poster-serp-text { color: var(--diya-color-muted); font-size: var(--diya-text-caption); line-height: 1.5; }

@media (max-width: 1080px) {
  .create-edit-poster-work { grid-template-columns: minmax(0, 1fr) 320px; }
  .create-edit-poster-editor { padding-inline: var(--diya-space-6); }
  .create-edit-poster-side { padding-inline: var(--diya-space-5); }
  .create-edit-poster-pair { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 760px) {
  .create-edit-poster-bar { padding-inline: var(--diya-space-2) var(--diya-space-4); }
  .create-edit-poster-wide-only,
  .create-edit-poster-crumb,
  .create-edit-poster-slash { display: none; }
  .create-edit-poster-work { grid-template-columns: minmax(0, 1fr); }
  .create-edit-poster-editor { padding: var(--diya-space-4) var(--diya-space-5) var(--diya-space-7); }
  .create-edit-poster-toolbar { position: sticky; top: 72px; z-index: 1; width: 100%; }
  .create-edit-poster-page { padding-top: var(--diya-space-6); }
  .create-edit-poster-dek { font-size: var(--diya-text-large); }
  .create-edit-poster-side { padding: var(--diya-space-5); border-left: 0; border-top: 1px solid var(--diya-color-line); }
  .create-edit-poster-pair { grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); }
}
`

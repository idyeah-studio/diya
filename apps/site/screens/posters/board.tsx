'use client'
// Board: a poster for a DIYA screen that waits on drag and drop. Thumbnail only; never offered as code.
import { Avatar, Button, Tag, type Tone } from '@idyeah/diya'
import { Bell, CalendarDays, CircleCheck, Ellipsis, ListChecks, LucideProvider, MessageCircle, Plus, Search, SlidersHorizontal } from 'lucide-react'

const PRODUCT = 'Gable'
const TEAM = ['Nadia Haddad', 'Kenji Sato', 'Ama Mensah', 'Lucas Martin', 'Sofia Rossi']

type Task = { title: string; tag: string; tone?: Tone; person: string; due: string; comments?: number; checklist?: string; flag?: string }
type Column = { id: string; name: string; count: number; tasks: Task[]; dropAt?: number }

const COLUMNS: Column[] = [
  {
    id: 'backlog', name: 'Backlog', count: 6,
    tasks: [
      { title: 'Saved cards for returning customers', tag: 'Engineering', person: 'Kenji Sato', due: 'Nov 18', comments: 2 },
      { title: 'Rewrite the error messages on the payment step', tag: 'Copy', person: 'Ama Mensah', due: 'Nov 19' },
      { title: 'Why carts stall at shipping: five interviews', tag: 'Research', person: 'Sofia Rossi', due: 'Nov 21', checklist: '1/5' },
      { title: 'Gift card balance check', tag: 'Engineering', person: 'Diego Navarro', due: 'Nov 24' },
    ],
  },
  {
    id: 'progress', name: 'In progress', count: 3,
    tasks: [
      { title: 'New order summary layout', tag: 'Design', person: 'Lucas Martin', due: 'Nov 10', checklist: '3/5', comments: 6 },
      { title: 'Address autocomplete on the shipping step', tag: 'Engineering', person: 'Kenji Sato', due: 'Nov 12', flag: 'Blocked' },
      { title: 'Inline validation for the promo code field', tag: 'Engineering', person: 'Mei Lin', due: 'Nov 11', comments: 1 },
    ],
  },
  {
    id: 'review', name: 'In review', count: 3, dropAt: 1,
    tasks: [
      { title: 'Tax line shows twice on small screens', tag: 'Bug', tone: 'error', person: 'Ama Mensah', due: 'Nov 7', comments: 3 },
      { title: 'Checkout copy, round two', tag: 'Copy', person: 'Sofia Rossi', due: 'Nov 9' },
      { title: 'Express shipping badge', tag: 'Design', person: 'Lucas Martin', due: 'Nov 8', checklist: '4/4' },
    ],
  },
  {
    id: 'done', name: 'Done', count: 12,
    tasks: [
      { title: 'Guest checkout without an account', tag: 'Engineering', person: 'Nadia Haddad', due: 'Nov 4' },
      { title: 'Remember the last shipping method', tag: 'Engineering', person: 'Mei Lin', due: 'Nov 3' },
      { title: 'Skeleton loading for the payment step', tag: 'Design', person: 'Lucas Martin', due: 'Nov 3' },
      { title: 'Accessibility pass on the card form', tag: 'Research', person: 'Diego Navarro', due: 'Oct 31' },
    ],
  },
]

// The card in someone's hand, on its way from In progress to In review.
const MOVING: Task = { title: 'Wallet payments on mobile checkout', tag: 'Engineering', person: 'Nadia Haddad', due: 'Nov 13', comments: 4, checklist: '5/6' }

export default function BoardPoster() {
  // On a phone the board scrolls sideways; start it on the column the card is dropping into.
  const startAtDrop = (node: HTMLDivElement | null) => {
    const target = node?.querySelector<HTMLElement>('[data-drop]')
    if (node && target && node.scrollWidth > node.clientWidth) node.scrollLeft = target.offsetLeft - 20
  }

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <div className="board-poster">
        <header className="board-poster-bar">
          <span className="board-poster-brand">
            <span className="board-poster-mark" aria-hidden="true">G</span>
            {PRODUCT}
          </span>
          <nav aria-label="Breadcrumb" className="board-poster-crumbs">
            <span>Payments team</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Checkout redesign</span>
          </nav>
          <span className="board-poster-utilities">
            <Button variant="quiet" iconOnly aria-label="Search"><Search /></Button>
            <Button variant="quiet" iconOnly aria-label="Notifications"><Bell /></Button>
            <Avatar name="Nadia Haddad" size="small" status="online" />
          </span>
        </header>

        <main className="board-poster-main">
          <div className="board-poster-head">
            <div>
              <h1 className="board-poster-title">Checkout redesign</h1>
              <p className="board-poster-meta">Sprint 14 · Nov 3 to Nov 14 · 9 days left</p>
            </div>
            <div className="board-poster-actions">
              <span className="board-poster-team" role="group" aria-label={`${TEAM.length} people on this board`}>
                {TEAM.map((name) => <Avatar key={name} name={name} size="small" />)}
              </span>
              <div className="board-poster-views" role="group" aria-label="View">
                <button type="button" aria-pressed="true">Board</button>
                <button type="button" aria-pressed="false">List</button>
                <button type="button" aria-pressed="false">Timeline</button>
              </div>
              <Button variant="outline" className="board-poster-wide-only"><SlidersHorizontal /> Filter</Button>
              <Button><Plus /> New task</Button>
            </div>
          </div>

          <div className="board-poster-board" ref={startAtDrop}>
            {COLUMNS.map((column) => (
              <section key={column.id} className="board-poster-column" aria-labelledby={`board-poster-${column.id}`}
                data-drop={column.dropAt !== undefined || undefined}>
                <div className="board-poster-column-head">
                  <h2 id={`board-poster-${column.id}`}>{column.name}</h2>
                  <span className="board-poster-count">{column.count}</span>
                  <span className="board-poster-column-tools">
                    <Button variant="quiet" size="small" iconOnly aria-label={`Add a task to ${column.name}`}><Plus /></Button>
                    <Button variant="quiet" size="small" iconOnly aria-label={`${column.name} options`}><Ellipsis /></Button>
                  </span>
                </div>
                <ol className="board-poster-cards">
                  {column.tasks.map((task, index) => (
                    <li key={task.title} className="board-poster-slot">
                      {column.dropAt === index && (
                        <div className="board-poster-landing">
                          <div className="board-poster-drop" aria-hidden="true"><Card task={MOVING} /></div>
                          <Card task={MOVING} moving />
                        </div>
                      )}
                      <Card task={task} done={column.id === 'done'} />
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
          <p className="board-poster-sr" role="status">
            Moving “{MOVING.title}”. Over In review, position 2 of 4.
          </p>
        </main>
      </div>
    </LucideProvider>
  )
}

function Card({ task, done, moving }: { task: Task; done?: boolean; moving?: boolean }) {
  return (
    <article className="board-poster-card" data-moving={moving || undefined} aria-hidden={moving || undefined}>
      <div className="board-poster-tags">
        <Tag size="small" tone={task.tone}>{task.tag}</Tag>
        {task.flag && <Tag size="small" tone="warning" leading="dot">{task.flag}</Tag>}
      </div>
      <h3 className="board-poster-card-title">{task.title}</h3>
      <div className="board-poster-card-foot">
        <span className="board-poster-facts">
          {done ? (
            <span><CircleCheck /> Done {task.due}</span>
          ) : (
            <span><CalendarDays /> {task.due}</span>
          )}
          {task.checklist && <span><ListChecks /> {task.checklist}</span>}
          {task.comments && <span><MessageCircle /> {task.comments}</span>}
        </span>
        <Avatar name={task.person} size="small" />
      </div>
    </article>
  )
}

const css = `
.board-poster {
  --board-poster-lane: color-mix(in srgb, var(--diya-color-text) 3.5%, transparent);
  --board-poster-card: var(--diya-color-raised);
  --board-poster-blur: none;
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr;
  color: var(--diya-color-text);
  background: var(--diya-color-surface);
}
[data-glass='true'] .board-poster {
  --board-poster-lane: color-mix(in srgb, var(--diya-color-raised) 30%, transparent);
  --board-poster-card: color-mix(in srgb, var(--diya-color-raised) 76%, transparent);
  --board-poster-blur: blur(24px) saturate(1.15);
  background: transparent;
}
.board-poster p { margin: 0; }

.board-poster-bar {
  display: flex;
  align-items: center;
  gap: var(--diya-space-5);
  min-height: 60px;
  padding: var(--diya-space-2) var(--diya-space-5) var(--diya-space-2) var(--diya-space-6);
  border-bottom: 1px solid var(--diya-color-line);
}
[data-glass='true'] .board-poster-bar { background: color-mix(in srgb, var(--diya-color-raised) 62%, transparent); backdrop-filter: var(--board-poster-blur); }
.board-poster-brand { display: inline-flex; align-items: center; gap: 10px; font-size: var(--diya-text-large); font-weight: 650; letter-spacing: -0.02em; }
.board-poster-mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: calc(8px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent);
  color: var(--diya-color-accent-text);
  font-size: 15px;
  font-weight: 700;
}
.board-poster-crumbs { display: flex; gap: var(--diya-space-2); min-width: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); white-space: nowrap; }
.board-poster-crumbs [aria-current] { color: var(--diya-color-text); }
.board-poster-utilities { display: flex; align-items: center; gap: var(--diya-space-1); margin-left: auto; }
.board-poster-utilities > :last-child { margin-left: var(--diya-space-2); }

.board-poster-main { display: grid; grid-template-rows: auto 1fr; min-width: 0; }
.board-poster-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--diya-space-5);
  padding: var(--diya-space-7) var(--diya-space-6) var(--diya-space-6);
}
.board-poster-title { margin: 0; font-size: var(--diya-text-display); font-weight: 650; line-height: 1.1; letter-spacing: -0.03em; }
.board-poster-meta { margin-top: var(--diya-space-2) !important; color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.board-poster-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-3); }
.board-poster-team { display: flex; margin-right: var(--diya-space-2); }
.board-poster-team > * { box-shadow: 0 0 0 2px var(--diya-color-surface); border-radius: 50%; }
.board-poster-team > * + * { margin-left: -3px; }
[data-glass='true'] .board-poster-team > * { box-shadow: none; }
.board-poster-views {
  display: flex;
  padding: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--diya-color-text) 6%, transparent);
}
.board-poster-views button {
  height: 34px;
  padding: 0 var(--diya-space-4);
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--diya-color-muted);
  font: inherit;
  font-size: var(--diya-text-body);
  font-weight: 500;
}
.board-poster-views button[aria-pressed='true'] {
  background: var(--diya-color-raised);
  color: var(--diya-color-text);
  box-shadow: 0 1px 2px color-mix(in srgb, black 14%, transparent), 0 0 0 0.5px color-mix(in srgb, var(--diya-color-text) 8%, transparent);
}

.board-poster-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--diya-space-4);
  align-items: start;
  padding: 0 var(--diya-space-6) var(--diya-space-7);
}
.board-poster-column {
  display: grid;
  gap: var(--diya-space-2);
  min-width: 0;
  padding: var(--diya-space-2);
  border-radius: calc(18px * var(--diya-corner-scale, 1));
  background: var(--board-poster-lane);
}
.board-poster-column-head { display: flex; align-items: center; gap: var(--diya-space-2); min-height: 40px; padding: 0 var(--diya-space-1) 0 var(--diya-space-3); }
.board-poster-column-head h2 { margin: 0; font-size: var(--diya-text-body); font-weight: 600; letter-spacing: -0.005em; }
.board-poster-count { color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-variant-numeric: tabular-nums; }
.board-poster-column-tools { display: flex; margin-left: auto; color: var(--diya-color-muted); }
.board-poster-cards { display: grid; gap: var(--diya-space-2); margin: 0; padding: 0; list-style: none; }
.board-poster-slot { display: grid; gap: var(--diya-space-2); }

.board-poster-card {
  display: grid;
  gap: var(--diya-space-3);
  padding: var(--diya-space-4);
  border-radius: calc(12px * var(--diya-corner-scale, 1));
  background: var(--board-poster-card);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--diya-color-text) 7%, transparent), 0 1px 2px color-mix(in srgb, black 5%, transparent);
  backdrop-filter: var(--board-poster-blur);
}
.board-poster-tags { display: flex; flex-wrap: wrap; gap: var(--diya-space-2); }
.board-poster-card-title { margin: 0; font-size: var(--diya-text-body); font-weight: 500; line-height: 1.4; letter-spacing: -0.005em; text-wrap: pretty; }
.board-poster-card-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-3); }
.board-poster-facts { display: flex; flex-wrap: wrap; gap: var(--diya-space-3); color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-variant-numeric: tabular-nums; }
.board-poster-facts span { display: inline-flex; align-items: center; gap: 5px; }
.board-poster-facts svg { width: 15px; height: 15px; }

.board-poster-landing { position: relative; }
.board-poster-drop {
  border: 1.5px dashed color-mix(in srgb, var(--diya-color-text) 26%, transparent);
  border-radius: calc(12px * var(--diya-corner-scale, 1));
  background: color-mix(in srgb, var(--diya-color-text) 3%, transparent);
}
.board-poster-drop > * { visibility: hidden; }
.board-poster-card[data-moving] {
  position: absolute;
  inset: 0 0 auto;
  z-index: 2;
  background: var(--diya-color-raised);
  transform: translate(-34px, -14px) rotate(-2.5deg) scale(1.02);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--diya-color-text) 8%, transparent),
    0 12px 24px -8px color-mix(in srgb, black 20%, transparent),
    0 32px 64px -20px color-mix(in srgb, black 32%, transparent);
  cursor: grabbing;
}
[data-glass='true'] .board-poster-card[data-moving] { background: color-mix(in srgb, var(--diya-color-raised) 88%, transparent); }
[data-theme='dark'] .board-poster-card[data-moving] { background: color-mix(in srgb, var(--diya-color-raised) 90%, var(--diya-color-text)); }
.board-poster-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

@media (max-width: 1100px) {
  .board-poster-wide-only { display: none; }
}
@media (max-width: 760px) {
  .board-poster-bar { gap: var(--diya-space-3); padding-inline: var(--diya-space-4) var(--diya-space-3); }
  .board-poster-crumbs { display: none; }
  .board-poster-head { padding: var(--diya-space-6) var(--diya-space-4) var(--diya-space-5); }
  .board-poster-title { font-size: var(--diya-text-heading); }
  .board-poster-team { display: none; }
  .board-poster-actions { width: 100%; flex-wrap: nowrap; justify-content: space-between; gap: var(--diya-space-2); }
  .board-poster-views button { padding: 0 var(--diya-space-3); }
  .board-poster-board {
    grid-template-columns: repeat(4, min(300px, 80vw));
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: var(--diya-space-4);
    padding: var(--diya-space-4) var(--diya-space-4) var(--diya-space-7);
    scrollbar-width: none;
  }
  .board-poster-column { scroll-snap-align: start; }
  .board-poster-card[data-moving] { transform: translate(-6px, -12px) rotate(-2deg) scale(1.02); }
}
@media (max-width: 380px) {
  .board-poster-actions { flex-wrap: wrap; }
}
`

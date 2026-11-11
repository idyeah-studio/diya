'use client'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Button, DiyaProvider, useDiyaAppearance } from '@idyeah/diya'
import { useAppearance } from '../../app/Appearance'
import { AtomicSidebar } from '../AtomicSidebar'
import { PreviewSetting } from '../PreviewControls'
import { CodeBlock } from '../code/CodeBlock'
import type { CodeLanguage } from '../code/highlight'
import '../GalleryStudy.css'
import '../ComponentLibrary.css'
import '../ButtonLibrary.css'
import '../TextInputLibrary.css'
import './MotionPage.css'

/*
 * /explore?area=motion: how DIYA moves. Public tokens only (DS-14): the
 * internal distances and scales are described in words, never named. The
 * playground's lanes run on the real tokens inside a nested DiyaProvider, so
 * its Motion control is the `motion` prop itself and Speed is
 * --diya-duration-scale.
 */

const MOTION = { 'Match device': 'system', Reduced: 'reduced', Off: 'off' } as const
type MotionLabel = keyof typeof MOTION
const SPEED = { '1×': 1, '0.25×': 4, '0.1×': 10 } as const
type SpeedLabel = keyof typeof SPEED

type Lane = { token: string; meta: string; duration: string; enter: string; exit: string; curve?: [number, number, number, number] }

const DURATIONS: Lane[] = [
  { token: '--diya-duration-fast', meta: '120ms in · 80ms out', duration: 'var(--diya-duration-fast)', enter: 'var(--diya-ease-enter)', exit: 'var(--diya-ease-exit)' },
  { token: '--diya-duration-medium', meta: '160ms in · 107ms out', duration: 'var(--diya-duration-medium)', enter: 'var(--diya-ease-enter)', exit: 'var(--diya-ease-exit)' },
  { token: '--diya-duration-slow', meta: '240ms in · 160ms out', duration: 'var(--diya-duration-slow)', enter: 'var(--diya-ease-enter)', exit: 'var(--diya-ease-exit)' },
]
const CURVES: Lane[] = [
  { token: '--diya-ease-enter', meta: 'Arrive and settle', duration: 'var(--diya-duration-slow)', enter: 'var(--diya-ease-enter)', exit: 'var(--diya-ease-enter)', curve: [0.2, 0.7, 0.2, 1] },
  { token: '--diya-ease-exit', meta: 'Leave without lingering', duration: 'var(--diya-duration-slow)', enter: 'var(--diya-ease-exit)', exit: 'var(--diya-ease-exit)', curve: [0.4, 0, 1, 1] },
  { token: '--diya-ease-move', meta: 'Move or change on screen', duration: 'var(--diya-duration-slow)', enter: 'var(--diya-ease-move)', exit: 'var(--diya-ease-move)', curve: [0.4, 0, 0.2, 1] },
]

const MOVES = [
  { name: 'Popups', text: 'Menus, popovers, tooltips and lists grow from the control that opened them and drift a few pixels toward it.' },
  { name: 'Dialogs and drawers', text: 'A dialog settles in from slightly smaller while the page dims; a drawer slides in from its own edge.' },
  { name: 'Toasts', text: 'A toast rises a short way from the edge it lives on.' },
  { name: 'Selection', text: 'A tab’s indicator slides to your choice, a switch’s thumb slides across, and a radio dot or a check grows in.' },
  { name: 'Accordion', text: 'A section opens to its own height, so you keep your place.' },
  { name: 'Buttons and progress', text: 'Hover eases in, a press lands at once, and a progress bar eases to each new value.' },
]

const TOKENS = [
  { token: '--diya-duration-fast', value: '120ms in, 80ms out', text: 'Hover, press, toggles and color changes.' },
  { token: '--diya-duration-medium', value: '160ms in, 107ms out', text: 'Menus, popovers, tooltips and lists.' },
  { token: '--diya-duration-slow', value: '240ms in, 160ms out', text: 'Dialogs, drawers, toasts, Tabs and Accordion.' },
  { token: '--diya-duration-scale', value: '1', text: 'Multiplies every duration: 0.5 is twice as fast, 0 turns motion off.' },
  { token: '--diya-ease-enter', value: 'cubic-bezier(0.2, 0.7, 0.2, 1)', text: 'Anything appearing.' },
  { token: '--diya-ease-exit', value: 'cubic-bezier(0.4, 0, 1, 1)', text: 'Anything going away.' },
  { token: '--diya-ease-move', value: 'cubic-bezier(0.4, 0, 0.2, 1)', text: 'Moves and color changes on screen.' },
]

/* The README's Motion steps, word for word in substance. */
const STEPS: { lead: string; label: string; name: string; language: CodeLanguage; code: string }[] = [
  { lead: 'By default, DIYA moves and follows the device’s setting, with no code.', name: 'default provider', label: 'Root layout or entry', language: 'tsx', code: '<DiyaProvider>' },
  { lead: 'Turn it off for the whole app, and everything changes at once. Loading indicators still move, because they show progress.', name: 'provider with motion off', label: 'Root layout or entry', language: 'tsx', code: '<DiyaProvider motion="off">' },
  { lead: 'Fades only, for everyone: nothing slides or scales, but changes still ease in and out.', name: 'provider with reduced motion', label: 'Root layout or entry', language: 'tsx', code: '<DiyaProvider motion="reduced">' },
  { lead: 'One part of the app gets its own setting from a nested provider. Without `motion`, a nested provider inherits the one around it.', name: 'nested provider', label: 'Any component', language: 'tsx', code: '<DiyaProvider motion="reduced"><LiveFeed /></DiyaProvider>' },
  { lead: 'Faster, slower or off in CSS: `--diya-duration-scale` multiplies every duration. Set it on the provider, not on an element inside it.', name: 'duration scale', label: 'Your stylesheet', language: 'css', code: '.diya-root { --diya-duration-scale: 0.5; }' },
  { lead: 'In tests, render inside `motion="off"`, so closing popups leave at once and a tooltip shows on hover without its wait. Emulating reduced motion isn’t enough, since things still fade.', name: 'test render', label: 'A test', language: 'tsx', code: 'render(<DiyaProvider motion="off"><Settings /></DiyaProvider>)' },
  { lead: 'To stay on 1.0’s behavior without the prop, pin the 1.0 line.', name: 'install command for 1.0', label: 'Terminal, in your app’s folder', language: 'shell', code: 'npm install @idyeah/diya@~1.0.1' },
]

export function MotionPage() {
  const site = useAppearance()
  const [motion, setMotion] = useState<MotionLabel>('Match device')
  const [speed, setSpeed] = useState<SpeedLabel>('1×')
  return (
    <main id="content" className="gallery-study component-library button-library motion-page" data-area="motion">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar page="motion" />
      <div className="component-document">
        <header className="component-document-heading">
          <h1>Motion</h1>
          <p>
            DIYA moves only when something changes because of you: a menu grows from the button you pressed, a tab’s
            underline follows your choice, a dialog settles into place. It’s quick and quiet, and you can turn it off.
          </p>
        </header>
        <div className="component-preview-stage input-specimens motion-playground">
          <div className="input-preview-controls">
            <PreviewSetting label="Motion" options={Object.keys(MOTION)} value={motion} onChange={(value) => setMotion(value as MotionLabel)} />
            <PreviewSetting label="Speed" options={Object.keys(SPEED)} value={speed} onChange={(value) => setSpeed(value as SpeedLabel)} />
          </div>
          <section aria-label="Motion preview">
            <DiyaProvider
              surface={false}
              theme={site.theme}
              glass={site.glass}
              motion={MOTION[motion]}
              style={{ '--diya-duration-scale': SPEED[speed] } as CSSProperties}
              className="motion-scope"
            >
              <MotionLanes scale={SPEED[speed]} setting={MOTION[motion]} />
            </DiyaProvider>
          </section>
        </div>

        <div className="motion-sections">
          <section aria-labelledby="motion-moves">
            <h2 id="motion-moves">What moves</h2>
            <ul className="motion-list">
              {MOVES.map((item) => (
                <li key={item.name}>
                  <b>{item.name}</b>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            <p>
              Everything leaves a little faster than it arrived, and nothing waits for motion: you can type, click or
              press Escape while something is still moving.
            </p>
          </section>

          <section aria-labelledby="motion-tokens">
            <h2 id="motion-tokens">Tokens</h2>
            <p>Exits take about two-thirds of the enter, automatically. Set these on the provider, like any DIYA token.</p>
            <dl className="motion-tokens">
              {TOKENS.map((row) => (
                <div key={row.token}>
                  <dt>
                    <code>{row.token}</code>
                  </dt>
                  <dd>
                    <span>{row.value}</span>
                    <span>{row.text}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="motion-setting">
            <h2 id="motion-setting">Less motion, or none</h2>
            <p>
              DIYA follows the device’s reduce-motion setting (Reduce Motion on Apple devices, Animation effects on
              Windows, Remove animations on Android): nothing slides or scales, and fades stay, so every change is still
              visible.
            </p>
            <p>Chrome and Edge play every enter and exit. Safari and Firefox play the enters; some exits are instant.</p>
          </section>

          <section aria-labelledby="motion-setup">
            <h2 id="motion-setup">Set it up</h2>
            <ol className="motion-steps">
              {STEPS.map((step) => (
                <li key={step.code}>
                  <p>{words(step.lead)}</p>
                  <CodeBlock code={step.code} language={step.language} label={step.label} name={step.name} wrap />
                </li>
              ))}
            </ol>
            <p>
              <code>useDiyaAppearance().motion</code> tells your own code which applies: <code>&apos;full&apos;</code>,{' '}
              <code>&apos;reduced&apos;</code> or <code>&apos;off&apos;</code>. There’s no <code>motion=&quot;full&quot;</code>:
              DIYA never overrides a reader who asked for less motion.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}

/** Backticks in the step copy become code. */
function words(text: string) {
  return text.split('`').map((part, index) => (index % 2 ? <code key={index}>{part}</code> : part))
}

/**
 * The lanes. Inside the nested provider, so `useDiyaAppearance().motion` says what the
 * setting resolves to here, the device's choice included: 'full' slides each
 * dot, 'reduced' fades it across in place, and 'off' makes it jump.
 */
function MotionLanes({ scale, setting }: { scale: number; setting: 'system' | 'reduced' | 'off' }) {
  const mode = useDiyaAppearance().motion
  const [played, setPlayed] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const play = () => {
    setPlayed(true)
    window.clearTimeout(timer.current)
    // Long enough for the slowest enter, plus a beat at the end, at the chosen speed.
    timer.current = window.setTimeout(() => setPlayed(false), (240 + 700) * scale)
  }
  const note =
    mode === 'off'
      ? 'Motion is off, so each dot jumps: every change is instant.'
      : mode === 'reduced'
        ? setting === 'system'
          ? 'Your device asks for less motion, so each dot fades across in place instead of sliding.'
          : 'Reduced: each dot fades across in place, in the same time. Nothing slides.'
        : 'Each dot crosses in its time and comes back in two-thirds of it.'
  return (
    <div className="motion-lanes" data-mode={mode} data-played={played ? '' : undefined}>
      <div className="motion-play">
        <Button size="small" variant="outline" onClick={play}>
          Play
        </Button>
        <p>
          Press Play to watch each duration. <span>{note}</span>
        </p>
      </div>
      <div className="motion-groups">
        <LaneGroup title="Durations" lanes={DURATIONS} />
        <LaneGroup title="Curves, at the slow duration" lanes={CURVES} />
      </div>
    </div>
  )
}

function LaneGroup({ title, lanes }: { title: string; lanes: Lane[] }) {
  return (
    <div className="motion-group" role="group" aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {lanes.map((lane) => (
          <li key={lane.token}>
            <div className="motion-lane-name">
              {lane.curve && <Curve points={lane.curve} />}
              <div>
                <code>{lane.token}</code>
                <span>{lane.meta}</span>
              </div>
            </div>
            <div
              className="motion-lane"
              aria-hidden="true"
              style={{ '--lane-in': lane.duration, '--lane-enter': lane.enter, '--lane-exit': lane.exit } as CSSProperties}
            >
              <span className="motion-dot" />
              <span className="motion-dot" data-end="" />
              <span className="motion-tick" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The curve itself: time across, progress up, on the text edge. */
function Curve({ points: [x1, y1, x2, y2] }: { points: [number, number, number, number] }) {
  return (
    <svg className="motion-curve" viewBox="0 0 100 100" aria-hidden="true">
      <path className="motion-curve-box" d="M0 0H100V100H0Z" />
      <path d={`M0 100C${x1 * 100} ${100 - y1 * 100} ${x2 * 100} ${100 - y2 * 100} 100 0`} />
    </svg>
  )
}

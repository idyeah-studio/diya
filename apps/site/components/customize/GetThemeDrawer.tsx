'use client'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { Button, Drawer } from '@idyeah/diya'
import { effectiveAppearance, type AppearancePath, type Theme } from '../../lib/customize/appearance'
import { contrastIssues, type ContrastIssue } from '../../lib/customize/contrast'
import { setBrandValue } from '../../lib/customize/store'
import {
  buttonProps,
  contrastFix,
  providerProps,
  providerSnippet,
  THEME_FILENAME,
  themeFile,
  themeSummary,
  webFont,
} from '../../lib/customize/theme'
import { neutralSet } from '../../lib/customize/tokens'
import { CodeBlock } from '../code/CodeBlock'
import { installCommand, usePackageManagerChoice, type PackageManager } from '../site/package-manager'
import { PackageManagerTabs } from '../code/PackageManagerTabs'
import { NoteIcon, Step } from '../code/Step'
import { useFocusDrawerTitle } from '../code/useFocusDrawerTitle'
import { useCustomizeState } from './CustomizeContext'
import { settingName } from './CustomizePanel'
import '../GetCodeDrawer.css'
import './GetThemeDrawer.css'

const THEME_NAME = { light: 'Light', dark: 'Dark' } as const

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  )
}

/** Save the file the browser's way: a Blob behind an object URL. */
export function downloadThemeFile(css: string) {
  const url = URL.createObjectURL(new Blob([css], { type: 'text/css;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = THEME_FILENAME
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const sameIssue = (a: ContrastIssue, b: ContrastIssue) => a.theme === b.theme && a.label === b.label

/**
 * Get theme: the brand as diya-theme.css (public tokens only), the
 * DiyaProvider props CSS can't carry, a Fontsource install for a web font,
 * and Button's own settings as props. When a color pair is too faint the
 * drawer stays open for business: it names each pair, offers a one-click
 * fix, and can take you to the setting instead.
 */
export function GetThemeDrawer({
  open,
  onOpenChange,
  onAdjust,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Show a setting in Customize, after this drawer has closed. */
  onAdjust: (path: AppearancePath, theme: Theme) => void
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const state = useCustomizeState()
  const [manager, setManager] = usePackageManagerChoice()
  const [announcement, setAnnouncement] = useState('')
  const body = useRef<HTMLDivElement>(null)
  const blockedTitle = useRef<HTMLHeadingElement>(null)
  const firstStep = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef<'blocked' | 'ready' | null>(null)
  useFocusDrawerTitle(open, body)

  const appearance = effectiveAppearance(state.brand)
  const issues = contrastIssues(appearance)
  const summary = themeSummary(appearance)
  const css = themeFile(appearance)
  const props = providerProps(appearance)
  /* A file with no tokens (only the brand, font or glass changed) has nothing to import. */
  const fileSteps = /--diya-/.test(css) || props.length === 0
  const font = webFont(appearance.font)
  const button = buttonProps(state.items.button?.options ?? {})

  useEffect(() => {
    if (open) setAnnouncement('')
    else pendingFocus.current = null
  }, [open])
  /* After a fix, keep the reader where the drawer changed. */
  useEffect(() => {
    if (!pendingFocus.current) return
    const target = pendingFocus.current === 'blocked' ? blockedTitle.current : firstStep.current
    // The target can mount a render later on a slow device; keep the request until it exists.
    if (!target) return
    pendingFocus.current = null
    target.focus()
  })

  const say = (text: string) => {
    setAnnouncement('')
    window.setTimeout(() => setAnnouncement(text), 30)
  }
  const fix = (issue: ContrastIssue) => {
    const result = contrastFix(state.brand, issue)
    if (!result) return
    setBrandValue(result.path, result.value)
    const left = contrastIssues(effectiveAppearance({ ...(state.brand ?? {}), [result.path]: result.value })).length
    pendingFocus.current = left ? 'blocked' : 'ready'
    say(left ? `Fixed. ${left === 1 ? 'One pair' : `${left} pairs`} left.` : 'All pairs read well. Your theme is ready.')
  }
  const adjust = (issue: ContrastIssue) => {
    const path = issue.paths.find((p) => Object.hasOwn(state.brand ?? {}, p)) ?? issue.path
    const dialog = body.current?.closest('dialog')
    const go = () => onAdjust(path, issue.theme)
    /* The drawer returns focus to Get theme as it closes; move on only after that. */
    const waits = !!dialog?.open
    if (waits) dialog!.addEventListener('close', () => window.setTimeout(go), { once: true })
    onOpenChange(false)
    if (!waits) go()
  }
  const chooseManager = (value: PackageManager) => {
    setManager(value)
    say(`Showing ${value} commands.`)
  }

  const changed = props.map((p) => (p.name === 'brandColor' ? 'your brand color' : p.name === 'fontFamily' ? 'your font' : 'the glass finish'))
  let n = 0
  /* Suggestions take some working out; only while the drawer is showing them. */
  const unique = open ? issues.filter((issue, index) => issues.findIndex((other) => sameIssue(other, issue)) === index) : []

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Get theme"
      description="Your brand as one CSS file and a few props."
      footer={
        <div className="get-code-footer">
          <span>Public tokens only · @idyeah/diya 1.x</span>
          <button type="button" className="diya-button" data-variant="outline" data-size="small" data-shape="pill" onClick={() => onOpenChange(false)}>
            Back to Customize
          </button>
        </div>
      }
    >
      <div ref={body} className="code-steps get-theme">
        <dl className="get-theme-summary" aria-label="What’s in your theme">
          <div>
            <dt>Brand</dt>
            <dd className="get-theme-brand">
              <span className="get-theme-brand-pairs">
                {(['light', 'dark'] as const).map((t) => (
                  <span
                    key={t}
                    className="get-theme-pair"
                    style={{ background: appearance.colors[t].accent, color: neutralSet(appearance, t).accentInk } as CSSProperties}
                    aria-label={`${THEME_NAME[t]}: ${appearance.colors[t].accent}`}
                    role="img"
                  >
                    Aa
                  </span>
                ))}
              </span>
              {summary.brand}
            </dd>
          </div>
          <div>
            <dt>Font</dt>
            <dd style={{ fontFamily: summary.fontFamily }}>{summary.font}</dd>
          </div>
          <div>
            <dt>Corners · Elevation</dt>
            <dd>
              {summary.corners} · {summary.elevation}
            </dd>
          </div>
          <div>
            <dt>Glass</dt>
            <dd>{summary.glass ? 'On' : 'Off'}</dd>
          </div>
          <div>
            <dt>Status colors</dt>
            <dd>{summary.status}</dd>
          </div>
        </dl>

        {unique.length > 0 ? (
          <section className="get-theme-blocked" aria-labelledby={`${uid}-blocked`}>
            <h4 id={`${uid}-blocked`} ref={blockedTitle} tabIndex={-1}>
              {unique.length === 1
                ? 'One color pair is too faint to read, so the theme isn’t ready yet.'
                : `${unique.length} color pairs are too faint to read, so the theme isn’t ready yet.`}
            </h4>
            <p>Fix {unique.length === 1 ? 'it' : 'them'} and your file appears here. Pick the suggestion, or adjust it yourself.</p>
            <ul>
              {unique.map((issue) => {
                const suggestion = contrastFix(state.brand, issue)
                const where = `${issue.label}, in ${THEME_NAME[issue.theme]}`
                return (
                  <li key={`${issue.theme}-${issue.label}`} className="get-theme-issue">
                    <span className="get-theme-pair" style={{ background: issue.background, color: issue.foreground }} aria-hidden="true">
                      Aa
                    </span>
                    <div>
                      <span className="get-theme-issue-what">{where}</span>
                      <span className="get-theme-issue-ratio">
                        {issue.ratio}:1 · needs {issue.minimum}:1
                      </span>
                    </div>
                    <div className="get-theme-issue-fixes">
                      {suggestion && (
                        <Button
                          size="small"
                          shape="pill"
                          aria-label={`Use ${suggestion.value} for ${settingName(suggestion.path)}: ${where} becomes ${suggestion.ratio}:1`}
                          onClick={() => fix(issue)}
                        >
                          Use <span className="get-theme-swatch" style={{ background: suggestion.value }} aria-hidden="true" /> {suggestion.value} · {suggestion.ratio}:1
                        </Button>
                      )}
                      <Button variant="quiet" size="small" shape="pill" aria-label={`Adjust in Customize: ${where}`} onClick={() => adjust(issue)}>
                        Adjust in Customize
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="get-theme-waiting">
              Your <code>{THEME_FILENAME}</code> and provider props show here once every pair reads well in both Light and Dark.
            </p>
          </section>
        ) : (
          <>
            {fileSteps && (
              <>
                <Step n={++n} title="Save the theme file" titleId={`${uid}-file`} titleRef={firstStep}>
                  <CodeBlock
                    code={css}
                    language="css"
                    label={`${THEME_FILENAME} · ${css.split('\n').length} lines`}
                    name="theme file"
                    collapseAfter={10}
                    actions={
                      <Button
                        variant="outline"
                        size="small"
                        shape="pill"
                        className="code-key"
                        aria-label={`Download ${THEME_FILENAME}`}
                        onClick={() => {
                          downloadThemeFile(css)
                          say(`${THEME_FILENAME} is downloading.`)
                        }}
                      >
                        <DownloadIcon />
                        Download
                      </Button>
                    }
                  />
                  <p>Public tokens only: the names DIYA promises not to rename in 1.x.</p>
                </Step>
                <Step n={++n} title="Import it after DIYA’s styles" titleId={`${uid}-import`}>
                  <CodeBlock code={`import '@idyeah/diya/styles.css'\nimport './${THEME_FILENAME}'`} language="tsx" label="Root layout or entry" name="styles imports" />
                  <p>Order matters. The theme goes second so it wins.</p>
                </Step>
              </>
            )}
            {props.length > 0 && (
              <Step n={++n} title="Pass these to DiyaProvider" titleId={`${uid}-props`} titleRef={fileSteps ? undefined : firstStep}>
                <CodeBlock code={providerSnippet(props)} language="tsx" label="Provider props" name="provider props" />
                <p>
                  Only the props you changed. They carry what CSS can’t: {changed.length < 2 ? changed[0] : `${changed.slice(0, -1).join(', ')} and ${changed[changed.length - 1]}`}.
                </p>
              </Step>
            )}
            {font && (
              <Step n={++n} title={`Load ${font.label}`} titleId={`${uid}-font`} tabs>
                <PackageManagerTabs value={manager} onChange={chooseManager}>
                  <CodeBlock code={installCommand(manager, font.packageName)} language="shell" label="Terminal" name="font install command" />
                </PackageManagerTabs>
                <CodeBlock code={`import '${font.packageName}'`} language="tsx" label="Next to the styles import" name="font import" />
                <p>
                  DIYA Sans comes with the package; {font.label} doesn’t. This installs it from Fontsource, self-hosted, under its own open license. <code>fontFamily</code> then calls it by name: <code>{font.family}</code>.
                </p>
              </Step>
            )}
            {button && (
              <Step n={++n} title="Button’s own settings" titleId={`${uid}-button`}>
                <CodeBlock code={button.snippet} language="tsx" label="Wherever you use Button" name="Button props" />
                <p>Your Button choices are props, not CSS. Add them where you use Button.</p>
                {button.shadow && (
                  <div className="code-note">
                    <NoteIcon />
                    <span>The shadow under solid buttons is a catalog preview for now. Button has no prop for it in 1.0, so it isn’t in your theme.</span>
                  </div>
                )}
              </Step>
            )}
          </>
        )}
      </div>
      <p className="code-sr" role="status">
        {announcement}
      </p>
    </Drawer>
  )
}

'use client'
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Badge, Button, DiyaProvider, Switch, Tag } from '@idyeah/diya'
import { useAppearance } from '../../app/Appearance'
import {
  brandSet,
  CORNERS_MAX,
  DEFAULT_APPEARANCE,
  effectiveAppearance,
  fonts,
  getPath,
  statusNames,
  type Appearance,
  type AppearancePath,
  type Elevation,
  type Motion,
  type FontId,
  type Overrides,
  type Theme,
} from '../../lib/customize/appearance'
import { contrastIssues, type ContrastIssue } from '../../lib/customize/contrast'
import { customizeItems, type ItemId } from '../../lib/customize/registry'
import { clearBrandColor, clearBrandValue, resetBrand, resetItem, restoreItem, setBrand, setBrandColor, setBrandValue } from '../../lib/customize/store'
import { appearanceCss } from '../../lib/customize/tokens'
import { contrast, ensureContrast } from '../../lib/customize/color'
import { Icon } from '../Icon'
import { BrandDarkChoice, BrandPicker, ColorRow, FontPicker, OwnValue, Segmented } from './controls'
import { useCustomizeState, useCustomizeUi } from './CustomizeContext'
import './CustomizePanel.css'

const ROLE_LABEL = { accent: 'Brand', raised: 'Raised surfaces', lines: 'Lines' } as const
const STATUS_LABEL = { success: 'Success', warning: 'Warning', error: 'Error', info: 'Info' } as const
const STATUS_HINT = { success: 'Done, saved, rising', warning: 'Needs attention', error: 'Failed, invalid, falling', info: 'Neutral updates' } as const
const CORNER_PRESETS = [
  { value: '0', label: 'Square' },
  { value: '10', label: 'Soft' },
  { value: '16', label: 'Round' },
] as const

/** Plain names for settings, for messages and the brand summary. */
export function settingName(path: string) {
  if (path === 'font') return 'Font'
  if (path === 'corners') return 'Corners'
  if (path === 'elevation') return 'Elevation'
  if (path === 'translucent') return 'Glass'
  if (path === 'motion') return 'Motion'
  const [group, theme, name] = path.split('.')
  const label =
    group === 'status'
      ? STATUS_LABEL[name as keyof typeof STATUS_LABEL]
      : name === 'text'
        ? 'Text'
        : name === 'background'
          ? 'Background'
          : ROLE_LABEL[name as keyof typeof ROLE_LABEL]
  return `${label} (${theme === 'light' ? 'Light' : 'Dark'})`
}

export function triggerId(id: ItemId) {
  return `customize-trigger-${id}`
}

export function CustomizePanel({
  id,
  extra,
  options,
  onGetTheme,
}: {
  id: ItemId
  extra?: ReactNode
  options?: Record<string, string | boolean>
  /** Opens Get theme, which exports the brand as a CSS file and props. */
  onGetTheme: () => void
}) {
  const item = customizeItems[id]
  const ui = useCustomizeUi()
  const state = useCustomizeState()
  const site = useAppearance()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const titleId = `customize-title-${uid}`
  const heading = useRef<HTMLHeadingElement>(null)
  const panel = useRef<HTMLElement>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [undo, setUndo] = useState<{ label: string; run: () => void } | null>(null)
  const open = ui.open === id

  useEffect(() => setHost(document.querySelector<HTMLElement>('.catalog-provider')), [])
  useEffect(() => {
    if (!open) return
    heading.current?.focus({ preventScroll: true })
    setAnnouncement('')
    setUndo(null)
  }, [open, id])

  /* The issue list appears above the fields; keep whatever is being edited in view. */
  const issueKey = open ? contrastIssues(effectiveAppearance(state.brand)).length : 0
  useEffect(() => {
    const active = document.activeElement as HTMLElement | null
    if (open && active && panel.current?.contains(active)) active.scrollIntoView({ block: 'nearest' })
  }, [issueKey, open])

  /* Get theme's "Adjust in Customize": bring that setting into view and focus it. */
  const request = open ? ui.focusRequest : null
  useEffect(() => {
    if (!request) return
    const frame = requestAnimationFrame(() => {
      const root = panel.current
      if (!root) return
      const path = request.path
      const target =
        document.getElementById(`customize-${uid}-${path.replace(/\./g, '-')}`) ??
        root.querySelector<HTMLElement>(`[data-path="${path}"] input:checked, [data-path="${path}"] [role="switch"]`) ??
        root.querySelector<HTMLElement>(`.customize-issues button[data-path="${path}"]`) ??
        heading.current
      target?.scrollIntoView({ block: 'nearest' })
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [request, uid])

  /* Below the desktop layout the panel is a sheet over the page bottom.
     Reserve its height so focused content can scroll clear of it
     (WCAG 2.4.11), then bring the item's preview up under the header. */
  useEffect(() => {
    if (!open || !panel.current) return
    const root = document.documentElement
    const sheet = window.matchMedia('(max-width: 1359px)')
    const apply = () => {
      const h = sheet.matches ? panel.current!.getBoundingClientRect().height : 0
      root.style.setProperty('--customize-sheet-height', `${Math.ceil(h)}px`)
    }
    const observer = new ResizeObserver(apply)
    observer.observe(panel.current)
    sheet.addEventListener('change', apply)
    apply()
    root.dataset.customizeOpen = 'true'
    const frame = requestAnimationFrame(() => {
      if (!sheet.matches) return
      const scope = document.querySelector(`.customize-scope--${id}:not(.customize-scope--bare)`)
      const specimens = scope && [...scope.children].find((el) => el.tagName !== 'STYLE' && !el.classList.contains('diya-portal-root'))
      const target = scope?.classList.contains('customize-scope--painted') ? scope : specimens
      if (!target) return
      const covering = [...document.querySelectorAll('.site-header, .site-header nav')].reduce(
        (bottom, el) => Math.max(bottom, el.getBoundingClientRect().bottom),
        0,
      )
      const top = target.getBoundingClientRect().top + window.scrollY - covering - 12
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
    })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      sheet.removeEventListener('change', apply)
      root.style.removeProperty('--customize-sheet-height')
      delete root.dataset.customizeOpen
    }
  }, [open, host, id])

  if (!open || !host) return null

  /* At 1.0 a theme is brand-level: the panel edits the brand, for every component and pattern. */
  const theme: Theme = ui.previewTheme ?? site.theme
  const brand: Overrides = state.brand ?? {}
  const shown = effectiveAppearance(state.brand)
  /* The whole library answers for the theme, so every pair is listed. */
  const issues: ContrastIssue[] = contrastIssues(shown)
  const fieldId = (path: AppearancePath) => `customize-${uid}-${path.replace(/\./g, '-')}`
  const say = (text: string) => setAnnouncement(text)

  const set = (path: AppearancePath, value: string | number | boolean) => {
    setUndo(null)
    setBrandValue(path, value)
  }
  const focusField = (path: AppearancePath) =>
    requestAnimationFrame(() => {
      const el =
        document.getElementById(fieldId(path)) ??
        panel.current?.querySelector<HTMLElement>(`[data-path="${path}"] input:checked, [data-path="${path}"] [role="switch"]`)
      el?.focus()
    })
  /* Settings this panel shows; an issue elsewhere gets a direct way back to the default. */
  const rendered = (path: AppearancePath) => {
    const [group, , role] = path.split('.')
    if (group === 'status') return !!item.status
    if (group === 'colors') return role === 'text' || role === 'background' || role === 'accent' || !!item.roles[role as 'raised' | 'lines']
    return true
  }
  /* Attribute each issue to the setting that was actually changed, and
     show one row per setting rather than per pair. */
  const changedHere = (path: AppearancePath) => Object.hasOwn(brand, path)
  const groups = [
    ...issues
      .reduce((map, issue) => {
        const path = issue.paths.find((p) => changedHere(p) && rendered(p)) ?? issue.paths.find(rendered) ?? issue.path
        const entry = map.get(path) ?? { path, theme: issue.theme, count: 0, worst: issue, issue }
        entry.count += 1
        if (issue.ratio / issue.minimum < entry.worst.ratio / entry.worst.minimum) entry.worst = issue
        return map.set(path, entry)
      }, new Map<AppearancePath, { path: AppearancePath; theme: Theme; count: number; worst: ContrastIssue; issue: ContrastIssue }>())
      .values(),
  ]
  const restoreDefault = (path: AppearancePath) => {
    if (Object.hasOwn(brand, path)) clearBrandValue(path)
    say(`${settingName(path)} uses DIYA’s default.`)
    heading.current?.focus()
  }
  const ownMark = (path: AppearancePath, name: string) =>
    Object.hasOwn(brand, path) && brand[path] !== getPath(DEFAULT_APPEARANCE, path) ? (
      <OwnValue
        followLabel="Use default"
        name={name}
        onFollow={() => {
          clearBrandValue(path)
          say(`${name} now uses DIYA’s default.`)
          focusField(path)
        }}
      />
    ) : null
  const colorPath = (role: string) => `colors.${theme}.${role}` as AppearancePath
  const close = () => {
    ui.setOpen(null)
    requestAnimationFrame(() => document.getElementById(triggerId(id))?.focus())
  }
  const fixIssue = (issue: ContrastIssue) => {
    if (issue.theme !== theme) ui.setPreviewTheme(issue.theme)
    focusField(issue.path)
  }

  /* As a non-modal region, Tab moves on from the panel's last control to
     what follows its trigger, and back from its first, as if it sat there. */
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      close()
      return
    }
    if (event.key !== 'Tab' || !panel.current) return
    const focusable = [
      ...panel.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]'),
    ].filter((el) => el.getClientRects().length && !(el instanceof HTMLInputElement && el.type === 'radio' && !el.checked))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const trigger = document.getElementById(triggerId(id))
    if (!event.shiftKey && document.activeElement === last) {
      const siblings = trigger ? [...(trigger.parentElement?.querySelectorAll<HTMLElement>('button') ?? [])] : []
      const next = siblings[siblings.indexOf(trigger!) + 1]
      if (next) {
        event.preventDefault()
        next.focus()
      }
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {
      event.preventDefault()
      trigger?.focus()
    }
  }

  const ownOptions = Object.keys(state.items[id]?.options ?? {}).length > 0
  const hasBrand = brandSet(shown)
  /* Lighter until it reads at 4.5:1 on Dark's surfaces; null when it already does. */
  const darkSurfaces = [shown.colors.dark.background, shown.colors.dark.raised]
  const lift = (hex: string) => ensureContrast(hex, darkSurfaces, 4.5, '#FFFFFF')
  /* A fill needs 3:1 against the surfaces around it (WCAG 1.4.11). */
  const readsOnDark = (hex: string) => darkSurfaces.every((surface) => contrast(hex, surface) >= 3)
  const darkFor = (hex: string) => (readsOnDark(hex) ? hex : lift(hex))
  const lifted = lift(shown.colors.light.accent)
  const lighterForDark = lifted === shown.colors.light.accent ? null : lifted
  const corners = shown.corners
  const buttonPill = id === 'button' && options?.shape !== 'rounded'
  return createPortal(
    <aside ref={panel} id={`customize-panel-${id}`} className="customize-inspector" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <header className="customize-header">
        <h2 id={titleId} ref={heading} tabIndex={-1}>
          <span className="customize-eyebrow">Customize</span> Your brand
        </h2>
        <Button variant="quiet" shape="pill" iconOnly aria-label="Close customization" onClick={close}>
          <Icon name="close" size={18} />
        </Button>
      </header>

      <div className="customize-body">
        <p className="customize-context">
          Every component and pattern starts from your brand. Here you see it on {item.title}.
        </p>

        {issues.length > 0 && (
          <section className="customize-issues" aria-labelledby={titleId + '-issues'}>
            <h3 id={titleId + '-issues'}>
              {issues.length === 1 ? 'One color pair is hard to read' : `${issues.length} color pairs are hard to read`}
            </h3>
            <ul>
              {groups.map((g) => (
                <li key={g.path}>
                  <span>
                    {g.count === 1 ? g.worst.label : `${g.count} pairs, including ${g.worst.label.toLowerCase()}`} ·{' '}
                    {g.worst.ratio}:1 of {g.worst.minimum}:1
                  </span>
                  {rendered(g.path) ? (
                    <button type="button" data-path={g.path} onClick={() => fixIssue({ ...g.issue, path: g.path, theme: g.theme })}>
                      Adjust {settingName(g.path)}
                    </button>
                  ) : (
                    <button type="button" data-path={g.path} onClick={() => restoreDefault(g.path)}>
                      Use the default {settingName(g.path)}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="customize-brand-section" aria-label="Brand color">
          <BrandPicker
            id={fieldId('colors.light.accent')}
            value={shown.colors.light.accent}
            dark={shown.colors.dark.accent}
            set={hasBrand}
            hint={item.roles.accent ? `Here: ${item.roles.accent.charAt(0).toLowerCase()}${item.roles.accent.slice(1)}` : 'Buttons, selection, switches and charts'}
            onPick={(hex) => {
              setUndo(null)
              /* Dark starts on whichever of the two reads there; the question below can change it. */
              const dark = darkFor(hex)
              setBrandColor(hex, dark)
              say(dark === hex ? `Brand set to ${hex}, in Light and Dark.` : `Brand set to ${hex}; Dark uses the lighter ${dark}.`)
            }}
            onNeutral={() => {
              setUndo(null)
              clearBrandColor()
              say('Brand back to Neutral, DIYA’s default.')
            }}
          />
          {hasBrand && (
            <BrandDarkChoice
              light={shown.colors.light.accent}
              dark={shown.colors.dark.accent}
              lighter={lighterForDark}
              sameFaint={!readsOnDark(shown.colors.light.accent)}
              onChange={(hex) => {
                setUndo(null)
                setBrandColor(shown.colors.light.accent, hex)
                say(`Dark uses ${hex}.`)
              }}
            />
          )}
          <p className="customize-help">
            One color for every component: solid buttons, selected tabs, switches, sliders and progress, and it leads the charts when it has color. Text on it turns white or near-black, whichever reads.
          </p>
        </section>

        <section aria-labelledby={titleId + '-type'}>
          <h3 id={titleId + '-type'}>Type</h3>
          <FontPicker id={fieldId('font')} value={shown.font} onChange={(font: FontId) => set('font', font)} own={ownMark('font', 'Font')} />
        </section>

        <section aria-labelledby={titleId + '-color'}>
          <div className="customize-section-heading">
            <h3 id={titleId + '-color'}>Color</h3>
            <Segmented
              legend="Palette"
              hideLegend
              value={theme}
              onChange={(t: Theme) => ui.setPreviewTheme(t)}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </div>
          <ColorRow
            id={fieldId(colorPath('text'))}
            label="Text"
            hint={item.text}
            value={shown.colors[theme].text}
            onChange={(v) => set(colorPath('text'), v)}
            own={ownMark(colorPath('text'), 'Text')}
          />
          <ColorRow
            id={fieldId(colorPath('background'))}
            label="Background"
            hint="Behind it"
            value={shown.colors[theme].background}
            onChange={(v) => set(colorPath('background'), v)}
            own={ownMark(colorPath('background'), 'Background')}
          />
          {(['raised', 'lines'] as const).map((role) =>
            item.roles[role] ? (
              <ColorRow
                key={role}
                id={fieldId(colorPath(role))}
                label={ROLE_LABEL[role]}
                hint={item.roles[role]!}
                value={shown.colors[theme][role]}
                keepAlpha={role === 'lines'}
                onChange={(v) => set(colorPath(role), v)}
                own={ownMark(colorPath(role), ROLE_LABEL[role])}
              />
            ) : null,
          )}
          <p className="customize-help">Quieter text adjusts itself to stay readable.</p>
        </section>

        {item.status && (
          <section aria-labelledby={titleId + '-status'}>
            <h3 id={titleId + '-status'}>Status · {theme === 'light' ? 'Light' : 'Dark'}</h3>
            <p className="customize-help customize-help--lead">{item.status}</p>
            {statusNames.map((status) => {
              const path = `status.${theme}.${status}` as AppearancePath
              return (
                <ColorRow
                  key={status}
                  id={fieldId(path)}
                  label={STATUS_LABEL[status]}
                  hint={STATUS_HINT[status]}
                  value={shown.status[theme][status]}
                  onChange={(v) => set(path, v)}
                  own={ownMark(path, STATUS_LABEL[status])}
                  sample={<StatusSample appearance={shown} theme={theme} status={status} />}
                />
              )
            })}
          </section>
        )}

        <section aria-labelledby={titleId + '-shape'}>
          <h3 id={titleId + '-shape'}>Shape</h3>
          <div className="customize-color-text" data-path="corners">
            <span>Corners</span>
            {ownMark('corners', 'Corners')}
          </div>
          <Segmented
            legend="Corner style"
            hideLegend
            value={(CORNER_PRESETS.find((p) => Number(p.value) === corners)?.value ?? '') as '0' | '10' | '16'}
            onChange={(v) => set('corners', Number(v))}
            options={CORNER_PRESETS}
          />
          <div className="customize-range">
            <input
              id={fieldId('corners')}
              type="range"
              min={0}
              max={CORNERS_MAX}
              step={1}
              value={corners}
              aria-label="Corner radius"
              aria-valuetext={`${corners} pixels`}
              style={{ '--range-fill': `${(corners / CORNERS_MAX) * 100}%` } as CSSProperties}
              onChange={(event) => set('corners', Number(event.target.value))}
            />
            <output aria-hidden="true">{corners}px</output>
          </div>
          <p className="customize-help">
            {buttonPill
              ? 'These buttons are pills, which keep their shape. Choose Rounded under Button’s own settings to see corners change.'
              : 'Fields use this radius; cards and panels scale with it. Pills and circles keep their shape.'}
          </p>
        </section>

        <section aria-labelledby={titleId + '-finish'}>
          <h3 id={titleId + '-finish'}>Finish</h3>
          <div className="customize-field-group" data-path="elevation">
            <div className="customize-color-text">
              <span>Elevation</span>
              {ownMark('elevation', 'Elevation')}
            </div>
            <Segmented
              legend="Elevation"
              hideLegend
              value={shown.elevation}
              onChange={(v: Elevation) => set('elevation', v)}
              options={[
                { value: 'flat', label: 'Flat' },
                { value: 'soft', label: 'Soft' },
                { value: 'lifted', label: 'Lifted' },
              ]}
            />
          </div>
          <p className="customize-help">Shadows under menus, popovers, dialogs, tables and cards that show one.</p>
          <div className="customize-switch" data-path="translucent">
            <div className="customize-color-text">
              <span aria-hidden="true">Glass</span>
              <span id={titleId + '-translucent'} className="customize-switch-hint">
                {shown.translucent ? (
                  <>
                    Your theme turns on <code>glass</code>.
                  </>
                ) : (
                  <>
                    Your theme leaves <code>glass</code> off.
                  </>
                )}
              </span>
              {ownMark('translucent', 'Glass')}
            </div>
            <Switch hideLabel label="Glass" checked={shown.translucent} onCheckedChange={(on) => set('translucent', on)} />
          </div>
          <div className="customize-field-group" data-path="motion">
            <div className="customize-color-text">
              <span>Motion</span>
              {ownMark('motion', 'Motion')}
            </div>
            <Segmented
              legend="Motion"
              hideLegend
              value={shown.motion}
              onChange={(v: Motion) => set('motion', v)}
              options={[
                { value: 'system', label: 'Match device' },
                { value: 'reduced', label: 'Reduced' },
                { value: 'off', label: 'Off' },
              ]}
            />
          </div>
          <p className="customize-help" data-testid="customize-motion-hint">
            {shown.motion === 'system' ? (
              <>Your theme follows the device’s Reduce Motion setting.</>
            ) : shown.motion === 'reduced' ? (
              <>
                Your theme sets <code>motion="reduced"</code>: fades, nothing slides.
              </>
            ) : (
              <>
                Your theme turns motion off with <code>motion="off"</code>.
              </>
            )}{' '}
            Open a menu or switch tabs in the preview to see it.
          </p>
        </section>

        {extra && (
          <section aria-labelledby={titleId + '-extra'}>
            <h3 id={titleId + '-extra'}>{item.title}’s own settings</h3>
            {extra}
          </section>
        )}
        {item.note && <p className="customize-help">{item.note}</p>}

        <div className="customize-resets">
          {ownOptions && (
            <Button
              variant="quiet"
              size="small"
              shape="pill"
              onClick={() => {
                const before = state.items[id]
                resetItem(id)
                say(`${item.title} reset.`)
                setUndo({ label: `${item.title} reset.`, run: () => restoreItem(id, before) })
                heading.current?.focus()
              }}
            >
              Reset {item.title}
            </Button>
          )}
          {state.brand && (
            <Button
              variant="quiet"
              size="small"
              shape="pill"
              onClick={() => {
                const before = state.brand
                resetBrand()
                say('Brand reset.')
                setUndo({ label: 'Brand reset.', run: () => setBrand(before) })
                heading.current?.focus()
              }}
            >
              Reset brand
            </Button>
          )}
        </div>
        {undo && (
          <p className="customize-undo">
            {undo.label}{' '}
            <button
              type="button"
              onClick={() => {
                undo.run()
                setUndo(null)
                say('Restored.')
                heading.current?.focus()
              }}
            >
              Undo
            </button>
          </p>
        )}
      </div>

      <footer className="customize-footer">
        {issues.length > 0 && (
          <p id={titleId + '-blocked'} className="customize-footnote customize-footnote--blocked">
            Fix {issues.length === 1 ? 'one color pair' : `${issues.length} color pairs`} above to get your theme.
          </p>
        )}
        <Button shape="pill" aria-describedby={issues.length ? titleId + '-blocked' : undefined} onClick={onGetTheme}>
          <Icon name="download" size={16} />
          Get theme
        </Button>
        <p className="customize-footnote">One CSS file and a few props.</p>
      </footer>
      <p role="status" className="customize-visually-hidden">
        {announcement}
      </p>
    </aside>,
    host,
  )
}

/**
 * The real Tag and count Badge for one status, rendered in their own scope
 * with this customization, so the sample is exactly what ships.
 */
function StatusSample({ appearance, theme, status }: { appearance: Appearance; theme: Theme; status: (typeof statusNames)[number] }) {
  const scope = 'customize-sample-' + useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <DiyaProvider surface={false} theme={theme} fontFamily={fonts[appearance.font].family} className={`customize-status-sample ${scope}`}>
      <span className="customize-status-sample-row" aria-hidden="true">
        <Tag tone={status} size="large" label={`${STATUS_LABEL[status]} sample`}>
          {STATUS_LABEL[status]}
        </Tag>
        <Badge variant="count" size="large" count={3} tone={status} label={`${STATUS_LABEL[status]} count sample`} />
      </span>
      <style>{appearanceCss(appearance, `.diya-root.${scope}`)}</style>
    </DiyaProvider>
  )
}

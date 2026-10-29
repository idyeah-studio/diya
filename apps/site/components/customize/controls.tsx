'use client'
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { BRAND_DEFAULT, BRAND_SUGGESTIONS, fonts, type FontId } from '../../lib/customize/appearance'
import { contrast, normalizeHex, parseHex } from '../../lib/customize/color'
import { textOnBrand } from '../../lib/customize/tokens'

/** A small set of mutually exclusive choices: native radios, styled as segments. */
export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
  hideLegend = false,
}: {
  legend: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  hideLegend?: boolean
}) {
  const name = useId()
  return (
    <fieldset className="customize-segmented">
      <legend className={hideLegend ? 'customize-visually-hidden' : undefined}>{legend}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Marks a value set on this item rather than inherited, with a way back. */
export function OwnValue({ followLabel, onFollow, name }: { followLabel: string; onFollow: () => void; name: string }) {
  return (
    <span className="customize-own">
      <span>Own value</span>
      <button type="button" onClick={onFollow} aria-label={`${followLabel} for ${name}`}>
        {followLabel}
      </button>
    </span>
  )
}

/**
 * One colour role: what it is, what it colours here, a swatch picker and a
 * hex field. Typing applies a colour once six digits are in (three-digit
 * shorthand on Enter or leaving the field), so a half-typed value never
 * takes over. Roles that are translucent by design keep their opacity.
 */
export function ColorRow({
  id,
  label,
  hint,
  value,
  onChange,
  own,
  sample,
  keepAlpha = false,
}: {
  /** The hex field's id, so other controls can return focus to it. */
  id: string
  label: string
  hint: string
  value: string
  onChange: (hex: string) => void
  own?: ReactNode
  sample?: ReactNode
  keepAlpha?: boolean
}) {
  const field = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(value.slice(0, 7))
  const [invalid, setInvalid] = useState(false)
  useEffect(() => {
    /* Never rewrite what someone is typing. */
    if (document.activeElement === field.current) return
    setDraft(value.slice(0, 7))
    setInvalid(false)
  }, [value])
  const alpha = parseHex(value).a
  const alphaHex = value.length === 9 ? value.slice(7) : ''
  const apply = (hex: string) => onChange(keepAlpha && alphaHex ? hex + alphaHex : hex)
  const commit = () => {
    const hex = normalizeHex(draft)
    if (!hex) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setDraft(hex)
    if (hex !== value.slice(0, 7).toUpperCase()) apply(hex)
  }
  return (
    <div className="customize-color">
      <div className="customize-color-text">
        <label htmlFor={id}>{label}</label>
        <span id={id + '-hint'}>{hint}</span>
        {own}
      </div>
      <div className="customize-color-field" data-invalid={invalid || undefined}>
        <span className="customize-swatch" style={{ '--swatch': value } as CSSProperties}>
          <input
            type="color"
            value={value.slice(0, 7).toLowerCase()}
            aria-label={`${label}: pick a color`}
            aria-describedby={id + '-hint'}
            onChange={(event) => apply(event.target.value.toUpperCase())}
          />
        </span>
        <input
          ref={field}
          id={id}
          type="text"
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          value={draft}
          aria-invalid={invalid || undefined}
          aria-describedby={[id + '-hint', invalid ? id + '-error' : ''].filter(Boolean).join(' ')}
          onChange={(event) => {
            const next = event.target.value
            setDraft(next)
            const digits = next.replace(/^#/, '')
            if (/^[\da-f]{6}$/i.test(digits)) {
              setInvalid(false)
              const hex = '#' + digits.toUpperCase()
              if (hex !== value.slice(0, 7).toUpperCase()) apply(hex)
            } else if (invalid && normalizeHex(next)) setInvalid(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
          }}
          onBlur={commit}
        />
        {alpha < 1 && !invalid && (
          <span className="customize-color-alpha" aria-label={`${Math.round(alpha * 100)} percent opacity`}>
            {Math.round(alpha * 100)}%
          </span>
        )}
      </div>
      {invalid && (
        <span id={id + '-error'} className="customize-error">
          Use a hex color like #1F4E7A.
        </span>
      )}
      {sample}
    </div>
  )
}

/**
 * The one brand colour: a row of suggested swatches (native radios) and a
 * hex field. What it reaches, and the text it gets, are said underneath, so
 * the choice is never a guess.
 */
export function BrandPicker({
  id,
  value,
  dark,
  set,
  hint,
  onPick,
  onNeutral,
}: {
  /** The hex field's id, so other controls can return focus to it. */
  id: string
  /** The brand in Light, or DIYA's neutral when none is set. */
  value: string
  /** The brand in Dark. */
  dark: string
  /** Whether a brand is set at all. */
  set: boolean
  /** What the brand colours on this item. */
  hint: string
  onPick: (hex: string) => void
  onNeutral: () => void
}) {
  const name = useId()
  const field = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(value)
  const [invalid, setInvalid] = useState(false)
  useEffect(() => {
    if (document.activeElement === field.current) return
    setDraft(value)
    setInvalid(false)
  }, [value])
  const known = BRAND_SUGGESTIONS.some((swatch) => swatch.hex === value)
  const pick = (hex: string) => (hex === BRAND_DEFAULT.light ? onNeutral() : onPick(hex))
  const commit = () => {
    const hex = normalizeHex(draft)
    if (!hex) return setInvalid(true)
    setInvalid(false)
    setDraft(hex)
    if (hex !== value) pick(hex)
  }
  const inkName = (fill: string) => (['#FAFAFA', '#FFFFFF'].includes(textOnBrand(fill)) ? 'white' : 'near-black')
  const ratio = (fill: string) => Math.floor(contrast(textOnBrand(fill), fill) * 10) / 10
  const onBoth =
    inkName(value) === inkName(dark)
      ? `${inkName(value) === 'white' ? 'White' : 'Near-black'} text on it`
      : `Text on it: ${inkName(value)} in Light, ${inkName(dark)} in Dark`
  return (
    <div className="customize-brand">
      <fieldset className="customize-brand-swatches">
        <legend className="customize-brand-legend">
          <span>Brand</span>
          <span className="customize-brand-hint">{hint}</span>
        </legend>
        <div>
          {BRAND_SUGGESTIONS.map((swatch) => (
            <label
              key={swatch.hex}
              className="customize-brand-swatch"
              /* Neutral is two colors, one per theme: shown as both. */
              style={{ '--swatch': swatch.hex === BRAND_DEFAULT.light ? `linear-gradient(135deg, ${BRAND_DEFAULT.light} 50%, ${BRAND_DEFAULT.dark} 50%)` : swatch.hex } as CSSProperties}
            >
              <input
                type="radio"
                name={name}
                checked={swatch.hex === BRAND_DEFAULT.light ? !set : set && swatch.hex === value}
                onChange={() => pick(swatch.hex)}
              />
              <span className="customize-visually-hidden">
                {swatch.name === 'Neutral' ? 'Neutral, DIYA’s default' : `${swatch.name}, ${swatch.hex}`}
              </span>
            </label>
          ))}
          {set && !known && (
            <label className="customize-brand-swatch" style={{ '--swatch': value } as CSSProperties}>
              <input type="radio" name={name} checked onChange={() => undefined} />
              <span className="customize-visually-hidden">Your own, {value}</span>
            </label>
          )}
        </div>
      </fieldset>
      <div className="customize-brand-row">
        <div className="customize-color-field" data-invalid={invalid || undefined}>
          <label htmlFor={id} className="customize-visually-hidden">
            Brand hex
          </label>
          <span className="customize-brand-mark" style={{ '--swatch': value } as CSSProperties} aria-hidden="true" />
          <input
            ref={field}
            id={id}
            type="text"
            spellCheck={false}
            autoComplete="off"
            maxLength={7}
            value={draft}
            aria-invalid={invalid || undefined}
            aria-describedby={[id + '-on', invalid ? id + '-error' : ''].filter(Boolean).join(' ')}
            onChange={(event) => {
              const next = event.target.value
              setDraft(next)
              const digits = next.replace(/^#/, '')
              if (/^[\da-f]{6}$/i.test(digits)) {
                setInvalid(false)
                const hex = '#' + digits.toUpperCase()
                if (hex !== value) pick(hex)
              } else if (invalid && normalizeHex(next)) setInvalid(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit()
            }}
            onBlur={commit}
          />
        </div>
        <span id={id + '-on'} className="customize-brand-on">
          <span className="customize-brand-samples" aria-hidden="true">
            {(dark === value ? [value] : [value, dark]).map((fill, index) => (
              <span key={index} className="customize-brand-sample" style={{ background: fill, color: textOnBrand(fill) }}>
                Aa
              </span>
            ))}
          </span>
          <span>
            {onBoth} · {ratio(value)}:1{dark !== value ? ` and ${ratio(dark)}:1` : ''}
          </span>
        </span>
      </div>
      {invalid && (
        <span id={id + '-error'} className="customize-error">
          Use a hex color like #1F4E7A.
        </span>
      )}
    </div>
  )
}

/**
 * "Use this in Dark too?": the same colour, or a lighter one that reads on
 * Dark surfaces. Shown once a brand is set.
 */
export function BrandDarkChoice({
  light,
  dark,
  lighter,
  sameFaint,
  onChange,
}: {
  light: string
  dark: string
  /** A lighter version that reads at 4.5:1 on Dark, or null when the brand already does. */
  lighter: string | null
  /** The same color would be hard to see on Dark's surfaces (under 3:1). */
  sameFaint: boolean
  onChange: (hex: string) => void
}) {
  const name = useId()
  const options = [
    { hex: light, label: 'Same color', note: sameFaint ? 'hard to see on Dark' : '' },
    ...(lighter ? [{ hex: lighter, label: 'Lighter for Dark', note: '' }] : []),
    ...(dark !== light && dark !== lighter ? [{ hex: dark, label: 'Your own', note: '' }] : []),
  ]
  if (!lighter && dark === light)
    return <p className="customize-help">It reads well on Dark too, so Dark uses the same color.</p>
  return (
    <fieldset className="customize-brand-dark" data-path="colors.dark.accent">
      <legend>Use this in Dark too?</legend>
      <div>
        {options.map((option) => (
          <label key={option.label}>
            <input type="radio" name={name} checked={dark === option.hex} onChange={() => onChange(option.hex)} />
            <span className="customize-brand-dark-swatch" style={{ '--swatch': option.hex } as CSSProperties} aria-hidden="true" />
            <span>
              {option.label} <span className="customize-brand-hex">{option.hex}</span>
              {option.note && <span className="customize-brand-hex"> · {option.note}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const fontGroups: { title: string; ids: FontId[] }[] = [
  { title: 'Sans', ids: ['diya-sans', 'sans', 'system', 'inter', 'manrope', 'dm-sans', 'plus-jakarta-sans', 'outfit', 'space-grotesk', 'work-sans', 'figtree', 'source-sans-3'] },
  { title: 'Serif', ids: ['serif', 'lora', 'source-serif-4'] },
  { title: 'Mono', ids: ['mono', 'roboto-mono'] },
]

/**
 * Font choice where each option is set in its own face, so people choose
 * by eye. Follows the APG select-only combobox pattern, including
 * type-ahead and Tab committing the active option.
 */
export function FontPicker({ id, value, onChange, own }: { id: string; value: FontId; onChange: (font: FontId) => void; own?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const order = fontGroups.flatMap((g) => g.ids)
  const [active, setActive] = useState(order.indexOf(value))
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const typed = useRef({ text: '', at: 0 })
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])
  /* When the list opens inside a short sheet, bring it into view. */
  useEffect(() => {
    if (open) list.current?.scrollIntoView({ block: 'nearest' })
  }, [open])
  const choose = (font: FontId, refocus = true) => {
    onChange(font)
    setOpen(false)
    if (refocus) button.current?.focus()
  }
  const openAt = (index: number) => {
    setActive(index)
    setOpen(true)
  }
  const onKey = (event: KeyboardEvent) => {
    const current = order.indexOf(value)
    const keys: Record<string, () => void> = {
      ArrowDown: () => (open ? setActive((i) => Math.min(order.length - 1, i + 1)) : openAt(current)),
      ArrowUp: () => (open ? setActive((i) => Math.max(0, i - 1)) : openAt(current)),
      Home: () => openAt(0),
      End: () => openAt(order.length - 1),
      Enter: () => (open ? choose(order[active]) : openAt(current)),
      ' ': () => (open ? choose(order[active]) : openAt(current)),
      Escape: () => open && setOpen(false),
      Tab: () => open && choose(order[active], false),
    }
    const handler = keys[event.key]
    if (handler) {
      if (event.key !== 'Tab' && !(event.key === 'Escape' && !open)) event.preventDefault()
      if (event.key === 'Escape' && open) event.stopPropagation()
      handler()
      return
    }
    /* Type-ahead: jump to the first face whose name starts with what was typed. */
    if (event.key.length === 1 && /\S/.test(event.key) && !event.metaKey && !event.ctrlKey) {
      const now = Date.now()
      typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : '') + event.key.toLowerCase(), at: now }
      const match = order.findIndex((f) => fonts[f].label.toLowerCase().startsWith(typed.current.text))
      if (match >= 0) openAt(match)
    }
  }
  return (
    <div className="customize-font">
      <div className="customize-color-text">
        <span id={id + '-label'}>Font</span>
        {own}
      </div>
      <button
        ref={button}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id + '-list' : undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-activedescendant={open ? `${id}-${order[active]}` : undefined}
        className="customize-font-button"
        onClick={() => (open ? setOpen(false) : openAt(order.indexOf(value)))}
        onKeyDown={onKey}
        onBlur={(event) => {
          if (!list.current?.contains(event.relatedTarget as Node)) setOpen(false)
        }}
      >
        <span id={id + '-value'} style={{ fontFamily: fonts[value].family }}>
          {fonts[value].label}
        </span>
        <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>
      {open && (
        <ul ref={list} id={id + '-list'} role="listbox" aria-labelledby={id + '-label'} className="customize-font-list" tabIndex={-1}>
          {fontGroups.map((group) => (
            <li key={group.title} role="presentation">
              <span className="customize-font-group" aria-hidden="true">
                {group.title}
              </span>
              <ul role="group" aria-label={group.title}>
                {group.ids.map((font) => (
                  <li
                    key={font}
                    id={`${id}-${font}`}
                    role="option"
                    aria-selected={font === value}
                    data-active={order[active] === font || undefined}
                    data-index={order.indexOf(font)}
                    style={{ fontFamily: fonts[font].family }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(font)}
                    onMouseMove={() => setActive(order.indexOf(font))}
                  >
                    {fonts[font].label}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

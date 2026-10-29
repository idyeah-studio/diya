'use client'
import { useState } from 'react'
import { Button, Switch } from '@idyeah/diya'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions } from './PreviewControls'
import { Icon } from './Icon'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { Segmented } from './customize/controls'
import { useCustomizeState } from './customize/CustomizeContext'
import { setItemOption } from '../lib/customize/store'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'

type Kind = 'normal' | 'icon'
type Size = 'small' | 'medium' | 'large'
type Shape = 'pill' | 'rounded'
const sizes = ['small', 'medium', 'large'] as const

/** Button's own settings. They persist with the customization and ship in its download. */
function useButtonOptions() {
  const options = useCustomizeState().items.button?.options ?? {}
  return {
    kind: (options.kind === 'icon' ? 'icon' : 'normal') as Kind,
    size: ((sizes as readonly string[]).includes(options.size as string) ? options.size : 'medium') as Size,
    shape: (options.shape === 'rounded' ? 'rounded' : 'pill') as Shape,
    leadingIcon: options.leadingIcon === true,
    trailingIcon: options.trailingIcon === true,
    shadow: options.shadow === true,
    raw: options,
  }
}

export function ButtonLibrary() {
  const [clicks, setClicks] = useState(0)
  const [state, setState] = useState('Default')
  const { kind, size, shape, leadingIcon, trailingIcon, shadow, raw } = useButtonOptions()
  const set = (key: string, value: string | boolean) => setItemOption('button', key, value)
  const activate = () => setClicks((value) => value + 1)
  const extra = (
    <>
      <Segmented
        legend="Shape"
        value={shape}
        onChange={(value: Shape) => set('shape', value)}
        options={[
          { value: 'pill', label: 'Pill' },
          { value: 'rounded', label: 'Rounded' },
        ]}
      />
      <div className="customize-switch">
        <div className="customize-color-text">
          <span aria-hidden="true">Shadow under solid buttons</span>
        </div>
        <Switch hideLabel label="Shadow under solid buttons" checked={shadow} onCheckedChange={(on) => set('shadow', on)} />
      </div>
    </>
  )
  return (
    <main id="content" className="gallery-study component-library button-library" data-area="components">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current="button" />
      <div className="component-document">
        <header className="component-document-heading">
          <LibraryActions id="button" extra={extra} options={raw} />
          <h2 id="button-heading" tabIndex={-1}>
            Button
          </h2>
        </header>
        <div className="component-preview-stage button-specimens">
          <div className="button-preview-controls">
            <div className="button-kind-control">
              <fieldset className="button-control-group">
                <legend>Type</legend>
                <div className="button-mini-switch">
                  {(['normal', 'icon'] as const).map((value) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="button-kind"
                        value={value}
                        checked={kind === value}
                        onChange={() => set('kind', value)}
                      />
                      <span>{value === 'normal' ? 'Normal' : 'Icon'}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="button-other-controls">
              <fieldset className="button-control-group">
                <legend>Size</legend>
                <div className="button-mini-switch">
                  {sizes.map((value) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="button-size"
                        checked={size === value}
                        onChange={() => set('size', value)}
                      />
                      <span>{value[0].toUpperCase() + value.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <PreviewOptions
                className="button-icon-group"
                label="Icon"
                disabled={kind === 'icon'}
                items={[
                  { label: 'Leading', checked: leadingIcon, onChange: (value) => set('leadingIcon', value) },
                  { label: 'Trailing', checked: trailingIcon, onChange: (value) => set('trailingIcon', value) },
                ]}
              />
              <fieldset className="button-control-group">
                <legend>State</legend>
                <div className="button-mini-switch">
                  {['Default', 'Disabled', 'Loading'].map((value) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="button-state"
                        value={value}
                        checked={state === value}
                        onChange={() => setState(value)}
                      />
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
          <CustomizationScope id="button">
            <section aria-label="Button variants">
              <div className="button-specimen-row">
                {(['solid', 'outline', 'quiet'] as const).map((variant) => (
                  <div className="button-specimen" key={variant}>
                    <Button
                      variant={variant}
                      size={size}
                      shape={shape}
                      data-custom-shadow={shadow || undefined}
                      iconOnly={kind === 'icon'}
                      aria-label={kind === 'icon' ? `${variant} add item` : undefined}
                      disabled={state === 'Disabled'}
                      loading={state === 'Loading'}
                      onClick={activate}
                    >
                      {kind === 'icon' ? (
                        <Icon name="plus" size={18} />
                      ) : (
                        <>
                          {leadingIcon && <Icon name="plus" size={14} />}
                          Continue
                          {trailingIcon && <Icon name="check" size={14} />}
                        </>
                      )}
                    </Button>
                    <span>{variant === 'solid' ? 'Solid' : variant === 'outline' ? 'Outline' : 'Quiet'}</span>
                  </div>
                ))}
              </div>
            </section>
          </CustomizationScope>
          <span className="button-feedback" role="status">
            {clicks ? `Button activated ${clicks} ${clicks === 1 ? 'time' : 'times'}.` : ''}
          </span>
        </div>
      </div>
    </main>
  )
}

'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { Badge, type Tone } from '@idyeah/diya'
import { Bell } from 'lucide-react'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './BadgeLibrary.css'
const tones: Tone[] = ['neutral', 'success', 'warning', 'error', 'info', 'brand']
const statusLabels: Record<Tone, string> = {
  neutral: 'Status indicator',
  brand: 'Brand indicator',
  success: 'Healthy',
  warning: 'Needs attention',
  error: 'Issue detected',
  info: 'Information available',
}
export function BadgeLibrary() {
  const [variant, setVariant] = useState<'dot' | 'count'>('dot')
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [tone, setTone] = useState<Tone>('neutral')
  return (
    <main
      id="content"
      className="gallery-study component-library button-library badge-library"
      data-area="components"
    >
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current="badge" />
      <div className="component-document">
        <header className="component-document-heading">          <h1>Badge</h1>
<LibraryActions id="badge" />
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="button-preview-controls">
            <div className="button-kind-control">
              <fieldset className="button-control-group">
                <legend>Variant</legend>
                <div className="button-mini-switch">
                  {(['dot', 'count'] as const).map((option) => (
                    <label key={option}>
                      <input
                        type="radio"
                        name="badge-variant"
                        checked={variant === option}
                        onChange={() => setVariant(option)}
                      />
                      <span>{option === 'dot' ? 'Dot' : 'Count'}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="button-other-controls">
              <fieldset className="button-control-group">
                <legend>Size</legend>
                <div className="button-mini-switch">
                  {(['small', 'medium', 'large'] as const).map((option) => (
                    <label key={option}>
                      <input
                        type="radio"
                        name="badge-size"
                        checked={size === option}
                        onChange={() => setSize(option)}
                      />
                      <span>{option[0].toUpperCase() + option.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="button-control-group badge-color-group">
                <legend>Color</legend>
                <div className="badge-color-options">
                  {tones.map((option) => (
                    <label key={option}>
                      <input
                        type="radio"
                        name="badge-color"
                        aria-label={option[0].toUpperCase() + option.slice(1)}
                        checked={tone === option}
                        onChange={() => setTone(option)}
                      />
                      <span className="badge-color-swatch">
                        <Badge variant="dot" tone={option} label={option} />
                        <span>{option[0].toUpperCase() + option.slice(1)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
          <CustomizationScope id="badge"><section className="badge-example" aria-label="Badge preview">
            {variant === 'dot' ? (
              /* The dot as it's used: on an icon, beside a label, and on its own. */
              <div className="badge-count-examples">
                <div className="badge-count-specimen">
                  <div>
                    <span className="badge-on-icon">
                      <Bell size={20} strokeWidth={1.6} aria-hidden="true" />
                      <Badge variant="dot" size={size} tone={tone} label={statusLabels[tone]} />
                    </span>
                  </div>
                  <span>On an icon</span>
                </div>
                <div className="badge-count-specimen">
                  <div>
                    <span className="badge-beside">
                      Deploys
                      <Badge variant="dot" size={size} tone={tone} label={statusLabels[tone]} />
                    </span>
                  </div>
                  <span>Beside a label</span>
                </div>
                <div className="badge-count-specimen">
                  <div>
                    <Badge variant="dot" size={size} tone={tone} label={statusLabels[tone]} />
                  </div>
                  <span>On its own</span>
                </div>
              </div>
            ) : (
              <div className="badge-count-examples">
                {[
                  { count: 8, label: 'Single digit' },
                  { count: 24, label: 'Multiple digits' },
                  { count: 120, label: 'Overflow' },
                ].map((example) => (
                  <div className="badge-count-specimen" key={example.label}>
                    <div>
                      <Badge
                        variant="count"
                        size={size}
                        tone={tone}
                        count={example.count}
                        max={99}
                        showZero
                        label="unread notifications"
                      />
                    </div>
                    <span>{example.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section></CustomizationScope>
        </div>
      </div>
    </main>
  )
}

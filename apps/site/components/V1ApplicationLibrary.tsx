'use client'
import { useState, type ReactNode } from 'react'
import { PatternSidebar } from './PatternSidebar'
import { PreviewOptions } from './PreviewControls'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { ApplicationPreview } from './ApplicationPreview'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './PageHeaderLibrary.css'

export type ApplicationPattern = 'chatbot' | 'side-navigation'
const titles: Record<ApplicationPattern, string> = {
  chatbot: 'Chatbot',
  'side-navigation': 'Side Navigation',
}
export function V1ApplicationLibrary({
  pattern,
  sidebar,
}: {
  pattern: ApplicationPattern
  sidebar?: ReactNode
}) {
  const [type, setType] = useState<'Embedded' | 'Floating' | 'Full-page'>('Embedded')
  const [options, setOptions] = useState<Record<string, boolean>>({
    Suggestions: true,
    Timestamps: false,
    Collapsed: false,
    Groups: true,
    Counts: false,
  })
  const parts = pattern === 'chatbot' ? ['Suggestions', 'Timestamps'] : ['Collapsed', 'Groups', 'Counts']
  return (
    <main id="content" className="gallery-study component-library pattern-library">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      {sidebar ?? <PatternSidebar current={pattern} />}
      <div className="component-document">
        <header className="component-document-heading">
          <h1>{titles[pattern]}</h1>
          <LibraryActions id={pattern} />
        </header>
        <section className="pattern-stage" aria-label={`${titles[pattern]} playground`}>
          <div className="pattern-controls">
            {pattern === 'chatbot' && (
              <fieldset className="button-control-group">
                <legend>Type</legend>
                <div className="button-mini-switch">
                  {(['Embedded', 'Floating', 'Full-page'] as const).map((t) => (
                    <label key={t}>
                      <input
                        type="radio"
                        name="chat-presentation"
                        checked={type === t}
                        onChange={() => setType(t)}
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <PreviewOptions
              items={parts.map((part) => ({
                label: part,
                checked: options[part],
                onChange: (value: boolean) => setOptions({ ...options, [part]: value }),
              }))}
            />
          </div>
          <CustomizationScope id={pattern}><div className="pattern-canvas application-pattern-canvas">
            <ApplicationPreview
              pattern={pattern}
              layout={type}
              suggestions={options.Suggestions}
              showTimestamps={options.Timestamps}
              collapsed={options.Collapsed}
              groups={options.Groups}
              counts={options.Counts}
            />
          </div></CustomizationScope>
        </section>
      </div>
    </main>
  )
}

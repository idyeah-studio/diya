'use client'
import { useState } from 'react'
import { Calendar, type DateRange } from '@idyeah/diya'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions } from './PreviewControls'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'

/** The preview's unavailable days, as the Get code example writes them. */
const isWeekend = (date: string) => [0, 6].includes(new Date(`${date}T12:00`).getDay())
const sizes = ['small', 'medium', 'large'] as const

/** The Calendar page: DatePicker's month grid, kept on the page. */
export function CalendarLibrary() {
  const [mode, setMode] = useState('Single')
  const [size, setSize] = useState<(typeof sizes)[number]>('medium')
  const [label, setLabel] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [state, setState] = useState('Default')
  const [day, setDay] = useState('')
  const [timeOff, setTimeOff] = useState<DateRange>({ start: '', end: '' })
  const shared = {
    size,
    hideLabel: !label,
    isDateUnavailable: unavailable ? isWeekend : undefined,
    disabled: state === 'Disabled',
  }
  return (
    <main id="content" className="gallery-study component-library button-library advanced-input-library" data-area="components">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current="calendar" />
      <div className="component-document">
        <header className="component-document-heading">
          <h1>Calendar</h1>
          <LibraryActions id="calendar" />
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="input-preview-controls">
            <fieldset className="button-control-group">
              <legend>Type</legend>
              <div className="button-mini-switch">
                {['Single', 'Range'].map((item) => (
                  <label key={item}>
                    <input type="radio" name="calendar-type" checked={mode === item} onChange={() => { setMode(item); setDay(''); setTimeOff({ start: '', end: '' }) }} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="button-control-group">
              <legend>Size</legend>
              <div className="button-mini-switch">
                {sizes.map((item) => (
                  <label key={item}>
                    <input type="radio" name="calendar-size" checked={size === item} onChange={() => setSize(item)} />
                    <span>{item[0].toUpperCase() + item.slice(1)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <PreviewOptions
              className="input-options-group"
              items={[
                { label: 'Label', checked: label, onChange: setLabel },
                { label: 'Unavailable days', checked: unavailable, onChange: setUnavailable },
              ]}
            />
            <fieldset className="button-control-group">
              <legend>State</legend>
              <div className="button-mini-switch">
                {['Default', 'Disabled'].map((item) => (
                  <label key={item}>
                    <input type="radio" name="calendar-state" checked={state === item} onChange={() => setState(item)} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <CustomizationScope id="calendar">
            <section className="input-example" aria-label="Calendar preview">
              {mode === 'Range' ? (
                <Calendar {...shared} label="Time off" range value={timeOff} onValueChange={setTimeOff} />
              ) : (
                <Calendar {...shared} label="Pick a day" value={day} onValueChange={setDay} />
              )}
            </section>
          </CustomizationScope>
        </div>
      </div>
    </main>
  )
}

'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions, PreviewSetting } from './PreviewControls'
import { Button, Spinner } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'

const SIZES = ['Small', 'Medium', 'Large'] as const

/**
 * One busy part of a page. A Spinner waits 400ms before it shows, so the
 * preview can start it again to show the wait.
 */
export function SpinnerLibrary() {
  const [size, setSize] = useState<(typeof SIZES)[number]>('Medium')
  const [showLabel, setShowLabel] = useState(false)
  const [run, setRun] = useState(0)
  return (
    <main id="content" className="gallery-study component-library button-library text-input-library" data-area="components">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current="spinner" />
      <div className="component-document">
        <header className="component-document-heading">
          <h1>Spinner</h1>
          <LibraryActions id="spinner" />
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="input-preview-controls">
            <PreviewSetting label="Size" options={[...SIZES]} value={size} onChange={(next) => setSize(next as (typeof SIZES)[number])} />
            <PreviewOptions className="input-options-group" items={[{ label: 'Show label', checked: showLabel, onChange: setShowLabel }]} />
            <Button variant="quiet" size="small" className="spinner-library-again" onClick={() => setRun((count) => count + 1)}>
              Start again
            </Button>
          </div>
          <CustomizationScope id="spinner">
            <section className="input-example" aria-label="Spinner preview">
              <Spinner key={run} label="Loading invoices" showLabel={showLabel} size={size === 'Small' ? 'small' : size === 'Large' ? 'large' : 'medium'} />
            </section>
          </CustomizationScope>
        </div>
      </div>
    </main>
  )
}

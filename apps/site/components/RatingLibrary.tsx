'use client'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { useState } from 'react'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions, PreviewSetting } from './PreviewControls'
import { Rating } from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './RatingLibrary.css'

const specimens = [
  { value: 5, count: 2140, caption: 'Full marks' },
  { value: 4.3, count: 128, caption: '4.3, shown as 4½' },
  { value: 2.5, count: 36, caption: 'Half star' },
  { value: 0, count: 0, caption: 'Not rated yet' },
]

export function RatingLibrary() {
  const [size, setSize] = useState('Medium')
  const [number, setNumber] = useState(false)
  const [count, setCount] = useState(true)
  const typedSize = size.toLowerCase() as 'small' | 'medium' | 'large'
  return (
    <main
      id="content"
      className="gallery-study component-library button-library rating-library"
      data-area="components"
    >
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current="rating" />
      <div className="component-document">
        <header className="component-document-heading">
          <h1>Rating</h1>
          <LibraryActions id="rating" />
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="input-preview-controls">
            <PreviewSetting
              label="Size"
              options={['Small', 'Medium', 'Large']}
              value={size}
              onChange={setSize}
            />
            <PreviewOptions
              items={[
                { label: 'Number', checked: number, onChange: setNumber },
                { label: 'Review count', checked: count, onChange: setCount },
              ]}
            />
          </div>
          <CustomizationScope id="rating">
            <section className="rating-example" aria-label="Rating preview">
              <ul className="rating-specimens">
                {specimens.map((item) => (
                  <li key={item.value}>
                    <Rating
                      value={item.value}
                      count={count ? item.count : undefined}
                      showValue={number}
                      size={typedSize}
                    />
                    <span>{item.caption}</span>
                  </li>
                ))}
              </ul>
            </section>
          </CustomizationScope>
        </div>
      </div>
    </main>
  )
}

'use client'
import { useState } from 'react'
import { CodeBlock, Prose } from '@idyeah/diya'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import { AtomicSidebar } from './AtomicSidebar'
import { PreviewOptions, PreviewSetting } from './PreviewControls'
import { FORMAT_FILE, FORMAT_SOURCE, INSTALL_COMMAND } from './code/content-examples'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
import './ContentLibrary.css'

export type ContentAtom = 'prose' | 'code-block'
const titles = { prose: 'Prose', 'code-block': 'Code Block' }

/** Prose and Code Block: long-form writing and the code inside it. */
export function ContentLibrary({ component }: { component: ContentAtom }) {
  const [size, setSize] = useState('Medium')
  const [content, setContent] = useState('File')
  const [label, setLabel] = useState(true)
  const title = titles[component]
  const command = content === 'Command'
  return (
    <main id="content" className="gallery-study component-library button-library content-library" data-area="components">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar current={component} />
      <div className="component-document">
        <header className="component-document-heading">
          <LibraryActions id={component} />
          <h2>{title}</h2>
        </header>
        <div className="component-preview-stage input-specimens">
          <div className="input-preview-controls">
            {component === 'prose' ? (
              <PreviewSetting label="Size" options={['Small', 'Medium', 'Large']} value={size} onChange={setSize} />
            ) : (
              <>
                <PreviewSetting label="Content" options={['File', 'Command']} value={content} onChange={setContent} />
                <PreviewOptions items={[{ label: 'Label', checked: label, onChange: setLabel }]} />
              </>
            )}
          </div>
          <CustomizationScope id={component}>
            <section className="content-example" data-component={component} aria-label={`${title} preview`}>
              {component === 'prose' ? (
                <InvoiceArticle size={size.toLowerCase() as 'small' | 'medium' | 'large'} />
              ) : (
                <CodeBlock
                  label={label ? (command ? 'Shell' : FORMAT_FILE) : undefined}
                  code={command ? INSTALL_COMMAND : FORMAT_SOURCE}
                />
              )}
            </section>
          </CustomizationScope>
        </div>
      </div>
    </main>
  )
}

/** The same article Get code gives for Prose. */
function InvoiceArticle({ size }: { size: 'small' | 'medium' | 'large' }) {
  return (
    <Prose size={size}>
      <h2>Send your first invoice</h2>
      <p>
        Invoices go out from <strong>Billing</strong>. Each one gets a number, a due date and a link your client can pay
        from. Drafts save as you type.
      </p>
      <ol>
        <li>Choose a client, or add one with their billing email.</li>
        <li>
          Add line items. Amounts are in cents, so <code>12500</code> is $125.00.
        </li>
        <li>
          Press <kbd>⌘</kbd> <kbd>Enter</kbd> to send it, or save it as a draft.
        </li>
      </ol>
      <h3>Payment terms</h3>
      <p>
        Terms set the due date from the day you send. Most teams start with Net&nbsp;30 and change it for a client when
        they need to.
      </p>
      <table>
        <thead>
          <tr>
            <th>Term</th>
            <th>Due</th>
            <th>First reminder</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Due on receipt</td>
            <td>The same day</td>
            <td>After 3 days</td>
          </tr>
          <tr>
            <td>Net 15</td>
            <td>15 days after sending</td>
            <td>3 days before</td>
          </tr>
          <tr>
            <td>Net 30</td>
            <td>30 days after sending</td>
            <td>5 days before</td>
          </tr>
        </tbody>
      </table>
      <blockquote>
        <p>Send reminders from the invoice, not your inbox. Each one is logged, so nobody is chased twice.</p>
      </blockquote>
      <h3>Format amounts</h3>
      <p>
        Use one helper wherever amounts appear, so totals round the same way on every screen.{' '}
        <a href="#currencies">Currencies</a> lists the rest.
      </p>
      <CodeBlock label={FORMAT_FILE} code={FORMAT_SOURCE} />
    </Prose>
  )
}

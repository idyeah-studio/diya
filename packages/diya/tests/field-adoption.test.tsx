// Step 6: DIYA's own fields adopt Field's parts. Their markup is unchanged (field-markup.test.tsx
// and the 1.1.1 fixture prove it); what's new is audible: each announces a blur error once, as
// "Label: error", politely (B3, frontend.md step 6). React 18 and 19.
import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import * as lib from '../dist/index.js'

const polite = () => document.querySelector('.diya-toast-host > [aria-live=polite]')?.textContent ?? ''
const settled = () => act(async () => { await new Promise((done) => setTimeout(done, 30)); await new Promise((done) => requestAnimationFrame(() => done(null))) })
const options = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Bravo' }]

const fields: [string, (error?: string) => ReactNode][] = [
  ['TextInput', (error) => <lib.TextInput label="Project name" error={error} />],
  ['Search', (error) => <lib.Search label="Project name" error={error} />],
  ['TextArea', (error) => <lib.TextArea label="Project name" error={error} />],
  ['Select', (error) => <lib.Select label="Project name" options={options} error={error} />],
  ['Combobox', (error) => <lib.Combobox label="Project name" options={options} error={error} />],
  ['DatePicker', (error) => <lib.DatePicker label="Project name" error={error} />],
  ['Switch', (error) => <lib.Switch label="Project name" error={error} />],
  ['Choice', (error) => <lib.Choice label="Project name" options={options} error={error} />],
]

describe("DIYA's fields announce a blur error once (step 6)", () => {
  for (const [name, field] of fields) {
    it(name, async () => {
      function Host() {
        const [error, setError] = useState<string>()
        return <>{field(error)}<button type="button" onClick={() => setError('Choose a name for the project.')}>Check</button></>
      }
      render(<lib.DiyaProvider><Host /></lib.DiyaProvider>)
      await settled()
      // Every time the polite region is given words.
      const said: string[] = []
      const region = document.querySelector('.diya-toast-host > [aria-live=polite]')!
      const watch = new MutationObserver(() => { if (region.textContent) said.push(region.textContent) })
      watch.observe(region, { childList: true, characterData: true, subtree: true })
      // The check runs after the person has left the field: focus isn't in it.
      fireEvent.click(screen.getByRole('button', { name: 'Check' }))
      await settled()
      expect(polite()).toBe('Project name: Choose a name for the project.')
      expect(screen.getAllByText('Choose a name for the project.')).toHaveLength(1)
      // Once: the same error again says nothing new.
      fireEvent.click(screen.getByRole('button', { name: 'Check' }))
      await settled()
      watch.disconnect()
      expect(said).toEqual(['Project name: Choose a name for the project.'])
    })
  }
})

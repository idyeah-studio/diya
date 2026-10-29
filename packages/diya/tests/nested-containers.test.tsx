// Containers leave nested DIYA components alone. A Form, Card, Drawer, Dialog, Wizard, Accordion, Table or
// Chatbot styles its own parts and your plain elements, never an Alert, List, Switch or any other DIYA
// component placed inside.
// HappyDOM can't match complex selectors inside :not() or :where(), so, as with Prose, the rules are read
// here and the computed styles of nested components were compared with standalone ones in Chromium.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { Accordion, Button, Chatbot, ContentState, DiyaProvider, Drawer, FileUpload, Form, Table, Wizard } from '../dist/index.js'
import { splitSelectors } from '../scripts/styles-transform.mjs'
import { parseRules } from './style-tokens'

const css = readFileSync(resolve(process.cwd(), 'dist/styles.css'), 'utf8')
const rules = parseRules(css)
const noop = () => {}

// The containers whose slots take your content (any part of the first group; the named parts of the
// second), and the start of the guard Prose uses: not a DIYA element, nor inside one. Table's version
// lets its own diya-table parts through.
const CONTAINER = /\.diya-(card|dialog|drawer|workflow-surface|project-form|wizard-body)\b[\w-]*|\.diya-(accordion|accordion-content|table|chat|chat-welcome|chat-notice|chat-header)(?![\w-])/
const GUARD = ":not(:where([class*='diya-']"
// Reaches into a nested field on purpose: it hides Safari's contacts button on one named input.
const DELIBERATE = ["input[name='project-title']::-webkit-contacts-auto-fill-button"]

/** Expands a top-level :is(a, b) so each argument is checked as its own selector. */
function expand(selector: string): string[] {
  const at = selector.indexOf(':is(')
  if (at < 0) return [selector]
  let depth = 0
  let end = at + 3
  for (; end < selector.length; end++) {
    if (selector[end] === '(') depth++
    if (selector[end] === ')' && --depth === 0) break
  }
  const head = selector.slice(0, at)
  const tail = selector.slice(end + 1)
  if (tail.trim() && !/^[\s>+~]/.test(tail)) return [selector]
  return splitSelectors(selector.slice(at + 4, end)).flatMap((part) => expand(head + part + tail))
}

/** Compounds and the combinator before each, ignoring anything inside brackets or parentheses. */
function compounds(selector: string) {
  const out: { combinator: string; compound: string }[] = []
  let depth = 0
  let buffer = ''
  let combinator = ''
  for (const char of selector.trim()) {
    if (char === '(' || char === '[') depth++
    if (char === ')' || char === ']') depth--
    if (depth === 0 && /[\s>+~]/.test(char)) {
      if (buffer) { out.push({ combinator: combinator || ' ', compound: buffer }); buffer = ''; combinator = '' }
      if (!/\s/.test(char)) combinator = char
      continue
    }
    buffer += char
  }
  if (buffer) out.push({ combinator: combinator || ' ', compound: buffer })
  return out
}
const plain = (compound: string) => /^[a-z][a-z0-9]*([:[]|$)/.test(compound)

/** The places a pinned rule names, such as `.diya-workflow-surface > header > *`. */
function pins(selector: string) {
  const rule = rules.find((item) => splitSelectors(item.selector).includes(selector))
  expect(rule, selector).toBeTruthy()
  return /:where\(([^()]*)\)$/.exec(selector)![1].split(',').map((part) => part.trim())
}

describe('container rules', () => {
  it('reach a plain element only through the guard Prose uses, or at a fixed place', () => {
    const reaching: string[] = []
    let checked = 0
    for (const rule of rules) {
      for (const selector of splitSelectors(rule.selector).flatMap(expand)) {
        const parts = compounds(selector)
        const subject = parts[parts.length - 1]
        if (!subject || !plain(subject.compound) || DELIBERATE.includes(subject.compound)) continue
        // Walk back over plain elements to the class that anchors the rule.
        let index = parts.length - 1
        let fixed = true
        while (index > 0 && plain(parts[index - 1].compound)) {
          if (parts[index].combinator !== '>') fixed = false
          index--
        }
        if (parts[index].combinator !== '>') fixed = false
        const anchor = parts[index - 1]?.compound ?? ''
        // Dialog's heading holds only its own title and description.
        if (!CONTAINER.test(anchor) || anchor.includes('diya-dialog-heading')) continue
        checked++
        const guarded = subject.compound.includes(GUARD)
        // Pinned to the container's own places: every alternative is a parent > child step.
        const pinned = /:where\(([^()]*)\)$/.exec(subject.compound)?.[1].split(',').every((part) => part.trim().endsWith('> *')) ?? false
        if (!fixed && !guarded && !pinned) reaching.push(selector)
      }
    }
    expect(checked).toBeGreaterThan(40)
    expect(reaching).toEqual([])
  })

  it('pin the surfaces’ own paragraphs where the components render them', () => {
    const places = pins('.diya-root .diya-workflow-surface p:where(.diya-workflow-surface > *, .diya-workflow-surface > header > *, .diya-drawer-modal > header > div > *, .diya-wizard-body > form > header > *, .diya-upload-drop > *, .diya-content-state > div > *)')
    const { container } = render(
      <DiyaProvider>
        <Form title="Sign in" description="Use your work email." onSubmit={noop}><span>Fields</span></Form>
        <Drawer open onOpenChange={noop} title="Details" description="Edit the project." footer={<Button>Save</Button>}>Body</Drawer>
        <Wizard activeStep={0} onStepChange={noop} onComplete={noop} steps={[{ id: 'one', label: 'One', title: 'Step one', description: 'Start here.', content: 'Fields' }, { id: 'two', label: 'Two', content: 'Next' }]} />
        <FileUpload title="Attach files" description="PDF or PNG." files={[]} onFilesChange={noop} accept=".pdf" />
        <ContentState title="No projects yet" description="Give your next idea a place to grow." />
      </DiyaProvider>
    )
    // A refused file shows FileUpload's error paragraph.
    const picker = container.querySelector<HTMLInputElement>('.diya-upload input[type="file"]')!
    Object.defineProperty(picker, 'files', { configurable: true, value: [new File(['x'], 'notes.txt', { type: 'text/plain' })] })
    fireEvent.change(picker)
    const own = [...container.querySelectorAll('.diya-workflow-surface p')]
    expect(own.map((node) => node.className || node.textContent)).toEqual(['Use your work email.', 'Edit the project.', 'Start here.', 'PDF or PNG.', 'diya-workflow-error', 'Give your next idea a place to grow.'])
    for (const node of own) expect(places.some((place) => node.matches(place)), node.textContent!).toBe(true)
    // Footers and Wizard's form sit where their child-combinator rules expect them.
    expect(container.querySelector('.diya-project-form > footer')).toBeTruthy()
    expect(container.querySelector('.diya-drawer-modal > footer')).toBeTruthy()
    expect(container.querySelector('.diya-wizard-body > form > footer')).toBeTruthy()
  })

  it('find Accordion items, Table checkboxes and Chatbot header text where their rules expect them', () => {
    const { container } = render(
      <DiyaProvider>
        <Accordion items={[{ id: 'one', label: 'Shipping', content: 'Two days.' }, { id: 'two', label: 'Returns', content: 'Thirty days.' }]} />
        <Table rows={[{ id: '1', name: 'Nuvio' }]} rowLabel={(row) => row.name} columns={[{ key: 'name', label: 'Name', render: (row) => row.name }]} onSelectionChange={noop} />
        <Chatbot title="Assistant" description="Online" messages={[]} value="" onValueChange={noop} onSend={noop} />
      </DiyaProvider>
    )
    expect(container.querySelectorAll('.diya-accordion > .diya-accordion-item + .diya-accordion-item')).toHaveLength(1)
    expect(container.querySelectorAll('.diya-table .diya-table-check > input[type="checkbox"]').length).toBeGreaterThan(1)
    expect(container.querySelector('.diya-chat-header > div > strong')!.textContent).toBe('Assistant')
    expect(container.querySelector('.diya-chat-header > div > small')!.textContent).toBe('Online')
  })
})

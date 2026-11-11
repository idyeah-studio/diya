/**
 * Reads an item page's playground controls from the DOM, so "Get code" can
 * show a snippet that matches what the preview currently shows.
 *
 * Keys are what a person reads beside each control: a fieldset's legend, or
 * a lone control's accessible label. Values are the visible option text.
 */
export type Playground = Record<string, string | string[]>

/* The Customize panel, open dialogs (the drawer itself) and the live preview are not playground controls. */
const IGNORED = [
  '.customize-inspector',
  '[role="dialog"]',
  'dialog',
  '.customize-scope:not(.customize-scope--bare)',
  '.pattern-canvas',
  /* Slow motion is the catalog's, not part of anyone's code. */
  '.slow-motion',
].join(', ')

/** Whether `node` sits inside an ignored region below `root` (never looks above root). */
function ignored(node: Element, root: ParentNode): boolean {
  for (let current: Element | null = node; current && current !== root; current = current.parentElement) {
    if (current.matches(IGNORED)) return true
  }
  return false
}

const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim()

/** Visible text of `node`, skipping form controls and anything hidden from people. */
function visibleText(node: Node): string {
  let text = ''
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) text += child.textContent ?? ''
    else if (child.nodeType === 1) {
      const element = child as Element
      if (element.matches('input, select, textarea, [aria-hidden="true"], [hidden], .text-input-sr-only, .diya-sr-only')) return
      text += visibleText(element)
    }
  })
  return text
}

function labelFor(control: Element, root: ParentNode): HTMLLabelElement | null {
  const wrapping = control.closest('label')
  if (wrapping) return wrapping
  const id = control.getAttribute('id')
  if (!id) return null
  return Array.from(root.querySelectorAll('label')).find((label) => label.htmlFor === id) ?? null
}

/** The option text a person sees beside a radio or checkbox. */
function optionText(control: Element, root: ParentNode): string {
  const label = labelFor(control, root)
  return clean(label ? visibleText(label) : '') || clean(control.getAttribute('aria-label'))
}

/** A lone control's accessible name: aria-label, aria-labelledby, then its label element. */
function accessibleName(control: Element, root: ParentNode): string {
  const aria = clean(control.getAttribute('aria-label'))
  if (aria) return aria
  const labelledBy = control.getAttribute('aria-labelledby')
  if (labelledBy) {
    const doc = control.ownerDocument
    const text = labelledBy
      .split(/\s+/)
      .map((id) => clean(doc.getElementById(id)?.textContent))
      .filter(Boolean)
      .join(' ')
    if (text) return text
  }
  const label = labelFor(control, root)
  return label ? clean(label.textContent) : ''
}

/** Reads the playground controls under `root` (the item's `.component-document`). */
export function readPlayground(root: ParentNode): Playground {
  const out: Playground = {}
  const set = (key: string, value: string | string[]) => {
    if (key && !Object.hasOwn(out, key)) out[key] = value
  }

  for (const fieldset of Array.from(root.querySelectorAll('fieldset'))) {
    if (ignored(fieldset, root)) continue
    const legend = Array.from(fieldset.children).find((child) => child.tagName === 'LEGEND')
    const key = clean(legend?.textContent)
    if (!key) continue
    const radios = Array.from(fieldset.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
    const checkboxes = Array.from(fieldset.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
    if (radios.length) {
      const checked = radios.find((radio) => radio.checked)
      /* A swatch group can pick a colour input instead of a radio; it marks itself selected. */
      const picked = checked ?? fieldset.querySelector('[data-selected="true"]')
      if (picked) set(key, optionText(picked, root))
    } else if (checkboxes.length) {
      const disabled = (fieldset as HTMLFieldSetElement).disabled || fieldset.hasAttribute('disabled')
      set(key, disabled ? [] : checkboxes.filter((box) => box.checked).map((box) => optionText(box, root)))
    }
  }

  /* Controls that are not fieldset radios or checkboxes: selects, sliders, colour inputs, switches, tabs. */
  const lone = root.querySelectorAll<HTMLElement>('select, input, textarea, [role="switch"], [role="tablist"]')
  for (const control of Array.from(lone)) {
    if (ignored(control, root)) continue
    if (control.tagName === 'SELECT') {
      const select = control as HTMLSelectElement
      const option = select.options[select.selectedIndex]
      set(accessibleName(select, root), clean(option?.textContent))
    } else if (control.tagName === 'INPUT' || control.tagName === 'TEXTAREA') {
      const input = control as HTMLInputElement
      if (input.type === 'radio' || input.type === 'hidden' || input.type === 'file') continue
      if (input.type === 'checkbox') {
        if (!input.closest('fieldset')) set(accessibleName(input, root), input.checked ? 'true' : 'false')
        continue
      }
      set(accessibleName(input, root), input.type === 'color' ? input.value.toLowerCase() : input.value)
    } else if (control.getAttribute('role') === 'switch') {
      set(accessibleName(control, root), control.getAttribute('aria-checked') === 'true' ? 'true' : 'false')
    } else {
      const tab = control.querySelector('[role="tab"][aria-selected="true"]')
      if (tab) set(accessibleName(control, root), clean(visibleText(tab)))
    }
  }
  return out
}

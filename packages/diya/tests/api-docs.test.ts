import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const api = JSON.parse(readFileSync(join(process.cwd(), 'dist/api.json'), 'utf8')) as {
  components: Record<string, { description?: string; props: Record<string, { type?: string; description?: string }> }>
}

// The catalog, llms.txt and Copy for AI print these; a prop without words reaches people as a blank.
describe('api.json documents every public prop', () => {
  it('gives every component and prop a description and a type', () => {
    const missing: string[] = []
    for (const [name, component] of Object.entries(api.components)) {
      if (!component.description) missing.push(name)
      for (const [prop, info] of Object.entries(component.props)) {
        if (!info.description || !info.type) missing.push(`${name}.${prop}`)
      }
    }
    expect(missing).toEqual([])
  })
})

// DS-02: an editor hovering toast( shows what it does, on the call itself and on the export.
it('toast() carries its doc comment in the shipped types', async () => {
  const { readFileSync } = await import('node:fs')
  const { resolve } = await import('node:path')
  const types = readFileSync(resolve(process.cwd(), 'dist/toast/queue.d.ts'), 'utf8')
  // DOC-05 adds the effect caveat.
  const sentence = "Shows a toast in the app's one stack and returns its id. Call it from client code, such as event handlers, effects and data code. In an effect, pass an `id`, so React's development double run updates the toast instead of adding a second. On the server it does nothing."
  expect(types.split(sentence)).toHaveLength(3)
  expect(types).toMatch(/On the server it does nothing\. \*\/\n\s*\(options: ToastOptions\): string;/)
})

// DOC-02: dismiss() closes what toast() showed; a <Toast> closes when it's no longer rendered.
it('toast.dismiss() says it closes toast() toasts only', async () => {
  const { readFileSync } = await import('node:fs')
  const { resolve } = await import('node:path')
  const types = readFileSync(resolve(process.cwd(), 'dist/toast/queue.d.ts'), 'utf8')
  expect(types).toContain('Closes the toast with this id, or every toast `toast()` showed, shown and waiting, when called without one. A `<Toast>` closes when you stop rendering it. */\n    dismiss(id?: string): void;')
})

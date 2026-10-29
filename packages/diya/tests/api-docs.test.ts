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

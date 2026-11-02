import { describe, expect, it } from 'vitest'
import { catalogGroups, filterGroups } from '../components/catalog/catalog-index'

const found = (area: keyof typeof catalogGroups, query: string) => filterGroups(catalogGroups[area], query).flatMap((group) => group.items.map((item) => item.id))

describe('catalog search', () => {
  it('finds items by the words developers use for them', () => {
    expect(found('patterns', 'empty')).toContain('empty-state')
    expect(found('patterns', 'empty state')).toContain('empty-state')
    expect(found('patterns', 'skeleton')).toContain('empty-state')
    expect(found('patterns', 'stepper')).toContain('wizard')
    expect(found('components', 'autocomplete')).toContain('combobox')
    expect(found('components', 'typeahead')).toContain('combobox')
    expect(found('components', 'snackbar')).toContain('alert')
    expect(found('components', 'error')).toContain('alert')
    expect(found('patterns', 'error')).toContain('empty-state')
  })

  it("ignores spaces and hyphens, so a joined word finds a two-word name", () => {
    expect(found('components', 'datepicker')).toContain('date-picker')
    expect(found('components', 'textfield')).toContain('text-input')
    expect(found('screens', 'signup')).toContain('sign-up')
    expect(found('patterns', 'multi step')).toContain('wizard')
  })
})

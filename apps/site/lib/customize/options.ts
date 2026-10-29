import type { ItemId } from './registry'

export type OptionValue = string | boolean
type OptionSchema = Record<string, { values: readonly OptionValue[]; default: OptionValue }>

/** Item settings that ship in a download. Only these keys and values are accepted. */
export const optionSchemas: Partial<Record<ItemId, OptionSchema>> = {
  button: {
    kind: { values: ['normal', 'icon'], default: 'normal' },
    size: { values: ['small', 'medium', 'large'], default: 'medium' },
    shape: { values: ['pill', 'rounded'], default: 'pill' },
    leadingIcon: { values: [true, false], default: false },
    trailingIcon: { values: [true, false], default: false },
    shadow: { values: [true, false], default: false },
  },
}

/** Values renamed before 1.0, mapped when saved browser state is read. */
export const legacyOptionValues: Partial<Record<ItemId, Record<string, Record<string, OptionValue>>>> = {
  button: { shape: { rectangle: 'rounded' } },
}

/** Strict: unknown keys or values are an error, missing keys take their default. */
export function parseOptions(id: ItemId, value: unknown): Record<string, OptionValue> {
  if (value === undefined) value = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid options')
  const schema = optionSchemas[id] ?? {}
  const out: Record<string, OptionValue> = {}
  for (const [key, given] of Object.entries(value as Record<string, unknown>)) {
    if (!Object.hasOwn(schema, key) || !schema[key].values.includes(given as OptionValue))
      throw new Error(`Invalid option ${key}`)
  }
  for (const [key, spec] of Object.entries(schema)) {
    const given = (value as Record<string, unknown>)[key]
    out[key] = given === undefined ? spec.default : (given as OptionValue)
  }
  return out
}

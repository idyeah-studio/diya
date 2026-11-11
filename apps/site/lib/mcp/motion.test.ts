// Motion in what agents read: the rules, the since labels and get_theme's motion.
import { describe, expect, it } from 'vitest'
import { llmsFull, RULES } from '../../components/reference/ai-docs'
import { getComponent, getTheme, listTokens, searchComponents, themeProviderLine } from './tools'

describe('motion for agents', () => {
  it('states the motion rule once, with the test advice', () => {
    expect(RULES).toContain('follows the device\'s reduce-motion setting')
    expect(RULES).toContain('In browser tests, render with `motion="off"`.')
  })

  it('labels what 1.1 added in llms-full.txt', () => {
    const full = llmsFull()
    expect(full).toContain('| `--diya-duration-fast` (since 1.1.0) | motion |')
    expect(full).toContain('| `--diya-duration-scale` (since 1.1.0) | motion | `1` |')
    expect(full).toMatch(/\| `motion` \| `"system" \\\| "reduced" \\\| "off"` \|  \| How much DIYA moves\.[^|]* Since 1\.1\.0\. \|/)
    // 1.0 tokens and props carry no label.
    expect(full).not.toContain('`--diya-color-text` (since')
  })

  it('labels them in get_component and list_tokens too', () => {
    expect(getComponent({ name: 'DiyaProvider', include: ['props'] })).toMatch(/- `motion\?: "system" \| "reduced" \| "off"` How much DIYA moves\.[^\n]* Since 1\.1\.0\./)
    expect(listTokens({ group: 'motion' })).toContain('- `--diya-ease-enter` `cubic-bezier(0.2, 0.7, 0.2, 1)` · since 1.1.0')
  })

  it('finds DiyaProvider for motion words', () => {
    for (const word of ['motion', 'animation', 'transition']) expect(searchComponents({ query: word }).text, word).toContain('DiyaProvider')
  })

  it('writes motion on the provider only when it differs from the device\'s setting', () => {
    expect(themeProviderLine({ motion: 'system' })).toBe('<DiyaProvider>')
    expect(themeProviderLine({ motion: 'reduced' })).toBe('<DiyaProvider motion="reduced">')
    expect(themeProviderLine({ brandColor: '#1F4E7A', motion: 'off' })).toBe('<DiyaProvider brandColor="#1F4E7A" motion="off">')
    expect(getTheme({ motion: 'off' })).toContain('<DiyaProvider motion="off">')
  })
})

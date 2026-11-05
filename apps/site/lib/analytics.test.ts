import { describe, expect, it } from 'vitest'
import { analyticsUrl } from './analytics'

describe('the address analytics records', () => {
  it('keeps the catalog page a visit was on', () => {
    expect(analyticsUrl('https://diya13.ai/explore?area=components&component=button')).toBe(
      'https://diya13.ai/explore?area=components&component=button',
    )
    expect(analyticsUrl('https://diya13.ai/explore?pattern=table')).toBe('https://diya13.ai/explore?pattern=table')
    expect(analyticsUrl('https://diya13.ai/explore?area=screens&screen=sign-in#preview')).toBe(
      'https://diya13.ai/explore?area=screens&screen=sign-in',
    )
  })

  it('drops any other query value on the catalog', () => {
    expect(analyticsUrl('https://diya13.ai/explore?area=components&component=button&utm_source=x&email=a%40b.co')).toBe(
      'https://diya13.ai/explore?area=components&component=button',
    )
  })

  it('never records a waitlist token', () => {
    expect(analyticsUrl('https://diya13.ai/waitlist/confirm?token=abc123')).toBe('https://diya13.ai/waitlist/confirm')
    expect(analyticsUrl('https://diya13.ai/waitlist/unsubscribe?token=abc123&s=done')).toBe(
      'https://diya13.ai/waitlist/unsubscribe',
    )
    expect(analyticsUrl('https://diya13.ai/waitlist/confirmed?s=founding&t=1762300000&sig=f00d')).toBe(
      'https://diya13.ai/waitlist/confirmed',
    )
  })

  it('drops the query and fragment everywhere else', () => {
    expect(analyticsUrl('https://diya13.ai/?ref=hn#pro')).toBe('https://diya13.ai/')
    expect(analyticsUrl('https://diya13.ai/privacy?component=button')).toBe('https://diya13.ai/privacy')
  })
})

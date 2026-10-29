import { describe, expect, it } from 'vitest'
import { LAUNCH_AT, isLaunched, launchNow, secondsUntilLaunch } from './launch'

describe('the launch switch', () => {
  it('flips at the deadline and agrees with the countdown', () => {
    for (const now of [LAUNCH_AT - 1001, LAUNCH_AT - 1000, LAUNCH_AT - 1, LAUNCH_AT, LAUNCH_AT + 1])
      expect(isLaunched(now)).toBe(secondsUntilLaunch(now) === 0)
    expect(isLaunched(LAUNCH_AT - 1)).toBe(false)
    expect(isLaunched(LAUNCH_AT)).toBe(true)
  })

  it('uses the real clock unless DIYA_NOW pins it', () => {
    expect(launchNow({}, 42)).toBe(42)
    expect(launchNow({ DIYA_NOW: '2026-11-07T00:00:01-08:00' }, 42)).toBe(LAUNCH_AT + 1000)
    // `vercel dev` sets VERCEL=1 with VERCEL_ENV=development; it is local.
    expect(launchNow({ DIYA_NOW: '2026-11-06T23:59:59-08:00', VERCEL: '1', VERCEL_ENV: 'development' }, 42)).toBe(
      LAUNCH_AT - 1000,
    )
  })

  it('ignores DIYA_NOW on every Vercel deployment, previews included', () => {
    const DIYA_NOW = '2027-01-01T00:00:00Z'
    expect(launchNow({ DIYA_NOW, VERCEL: '1', VERCEL_ENV: 'preview' }, 42)).toBe(42)
    expect(launchNow({ DIYA_NOW, VERCEL: '1', VERCEL_ENV: 'production' }, 42)).toBe(42)
    expect(launchNow({ DIYA_NOW, VERCEL: '1' }, 42)).toBe(42)
  })

  it('ignores DIYA_NOW in production and when it is unreadable', () => {
    expect(launchNow({ DIYA_NOW: '2027-01-01T00:00:00Z', VERCEL_ENV: 'production' }, 42)).toBe(42)
    expect(launchNow({ DIYA_NOW: 'tomorrow-ish' }, 42)).toBe(42)
    expect(launchNow({ DIYA_NOW: '' }, 42)).toBe(42)
  })
})

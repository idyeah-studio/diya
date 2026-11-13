// L5: the spinner spec finds Playwright's ffmpeg where `playwright install` put it, Linux's
// XDG_CACHE_HOME included.
import { expect, it } from 'vitest'
import { playwrightCache } from './browser/playwright-cache'

it('finds the Playwright cache as Playwright does, with XDG_CACHE_HOME on Linux', () => {
  expect(playwrightCache({}, 'linux', '/home/ada')).toBe('/home/ada/.cache/ms-playwright')
  expect(playwrightCache({ XDG_CACHE_HOME: '/var/cache/ada' }, 'linux', '/home/ada')).toBe('/var/cache/ada/ms-playwright')
  expect(playwrightCache({ XDG_CACHE_HOME: '/var/cache/ada' }, 'darwin', '/Users/ada')).toBe('/Users/ada/Library/Caches/ms-playwright')
  expect(playwrightCache({ PLAYWRIGHT_BROWSERS_PATH: '/opt/pw' }, 'linux', '/home/ada')).toBe('/opt/pw')
  expect(playwrightCache({ PLAYWRIGHT_BROWSERS_PATH: '0' }, 'linux', '/home/ada')).toBe('0')
  expect(playwrightCache({ LOCALAPPDATA: 'C:\\\\Users\\\\ada\\\\AppData\\\\Local' }, 'win32', 'C:\\\\Users\\\\ada')).toContain('ms-playwright')
})

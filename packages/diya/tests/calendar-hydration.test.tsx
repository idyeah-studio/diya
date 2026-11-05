import { afterEach, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { Calendar, DiyaProvider } from '../dist/index.js'

const zone = process.env.TZ
afterEach(() => {
  vi.useRealTimers()
  if (zone === undefined) delete process.env.TZ
  else process.env.TZ = zone
})

it('opens an empty Calendar on the same month on the server and in the browser, whatever their time zones', async () => {
  const ui = <DiyaProvider><Calendar label="Pick a day" /></DiyaProvider>
  vi.useFakeTimers({ toFake: ['Date'] })
  // 03:00 UTC on November 1 is still the evening of October 31 in Los Angeles.
  vi.setSystemTime(new Date(Date.UTC(2026, 10, 1, 3, 0)))
  process.env.TZ = 'UTC'
  const html = renderToString(ui)
  process.env.TZ = 'America/Los_Angeles'
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)
  const errors: unknown[] = []
  await act(async () => {
    hydrateRoot(host, ui, { onRecoverableError: (error) => errors.push(error) })
  })
  expect(errors.map(String)).toEqual([])
  // Once the page is live, the reader's own month.
  expect(host.textContent).toContain('October 2026')
  host.remove()
})

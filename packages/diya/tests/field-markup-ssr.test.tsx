// @vitest-environment node
// The fields' server markup must stay exactly as 1.1.1 rendered it (see field-markup.test.tsx).
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, version } from 'react'
import { renderToString } from 'react-dom/server'
import * as lib from '../dist/index.js'
import { FIXED_DATE, fieldCases, stepProps, type Fixture } from './fixtures/field-markup-cases.js'

// The one markup change 1.2 makes to these fields, named by the build plan (frontend.md step 7,
// MOT-1.2-05): a mixed Select all carries data-indeterminate="true", so its dash is in the server
// HTML and doesn't grow in at hydration. Everything else must equal 1.1.1 byte for byte.
const changed1_2 = (html: string) => html.replace(/ data-indeterminate="true"/g, '')

const writeTo = process.env.DIYA_WRITE_FIXTURES
const fixture: Fixture = writeTo ? {} : JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/field-markup-1.1.1.json'), 'utf8'))
const captured: Record<string, string> = {}

// Before each test: the shared setup returns to real timers after every test, and a real
// "today" would freeze the day the fixture was written.
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'], now: FIXED_DATE }) })
afterAll(() => { if (writeTo) writeFileSync(resolve(writeTo, `${version}-server.json`), `${JSON.stringify(captured, null, 2)}\n`) })

describe(`field server markup on React ${version}`, () => {
  for (const field of fieldCases) {
    it(`reproduces the frozen 1.1.1 server markup: ${field.name}`, () => {
      expect(typeof window).toBe('undefined')
      for (const step of field.steps.filter(step => !step.act)) {
        const html = renderToString(createElement(lib.DiyaProvider, { theme: 'light' }, field.render(lib, stepProps(step))))
        if (writeTo) captured[`${field.name}/${step.name}`] = html
        else expect(changed1_2(html), `${field.name} › ${step.name}`).toBe(fixture[version].server[`${field.name}/${step.name}`])
      }
    })
  }
})

// DIYA's developer warnings exist in development builds and are stripped from production ones.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const built = join(import.meta.dirname, '..', '..', 'node_modules', '.cache', 'diya-browser')
const bundle = (name: string) => readdirSync(join(built, name, 'assets')).filter((file) => file.endsWith('.js')).map((file) => readFileSync(join(built, name, 'assets', file), 'utf8')).join('\n')

test('production bundles carry no DIYA warning text; development ones do', ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'a file check, once')
  for (const react of ['r18', 'r19']) {
    expect(bundle(react).match(/DIYA: /g) ?? [], react).toEqual([])
    expect(bundle(`${react}-dev`)).toContain("DIYA: a popup opened outside the open Dialog")
  }
})

import { cp, readFile, writeFile } from 'node:fs/promises'
import { buildStyles } from './styles-transform.mjs'

const source = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
await writeFile(new URL('../dist/styles.css', import.meta.url), buildStyles(source))
// DIYA Sans ships beside the stylesheet that declares it, with its licence.
await cp(new URL('../src/fonts/', import.meta.url), new URL('../dist/fonts/', import.meta.url), { recursive: true })

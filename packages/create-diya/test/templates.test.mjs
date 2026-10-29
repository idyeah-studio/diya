import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkTemplates } from '../scripts/check-templates.mjs'
import { buildTemplate, diffTrees, pruneUnused, stripDemoCss, stripDemoElements, stripMarkers } from '../scripts/sync-oriel.mjs'

const templates = fileURLToPath(new URL('../templates', import.meta.url))

function sandbox(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'create-diya-templates-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}
function write(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    writeFileSync(path.join(root, rel), content)
  }
}

test('the committed templates pass their own check', () => {
  assert.deepEqual(checkTemplates(), [])
})

test('the check catches drift, a lost brand line, a late @layer and a stale pin', (t) => {
  const dir = sandbox(t)
  cpSync(templates, dir, { recursive: true })
  write(dir, {
    'vite-minimal/src/first-form.tsx': '// changed\n',
    'next-minimal/app/providers.tsx': "'use client'\nexport const x = 1 // linkComponent={Link} theme=\"system\"\n",
    'vite-minimal/src/index.css': 'body { margin: 0 }\n@layer reset, theme, base, diya, components, utilities;\n@import "@idyeah/diya/styles.css";\n',
    'next-dashboard/AGENTS.md': 'x\n',
  })
  const problems = checkTemplates(dir).join('\n')
  assert.match(problems, /first-form\.tsx and vite-minimal\/src\/first-form\.tsx differ/)
  assert.match(problems, /next-minimal\/app\/providers\.tsx has 0 brand lines/)
  assert.match(problems, /vite-minimal: the @layer order must be the stylesheet's first rule/)
  assert.match(problems, /next-dashboard\/AGENTS\.md: npm or the public export would drop this name/)
})

const SHELL = `'use client'
import type { ReactNode } from 'react'
import { Inline, Stack, TextLink } from '@idyeah/diya'
import { CodeIcon, HomeIcon } from './icons'

const REPO = 'https://github.com/idyeah-studio/diya/blob/main/examples/oriel'

const PAGES = [
  { value: '/', label: 'Home', icon: <HomeIcon />, file: 'app/Home.tsx' },
]

export function Shell({ children }: { children: ReactNode }) {
  const current = PAGES[0]
  return (
    <Stack>
      <main>
        <Inline className="source-bar" justify="between" gap={3}>
          <span>A demo app, made only from DIYA components.</span>
          <TextLink href={\`\${REPO}/\${current.file}\`} leadingIcon={<CodeIcon />}>
            View this screen’s source
          </TextLink>
        </Inline>
        {children}
      </main>
    </Stack>
  )
}
`

test('takes the demo bar out of an Oriel without markers', () => {
  const { text, changed } = stripDemoElements(SHELL)
  assert.ok(changed)
  const pruned = pruneUnused(text)
  assert.doesNotMatch(pruned, /source-bar|View this screen|TextLink|CodeIcon|REPO|file:/)
  assert.match(pruned, /import \{ Stack \} from '@idyeah\/diya'/)
  assert.match(pruned, /import \{ HomeIcon \} from '\.\/icons'/)
  assert.match(pruned, /<main>\n        \{children\}\n      <\/main>/)
  // A bar that shares a line with other code is refused rather than guessed at.
  assert.throws(() => stripDemoElements('<p>x</p><DemoBar />\n'), /shares a line/)
  assert.equal(stripDemoElements('      <DemoBar file={current.file} />\n').text, '')
})

test('honors @demo-only markers and removes demo CSS', () => {
  assert.equal(stripMarkers('// @demo-only file\nexport const x = 1\n'), null)
  assert.equal(stripMarkers('a\n// @demo-only start\nb\n// @demo-only end\nc\nd // @demo-only\n'), 'a\nc\n')
  assert.throws(() => stripMarkers('// @demo-only start\nb\n'), /no matching/)
  const css = `.a { color: red; }
.source-bar { font-size: 14px; }

@media (max-width: 520px) {
  .b { gap: 0; }
  .source-bar > span { display: none; }
}
@media (max-width: 400px) {
  .demo-bar,
  .demo-bar a { display: none; }
}
.c { margin: 0; }
`
  assert.equal(stripDemoCss(css), `.a { color: red; }

@media (max-width: 520px) {
  .b { gap: 0; }
}
.c { margin: 0; }
`)
})

test('builds the Dashboard template from an Oriel folder and rewrites the package', (t) => {
  const dir = sandbox(t)
  const oriel = path.join(dir, 'oriel')
  write(oriel, {
    'package.json': JSON.stringify({
      name: 'oriel',
      private: true,
      scripts: { dev: 'next dev --hostname 127.0.0.1 --port 3212', build: 'next build' },
      dependencies: { '@idyeah/diya': 'file:../../artifacts/idyeah-diya-1.0.0.tgz', next: '^16.4.2' },
    }),
    'app/providers.tsx': "export const DEFAULT_LOOK = { theme: 'system', brandColor: '', glass: false }\n",
    'components/Shell.tsx': SHELL,
    'components/DemoBar.tsx': '// @demo-only file\nexport function DemoBar() { return null }\n',
    'app/oriel.css': '.x { gap: 0; }\n.source-bar { color: red; }\n',
    'README.md': '# Oriel demo\n',
    'next-env.d.ts': '/// <reference types="next" />\n',
    'node_modules/x/index.js': '',
    '.next/build': '',
    'pnpm-lock.yaml': '',
    'app/icon.svg': '<svg/>',
    'app/Overview.tsx': "// Oriel, built with DIYA (MIT): https://diya13.ai\n'use client'\nexport function Overview() { return null }\n",
    // The live demo's link-preview image: binary, so it lives in a demo-only folder.
    'public/demo-only/og.jpg': '\u00ff\u00d8\u00ff',
  })
  const files = buildTemplate(oriel, { version: '1.2.3' })
  assert.deepEqual([...files.keys()].sort(), [
    'README.md',
    '_agents.md',
    '_gitignore',
    'app/Overview.tsx',
    'app/icon.svg',
    'app/oriel.css',
    'app/providers.tsx',
    'components/Shell.tsx',
    'next.config.mjs',
    'package.json',
  ])
  const pkg = JSON.parse(files.get('package.json').toString())
  assert.equal(pkg.name, 'my-app')
  assert.equal(pkg.dependencies['@idyeah/diya'], '^1.2.3')
  assert.equal(pkg.scripts.dev, 'next dev')
  assert.equal(files.get('app/oriel.css').toString(), '.x { gap: 0; }\n')
  // The attribution line stays in the template.
  assert.ok(files.get('app/Overview.tsx').toString().startsWith("// Oriel, built with DIYA (MIT): https://diya13.ai\n'use client'\n"))
  assert.match(files.get('README.md').toString(), /^# \{\{name\}\}/)
  assert.deepEqual(diffTrees(files, files), [])

  // Anything demo-only that survives stops the build.
  write(oriel, { 'lib/data.ts': "export const note = 'View this screen in the demo'\n" })
  assert.throws(() => buildTemplate(oriel), /lib\/data\.ts still has "View this screen"/)
})

test('keeps the app\'s name constant when the layout names itself through lib/brand', async () => {
  const { plainMetadata } = await import('../scripts/sync-oriel.mjs')
  const layout = "import type { Metadata } from 'next'\nimport { BRAND } from '@/lib/brand'\n\nexport const metadata: Metadata = {\n  metadataBase: new URL('https://example.com'),\n  title: { default: `${BRAND.name} · a demo app made with DIYA`, template: `%s · ${BRAND.name}` },\n}\n"
  const out = plainMetadata(layout)
  assert.match(out, /title: \{ default: BRAND\.name, template: `%s · \$\{BRAND\.name\}` \}/)
  assert.doesNotMatch(out, /example\.com|a demo app/)
})

test("drops Oriel's DemoBar, the icon only it used, and the demo's metadata", (t) => {
  const dir = sandbox(t)
  const oriel = path.join(dir, 'oriel')
  write(oriel, {
    'package.json': JSON.stringify({ name: 'diya-oriel', dependencies: { '@idyeah/diya': 'workspace:*' } }),
    'next.config.mjs': "import { existsSync } from 'node:fs'\nexport default { turbopack: { root: existsSync('../../pnpm-workspace.yaml') ? '../..' : '.' } }\n",
    'app/providers.tsx': "export const DEFAULT_LOOK = { theme: 'system', brandColor: '', glass: false }\n",
    'app/layout.tsx': "import type { Metadata } from 'next'\n\nexport const metadata: Metadata = {\n  metadataBase: new URL('https://oriel.diya13.ai'),\n  title: { default: 'Oriel · a demo app made with DIYA', template: '%s · Oriel' },\n}\n\nexport default function Layout() { return null }\n",
    'app/page.tsx': "export const metadata = { title: { absolute: 'Oriel · a demo app made with DIYA' } }\n",
    'components/DemoBar.tsx': "'use client'\nimport { Inline, TextLink } from '@idyeah/diya'\nimport { CodeIcon } from './icons'\nexport function DemoBar() { return <Inline className=\"demo-bar\"><TextLink href=\"x\" leadingIcon={<CodeIcon />}>View this screen’s source</TextLink></Inline> }\n",
    'components/icons.tsx': 'export const HomeIcon = () => (\n  <svg />\n)\nexport const CodeIcon = ({ size = 16 }: { size?: number }) => (\n  <svg width={size} />\n)\n',
    'components/Shell.tsx': "import { DemoBar } from './DemoBar'\nimport { HomeIcon } from './icons'\nexport function Shell() {\n  return (\n    <main>\n      <HomeIcon />\n      <DemoBar />\n    </main>\n  )\n}\n",
  })
  const files = buildTemplate(oriel, { version: '1.0.0' })
  const read = (rel) => files.get(rel).toString()
  assert.equal(files.has('components/DemoBar.tsx'), false)
  assert.equal(read('components/icons.tsx'), 'export const HomeIcon = () => (\n  <svg />\n)\n')
  assert.doesNotMatch(read('components/Shell.tsx'), /DemoBar/)
  assert.match(read('app/layout.tsx'), /title: \{ default: 'Oriel', template: '%s · Oriel' \}/)
  assert.doesNotMatch(read('app/layout.tsx'), /metadataBase|demo/)
  assert.equal(read('app/page.tsx'), "export const metadata = { title: { absolute: 'Oriel' } }\n")
  assert.doesNotMatch(read('next.config.mjs'), /pnpm-workspace|turbopack/)
  assert.equal(JSON.parse(read('package.json')).dependencies['@idyeah/diya'], '^1.0.0')
})

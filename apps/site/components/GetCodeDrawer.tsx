'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { Drawer, Tabs } from '@idyeah/diya'
import { componentIds } from '../lib/catalog-route'
import { catalogItem, codeTaken } from '../lib/code-taken'
import { effectiveAppearance } from '../lib/customize/appearance'
import { customizeItems, isItemId } from '../lib/customize/registry'
import { brandColorAttribute } from '../lib/customize/theme'
import { CodeBlock } from './code/CodeBlock'
import { ConnectEditorLine } from './code/ConnectEditorLine'
import { CreateAppNote } from './code/CreateAppNote'
import { installCommand, usePackageManagerChoice, type PackageManager } from './site/package-manager'
import { PackageManagerTabs } from './code/PackageManagerTabs'
import { readPlayground } from './code/playground'
import { snippetFor, type Snippet } from './code/snippets'
import { NoteIcon, Step } from './code/Step'
import { useFocusDrawerTitle } from './code/useFocusDrawerTitle'
import { useCustomizeState } from './customize/CustomizeContext'
import './GetCodeDrawer.css'

export const DIYA_VERSION = '1.0.0'
export const DIYA_REPOSITORY = 'https://github.com/idyeah-studio/diya'
/** Set once someone copies an install or setup step; steps 1–2 fold from then on. */
export const SETUP_COPIED_KEY = 'diya:setup-copied'
/** The step-3 format someone chose last: the snippet or the complete file. */
export const CODE_FORMAT_KEY = 'diya:code-format'
type CodeFormat = 'snippet' | 'file'

function storedFormat(): CodeFormat {
  try {
    return window.localStorage.getItem(CODE_FORMAT_KEY) === 'file' ? 'file' : 'snippet'
  } catch {
    return 'snippet'
  }
}
function rememberFormat(format: CodeFormat) {
  try {
    window.localStorage.setItem(CODE_FORMAT_KEY, format)
  } catch {}
}

function setupCopiedBefore() {
  try {
    return window.localStorage.getItem(SETUP_COPIED_KEY) === '1'
  } catch {
    return false
  }
}
function rememberSetupCopied() {
  try {
    window.localStorage.setItem(SETUP_COPIED_KEY, '1')
  } catch {}
}

const itemHref = (id: string) =>
  (componentIds as readonly string[]).includes(id) ? `/explore?area=components&component=${id}` : `/explore?pattern=${id}`

/**
 * Get code: install, add the styles and provider once, then use the item
 * as the playground shows it. Nothing to download; it is all one package.
 */
export function GetCodeDrawer({
  id,
  open,
  onOpenChange,
  glass = false,
  theme = 'light',
  playground,
}: {
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The catalog's Glass setting; the provider snippet carries it. */
  glass?: boolean
  theme?: 'light' | 'dark'
  /** The item page whose playground step 3 should match. */
  playground?: () => ParentNode | null
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const stored = useCustomizeState()
  const [manager, setManager] = usePackageManagerChoice()
  const [snippet, setSnippet] = useState<Snippet | null>(null)
  const [folded, setFolded] = useState(false)
  const [format, setFormat] = useState<CodeFormat>('snippet')
  const body = useRef<HTMLDivElement>(null)
  const install = useRef<HTMLHeadingElement>(null)
  const [announcement, setAnnouncement] = useState('')
  const item = isItemId(id) ? customizeItems[id] : null
  const title = item?.title ?? 'DIYA'
  const options = isItemId(id) ? stored.items[id]?.options : undefined

  /* Read the playground as the drawer opens; it can't change while the drawer is modal. */
  useEffect(() => {
    if (!open || !isItemId(id)) return
    const root = playground?.() ?? document.querySelector('.component-document')
    setSnippet(snippetFor(id, root ? readPlayground(root) : {}, options))
    setFolded(setupCopiedBefore())
    setFormat(storedFormat())
    setAnnouncement('')
  }, [open, id, options, playground])
  useFocusDrawerTitle(open, body)

  const chooseManager = (value: PackageManager) => {
    setManager(value)
    setAnnouncement(`Showing ${value} commands.`)
  }
  const charts = !!snippet?.charts
  const installText = installCommand(manager, `@idyeah/diya${charts ? ' echarts@6' : ''}`)
  /* Your brand from Customize, only when you picked one. */
  const brand = brandColorAttribute(effectiveAppearance(stored.brand))
  const providerProps = [`theme="${theme}"`, ...(glass ? ['glass'] : []), ...(brand ? [brand] : [])]
  const providerOpen = `<DiyaProvider ${providerProps.join(' ')}>`
  const providerText = `import '@idyeah/diya/styles.css'
import { DiyaProvider } from '@idyeah/diya'

${providerOpen.length <= 80 ? providerOpen : `<DiyaProvider\n${providerProps.map((prop) => `  ${prop}`).join('\n')}\n>`}
  {children}
</DiyaProvider>`
  const chooseFormat = (value: CodeFormat) => {
    setFormat(value)
    rememberFormat(value)
    setAnnouncement(value === 'file' ? 'Showing the complete file.' : 'Showing the snippet.')
  }
  const component = snippet?.fileName.replace(/\.tsx$/, '') ?? ''
  /* Next.js: a server layout can't pass Link (a function), so the provider moves into a client file. */
  const nextProviders = `'use client'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { DiyaProvider } from '@idyeah/diya'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DiyaProvider ${[...providerProps, 'linkComponent={Link}'].join(' ')}>
      {children}
    </DiyaProvider>
  )
}`
  const icons = snippet?.icons ?? []
  const builtWith = (snippet?.builtWith ?? []).filter(isItemId)
  /* Name the most recognizable function first: a handler or a render prop. */
  const functions = [...(snippet?.functionProps ?? [])].sort((a, b) => Number(/^(on[A-Z]|render)/.test(b)) - Number(/^(on[A-Z]|render)/.test(a)))

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Get code"
      description="Three steps. The first two happen once per app."
      footer={
        <div className="get-code-footer">
          <span>
            <b>@idyeah/diya</b> {DIYA_VERSION} · MIT
          </span>
          <nav aria-label="DIYA on GitHub">
            <a className="diya-button" data-variant="outline" data-size="small" data-shape="pill" href={`${DIYA_REPOSITORY}#readme`} target="_blank" rel="noreferrer">
              README
            </a>
            <a className="diya-button" data-variant="outline" data-size="small" data-shape="pill" href={DIYA_REPOSITORY} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
        </div>
      }
    >
      <div ref={body} className="code-steps get-code">
        {folded ? (
          <div className="get-code-folded">
            <p>Install and styles: you’ve copied these before.</p>
            <button
              type="button"
              className="diya-button"
              data-variant="outline"
              data-size="small"
              data-shape="pill"
              aria-expanded="false"
              aria-label="Show install and styles"
              onClick={() => {
                setFolded(false)
                requestAnimationFrame(() => install.current?.focus())
              }}
            >
              Show
            </button>
          </div>
        ) : (
          <>
            <Step n={1} title="Install" titleId={`${uid}-install`} titleRef={install} tabs>
              <PackageManagerTabs value={manager} onChange={chooseManager}>
                <CodeBlock code={installText} language="shell" label="Terminal, in your app’s folder" name="install command" onCopied={rememberSetupCopied} />
              </PackageManagerTabs>
              <p>Once per app. Every component and pattern is in this one package.</p>
              <ConnectEditorLine />
              <CreateAppNote manager={manager} />
              {charts && (
                <div className="code-note">
                  <NoteIcon />
                  <span>
                    <b>Charts need one more package.</b> <code>DataViz</code> draws with ECharts, which stays optional so apps without charts don’t carry it. That’s why <code>echarts@6</code> is in this command.
                  </span>
                </div>
              )}
            </Step>
            <Step n={2} title="Add the styles and provider" titleId={`${uid}-styles`}>
              <p>
                Once, at your app’s root: <code>app/layout.tsx</code> in Next.js, <code>src/main.tsx</code> in Vite. DIYA Sans comes with it.
              </p>
              <CodeBlock code={providerText} language="tsx" label="Root layout or entry" name="styles and provider" onCopied={rememberSetupCopied} />
              <p>
                <code>theme="{theme}"</code> matches the catalog as you’re viewing it. <code>theme="system"</code> follows each visitor’s light or dark setting instead.
                {brand && <> <code>brandColor</code> is the brand you picked in Customize.</>}
              </p>
              {snippet?.links && (
                <>
                  <div className="code-note">
                    <NoteIcon />
                    <span>
                      <b>Links in Next.js.</b> {title}’s links are plain anchors until the provider gets your router’s link. A server layout can’t pass <code>Link</code>, so put the provider in a file that starts with <code>'use client'</code>, then wrap <code>{'{children}'}</code> in <code>{'<Providers>'}</code> in <code>app/layout.tsx</code>.
                    </span>
                  </div>
                  <CodeBlock code={nextProviders} language="tsx" label="app/providers.tsx · Next.js" name="Next.js providers file" onCopied={rememberSetupCopied} collapseAfter={8} />
                </>
              )}
            </Step>
          </>
        )}
        {snippet && (
          <Step n={3} title={`Use ${title}`} titleId={`${uid}-use`} tabs>
            <div className="code-step-pm">
              <Tabs
                label="Code format"
                variant="pill"
                size="small"
                value={format}
                onValueChange={(next) => (next === 'file' || next === 'snippet') && chooseFormat(next)}
                items={[
                  {
                    value: 'snippet',
                    label: 'Snippet',
                    content:
                      format === 'snippet' ? (
                        <CodeBlock
                          code={snippet.code}
                          language="tsx"
                          label={`${title}, as previewed`}
                          name={`${title} example`}
                          collapseAfter={10}
                          onCopied={() => codeTaken(catalogItem(id), 'copy')}
                        />
                      ) : null,
                  },
                  {
                    value: 'file',
                    label: 'Complete file',
                    content:
                      format === 'file' ? (
                        <>
                          <CodeBlock
                            code={snippet.file}
                            language="tsx"
                            label={snippet.fileName}
                            name={`${title} complete file`}
                            collapseAfter={14}
                            onCopied={() => codeTaken(catalogItem(id), 'copy')}
                          />
                          <p className="get-code-file-note">
                            Save it as <code>{snippet.fileName}</code>, then render <code>{`<${component} />`}</code> inside the provider from step 2. It compiles as pasted in Next.js (App Router) and Vite, with sample data and working state.
                          </p>
                        </>
                      ) : null,
                  },
                ]}
              />
            </div>
            {builtWith.length > 0 && (
              <p className="get-code-uses">
                Built with{' '}
                {builtWith.map((part, index) => (
                  <span key={part}>
                    {index > 0 && (index === builtWith.length - 1 ? ' and ' : ', ')}
                    <a href={itemHref(part)}>{customizeItems[part].title}</a>
                  </span>
                ))}
                . Same package, nothing else to install.
              </p>
            )}
            {icons.length > 0 && (
              <div className="code-note">
                <NoteIcon />
                <span>
                  <b>Icons are yours.</b> DIYA doesn’t ship an icon set, so <code>{icons[0]}</code>
                  {icons.length > 1 ? ' and the others stand' : ' stands'} in for your own. Any React icon works, such as lucide-react or an SVG you already have.
                  {format === 'file' ? ' This file draws simple ones so it runs as is.' : ' The complete file draws simple ones so it runs as is.'}
                </span>
              </div>
            )}
            {functions.length > 0 && format === 'snippet' && (
              <div className="code-note">
                <NoteIcon />
                <span>
                  <b>Using Next.js?</b> DIYA’s components are already client components.{' '}
                  {functions.length === 1 ? (
                    <>
                      <code>{functions[0]}</code> is a function
                    </>
                  ) : (
                    <>
                      Props like <code>{functions[0]}</code> are functions
                    </>
                  )}
                  , so put this code in a file that starts with <code>'use client'</code>. The complete file already does.
                </span>
              </div>
            )}
          </Step>
        )}
      </div>
      <p className="code-sr" role="status">
        {announcement}
      </p>
    </Drawer>
  )
}

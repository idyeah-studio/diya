'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { Button, Drawer } from '@idyeah/diya'
import { effectiveAppearance } from '../../lib/customize/appearance'
import { brandColorAttribute } from '../../lib/customize/theme'
import { CodeBlock } from '../code/CodeBlock'
import { CreateAppNote } from '../code/CreateAppNote'
import { PackageManagerTabs } from '../code/PackageManagerTabs'
import { Step } from '../code/Step'
import { useFocusDrawerTitle } from '../code/useFocusDrawerTitle'
import { useCustomizeState } from '../customize/CustomizeContext'
import { DIYA_REPOSITORY, DIYA_VERSION, SETUP_COPIED_KEY } from '../GetCodeDrawer'
import { installCommand, usePackageManagerChoice, type PackageManager } from '../site/package-manager'
import { nextPath, vitePath, type LiveScreen } from './screens-data'
import '../GetCodeDrawer.css'

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

/** Hands the reader the file as a download, named for Vite (`SignIn.tsx`). */
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Get code for a Screen: install (with lucide-react, and echarts@6 for
 * charts), the styles and provider once per app, then the screen's whole
 * file, which is exactly the file the preview renders.
 */
export function GetScreenCodeDrawer({
  screen,
  source,
  open,
  onOpenChange,
  glass = false,
  theme = 'light',
}: {
  screen: LiveScreen
  source: string
  open: boolean
  onOpenChange: (open: boolean) => void
  glass?: boolean
  theme?: 'light' | 'dark'
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const stored = useCustomizeState()
  const [manager, setManager] = usePackageManagerChoice()
  const [folded, setFolded] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const body = useRef<HTMLDivElement>(null)
  const styles = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!open) return
    setFolded(setupCopiedBefore())
    setAnnouncement('')
  }, [open])
  useFocusDrawerTitle(open, body)

  const chooseManager = (value: PackageManager) => {
    setManager(value)
    setAnnouncement(`Showing ${value} commands.`)
  }
  const installText = installCommand(manager, `@idyeah/diya lucide-react${screen.charts ? ' echarts@6' : ''}`)
  const brand = brandColorAttribute(effectiveAppearance(stored.brand))
  const providerProps = [`theme="${theme}"`, ...(glass ? ['glass'] : []), ...(brand ? [brand] : [])]
  const providerOpen = `<DiyaProvider ${providerProps.join(' ')}>`
  const providerText = `import '@idyeah/diya/styles.css'
import { DiyaProvider } from '@idyeah/diya'

${providerOpen.length <= 80 ? providerOpen : `<DiyaProvider\n${providerProps.map((prop) => `  ${prop}`).join('\n')}\n>`}
  {children}
</DiyaProvider>`
  const fileName = `${screen.component}.tsx`

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Get code"
      description="One file, ready to paste. Steps 1 and 2 happen once per app."
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
      <div ref={body} className="code-steps get-code screens-get-code">
        <Step n={1} title="Install" titleId={`${uid}-install`} tabs>
          <PackageManagerTabs value={manager} onChange={chooseManager}>
            <CodeBlock code={installText} language="shell" label="Terminal, in your app’s folder" name="install command" onCopied={rememberSetupCopied} wrap />
          </PackageManagerTabs>
          <p>
            Once per app. Screens draw their icons with <code>lucide-react</code>, so it comes along with DIYA.
            {screen.charts && (
              <>
                {' '}This screen has charts, so <code>echarts@6</code> comes too: DIYA draws charts with ECharts, which stays optional so apps without charts don’t carry it.
              </>
            )}
          </p>
          <CreateAppNote manager={manager} />
        </Step>
        <Step n={2} title="Add the styles and provider" titleId={`${uid}-styles`} titleRef={styles}>
          {folded ? (
            <div className="get-code-folded">
              <p>You’ve copied these before.</p>
              <button
                type="button"
                className="diya-button"
                data-variant="outline"
                data-size="small"
                data-shape="pill"
                aria-expanded="false"
                aria-label="Show the styles and provider"
                onClick={() => {
                  setFolded(false)
                  requestAnimationFrame(() => styles.current?.focus())
                }}
              >
                Show
              </button>
            </div>
          ) : (
            <>
              <p>
                Once, at your app’s root: <code>app/layout.tsx</code> in Next.js, <code>src/main.tsx</code> in Vite. DIYA Sans comes with it.
              </p>
              <CodeBlock code={providerText} language="tsx" label="Root layout or entry" name="styles and provider" onCopied={rememberSetupCopied} />
              <p>
                <code>theme="{theme}"</code> matches the catalog as you’re viewing it. <code>theme="system"</code> follows each visitor’s light or dark setting instead.
                {brand && <> <code>brandColor</code> is the brand you picked in Customize.</>}
              </p>
            </>
          )}
        </Step>
        <Step n={3} title="Save this file" titleId={`${uid}-file`}>
          <dl className="screens-save-paths">
            <div>
              <dt>Next.js</dt>
              <dd>
                <code>{nextPath(screen)}</code>
              </dd>
            </div>
            <div>
              <dt>Vite</dt>
              <dd>
                <code>{vitePath(screen)}</code>, then render <code>{`<${screen.component}Screen />`}</code> inside the provider
              </dd>
            </div>
          </dl>
          <CodeBlock
            code={source}
            language="tsx"
            label={fileName}
            name={`${screen.name} screen file`}
            collapseAfter={16}
            actions={
              <Button
                variant="quiet"
                size="small"
                shape="pill"
                className="code-key"
                aria-label={`Download ${fileName}`}
                onClick={() => {
                  download(fileName, source)
                  setAnnouncement(`${fileName} downloaded.`)
                }}
              >
                Download
              </Button>
            }
          />
          <p className="get-code-file-note">
            It’s the file this page previews, with sample data and every state working. Anything that would call a server is marked <code>// Replace with your API call</code>.
          </p>
        </Step>
      </div>
      <p className="code-sr" role="status">
        {announcement}
      </p>
    </Drawer>
  )
}

import { Component, StrictMode, Suspense, lazy, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { DiyaProvider } from '@idyeah/diya'
import './index.css'

/*
 * The Screens preview frame. /screens-frame/?screen=<id>&theme=light|dark&glass=0|1
 * renders apps/site/screens/<id>.tsx inside one DiyaProvider, the way a fresh
 * `npm create diya` Vite app renders its pages; &poster=1 renders
 * screens/posters/<id>.tsx instead. Any new file in those folders is picked
 * up by the globs below, with no list to update.
 *
 * The catalog keeps the frame in step with its Appearance without a reload:
 * it posts { source: 'diya-screens', type: 'appearance', theme, glass }, and
 * the frame posts { source: 'diya-screens', type: 'ready' } once it listens.
 */

type ScreenModule = { default: ComponentType }
type Theme = 'light' | 'dark'

type Loaders = Record<string, () => Promise<ScreenModule>>
const screens = import.meta.glob('../../screens/*.tsx') as Loaders
const posters = import.meta.glob('../../screens/posters/*.tsx') as Loaders

const SOURCE = 'diya-screens'
const query = new URLSearchParams(window.location.search)
const id = query.get('screen') ?? ''
const poster = query.get('poster') === '1'
const loader = /^[a-z0-9-]+$/.test(id) ? (poster ? posters : screens)[`../../screens/${poster ? 'posters/' : ''}${id}.tsx`] : undefined
const Screen = loader ? lazy(loader) : null

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="screens-frame-message">
      <h1>{title}</h1>
      <p>{children}</p>
    </main>
  )
}

/** Marks the document once the screen has rendered, for the thumbnail script. */
function Loaded({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.screenReady = 'true'
    if (window.parent !== window) window.parent.postMessage({ source: SOURCE, type: 'loaded', screen: id }, window.location.origin)
  }, [])
  return children
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <Message title="This screen stopped">Reload the page to try again.</Message> : this.props.children
  }
}

function Frame() {
  const [theme, setTheme] = useState<Theme>(query.get('theme') === 'light' ? 'light' : 'dark')
  const [glass, setGlass] = useState(query.get('glass') === '1')

  useEffect(() => {
    const listen = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.source !== SOURCE || event.data.type !== 'appearance') return
      if (event.data.theme === 'light' || event.data.theme === 'dark') setTheme(event.data.theme)
      if (typeof event.data.glass === 'boolean') setGlass(event.data.glass)
    }
    window.addEventListener('message', listen)
    if (window.parent !== window) window.parent.postMessage({ source: SOURCE, type: 'ready' }, window.location.origin)
    return () => window.removeEventListener('message', listen)
  }, [])

  // Scrollbars and native controls outside the provider follow the theme too.
  useEffect(() => {
    document.documentElement.style.colorScheme = theme
  }, [theme])

  return (
    <DiyaProvider theme={theme} glass={glass} className="screens-frame">
      {Screen ? (
        <Boundary>
          <Suspense fallback={null}>
            <Loaded>
              <Screen />
            </Loaded>
          </Suspense>
        </Boundary>
      ) : (
        <Message title="No screen here">
          {id ? `There’s no ${poster ? 'poster' : 'screen'} called “${id}”.` : 'Add ?screen= and a screen’s id to the address.'}
        </Message>
      )}
    </DiyaProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Frame />
  </StrictMode>,
)

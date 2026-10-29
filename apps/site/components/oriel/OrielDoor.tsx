import { ORIEL_SCREEN_FOR_PATTERN } from './links'
import './oriel-door.css'

/** The pattern a catalog path documents, such as `/explore?area=patterns&pattern=table`. */
function patternFromPath(path: string) {
  return /[?&]pattern=([\w-]+)/.exec(path)?.[1] ?? null
}

/**
 * One line under the reference of each pattern Oriel uses, pointing to the
 * Oriel screen where it does real work. Server-rendered; no JavaScript.
 */
export function OrielDoor({ path }: { path: string }) {
  const pattern = patternFromPath(path)
  const screen = pattern ? ORIEL_SCREEN_FOR_PATTERN[pattern] : undefined
  if (!screen) return null
  return (
    <aside className="oriel-door" aria-label="This pattern in a real app">
      <p>
        <a href={screen.href}>
          See it in a real screen: Oriel’s {screen.name} <span aria-hidden="true">→</span>
        </a>
      </p>
    </aside>
  )
}

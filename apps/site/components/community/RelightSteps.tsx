import Link from 'next/link'
import { ORIEL_SCREENS } from '../oriel/links'
import { NapkinSketch } from './NapkinSketch'
import { ProScreen } from '../landing/ProScreen'
import './relight.css'

const PARTS = [
  ['SideNavigation', '/explore?area=patterns&pattern=side-navigation'],
  ['Metric', '/explore?area=components&component=metric'],
  ['Table', '/explore?area=patterns&pattern=table'],
  ['Tag', '/explore?area=components&component=tag'],
] as const

/**
 * Relight in three pictures, the same three as the landing's: your
 * screenshot or sketch, a few pill questions, and the screen rebuilt from
 * DIYA parts. The pictures are decorative; each step's label carries the
 * meaning. Under the last one, the parts it's made of link to their catalog
 * pages, and a last line opens the real screen in Oriel.
 */
export function RelightSteps() {
  return (
    <div className="rl-stage">
      <ol className="rl-steps">
        <li>
          <p className="rl-step-label">
            <span aria-hidden="true">1</span>Your screenshot or sketch
            <span className="rl-sr">: a rough pen sketch of an invoices screen, on a paper napkin.</span>
          </p>
          <div className="rl-shot" data-sketch="napkin" aria-hidden="true">
            <NapkinSketch />
          </div>
        </li>
        <li>
          <p className="rl-step-label">
            <span aria-hidden="true">2</span>A few questions
            <span className="rl-sr">
              : who opens this screen most, and what should they do first. You answer with a click.
            </span>
          </p>
          <div className="rl-ask" aria-hidden="true">
            <p className="rl-ask-q">Who opens this screen most?</p>
            <div className="rl-pills">
              <span data-on="">Finance lead</span>
              <span>Customer</span>
              <span>Support</span>
            </div>
            <div className="rl-ask-next">
              <p className="rl-ask-q">What should they do first?</p>
              <div className="rl-pills">
                <span>Pay</span>
                <span>Download</span>
              </div>
            </div>
          </div>
        </li>
        <li>
          <p className="rl-step-label">
            <span aria-hidden="true">3</span>Your screen, in DIYA
            <span className="rl-sr">: the same billing screen, rebuilt as React code from DIYA parts.</span>
          </p>
          <ProScreen />
          <p className="rl-made-of">
            Made of{' '}
            {PARTS.map(([name, href], index) => (
              <span key={name}>
                {index > 0 && <span aria-hidden="true"> · </span>}
                <Link href={href}>
                  <code>{name}</code>
                </Link>
              </span>
            ))}
          </p>
          <p className="rl-made-of rl-real">
            <a href={ORIEL_SCREENS.invoices.href} target="_blank" rel="noopener">
              This screen is real. Open Oriel <span aria-hidden="true">→</span>
              <span className="sr-only">, in a new tab</span>
            </a>
          </p>
        </li>
      </ol>
    </div>
  )
}

import Link from 'next/link'
import { ASK_PATH } from '../community/links'
import { InstallChip } from '../site/InstallChip'
import '../community/community.css'

/**
 * The foot of both catalog sidebars: the component request page and the
 * Relight entry, as rows like the sidebar's own items, then the install
 * command. Search never filters it.
 * Under 900px it moves below the page content (see CatalogFrame);
 * `placement` picks which copy shows.
 */
export function SidebarFoot({ pro = false, placement }: { pro?: boolean; placement: 'side' | 'below' }) {
  return (
    <div className="catalog-foot" data-placement={placement}>
      <ul className="cm-foot-links" aria-label="More from DIYA">
        <li>
          <Link href={ASK_PATH} className="cm-foot-link">
            Ask for a component
          </Link>
        </li>
        <li>
          <Link href="/explore?area=pro" className="cm-foot-link" aria-current={pro ? 'page' : undefined}>
            Relight<span className="cm-sr">, the DIYA Pro waitlist, </span>
            <span className="site-soon" data-size="small">
              Soon
            </span>
          </Link>
        </li>
      </ul>
      <InstallChip variant="compact" />
    </div>
  )
}

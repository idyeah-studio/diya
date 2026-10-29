import { AtomicSidebar } from '../AtomicSidebar'
import { RelightSteps } from '../community/RelightSteps'
import { ProWaitlist } from '../waitlist/ProWaitlist'

/**
 * /explore?area=pro: the landing's Relight section beside the library. The
 * pitch, the same three pictures (screenshot, questions, the screen in
 * DIYA), and the waitlist. If the list isn't taking signups, the join block
 * hides itself (see ProWaitlist) and the page ends with the pictures.
 */
export function ProPage() {
  return (
    <main id="content" className="gallery-study component-library catalog-pro-page" data-area="pro">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <AtomicSidebar pro />
      <div className="component-document">
        <article className="rl-page" aria-labelledby="relight-title">
          <header className="rl-head">
            <div>
              <p className="rl-eyebrow">
                <b>Relight</b> · coming to DIYA Pro
              </p>
              <h2 id="relight-title">From a sketch to a screen you own.</h2>
            </div>
            <div className="rl-body">
              <p>
                <b>Any picture of a screen.</b> A screenshot, a wireframe, a whiteboard photo, a napkin sketch.
              </p>
              <p>
                <b>Any kind of app.</b> Dashboards, settings, sign-up flows, landing pages, admin tools. Answer a few
                questions and get working DIYA code back.
              </p>
              <p>It’s the one paid part of DIYA, and it isn’t ready yet.</p>
            </div>
          </header>
          <RelightSteps />
          <section className="rl-join" data-waitlist-block="" aria-labelledby="relight-join">
            <div className="rl-join-lead">
              <h3 id="relight-join">Get on the list</h3>
              <p>No date yet. Join, and you’ll hear the moment Relight opens.</p>
              <ul className="rl-promise" aria-label="What stays true">
                <li>The library stays MIT.</li>
                <li>Pro never gets a component the library lacks.</li>
              </ul>
            </div>
            <div className="rl-join-form">
              <ProWaitlist source="catalog" headingLevel={4} />
            </div>
          </section>
        </article>
      </div>
    </main>
  )
}

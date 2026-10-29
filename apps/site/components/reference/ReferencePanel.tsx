import { isItemId, type ItemId } from '../../lib/customize/registry'
import { itemBrief } from './ai-docs'
import { defaultText, itemReference, MCP_INSTALL } from './api'
import { ConnectEditor } from './ConnectEditor'
import { CopyForAi } from './CopyForAi'
import { guidance } from './guidance'
import './reference.css'

/** api.json text, with `backticked` names set as code. */
function Prose({ text }: { text: string }) {
  return text.split(/`([^`]+)`/).map((part, index) => (index % 2 ? <code key={index}>{part}</code> : part))
}

/** The item a catalog path documents, such as `/explore?pattern=table`. */
function itemFromPath(path: string): ItemId | null {
  const id = /[?&](?:component|pattern)=([\w-]+)/.exec(path)?.[1]
  return isItemId(id) ? id : null
}

/**
 * Under every playground: when to use the item, what it does for
 * accessibility, and every prop from api.json, with a "Copy for AI" brief
 * and "Connect your editor" for DIYA's MCP server.
 * Rendered on the server, so it costs the page no JavaScript beyond the
 * copy button.
 */
export function ReferencePanel({ path }: { path: string }) {
  const id = itemFromPath(path)
  const reference = id && itemReference(id)
  if (!id || !reference) return null
  const { use, instead, access } = guidance[id]
  const titleId = `reference-${id}`
  return (
    <section className="item-reference" aria-labelledby={titleId}>
      <div className="item-reference-sheet">
        <header className="item-reference-head">
          <div>
            <h2 id={titleId}>Using {reference.title}</h2>
            <p className="item-reference-lead">
              <Prose text={reference.description} />
            </p>
          </div>
          <div className="item-reference-tools">
            <CopyForAi brief={itemBrief(id)} title={reference.title} />
            <ConnectEditor install={MCP_INSTALL} />
          </div>
        </header>

        <div className="item-reference-guide">
          <section aria-labelledby={`${titleId}-when`}>
            <h3 id={`${titleId}-when`}>When to use</h3>
            <p>{use}</p>
            {instead && <p className="item-reference-quiet">{instead}</p>}
          </section>
          <section aria-labelledby={`${titleId}-access`}>
            <h3 id={`${titleId}-access`}>Accessibility</h3>
            <p>{access}</p>
          </section>
        </div>

        <section aria-labelledby={`${titleId}-props`} className="item-reference-props">
          <div className="item-reference-props-head">
            <h3 id={`${titleId}-props`}>Props</h3>
            <p className="item-reference-quiet">
              <code>{`import { ${reference.exportName} } from '${reference.importFrom}'`}</code>
              <span>
                {reference.stability === 'stable' ? 'Stable' : 'Experimental'} since {reference.since}
              </span>
            </p>
          </div>
          <dl>
            {reference.props.map(([name, prop]) => {
              const fallback = defaultText(prop)
              return (
                <div key={name} className="item-reference-prop">
                  <dt>
                    <code className="item-reference-name">{name}</code>
                    {prop.required && <span className="item-reference-required">Required</span>}
                    <code className="item-reference-type">{prop.type}</code>
                  </dt>
                  <dd>
                    <p>
                      <Prose text={prop.description} />
                    </p>
                    {fallback && (
                      <p className="item-reference-quiet">
                        Default <code>{fallback}</code>
                      </p>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
          {reference.extendsDom && (
            <p className="item-reference-quiet">
              Also takes every native <code>{`<${reference.extendsDom}>`}</code> attribute, such as <code>name</code>, <code>id</code> or <code>data-*</code>.
            </p>
          )}
          {reference.variants.length > 0 && (
            <p className="item-reference-quiet">
              Also exported: {reference.variants.map((name, index) => (
                <span key={name}>
                  {index > 0 && ', '}
                  <code>{name}</code>
                </span>
              ))}
              .
            </p>
          )}
        </section>
      </div>
    </section>
  )
}

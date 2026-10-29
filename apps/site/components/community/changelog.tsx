import { Fragment, type ReactNode } from 'react'

/*
 * A small Markdown reader for the SDK's CHANGELOG.md, enough for Keep a
 * Changelog: headings, paragraphs, nested lists, pipe tables, reference
 * links, and inline code, bold and links. It builds React elements, never
 * HTML strings, so nothing in the file can inject markup. The one inline
 * HTML the changelog uses, <code>, is read as code.
 */

export type Inline = string
export type Block =
  | { type: 'heading'; level: 2 | 3 | 4; text: Inline; id?: string }
  | { type: 'paragraph'; text: Inline }
  | { type: 'list'; items: ListItem[] }
  | { type: 'table'; head: Inline[]; rows: Inline[][]; label: string }
export type ListItem = { text: Inline; children: ListItem[] }
export type Changelog = { blocks: Block[]; links: Record<string, string> }

const LINK_DEFINITION = /^\[([^\]]+)\]:\s*(\S+)\s*$/
const LIST_ITEM = /^(\s*)[-*]\s+(.*)$/

/** Turns the changelog's Markdown into blocks. The file's own H1 is dropped; the page has one. */
export function parseChangelog(source: string): Changelog {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const links: Record<string, string> = {}
  const blocks: Block[] = []
  let label = 'Changes'

  for (const line of lines) {
    const definition = LINK_DEFINITION.exec(line)
    if (definition) links[definition[1].toLowerCase()] = definition[2]
  }

  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim() || LINK_DEFINITION.test(line)) {
      index++
      continue
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      if (level > 1) {
        const text = heading[2].trim()
        const version = level === 2 ? /^\[?([0-9][^\]\s]*)\]?/.exec(text)?.[1] : undefined
        blocks.push({ type: 'heading', level: level as 2 | 3 | 4, text, id: version ? `v${version}` : undefined })
        label = plainText(text)
      }
      index++
      continue
    }
    if (line.trimStart().startsWith('|')) {
      const rows: string[][] = []
      while (index < lines.length && lines[index].trimStart().startsWith('|')) {
        rows.push(splitRow(lines[index]))
        index++
      }
      const [head = [], separator, ...body] = rows
      const hasSeparator = separator?.every((cell) => /^:?-{2,}:?$/.test(cell.trim()))
      blocks.push({ type: 'table', head, rows: hasSeparator ? body : rows.slice(1), label })
      continue
    }
    if (LIST_ITEM.test(line)) {
      const items: { indent: number; text: string }[] = []
      while (index < lines.length && lines[index].trim()) {
        const current = lines[index]
        const item = LIST_ITEM.exec(current)
        if (item) items.push({ indent: item[1].length, text: item[2].trim() })
        else if (items.length) items[items.length - 1].text += ` ${current.trim()}`
        index++
      }
      blocks.push({ type: 'list', items: nest(items) })
      continue
    }
    const paragraph: string[] = []
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^#{1,4}\s/.test(lines[index]) &&
      !lines[index].trimStart().startsWith('|') &&
      !LIST_ITEM.test(lines[index])
    ) {
      paragraph.push(lines[index].trim())
      index++
    }
    const text = paragraph.join(' ')
    // A paragraph that is only bold text is a label for what follows.
    const bold = /^\*\*([^*]+)\*\*$/.exec(text)
    if (bold) {
      blocks.push({ type: 'heading', level: 4, text: bold[1] })
      label = bold[1]
    } else blocks.push({ type: 'paragraph', text })
  }
  return { blocks, links }
}

function splitRow(line: string) {
  const cells = line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
  return cells.map((cell) => cell.trim().replace(/\\\|/g, '|'))
}

function nest(items: { indent: number; text: string }[]): ListItem[] {
  const root: ListItem[] = []
  const stack: { indent: number; children: ListItem[] }[] = [{ indent: -1, children: root }]
  for (const item of items) {
    while (stack.length > 1 && item.indent <= stack[stack.length - 1].indent) stack.pop()
    const node: ListItem = { text: item.text, children: [] }
    stack[stack.length - 1].children.push(node)
    stack.push({ indent: item.indent, children: node.children })
  }
  return root
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '’', nbsp: ' ' }
function decode(text: string) {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }
    return ENTITIES[name.toLowerCase()] ?? whole
  })
}

/** The words of an inline span, without its Markdown. */
export function plainText(text: Inline) {
  return decode(
    text
      .replace(/<\/?code>/g, '')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]/g, '$1')
  )
}

const INLINE = /<code>([\s\S]*?)<\/code>|`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\[([^\]]+)\]/g

/** Only web and in-page links become anchors; anything else stays text. */
function safeHref(href: string) {
  return /^(https:\/\/|#|\/)/.test(href) ? href : null
}

/** Renders inline Markdown as React nodes. */
export function renderInline(text: Inline, links: Record<string, string>): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let key = 0
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0
    if (start > last) nodes.push(decode(text.slice(last, start)))
    const [whole, html, code, bold, label, href, reference] = match
    if (html !== undefined) nodes.push(<code key={key++}>{decode(html)}</code>)
    else if (code !== undefined) nodes.push(<code key={key++}>{code}</code>)
    else if (bold !== undefined) nodes.push(<strong key={key++}>{renderInline(bold, links)}</strong>)
    else if (label !== undefined) {
      const target = safeHref(href)
      nodes.push(
        target ? (
          <a key={key++} href={target}>
            {renderInline(label, links)}
          </a>
        ) : (
          <Fragment key={key++}>{renderInline(label, links)}</Fragment>
        )
      )
    } else if (reference !== undefined) {
      const target = safeHref(links[reference.toLowerCase()] ?? '')
      nodes.push(
        target ? (
          <a key={key++} href={target}>
            {decode(reference)}
          </a>
        ) : (
          decode(whole)
        )
      )
    }
    last = start + whole.length
  }
  if (last < text.length) nodes.push(decode(text.slice(last)))
  return nodes
}

function ListView({ items, links }: { items: ListItem[]; links: Record<string, string> }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>
          {renderInline(item.text, links)}
          {item.children.length > 0 && <ListView items={item.children} links={links} />}
        </li>
      ))}
    </ul>
  )
}

/** A version heading reads "1.0.0" with its date beside it, rather than "[1.0.0] - 2026-11-07". */
function VersionHeading({ text, id, links }: { text: Inline; id: string; links: Record<string, string> }) {
  const match = /^(\[[^\]]+\]|\S+)\s*[-–—]\s*(\d{4}-\d{2}-\d{2})$/.exec(text)
  if (!match) return <h2 id={id}>{renderInline(text, links)}</h2>
  const date = new Date(`${match[2]}T12:00:00Z`)
  const label = Number.isNaN(date.getTime())
    ? match[2]
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
  return (
    <h2 id={id}>
      <span>{renderInline(match[1], links)}</span>
      <small>
        <time dateTime={match[2]}>{label}</time>
      </small>
    </h2>
  )
}

/** The parsed changelog as page content: versions are h2, sections h3, bold labels h4. */
export function ChangelogView({ changelog }: { changelog: Changelog }) {
  const { blocks, links } = changelog
  return (
    <div className="cm-changelog">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          if (block.level === 2 && block.id)
            return <VersionHeading key={index} text={block.text} id={block.id} links={links} />
          const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4'
          return <Tag key={index}>{renderInline(block.text, links)}</Tag>
        }
        if (block.type === 'paragraph') return <p key={index}>{renderInline(block.text, links)}</p>
        if (block.type === 'list') return <ListView key={index} items={block.items} links={links} />
        return (
          // A focusable region, so a keyboard can scroll a wide table on a phone.
          <div key={index} className="cm-table" role="region" aria-label={`${block.label}, table`} tabIndex={0}>
            <table>
              <thead>
                <tr>
                  {block.head.map((cell, cellIndex) => (
                    <th key={cellIndex} scope="col">
                      {renderInline(cell, links)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{renderInline(cell, links)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

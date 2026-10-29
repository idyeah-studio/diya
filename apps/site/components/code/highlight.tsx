import type { ReactNode } from 'react'

export type CodeLanguage = 'tsx' | 'css' | 'shell'

/*
 * Monochrome syntax: hierarchy by weight and tone, never by colour.
 * k: keywords and commands, quiet · p: punctuation, quieter
 * t: component and selector names, strong · c: comments, quiet italic
 * Strings and everything else stay in the text colour.
 */
const TSX = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`[^`]*`)|(<\/?)([A-Z][\w.]*)|\b(import|from|export|default|function|return|const|let|type|as)\b|([{}()[\]<>/=,;:.?]|=>)/g
const CSS = /(\/\*[\s\S]*?\*\/)|('[^'\n]*'|"[^"\n]*")|(^[^\n{}]+(?=\s*\{))|(--[\w-]+|[a-z-]+(?=\s*:))|([{}();:,])/gm

export function highlight(code: string, language: CodeLanguage): ReactNode[] {
  if (language === 'shell') {
    const match = /^(\S+\s+\S+)([\s\S]*)$/.exec(code)
    return match ? [<span key="k" className="tok-k">{match[1]}</span>, match[2]] : [code]
  }
  const pattern = language === 'css' ? CSS : TSX
  const out: ReactNode[] = []
  let last = 0
  let key = 0
  for (const match of code.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) out.push(code.slice(last, index))
    const push = (text: string, className: string) => out.push(<span key={key++} className={className}>{text}</span>)
    if (language === 'tsx') {
      const [, comment, string, open, tag, keyword, punctuation] = match
      if (comment) push(comment, 'tok-c')
      else if (string) push(string, 'tok-s')
      else if (open) {
        push(open, 'tok-p')
        push(tag, 'tok-t')
      } else if (keyword) push(keyword, 'tok-k')
      else if (punctuation) push(punctuation, 'tok-p')
    } else {
      const [, comment, string, selector, property, punctuation] = match
      if (comment) push(comment, 'tok-c')
      else if (string) push(string, 'tok-s')
      else if (selector) push(selector, 'tok-t')
      else if (property) push(property, 'tok-k')
      else if (punctuation) push(punctuation, 'tok-p')
    }
    last = index + match[0].length
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}

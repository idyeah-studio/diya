import { TEXT_MAX, TEXT_MIN } from './config'

/** Line breaks stay; other control characters and stray space at the ends go. */
export function cleanText(value: string) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, ' ')
    .trim()
}

/** Length as a person counts it: by character, not by UTF-16 unit. */
export const textLength = (value: string) => [...value].length

export function textProblem(value: string): 'short' | 'long' | null {
  const length = textLength(cleanText(value))
  return length < TEXT_MIN ? 'short' : length > TEXT_MAX ? 'long' : null
}

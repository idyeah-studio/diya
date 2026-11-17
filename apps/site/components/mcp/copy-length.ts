/**
 * Too long for one line beside Copy on a phone: on narrow screens its Copy
 * key drops under it. Its own module, not CopyCommand's, because the server
 * calls it too, for the list shown without JavaScript.
 */
export const isLong = (code: string) => code.length > 28 || code.includes('\n')

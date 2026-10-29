'use client'
import { forwardRef } from 'react'
import { cx } from '../internal/cx.js'
import { TextInput, type TextInputProps } from '../text-input/TextInput.js'
/** TextInput's props, with the search type and magnifier icon built in. */
export type SearchProps = Omit<TextInputProps, 'type' | 'leadingIcon'> & {
  /** Corner style of the field; defaults to 'rounded', the same corners as every other control. 'pill' is fully round. */
  shape?: 'rounded' | 'pill'
}
/** A search field: a TextInput with type="search" and a magnifier icon. */
export const Search = forwardRef<HTMLInputElement, SearchProps>(function Search({ shape = 'rounded', className, ...props }, ref) {
  return <TextInput {...props} ref={ref} className={cx('diya-search', `diya-search-${shape}`, className)} type="search" leadingIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>} />
})

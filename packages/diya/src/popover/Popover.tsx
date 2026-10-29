'use client'
import { forwardRef, type ReactNode } from 'react'
import { FloatingSurface, type FloatingTriggerProps } from '../overlay/FloatingSurface.js'
export type PopoverProps = FloatingTriggerProps & {
  /** The trigger button's visible text and the panel's accessible name; with `trigger`, only the panel's name. */
  label: string
  /** Preferred side for the panel; it moves to stay on screen. Defaults to 'bottom'. */
  placement?: 'top' | 'bottom'
  /** Disables the trigger and closes an open panel. */
  disabled?: boolean
  /** The panel's content, or a function that renders it; call `close` to shut it and return focus to the trigger. */
  children: ReactNode | ((close: () => void) => ReactNode)
}
/** A button that opens a small panel of interactive content beside it; `className`, `style`, other attributes and the ref go to the trigger. */
export const Popover = forwardRef<HTMLButtonElement, PopoverProps>(function Popover({ label, placement = 'bottom', disabled, children, ...props }, ref) {
  return <FloatingSurface {...props} ref={ref} label={label} placement={placement} disabled={disabled}>{children}</FloatingSurface>
})

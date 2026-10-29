'use client'
import { useCallback, useRef, useState } from 'react'
import { Button } from '@idyeah/diya'
import { GetCodeDrawer } from './GetCodeDrawer'
import { Icon } from './Icon'

/** The Get code button and its drawer; pass `open`/`onOpenChange` to control it from elsewhere. */
export function LibraryDownload({
  id,
  open: controlled,
  onOpenChange,
  glass,
  theme,
}: {
  id: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  glass?: boolean
  theme?: 'light' | 'dark'
}) {
  const [own, setOwn] = useState(false)
  const open = controlled ?? own
  const setOpen = onOpenChange ?? setOwn
  const trigger = useRef<HTMLButtonElement>(null)
  /* Step 3 reads the playground on the same item page as this button. */
  const playground = useCallback(() => trigger.current?.closest('.component-document') ?? null, [])
  return (
    <>
      <Button ref={trigger} variant="quiet" size="small" shape="pill" className="library-download" onClick={() => setOpen(true)}>
        <Icon name="code" size={16} />
        Get code
      </Button>
      <GetCodeDrawer id={id} open={open} onOpenChange={setOpen} glass={glass} theme={theme} playground={playground} />
    </>
  )
}

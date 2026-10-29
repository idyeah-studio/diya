'use client'
import { useEffect } from 'react'
import { Button } from '@idyeah/diya'

/**
 * One button that posts a link's token. A plain form post, so it works without
 * JavaScript; with it, the token is also cleared from the address bar on arrival.
 */
export function TokenForm({ action, token, label }: { action: string; token: string; label: string }) {
  useEffect(() => {
    try {
      window.history.replaceState(null, '', window.location.pathname)
    } catch {}
  }, [])
  return (
    <form method="post" action={action}>
      <input type="hidden" name="token" value={token} />
      <Button type="submit" size="large" shape="pill">
        {label}
      </Button>
    </form>
  )
}

'use client'
import { useEffect } from 'react'
import { readLocalNote, writeLocalNote } from '../../lib/waitlist/local-note'

/** If this browser joined, remember that the address is confirmed and whether it's founding. */
export function ConfirmedNote({ founding }: { founding: boolean }) {
  useEffect(() => {
    const note = readLocalNote()
    if (note) writeLocalNote({ ...note, confirmed: true, founding })
  }, [founding])
  return null
}

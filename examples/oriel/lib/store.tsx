'use client'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AlertTone } from '@idyeah/diya'
import { BRAND } from './brand'
import { customers, initialInvoices, TODAY, type Customer, type Invoice } from './data'

// The app keeps its data in memory: refresh the page and it starts over.
// A real app would swap these functions for calls to its own API.

type Notice = { id: number; tone: AlertTone; title: string; text: string }

type Store = {
  invoices: Invoice[]
  customers: Customer[]
  customer: (id: string) => Customer
  markPaid: (ids: string[]) => void
  remind: (ids: string[]) => void
  remove: (ids: string[]) => void
  add: (invoice: Omit<Invoice, 'id' | 'number'>) => Invoice
  notice: Notice | null
  notify: (tone: AlertTone, title: string, text: string) => void
  dismiss: () => void
}

const StoreContext = createContext<Store | null>(null)
const byId = new Map(customers.map((c) => [c.id, c]))

export function StoreProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [notice, setNotice] = useState<Notice | null>(null)

  const notify = useCallback((tone: AlertTone, title: string, text: string) => {
    setNotice({ id: Date.now(), tone, title, text })
  }, [])
  const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

  const store = useMemo<Store>(
    () => ({
      invoices,
      customers,
      customer: (id) => byId.get(id)!,
      markPaid: (ids) => {
        setInvoices((all) => all.map((i) => (ids.includes(i.id) ? { ...i, status: 'paid', paidOn: TODAY } : i)))
        notify('success', 'Marked as paid', `${plural(ids.length, 'invoice')} moved to Paid.`)
      },
      remind: (ids) => {
        setInvoices((all) => all.map((i) => (ids.includes(i.id) ? { ...i, remindedOn: TODAY } : i)))
        notify('info', 'Reminders queued', `${plural(ids.length, 'polite email')} will go out within the hour.`)
      },
      remove: (ids) => {
        setInvoices((all) => all.filter((i) => !ids.includes(i.id)))
        notify('success', 'Deleted', `${plural(ids.length, 'invoice')} removed from ${BRAND.name}.`)
      },
      add: (draft) => {
        const next = Math.max(...invoices.map((i) => Number(i.number.slice(4))), 1000) + 1
        const invoice = { ...draft, id: `inv-${next}`, number: `INV-${next}` }
        setInvoices((all) => [invoice, ...all])
        return invoice
      },
      notice,
      notify,
      dismiss: () => setNotice(null),
    }),
    [invoices, notice, notify],
  )
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore needs <StoreProvider>')
  return store
}

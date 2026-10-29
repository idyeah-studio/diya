// Built with DIYA (MIT): https://diya13.ai
'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Button,
  Combobox,
  DatePicker,
  Dialog,
  Drawer,
  Inline,
  List,
  Metric,
  PageHeader,
  Stack,
  Table,
  Tag,
  TextArea,
  TextInput,
  type TableColumn,
} from '@idyeah/diya'
import { TODAY, type Invoice } from '@/lib/data'
import { money, shortDate, statusOf } from '@/lib/format'
import { useStore } from '@/lib/store'
import { useNarrow } from '@/lib/use-narrow'
import { BRAND } from '@/lib/brand'
import { DownloadIcon, PlusIcon } from '@/components/icons'

export function Invoices() {
  const store = useStore()
  const { invoices, customer, customers } = store
  const router = useRouter()
  const params = useSearchParams()

  const [open, setOpen] = useState<Invoice | null>(null)
  const [toDelete, setToDelete] = useState<string[]>([])
  const creating = params.get('new') === '1'
  // A link from Customers names one customer; ignore names the app doesn't know.
  const named = params.get('customer')
  const only = customers.some((c) => c.id === named) ? named : null
  const setCreating = (on: boolean) => router.replace(on ? '/invoices?new=1' : only ? `/invoices?customer=${only}` : '/invoices', { scroll: false })
  // Table keeps its own search and filter state, with no way to set it from the
  // URL, so a link from Customers narrows the rows here instead.
  const rows = only && !creating ? invoices.filter((i) => i.customerId === only) : invoices

  const columns: TableColumn<Invoice>[] = [
    {
      key: 'customer',
      label: 'Customer',
      render: (i) => <span className="customer-name">{customer(i.customerId).name}</span>,
      sortValue: (i) => customer(i.customerId).name,
      width: 260,
    },
    { key: 'number', label: 'Invoice', render: (i) => <span className="invoice-no">{i.number}</span>, sortValue: (i) => i.number, width: 130 },
    { key: 'issued', label: 'Issued', render: (i) => shortDate(i.issued), sortValue: (i) => i.issued, width: 110 },
    {
      key: 'status',
      label: 'Status',
      render: (i) => {
        const s = statusOf(i)
        return (
          <Tag label="Status" tone={s.tone} leading="dot" size="small">
            {s.text}
          </Tag>
        )
      },
      sortValue: (i) => i.due,
      width: 150,
    },
    { key: 'amount', label: 'Amount', render: (i) => money(i.amount), sortValue: (i) => i.amount, numeric: true, width: 120 },
  ]

  // On a phone, two columns that each carry two facts: who and where it stands on the
  // left, how much and which invoice on the right, so the name keeps its room.
  const narrow = useNarrow()
  const phoneColumns: TableColumn<Invoice>[] = [
    {
      key: 'customer',
      label: 'Invoice',
      render: (i) => {
        const s = statusOf(i)
        return (
          <Stack gap={1} align="start">
            <span className="customer-name">{customer(i.customerId).name}</span>
            <Tag label="Status" tone={s.tone} leading="dot" size="small" className="nowrap">{s.text}</Tag>
          </Stack>
        )
      },
      sortValue: (i) => customer(i.customerId).name,
    },
    {
      key: 'amount',
      label: 'Amount',
      numeric: true,
      width: 100,
      render: (i) => (
        <Stack gap={1} align="end">
          <span className="figure">{money(i.amount)}</span>
          <span className="invoice-no">{i.number}</span>
        </Stack>
      ),
      sortValue: (i) => i.amount,
    },
  ]

  const unpaid = invoices.filter((i) => i.status !== 'paid' && i.status !== 'draft')
  const exportCsv = () => {
    const lines = [['Invoice', 'Customer', 'Issued', 'Due', 'Status', 'Amount'].join(',')]
    for (const i of invoices) lines.push([i.number, `"${customer(i.customerId).name}"`, i.issued, i.due, statusOf(i).key, i.amount].join(','))
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    Object.assign(document.createElement('a'), { href: url, download: `${BRAND.slug}-invoices.csv` }).click()
    URL.revokeObjectURL(url)
  }

  return (
    <Stack gap={6}>
      <PageHeader
        surface={false}
        headingLevel={1}
        title="Invoices"
        description={`${invoices.length} invoices. ${unpaid.length} waiting on payment, worth ${money(unpaid.reduce((t, i) => t + i.amount, 0))}.`}
        actions={
          <Inline gap={2}>
            <Button variant="outline" onClick={exportCsv}>
              <DownloadIcon /> Export CSV
            </Button>
            <Button onClick={() => setCreating(true)}>
              <PlusIcon /> New invoice
            </Button>
          </Inline>
        }
      />

      {only && !creating && (
        <Inline gap={2}>
          <Tag label="Showing" onRemove={() => router.replace('/invoices', { scroll: false })}>
            Only {customer(only).name}
          </Tag>
        </Inline>
      )}

      <Table
        label="All invoices"
        showTitle={false}
        rows={rows}
        columns={narrow ? phoneColumns : columns}
        density={narrow ? 'compact' : 'comfortable'}
        rowLabel={(i) => `${i.number}, ${customer(i.customerId).name}`}
        searchText={(i) => `${i.number} ${customer(i.customerId).name} ${customer(i.customerId).contact}`}
        filterOptions={[
          { key: 'status', label: 'Status', options: ['Draft', 'Sent', 'Due soon', 'Overdue', 'Paid'], getValue: (i) => statusOf(i).key },
          { key: 'customer', label: 'Customer', options: customers.map((c) => ({ value: c.id, label: c.name })), getValue: (i) => i.customerId },
        ]}
        onRowOpen={setOpen}
        openLabel="Open invoice"
        bulkActions={[
          { label: 'Send reminder', onAction: store.remind },
          { label: 'Mark as paid', onAction: store.markPaid },
          { label: 'Delete', onAction: setToDelete, destructive: true },
        ]}
        emptyTitle="No invoices yet"
        emptyDescription="Your first one is a click away: New invoice, top right."
      />

      <Dialog
        open={toDelete.length > 0}
        onOpenChange={(next) => !next && setToDelete([])}
        title={toDelete.length === 1 ? 'Delete this invoice?' : `Delete ${toDelete.length} invoices?`}
        description="Your customers’ payment links stop working, and this can’t be undone. Paid invoices stay in your records."
        size="small"
        confirmVariant="destructive"
        confirmLabel={toDelete.length === 1 ? 'Delete invoice' : `Delete ${toDelete.length} invoices`}
        dismissLabel="Keep them"
        onConfirm={() => {
          store.remove(toDelete)
          setToDelete([])
        }}
      >
        <List
          label="Invoices to delete"
          size="small"
          items={invoices
            .filter((i) => toDelete.includes(i.id))
            .map((i) => ({ id: i.id, label: `${i.number} · ${customer(i.customerId).name}`, trailing: money(i.amount) }))}
        />
      </Dialog>

      <InvoiceDrawer invoice={open} onClose={() => setOpen(null)} />
      <NewInvoice key={String(creating)} open={creating} onOpenChange={setCreating} forCustomer={only ?? ''} />
    </Stack>
  )
}

function InvoiceDrawer({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const { customer, markPaid, remind, invoices } = useStore()
  // Read the live copy, so marking it paid updates the open drawer too.
  const live = invoice && invoices.find((i) => i.id === invoice.id)
  // Drawer needs a title and children even while closed, so it stays mounted
  // with an empty body; that keeps its close and focus return intact.
  if (!live) return <Drawer open={false} onOpenChange={onClose} title="Invoice"><span /></Drawer>
  const c = customer(live.customerId)
  const s = statusOf(live)
  const unpaid = live.status !== 'paid'
  return (
    <Drawer
      open
      onOpenChange={(next) => !next && onClose()}
      title={live.number}
      description={`${c.name} · issued ${shortDate(live.issued)}`}
      footer={
        unpaid ? (
          <Inline gap={2} justify="end">
            <Button variant="outline" onClick={() => remind([live.id])}>Send reminder</Button>
            <Button onClick={() => markPaid([live.id])}>Mark as paid</Button>
          </Inline>
        ) : null
      }
    >
      <Stack gap={5}>
        <Inline gap={3} justify="between" align="end">
          <Metric label="Amount" value={money(live.amount)} size="large" />
          <Tag label="Status" tone={s.tone} leading="dot">{s.text}</Tag>
        </Inline>
        <List
          label="Invoice details"
          divided
          items={[
            { id: 'to', label: 'Billed to', trailing: c.contact, description: c.email },
            { id: 'due', label: 'Due', trailing: shortDate(live.due) },
            { id: 'paid', label: 'Paid', trailing: live.paidOn ? shortDate(live.paidOn) : 'Not yet' },
            { id: 'reminded', label: 'Last reminder', trailing: live.remindedOn ? shortDate(live.remindedOn) : 'None sent' },
          ]}
        />
      </Stack>
    </Drawer>
  )
}

function NewInvoice({ open, onOpenChange, forCustomer }: { open: boolean; onOpenChange: (open: boolean) => void; forCustomer: string }) {
  const { customers, add, notify } = useStore()
  const [customerId, setCustomerId] = useState(forCustomer)
  const [amount, setAmount] = useState('')
  const [due, setDue] = useState('2026-11-20')
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)

  const value = Number(amount.replace(/[$,\s]/g, ''))
  const errors = {
    customer: !customerId ? 'Choose who this is for.' : undefined,
    amount: !(value > 0) ? 'Add an amount, such as 1,200.' : undefined,
  }
  const submit = () => {
    setTried(true)
    if (errors.customer || errors.amount) return
    const invoice = add({ customerId, amount: value, due, issued: TODAY, status: 'draft' })
    notify('success', `${invoice.number} saved as a draft`, 'Send it when you’re ready, from its row.')
    setCustomerId('')
    setAmount('')
    setNote('')
    setTried(false)
    onOpenChange(false)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="New invoice"
      description="Saved as a draft. Nothing is sent until you say so."
      footer={
        <Inline gap={2} justify="end">
          <Button variant="quiet" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save draft</Button>
        </Inline>
      }
    >
      <Stack gap={4}>
        <Combobox
          label="Customer"
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
          value={customerId}
          onValueChange={setCustomerId}
          error={tried ? errors.customer : undefined}
        />
        <TextInput label="Amount" inputMode="decimal" helperText="In US dollars." value={amount} onValueChange={setAmount} error={tried ? errors.amount : undefined} />
        <DatePicker label="Due" value={due} onValueChange={setDue} min={TODAY} />
        <TextArea label="Note to the customer" rows={3} maxLength={240} showCount value={note} onValueChange={setNote} />
      </Stack>
    </Drawer>
  )
}

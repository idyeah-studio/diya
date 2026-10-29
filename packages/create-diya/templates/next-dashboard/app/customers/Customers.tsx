// Built with DIYA (MIT): https://diya13.ai
'use client'
import { useState } from 'react'
import { Avatar, Card, ContentState, Inline, Menu, Metric, PageHeader, Search, Stack, Tabs, Tag } from '@idyeah/diya'
import { TODAY } from '@/lib/data'
import { daysBetween, money } from '@/lib/format'
import { useStore } from '@/lib/store'
import { MoreIcon } from '@/components/icons'

type View = 'owing' | 'all'

export function Customers() {
  const { customers, invoices } = useStore()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('owing')

  const rows = customers
    .map((c) => {
      const theirs = invoices.filter((i) => i.customerId === c.id)
      const open = theirs.filter((i) => i.status === 'sent' || i.status === 'overdue')
      return {
        ...c,
        owes: open.reduce((t, i) => t + i.amount, 0),
        open: open.length,
        late: open.filter((i) => daysBetween(TODAY, i.due) < 0).length,
        lifetime: theirs.filter((i) => i.status === 'paid').reduce((t, i) => t + i.amount, 0),
      }
    })
    .filter((c) => (view === 'all' ? true : c.owes > 0))
    .filter((c) => `${c.name} ${c.contact} ${c.city}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.owes - a.owes || b.lifetime - a.lifetime)

  const avgDays = Math.round(customers.reduce((t, c) => t + c.paysIn, 0) / customers.length)
  const owing = customers.filter((c) => invoices.some((i) => i.customerId === c.id && (i.status === 'sent' || i.status === 'overdue'))).length

  const grid =
    rows.length === 0 ? (
      <ContentState title="Nobody by that name" description={`No customer matches “${query}”. Try a contact’s first name, or a city.`} />
    ) : (
      <div className="cards">
        {rows.map((c) => (
          <CustomerCard key={c.id} c={c} />
        ))}
      </div>
    )

  return (
    <Stack gap={5}>
      <PageHeader
        surface={false}
        headingLevel={1}
        title="Customers"
        description={`${customers.length} companies, ${owing} of them owing you now. Most pay within ${avgDays} days.`}
        actions={<Search label="Find a customer" hideLabel placeholder="Name, contact or city" value={query} onValueChange={setQuery} clearable style={{ width: 'min(300px, 100%)' }} />}
      />
      <Tabs
        label="Which customers"
        variant="pill"
        value={view}
        onValueChange={(v) => setView(v as View)}
        items={[
          { value: 'owing', label: 'Owe you', badge: { label: 'customers', variant: 'count', count: owing }, content: grid },
          { value: 'all', label: 'Everyone', badge: { label: 'customers', variant: 'count', count: customers.length }, content: grid },
        ]}
      />
    </Stack>
  )
}

type Row = ReturnType<typeof useStore>['customers'][number] & { owes: number; open: number; late: number; lifetime: number }

function CustomerCard({ c }: { c: Row }) {
  return (
    <Card
      title={c.name}
      headingLevel={2}
      description={`${c.contact} · ${c.city}`}
      tags={<Avatar name={c.name} />}
      actions={
        <Menu
          label={`Actions for ${c.name}`}
          triggerIcon={<MoreIcon />}
          items={[
            { id: 'invoices', label: 'See their invoices', href: `/invoices?customer=${c.id}` },
            { id: 'new', label: 'New invoice', href: `/invoices?new=1&customer=${c.id}` },
            { id: 'email', label: `Email ${c.contact.split(' ')[0]}`, href: `mailto:${c.email}`, separatorBefore: true },
          ]}
        />
      }
      divided
      footer={
        <Inline gap={3} justify="between" style={{ width: '100%' }}>
          <span className="pays">Usually pays in {c.paysIn} days</span>
          {c.late > 0 && (
            <Tag label="Late invoices" tone="error" leading="dot" size="small">
              {c.late} late
            </Tag>
          )}
        </Inline>
      }
    >
      <div className="pair">
        <Metric label="Owes you" value={money(c.owes)} size="small" />
        <Metric label="Paid since July" value={money(c.lifetime)} size="small" />
      </div>
    </Card>
  )
}

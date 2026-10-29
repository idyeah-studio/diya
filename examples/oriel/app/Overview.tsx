// Built with DIYA (MIT): https://diya13.ai
'use client'
import { Button, Card, List, Metric, PageHeader, Stack, Tag } from '@idyeah/diya'
import { DataViz } from '@idyeah/diya/charts'
import { monthly, TODAY } from '@/lib/data'
import { money, moneyShort, statusOf, daysBetween } from '@/lib/format'
import { useStore } from '@/lib/store'
import { useNarrow } from '@/lib/use-narrow'
import { PlusIcon } from '@/components/icons'

export function Overview() {
  const { invoices, customer, remind } = useStore()
  const narrow = useNarrow()

  const open = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue')
  const late = open.filter((i) => daysBetween(TODAY, i.due) < 0)
  const paidThisMonth = invoices.filter((i) => i.paidOn?.startsWith('2026-10'))
  const sum = (list: typeof invoices) => list.reduce((total, i) => total + i.amount, 0)
  const paid = [...monthly.paid.slice(0, -1), sum(paidThisMonth)]

  const nudge = open
    .filter((i) => daysBetween(TODAY, i.due) <= 3)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5)
  const unreminded = nudge.filter((i) => !i.remindedOn)

  return (
    <Stack gap={6}>
      <PageHeader
        surface={false}
        headingLevel={1}
        title="Good morning, Asha"
        description={`Wednesday, October 21. ${open.length} invoices are out, and ${late.length} of them are late.`}
        actions={
          <Button href="/invoices?new=1">
            <PlusIcon /> New invoice
          </Button>
        }
      />

      <Stack gap={4}>
        {/* One panel of figures, one focal number: what you're owed. */}
        <Card title="October so far" headingLevel={2}>
          <div className="glance">
            <Metric className="glance-metric" size={narrow ? 'medium' : 'large'} label={`Outstanding, across ${open.length} invoices`} value={money(sum(open))} />
            <Metric className="glance-metric" size={narrow ? 'small' : 'medium'} label="Paid in October" value={money(sum(paidThisMonth))} change={{ value: '5%', direction: 'up', meaning: 'positive', comparison: 'vs September' }} />
            <Metric className="glance-metric" size={narrow ? 'small' : 'medium'} label={`Late, ${late.length} invoices`} value={money(sum(late))} />
          </div>
        </Card>

        <div className="split">
          <DataViz
            title="Invoiced and paid"
            description="The last six months. October is so far."
            headingLevel={2}
            type="bar"
            categories={monthly.months}
            series={[
              { name: 'Invoiced', values: monthly.invoiced },
              { name: 'Paid', values: paid },
            ]}
            formatValue={moneyShort}
            valueDomain={[0, 50000]}
            height={narrow ? 240 : 316}
            showDataToggle
          />
          <Card
            title="Needs a nudge"
            headingLevel={2}
            description="Late, or due in the next three days."
            divided
            footer={
              <Button variant="outline" size="small" disabled={unreminded.length === 0} onClick={() => remind(unreminded.map((i) => i.id))}>
                {unreminded.length ? `Remind all ${unreminded.length}` : 'All reminded'}
              </Button>
            }
          >
            <List
              label="Invoices that need a nudge"
              divided
              items={nudge.map((i) => {
                const s = statusOf(i)
                return {
                  id: i.id,
                  label: customer(i.customerId).name,
                  description: `${money(i.amount)} · ${i.number}${i.remindedOn ? ' · reminded today' : ''}`,
                  trailing: (
                    <Tag label="Status" tone={s.tone} leading="dot" size="small" className="nowrap">
                      {s.text}
                    </Tag>
                  ),
                }
              })}
            />
          </Card>
        </div>
      </Stack>
    </Stack>
  )
}

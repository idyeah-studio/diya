import { Alert, Badge, Button, Card, Metric, PageHeader, TextLink, defaultMessages } from '@idyeah/diya'
import { Chart } from '@idyeah/diya/charts'
import { Providers } from './providers'

// A Server Component: defaultMessages is a plain value here, and the
// components cross into the client through their own 'use client' modules.
export default function Page() {
  const selected = defaultMessages.table.selected(3)
  return (
    <Providers>
      <main style={{ maxWidth: 880, margin: '0 auto', padding: 32, display: 'grid', gap: 24 }}>
        <PageHeader
          headingLevel={1}
          title="Server-rendered DIYA"
          description={`Built-in text read on the server: “${defaultMessages.table.emptyTitle}” and “${selected}”.`}
          tags={<Badge variant="count" count={3} label="checks" />}
          actions={<Button disabled>Saved</Button>}
        />
        <Alert tone="success" title="Client boundary">
          This page is a Server Component. Only the provider and interactive components run in the browser.
        </Alert>
        <Card title="Monthly revenue" description="Static data, rendered with the optional charts entry.">
          <Metric label="October" value="12,480" unit="USD" />
          <Chart type="bar" label="Revenue" categories={['Aug', 'Sep', 'Oct']} series={[{ name: 'Revenue', values: [9800, 11020, 12480] }]} />
        </Card>
        <TextLink href="https://diya13.ai">DIYA catalog</TextLink>
      </main>
    </Providers>
  )
}

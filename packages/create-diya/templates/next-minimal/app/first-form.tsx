'use client'
import { useState } from 'react'
import { Alert, Button, Card, Inline, Select, Stack, TextInput } from '@idyeah/diya'

const kinds = [
  { value: 'saas', label: 'A SaaS product' },
  { value: 'dashboard', label: 'An internal dashboard' },
  { value: 'site', label: 'A site with sign-in' },
  { value: 'other', label: 'Something else' },
]

// A client component: it holds state and handlers. DIYA draws the pieces;
// what happens on Save is yours.
export function FirstForm() {
  const [name, setName] = useState('')
  const [kind, setKind] = useState('saas')
  const [saved, setSaved] = useState<string | null>(null)

  return (
    <Card title="Try a form" description="Type, pick, save. The state lives in first-form.tsx.">
      <Stack gap={4}>
        <Inline gap={4} align="end">
          <div style={{ flex: '1 1 260px' }}>
            <TextInput label="What are you building?" placeholder="Oriel, for small studios" value={name} onValueChange={setName} />
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <Select label="It's mostly" options={kinds} value={kind} onValueChange={setKind} />
          </div>
          <Button disabled={!name.trim()} onClick={() => setSaved(name.trim())}>
            Save
          </Button>
        </Inline>
        {saved && (
          <Alert tone="success" title={`Saved “${saved}”`} onDismiss={() => setSaved(null)}>
            Nothing left your browser. Wire the button to your own API when you&rsquo;re ready.
          </Alert>
        )}
      </Stack>
    </Card>
  )
}

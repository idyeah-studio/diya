// Built with DIYA (MIT): https://diya13.ai
'use client'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button, Card, Choice, DatePicker, Form, Inline, PageHeader, Progress, Select, Stack, Switch, Tag, TextArea, TextInput } from '@idyeah/diya'
import { useStore } from '@/lib/store'
import { useLook, type Backdrop, type Look } from '../providers'
import { BRAND } from '@/lib/brand'

type Business = {
  name: string
  email: string
  address: string
  currency: string
  terms: string
  yearStarts: string
  reminders: boolean
  attachPdf: boolean
}

export function Settings() {
  const { notify } = useStore()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Business>({
    defaultValues: {
      name: 'Kiln Studio',
      email: 'accounts@kiln.example',
      address: '14 Foundry Lane\nPortland, OR 97209',
      currency: 'USD',
      terms: '30',
      yearStarts: '2026-04-01',
      reminders: true,
      attachPdf: false,
    },
  })

  // A pretend network call, so the button's loading state is real.
  const save = async (values: Business) => {
    await new Promise((r) => setTimeout(r, 700))
    reset(values)
    notify('success', 'Saved', 'New invoices will use these details.')
  }

  return (
    <Stack gap={6}>
      <PageHeader surface={false} headingLevel={1} title="Settings" description={`What your invoices say about you, and how ${BRAND.name} looks.`} />

      <div className="settings">
        <Form
            title="Your business"
            headingLevel={2}
            description="Printed at the top of every invoice."
            style={{ maxWidth: 'none' }}
            noValidate
            onSubmit={handleSubmit(save)}
            loading={isSubmitting}
            submitLabel="Save changes"
            onCancel={isDirty ? () => reset() : undefined}
            cancelLabel="Undo changes"
          >
            <Stack gap={4}>
              <TextInput label="Business name" autoComplete="organization" {...register('name', { required: 'Your invoices need a name at the top.' })} error={errors.name?.message} />
              <TextInput
                label="Billing email"
                type="email"
                helperText="Customers reply here."
                {...register('email', { required: 'Add an email customers can reply to.', pattern: { value: /\S+@\S+\.\S+/, message: 'That doesn’t look like an email yet.' } })}
                error={errors.email?.message}
              />
              <TextArea label="Address" rows={3} {...register('address')} />
              <div className="two">
                <Select
                  label="Currency"
                  options={[
                    { value: 'USD', label: 'USD, US dollar' },
                    { value: 'EUR', label: 'EUR, euro' },
                    { value: 'GBP', label: 'GBP, pound' },
                    { value: 'INR', label: 'INR, rupee' },
                  ]}
                  {...register('currency')}
                />
                <Select
                  label="Payment terms"
                  options={[
                    { value: '7', label: '7 days' },
                    { value: '14', label: '14 days' },
                    { value: '30', label: '30 days' },
                    { value: '60', label: '60 days' },
                  ]}
                  {...register('terms')}
                />
              </div>
              <Controller
                name="yearStarts"
                control={control}
                render={({ field }) => (
                  <DatePicker label="Financial year starts" helperText="For the yearly totals on Overview." value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />
                )}
              />
              <Switch label="Remind customers three days before an invoice is due" {...register('reminders')} />
              <Switch label="Attach a PDF to every invoice email" {...register('attachPdf')} />
            </Stack>
          </Form>

        <Appearance />
      </div>
    </Stack>
  )
}

const SWATCHES = [
  { name: 'Ink', value: '' },
  { name: 'Ocean', value: '#0A7CFF' },
  { name: 'Jade', value: '#1FA855' },
  { name: 'Ember', value: '#FF6A1A' },
  { name: 'Rose', value: '#FF375F' },
  { name: 'Saffron', value: '#F5A300' },
]

function Appearance() {
  const { look, setLook } = useLook()
  const [copied, setCopied] = useState(false)
  const props = [
    look.theme !== 'system' && `theme="${look.theme}"`,
    look.brandColor && `brandColor="${look.brandColor}"`,
    look.glass && 'glass',
  ].filter(Boolean)
  const snippet = `<DiyaProvider${props.length ? ' ' + props.join(' ') : ''}>`

  return (
    <Card title="Look and feel" headingLevel={2} style={{ maxWidth: 'none' }} description="Three props on DiyaProvider. Change them here and the whole app follows.">
      <Stack gap={5}>
        <Choice
          label="Theme"
          value={look.theme}
          onValueChange={(theme) => setLook({ theme: theme as Look['theme'] })}
          options={[
            { value: 'system', label: 'Match my computer' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />

        <Stack gap={3}>
          <p className="label-strong" id="brand-label">Brand color</p>
          <div className="swatches" role="group" aria-labelledby="brand-label">
            {SWATCHES.map((s) => (
              <button
                key={s.name}
                type="button"
                className="swatch"
                aria-label={s.name}
                aria-pressed={look.brandColor === s.value}
                style={{ background: s.value || 'var(--diya-color-text)' }}
                onClick={() => setLook({ brandColor: s.value })}
              />
            ))}
          </div>
          <p className="muted">{SWATCHES.find((s) => s.value === look.brandColor)?.name ?? look.brandColor}: buttons, switches, selected tabs and the first chart series.</p>
        </Stack>

        <Switch label="Glass" helperText="Translucent headers, menus and dialogs over a soft backdrop." checked={look.glass} onCheckedChange={(glass) => setLook({ glass })} />

        {look.glass && (
          <>
          <Choice
            label="Backdrop"
            value={look.backdrop}
            onValueChange={(backdrop) => setLook({ backdrop: backdrop as Backdrop })}
            options={[
              { value: 'studio', label: 'Studio', description: 'Soft gray, warm light.' },
              { value: 'ember', label: 'Ember', description: 'A warm tint.' },
              { value: 'lagoon', label: 'Lagoon', description: 'A cool tint.' },
              ...(BRAND.backdrop ? [{ value: 'image', label: 'Your image', description: 'Set in lib/brand.tsx.' }] : []),
            ]}
          />
          </>
        )}

        <Stack gap={3}>
          <p className="label-strong">Preview</p>
          <div className="preview">
            <Inline gap={3} align="center">
              <Button size="small">Send invoice</Button>
              <Tag label="Plan" tone="brand" size="small">Brand tag</Tag>
              <Switch label="On" hideLabel defaultChecked size="small" />
            </Inline>
            <Progress label="Paid this quarter" value={68} style={{ width: '100%' }} />
          </div>
        </Stack>

        <Stack gap={2}>
          <Inline justify="between">
            <p className="label-strong">In your code</p>
            <Button
              size="small"
              variant="quiet"
              onClick={() => {
                navigator.clipboard?.writeText(snippet)
                setCopied(true)
                setTimeout(() => setCopied(false), 1600)
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </Inline>
          <pre className="code">
            <code>{snippet}</code>
          </pre>
        </Stack>
      </Stack>
    </Card>
  )
}

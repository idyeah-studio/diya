'use client'
import { useId } from 'react'
import { Choice } from '@idyeah/diya'
export function PreviewSetting({ label, options, value, onChange, divided = false }: { label: string; options: string[]; value: string; onChange: (value: string) => void; divided?: boolean }) {
  const name = useId()
  return <fieldset className={`button-control-group${divided ? ' button-kind-control' : ''}`}><legend>{label}</legend><div className="button-mini-switch">{options.map((option) => <label key={option}><input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} /><span>{option}</span></label>)}</div></fieldset>
}
type PreviewOption = { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }
/** On/off playground options as DIYA checkboxes under one caption (`label`, default "Options"). */
export function PreviewOptions({ items, label = 'Options', disabled, className }: { items: PreviewOption[]; label?: string; disabled?: boolean; className?: string }) {
  return (
    <div className={`button-control-group preview-options${className ? ` ${className}` : ''}`}>
      <Choice
        multiple
        size="small"
        label={label}
        disabled={disabled}
        options={items.map((item) => ({ value: item.label, label: item.label, disabled: item.disabled }))}
        value={items.filter((item) => item.checked).map((item) => item.label)}
        onValueChange={(next) => {
          const changed = items.find((item) => next.includes(item.label) !== item.checked)
          changed?.onChange(!changed.checked)
        }}
      />
    </div>
  )
}

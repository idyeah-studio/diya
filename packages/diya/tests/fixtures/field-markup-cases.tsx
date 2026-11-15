// The field states frozen in field-markup-1.1.1.json. The fixture is written once from the
// 1.1.1 build (write-field-markup.mjs) and every later build must reproduce it exactly, ids
// included, on the server and in the client, on React 18 and 19. Don't edit a case: any change
// here changes the ids that follow it and makes the fixture meaningless.
import { createElement, type ReactElement } from 'react'

type Library = Record<string, any>
type Props = Record<string, unknown>
type Step = { name: string; props?: Props; act?: 'open' }
export type FieldCase = { name: string; render: (lib: Library, props: Props) => ReactElement; steps: Step[] }

export const FIXED_DATE = new Date('2026-11-01T12:00:00Z')
const options = [{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }, { value: 'gamma', label: 'Gamma' }]
const icon = createElement('svg', { width: 16, height: 16, 'aria-hidden': true }, createElement('circle', { cx: 8, cy: 8, r: 6 }))
const noop = () => {}

// The steps every field with error and helper text goes through, in order, on one mounted root.
const common: Step[] = [
  { name: 'mount' },
  { name: 'error', props: { error: 'Enter a value.' } },
  { name: 'error-cleared' },
  { name: 'helper', props: { helperText: 'Shown to your team.' } },
  { name: 'disabled', props: { disabled: true } },
  { name: 'hide-label', props: { hideLabel: true } },
  { name: 'size-small', props: { size: 'small' } },
  { name: 'size-medium', props: { size: 'medium' } },
  { name: 'size-large', props: { size: 'large' } },
]

export const fieldCases: FieldCase[] = [
  {
    name: 'TextInput',
    render: ({ TextInput }, props) => createElement(TextInput, { label: 'Project name', value: 'Launch', onValueChange: noop, ...props }),
    steps: [...common, { name: 'leading-icon', props: { leadingIcon: icon } }, { name: 'clearable', props: { clearable: true } }, { name: 'icon-clearable-error', props: { leadingIcon: icon, clearable: true, error: 'Enter a value.' } }],
  },
  {
    name: 'Search',
    render: ({ Search }, props) => createElement(Search, { label: 'Find', value: 'atlas', onValueChange: noop, ...props }),
    steps: [...common, { name: 'leading-icon', props: { leadingIcon: icon } }, { name: 'clearable', props: { clearable: true } }],
  },
  {
    name: 'TextArea',
    render: ({ TextArea }, props) => createElement(TextArea, { label: 'Notes', value: 'Draft', onValueChange: noop, ...props }),
    steps: [...common, { name: 'show-count', props: { showCount: true, maxLength: 200 } }, { name: 'show-count-error', props: { showCount: true, maxLength: 200, error: 'Too long.' } }],
  },
  {
    name: 'Select',
    render: ({ Select }, props) => createElement(Select, { label: 'Team', options, value: 'beta', onValueChange: noop, ...props }),
    steps: [...common, { name: 'leading-icon', props: { leadingIcon: icon } }],
  },
  {
    name: 'Combobox',
    render: ({ Combobox }, props) => createElement(Combobox, { label: 'Owner', options, value: '', onValueChange: noop, ...props }),
    steps: [...common, { name: 'open', act: 'open' }, { name: 'open-error', props: { error: 'Choose an owner.' } }],
  },
  {
    name: 'DatePicker',
    render: ({ DatePicker }, props) => createElement(DatePicker, { label: 'Due date', value: '2026-11-12', onValueChange: noop, ...props }),
    steps: [...common, { name: 'open', act: 'open' }],
  },
  {
    name: 'Switch',
    render: ({ Switch }, props) => createElement(Switch, { label: 'Email alerts', checked: true, onCheckedChange: noop, ...props }),
    steps: common,
  },
  {
    name: 'Choice',
    render: ({ Choice }, props) => createElement(Choice, { label: 'Plan', options, value: 'beta', onValueChange: noop, ...props }),
    steps: common,
  },
  {
    name: 'Choice-multiple',
    render: ({ Choice }, props) => createElement(Choice, { label: 'Teams', multiple: true, options, value: ['beta'], onValueChange: noop, ...props }),
    steps: common,
  },
  {
    name: 'Choice-select-all',
    render: ({ Choice }, props) => createElement(Choice, { label: 'Teams', multiple: true, selectAll: true, options, value: ['beta'], onValueChange: noop, ...props }),
    steps: [...common, { name: 'all-chosen', props: { value: ['alpha', 'beta', 'gamma'] } }, { name: 'none-chosen', props: { value: [] } }],
  },
  {
    name: 'Slider',
    render: ({ Slider }, props) => createElement(Slider, { label: 'Volume', value: 40, onValueChange: noop, ...props }),
    steps: [{ name: 'mount' }, { name: 'disabled', props: { disabled: true } }, { name: 'hide-label', props: { hideLabel: true } }, { name: 'range', props: { range: true, value: [20, 60] } }],
  },
]

/** Each step's props: a step's own props apply to that step only, on top of the base. */
export const stepProps = (step: Step): Props => step.props ?? {}

export type Fixture = Record<string, Record<'server' | 'client', Record<string, string>>>

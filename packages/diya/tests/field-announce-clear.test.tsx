// G10 (QA-S56-01, DS-S56-01): a field's spoken error leaves the live region as soon as the error
// clears or changes, or the field goes, as a toast's words go when it leaves (T7). React 18, as
// the package's react-hook-form test runs.
import { describe, expect, it } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { DiyaProvider, TextInput } from '../dist/index.js'

const polite = () => document.querySelector('.diya-toast-host > [aria-live=polite]')?.textContent ?? ''

function Email() {
  const { register, formState: { errors } } = useForm<{ email: string }>({ mode: 'onBlur' })
  return <><TextInput label="Email" error={errors.email?.message} {...register('email', { pattern: { value: /@/, message: 'Enter a valid email.' } })} /><button type="button">Next</button></>
}

describe("a field's spoken error goes when the error does (G10)", () => {
  it('react-hook-form onBlur: fixed, the words leave at once, and a regex query finds nothing', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider><Email /></DiyaProvider>)
    await user.type(screen.getByLabelText('Email'), 'nope')
    await user.tab()
    await waitFor(() => expect(polite()).toBe('Email: Enter a valid email.'))
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.tab()
    await waitFor(() => expect(screen.queryByText('Enter a valid email.')).toBeNull())
    expect(polite()).toBe('')
    expect(screen.queryAllByText(/valid email/i)).toHaveLength(0)
  })

  it('changed from one error to another: only the new words are there', async () => {
    function Changing() {
      const [error, setError] = useState<string>()
      return <><TextInput label="Code" error={error} /><button type="button" onClick={() => setError('Enter 6 characters.')}>A</button><button type="button" onClick={() => setError('Use letters and digits only.')}>B</button></>
    }
    const user = userEvent.setup()
    render(<DiyaProvider><Changing /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'A' }))
    await waitFor(() => expect(polite()).toBe('Code: Enter 6 characters.'))
    await user.click(screen.getByRole('button', { name: 'B' }))
    await waitFor(() => expect(polite()).toBe('Code: Use letters and digits only.'))
    expect(screen.queryAllByText(/6 characters/)).toHaveLength(0)
  })

  it('a field that goes takes its words with it', async () => {
    function Going() {
      const [shown, setShown] = useState(true)
      const [error, setError] = useState<string>()
      return <>{shown && <TextInput label="Code" error={error} />}<button type="button" onClick={() => setError('Enter 6 characters.')}>Check</button><button type="button" onClick={() => setShown(false)}>Hide</button></>
    }
    const user = userEvent.setup()
    render(<DiyaProvider><Going /></DiyaProvider>)
    await user.click(screen.getByRole('button', { name: 'Check' }))
    await waitFor(() => expect(polite()).toBe('Code: Enter 6 characters.'))
    await user.click(screen.getByRole('button', { name: 'Hide' }))
    await act(async () => {})
    expect(polite()).toBe('')
  })
})

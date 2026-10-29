import { describe, expect, it } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { DiyaProvider, Rating, defaultMessages, type RatingProps } from '../dist/index.js'

const rating = (props: RatingProps) => render(<DiyaProvider><Rating {...props} /></DiyaProvider>)
/** The fill of each star, in order: f(ull), h(alf) or e(mpty). */
const fills = (element: HTMLElement) => [...element.querySelectorAll('svg')].map(star => star.getAttribute('data-fill')![0]).join('')

describe('Rating', () => {
  it('is one image named by its rating, with the stars and text hidden from assistive technology', () => {
    rating({ value: 4.5 })
    const stars = screen.getByRole('img', { name: 'Rated 4.5 out of 5' })
    expect(fills(stars)).toBe('ffffh')
    for (const part of stars.children) expect(part.getAttribute('aria-hidden')).toBe('true')
    expect(stars.textContent).toBe('')
  })

  it('fills stars to the nearest half of the value people read, and names the value to one decimal', () => {
    const cases: [number, string, string][] = [
      [0, 'Rated 0 out of 5', 'eeeee'],
      [2.5, 'Rated 2.5 out of 5', 'ffhee'],
      [4.3, 'Rated 4.3 out of 5', 'ffffh'],
      [4.2, 'Rated 4.2 out of 5', 'ffffe'],
      [4.25, 'Rated 4.3 out of 5', 'ffffh'],
      [4.74, 'Rated 4.7 out of 5', 'ffffh'],
      [4.75, 'Rated 4.8 out of 5', 'fffff'],
      [5, 'Rated 5 out of 5', 'fffff'],
    ]
    for (const [value, name, expected] of cases) {
      const view = rating({ value })
      expect(fills(screen.getByRole('img', { name })), String(value)).toBe(expected)
      view.unmount()
    }
  })

  it('clamps the value to 0–max and treats anything that is not a number as 0', () => {
    const cases: [number, string, string][] = [
      [-2, 'Rated 0 out of 5', 'eeeee'],
      [7, 'Rated 5 out of 5', 'fffff'],
      [Number.NaN, 'Rated 0 out of 5', 'eeeee'],
      [Number.POSITIVE_INFINITY, 'Rated 5 out of 5', 'fffff'],
      ['4.5' as unknown as number, 'Rated 4.5 out of 5', 'ffffh'],
      [undefined as unknown as number, 'Rated 0 out of 5', 'eeeee'],
    ]
    for (const [value, name, expected] of cases) {
      const view = rating({ value })
      expect(fills(screen.getByRole('img', { name })), String(value)).toBe(expected)
      view.unmount()
    }
  })

  it('draws `max` stars, a whole number from 1 to 10', () => {
    const cases: [number, string, number][] = [
      [10, 'Rated 7 out of 10', 10],
      [3.6, 'Rated 4 out of 4', 4],
      [0, 'Rated 1 out of 1', 1],
      [40, 'Rated 7 out of 10', 10],
      [Number.NaN, 'Rated 5 out of 5', 5],
    ]
    for (const [max, name, count] of cases) {
      const view = rating({ value: 7, max })
      expect(screen.getByRole('img', { name }).querySelectorAll('svg'), String(max)).toHaveLength(count)
      view.unmount()
    }
  })

  it('shows the value to one decimal with showValue', () => {
    const view = rating({ value: 4 })
    expect(screen.getByRole('img').querySelector('.diya-rating-value')).toBe(null)
    view.rerender(<DiyaProvider><Rating value={4} showValue /></DiyaProvider>)
    const stars = screen.getByRole('img', { name: 'Rated 4 out of 5' })
    expect(stars.textContent).toBe('4.0')
    view.rerender(<DiyaProvider><Rating value={4.36} showValue /></DiyaProvider>)
    expect(screen.getByRole('img', { name: 'Rated 4.4 out of 5' }).textContent).toBe('4.4')
  })

  it('shows a review count after the stars and adds it to the name', () => {
    const view = rating({ value: 4.3, count: 1284, showValue: true })
    const stars = screen.getByRole('img', { name: 'Rated 4.3 out of 5, 1,284 reviews' })
    expect(stars.textContent).toBe('4.3(1,284)')
    expect(stars.lastElementChild?.textContent).toBe('(1,284)')
    view.rerender(<DiyaProvider><Rating value={5} count={1} /></DiyaProvider>)
    expect(screen.getByRole('img', { name: 'Rated 5 out of 5, 1 review' }).textContent).toBe('(1)')
    view.rerender(<DiyaProvider><Rating value={0} count={0} /></DiyaProvider>)
    expect(screen.getByRole('img', { name: 'Rated 0 out of 5, 0 reviews' }).textContent).toBe('(0)')
    view.rerender(<DiyaProvider><Rating value={3} count={12.7} /></DiyaProvider>)
    expect(screen.getByRole('img', { name: 'Rated 3 out of 5, 12 reviews' })).toBeTruthy()
    view.rerender(<DiyaProvider><Rating value={3} count={Number.NaN} /></DiyaProvider>)
    expect(screen.getByRole('img', { name: 'Rated 3 out of 5' }).textContent).toBe('')
  })

  it('formats numbers with the provider locale and takes its strings from messages', () => {
    expect(defaultMessages.rating.rated('4.3', '5')).toBe('Rated 4.3 out of 5')
    expect(defaultMessages.rating.reviews(2, '2')).toBe('2 reviews')
    expect(defaultMessages.rating.count('128')).toBe('(128)')
    render(<DiyaProvider locale="de-DE" messages={{ rating: {
      rated: (value, max) => `Bewertet mit ${value} von ${max}`,
      reviews: (count, formatted) => `${formatted} ${count === 1 ? 'Bewertung' : 'Bewertungen'}`,
      count: (formatted) => `${formatted} Bewertungen`,
    } }}>
      <Rating value={4.3} count={1284} showValue />
    </DiyaProvider>)
    const stars = screen.getByRole('img', { name: 'Bewertet mit 4,3 von 5, 1.284 Bewertungen' })
    expect(stars.textContent).toBe('4,31.284 Bewertungen')
  })

  it('takes a size, className, style and the root element’s ref and attributes', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<DiyaProvider><Rating ref={ref} value={3} size="large" className="product-rating" style={{ marginTop: 4 }} data-testid="rating" /></DiyaProvider>)
    const stars = screen.getByTestId('rating')
    expect(ref.current).toBe(stars)
    expect(stars.tagName).toBe('SPAN')
    expect(stars.getAttribute('data-size')).toBe('large')
    expect(stars.className).toBe('diya-rating product-rating')
    expect(stars.style.marginTop).toBe('4px')
    expect(stars.getAttribute('role')).toBe('img')
  })

  it('defaults to a medium row of five stars and is not interactive', () => {
    rating({ value: 3 })
    const stars = screen.getByRole('img', { name: 'Rated 3 out of 5' })
    expect(stars.getAttribute('data-size')).toBe('medium')
    expect(stars.querySelectorAll('svg')).toHaveLength(5)
    expect(stars.querySelectorAll('button, input, a, [tabindex]')).toHaveLength(0)
  })
})

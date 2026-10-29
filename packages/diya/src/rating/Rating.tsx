'use client'
import { forwardRef, type HTMLAttributes } from 'react'
import { useDiyaLocale, useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { ratingMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    rating: typeof ratingMessages
  }
}

// A five-point star with softened corners in a 24-unit box, and its left half. A half
// star draws the half over an empty star, so no seam shows down the middle.
const STAR = 'M11.25 2.24Q12 .6 12.75 2.24L15.14 7.4Q15.55 8.31 16.55 8.43L22.2 9.1Q23.98 9.31 22.66 10.53L18.49 14.39Q17.75 15.07 17.95 16.05L19.06 21.63Q19.41 23.4 17.84 22.52L12.87 19.74Q12 19.25 11.13 19.74L6.16 22.52Q4.59 23.4 4.94 21.63L6.05 16.05Q6.25 15.07 5.51 14.39L1.34 10.53Q.02 9.31 1.8 9.1L7.45 8.43Q8.45 8.31 8.86 7.4Z'
const HALF = 'M12 19.5Q11.56 19.5 11.13 19.74L6.16 22.52Q4.59 23.4 4.94 21.63L6.05 16.05Q6.25 15.07 5.51 14.39L1.34 10.53Q.02 9.31 1.8 9.1L7.45 8.43Q8.45 8.31 8.86 7.4L11.25 2.24Q11.62 1.42 12 1.42Z'

export type RatingProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  /** The rating, from 0 to `max`. Values outside that range are clamped, and one that isn't a number shows as 0. The stars fill to the nearest half (4.3 shows four and a half); the number and the accessible name keep one decimal. */
  value: number
  /** How many stars: a whole number from 1 to 10. Defaults to 5. */
  max?: number
  /** How many reviews the rating comes from, shown after the stars as '(128)' and announced as '128 reviews'. Leave it out to show the stars alone. */
  count?: number
  /** Shows the value as a number before the stars, such as '4.3'. Defaults to false. */
  showValue?: boolean
  /** Star and text size. Defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
}

/** A read-only star rating, with an optional number and review count, announced as one phrase such as "Rated 4.3 out of 5, 128 reviews". */
export const Rating = forwardRef<HTMLSpanElement, RatingProps>(function Rating({ value, max = 5, count, showValue = false, size = 'medium', className, ...props }, ref) {
  const t = useDiyaMessages('rating', ratingMessages)
  const locale = useDiyaLocale()
  const stars = Number.isFinite(max) ? Math.min(10, Math.max(1, Math.round(max))) : 5
  const number = Number(value)
  // One decimal is what people read and hear; the stars round that to the nearest half.
  const rated = Math.round((Number.isNaN(number) ? 0 : Math.min(stars, Math.max(0, number))) * 10) / 10
  const filled = Math.round(rated * 2) / 2
  const reviews = typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : undefined
  const whole = new Intl.NumberFormat(locale)
  const spoken = t.rated(new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(rated), whole.format(stars))
  return <span role="img" {...props} ref={ref} className={cx('diya-rating', className)} data-size={size} aria-label={reviews === undefined ? spoken : `${spoken}, ${t.reviews(reviews, whole.format(reviews))}`}>
    {showValue && <span className="diya-rating-value" aria-hidden="true">{new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rated)}</span>}
    <span className="diya-rating-stars" aria-hidden="true">
      {Array.from({ length: stars }, (_, index) => {
        const fill = Math.min(1, Math.max(0, filled - index))
        return <svg key={index} viewBox="0 0 24 24" width="16" height="16" data-fill={fill === 1 ? 'full' : fill ? 'half' : 'empty'}>
          {fill < 1 && <path className="diya-rating-empty" d={STAR} />}
          {fill > 0 && <path d={fill === 1 ? STAR : HALF} />}
        </svg>
      })}
    </span>
    {reviews !== undefined && <span className="diya-rating-count" aria-hidden="true">{t.count(whole.format(reviews))}</span>}
  </span>
})

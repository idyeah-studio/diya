/** rating: English defaults, overridable through DiyaProvider `messages`. */
export const ratingMessages = { rated: (value: string, max: string) => `Rated ${value} out of ${max}`, reviews: (count: number, formatted: string) => `${formatted} ${count === 1 ? 'review' : 'reviews'}`, count: (formatted: string) => `(${formatted})` }

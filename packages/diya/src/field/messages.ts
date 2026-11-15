/** field: English defaults, overridable through DiyaProvider `messages`. */
export const fieldMessages = {
  /** Said once, politely, when an error appears on a field you've just left. */
  errorAnnouncement: (label: string, error: string) => `${label}: ${error}`,
}

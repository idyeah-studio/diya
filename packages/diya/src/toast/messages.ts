/** toast: English defaults, overridable through DiyaProvider `messages`. */
export const toastMessages = {
  label: 'Notifications (F8)',
  dismiss: (title: string) => `Dismiss: ${title}`,
  actionHint: (action: string) => `Press F8 to reach ${action}.`,
}

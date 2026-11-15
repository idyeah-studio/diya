/*
 * The Field page's own control when Framed is off: a plain time input styled
 * as the reader's own (VIS-SITE-02), not DIYA's field box. The preview and
 * Get code use this one stylesheet, so the code gives what the preview shows,
 * including the rule that turns the edge red from the aria-invalid Field sets.
 * The ring is on :focus, not :focus-visible: WebKit never matches :focus-visible
 * on a time input (VIS-SITE2-02), and a field shows its ring on any focus anyway.
 */
export const OWN_INPUT_CLASS = 'time-input'

export const OWN_INPUT_CSS = `
.time-input {
  box-sizing: border-box;
  height: 40px;
  padding: 0 16px;
  border: 1px solid color-mix(in srgb, var(--diya-color-muted) 70%, transparent);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
}
.time-input:focus {
  outline: 2px solid var(--diya-color-focus, var(--diya-color-text));
  outline-offset: 3px;
}
.time-input[aria-invalid='true'] {
  border-color: var(--diya-color-error);
}
`

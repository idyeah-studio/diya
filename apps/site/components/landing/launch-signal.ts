// "Someone watched the countdown reach zero", set just before the page asks
// for the launched landing, and read by the launched page to play the
// lighting once. It lives in sessionStorage, so it survives the full page
// load Next falls back to on a new deployment, a non-200 or a network error.
// Only this tab sees it, and only briefly: later visits, other tabs and
// sleepers get no ceremony.
export const LAUNCH_SIGNAL_KEY = 'diya:launch-watched'
export const LAUNCH_SIGNAL_WINDOW_MS = 30_000

// Only where sessionStorage is unavailable; then a full load loses it.
let memoryAt = 0

export function markLaunchWatched(now = Date.now()) {
  try {
    window.sessionStorage.setItem(LAUNCH_SIGNAL_KEY, String(now))
  } catch {
    memoryAt = now
  }
}

/** True once per watched launch, within the window, until the ceremony finishes. */
export function launchWatched(now = Date.now()) {
  let at = memoryAt
  try {
    at = Number(window.sessionStorage.getItem(LAUNCH_SIGNAL_KEY)) || memoryAt
  } catch {}
  return at > 0 && now >= at && now - at < LAUNCH_SIGNAL_WINDOW_MS
}

export function finishLaunchWatched() {
  memoryAt = 0
  try {
    window.sessionStorage.removeItem(LAUNCH_SIGNAL_KEY)
  } catch {}
}

/** Inline, before first paint on a full page load: veil the page while the
    lighting's code loads, so the launched page doesn't flash first. */
export const LAUNCH_PENDING_SCRIPT = `try{var t=+sessionStorage.getItem(${JSON.stringify(
  LAUNCH_SIGNAL_KEY,
)}),n=Date.now();if(t&&n>=t&&n-t<${LAUNCH_SIGNAL_WINDOW_MS})document.documentElement.dataset.launchMoment='pending'}catch(e){}`

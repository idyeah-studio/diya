// "Someone watched the countdown reach zero", set just before the page asks
// for the launched landing. The launched page once read it to play a one-time
// lighting; that moment has passed and was retired, but the frozen countdown
// still writes the signal, so the writer stays exactly as it was.
export const LAUNCH_SIGNAL_KEY = 'diya:launch-watched'

// Only where sessionStorage is unavailable; then a full load loses it.
let memoryAt = 0

export function markLaunchWatched(now = Date.now()) {
  try {
    window.sessionStorage.setItem(LAUNCH_SIGNAL_KEY, String(now))
  } catch {
    memoryAt = now
  }
}

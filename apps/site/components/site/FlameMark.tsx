/**
 * The DIYA wordmark. Strokes and the A dot follow `currentColor`; the dot
 * inside the D is vermilion in both themes (`--site-dot` in site.css, never
 * an SDK token; the `currentColor` fill is only a fallback). The launch
 * moment (LaunchMoment) alone adds a glow layer over that dot and brings it
 * up once, softly, as the mark lands in the header.
 *
 * <FlameMark className="site-top-mark" />           // named "DIYA"
 * <FlameMark decorative />                            // inside a link that names itself
 * <FlameMark decorative glow />                       // the launch moment only
 */
export function FlameMark({
  className,
  decorative = false,
  glow = false,
}: {
  className?: string
  decorative?: boolean
  glow?: boolean
}) {
  return (
    <svg
      className={['site-mark', className].filter(Boolean).join(' ')}
      viewBox="0 0 510 150"
      fill="none"
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'DIYA' })}
    >
      <g className="site-mark-stroke" stroke="currentColor" strokeWidth="12">
        <path d="M8 10H67C151 10 151 138 67 138H8Z" />
        <path d="M180 10V138" />
        <path d="M224 10L284 80L342 10M284 80V138" />
        <path d="M356 138L429 10L502 138" />
      </g>
      <circle cx="413" cy="110" r="19" fill="currentColor" />
      <circle className="site-mark-dot" cx="88" cy="48" r="19" fill="currentColor" />
      {glow && <circle className="site-mark-glow" cx="88" cy="48" r="19" fill="currentColor" />}
    </svg>
  )
}

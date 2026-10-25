/**
 * iynk's mark: an inked isometric chip on its blue cast shadow (the same drawing as src/app/icon.svg). The ink
 * follows the theme's line colour, so in dark mode the chip keeps its outline instead of losing it in the page.
 */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={className}>
      <path d="M4.5 38 27 51 49.5 38 27 25z" fill="#41538f" />
      <g stroke="var(--line, #231e16)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 36v6.5M20 39.5v6.5M26 43v6.5M38 43v6.5M44 39.5v6.5M50 36v6.5" fill="none" />
        <path d="M9.5 28 32 41v6L9.5 34z" fill="#4e4a18" />
        <path d="M32 41 54.5 28v6L32 47z" fill="#d49c1f" />
        <path d="M9.5 28 32 15 54.5 28 32 41z" fill="#f4b829" />
        {/* Marks on the chip's face sit on its fixed yellow, so they stay dark ink. */}
        <ellipse cx="22" cy="28" rx="3.2" ry="1.9" fill="#d49c1f" stroke="#231e16" strokeWidth="1.8" />
        <path d="M30 22.5l9 5.2M27 26l9 5.2" fill="none" stroke="#231e16" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

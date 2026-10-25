/**
 * First focusable element on every page. It stays off screen until focused and
 * jumps to the element with id `target` (the layout's <main id="main">).
 */
export function SkipLink({ label, target = "main" }: { label: string; target?: string }) {
  return (
    <a
      href={`#${target}`}
      className="fixed start-3 top-3 z-[100] -translate-y-24 rounded-full border-2 border-line bg-surface px-5 py-2.5 font-body text-sm font-semibold text-ink no-underline shadow-ink transition-transform focus-visible:translate-y-0"
    >
      {label}
    </a>
  );
}

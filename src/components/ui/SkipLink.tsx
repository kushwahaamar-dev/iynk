/**
 * First focusable element on every page. It stays off screen until focused and
 * jumps to the element with id `target` (the layout's <main id="main">).
 */
export function SkipLink({ label, target = "main" }: { label: string; target?: string }) {
  return (
    <a
      href={`#${target}`}
      className="motion-move fixed start-4 top-4 z-skip -translate-y-24 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper no-underline focus-visible:translate-y-0"
    >
      {label}
    </a>
  );
}

import { cx } from "@/components/ui";

/** A peer's initial on their colour, ringed in ink; a mustard key marks the keyboard holder. */
export function PeerAvatar({
  name,
  color,
  baton,
  size = "md",
  className,
}: {
  name: string;
  color: string;
  baton?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  return (
    <span
      aria-hidden="true"
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border-2 border-line font-head font-bold text-ink-fixed",
        size === "sm" ? "size-7 text-xs" : "size-9 text-sm",
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initial}
      {baton ? (
        <span className="absolute -right-1.5 -bottom-1.5 inline-flex size-4 items-center justify-center rounded-full border-2 border-line bg-mustard">
          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="1" y="3" width="10" height="6" rx="1" />
            <path d="M3 5h1M5.5 5h1M8 5h1M3.5 7h5" />
          </svg>
        </span>
      ) : null}
    </span>
  );
}

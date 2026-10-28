import { cx } from "@/components/ui";

/** A peer's initial on their colour; a small dot marks the keyboard holder. */
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
        "relative inline-flex shrink-0 items-center justify-center rounded-lg font-semibold text-ink-fixed",
        size === "sm" ? "size-8 text-xs" : "size-10 text-sm",
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initial}
      {baton ? <span className="absolute -right-1 -bottom-1 size-2 rounded-full bg-accent ring-2 ring-paper" /> : null}
    </span>
  );
}

import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icons";

export type CalloutTone = "note" | "tip" | "warn" | "danger" | "success";

const look: Record<CalloutTone, { icon: IconName; bar: string; ink: string }> = {
  note: { icon: "info", bar: "var(--color-cobalt)", ink: "text-info" },
  tip: { icon: "tip", bar: "var(--color-mint)", ink: "text-good" },
  warn: { icon: "warn", bar: "var(--color-mustard)", ink: "text-warn" },
  danger: { icon: "danger", bar: "var(--color-tomato)", ink: "text-bad" },
  success: { icon: "check", bar: "var(--color-mint)", ink: "text-good" },
};

type CalloutProps = {
  tone?: CalloutTone;
  /** "quiet" is one muted line with no box, for notes like "not set up on this deployment". */
  variant?: "box" | "quiet";
  title?: ReactNode;
  children?: ReactNode;
  /** Announce changes (quiz feedback, run results) politely. */
  live?: boolean;
  className?: string;
};

/**
 * An aside: a thin box with a bar in the tone's colour along its start edge and
 * the tone's icon before the text. The icon and the title carry the tone as well
 * as the colour, so it never depends on colour alone.
 */
export function Callout({ tone = "note", variant = "box", title, children, live, className }: CalloutProps) {
  const { icon, bar, ink } = look[tone];
  const role = live ? "status" : "note";

  if (variant === "quiet") {
    return (
      <div role={role} className={cx("flex items-start gap-2 text-sm text-muted", className)}>
        <Icon name={icon} size={18} className="mt-px shrink-0" />
        <div className="min-w-0">
          {title ? <span className="font-semibold text-ink">{title} </span> : null}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      role={role}
      style={{ borderInlineStartColor: bar }}
      className={cx(
        "flex items-start gap-2.5 rounded-ink-sm border-[1.5px] border-s-4 border-(--card-line) bg-surface px-3.5 py-3 shadow-(--card-shadow)",
        className,
      )}
    >
      <Icon name={icon} size={20} className={cx("mt-px shrink-0", ink)} />
      <div className="min-w-0 flex-1">
        {title ? <div className="font-body text-sm font-semibold leading-snug">{title}</div> : null}
        {children ? <div className={cx("text-sm leading-relaxed", title ? "mt-1" : undefined)}>{children}</div> : null}
      </div>
    </div>
  );
}

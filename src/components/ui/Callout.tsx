import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icons";

export type CalloutTone = "note" | "tip" | "warn" | "danger" | "success";

const look: Record<CalloutTone, { icon: IconName; fill: string; ink: string }> = {
  note: { icon: "info", fill: "bg-info-bg", ink: "text-info" },
  tip: { icon: "tip", fill: "bg-good-bg", ink: "text-good" },
  warn: { icon: "warn", fill: "bg-warn-bg", ink: "text-warn" },
  danger: { icon: "danger", fill: "bg-bad-bg", ink: "text-bad" },
  success: { icon: "check", fill: "bg-good-bg", ink: "text-good" },
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
 * An aside: a tinted box with the tone's icon before the text. The icon and the
 * title carry the tone as well as the colour, so it never depends on colour alone.
 */
export function Callout({ tone = "note", variant = "box", title, children, live, className }: CalloutProps) {
  const { icon, fill, ink } = look[tone];
  const role = live ? "status" : "note";

  if (variant === "quiet") {
    return (
      <div role={role} className={cx("flex items-start gap-2 text-sm text-muted", className)}>
        <Icon name={icon} size={16} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          {title ? <span className="font-semibold text-ink">{title} </span> : null}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div role={role} className={cx("flex items-start gap-3 rounded-lg px-3 py-3", fill, className)}>
      <Icon name={icon} size={20} className={cx("mt-0.5 shrink-0", ink)} />
      <div className="min-w-0 flex-1">
        {title ? <div className="text-sm font-semibold">{title}</div> : null}
        {children ? <div className={cx("text-sm", title ? "mt-1" : undefined)}>{children}</div> : null}
      </div>
    </div>
  );
}

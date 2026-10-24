import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icons";

export type CalloutTone = "note" | "tip" | "warn" | "danger" | "success";

const look: Record<CalloutTone, { icon: IconName; band: string }> = {
  note: { icon: "info", band: "bg-cobalt" },
  tip: { icon: "tip", band: "bg-mint" },
  warn: { icon: "warn", band: "bg-mustard" },
  danger: { icon: "danger", band: "bg-tomato" },
  success: { icon: "check", band: "bg-mint" },
};

type CalloutProps = {
  tone?: CalloutTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Announce changes (quiz feedback, run results) politely. */
  live?: boolean;
  className?: string;
};

/**
 * A boxed aside with an icon band. The tone is carried by the icon and the
 * title as well as colour, so it never depends on colour alone.
 */
export function Callout({ tone = "note", title, children, live, className }: CalloutProps) {
  const { icon, band } = look[tone];
  return (
    <div
      role={live ? "status" : "note"}
      className={cx("flex overflow-hidden rounded-ink border-2 border-line bg-surface shadow-ink-sm", className)}
    >
      <div className={cx("flex w-11 shrink-0 justify-center border-e-2 border-line pt-3 text-on-color", band)}>
        <Icon name={icon} size={22} />
      </div>
      <div className="min-w-0 flex-1 p-3 sm:p-4">
        {title ? <div className="font-ui text-sm font-extrabold uppercase tracking-wide">{title}</div> : null}
        {children ? <div className={cx("text-[0.95rem] leading-relaxed", title ? "mt-1" : undefined)}>{children}</div> : null}
      </div>
    </div>
  );
}

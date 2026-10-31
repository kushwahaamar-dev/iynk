import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icons";

export type InlineStatusTone = "info" | "good" | "warn" | "bad";

const look: Record<InlineStatusTone, { icon: IconName; ink: string }> = {
  info: { icon: "info", ink: "text-info" },
  good: { icon: "check-circle", ink: "text-good" },
  warn: { icon: "warn", ink: "text-warn" },
  bad: { icon: "warn-circle", ink: "text-bad" },
};

type InlineStatusProps = {
  tone?: InlineStatusTone;
  children: ReactNode;
  /** Announce the line when it appears: a quiet confirmation, or a failure for tone "bad". */
  live?: boolean;
  className?: string;
};

/** One line of status under a control: "Saved to blink.iynk", "Upload failed." */
export function InlineStatus({ tone = "info", children, live, className }: InlineStatusProps) {
  const { icon, ink } = look[tone];
  const role = live ? (tone === "bad" ? "alert" : "status") : undefined;
  return (
    <p role={role} className={cx("flex items-center gap-2 text-sm", className)}>
      <Icon name={icon} size={16} className={cx("shrink-0", ink)} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icons";

type EmptyStateProps = {
  icon?: IconName;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  /** A dashed box, for an empty list inside a panel. */
  bordered?: boolean;
  className?: string;
};

/** What a list or panel shows when it has nothing yet: say so, and offer the next step. */
export function EmptyState({ icon = "empty", title, children, action, bordered, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-center gap-2 px-4 py-12 text-center",
        bordered && "rounded-xl border border-dashed border-rule",
        className,
      )}
    >
      <Icon name={icon} size={32} className="text-muted" />
      <p className="text-lg font-semibold text-balance">{title}</p>
      {children ? <div className="max-w-prose text-base text-pretty text-muted">{children}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

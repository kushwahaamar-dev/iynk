import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";

/** A quiet disclosure for the rows of a panel: a small chevron and label that open the detail under them. */
export function Fold({ summary, open, className, children }: { summary: ReactNode; open?: boolean; className?: string; children: ReactNode }) {
  return (
    <details className={cx("group/fold", className)} open={open || undefined}>
      <summary className="-ms-1 inline-flex min-h-8 cursor-pointer [@media(pointer:coarse)]:min-h-11 list-none items-center gap-1 rounded-md px-1 text-xs font-semibold text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <Icon name="chevron-right" size={16} className="motion-move shrink-0 group-open/fold:rotate-90" />
        {summary}
      </summary>
      {children}
    </details>
  );
}

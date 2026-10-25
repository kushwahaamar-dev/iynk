"use client";

import { ProgressBadge } from "@/components/ui/ProgressBadge";
import { progressKey, progressPrefix, useCount, useDone } from "@/lib/progress";

type Labels = { lessons: string; count: string; value: string; assembly: string; assemblyDone: string };

/**
 * A board's lesson progress as "done/total" (the original's "0/16"), with the assembly state under it.
 * The bar appears once something is done; before that the count is one quiet line.
 */
export function BoardProgress({ board, total, hasAssembly, labels, size = "md" }: { board: string; total: number; hasAssembly: boolean; labels: Labels; size?: "sm" | "md" }) {
  const { done } = useCount(progressPrefix.boardLessons(board), total);
  const assembled = useDone(progressKey.boardAssembly(board));
  const fill = (s: string) => s.replace("{done}", String(done)).replace("{total}", String(total));
  return (
    <div className="flex flex-col gap-1" data-testid={`progress-${board}`}>
      {done > 0 ? (
        <ProgressBadge done={done} total={total} label={labels.lessons} countText={fill(labels.count)} valueText={fill(labels.value)} size={size} />
      ) : (
        <span className="text-sm text-muted">
          {labels.lessons} <span className="tabular font-ui">{fill(labels.count)}</span>
        </span>
      )}
      {hasAssembly && (
        <span className={assembled ? "text-sm font-semibold text-good" : "text-sm text-muted"} data-assembled={assembled ? 1 : 0}>
          {assembled ? `✓ ${labels.assemblyDone}` : labels.assembly}
        </span>
      )}
    </div>
  );
}

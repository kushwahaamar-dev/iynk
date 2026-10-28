"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import type { Check } from "@/content/schema";
import type { BoardLabStore } from "@/lib/boardlab/store";
import { useText } from "./text";
import { useLab } from "./useLab";

/** "n/N" for the Checks tab once a check run has a result, else null. */
export function useChecksBadge(store: BoardLabStore, total: number): string | null {
  const result = useLab(store, (s) => s.checks);
  if (total === 0 || result.results.length === 0) return null;
  return `${result.results.filter((r) => r.ok).length}/${total}`;
}

/**
 * The lesson's completion checks, ticked off from the deterministic run. The checks read the code; a lesson passes
 * on a working board, so while a Break it fault is on (a burnt LED blinks no more) passing code doesn't finish it.
 */
export function ChecksPanel({ store, checks, onCheck, done }: { store: BoardLabStore; checks: Check[]; onCheck: () => void; done: boolean }) {
  const { t, tc } = useText();
  const id = useId();
  const result = useLab(store, (s) => s.checks);
  const faultOn = useLab(store, (s) => s.fault !== null);
  if (checks.length === 0) return null;
  const passedCount = result.results.filter((r) => r.ok).length;
  const hasResult = result.results.length > 0 || result.status === "done";
  const passed = result.passed && !faultOn;

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3" data-testid="checks-panel">
      <h3 id={`${id}-title`} className="sr-only">
        {t("checks.title")}
      </h3>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p role="status" className={cx("me-auto text-sm font-semibold", passed ? "text-good" : result.passed ? "text-bad" : done ? "text-good" : "text-muted")}>
          {passed
            ? t("checks.allPass")
            : result.passed
              ? t("checks.faultOn")
              : result.status === "done"
                ? result.limit
                  ? t("checks.limit")
                  : t("checks.summary", { passed: passedCount, total: checks.length })
                : result.status === "running"
                  ? t("checks.running")
                  : done
                    ? t("lesson.completed")
                    : t("checks.pending")}
        </p>
        <Button size="sm" variant="secondary" className="shrink-0 whitespace-nowrap" onClick={onCheck} disabled={result.status === "running"}>
          {hasResult ? t("checks.again") : t("checks.run")}
        </Button>
      </div>
      {!hasResult && <p className="text-sm text-muted">{t("checks.lede")}</p>}
      {result.status === "running" && (
        <progress className="h-2 w-full accent-accent" max={1} value={result.progress ?? 0} aria-label={t("checks.running")} />
      )}
      <ol className="divide-y divide-rule">
        {checks.map((c, i) => {
          const r = result.results[i];
          const state = result.status === "running" ? "running" : r ? (r.ok ? "pass" : "fail") : "pending";
          return (
            <li key={i} className="flex items-start gap-3 py-3 text-sm" data-check={state}>
              {state === "pass" ? (
                <Icon name="check" size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-good" />
              ) : state === "fail" ? (
                <Icon name="close" size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-bad" />
              ) : (
                <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 rounded-full border border-rule" />
              )}
              <span className={cx("min-w-0 flex-1", state === "fail" && "text-bad")}>
                {tc(c.label)}
                <span className="sr-only"> · {t(`checks.${state}`)}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

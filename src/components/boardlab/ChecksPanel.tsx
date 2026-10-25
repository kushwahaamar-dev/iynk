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

/** The lesson's completion checks, ticked off from the deterministic run. */
export function ChecksPanel({ store, checks, onCheck, done }: { store: BoardLabStore; checks: Check[]; onCheck: () => void; done: boolean }) {
  const { t, tc } = useText();
  const id = useId();
  const result = useLab(store, (s) => s.checks);
  if (checks.length === 0) return null;
  const passedCount = result.results.filter((r) => r.ok).length;
  const hasResult = result.results.length > 0 || result.status === "done";

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3" data-testid="checks-panel">
      <h3 id={`${id}-title`} className="sr-only">
        {t("checks.title")}
      </h3>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p role="status" className={cx("me-auto text-sm font-semibold", result.passed || done ? "text-good" : "text-muted")}>
          {result.passed
            ? t("checks.allPass")
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
        <progress className="h-2 w-full accent-[var(--color-mustard-m)]" max={1} value={result.progress ?? 0} aria-label={t("checks.running")} />
      )}
      <ol className="divide-y-[1.5px] divide-rule">
        {checks.map((c, i) => {
          const r = result.results[i];
          const state = result.status === "running" ? "running" : r ? (r.ok ? "pass" : "fail") : "pending";
          return (
            <li key={i} className="flex items-start gap-3 py-2.5 text-sm" data-check={state}>
              <span
                aria-hidden="true"
                className={cx(
                  "inline-flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-bold",
                  state === "pass" ? "border-good bg-good text-paper" : state === "fail" ? "border-bad text-bad" : "border-rule text-muted",
                )}
              >
                {state === "pass" ? <Icon name="check" size={12} /> : state === "fail" ? "×" : null}
              </span>
              <span className="min-w-0 flex-1">
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

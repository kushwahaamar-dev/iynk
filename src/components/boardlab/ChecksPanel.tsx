"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import type { Check } from "@/content/schema";
import type { BoardLabStore } from "@/lib/boardlab/store";
import { useText } from "./text";
import { useLab } from "./useLab";

/** The lesson's completion checks, ticked off from the deterministic run. */
export function ChecksPanel({ store, checks, onCheck, done }: { store: BoardLabStore; checks: Check[]; onCheck: () => void; done: boolean }) {
  const { t, tc } = useText();
  const id = useId();
  const result = useLab(store, (s) => s.checks);
  if (checks.length === 0) return null;
  const passedCount = result.results.filter((r) => r.ok).length;

  return (
    <section aria-labelledby={`${id}-title`} className="ink-card p-3 sm:p-4" data-testid="checks-panel">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`${id}-title`} className="me-auto text-lg">
          {t("checks.title")}
        </h3>
        <Button size="sm" variant="secondary" onClick={onCheck} disabled={result.status === "running"}>
          {t("checks.again")}
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted">{t("checks.lede")}</p>
      <ol className="mt-3 flex flex-col gap-2">
        {checks.map((c, i) => {
          const r = result.results[i];
          const state = result.status === "running" ? "running" : r ? (r.ok ? "pass" : "fail") : "pending";
          return (
            <li key={i} className="flex items-start gap-2" data-check={state}>
              <span
                aria-hidden="true"
                className={cx(
                  "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                  state === "pass" ? "border-good bg-good text-paper" : state === "fail" ? "border-bad text-bad" : "border-line text-muted",
                )}
              >
                {state === "pass" ? <Icon name="check" size={14} /> : state === "fail" ? "×" : "·"}
              </span>
              <span className="flex-1">
                {tc(c.label)}
                <span className="sr-only"> · {t(`checks.${state}`)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p role="status" className={cx("mt-3 text-sm font-semibold", result.passed || done ? "text-good" : "text-muted")}>
        {result.passed ? t("checks.allPass") : result.status === "done" ? t("checks.summary", { passed: passedCount, total: checks.length }) : result.status === "running" ? t("checks.running") : done ? t("lesson.completed") : t("checks.pending")}
      </p>
    </section>
  );
}

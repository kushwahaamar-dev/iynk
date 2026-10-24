"use client";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { FailureMode, RoboticsContent } from "@/content/schema";
import type { BenchAction } from "@/lib/robotics/store";
import type { BenchT, TextOf } from "./messages";

type Props = {
  bench: RoboticsContent;
  active: readonly FailureMode[];
  t: BenchT;
  tx: TextOf;
  dispatch: (action: BenchAction) => void;
  headingId: string;
};

export function FaultsPanel({ bench, active, t, tx, dispatch, headingId }: Props) {
  if (bench.faults.length === 0) return null;
  const activeIds = new Set(active.map((fault) => fault.id));

  return (
    <section aria-labelledby={headingId} className="ink-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-xl">
          {t("faults.heading")}
        </h2>
        <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "fault/clear" })} disabled={active.length === 0}>
          {t("faults.clear")}
        </Button>
      </div>
      <p className="mt-2 text-sm">{t("faults.intro")}</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {bench.faults.map((fault) => {
          const title = tx(fault.title);
          const on = activeIds.has(fault.id);
          return (
            <li key={fault.id} data-fault={fault.id} className="rounded-ink border-2 border-line bg-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 flex-1 text-base">{title}</h3>
                <Chip tone={on ? "tomato" : "plain"}>{on ? t("faults.active") : t(`faults.kinds.${fault.kind}`)}</Chip>
              </div>
              <p className="mt-2 text-sm">
                <strong>{t("faults.symptom")}: </strong>
                {tx(fault.symptom)}
              </p>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-ui text-xs font-bold">{t("faults.why")}</summary>
                <p className="mt-1">{tx(fault.explanation)}</p>
                <p className="mt-1">
                  <strong>{t("faults.fix")}: </strong>
                  {tx(fault.fix)}
                </p>
              </details>
              <Button size="sm" variant="danger" className="mt-3" onClick={() => dispatch({ type: "fault/trigger", fault: fault.id })}>
                {t("faults.trigger")}
                <span className="sr-only">: {title}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

"use client";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import type { FailureMode, RoboticsContent } from "@/content/schema";
import type { BenchAction } from "@/lib/robotics/store";
import { Fold } from "./Fold";
import type { BenchT, TextOf } from "./messages";

type Props = {
  bench: RoboticsContent;
  active: readonly FailureMode[];
  t: BenchT;
  tx: TextOf;
  dispatch: (action: BenchAction) => void;
  headingId: string;
};

/** Every fault as one row: its kind, its title and Trigger; the active one is marked and turns into Repair. */
export function FaultsPanel({ bench, active, t, tx, dispatch, headingId }: Props) {
  if (bench.faults.length === 0) return null;
  const activeIds = new Set(active.map((fault) => fault.id));

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id={headingId} className="font-head text-lg">
          {t("faults.heading")}
        </h2>
        <Button size="sm" variant="ghost" className="-me-2" onClick={() => dispatch({ type: "fault/clear" })} disabled={active.length === 0}>
          {t("faults.clear")}
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted">{t("faults.intro")}</p>
      <ul className="mt-3 flex flex-col divide-y divide-rule border-t-[1.5px] border-rule">
        {bench.faults.map((fault) => {
          const title = tx(fault.title);
          const on = activeIds.has(fault.id);
          return (
            <li
              key={fault.id}
              data-fault={fault.id}
              className={cx(
                "relative -mx-4 px-4 py-3",
                on && "bg-bad-bg on-fill before:absolute before:inset-y-0 before:start-0 before:w-1 before:bg-tomato",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-body text-sm font-semibold leading-snug">{title}</h3>
                  <div className="mt-1.5">
                    <Chip tone={on ? "ink" : "plain"}>{on ? t("faults.active") : t(`faults.kinds.${fault.kind}`)}</Chip>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={on ? "danger" : "secondary"}
                  className="shrink-0 whitespace-nowrap"
                  aria-label={`${on ? t("faults.repair") : t("faults.trigger")}: ${title}`}
                  onClick={() => dispatch(on ? { type: "fault/clear" } : { type: "fault/trigger", fault: fault.id })}
                >
                  {on ? t("faults.repair") : t("faults.trigger")}
                </Button>
              </div>
              <Fold summary={t("faults.why")} open={on} className="mt-1.5 text-sm">
                <div className="mt-1 flex flex-col gap-1.5 leading-relaxed">
                  <p>
                    <strong>{t("faults.symptom")}: </strong>
                    {tx(fault.symptom)}
                  </p>
                  <p>{tx(fault.explanation)}</p>
                  <p>
                    <strong>{t("faults.fix")}: </strong>
                    {tx(fault.fix)}
                  </p>
                </div>
              </Fold>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

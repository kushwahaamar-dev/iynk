"use client";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import { legacyRecord } from "@/content/faults/legacy-map";
import type { FailureMode, RoboticsContent } from "@/content/schema";
import { appEventLog } from "@/local/events";
import type { BenchAction } from "@/lib/robotics/session";
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
        <h2 id={headingId} className="text-lg">
          {t("faults.heading")}
        </h2>
        <Button size="sm" variant="ghost" className="-me-2" onClick={() => dispatch({ type: "fault/clear" })} disabled={active.length === 0}>
          {t("faults.clear")}
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted">{t("faults.intro")}</p>
      <ul className="mt-3 flex flex-col divide-y divide-rule border-t border-rule">
        {bench.faults.map((fault) => {
          const title = tx(fault.title);
          const on = activeIds.has(fault.id);
          return (
            <li
              key={fault.id}
              data-fault={fault.id}
              className={cx(
                "-mx-4 px-4 py-3",
                on && "rounded-lg bg-bad-bg",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-start gap-2 text-sm font-semibold leading-snug">
                    {on ? <Icon name="warn" size={16} className="mt-0.5 shrink-0 text-bad" /> : null}
                    {title}
                  </h3>
                  <div className="mt-2">
                    <Chip tone={on ? "bad" : "neutral"}>{on ? t("faults.active") : t(`faults.kinds.${fault.kind}`)}</Chip>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={on ? "danger" : "secondary"}
                  className="shrink-0 whitespace-nowrap"
                  aria-label={`${on ? t("faults.repair") : t("faults.trigger")}: ${title}`}
                  onClick={() => {
                    dispatch(on ? { type: "fault/clear" } : { type: "fault/trigger", fault: fault.id });
                    if (on) void appEventLog().append("diagnosis.record", legacyRecord(bench.id, fault));
                  }}
                >
                  {on ? t("faults.repair") : t("faults.trigger")}
                </Button>
              </div>
              <Fold summary={t("faults.why")} open={on} className="mt-2 text-sm">
                <div className="mt-1 flex flex-col gap-2 leading-relaxed">
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

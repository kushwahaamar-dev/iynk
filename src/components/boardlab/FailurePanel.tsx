"use client";

import { useId } from "react";
import type { FigureHandle } from "@/components/figure/protocol";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { cx } from "@/components/ui/cx";
import type { FailureMode } from "@/content/schema";
import type { BoardLabStore } from "@/lib/boardlab/store";
import { sendCommand } from "./AssemblyPanel";
import { useText } from "./text";
import { useLab } from "./useLab";

type FigureFault = { id?: string; msg?: string; fix?: string } | null | undefined;

/** "Break it": every failure the board has, triggered for real in the figure, with why and how to fix it. */
export function FailurePanel({ store, failures, figure }: { store: BoardLabStore; failures: FailureMode[]; figure: () => FigureHandle | null }) {
  const { t, tc } = useText();
  const id = useId();
  const active = useLab(store, (s) => s.fault);
  const reported = useLab(store, (s) => s.figure.fault) as FigureFault;
  if (failures.length === 0) return null;

  const trigger = (f: FailureMode) => {
    store.dispatch({ type: "fault/trigger", id: f.id });
    // A `set` fault reaches the figure through the store's figure state; presses and acts are one-shot.
    if (f.figure.type !== "set") sendCommand(figure(), f.figure);
  };

  return (
    <section aria-labelledby={`${id}-title`} className="ink-card p-3 sm:p-4" data-testid="failure-panel">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`${id}-title`} className="me-auto text-lg">
          {t("failures.title")}
        </h3>
        {active && (
          <Button size="sm" variant="secondary" onClick={() => store.dispatch({ type: "fault/clear" })}>
            {t("failures.clear")}
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{t("failures.lede")}</p>
      {reported?.msg && (
        <Callout tone="danger" title={t("failures.figureFault", { msg: reported.msg })} live className="mt-3">
          {reported.fix ? <p>{reported.fix}</p> : null}
        </Callout>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {failures.map((f) => {
          const on = active === f.id;
          return (
            <li key={f.id} className={cx("rounded-md border-2 p-3", on ? "border-bad bg-bad-bg" : "border-line")} data-failure={f.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t(`failures.kind.${f.kind}`)}</span>
                <span className="me-auto font-semibold">{tc(f.title)}</span>
                {on ? (
                  <span className="text-sm font-semibold text-bad">{t("failures.active")}</span>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => trigger(f)}>
                    {t("failures.trigger")}
                  </Button>
                )}
              </div>
              {on && (
                <dl className="mt-2 grid gap-2 text-sm">
                  <div>
                    <dt className="font-semibold">{t("failures.symptom")}</dt>
                    <dd>{tc(f.symptom)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">{t("failures.why")}</dt>
                    <dd>{tc(f.explanation)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">{t("failures.fix")}</dt>
                    <dd>{tc(f.fix)}</dd>
                  </div>
                </dl>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

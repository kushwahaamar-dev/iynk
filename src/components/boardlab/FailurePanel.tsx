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

/** The circuit a fault builds in the figure, if it is one of a lesson's circuit faults. */
function faultCircuit(f: FailureMode): string | null {
  const state = f.figure.type === "set" ? (f.figure.state as Record<string, unknown>) : null;
  return typeof state?.circuit === "string" ? state.circuit : null;
}

function FaultRow({ f, on, onTrigger, onRepair }: { f: FailureMode; on: boolean; onTrigger: () => void; onRepair: () => void }) {
  const { t, tc } = useText();
  return (
    <li className={cx("relative py-3", on && "-mx-3 rounded-lg bg-hover px-3")} data-failure={f.id}>
      {on && <span aria-hidden="true" className="absolute start-1 top-7 size-1 rounded-full bg-accent" />}
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-snug">{tc(f.title)}</span>
          <span className="block text-xs text-muted">{on ? <strong className="font-semibold text-ink">{t("failures.active")}</strong> : t(`failures.kind.${f.kind}`)}</span>
        </span>
        {on ? (
          <Button size="sm" variant="danger" className="shrink-0 whitespace-nowrap" onClick={onRepair}>
            {t("failures.clear")}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="shrink-0 whitespace-nowrap" onClick={onTrigger}>
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
}

/**
 * "Break it": every failure the board has, triggered for real in the figure, with why and how to fix it.
 * On a lesson the faults of its own circuit come first.
 */
export function FailurePanel({ store, failures, figure, circuit = null }: { store: BoardLabStore; failures: FailureMode[]; figure: () => FigureHandle | null; circuit?: string | null }) {
  const { t } = useText();
  const id = useId();
  const active = useLab(store, (s) => s.fault);
  const reported = useLab(store, (s) => s.figure.fault) as FigureFault;
  if (failures.length === 0) return null;

  const trigger = (f: FailureMode) => {
    store.dispatch({ type: "fault/trigger", id: f.id });
    // A `set` fault reaches the figure through the store's figure state; presses and acts are one-shot.
    if (f.figure.type !== "set") sendCommand(figure(), f.figure);
  };
  const repair = () => store.dispatch({ type: "fault/clear" });
  const mine = circuit ? failures.filter((f) => faultCircuit(f) === circuit) : [];
  const rest = failures.filter((f) => !mine.includes(f));
  const rows = (list: FailureMode[]) => list.map((f) => <FaultRow key={f.id} f={f} on={active === f.id} onTrigger={() => trigger(f)} onRepair={repair} />);

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-2" data-testid="failure-panel">
      <h3 id={`${id}-title`} className="sr-only">
        {t("failures.title")}
      </h3>
      <p className="text-sm text-muted">{t("failures.lede")}</p>
      {reported?.msg && (
        <Callout tone="danger" variant="quiet" title={t("failures.figureFault", { msg: reported.msg })} live>
          {reported.fix ?? null}
        </Callout>
      )}
      <ul className="divide-y divide-rule">{rows(mine.length ? mine : rest)}</ul>
      {mine.length > 0 && rest.length > 0 && (
        <>
          <p className="kicker mt-3">{t("failures.more")}</p>
          <ul className="divide-y divide-rule">{rows(rest)}</ul>
        </>
      )}
    </section>
  );
}

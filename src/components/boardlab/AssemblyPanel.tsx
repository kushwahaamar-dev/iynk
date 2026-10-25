"use client";

import { useEffect, useId, useState } from "react";
import type { FigureHandle } from "@/components/figure/protocol";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import type { BridgeCommand, BuildStep } from "@/content/schema";
import { stateMatches } from "@/lib/interp";
import type { BoardLabStore } from "@/lib/boardlab/store";
import { markDone, progressKey } from "@/lib/progress";
import { useText } from "./text";
import { useLab } from "./useLab";

/** Act data the bridge carries: plain strings and numbers only. */
function actData(data: Record<string, unknown> | undefined): Record<string, string | number> | undefined {
  if (!data) return undefined;
  return Object.fromEntries(Object.entries(data).filter((e): e is [string, string | number] => typeof e[1] === "string" || typeof e[1] === "number"));
}

/** Send a content BridgeCommand (assembly step, failure trigger) through FigureFrame. */
export function sendCommand(figure: FigureHandle | null, cmd: BridgeCommand): void {
  if (!figure) return;
  if (cmd.type === "press") figure.send("press", { id: cmd.id, choice: cmd.choice });
  else if (cmd.type === "act") figure.send("act", { name: cmd.name, data: actData(cmd.data) });
  else figure.send("set", { state: cmd.state });
}

/**
 * The assembly and power-up sequence in the bench's order. A step is done once
 * the figure reports its condition while it is the current step; doing a later
 * step first shows the original's refusal instead.
 */
export function AssemblyPanel({ store, board, steps, figure }: { store: BoardLabStore; board: string; steps: BuildStep[]; figure: () => FigureHandle | null }) {
  const { t, tc, has } = useText();
  const id = useId();
  const done = useLab(store, (s) => s.assembly);
  const figState = useLab(store, (s) => s.figure);
  const [refusal, setRefusal] = useState<string | null>(null);
  const current = steps.find((s) => !done.includes(s.id)) ?? null;

  // Advance through every consecutive step whose condition now holds.
  useEffect(() => {
    for (const step of steps) {
      if (done.includes(step.id)) continue;
      if (Object.keys(step.done).length && stateMatches(figState, step.done)) store.dispatch({ type: "assembly/done", id: step.id });
      break;
    }
  }, [figState, done, steps, store]);

  useEffect(() => {
    if (steps.length > 0 && steps.every((s) => done.includes(s.id))) markDone(progressKey.boardAssembly(board));
  }, [done, steps, board]);

  if (steps.length === 0) return null;

  const doStep = (step: BuildStep) => {
    if (current && step.id !== current.id) {
      setRefusal(has(step.refusal) ? tc(step.refusal) : t("assembly.refused"));
      return;
    }
    setRefusal(null);
    if (step.action) sendCommand(figure(), step.action);
  };

  const complete = steps.every((s) => done.includes(s.id));

  return (
    <section aria-labelledby={`${id}-title`} className="ink-card p-3 sm:p-4" data-testid="assembly-panel">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`${id}-title`} className="me-auto text-xl">
          {t("assembly.title")}
        </h2>
        <span className="font-mono text-sm font-bold tabular">{t("assembly.progress", { done: done.length, total: steps.length })}</span>
        {done.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => store.dispatch({ type: "assembly/reset" })}>
            {t("assembly.reset")}
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{t("assembly.lede")}</p>
      {refusal && (
        <Callout tone="warn" title={t("assembly.refused")} live className="mt-3">
          <p>{refusal}</p>
        </Callout>
      )}
      <ol className="mt-3 flex flex-col gap-2">
        {steps.map((step, i) => {
          const isDone = done.includes(step.id);
          const isCurrent = current?.id === step.id;
          return (
            <li
              key={step.id}
              className={cx("rounded-md border-2 p-3", isCurrent ? "border-ink" : "border-line", isDone && "on-fill bg-good-bg")}
              aria-current={isCurrent ? "step" : undefined}
              data-step={step.id}
              data-done={isDone ? 1 : 0}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span aria-hidden="true" className={cx("inline-flex size-7 items-center justify-center rounded-full border-2 text-sm font-bold", isDone ? "border-good bg-good text-paper" : "border-line")}>
                  {isDone ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t(`assembly.${step.kind}`)}</span>
                <span className="me-auto font-semibold">{tc(step.title)}</span>
                {isDone ? (
                  <span className="text-sm font-semibold">{t("assembly.doneStep")}</span>
                ) : step.action ? (
                  <Button size="sm" variant={isCurrent ? "primary" : "secondary"} onClick={() => doStep(step)}>
                    {t("assembly.doIt")}
                  </Button>
                ) : (
                  <span className="text-sm text-muted">{t("assembly.byHand")}</span>
                )}
              </div>
              {(isCurrent || isDone) && <p className="mt-2 text-sm">{tc(step.body)}</p>}
            </li>
          );
        })}
      </ol>
      {complete && (
        <p role="status" className="mt-3 font-semibold text-good">
          {t("assembly.complete")}
        </p>
      )}
    </section>
  );
}

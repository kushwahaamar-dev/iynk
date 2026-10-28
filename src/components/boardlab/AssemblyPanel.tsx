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
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-2" data-testid="assembly-panel">
      <h3 id={`${id}-title`} className="sr-only">
        {t("assembly.title")}
      </h3>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="me-auto text-sm text-muted">{t("assembly.lede")}</p>
        <span className="tabular shrink-0 text-xs font-semibold">{t("assembly.progress", { done: done.length, total: steps.length })}</span>
        {done.length > 0 && (
          <Button size="sm" variant="ghost" className="shrink-0" onClick={() => store.dispatch({ type: "assembly/reset" })}>
            {t("assembly.reset")}
          </Button>
        )}
      </div>
      {refusal && (
        <Callout tone="warn" title={t("assembly.refused")} live>
          <p>{refusal}</p>
        </Callout>
      )}
      {complete && (
        <p role="status" className="text-sm font-semibold text-good">
          {t("assembly.complete")}
        </p>
      )}
      <ol className="divide-y divide-rule">
        {steps.map((step, i) => {
          const isDone = done.includes(step.id);
          const isCurrent = current?.id === step.id;
          return (
            <li
              key={step.id}
              className={cx("relative py-3", isCurrent && "-mx-3 rounded-lg bg-hover px-3")}
              aria-current={isCurrent ? "step" : undefined}
              data-step={step.id}
              data-done={isDone ? 1 : 0}
            >
              {isCurrent && <span aria-hidden="true" className="absolute start-1 top-[22px] size-1 rounded-full bg-accent" />}
              <div className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className={cx(
                    "tabular inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    isDone ? "border-good bg-good text-paper" : isCurrent ? "border-ink" : "border-rule text-muted",
                  )}
                >
                  {isDone ? <Icon name="check" size={16} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx("block text-sm leading-snug", isDone ? "text-muted" : "font-semibold")}>{tc(step.title)}</span>
                  <span className="block text-xs text-muted">{t(`assembly.${step.kind}`)}</span>
                </span>
                {isDone ? (
                  <span className="shrink-0 text-xs font-semibold text-good">{t("assembly.doneStep")}</span>
                ) : step.action ? (
                  <Button size="sm" variant={isCurrent ? "primary" : "secondary"} className="shrink-0 whitespace-nowrap" onClick={() => doStep(step)}>
                    {t("assembly.doIt")}
                  </Button>
                ) : (
                  <span className="max-w-[9rem] shrink-0 text-end text-xs text-muted">{t("assembly.byHand")}</span>
                )}
              </div>
              {isCurrent && <p className="mt-2 ps-10 text-sm">{tc(step.body)}</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

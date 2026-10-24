"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import type { RoboticsContent } from "@/content/schema";
import type { BenchAction } from "@/lib/robotics/store";
import { canStart, currentStepIndex, type StepsSession } from "@/lib/robotics/steps";
import type { BenchT, TextOf } from "./messages";

type Props = {
  bench: RoboticsContent;
  session: StepsSession;
  savedDone: (stepId: string) => boolean;
  t: BenchT;
  tx: TextOf;
  dispatch: (action: BenchAction) => void;
  onFocusFigure: () => void;
  headingId: string;
};

const KIND_TONE = { build: "cobalt", break: "tomato", test: "mint" } as const;

export function StepsPanel({ bench, session, savedDone, t, tx, dispatch, onFocusFigure, headingId }: Props) {
  const current = currentStepIndex(bench.steps, session);
  const listRef = useRef<HTMLOListElement>(null);

  // On wide screens the list scrolls inside the panel: keep the step to do next in view.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.children[current] as HTMLElement | undefined;
    if (!list || !item || list.scrollHeight <= list.clientHeight) return;
    list.scrollTop = Math.max(0, item.offsetTop - list.offsetTop - 8);
  }, [current]);
  const doneCount = bench.steps.filter((step) => session[step.id]?.done || savedDone(step.id)).length;

  return (
    <section aria-labelledby={headingId} className="ink-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-xl">
          {t("steps.heading")}
        </h2>
        <span className="tabular font-ui text-sm font-bold">{t("steps.count", { done: doneCount, total: bench.steps.length })}</span>
      </div>
      <ol ref={listRef} className="mt-4 flex flex-col gap-3 lg:max-h-[36rem] lg:overflow-y-auto lg:p-1">
        {bench.steps.map((step, index) => {
          const progress = session[step.id];
          const doneNow = progress?.done === true;
          const doneBefore = !doneNow && savedDone(step.id);
          const isCurrent = index === current;
          const fault = step.fault ? bench.faults.find((f) => f.id === step.fault) : undefined;
          const title = tx(step.title);
          return (
            <li
              key={step.id}
              data-step={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className={cx(
                "rounded-ink border-2 p-3",
                isCurrent ? "border-line bg-surface shadow-ink" : "border-rule",
                doneNow && "border-rule bg-good-bg",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="tabular font-ui text-sm font-extrabold">{index + 1}.</span>
                <Chip tone={KIND_TONE[step.kind]}>{t(`steps.kinds.${step.kind}`)}</Chip>
                <h3 className="min-w-0 flex-1 text-base">{title}</h3>
                {doneNow || doneBefore ? (
                  <span className="inline-flex items-center gap-1 font-ui text-xs font-bold text-good">
                    <Icon name="check" size={16} aria-hidden="true" />
                    {t("steps.done")}
                  </span>
                ) : isCurrent ? (
                  <span className="font-ui text-xs font-bold">{t("steps.current")}</span>
                ) : null}
              </div>
              {isCurrent || !doneNow ? <p className="mt-2 text-sm leading-relaxed">{tx(step.body)}</p> : null}
              {step.kind === "break" && progress?.seen && !doneNow && fault ? (
                <p className="mt-2 text-sm font-bold">{t("steps.faultSeen", { fix: tx(fault.fix) })}</p>
              ) : null}
              {step.major ? <p className="mt-1 font-ui text-xs text-muted">{t("steps.quizAfter")}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {step.action ? (
                  <Button
                    size="sm"
                    variant={isCurrent ? "primary" : "secondary"}
                    onClick={() => dispatch({ type: "step/do", step: step.id })}
                  >
                    {doneNow ? t("steps.redo") : t("steps.doIt")}
                    <span className="sr-only">: {title}</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={isCurrent ? "primary" : "secondary"}
                    onClick={() => {
                      dispatch({ type: "step/do", step: step.id });
                      if (canStart(bench.steps, session, step.id)) onFocusFigure();
                    }}
                  >
                    {t("steps.byHand")}
                    <span className="sr-only">: {title}</span>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {current === bench.steps.length ? <p className="mt-4 text-sm font-bold">{t("steps.allDone")}</p> : null}
    </section>
  );
}

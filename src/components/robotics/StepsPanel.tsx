"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
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

const KIND_TONE = { build: "info", break: "bad", test: "good" } as const;

/** The nearest ancestor that scrolls (the rail's tab panel on a wide screen; none on a phone, where the page scrolls). */
function scroller(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/**
 * The build as a checklist: done steps are one quiet line, the step to do next
 * is open with its "Do it", later steps are their title and a small button.
 */
export function StepsPanel({ bench, session, savedDone, t, tx, dispatch, onFocusFigure, headingId }: Props) {
  const current = currentStepIndex(bench.steps, session);
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the step to do next in view inside the scrolling rail, without moving the page.
  useEffect(() => {
    const item = listRef.current?.children[current] as HTMLElement | undefined;
    const box = item ? scroller(item) : null;
    if (!item || !box) return;
    const top = item.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    box.scrollTop = Math.max(0, top - 48);
  }, [current]);

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <h2 id={headingId} className="text-lg">
        {t("steps.heading")}
      </h2>
      <ol ref={listRef} className="mt-2 flex flex-col divide-y divide-rule">
        {bench.steps.map((step, index) => {
          const progress = session[step.id];
          const doneNow = progress?.done === true;
          const done = doneNow || savedDone(step.id);
          const isCurrent = index === current;
          const fault = step.fault ? bench.faults.find((f) => f.id === step.fault) : undefined;
          const title = tx(step.title);
          const byHand = step.action === null;
          const label = byHand ? t("steps.byHand") : doneNow ? t("steps.redo") : t("steps.doIt");
          const run = () => {
            dispatch({ type: "step/do", step: step.id });
            if (byHand && canStart(bench.steps, session, step.id)) onFocusFigure();
          };

          if (isCurrent) {
            return (
              <li
                key={step.id}
                data-step={step.id}
                aria-current="step"
                className="-mx-4 rounded-lg bg-hover px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
                  <span className="tabular text-sm font-bold">{index + 1}</span>
                  <Chip tone={KIND_TONE[step.kind]}>{t(`steps.kinds.${step.kind}`)}</Chip>
                  <span className="ms-auto text-xs font-semibold text-muted">
                    {done ? (
                      <span className="inline-flex items-center gap-1 text-good">
                        <Icon name="check" size={16} />
                        {t("steps.done")}
                      </span>
                    ) : (
                      t("steps.current")
                    )}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold leading-snug">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed">{tx(step.body)}</p>
                {step.kind === "break" && progress?.seen && !doneNow && fault ? (
                  <p className="mt-2 text-sm font-semibold">{t("steps.faultSeen", { fix: tx(fault.fix) })}</p>
                ) : null}
                {step.major ? <p className="mt-1 text-xs text-muted">{t("steps.quizAfter")}</p> : null}
                <Button size="sm" variant="primary" className="mt-3" aria-label={`${label}: ${title}`} onClick={run}>
                  {byHand ? <Icon name="target" size={16} /> : <Icon name="play" size={16} />}
                  {label}
                </Button>
              </li>
            );
          }

          return (
            <li key={step.id} data-step={step.id} className={cx("-mx-4 flex min-h-11 items-center gap-3 px-4 py-2", done && "text-muted")}>
              <span className="tabular w-6 shrink-0 text-end text-sm font-semibold">{index + 1}</span>
              <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug">
                {title}
                {step.kind === "break" ? (
                  <span className="ms-2 whitespace-nowrap text-xs font-semibold text-bad">{t("steps.kinds.break")}</span>
                ) : null}
              </h3>
              {done ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-good">
                  <Icon name="check" size={20} />
                  <span className="max-sm:sr-only">{t("steps.done")}</span>
                </span>
              ) : null}
              <IconButton
                size="sm"
                icon={byHand ? "target" : done ? "rotate-left" : "play"}
                label={`${label}: ${title}`}
                title={label}
                tooltipSide="top"
                onClick={run}
              />
            </li>
          );
        })}
      </ol>
      {current === bench.steps.length ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <Icon name="check" size={20} className="text-good" />
          {t("steps.allDone")}
        </p>
      ) : null}
    </section>
  );
}

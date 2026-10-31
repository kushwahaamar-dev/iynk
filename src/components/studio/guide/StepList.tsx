"use client";

import { useMemo } from "react";
import { Button, cx, Icon, type IconName } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { StepState } from "@/project/guided/engine";

export interface StepListProps {
  steps: StepState[];
  texts: string[];
  viewIndex: number;
  onView(i: number): void;
  onMark(i: number): void;
  messages: Messages["studio"];
  locale: Locale;
}

const MARKS: Record<StepState["state"], IconName | null> = {
  done: "check",
  blocked: "lock",
  current: "arrow-right",
  notStarted: null,
};

export function StepList({ steps, texts, viewIndex, onView, onMark, messages, locale }: StepListProps) {
  const t = useMemo(() => createTranslator(locale, messages, `${locale}/studio`), [locale, messages]);
  const viewed = steps[viewIndex];

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-1" data-testid="guide-steps">
        {steps.map((step, i) => {
          const mark = MARKS[step.state];
          const open = i === viewIndex;
          return (
            <li key={step.index}>
              <button
                type="button"
                aria-current={open ? "step" : undefined}
                onClick={() => onView(i)}
                data-state={step.state}
                className={cx(
                  "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-start text-sm motion-fade [@media(pointer:coarse)]:min-h-11",
                  open ? "bg-sunken" : "hover:bg-hover",
                  step.state === "done" && !open && "text-muted",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border border-rule font-ui text-xs font-semibold tabular",
                    step.state === "done" && "border-good bg-good-bg text-good",
                    step.state === "current" && "border-accent bg-accent text-on-accent",
                  )}
                >
                  {mark ? <Icon name={mark} size={16} /> : i + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-pretty leading-snug">{texts[i]}</span>
                  <span className="text-xs text-muted">{t(`lesson.guide.step.state.${step.state}`)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-between gap-2">
        <p role="status" aria-live="polite" className="text-sm font-semibold tabular">
          {viewed ? `${t("lesson.guide.stepOf", { n: viewIndex + 1, total: steps.length })}. ${t(`lesson.guide.step.state.${viewed.state}`)}` : null}
        </p>
        {viewed && viewed.state !== "done" && viewed.state !== "blocked" ? (
          <Button size="sm" onClick={() => onMark(viewed.index)}>
            {t("lesson.guide.markDone")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

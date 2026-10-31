"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button, Chip } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { Guide } from "@/project/generated/types";
import { CompletionLine } from "./CompletionLine";
import { QuizView } from "./QuizView";
import { StepList } from "./StepList";
import { textAt, type useGuide } from "./useGuide";

type Slot = "checks" | "hints" | "assembly" | "wire" | "inputs" | "status" | "faults" | "lens";

const SLOT_ORDER: Slot[] = ["checks", "hints", "assembly", "wire", "inputs", "status", "faults", "lens"];

export interface GuideDockProps {
  view: ReturnType<typeof useGuide>;
  guide: Guide;
  locale: Locale;
  slots: Partial<Record<Slot, ReactNode>>;
  messages: Messages["studio"];
}

export function GuideDock({ view, guide, locale, slots, messages }: GuideDockProps) {
  const t = useMemo(() => createTranslator(locale, messages, `${locale}/studio`), [locale, messages]);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const steps = (guide.kind === "tour" ? undefined : guide.steps) ?? [];
  const tier = view.record?.completion?.tier ?? view.tier;
  const legacy = view.record?.completion?.legacy === true || view.record?.legacy === true;
  const quizzes = guide.quizzes ?? [];
  const slotted = SLOT_ORDER.filter((name) => slots[name] != null);

  const reset = async () => {
    setFailed(false);
    try {
      await view.reset();
      setConfirming(false);
    } catch {
      setFailed(true);
    }
  };

  return (
    <section aria-label={t("lesson.guide.title")} className="flex flex-col gap-4" data-testid="guide-dock">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-balance">{textAt(guide.title, locale)}</h2>
          {tier ? (
            <Chip mono>{t("lesson.guide.tier", { tier })}</Chip>
          ) : null}
          {view.unchecked > 0 ? <Chip tone="warn">{t("lesson.guide.provenance.unchecked", { n: view.unchecked })}</Chip> : null}
        </div>
        {guide.lede ? <p className="text-sm text-pretty">{textAt(guide.lede, locale)}</p> : null}
        <CompletionLine completion={view.completion} tier={tier} legacy={legacy} messages={messages} locale={locale} />
      </header>

      {steps.length > 0 ? (
        <StepList
          steps={view.steps}
          texts={steps.map((s) => textAt(s, locale))}
          viewIndex={view.viewIndex}
          onView={view.setViewIndex}
          onMark={view.markStep}
          messages={messages}
          locale={locale}
        />
      ) : null}

      {quizzes.length > 0 ? <QuizView quizzes={quizzes} record={view.record} locale={locale} onAnswer={view.answer} messages={messages} /> : null}

      {slotted.length > 0 ? (
        <div className="flex flex-col gap-4">
          {slotted.map((name) => (
            <div key={name} data-slot={name}>
              {slots[name]}
            </div>
          ))}
        </div>
      ) : null}

      <footer className="flex flex-col gap-2">
        {confirming ? (
          <>
            <p className="text-sm text-pretty">{t("lesson.guide.resetConfirm")}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="danger" onClick={() => void reset()}>
                {t("lesson.guide.reset")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                {t("dialog.cancel")}
              </Button>
            </div>
            {failed ? (
              <p role="alert" className="text-sm text-bad">
                {t("row.failed")}
              </p>
            ) : null}
          </>
        ) : (
          <div>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
              {t("lesson.guide.reset")}
            </Button>
          </div>
        )}
      </footer>
    </section>
  );
}

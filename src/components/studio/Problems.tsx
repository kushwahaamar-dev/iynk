"use client";

import { useMemo } from "react";
import { Chip, EmptyState, Icon, cx, type ChipTone, type IconName } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type MessageKey } from "@/i18n/translate";
import type { Problem, ProblemSeverity } from "@/studio/problems";

export interface ProblemsProps {
  problems: readonly Problem[];
  onJump(problem: Problem): void;
  messages: Messages["studioCode"];
  lang: Locale;
}

const ICON: Record<ProblemSeverity, IconName> = { error: "danger", warning: "warn", note: "info" };
const TEXT: Record<ProblemSeverity, string> = { error: "text-bad", warning: "text-warn", note: "text-info" };
const TONE: Record<ProblemSeverity, ChipTone> = { error: "bad", warning: "warn", note: "info" };

export function Problems({ problems, onJump, messages, lang }: ProblemsProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studioCode`), [lang, messages]);
  const errors = problems.filter((p) => p.severity === "error").length;

  return (
    <section aria-label={t("problems.title")} className="flex min-h-0 flex-col gap-2" data-testid="problems">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("problems.title")}</h3>
        {problems.length > 0 ? (
          <Chip tone={errors > 0 ? "bad" : "warn"} role="status">
            {t("problems.count", { count: problems.length })}
          </Chip>
        ) : null}
      </div>
      {problems.length === 0 ? (
        <EmptyState icon="check-circle" title={t("problems.empty")} className="py-8">
          {t("problems.emptyHint")}
        </EmptyState>
      ) : (
        <ul className="flex min-h-0 flex-col overflow-y-auto">
          {problems.map((p) => {
            const severity = t(`problems.severity.${p.severity}`);
            const title = p.fallbackText ?? t(p.titleKey as MessageKey<Messages["studioCode"]>, p.args);
            const where = p.line === undefined ? null : t("problems.line", { line: p.line });
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onJump(p)}
                  data-severity={p.severity}
                  className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-start text-sm motion-fade hover:bg-hover active:scale-98"
                >
                  <Icon name={ICON[p.severity]} size={16} className={cx("mt-0.5 shrink-0", TEXT[p.severity])} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <Chip tone={TONE[p.severity]}>{severity}</Chip>
                      {where ? <span className="font-mono tabular-nums text-muted">{where}</span> : null}
                    </span>
                    <span className="text-pretty">{title}</span>
                    {p.hint ? <span className="text-pretty text-muted">{t("problems.hint", { hint: p.hint })}</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

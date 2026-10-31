"use client";

import { useId, useMemo } from "react";
import { Button, Chip, cx, EmptyState, Icon } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { Tier } from "@/project/guided/record";
import { summary, type CheckRow } from "@/studio/guide/checks-model";

export interface ChecksViewProps {
  rows: CheckRow[];
  status: "idle" | "running" | "done" | "limit";
  progress: number;
  tier: Tier | null;
  faultOn: boolean;
  onRun(): void;
  onCancel(): void;
  messages: Messages["studio"];
  lang: Locale;
}

export function ChecksView({ rows, status, progress, tier, faultOn, onRun, onCancel, messages, lang }: ChecksViewProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studio`), [lang, messages]);
  const id = useId();
  const { passed, total, hidden } = summary(rows);
  const running = status === "running";
  const allPass = status === "done" && total > 0 && passed === total;
  const line = running
    ? t("lesson.checks.running")
    : status === "limit"
      ? t("lesson.checks.limit")
      : status === "idle"
        ? t("lesson.checks.pending")
        : allPass
          ? faultOn
            ? t("lesson.checks.faultOn")
            : t("lesson.checks.allPass")
          : t("lesson.checks.summary", { passed, total });
  const tone = allPass && !faultOn ? "text-good" : status === "idle" || running ? "text-muted" : "text-bad";
  const visible = rows.filter((r) => !r.hidden);

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3" data-testid="checks-view">
      <h3 id={`${id}-title`} className="sr-only">
        {t("lesson.checks.title")}
      </h3>
      {total === 0 ? (
        <EmptyState icon="check" title={t("lesson.checks.empty")} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p role="status" className={cx("me-auto text-sm font-semibold tabular-nums", tone)}>
              {line}
            </p>
            {tier !== null && status !== "idle" && !running ? <Chip tone="neutral">{t("lesson.checks.tier", { tier })}</Chip> : null}
            {running ? (
              <Button size="sm" variant="secondary" className="shrink-0 whitespace-nowrap" onClick={onCancel}>
                {t("dialog.cancel")}
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" className="shrink-0 whitespace-nowrap" onClick={onRun} disabled={running}>
              {status === "idle" ? t("lesson.checks.run") : t("lesson.checks.again")}
            </Button>
          </div>
          {running ? <progress className="h-2 w-full accent-accent" max={1} value={progress} aria-label={t("lesson.checks.running")} /> : null}
          <ol className="divide-y divide-rule">
            {visible.map((r) => {
              const shown = running ? "notRun" : r.state;
              return (
                <li key={`${r.testId}/${r.checkId}`} className="flex items-start gap-3 py-3 text-sm" data-check={shown}>
                  {shown === "pass" ? (
                    <Icon name="check" size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-good" />
                  ) : shown === "fail" && !r.unavailable ? (
                    <Icon name="close" size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-bad" />
                  ) : (
                    <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 rounded-full border border-rule" />
                  )}
                  <span className={cx("min-w-0 flex-1 text-pretty", shown === "fail" && !r.unavailable && "text-bad")}>
                    {r.label}
                    <span className="sr-only"> · {r.unavailable ? t("lesson.status.unknown") : t(`checks.${shown}`)}</span>
                  </span>
                  {r.unavailable ? <span className="shrink-0 text-muted">{t("lesson.status.unknown")}</span> : null}
                  {r.textCheck ? <Chip tone="info">{t("lesson.checks.textCheck")}</Chip> : null}
                </li>
              );
            })}
          </ol>
          {hidden > 0 ? <p className="text-sm text-muted tabular-nums">{t("lesson.checks.hiddenNote", { n: hidden })}</p> : null}
        </>
      )}
    </section>
  );
}

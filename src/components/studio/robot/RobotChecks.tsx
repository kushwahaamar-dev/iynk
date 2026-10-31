"use client";

import { useMemo } from "react";
import { Chip, Icon, type ChipTone, type IconName } from "@/components/ui";
import type { CouplingReport, RobotCheck, RunMetrics } from "@/core/robot-report";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type Translate } from "@/i18n/translate";

export interface ModelEntry {
  id: string;
  tier: "T0" | "T1" | "T2" | "T3";
  modelled: string[];
  notModelled: string[];
}

export interface RobotChecksProps {
  checks: RobotCheck[];
  coupling: CouplingReport[];
  run?: RunMetrics;
  models: ModelEntry[];
  onSelectPart(id: string): void;
  messages: Messages["robot"];
  lang: Locale;
}

type T = Translate<Messages["robot"]>;
type Result = RobotCheck["result"];

const ORDER: Record<Result, number> = { fail: 0, warn: 1, ok: 2 };
const LOOK: Record<Result, { tone: ChipTone; icon: IconName }> = {
  fail: { tone: "bad", icon: "danger" },
  warn: { tone: "warn", icon: "warn" },
  ok: { tone: "good", icon: "check-circle" },
};
const SAFETY = ["lipo", "pinch", "stall", "unattended", "simulation"] as const;

const num = (v: number) => String(Number(v.toPrecision(4)));
const quantity = (v: number | null, unit: string) => (v === null ? "-" : `${num(v)} ${unit}`.trim());

function StatusChip({ result, t }: { result: Result; t: T }) {
  const look = LOOK[result];
  return (
    <Chip tone={look.tone}>
      <Icon name={look.icon} size={16} aria-hidden="true" />
      {t(`checks.status.${result}`)}
    </Chip>
  );
}

function PartLink({ part, t, onSelectPart }: { part: string | null; t: T; onSelectPart(id: string): void }) {
  if (part === null) return <span className="text-sm text-muted">{t("checks.noPart")}</span>;
  return (
    <button
      type="button"
      aria-label={t("parts.openPart", { part })}
      onClick={() => onSelectPart(part)}
      className="rounded-md px-1 text-sm font-semibold text-accent underline underline-offset-2 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px"
    >
      {t("parts.limitingPart", { part })}
    </button>
  );
}

function CheckRow({ check, t, onSelectPart }: { check: RobotCheck; t: T; onSelectPart(id: string): void }) {
  const title = t(`checks.${check.id}.title`);
  return (
    <li className="flex flex-col gap-1 border-b border-rule py-3 last:border-b-0" data-result={check.result}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-base font-semibold">{title}</span>
        <StatusChip result={check.result} t={t} />
      </div>
      <p className="font-mono text-sm tabular-nums">
        {t("checks.line", { title, status: t(`checks.status.${check.result}`), value: quantity(check.value, check.unit), limit: quantity(check.limit, check.unit) })}
      </p>
      <p className="text-sm text-pretty text-muted">{t(`checks.${check.id}.asks`)}</p>
      <PartLink part={check.limitingPart} t={t} onSelectPart={onSelectPart} />
      <details>
        <summary className="cursor-pointer text-sm font-medium">{t("checks.formula")}</summary>
        <p className="mt-1 font-mono text-sm text-pretty">{check.formula}</p>
        <p className="mt-1 text-sm text-pretty text-muted">{t(`checks.${check.id}.note`)}</p>
        {check.assumptions.length > 0 ? (
          <ul className="mt-1 list-disc pl-4 text-sm text-pretty">
            {check.assumptions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </details>
    </li>
  );
}

function CouplingRow({ report, t }: { report: CouplingReport; t: T }) {
  const result: Result = report.ok ? "ok" : "fail";
  const status = t(`checks.status.${result}`);
  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-rule py-2 last:border-b-0" data-result={result}>
      <span className="min-w-0 flex-1 font-mono text-sm tabular-nums">{t("checks.line", { title: report.motorId, status, value: num(report.hc), limit: "1" })}</span>
      <StatusChip result={result} t={t} />
    </li>
  );
}

function Lines({ heading, items }: { heading: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <h5 className="text-xs font-semibold text-muted">{heading}</h5>
      <ul className="mt-1 list-disc pl-4 text-sm text-pretty">
        {items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export function RobotChecks({ checks, coupling, run, models, onSelectPart, messages, lang }: RobotChecksProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/robot`), [lang, messages]);
  const sorted = useMemo(() => [...checks].sort((a, b) => ORDER[a.result] - ORDER[b.result]), [checks]);
  const couplingSorted = useMemo(() => [...coupling].sort((a, b) => Number(a.ok) - Number(b.ok)), [coupling]);

  return (
    <section aria-label={t("checks.title")} className="flex min-h-0 flex-col gap-4" data-testid="robot-checks">
      <div>
        <h3 className="text-sm font-semibold">{t("checks.title")}</h3>
        {sorted.length === 0 ? (
          <p className="py-3 text-sm text-pretty text-muted">{t("checks.none")}</p>
        ) : (
          <ul>
            {sorted.map((check) => (
              <CheckRow key={check.id} check={check} t={t} onSelectPart={onSelectPart} />
            ))}
          </ul>
        )}
      </div>
      {couplingSorted.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold">{t("checks.coupling")}</h3>
          <ul>
            {couplingSorted.map((report) => (
              <CouplingRow key={report.motorId} report={report} t={t} />
            ))}
          </ul>
        </div>
      ) : null}
      {run && run.text.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold">{t("run.title")}</h3>
          <ul className="mt-1 text-sm tabular-nums">
            {run.text.map((line, i) => (
              <li key={i} className="py-1">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {models.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold">{t("models.title")}</h3>
          <ul>
            {models.map((model) => (
              <li key={model.id} className="border-b border-rule py-3 last:border-b-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-base font-semibold">{model.id}</span>
                  <Chip tone="ink">{t("models.tier", { tier: model.tier })}</Chip>
                </div>
                <Lines heading={t("models.title")} items={model.modelled} />
                <Lines heading={t("models.notYet")} items={model.notModelled} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <h3 className="text-sm font-semibold">{t("safety.title")}</h3>
        <ul className="mt-1 list-disc pl-4 text-sm text-pretty">
          {SAFETY.map((key) => (
            <li key={key}>{t(`safety.${key}`)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

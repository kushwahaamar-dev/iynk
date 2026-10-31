"use client";

import { useMemo } from "react";
import { Button, Chip, Icon, type ChipTone } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, messageAt } from "@/i18n/translate";
import type { Diagnosis, Evidence } from "@/project/diagnosis";
import { MAX_EVIDENCE, exportDiagnosis, type DiagnosisFile } from "@/export/diagnosis";

export interface DiagnosisRecordProps {
  diagnosis: Diagnosis;
  outcome: DiagnosisFile["outcome"];
  projectId: string;
  /** True once `bench-check` results exist for this cause. */
  benchChecked: boolean;
  logOn: boolean;
  messages: Messages["faults"];
  lang: Locale;
  onOpenSettings(): void;
  /** Hands the file to the browser. Defaults to a download link. */
  onDownload?(file: { json: string; filename: string }): void;
  /** Puts text on the clipboard. Defaults to the system clipboard. */
  onCopy?(text: string): void;
}

const PROVENANCE_TONE: Record<Evidence["provenance"], ChipTone> = { computed: "neutral", approximation: "warn", mocked: "bad" };

function saveFile({ json, filename }: { json: string; filename: string }): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const copyText = (text: string): void => {
  navigator.clipboard?.writeText(text).catch(() => {});
};

export function DiagnosisRecord({
  diagnosis,
  outcome,
  projectId,
  benchChecked,
  logOn,
  messages,
  lang,
  onOpenSettings,
  onDownload = saveFile,
  onCopy = copyText,
}: DiagnosisRecordProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/faults`), [lang, messages]);
  const numbers = useMemo(() => new Intl.NumberFormat(lang), [lang]);
  const shown = diagnosis.evidence.slice(0, MAX_EVIDENCE);
  const hidden = diagnosis.evidence.length - shown.length;
  const titleKey = `cause.${diagnosis.cause_id}.title`;
  const causeTitle = typeof messageAt(messages, titleKey) === "string" ? t(titleKey as "cause.swapped-pins.title") : diagnosis.cause_id;
  const symptomKey = `symptom.${diagnosis.symptom_id}`;
  const symptom = typeof messageAt(messages, symptomKey) === "string" ? t(symptomKey as "symptom.i2c-no-ack") : diagnosis.symptom_id;
  const file = () => exportDiagnosis(diagnosis, { outcome, projectId });

  return (
    <section aria-labelledby="diagnosis-record-title" className="flex min-h-0 flex-col gap-4" data-testid="diagnosis-record">
      <h3 id="diagnosis-record-title" className="text-lg font-semibold text-balance">
        {t("record.title")}
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
        <dt className="text-muted">{t("record.cause")}</dt>
        <dd className="font-semibold">{causeTitle}</dd>
        <dt className="text-muted">{t("record.symptom")}</dt>
        <dd>{symptom}</dd>
        <dt className="text-muted">{t("record.hintLevel")}</dt>
        <dd className="tabular">{diagnosis.hint_level}</dd>
        <dt className="text-muted">{t("record.outcomeLabel")}</dt>
        <dd>{t(`record.outcome.${outcome}`)}</dd>
      </dl>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold">{t("record.evidence")}</h4>
        {shown.length === 0 ? (
          <p className="max-w-prose text-base text-pretty text-muted">{t("record.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="text-muted">
                  {(["kind", "reference", "time", "value", "tier", "provenance"] as const).map((column) => (
                    <th key={column} scope="col" className="px-2 py-2 font-semibold whitespace-nowrap">
                      {t(`record.${column}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((e, i) => (
                  <tr key={i} className="border-t border-rule align-top">
                    <td className="px-2 py-2">{t(`evidence.kind.${e.kind}`)}</td>
                    <td className="font-ui px-2 py-2 break-all">{e.ref}</td>
                    <td className="font-ui tabular px-2 py-2 whitespace-nowrap">{numbers.format(Math.floor(e.at / 1e6))} ms</td>
                    <td className="font-ui tabular px-2 py-2 break-all">
                      {e.value}
                      {e.unit ? ` ${e.unit}` : ""}
                    </td>
                    <td className="px-2 py-2">
                      <Chip tone="neutral">{t(`record.tierName.${e.tier}`)}</Chip>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col items-start gap-1">
                        <Chip tone={PROVENANCE_TONE[e.provenance]}>{t(`provenance.${e.provenance}`)}</Chip>
                        {e.provenance === "mocked" ? <span className="text-muted">{t("fidelity.mocked")}</span> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hidden > 0 ? <p className="text-sm text-muted">{t("record.more", { count: numbers.format(hidden) })}</p> : null}
      </div>

      {benchChecked ? null : <p className="max-w-prose text-sm text-pretty text-muted">{t("fidelity.notChecked")}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="solid" onClick={() => onDownload(file())}>
          <Icon name="download" size={16} aria-hidden="true" />
          {t("record.export")}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onCopy(file().text)}>
          <Icon name="copy" size={16} aria-hidden="true" />
          {t("record.copy")}
        </Button>
      </div>

      <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <span>{logOn ? t("record.logOn") : t("record.logOff")}</span>
        <button type="button" onClick={onOpenSettings} className="rounded-md font-semibold text-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          {t("record.settings")}
        </button>
      </p>
    </section>
  );
}

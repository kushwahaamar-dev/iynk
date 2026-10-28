"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCommonT, useLocale } from "@/i18n/client";
import { bugReportText, clearLog, useLog } from "@/lib/telemetry";

type CopyState = "idle" | "copied" | "manual";

/** The local log: what this browser recorded, a Clear button and the text for a bug report. */
export function LocalLog() {
  const t = useCommonT();
  const locale = useLocale();
  const entries = useLog();
  const [copy, setCopy] = useState<CopyState>("idle");
  const [report, setReport] = useState("");
  const manual = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (copy === "manual") manual.current?.select();
  }, [copy]);

  async function copyReport() {
    const text = bugReportText();
    setReport(text);
    try {
      await navigator.clipboard.writeText(text);
      setCopy("copied");
    } catch {
      setCopy("manual");
    }
  }

  return (
    <section aria-labelledby="local-log-title" className="flex flex-col gap-3 border-t border-rule pt-4">
      <div>
        <h3 id="local-log-title" className="field-label">
          {t("log.title")}
        </h3>
        <p className="mt-1 text-sm text-muted">{t("log.notice")}</p>
      </div>
      {entries.length === 0 ? (
        <EmptyState icon="empty" title={t("log.empty")} className="rounded-lg bg-sunken py-4!" />
      ) : (
        <ol className="max-h-48 overflow-y-auto rounded-lg bg-sunken p-3 font-mono text-xs tabular-nums" data-testid="local-log">
          {entries.map((entry, index) => (
            <li key={`${entry.t}-${index}`} className="break-words py-0.5">
              <time dateTime={new Date(entry.t).toISOString()} className="tabular-nums text-muted">
                {new Date(entry.t).toLocaleTimeString(locale)}
              </time>{" "}
              <span className={entry.kind === "error" ? "font-semibold text-bad" : "font-semibold"}>{entry.name}</span>
              {entry.detail ? <span className="text-muted"> {entry.detail}</span> : null}
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={copyReport}>
          {t("log.copy")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={entries.length === 0}
          onClick={() => {
            clearLog();
            setCopy("idle");
          }}
        >
          {t("log.clear")}
        </Button>
        <p role="status" className="text-sm text-good empty:hidden">
          {copy === "copied" ? t("log.copied") : null}
        </p>
      </div>
      {copy === "manual" ? (
        <TextArea
          id="local-log-report"
          ref={manual}
          label={t("log.manual")}
          readOnly
          rows={6}
          value={report}
          className="font-mono text-xs tabular-nums"
        />
      ) : null}
    </section>
  );
}

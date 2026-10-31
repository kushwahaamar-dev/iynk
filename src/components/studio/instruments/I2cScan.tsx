"use client";

import { useMemo, useRef, useState } from "react";
import { Button, InlineStatus } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { ScannedReply } from "@/sim-host/protocol";

export interface I2cScanProps {
  /** Probes the bus on a copy of the run; rejects when no pins are bound or the copy cannot be built. */
  scan(): Promise<ScannedReply>;
  /** No run is loaded to scan. */
  disabled?: boolean;
  messages: Messages["faults"];
  lang: Locale;
}

type Outcome = { kind: "idle" } | { kind: "scanning" } | { kind: "done"; reply: ScannedReply } | { kind: "no-pins" } | { kind: "failed" };

const NO_PINS = "no pins bound";

const hex = (addr: number): string => `0x${addr.toString(16).toUpperCase().padStart(2, "0")}`;

export function I2cScan({ scan, disabled = false, messages, lang }: I2cScanProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/faults`), [lang, messages]);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const latest = useRef(0);

  const press = async () => {
    const mine = ++latest.current;
    setOutcome({ kind: "scanning" });
    let next: Outcome;
    try {
      next = { kind: "done", reply: await scan() };
    } catch (e) {
      next = e instanceof Error && e.message === NO_PINS ? { kind: "no-pins" } : { kind: "failed" };
    }
    if (mine === latest.current) setOutcome(next);
  };

  const scanning = outcome.kind === "scanning";
  const reply = outcome.kind === "done" ? outcome.reply : null;

  return (
    <section className="flex min-w-0 flex-col gap-4" data-testid="i2c-scan" aria-label={t("scan.title")}>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={disabled} busy={scanning} onClick={press}>
          {t("scan.run")}
        </Button>
        {reply ? (
          <p className="text-sm text-muted">
            {t("scan.pins")}: <span className="font-mono">{reply.sda}</span>, <span className="font-mono">{reply.scl}</span>
          </p>
        ) : null}
      </div>
      <div role="status" className="flex min-w-0 flex-col gap-3">
        {scanning ? <InlineStatus>{t("scan.scanning")}</InlineStatus> : null}
        {outcome.kind === "no-pins" ? <InlineStatus tone="warn">{t("scan.noPins")}</InlineStatus> : null}
        {outcome.kind === "failed" ? <InlineStatus tone="bad">{t("scan.failed")}</InlineStatus> : null}
        {reply ? (
          <p className="text-base font-semibold tabular-nums">{t("scan.tally", { found: reply.found.length, probed: reply.probed })}</p>
        ) : null}
      </div>
      {reply && reply.found.length === 0 ? <p className="text-sm text-muted">{t("scan.none")}</p> : null}
      {reply && reply.found.length > 0 ? (
        <table className="w-full border-collapse text-start text-sm">
          <caption className="sr-only">{t("scan.found")}</caption>
          <thead>
            <tr className="text-muted">
              <th scope="col" className="py-2 pe-4 text-start font-medium">{t("scan.address")}</th>
              <th scope="col" className="py-2 text-start font-medium">{t("scan.status")}</th>
            </tr>
          </thead>
          <tbody>
            {reply.found.map((addr) => (
              <tr key={addr} className="border-t border-rule">
                <td className="py-2 pe-4 font-mono tabular-nums">{hex(addr)}</td>
                <td className="py-2">{t("scan.answered")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Button, Callout, Chip, EmptyState, Icon } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, messageAt, type MessageKey } from "@/i18n/translate";
import { writeIynk } from "@/export/iynk";
import { appEventLog, type EventLog } from "@/local/events";
import type { Evidence } from "@/project/diagnosis";
import type { Fault, Op, Project } from "@/project/generated/types";
import { breakTool, type BreakFailure, type BreakGesture } from "@/studio/tools/break";
import type { CauseFamily } from "@/sim/faults/causes";
import type { FaultCandidate } from "@/sim/faults/generate";
import { redactForUnrevealed, type ItemState } from "@/sim/faults/seal";
import type { NetView } from "@/sim/faults/types";

type FaultsKey = MessageKey<Messages["faults"]>;

export interface BreakItProps {
  doc: Project;
  view: NetView;
  sources: Record<string, string>;
  /** Commits one batch as one undo entry. False when the document refused it. */
  commit(ops: Op[], label: string): boolean;
  /** Starts the run again from time zero. Absent when no simulator is attached. */
  restartRun?(): void;
  /** What the monitor saw since the last run, shown under Explain. */
  evidence?: Evidence[];
  /** Where a sealed diagnose item stands; a sealed one hides the answer from the stored faults. */
  itemState?: ItemState;
  messages: Messages["faults"];
  lang: Locale;
  /** Hands the sealed copy to the browser. Defaults to a download link. */
  onDownload?(file: { bytes: Uint8Array; filename: string }): void;
  /** A fresh seed for Surprise me. Defaults to the browser's random numbers. */
  drawSeed?(): number;
  log?: Pick<EventLog, "append">;
}

type Broken = { faultId: string; explained: boolean };

const FAMILIES: readonly CauseFamily[] = ["wiring", "power", "code", "bus", "value", "mechanical", "flight"];
const HIDDEN_FAULT_ID = "(hidden)";
const LOGGED_EVIDENCE = 8;

function saveFile({ bytes, filename }: { bytes: Uint8Array; filename: string }): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/octet-stream" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const randomSeed = (): number => crypto.getRandomValues(new Uint32Array(1))[0]!;

export function BreakIt({
  doc,
  view,
  sources,
  commit,
  restartRun,
  evidence = [],
  itemState = "presented",
  messages,
  lang,
  onDownload = saveFile,
  drawSeed = randomSeed,
  log,
}: BreakItProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/faults`), [lang, messages]);
  const [broken, setBroken] = useState<Broken | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");

  const stored = useMemo(() => redactForUnrevealed(doc, itemState).simulation.faults, [doc, itemState]);
  const candidates = useMemo(() => {
    const listed = breakTool(doc, view, sources, { t: "list" });
    return listed.ok ? (listed.value.candidates ?? []) : [];
  }, [doc, view, sources]);
  const byFamily = useMemo(
    () => FAMILIES.map((family) => ({ family, rows: candidates.filter((c) => c.family === family) })).filter((g) => g.rows.length > 0),
    [candidates],
  );

  const active = broken !== null && doc.simulation.faults.some((f) => f.id === broken.faultId) ? broken : null;
  const activeFault = active ? doc.simulation.faults.find((f) => f.id === active.faultId) : undefined;
  const faultsOn = doc.simulation.faults.filter((f) => f.enabled).length;

  const has = (key: string) => typeof messageAt(messages, key) === "string";
  const causeTitle = (id: string) => (has(`cause.${id}.title`) ? t(`cause.${id}.title` as FaultsKey) : id);
  const where = (c: FaultCandidate["label"]) =>
    c.nets ? t("breakIt.where.nets", { a: c.nets[0], b: c.nets[1] }) : c.part && c.pin ? t("breakIt.where.partPin", { part: c.part, pin: c.pin }) : t("breakIt.where.part", { part: c.part ?? "" });

  const failure = ({ code }: BreakFailure) => t(code === "duplicate-fault" ? "breakIt.duplicate" : code === "limit" ? "breakIt.limit" : "breakIt.noCandidate");

  function run(g: BreakGesture, label: string, after: (candidate: FaultCandidate | undefined) => string): void {
    const done = breakTool(doc, view, sources, g);
    if (!done.ok) {
      setProblem(failure(done.error));
      return;
    }
    if (!commit(done.value.ops, label)) {
      setProblem(t("breakIt.noCandidate"));
      return;
    }
    setProblem("");
    setNotice(after(done.value.candidate));
    if (restartRun) restartRun();
  }

  const applied = () => (restartRun ? t("breakIt.restarted") : t("breakIt.applied"));

  function breakWith(g: Extract<BreakGesture, { t: "break" | "surprise" }>): void {
    run(g, t("breakIt.title"), (candidate) => {
      if (candidate) setBroken({ faultId: candidate.fault.id, explained: false });
      return applied();
    });
  }

  function surprise(): void {
    const next = drawSeed();
    setSeed(next);
    breakWith({ t: "surprise", seed: next });
  }

  function restore(): void {
    if (!active) return;
    run({ t: "restore", faultId: active.faultId }, t("breakIt.restore"), () => {
      setBroken(null);
      return restartRun ? `${t("breakIt.undone")} ${t("breakIt.restarted")}` : t("breakIt.undone");
    });
  }

  function toggle(fault: Fault): void {
    run({ t: "toggle", faultId: fault.id }, t(fault.enabled ? "breakIt.turnOff" : "breakIt.turnOn"), () => t(fault.enabled ? "breakIt.nowOff" : "breakIt.nowOn"));
  }

  function forBuddy(candidate: FaultCandidate): void {
    const texts = {
      symptom: (id: string) => (has(`symptom.${id}`) ? t(`symptom.${id}` as FaultsKey) : id),
      explanation: (id: string) => (has(`cause.${id}.why`) ? t(`cause.${id}.why` as FaultsKey) : id),
      option: causeTitle,
    };
    const made = breakTool(doc, view, sources, { t: "buddy", candidate, texts });
    if (!made.ok || !made.value.sealedDoc) {
      setProblem(made.ok ? t("breakIt.noCandidate") : failure(made.error));
      return;
    }
    setProblem("");
    onDownload({ bytes: writeIynk(made.value.sealedDoc), filename: `buddy-${doc.id}.iynk` });
    setNotice(t("breakIt.buddyDone"));
  }

  function explain(): void {
    if (!active || !activeFault) return;
    setBroken({ ...active, explained: true });
    const symptom = activeFault.symptom_ids[0] ?? "";
    void (log ?? appEventLog()).append("diagnosis.record", {
      projectId: doc.id,
      diagnosis: { cause_id: activeFault.cause_id, symptom_id: symptom, evidence: evidence.slice(0, LOGGED_EVIDENCE), hint_level: 0 },
      outcome: "revealed",
    });
  }

  const faultName = (f: Fault) => (f.id === HIDDEN_FAULT_ID ? t("breakIt.hidden") : causeTitle(f.cause_id));

  return (
    <section aria-labelledby="break-it-title" className="flex min-h-0 flex-col gap-4" data-testid="break-it">
      <div className="flex flex-col gap-2">
        <h3 id="break-it-title" className="text-lg font-semibold text-balance">
          {t("breakIt.title")}
        </h3>
        <p className="max-w-prose text-base text-pretty text-muted">{t("breakIt.lede")}</p>
        {faultsOn > 0 ? <p className="tabular text-sm font-semibold">{t("breakIt.faultsOn", { count: faultsOn })}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="solid" disabled={candidates.length === 0} onClick={surprise}>
          <Icon name="spark" size={16} />
          {t("breakIt.surprise")}
        </Button>
        <Button size="sm" variant="secondary" disabled={!active} onClick={restore}>
          <Icon name="undo" size={16} />
          {t("breakIt.restore")}
        </Button>
        <Button size="sm" variant="secondary" disabled={!active} onClick={explain}>
          <Icon name="book" size={16} />
          {t("breakIt.explain")}
        </Button>
      </div>
      {seed === null ? null : <p className="tabular text-sm text-muted">{t("breakIt.seed", { seed })}</p>}

      <p role="status" aria-live="polite" className={notice ? "text-sm" : "sr-only"}>
        {notice}
      </p>
      {problem ? (
        <Callout tone="warn" live>
          {problem}
        </Callout>
      ) : null}

      {active && active.explained && activeFault ? (
        <div className="flex flex-col gap-2 rounded-lg bg-sunken p-3" data-testid="break-it-explain">
          <h4 className="text-base font-semibold">{causeTitle(activeFault.cause_id)}</h4>
          {has(`cause.${activeFault.cause_id}.why`) ? (
            <p className="text-sm text-pretty">
              <span className="font-semibold">{t("breakIt.why")}. </span>
              {t(`cause.${activeFault.cause_id}.why` as FaultsKey)}
            </p>
          ) : null}
          {activeFault.symptom_ids[0] && has(`symptom.${activeFault.symptom_ids[0]}`) ? (
            <p className="text-sm text-pretty">
              <span className="font-semibold">{t("record.symptom")}. </span>
              {t(`symptom.${activeFault.symptom_ids[0]}` as FaultsKey)}
            </p>
          ) : null}
          {has(`cause.${activeFault.cause_id}.fix`) ? (
            <p className="text-sm text-pretty">
              <span className="font-semibold">{t("diagnose.fixHeading")}. </span>
              {t(`cause.${activeFault.cause_id}.fix` as FaultsKey)}
            </p>
          ) : null}
          <p className="text-sm text-muted">
            {evidence.length === 0
              ? t("diagnose.noEvidence")
              : `${t("record.evidence")}: ${evidence.map((e) => `${e.ref} ${e.value}${e.unit ? ` ${e.unit}` : ""}`).join(", ")}`}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold">{t("breakIt.inProject")}</h4>
        {stored.length === 0 ? (
          <p className="text-sm text-muted">{t("breakIt.inProjectNone")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {stored.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-sunken px-3 py-2">
                <span className="min-w-0 flex-1 text-sm font-medium">{faultName(f)}</span>
                <Chip tone={f.enabled ? "warn" : "neutral"}>{t(f.enabled ? "breakIt.on" : "breakIt.off")}</Chip>
                {f.id === HIDDEN_FAULT_ID ? null : (
                  <Button size="sm" variant="secondary" onClick={() => toggle(f)}>
                    {t(f.enabled ? "breakIt.turnOff" : "breakIt.turnOn")}
                    <span className="sr-only"> {faultName(f)}</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="text-sm font-semibold">{t("breakIt.pick")}</h4>
        {byFamily.length === 0 ? (
          <EmptyState bordered title={t("breakIt.none")}>
            {t("breakIt.needsDescriptor")}
          </EmptyState>
        ) : (
          byFamily.map(({ family, rows }) => (
            <div key={family} className="flex flex-col gap-2" data-family={family}>
              <h5 className="text-sm font-semibold text-muted">{t(`breakIt.family.${family}`)}</h5>
              <ul className="flex flex-col gap-2">
                {rows.map((c) => (
                  <li key={c.fault.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-sunken px-3 py-2">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium">{causeTitle(c.causeId)}</span>
                      <span className="font-ui text-sm break-all text-muted">{where(c.label)}</span>
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => breakWith({ t: "break", candidate: c })}>
                      {t("breakIt.apply")}
                      <span className="sr-only">
                        {" "}
                        {causeTitle(c.causeId)}, {where(c.label)}
                      </span>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => forBuddy(c)}>
                      <Icon name="share" size={16} />
                      {t("breakIt.forBuddy")}
                      <span className="sr-only">
                        {" "}
                        {causeTitle(c.causeId)}, {where(c.label)}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

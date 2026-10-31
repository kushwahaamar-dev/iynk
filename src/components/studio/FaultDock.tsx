"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Button, EmptyState, InlineStatus, Tabs, type TabItem } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { appEventLog } from "@/local/events";
import { builtinRegistry } from "@/parts/builtin";
import type { Diagnosis, Evidence } from "@/project/diagnosis";
import { OPEN_KEYS_EVENT } from "@/components/settings/KeysDialog";
import { buildSimNetlist } from "@/sim-host";
import { benchStatus, parseBench } from "@/sim/faults/bench";
import { toDiagnosis, outcomeOf } from "@/sim/faults/diagnose";
import { evidenceFromSerial } from "@/sim/faults/evidence";
import { ladderFor } from "@/sim/faults/hints";
import { buildNetView } from "@/sim/faults/netlist-view";
import type { FaultAction } from "@/studio/commands";
import { listProbePoints, makeInstrumentOp } from "@/studio/instruments/placement";
import type { DiagnoseStore } from "@/studio/stores/diagnose";
import type { DocStore } from "@/studio/stores/doc";
import type { RunStore } from "@/studio/stores/run";
import { useStoreSelector } from "@/studio/stores/select";
import type { UiStore } from "@/studio/stores/ui";
import benchFixture from "../../../tests/fixtures/bench-check/uno-10.json";
import { BreakIt } from "./BreakIt";
import { DiagnosePanel } from "./DiagnosePanel";
import { DiagnosisRecord } from "./DiagnosisRecord";
import { CHECK_BLOCK_TEXT, checkBlock, type FaultLink } from "./wiring/faultLink";

export type FaultRequest = { action: FaultAction; n: number };

export interface FaultDockProps {
  doc: DocStore;
  run: RunStore;
  ui: UiStore;
  diagnose: DiagnoseStore;
  faults: FaultLink;
  /** Starts the run again from time zero. */
  restart(): void;
  /** What a command asked for; a new `n` is a new request. */
  request: FaultRequest | null;
  messages: Messages["faults"];
  lang: Locale;
}

type TabId = "break" | "check" | "diagnose" | "record";

const registry = builtinRegistry();
const parsedBench = parseBench(benchFixture);
const BENCH = parsedBench.ok ? benchStatus(parsedBench.value) : null;

const describe = (descriptorId: string) => {
  const [ref = "", version = ""] = descriptorId.split("@");
  return registry.get(ref, version);
};

const TAB_OF: Record<FaultAction, TabId> = { break: "break", check: "check", explain: "break", restore: "break", hint: "diagnose" };

function useLogOn(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    void appEventLog()
      .enabled()
      .then((value) => live && setOn(value), () => undefined);
    return () => {
      live = false;
    };
  }, []);
  return on;
}

export function FaultDock({ doc, run, ui, diagnose, faults, restart, request, messages, lang }: FaultDockProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/faults`), [lang, messages]);
  const state = useDeferredValue(useStoreSelector(doc, (s) => s.state));
  const session = useStoreSelector(diagnose, (s) => s.session);
  const sealed = useStoreSelector(diagnose, () => diagnose.isSealedUnrevealed());
  const view = useStoreSelector(faults.store, (s) => s);
  const lastLine = useStoreSelector(run, (s) => s.serial.findLast((e) => e.kind === "out"));
  const logOn = useLogOn();
  const [tab, setTab] = useState<TabId>("break");
  const [handled, setHandled] = useState(0);
  const panels = useRef<HTMLDivElement>(null);

  const sources = useMemo(() => Object.fromEntries(state.sources.map((s) => [s.path, s.content])), [state.sources]);
  const net = useMemo(() => buildSimNetlist(state, registry).net, [state]);
  const netView = useMemo(() => buildNetView(net, describe), [net]);

  const hasDiagnose = session !== null || state.simulation.faults.some((f) => f.enabled);
  const shown = sealed ? [] : view.findings;
  const evidence = useMemo(() => shown.flatMap((f) => f.evidence), [shown]);
  const answer = session?.spec.answer.cause_id;
  const ladder = useMemo(
    () => ladderFor({ cause: answer ?? "", finding: view.findings.find((f) => f.causeId === answer), groundNet: netView.groundNet }),
    [answer, view.findings, netView],
  );
  const latestEvidence: Evidence | null = lastLine ? evidenceFromSerial({ at: lastLine.tNs, text: lastLine.text }, "T1") : null;

  const record: { diagnosis: Diagnosis; outcome: "clean" | "assisted" | "helped" | "revealed" } | null = useMemo(() => {
    const own = session ? toDiagnosis(session) : undefined;
    if (session && own) return { diagnosis: own, outcome: outcomeOf(session) };
    const first = shown[0];
    return first ? { diagnosis: { cause_id: first.causeId, symptom_id: first.symptomId, evidence: first.evidence, hint_level: 0 }, outcome: "revealed" } : null;
  }, [session, shown]);

  // A request from a command is read once while rendering, so the tab it names is the one that mounts.
  if (request && request.n !== handled) {
    setHandled(request.n);
    setTab(hasDiagnose || request.action !== "hint" ? TAB_OF[request.action] : "break");
  }

  useEffect(() => {
    if (!request || request.action === "check") return;
    const wanted = { break: t("breakIt.surprise"), explain: t("breakIt.explain"), restore: t("breakIt.restore"), hint: t("hint.open") }[request.action];
    const buttons = [...(panels.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
    const target = buttons.find((b) => b.textContent?.trim() === wanted);
    if (request.action === "break") target?.focus();
    else target?.click();
  }, [request, t]);

  useEffect(() => {
    if (request?.action === "check") void faults.check();
  }, [request, faults]);

  function measure(a: string, b: string) {
    const points = listProbePoints(doc.getState().state);
    const find = (id: string) => points.find((p) => p.id === `pin:${id}` || p.id === `net:${id}`);
    const red = find(a);
    if (!red) return;
    const black = find(b)?.target.pin;
    const settings = black ? { blackPin: `${black.c}.${black.p}` } : undefined;
    doc.commit([makeInstrumentOp("multimeter", red.target, settings)], { label: "Add instrument" });
    ui.set("dock", "serial");
  }

  if (typeof Worker === "undefined") {
    return <p className="p-4 text-base text-pretty text-muted">{t("dock.noWorker")}</p>;
  }

  const block = checkBlock(sealed, view);
  const tabs: TabItem[] = [
    {
      id: "break",
      label: t("breakIt.title"),
      content: (
        <BreakIt
          doc={state}
          view={netView}
          sources={sources}
          commit={(ops, label) => doc.commit(ops, { label }).ok}
          restartRun={restart}
          evidence={evidence}
          itemState={session?.state ?? "presented"}
          messages={messages}
          lang={lang}
        />
      ),
    },
    {
      id: "check",
      label: t("check.title"),
      content: (
        <section aria-label={t("check.title")} className="flex flex-col gap-2" data-testid="fault-check">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={block !== false} busy={view.checking} onClick={() => void faults.check()}>
              {t("check.run")}
            </Button>
            {block === false ? null : <span className="text-sm text-muted">{t(CHECK_BLOCK_TEXT[block])}</span>}
          </div>
          {sealed ? null : (
            <p role="status" className="text-sm tabular-nums">
              {shown.length === 0 ? t("check.none") : `${t("check.found")}: ${shown.length}`}
            </p>
          )}
        </section>
      ),
    },
    ...(hasDiagnose
      ? [
          {
            id: "diagnose",
            label: t("diagnose.title"),
            content:
              session === null ? (
                <EmptyState title={t("diagnose.title")}>{t("diagnose.sealedInfo")}</EmptyState>
              ) : (
                <DiagnosePanel
                  store={diagnose}
                  ladder={ladder}
                  messages={messages}
                  lang={lang}
                  benchChecked={answer !== undefined && (BENCH?.causesChecked.includes(answer) ?? false)}
                  logOn={logOn}
                  onOpenSettings={() => window.dispatchEvent(new CustomEvent(OPEN_KEYS_EVENT))}
                  latestEvidence={latestEvidence}
                  onMeasure={measure}
                />
              ),
          },
        ]
      : []),
    {
      id: "record",
      label: t("record.title"),
      content: record ? (
        <DiagnosisRecord
          diagnosis={record.diagnosis}
          outcome={record.outcome}
          projectId={state.id}
          benchChecked={BENCH?.causesChecked.includes(record.diagnosis.cause_id) ?? false}
          logOn={logOn}
          messages={messages}
          lang={lang}
          onOpenSettings={() => window.dispatchEvent(new CustomEvent(OPEN_KEYS_EVENT))}
        />
      ) : (
        <InlineStatus>{t("check.none")}</InlineStatus>
      ),
    },
  ];

  return (
    <div ref={panels} className="flex min-h-0 flex-1 flex-col" data-testid="fault-dock">
      <Tabs fill className="flex-1" label={t("dock.title")} tabs={tabs} value={tabs.some((x) => x.id === tab) ? tab : "break"} onChange={(id) => setTab(id as TabId)} />
    </div>
  );
}

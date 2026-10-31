"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { LoopStats, PidTrace } from "@/core/robot-report";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { builtinRegistry } from "@/parts/builtin";
import { stepMetrics } from "@/sim/mech/pid";
import { modelRows } from "@/studio/fidelity/static-tier";
import type { RobotStore, RobotView } from "@/studio/robot/store";
import type { DocStore } from "@/studio/stores/doc";
import { useStoreSelector } from "@/studio/stores/select";
import type { UnitPrefs } from "@/studio/tools/robot";
import { LoopTimingView } from "./LoopTimingView";
import { PidPanel } from "./PidPanel";
import { RobotBuilder } from "./RobotBuilder";
import { RobotChecks, type ModelEntry } from "./RobotChecks";
import { TopDownView } from "./TopDownView";

export interface RobotPanelProps {
  doc: DocStore;
  store: RobotStore;
  messages: Messages["robot"];
  lang: Locale;
}

const registry = builtinRegistry();
const UNITS: UnitPrefs = { length: "mm", mass: "g" };
const NO_TRACE: PidTrace = { tNs: [], setpoint: [], response: [], output: [], integral: [] };
const NO_LOOP: LoopStats = { n: 0, meanNs: 0, p95Ns: 0, maxNs: 0, jitterNs: 0, histogram: [] };

const describePart = (id: string) => registry.latest(id);

const useRobotView = (store: RobotStore): RobotView => useSyncExternalStore(store.subscribe, store.get, store.get);

export function RobotBuilderTab({ doc, store, messages, lang }: RobotPanelProps) {
  const { problems } = useRobotView(store);
  return <RobotBuilder doc={doc} describe={describePart} problems={problems} unit={UNITS} messages={messages} lang={lang} />;
}

export function TopDownTab({ doc, store, messages, lang }: RobotPanelProps) {
  const { frame, trail } = useRobotView(store);
  const project = useStoreSelector(doc, (s) => s.state);
  const [selection, setSelection] = useState<string>();
  return <TopDownView doc={project} frame={frame ?? undefined} trail={trail} selection={selection} onSelect={setSelection} unit={UNITS.length} messages={messages} lang={lang} />;
}

export function RobotChecksTab({ doc, store, messages, lang, onSelectPart }: RobotPanelProps & { onSelectPart(id: string): void }) {
  const { checks, coupling, run } = useRobotView(store);
  const project = useStoreSelector(doc, (s) => s.state);
  const models = useMemo<ModelEntry[]>(
    () => modelRows(project, registry).flatMap((row) => (row.tier === "none" ? [] : [{ id: row.name, tier: row.tier, modelled: row.models, notModelled: row.notModelled }])),
    [project],
  );
  return <RobotChecks checks={checks} coupling={coupling} run={run ?? undefined} models={models} onSelectPart={onSelectPart} messages={messages} lang={lang} />;
}

export function PidTab({ store, messages, lang }: Omit<RobotPanelProps, "doc">) {
  const { pid } = useRobotView(store);
  const trace = pid ?? NO_TRACE;
  const metrics = useMemo(() => stepMetrics(trace.tNs, trace.response, trace.setpoint.at(-1) ?? 0), [trace]);
  return <PidPanel trace={trace} metrics={metrics} unit="" messages={messages} lang={lang} />;
}

export function LoopTimingTab({ store, messages, lang }: Omit<RobotPanelProps, "doc">) {
  const { loop } = useRobotView(store);
  return <LoopTimingView stats={loop ?? NO_LOOP} messages={messages} lang={lang} />;
}

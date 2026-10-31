"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Callout, EmptyState, Icon, Menu, Select, type MenuItem } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { Instrument, Project } from "@/project/generated/types";
import type { ToleranceMode } from "@/sim/analog/tolerance";
import type { CsvMeta } from "@/sim/probe/capture";
import type { Reading, TraceChunk } from "@/sim/probe/tap";
import type { SimHost } from "@/sim-host/host";
import { I2cScan } from "./instruments/I2cScan";
import { listProbePoints, makeInstrumentOp, MAX_INSTRUMENTS, removeInstrumentOp, setToleranceOp, type InstrumentKind, type ProbePoint } from "@/studio/instruments/placement";
import { createPlotStore, type PlotStore } from "@/studio/run/plot";
import { createProbeClient } from "@/studio/run/probes";
import type { DocStore } from "@/studio/stores/doc";
import type { RunStore } from "@/studio/stores/run";
import { useStoreSelector } from "@/studio/stores/select";
import type { UiStore } from "@/studio/stores/ui";

const Multimeter = dynamic(() => import("./instruments/Multimeter").then((m) => m.Multimeter), { ssr: false });
const Scope = dynamic(() => import("./instruments/Scope").then((m) => m.Scope), { ssr: false });
const LogicAnalyser = dynamic(() => import("./instruments/LogicAnalyser").then((m) => m.LogicAnalyser), { ssr: false });
const Plotter = dynamic(() => import("./instruments/Plotter").then((m) => m.Plotter), { ssr: false });

type ProbeClient = ReturnType<typeof createProbeClient>;
type KindKey = keyof Messages["instruments"]["kind"];

export interface InstrumentDockProps {
  doc: DocStore;
  run: RunStore;
  ui: UiStore;
  sim: SimHost;
  messages: Messages["instruments"];
  fidelity: Messages["fidelity"];
  /** The strings of the I2C scan; the scan is left out without them. */
  faults?: Messages["faults"];
  lang: Locale;
  /** True while a shared run in a room is running or paused; changing the tolerance would halt it. */
  sharedRunActive?: boolean;
}

const KINDS: readonly { kind: InstrumentKind; key: KindKey; settings?: Record<string, unknown> }[] = [
  { kind: "multimeter", key: "multimeter" },
  { kind: "voltmeter", key: "voltmeter", settings: { mode: "dc-volts" } },
  { kind: "ammeter", key: "ammeter", settings: { mode: "dc-amps" } },
  { kind: "oscilloscope", key: "oscilloscope" },
  { kind: "logic-analyzer", key: "logicAnalyser" },
  { kind: "serial-plotter", key: "serialPlotter" },
  { kind: "serial-monitor", key: "serialMonitor" },
];

const KIND_KEY = Object.fromEntries(KINDS.map(({ kind, key }) => [kind, key])) as Record<InstrumentKind, KindKey>;
const TOLERANCE_MODES: readonly Exclude<ToleranceMode, "corners">[] = ["nominal", "seeded"];
const DEFAULT_CAPACITY = 4096;
const WINDOW_ROWS = 1000;
const NS_PER_S = 1e9;

const pointKey = (p: { c: string; p: string }): string => `${p.c}.${p.p}`;

/** A probe on a net for the length of the panel's life; the run re-adds it because a new run clears all probes. */
function useProbe(client: ProbeClient, id: string, net: string | undefined): void {
  useEffect(() => {
    if (!net) return;
    client.add({ id, kind: "voltage", target: net, capacity: DEFAULT_CAPACITY, envelope: false }).catch(() => undefined);
    return () => client.remove(id);
  }, [client, id, net]);
}

function appendChunk(prev: TraceChunk | null, next: TraceChunk, capacity: number): TraceChunk {
  if (!prev) return next;
  const keep = Math.max(0, Math.min(prev.t.length, capacity - next.t.length));
  const join = (a: Float64Array, b: Float64Array) => {
    const out = new Float64Array(keep + b.length);
    out.set(a.subarray(a.length - keep));
    out.set(b, keep);
    return out;
  };
  return { ...next, from: prev.from, t: join(prev.t, next.t), v: join(prev.v, next.v), dropped: prev.dropped + next.dropped + Math.max(0, prev.t.length - keep) };
}

function useTrace(client: ProbeClient, id: string, capacity: number): Record<string, TraceChunk> {
  const chunk = client.useChunks(id);
  const [trace, setTrace] = useState<TraceChunk | null>(null);
  const seen = useRef<TraceChunk | null>(null);
  useEffect(() => {
    if (!chunk || seen.current === chunk) return;
    seen.current = chunk;
    setTrace((prev) => appendChunk(prev, chunk, capacity));
  }, [chunk, capacity]);
  return useMemo(() => (trace ? { [id]: trace } : {}), [id, trace]);
}

function metersOf(client: ProbeClient, instrument: Instrument, black: string | undefined): Reading | null {
  const red = client.useReading(`${instrument.id}:red`);
  const other = client.useReading(`${instrument.id}:black`);
  const mode = (instrument.settings as { mode?: string } | undefined)?.mode ?? "dc-volts";
  if (mode !== "dc-volts" || !red || typeof red.value !== "number") return null;
  if (!black) return red;
  if (!other || typeof other.value !== "number") return null;
  return { ...red, value: red.value - other.value };
}

interface PanelProps {
  instrument: Instrument;
  doc: DocStore;
  run: RunStore;
  client: ProbeClient;
  points: ProbePoint[];
  editable: boolean;
  messages: Messages["instruments"];
  fidelity: Messages["fidelity"];
  lang: Locale;
}

function MeterPanel({ instrument, doc, client, points, editable, messages, fidelity, lang }: PanelProps) {
  const settings = (instrument.settings ?? {}) as { blackPin?: string };
  const blackPoint = points.find((p) => p.target.pin && pointKey(p.target.pin) === settings.blackPin);
  useProbe(client, `${instrument.id}:red`, instrument.target?.net);
  useProbe(client, `${instrument.id}:black`, blackPoint?.target.net);
  const reading = metersOf(client, instrument, blackPoint?.target.net);
  const meterPoints = useMemo(
    () => points.flatMap((p) => (p.target.pin ? [{ pin: p.target.pin, label: p.label, net: p.target.net ?? "", element: p.target.component }] : [])),
    [points],
  );
  return (
    <Multimeter
      instrument={instrument}
      points={meterPoints}
      reading={reading}
      editable={editable}
      onChange={(next) => doc.commit([{ k: "instrument.set", instrument: { ...instrument, ...next } }], { label: "Change instrument" })}
      messages={messages}
      fidelity={fidelity}
      lang={lang}
    />
  );
}

function CapturePanel({ instrument, doc, run, client, messages, lang }: PanelProps) {
  const id = instrument.id;
  const [capacity, setCapacity] = useState(DEFAULT_CAPACITY);
  useProbe(client, id, instrument.target?.net);
  const chunks = useTrace(client, id, capacity);
  const nowNs = useStoreSelector(run, (s) => s.tNs);
  const paused = useStoreSelector(run, (s) => s.phase === "paused");
  const revision = useStoreSelector(doc, (s) => s.revision);
  const seed = useStoreSelector(doc, (s) => s.state.simulation.seed);
  const meta = useMemo<CsvMeta>(() => ({ docHash: `r${revision}`, seed, versions: {}, provenance: {} }), [revision, seed]);
  const props = { channels: [{ id, kind: "analog" as const }], chunks, nowNs, paused, capacity, onCapacity: setCapacity, meta, messages, lang };
  return instrument.kind === "logic-analyzer" ? <LogicAnalyser {...props} /> : <Scope {...props} />;
}

function PlotterPanel({ run, messages, lang }: PanelProps) {
  const [store] = useState<PlotStore>(createPlotStore);
  const serial = useStoreSelector(run, (s) => s.serial);
  const paused = useStoreSelector(run, (s) => s.phase === "paused");
  const fed = useRef(-1);
  useEffect(() => {
    for (const entry of serial) {
      if (entry.id <= fed.current) continue;
      fed.current = entry.id;
      if (entry.kind === "out") store.push(entry.tNs, entry.text);
    }
  }, [serial, store]);
  return <Plotter store={store} paused={paused} windowRows={WINDOW_ROWS} messages={messages} lang={lang} />;
}

function SerialMonitorPanel({ ui, messages, lang }: { ui: UiStore; messages: Messages["instruments"]; lang: Locale }) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/instruments`), [lang, messages]);
  return (
    <Button size="sm" onClick={() => ui.set("dock", "serial")}>
      {t("kind.serialMonitor")}
    </Button>
  );
}

function targetMissing(state: Project, instrument: Instrument): boolean {
  const target = instrument.target;
  if (!target) return false;
  const parts = [...state.boards, ...state.components];
  return (
    (target.net !== undefined && !state.nets.some((n) => n.id === target.net)) ||
    (target.pin !== undefined && !parts.some((p) => p.id === target.pin!.c)) ||
    (target.component !== undefined && !parts.some((p) => p.id === target.component))
  );
}

function InstrumentRow(props: PanelProps & { ui: UiStore; state: Project; startedAtMs: number | null; onRemove(): void }) {
  const { instrument, state, editable, messages, lang, ui, startedAtMs, onRemove } = props;
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/instruments`), [lang, messages]);
  const [open, setOpen] = useState(true);
  const panelId = `instrument-${instrument.id}`;
  const missing = targetMissing(state, instrument);
  const name = t(`kind.${KIND_KEY[instrument.kind]}`);
  const key = `${instrument.id}:${startedAtMs ?? "idle"}`;

  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-lg bg-sunken p-2" data-testid="instrument">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Icon name={open ? "chevron-down" : "chevron-right"} size={16} aria-hidden="true" />
          <span className="truncate">{name}</span>
          {missing ? <span className="font-normal text-warn">{t("dock.targetMissing")}</span> : null}
        </button>
        <Button size="sm" variant="ghost" disabled={!editable} title={editable ? undefined : t("dock.viewerOnly")} aria-label={`${t("dock.remove")}: ${name}`} onClick={onRemove}>
          {t("dock.remove")}
        </Button>
      </div>
      <div id={panelId} hidden={!open} className="min-w-0 px-2 pb-2">
        {open && !missing ? (
          instrument.kind === "multimeter" || instrument.kind === "voltmeter" || instrument.kind === "ammeter" ? (
            <MeterPanel key={key} {...props} />
          ) : instrument.kind === "oscilloscope" || instrument.kind === "logic-analyzer" ? (
            <CapturePanel key={key} {...props} />
          ) : instrument.kind === "serial-plotter" ? (
            <PlotterPanel key={key} {...props} />
          ) : (
            <SerialMonitorPanel ui={ui} messages={messages} lang={lang} />
          )
        ) : null}
      </div>
    </li>
  );
}

function AddInstrument({ points, disabled, reason, messages, lang, onAdd }: { points: ProbePoint[]; disabled: boolean; reason?: string; messages: Messages["instruments"]; lang: Locale; onAdd(kind: (typeof KINDS)[number], point: ProbePoint): void }) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/instruments`), [lang, messages]);
  const [kind, setKind] = useState<(typeof KINDS)[number] | null>(null);
  const [pointId, setPointId] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);

  const items: MenuItem[] = KINDS.map((k) => ({ id: k.kind, label: t(`kind.${k.key}`), onSelect: () => setKind(k) }));
  const point = points.find((p) => p.id === pointId);
  const done = () => {
    setKind(null);
    setPointId("");
    requestAnimationFrame(() => trigger.current?.focus());
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Menu
        label={t("dock.pickKind")}
        items={items}
        align="start"
        trigger={
          <Button ref={trigger} size="sm" variant="primary" disabled={disabled} title={reason}>
            <Icon name="sliders" size={16} />
            {t("dock.add")}
          </Button>
        }
      />
      {kind ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!point) return;
            onAdd(kind, point);
            done();
          }}
          onKeyDown={(e) => e.key === "Escape" && done()}
        >
          <Select label={`${t(`kind.${kind.key}`)}: ${t("dock.pickPoint")}`} value={pointId} onChange={(e) => setPointId(e.target.value)} autoFocus>
            <option value="">{t("dock.pickPoint")}</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
          <Button type="submit" size="sm" variant="primary" disabled={!point}>
            {t("dock.add")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function InstrumentDock({ doc, run, ui, sim, messages, fidelity, faults, lang, sharedRunActive = false }: InstrumentDockProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/instruments`), [lang, messages]);
  const state = useStoreSelector(doc, (s) => s.state);
  const readOnly = useStoreSelector(doc, (s) => s.readOnly);
  const startedAtMs = useStoreSelector(run, (s) => s.startedAtMs);
  const hasRun = useStoreSelector(run, (s) => s.phase !== "idle" && s.phase !== "starting");
  const client = useMemo(() => createProbeClient(sim), [sim]);
  const points = useMemo(() => listProbePoints(state), [state]);
  const [failure, setFailure] = useState<string | null>(null);
  const instruments = state.simulation.instruments ?? [];
  const editable = !readOnly;

  const commit = useCallback(
    (op: Parameters<DocStore["commit"]>[0][number], label: string) => {
      const result = doc.commit([op], { label });
      setFailure(result.ok ? null : result.message);
    },
    [doc],
  );

  const mode = ((state.simulation.solver.options ?? {}) as { toleranceMode?: ToleranceMode }).toleranceMode ?? "nominal";
  const toleranceLocked = !editable || sharedRunActive;
  const full = instruments.length >= MAX_INSTRUMENTS;

  return (
    <section aria-label={t("dock.title")} className="flex min-w-0 flex-col gap-2" data-testid="instrument-dock">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <AddInstrument
          points={points}
          disabled={!editable || full}
          reason={editable ? undefined : t("dock.viewerOnly")}
          messages={messages}
          lang={lang}
          onAdd={(kind, point) => commit(makeInstrumentOp(kind.kind, point.target, kind.settings), "Add instrument")}
        />
        <Select
          label={t("tolerance.label")}
          value={mode}
          disabled={toleranceLocked}
          hint={sharedRunActive ? t("tolerance.runActive") : readOnly ? t("dock.viewerOnly") : undefined}
          onChange={(e) => commit(setToleranceOp(state, e.target.value as ToleranceMode), "Change part tolerance")}
        >
          {TOLERANCE_MODES.map((m) => (
            <option key={m} value={m}>
              {t(`tolerance.${m}`)}
            </option>
          ))}
        </Select>
      </div>
      {failure ? (
        <Callout tone="danger" live>
          {failure}
        </Callout>
      ) : null}
      {instruments.length === 0 ? (
        <EmptyState icon="empty" title={t("dock.empty")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {instruments.map((instrument) => (
            <InstrumentRow
              key={instrument.id}
              instrument={instrument}
              doc={doc}
              run={run}
              ui={ui}
              state={state}
              client={client}
              points={points}
              editable={editable}
              startedAtMs={startedAtMs}
              messages={messages}
              fidelity={fidelity}
              lang={lang}
              onRemove={() => commit(removeInstrumentOp(instrument.id), "Remove instrument")}
            />
          ))}
        </ul>
      )}
      {faults ? <I2cScan scan={() => sim.i2cScan()} disabled={!hasRun} messages={faults} lang={lang} /> : null}
    </section>
  );
}

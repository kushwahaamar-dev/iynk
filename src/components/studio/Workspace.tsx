"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Button, Callout, Dialog, EmptyState, Icon, Kbd, Skeleton } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { check } from "@/lib/interp";
import { appEventLog } from "@/local/events";
import type { Diagnostic } from "@/lib/interp/errors";
import { buildPartIndex } from "@/parts/search";
import { builtinRegistry } from "@/parts/builtin";
import { fallbackSpec } from "@/parts/fallback";
import { classifyImpact } from "@/project/opImpact";
import { readDiagnoseSpec } from "@/sim/faults/seal";
import { loadRegistry } from "@/sim/registry/entries";
import { staticTier } from "@/studio/fidelity/static-tier";
import { createArtProvider } from "@/studio/art/figure-art";
import { registerFaultCommands, type FaultAction } from "@/studio/commands";
import { STUDIO_KEYS, installKeymap } from "@/studio/commands/keymap";
import { registerHistoryCommands } from "@/studio/commands/history";
import { firstFirmwareSource } from "@/studio/code/sources";
import { airWires } from "@/studio/engine/air-wires";
import { createSceneController, type OverlayProviders, type SceneController } from "@/studio/engine/controller";
import { createEditorEngine, type EditorEngine } from "@/studio/engine/engine";
import { slopFor } from "@/studio/engine/hit";
import { derivePartStates, pinLevels } from "@/studio/engine/part-state";
import { createSvgRenderer } from "@/studio/engine/svg-renderer";
import { focusNetOverlay } from "@/studio/overlays/netlist";
import { stateOverlays } from "@/studio/overlays/state";
import { resolvePart } from "@/studio/parts-view";
import { problemOverlays } from "@/studio/overlays/netlist";
import { collectProblems, nextProblem, staticProblems, type Problem } from "@/studio/problems";
import { staticFlags, type WireEndRef } from "@/studio/rules/connect";
import { navigate } from "@/studio/router";
import { createDiagnoseStore, type DiagnoseStore } from "@/studio/stores/diagnose";
import type { DocStore, SaveChip } from "@/studio/stores/doc";
import { createRunStore, type RunStore } from "@/studio/stores/run";
import { useStoreSelector } from "@/studio/stores/select";
import { createSessionStore, type SessionStore } from "@/studio/stores/session";
import { createUiStore, type UiStore } from "@/studio/stores/ui";
import { createToolHost, type ToolHost } from "@/studio/tools/host";
import { commitWirePick, createAnnouncer, type Announcer } from "@/studio/tools/keyboard";
import { createPlaceTool, type PlaceTool } from "@/studio/tools/place";
import { createSelectTool } from "@/studio/tools/select";
import type { ToolCtx } from "@/studio/tools/types";
import { createWireTool } from "@/studio/tools/wire";
import { CanvasView } from "./CanvasView";
import { CodeDock } from "./CodeDock";
import type { FaultDockProps, FaultRequest } from "./FaultDock";
import { Inspector } from "./Inspector";
import { LiveRegion } from "./LiveRegion";
import { InstrumentDock } from "./InstrumentDock";
import { ModelsPanel } from "./ModelsPanel";
import { Outline } from "./Outline";
import { Palette } from "./Palette";
import { PinPicker } from "./PinPicker";
import { FirmwareMode, type RuntimeView } from "./FirmwareMode";
import { Problems } from "./Problems";
import { RegionLayout } from "./RegionLayout";
import { RunBar } from "./RunBar";
import { SerialPane } from "./SerialPane";
import { StatusLine } from "./StatusLine";
import { StudioSettings, useReducedMotion } from "./StudioSettings";
import { TierChips, TierSummaryChip } from "./TierChips";
import { TopBar } from "./TopBar";
import { installDebugHook } from "./wiring/debugHook";
import { useOpenProject, type OpenStatus } from "./wiring/openProject";
import { linkRepository, type LinkNotice } from "./wiring/repositoryLink";
import { checkBlock, linkFaults, type FaultLink } from "./wiring/faultLink";
import { linkSim, type SimLink } from "./wiring/simLink";
import { useServices, type Services } from "./wiring/services";

export interface WorkspaceProps {
  projectId: string;
  autorun: boolean;
  messages: StudioMessages;
  lang: Locale;
}

const FaultDock = dynamic(() => import("./FaultDock").then((m) => m.FaultDock), {
  ssr: false,
  loading: () => <div className="min-h-32" aria-busy="true" />,
});

const registry = builtinRegistry();
const fidelityEntries = loadRegistry();
const EDITABLE = ".cm-editor, input, textarea, select, [contenteditable='true']";
const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

type Graph = {
  ui: UiStore;
  session: SessionStore;
  run: RunStore;
  engine: EditorEngine;
  tools: ToolHost;
  place: PlaceTool;
  announcer: Announcer;
  link: SimLink;
  diagnose: DiagnoseStore;
  faults: FaultLink;
  controller: SceneController;
  toolCtx(): ToolCtx;
  dispose(): void;
};

type GraphInput = {
  doc: DocStore;
  services: Services;
  projectId: string;
  lang: Locale;
  messages: StudioMessages;
  reduceMotion: () => boolean;
  onNotice: (notice: LinkNotice) => void;
};

function focusKind(): "canvas" | "code" | "other" {
  const el = document.activeElement;
  // Text fields and the code editor keep their own undo.
  if (el?.closest(EDITABLE)) return "code";
  return el?.closest("[role=application]") ? "canvas" : "other";
}

/**
 * Creates the stores, the engine and the links for one open project. `dispose` undoes them in the reverse order. The
 * keymap and the scene controller need the mounted canvas, so the workspace starts them once it is on the page.
 */
function buildGraph({ doc, services, projectId, lang, messages, reduceMotion, onNotice }: GraphInput): Graph {
  const state = doc.getState().state;
  const session = createSessionStore((state.views.find((v) => v.kind === "breadboard") ?? state.views[0])?.id ?? "");
  const ui = createUiStore(projectId);
  const run = createRunStore();

  const tools = createToolHost({ doc, session });
  const place = createPlaceTool({ registry, session });
  tools.register(createSelectTool({ setSelection: session.setSelection, setFocusNet: session.setFocusNet, setStatus: session.setStatus }));
  tools.register(place);
  tools.register(createWireTool({ setStatus: session.setStatus }));

  const renderer = createSvgRenderer();
  const engine = createEditorEngine({
    doc,
    session,
    renderer,
    art: createArtProvider({ spec: (ref) => (registry.latest(ref) ? fallbackSpec(registry.latest(ref)!) : null) }),
    resolve: (ref) => resolvePart(doc.getState().state, ref),
    host: tools,
    snapMm: () => ui.getState().snapMm,
    artMode: () => ui.getState().artMode,
    mountOptions: { locale: lang, theme: "light", reduceMotion: reduceMotion() },
  });

  const toolCtx = (): ToolCtx => {
    const view = doc.getState();
    const current = view.state.views.find((v) => v.id === session.getState().viewId);
    if (!current) throw new Error("The project has no view to edit.");
    return {
      doc: view,
      view: current,
      viewport: engine.viewport(),
      scene: engine.scene(),
      selection: session.getState().selection,
      snapMm: ui.getState().snapMm,
      hit: (ev) => engine.hit(ev.xPx, ev.yPx, slopFor(ev.pointerType)),
      resolve: (ref) => resolvePart(view.state, ref),
    };
  };

  const announcer = createAnnouncer();
  const offHistory = registerHistoryCommands({ doc, focus: focusKind });
  const debug = installDebugHook({ doc, run, announcer, tools: tools.recent });
  const offRepository = linkRepository(doc, debug.wrapHost(services.host), { onNotice });
  const link = linkSim({ doc, run, host: services.sim, impact: classifyImpact });

  let chipBeforeLock: SaveChip | null = null;
  const unlock = () => {
    if (chipBeforeLock !== null) doc.setSaveChip(chipBeforeLock);
    chipBeforeLock = null;
  };
  const diagnose = createDiagnoseStore({
    log: appEventLog(),
    clock: () => Math.round(performance.now()),
    setReadOnly(reason) {
      if (reason === null) return unlock();
      chipBeforeLock ??= doc.getState().saveChip;
      doc.setSaveChip("read-only");
    },
    applyOps(ops) {
      const done = doc.commit(ops, { label: "Fix" });
      return done.ok ? { ok: true } : { ok: false, message: done.message };
    },
    fault: (id) => doc.getState().state.simulation.faults.find((f) => f.id === id),
  });
  const item = readDiagnoseSpec(state);
  if (item.ok && item.value) diagnose.start({ spec: item.value, projectId: state.id });
  const faults = linkFaults({ doc, sim: services.sim, diagnose });

  const viewId = () => session.getState().viewId;
  const faultLabel = createTranslator(lang, messages.faults, `${lang}/faults`)("check.title");
  const overlays: OverlayProviders = {
    net: () => {
      const current = doc.getState().state;
      const found = staticProblems(current, faults.store.getState().findings, { sealedUnrevealed: diagnose.isSealedUnrevealed() });
      return [
        ...focusNetOverlay(current, viewId(), session.getState().focusNet, engine.scene()),
        ...problemOverlays(current, viewId(), found.problems, engine.scene(), faultLabel),
      ];
    },
    state: () => {
      const { frame } = run.getState();
      if (!frame) return [];
      const current = doc.getState().state;
      return stateOverlays(engine.scene(), derivePartStates(current, frame), pinLevels(current, frame), {
        reduceMotion: reduceMotion(),
        labels: messages.studioRun.overlay,
      });
    },
    air: () =>
      airWires(doc.getState().state, viewId(), engine.scene()).map((wire, i) => ({
        id: `air:${i}`,
        xMm: wire.a.x,
        yMm: wire.a.y,
        elements: [{ t: "path", d: `M0 0 L${wire.b.x - wire.a.x} ${wire.b.y - wire.a.y}`, stroke: "var(--studio-ink)", sw: 0.3 }],
      })),
  };
  const controller = createSceneController({ doc, session, ui, run, engine, renderer, overlays });

  return {
    ui,
    session,
    run,
    engine,
    tools,
    place,
    announcer,
    link,
    diagnose,
    faults,
    controller,
    toolCtx,
    dispose() {
      faults.dispose();
      unlock();
      link.stop();
      link.dispose();
      offRepository();
      debug.dispose();
      offHistory();
    },
  };
}

/** The code the interpreter finds fault with in the firmware, checked a moment after typing stops. */
function useFirmwareDiagnostics(doc: DocStore): Diagnostic[] {
  const source = useStoreSelector(doc, (s) => firstFirmwareSource(s.state), (a, b) => a?.id === b?.id && a?.content === b?.content);
  const content = useDeferredValue(source?.content);
  const language = source?.language;
  return useMemo(() => (content === undefined || language !== "arduino-cpp" ? [] : check({ board: "uno-r3", language: "arduino", source: content })), [content, language]);
}

function useProblems(doc: DocStore, run: RunStore, diagnostics: Diagnostic[], faults: FaultLink, diagnose: DiagnoseStore): Problem[] {
  const state = useDeferredValue(useStoreSelector(doc, (s) => s.state));
  const limit = useStoreSelector(run, (s) => s.limit);
  const frame = useStoreSelector(run, (s) => s.frame);
  const findings = useStoreSelector(faults.store, (s) => s.findings);
  const sealedUnrevealed = useStoreSelector(diagnose, () => diagnose.isSealedUnrevealed());
  const flags = useMemo(() => staticFlags(state, state.nets.map((n) => n.id)), [state]);
  return useMemo(
    () => [...collectProblems({ diagnostics, run: { limit, frame }, flags }), ...staticProblems(state, findings, { sealedUnrevealed }).problems],
    [diagnostics, limit, frame, flags, state, findings, sealedUnrevealed],
  );
}

function useFaultCommands(ui: UiStore): FaultRequest | null {
  const [request, setRequest] = useState<FaultRequest | null>(null);
  useEffect(
    () =>
      registerFaultCommands(
        (action: FaultAction) => {
          ui.set("dock", "faults");
          setRequest((now) => ({ action, n: (now?.n ?? 0) + 1 }));
        },
        () => true,
      ),
    [ui],
  );
  return request;
}

/** Mounts the fault dock the first time its tab is opened, so the chunk costs nothing before that. */
function FaultsPanel(props: FaultDockProps) {
  const open = useStoreSelector(props.ui, (s) => s.dock === "faults");
  const [seen, setSeen] = useState(open);
  if (open && !seen) setSeen(true);
  return seen ? <FaultDock {...props} /> : null;
}

function FidelityChips({ doc, ui, messages, lang }: { doc: DocStore; ui: UiStore; messages: StudioMessages; lang: Locale }) {
  const state = useDeferredValue(useStoreSelector(doc, (s) => s.state));
  const fidelity = useMemo(() => staticTier(state, fidelityEntries), [state]);
  const t = useMemo(() => createTranslator(lang, messages.fidelity, `${lang}/fidelity`), [lang, messages.fidelity]);
  if (fidelity.layers.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="tier-chips">
      <TierSummaryChip fidelity={fidelity} t={t} />
      <TierChips fidelity={fidelity} t={t} onOpenLayer={() => ui.set("rightRail", "models")} />
    </div>
  );
}

function FirmwareControl({ doc, messages, lang }: { doc: DocStore; messages: StudioMessages; lang: Locale }) {
  const runtimes = useStoreSelector(doc, (s) => s.state.simulation.runtimes);
  const boards = useStoreSelector(doc, (s) => s.state.boards);
  const assets = useStoreSelector(doc, (s) => s.state.assets);
  const t = useMemo(() => createTranslator(lang, messages.fidelity, `${lang}/fidelity`), [lang, messages.fidelity]);
  const runtime = runtimes[0];
  const board = boards.find((b) => b.id === runtime?.board);
  if (!runtime || !board) return null;
  const view: RuntimeView = { id: runtime.id, board: runtime.board, boardRef: board.definition.ref, engine: runtime.engine, options: runtime.options };
  return <FirmwareMode runtime={view} assets={assets} t={t} onChange={(ops) => doc.commit(ops, { label: t("firmware.firmware") })} />;
}

function ModelsTab({ doc, messages }: { doc: DocStore; messages: StudioMessages }) {
  const state = useStoreSelector(doc, (s) => s.state);
  return <ModelsPanel state={state} messages={messages.studioModels} />;
}

function FilesTab({ doc, ui, messages }: { doc: DocStore; ui: UiStore; messages: StudioMessages }) {
  const t = messages.studio.workspace.files;
  const sources = useStoreSelector(doc, (s) => s.state.sources);
  if (sources.length === 0) return <EmptyState icon="empty" title={t.empty} />;
  return (
    <section aria-label={t.title} className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{t.title}</h3>
      <ul className="flex flex-col gap-1">
        {sources.map((source) => (
          <li key={source.id}>
            <Button variant="ghost" size="sm" className="w-full justify-start" title={t.open.replace("{path}", source.path)} onClick={() => ui.set("dock", "code")}>
              <Icon name="code" size={16} />
              {source.path}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const modifierName = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "Cmd" : "Ctrl");

function KeysDialog({ open, onClose, messages, lang }: { open: boolean; onClose: () => void; messages: StudioMessages; lang: Locale }) {
  const t = messages.studio.workspace.keys;
  const label = useMemo(() => createTranslator(lang, messages.studioWire, `${lang}/studioWire`) as (key: string) => string, [lang, messages.studioWire]);
  return (
    <Dialog open={open} onClose={onClose} title={t.title} description={t.hint} closeLabel={t.close} size="lg">
      <dl className="flex flex-col gap-2">
        {STUDIO_KEYS.map((def) => (
          <div key={def.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <dt>{label(def.labelKey.replace(/^studioWire\./, ""))}</dt>
            <dd className="flex flex-wrap gap-2">
              {def.keys.map((chord) => (
                <span key={chord} className="flex gap-1">
                  {chord.split("+").map((part, i) => (
                    <Kbd key={i}>{part === "Mod" ? modifierName() : part}</Kbd>
                  ))}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}

function Notices({ notices, name, messages, onDismiss }: { notices: readonly LinkNotice[]; name: string; messages: StudioMessages; onDismiss: (notice: LinkNotice) => void }) {
  const { banner, workspace } = messages.studio;
  const copy: Record<LinkNotice, { tone: "warn" | "danger"; title: string; text: string }> = {
    recovered: { tone: "warn", title: banner.recoveredTitle, text: banner.recovered.replace("{name}", name) },
    lost: { tone: "danger", title: banner.lostTitle, text: banner.lost.replace("{name}", name) },
    degraded: { tone: "warn", title: banner.degradedTitle, text: banner.degraded },
    hash_mismatch: { tone: "warn", title: workspace.hashMismatchTitle, text: workspace.hashMismatch },
  };
  return notices.map((notice) => (
    <div key={notice} className="mt-2 flex items-start gap-2">
      <Callout tone={copy[notice].tone} title={copy[notice].title} live className="min-w-0 flex-1">
        {copy[notice].text}
      </Callout>
      <Button size="sm" variant="ghost" onClick={() => onDismiss(notice)}>
        {banner.dismiss}
      </Button>
    </div>
  ));
}

function NotOpened({ status, error, messages }: { status: Exclude<OpenStatus, "loading" | "ready" | "recovered">; error?: string; messages: StudioMessages }) {
  const t = messages.studio.workspace;
  const copy = {
    missing: { title: t.missingTitle, text: t.missing },
    lost: { title: t.lostTitle, text: t.lost },
    error: { title: t.errorTitle, text: t.error },
  }[status];
  return (
    <div role="region" aria-label={messages.studio.shell.workspace} className="mx-auto flex max-w-xl flex-col items-start gap-4 p-4 py-16">
      <h2 className="text-balance text-2xl font-semibold">{copy.title}</h2>
      <p className="text-pretty text-muted">{copy.text}</p>
      {status === "error" && error ? <p className="text-sm text-muted">{error}</p> : null}
      <Button variant="primary" onClick={() => navigate({ kind: "home" })}>
        <Icon name="chevron-left" size={16} />
        {t.back}
      </Button>
    </div>
  );
}

type RegionsProps = {
  graph: Graph;
  doc: DocStore;
  sim: Services["sim"];
  messages: StudioMessages;
  lang: Locale;
  notices: readonly LinkNotice[];
  onDismiss: (notice: LinkNotice) => void;
  onPlaceAtCentre: (ref: string) => void;
  /** Where the newest problem list and the one the person last went to are kept for the F8 keys. */
  problemsRef: MutableRefObject<Problem[]>;
  currentProblemRef: MutableRefObject<string | null>;
};

function Regions({ graph, doc, sim, messages, lang, notices, onDismiss, onPlaceAtCentre, problemsRef, currentProblemRef }: RegionsProps) {
  const { ui, session, run, engine, tools, place, link, controller } = graph;
  const t = messages.studio;
  const title = useStoreSelector(doc, (s) => s.state.meta.title);
  const readOnly = useStoreSelector(doc, (s) => s.readOnly);
  const armed = useStoreSelector(session, (s) => s.armedPart);
  const diagnostics = useFirmwareDiagnostics(doc);
  const problems = useProblems(doc, run, diagnostics, graph.faults, graph.diagnose);
  const faultsView = useStoreSelector(graph.faults.store, (s) => s);
  const sealed = useStoreSelector(graph.diagnose, () => graph.diagnose.isSealedUnrevealed());
  const faultRequest = useFaultCommands(ui);
  const partIndex = useMemo(() => buildPartIndex(registry), []);

  useEffect(() => {
    problemsRef.current = problems;
  }, [problems, problemsRef]);

  return (
    <RegionLayout
      ui={ui}
      messages={t}
      top={
        <>
          <TopBar doc={doc} run={run} link={link} settings={<StudioSettings ui={ui} messages={messages.studioHome} />} messages={t} modelMessages={messages.studioModels} />
          <FidelityChips doc={doc} ui={ui} messages={messages} lang={lang} />
          {readOnly ? (
            <Callout tone="note" title={t.workspace.readOnlyTitle} className="mt-2">
              {t.workspace.readOnly}
            </Callout>
          ) : null}
          <Notices notices={notices} name={title} messages={messages} onDismiss={onDismiss} />
        </>
      }
      left={{
        palette: (
          <Palette
            index={partIndex}
            armed={armed}
            onArm={(ref) => {
              place.armPart(ref);
              tools.setTool("place");
            }}
            onPlaceAtCentre={onPlaceAtCentre}
            messages={messages.studioEdit}
            lang={lang}
          />
        ),
        files: <FilesTab doc={doc} ui={ui} messages={messages} />,
        outline: <Outline doc={doc} session={session} messages={messages.studioWire} lang={lang} />,
      }}
      centre={
        <div className="flex min-h-0 flex-1 flex-col">
          <CanvasView engine={engine} controller={controller} messages={t} />
          <StatusLine status={controller.status} session={session} run={run} ui={ui} messages={t} runMessages={messages.studioRun} lang={lang} />
        </div>
      }
      right={{
        inspector: <Inspector doc={doc} session={session} messages={messages.studioInspect} modelMessages={messages.studioModels} lang={lang} />,
        problems: (
          <Problems
            problems={problems}
            onJump={(problem) => {
              currentProblemRef.current = problem.id;
              ui.set("dock", "code");
            }}
            messages={messages.studioCode}
            faultMessages={messages.faults}
            lang={lang}
            onCheck={() => void graph.faults.check()}
            checkDisabled={checkBlock(sealed, faultsView)}
            counts={{ skipped: Object.values(faultsView.skipped).reduce((n, reasons) => n + Object.values(reasons).reduce((a, b) => a + b, 0), 0), errors: faultsView.errors.length }}
          />
        ),
        models: <ModelsTab doc={doc} messages={messages} />,
      }}
      dock={{
        code: <CodeDock doc={doc} ui={ui} diagnostics={diagnostics} onRun={() => void link.run()} messages={messages.studioCode} />,
        serial: (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            <RunBar run={run} link={link} messages={messages.studioRun} instruments={messages.instruments} lang={lang} firmware={<FirmwareControl doc={doc} messages={messages} lang={lang} />} />
            <SerialPane run={run} link={link} messages={messages.studioRun} lang={lang} />
            <InstrumentDock doc={doc} run={run} ui={ui} sim={sim} messages={messages.instruments} fidelity={messages.fidelity} faults={messages.faults} lang={lang} />
          </div>
        ),
        faults: (
          <FaultsPanel
            ui={ui}
            doc={doc}
            run={run}
            diagnose={graph.diagnose}
            faults={graph.faults}
            restart={() => void link.restart()}
            request={faultRequest}
            messages={messages.faults}
            lang={lang}
          />
        ),
      }}
    />
  );
}

type OpenWorkspaceProps = WorkspaceProps & { doc: DocStore; recovered: boolean };

function OpenWorkspace({ doc, recovered, projectId, autorun, messages, lang }: OpenWorkspaceProps) {
  const services = useServices();
  const reduceMotion = useReducedMotion();
  const reduceMotionNow = useRef(reduceMotion);
  const root = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const problemsRef = useRef<Problem[]>([]);
  const currentProblemRef = useRef<string | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [notices, setNotices] = useState<LinkNotice[]>(recovered ? ["recovered"] : []);
  const [wireFrom, setWireFrom] = useState<WireEndRef | null>(null);
  const [keysOpen, setKeysOpen] = useState(false);
  const title = useStoreSelector(doc, (s) => s.state.meta.title);

  useEffect(() => {
    reduceMotionNow.current = reduceMotion;
  });

  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | iynk`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  const focusCanvas = () => root.current?.querySelector<HTMLElement>("[role=application]")?.focus();

  // Declared before the effect that builds the graph, so on the way out this one stops what that one made.
  useEffect(() => {
    if (!graph) return;
    const { regions } = messages.studio.layout;
    const named = (label: string) => [...root.current!.querySelectorAll<HTMLElement>("[aria-label]")].find((el) => el.getAttribute("aria-label") === label);
    const focusIn = (label: string, selector: string) => {
      requestAnimationFrame(() => named(label)?.querySelector<HTMLElement>(selector)?.focus());
    };

    graph.controller.start();
    const redraw = () => graph.controller.rebuild();
    const offFaults = graph.faults.store.subscribe(redraw);
    const offDiagnose = graph.diagnose.subscribe(redraw);
    const offKeys = installKeymap(root.current!, {
      doc,
      session: graph.session,
      ui: graph.ui,
      host: graph.tools,
      announcer: graph.announcer,
      toolCtx: graph.toolCtx,
      view: {
        fit: graph.engine.fit,
        fitSelection: graph.engine.fitSelection,
        zoom: graph.engine.zoomBy,
        // The engine pans on Space by itself while the canvas has focus.
        pan() {},
      },
      focusPartSearch() {
        graph.ui.set("leftRail", "palette");
        focusIn(regions.left, "input[type=search]");
      },
      focusInspector() {
        graph.ui.set("rightRail", "inspector");
        focusIn(regions.right, "input:not([type=search])");
      },
      openPinPicker: setWireFrom,
      jumpProblem(dir) {
        const next = nextProblem(problemsRef.current, currentProblemRef.current, dir);
        if (!next) return;
        currentProblemRef.current = next.id;
        graph.ui.set("rightRail", "problems");
      },
      focusRegion(dir) {
        const order = [regions.top, regions.left, regions.canvas, regions.right, regions.dock].flatMap((label) => named(label) ?? []);
        if (order.length === 0) return;
        const at = order.findIndex((el) => el.contains(document.activeElement));
        const target = order[(at + dir + order.length) % order.length]!;
        (target.querySelector<HTMLElement>("[role=application]") ?? target.querySelector<HTMLElement>(FOCUSABLE))?.focus();
      },
      showKeys: () => setKeysOpen(true),
    });

    // The keys work from inside the workspace, so the canvas takes focus once it is on the page.
    const frame = requestAnimationFrame(() => {
      named(regions.canvas)?.querySelector<HTMLElement>("[role=application]")?.focus();
      if (autorun && !started.current) {
        started.current = true;
        void graph.link.run();
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      offKeys();
      offFaults();
      offDiagnose();
      graph.controller.stop();
    };
  }, [graph, doc, autorun, messages.studio.layout]);

  useEffect(() => {
    const made = buildGraph({
      doc,
      services,
      projectId,
      lang,
      messages,
      reduceMotion: () => reduceMotionNow.current,
      onNotice: (notice) => setNotices((now) => (now.includes(notice) ? now : [...now, notice])),
    });
    setGraph(made);
    return made.dispose;
  }, [doc, services, projectId, lang, messages]);

  function placeAtCentre(ref: string) {
    if (!graph) return;
    graph.place.armPart(ref);
    graph.tools.setTool("place");
    graph.tools.key({ key: "Enter", shift: false, alt: false, ctrl: false }, graph.toolCtx());
    focusCanvas();
  }

  return (
    <div ref={root} data-studio-slot="workspace">
      {graph ? (
        <>
          <Regions
            graph={graph}
            doc={doc}
            sim={services.sim}
            messages={messages}
            lang={lang}
            notices={notices}
            onDismiss={(notice) => setNotices((now) => now.filter((n) => n !== notice))}
            onPlaceAtCentre={placeAtCentre}
            problemsRef={problemsRef}
            currentProblemRef={currentProblemRef}
          />
          <LiveRegion announcer={graph.announcer} messages={messages} lang={lang} />
          {wireFrom ? (
            <PinPicker
              from={wireFrom}
              state={doc.getState().state}
              viewId={graph.session.getState().viewId}
              messages={messages.studioWire}
              lang={lang}
              onCancel={() => {
                setWireFrom(null);
                focusCanvas();
              }}
              onPick={(to) => {
                commitWirePick({ doc, session: graph.session, announcer: graph.announcer }, graph.toolCtx(), wireFrom, to);
                setWireFrom(null);
                focusCanvas();
              }}
            />
          ) : null}
          <KeysDialog open={keysOpen} onClose={() => setKeysOpen(false)} messages={messages} lang={lang} />
        </>
      ) : null}
    </div>
  );
}

export function Workspace(props: WorkspaceProps) {
  const { host } = useServices();
  const opened = useOpenProject(props.projectId, { host });

  if (opened.status === "loading") {
    return (
      <div role="status" aria-busy="true" aria-label={props.messages.studio.workspace.loading} className="p-4">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!opened.doc) return <NotOpened status={opened.status === "ready" || opened.status === "recovered" ? "error" : opened.status} error={opened.error} messages={props.messages} />;
  return <OpenWorkspace key={props.projectId} {...props} doc={opened.doc} recovered={opened.status === "recovered"} />;
}

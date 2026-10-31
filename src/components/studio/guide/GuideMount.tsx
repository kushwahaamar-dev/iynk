"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sendCommand } from "@/components/boardlab/AssemblyPanel";
import type { FigureHandle } from "@/components/figure/protocol";
import type { BridgeCommand } from "@/content/schema";
import { canonicalize } from "@/core/canonical";
import { sha256Hex } from "@/core/sha256";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { startChecks, stateMatches } from "@/lib/interp";
import { learnStore } from "@/lib/learn/facade";
import type { Project } from "@/project/generated/types";
import { toGuideRun, type GuideDeps } from "@/project/guided/engine";
import { readWireables } from "@/project/guided/plan";
import { emptyRecord, withLastRun, type LessonRun, type Tier } from "@/project/guided/record";
import { stripComments } from "@/project/guided/substance";
import { DMATH_VERSION } from "@/sim/core/dmath";
import { staticTier } from "@/studio/fidelity/static-tier";
import { assemblySteps, commandFor, type AssemblyStep } from "@/studio/guide/assembly";
import { checkRows, hintLevels } from "@/studio/guide/checks-model";
import { activeFaultIds } from "@/studio/guide/lesson-faults";
import { wireRows } from "@/studio/guide/wire";
import { inputsFor } from "@/studio/run/inputs";
import { statusFrom } from "@/studio/run/status";
import { navigate } from "@/studio/router";
import type { DocStore } from "@/studio/stores/doc";
import type { RunStore } from "@/studio/stores/run";
import { useStoreSelector } from "@/studio/stores/select";
import { START_LABEL } from "@/studio/fork";
import { LOCAL_ACTOR } from "@/studio/templates";
import { loadRegistry } from "@/sim/registry/entries";
import { TEMPLATES } from "../../../../content/projects";
import { FigureLens } from "../FigureLens";
import { InputsDock } from "../InputsDock";
import { StatusPanel } from "../StatusPanel";
import type { SimLink } from "../wiring/simLink";
import { restoreVersion } from "../wiring/repositoryLink";
import { AssemblyGuide } from "./AssemblyGuide";
import { ChecksView, type ChecksViewProps } from "./ChecksView";
import { FaultList } from "./FaultList";
import { GuideDock } from "./GuideDock";
import { LessonHints } from "./LessonHints";
import { LessonNav } from "./LessonNav";
import { progressOf, useLearnSnapshot } from "./lessonProgress";
import { runLessonTests } from "../lessonChecks";
import { textAt, templateOf, useGuide } from "./useGuide";
import { useLessonFaults } from "./useLessonFaults";
import { WireGuide } from "./WireGuide";

const fidelity = loadRegistry();
const ENGINE_VERSIONS = { dmath: String(DMATH_VERSION) };

const now = () => new Date().toISOString();

function tierOf(project: Project): Tier {
  const { summary } = staticTier(project, fidelity);
  return summary === "none" ? "T0" : summary;
}

export interface GuideMountProps {
  doc: DocStore;
  run: RunStore;
  link: SimLink;
  messages: Messages["studio"];
  lang: Locale;
}

type ChecksState = { status: ChecksViewProps["status"]; progress: number };

/** The Guide of an open project that has one: the lesson or tour, its checks, inputs, faults and figure. */
export function GuideMount({ doc, run, link, messages, lang }: GuideMountProps) {
  const project = useStoreSelector(doc, (s) => s.state);
  const guide = project.guide!;
  const store = useMemo(() => learnStore(), []);
  const snapshot = useLearnSnapshot();
  const readOnly = useStoreSelector(doc, (s) => s.readOnly);
  const phase = useStoreSelector(run, (s) => s.phase);
  const frame = useStoreSelector(run, (s) => s.frame);
  const templateId = templateOf(project);
  const template = TEMPLATES.find((entry) => entry.id === templateId);
  const tour = guide.kind === "tour";

  const [lessonRun, setLessonRun] = useState<LessonRun | null>(null);
  const [checks, setChecks] = useState<ChecksState>({ status: "idle", progress: 0 });
  const [inputValues, setInputValues] = useState<Record<string, number>>({});
  const [figure, setFigure] = useState<Record<string, unknown> | null>(null);
  const [lensOpen, setLensOpen] = useState(false);
  const checking = useRef<{ cancel(): void } | null>(null);
  const lens = useRef<FigureHandle | null>(null);
  const pendingShow = useRef<BridgeCommand | null>(null);

  const faults = useLessonFaults({
    doc,
    project,
    template,
    lang,
    labels: { trigger: messages.lesson.faults.trigger, repair: messages.lesson.faults.repair },
  });
  const activeFaults = useMemo(() => activeFaultIds(project), [project]);
  const guideRun = useMemo(() => toGuideRun(lessonRun), [lessonRun]);

  const deps = useMemo<GuideDeps>(
    () => ({
      sha256: sha256Hex,
      canonical: canonicalize,
      codeOnly: stripComments,
      stateMatches,
      connected: (a, b) => {
        const has = (net: Project["nets"][number], pin: { c: string; p: string }) => net.connections.some((end) => end.c === pin.c && end.p === pin.p);
        return doc.getState().state.nets.some((net) => has(net, a) && has(net, b));
      },
      partCount: (definition) => doc.getState().state.components.filter((c) => c.definition.ref === definition).length,
      // No lesson gate asks for a parameter to have moved from its default, so none can be judged.
      paramValue: () => undefined,
      legacyState: () => figure,
    }),
    [doc, figure],
  );

  const restoreStart = useCallback(async () => {
    const start = doc.getState().state.history.checkpoints.find((c) => c.label === START_LABEL);
    if (!start) throw new Error("The lesson has no starting version.");
    await restoreVersion(start.revision, messages.history.restore);
  }, [doc, messages.history.restore]);

  const view = useGuide({
    doc,
    store,
    run: guideRun,
    activeFaults,
    deps,
    locale: lang,
    localActor: LOCAL_ACTOR,
    engineVersions: ENGINE_VERSIONS,
    now,
    restoreStart,
  });

  useEffect(() => () => checking.current?.cancel(), []);

  function runChecks() {
    if (checking.current) return;
    const current = doc.getState().state;
    setChecks({ status: "running", progress: 0 });
    const started = runLessonTests(current, { run: startChecks, now, tierOf }, { onProgress: (progress) => setChecks({ status: "running", progress }) });
    checking.current = started;
    void started.result
      .then((result) => {
        if (checking.current !== started) return;
        setLessonRun(result);
        setChecks({ status: result.tests.some((t) => t.limit) ? "limit" : "done", progress: 1 });
        const lastRun = toGuideRun(result);
        if (lastRun) store.update(current.id, (r) => withLastRun(r ?? emptyRecord(current.id, lastRun.at, templateOf(current)), lastRun), lastRun.at);
      })
      .finally(() => {
        if (checking.current === started) checking.current = null;
      });
  }

  function cancelChecks() {
    checking.current?.cancel();
    checking.current = null;
    setChecks({ status: "idle", progress: 0 });
  }

  const onHandle = useCallback((handle: FigureHandle | null) => {
    lens.current = handle;
    if (handle && pendingShow.current) {
      sendCommand(handle, pendingShow.current);
      pendingShow.current = null;
    }
  }, []);

  function showStep(step: AssemblyStep) {
    const command = commandFor(step);
    if (command && lens.current) sendCommand(lens.current, command.send);
    else if (command) pendingShow.current = command.send;
    setLensOpen(true);
  }

  function setInput(id: string, value: number) {
    setInputValues((now) => ({ ...now, [id]: value }));
    link.setInput(id, value);
  }

  const specs = useMemo(() => inputsFor(project, lang, inputValues), [project, lang, inputValues]);
  const rows = useMemo(() => checkRows(project, lessonRun, lang), [project, lessonRun, lang]);
  const hints = useMemo(() => hintLevels(guide.hints ?? [], lang), [guide.hints, lang]);
  const wires = useMemo(() => wireRows(readWireables(project) ?? undefined, (guide.pins ?? []).map((p) => p.pin), lang), [project, guide.pins, lang]);
  const lensInputs = useMemo(
    () => Object.fromEntries(project.simulation.world.inputs.flatMap((input) => {
      const refdes = project.components.find((c) => c.id === input.component)?.refdes;
      return refdes === undefined ? [] : [[refdes, inputValues[input.id] ?? input.default] as const];
    })),
    [project, inputValues],
  );
  const pins = useMemo(() => Object.fromEntries(Object.entries(frame?.pins ?? {}).filter((entry): entry is [string, 0 | 1] => entry[1] === 0 || entry[1] === 1)), [frame]);
  const hasOffers = faults.offers.own.length + faults.offers.more.length + faults.offers.unmapped.length > 0;

  const slots = {
    checks: project.tests.length > 0 ? (
      <ChecksView rows={rows} status={checks.status} progress={checks.progress} tier={view.tier} faultOn={activeFaults.length > 0} onRun={runChecks} onCancel={cancelChecks} messages={messages} lang={lang} />
    ) : undefined,
    hints: hints.length > 0 ? <LessonHints levels={hints} opened={view.record?.hintsMax ?? 0} onOpen={view.openHint} messages={messages} lang={lang} /> : undefined,
    assembly: tour ? (
      <AssemblyGuide steps={assemblySteps(guide, view.steps, lang)} figureReady={figure !== null} onShow={showStep} onMark={view.markStep} onBreak={faults.breakFailure} messages={messages} />
    ) : undefined,
    wire: wires.length > 0 ? <WireGuide rows={wires} messages={messages} /> : undefined,
    inputs: specs.length > 0 ? <InputsDock specs={specs} onSet={setInput} messages={messages} lang={lang} disabled={readOnly || phase !== "running"} /> : undefined,
    status: tour ? undefined : <StatusPanel view={statusFrom(null)} messages={messages} lang={lang} />,
    faults: hasOffers ? <FaultList offers={faults.offers} active={activeFaults} onSet={faults.set} messages={messages} lang={lang} /> : undefined,
    lens: guide.legacyFigure ? (
      <FigureLens
        mode={tour ? "tour" : "view"}
        onHandle={onHandle}
        legacyFigure={guide.legacyFigure}
        state={{ view: guide.legacyFigure.circuit ? "breadboard" : "board", pins, params: {}, inputs: lensInputs, power: "usb", fault: faults.figureFault }}
        onFigureState={setFigure}
        title={textAt(guide.title, lang)}
        open={lensOpen}
        onToggle={() => setLensOpen((open) => !open)}
        messages={messages}
      />
    ) : undefined,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-2">
      {template ? (
        <LessonNav current={template.id} templates={TEMPLATES} lang={lang} progress={(id) => progressOf(snapshot, id)} onOpen={(id) => navigate({ kind: "template", id, run: false })} messages={messages} />
      ) : null}
      <GuideDock view={view} guide={guide} locale={lang} slots={slots} messages={messages} />
    </div>
  );
}

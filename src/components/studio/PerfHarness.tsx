"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cryptoRandom } from "@/core/ids";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import { builtinRegistry } from "@/parts/builtin";
import { fallbackSpec } from "@/parts/fallback";
import { createSession } from "@/project/session";
import { createArtProvider } from "@/studio/art/figure-art";
import { airWires } from "@/studio/engine/air-wires";
import { GESTURE_SETTLE_MS } from "@/studio/engine/constants";
import { createSceneController } from "@/studio/engine/controller";
import { createEditorEngine } from "@/studio/engine/engine";
import { derivePartStates, pinLevels } from "@/studio/engine/part-state";
import { makePerfProject, PERF_DEFAULT, PERF_VIEW } from "@/studio/engine/scene-fixture";
import { createSvgRenderer } from "@/studio/engine/svg-renderer";
import type { ArtMode, ArtProvider, DrawStats, Overlay } from "@/studio/engine/types";
import { mmToPx } from "@/studio/engine/viewport";
import { focusNetOverlay } from "@/studio/overlays/netlist";
import { stateOverlays } from "@/studio/overlays/state";
import { resolvePart } from "@/studio/parts-view";
import { createDocStore } from "@/studio/stores/doc";
import { createRunStore, type PartStateFrame } from "@/studio/stores/run";
import { createSessionStore } from "@/studio/stores/session";
import { createUiStore } from "@/studio/stores/ui";
import { createToolHost } from "@/studio/tools/host";
import { createSelectTool } from "@/studio/tools/select";
import { CanvasView } from "./CanvasView";

export type PerfName = "pan" | "fit" | "zoom" | "drag" | "hover";

export type PerfApi = {
  run(name: PerfName, frames: number): Promise<number[]>;
  stats(): DrawStats;
};

declare global {
  interface Window {
    __iynkPerf?: PerfApi;
  }
}

type Rig = ReturnType<typeof buildRig>;

const IDLE_FRAME: PartStateFrame = { tNs: 0, pins: {}, parts: [] };
const SETTLE_MS = 2 * GESTURE_SETTLE_MS + 100;
const SNAP_MM = 2.54;
const PAN_STEP_PX = 4;
const PAN_LEG_FRAMES = 30;
const FIT_ZOOM_STEP = 1.6;
const ZOOM_IN_TOTAL = 2;
const DRAG_STEP_PX = 1.5;
const HOVER_MARGIN_PX = 80;
const HOVER_WOBBLE_PX = 40;

function buildRig(art: ArtMode, lodOff: boolean, lang: Locale, messages: StudioMessages) {
  const registry = builtinRegistry();
  const doc = createDocStore(createSession({ state: makePerfProject(PERF_DEFAULT), clock: Date.now, rnd: cryptoRandom }));
  const session = createSessionStore(PERF_VIEW);
  const ui = createUiStore("prj_perf", { getItem: () => null, setItem: () => {} });
  const run = createRunStore();
  const renderer = createSvgRenderer();
  const host = createToolHost({ doc, session });
  host.register(createSelectTool({ setSelection: session.setSelection, setFocusNet: session.setFocusNet, setStatus: session.setStatus }));

  const figures = createArtProvider({ spec: (ref) => (registry.latest(ref) ? fallbackSpec(registry.latest(ref)!) : null) });
  const provider: ArtProvider = lodOff ? { get: (ref, _lod, mode) => figures.get(ref, 2, mode) } : figures;

  const engine = createEditorEngine({
    doc,
    session,
    renderer,
    art: provider,
    resolve: (ref) => resolvePart(doc.getState().state, ref),
    host,
    snapMm: () => SNAP_MM,
    artMode: () => art,
    mountOptions: { locale: lang, theme: "light", reduceMotion: false },
  });

  const overlays = {
    net: () => focusNetOverlay(doc.getState().state, PERF_VIEW, session.getState().focusNet, engine.scene()),
    state: () => {
      const state = doc.getState().state;
      return stateOverlays(engine.scene(), derivePartStates(state, IDLE_FRAME), pinLevels(state, IDLE_FRAME), {
        reduceMotion: false,
        labels: messages.studioRun.overlay,
      });
    },
    air: (): Overlay[] =>
      airWires(doc.getState().state, PERF_VIEW, engine.scene()).map((w, i) => ({
        id: `air:${i}`,
        xMm: w.a.x,
        yMm: w.a.y,
        elements: [{ t: "path", d: `M0 0 L${w.b.x - w.a.x} ${w.b.y - w.a.y}`, stroke: "var(--studio-ink)", sw: 0.3 }],
      })),
  };
  const controller = createSceneController({ doc, session, ui, run, engine, renderer, overlays });
  session.setFocusNet(doc.getState().state.nets[0]!.id);
  return { doc, session, engine, controller };
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Runs `step(i)` at the start of `count` animation frames and gives the time between those frames. */
function frameDeltas(count: number, step: (i: number) => void): Promise<number[]> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    let last = 0;
    let i = 0;
    const tick = (now: number) => {
      if (i > 0) deltas.push(now - last);
      last = now;
      if (i === count) return resolve(deltas);
      step(i++);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function pointer(canvas: HTMLElement, type: "pointerdown" | "pointermove" | "pointerup", x: number, y: number) {
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
      clientX: rect.left + x,
      clientY: rect.top + y,
    }),
  );
}

/** The pin of the part nearest the centre of the view, in canvas px: a press there selects that part and may drag it. */
function pinNearCentre({ engine }: Rig) {
  const viewport = engine.viewport();
  let best: { x: number; y: number; d: number } | null = null;
  for (const t of engine.scene().targets) {
    if (t.hit.kind !== "pin") continue;
    const at = mmToPx(viewport, { x: (t.bbox.x0 + t.bbox.x1) / 2, y: (t.bbox.y0 + t.bbox.y1) / 2 });
    const d = Math.hypot(at.x - viewport.w / 2, at.y - viewport.h / 2);
    if (!best || d < best.d) best = { ...at, d };
  }
  if (!best) throw new Error("no pin in view to drag");
  return best;
}

function createApi(rig: Rig, canvas: () => HTMLElement): PerfApi {
  const { engine, doc } = rig;

  async function dragPart(frames: number) {
    const el = canvas();
    el.setPointerCapture = () => {};
    el.releasePointerCapture = () => {};
    const start = pinNearCentre(rig);
    const revision = doc.getState().revision;
    pointer(el, "pointerdown", start.x, start.y);
    const deltas = await frameDeltas(frames, (i) => {
      pointer(el, "pointermove", start.x + (i + 1) * DRAG_STEP_PX, start.y + (i + 1) * DRAG_STEP_PX * 0.5);
      if (i === frames - 1) pointer(el, "pointerup", start.x + (i + 1) * DRAG_STEP_PX, start.y + (i + 1) * DRAG_STEP_PX * 0.5);
    });
    if (doc.getState().revision === revision) throw new Error("the drag did not commit a move");
    return deltas;
  }

  const interactions: Record<PerfName, (frames: number) => Promise<number[]>> = {
    pan: (frames) => frameDeltas(frames, (i) => engine.panBy(Math.floor(i / PAN_LEG_FRAMES) % 2 ? -PAN_STEP_PX : PAN_STEP_PX, Math.floor(i / PAN_LEG_FRAMES) % 2 ? -PAN_STEP_PX / 2 : PAN_STEP_PX / 2)),
    fit: (frames) => frameDeltas(frames, (i) => (i % 2 === 0 ? engine.zoomBy(FIT_ZOOM_STEP) : engine.fit())),
    zoom: (frames) => frameDeltas(frames, () => engine.zoomBy(ZOOM_IN_TOTAL ** (1 / frames))),
    drag: dragPart,
    hover: (frames) => {
      const el = canvas();
      const { w, h } = engine.viewport();
      return frameDeltas(frames, (i) => pointer(el, "pointermove", HOVER_MARGIN_PX + (i / frames) * (w - 2 * HOVER_MARGIN_PX), h / 2 + HOVER_WOBBLE_PX * Math.sin(i / 7)));
    },
  };

  return {
    async run(name, frames) {
      engine.fit();
      await wait(SETTLE_MS);
      const deltas = await interactions[name](frames);
      await wait(SETTLE_MS);
      return deltas;
    },
    stats: () => engine.scene().stats,
  };
}

export function PerfHarness({ messages, lang }: { messages: StudioMessages; lang: Locale }) {
  const params = useSearchParams();
  const [rig] = useState(() => buildRig(params.get("art") === "simple" ? "simple" : "illustrated", params.get("lod") === "off", lang, messages));
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rig.controller.start();
    window.__iynkPerf = createApi(rig, () => host.current!.querySelector<HTMLElement>("[role=application]")!);
    return () => {
      delete window.__iynkPerf;
      rig.controller.stop();
    };
  }, [rig]);

  return (
    <div ref={host} className="fixed inset-0 z-overlay bg-paper">
      <CanvasView engine={rig.engine} controller={rig.controller} messages={messages.studio} />
    </div>
  );
}

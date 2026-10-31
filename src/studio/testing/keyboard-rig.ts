import { newId } from "../../core/ids.ts";
import type { Project } from "../../project/generated/types.ts";
import { createSession } from "../../project/session.ts";
import { seededRandom, steppingClock } from "../../project/session.testing.ts";
import { buildDrawList } from "../engine/draw-list.ts";
import { stubArt } from "../engine/testing/mini-scene.ts";
import type { Viewport } from "../engine/types.ts";
import { resolvePart } from "../parts-view.ts";
import { createSessionStore } from "../stores/session.ts";
import { createUiStore } from "../stores/ui.ts";
import { createToolHost } from "../tools/host.ts";
import { createPlaceTool } from "../tools/place.ts";
import type { PlaceDeps } from "../tools/place.ts";
import { createSelectTool } from "../tools/select.ts";
import type { ToolCtx } from "../tools/types.ts";
import type { IdSource } from "../views/breadboard.ts";
import { blinkCircuit } from "./blink-circuit.ts";
import { registry } from "./breadboard-fixture.ts";
import { createRecordingDoc } from "./recording-doc.ts";

export const VIEW = "vw_bb";

const memory: Pick<Storage, "getItem" | "setItem"> = { getItem: () => null, setItem: () => {} };

/** A project behind a doc store, a session store, a tool host with the select and place tools, and a way to read the tool context. */
export function rigOver(project: Project) {
  const doc = createRecordingDoc(createSession({ state: project, clock: steppingClock(), rnd: seededRandom() }));
  const session = createSessionStore(VIEW);
  const ui = createUiStore("rig", memory);
  const host = createToolHost({ doc, session });
  const ids: IdSource = (prefix) => newId(prefix);
  host.register(createSelectTool({ setSelection: session.setSelection, setFocusNet: session.setFocusNet, setStatus: session.setStatus, ids }));
  const placeDeps: PlaceDeps = { registry, session };
  host.register(createPlaceTool(placeDeps));

  let viewport: Viewport = { cx_mm: 0, cy_mm: 0, k: 8, w: 800, h: 600, dpr: 1 };
  const ctx = (): ToolCtx => {
    const view = doc.getState();
    const state = view.state;
    return {
      doc: view,
      view: state.views.find((v) => v.id === VIEW)!,
      viewport,
      scene: buildDrawList({ state, viewId: VIEW, viewport, art: stubArt, resolve: (ref) => resolvePart(state, ref), index: null, prev: null, mode: "illustrated", overlays: [] }).scene,
      selection: session.getState().selection,
      snapMm: 2.54,
      hit: () => null,
      resolve: (ref) => resolvePart(state, ref),
    };
  };
  return { doc, session, ui, host, ctx, placeDeps, ids, setViewport: (next: Viewport) => void (viewport = next) };
}

/** The finished blink circuit of T-B4-09 behind the rig. */
export function keyboardRig() {
  const circuit = blinkCircuit();
  return { circuit, ...rigOver(circuit.project) };
}

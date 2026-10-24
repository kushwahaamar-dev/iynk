// Adapts the board lab store (LabDockProps.store, src/lib/boardlab/store.ts) to
// the TwinSim the bridge reads: the run's pins by board pin number, the open
// lesson's world inputs, and real readings dispatched as `input/set`, the same
// shared action the inspector sliders send.

import type { LabStore } from "@/components/dock/types";
import { loadBoard } from "@/content/index.generated";
import type { WorldInput } from "@/content/schema";
import type { PinSample } from "@/lib/boardlab/engine";
import type { BoardLabAction, BoardLabState } from "@/lib/boardlab/store";
import { BOARD_IDS, getProfile, type BoardId } from "@/lib/interp/profiles";
import type { PinView } from "@/lib/interp/world";
import { pinOfNet, type SimFrame, type TwinSim } from "./twin";

const NO_PINS: Readonly<Record<number, PinView>> = Object.freeze({});

export function asBoardId(id: string): BoardId | null {
  return (BOARD_IDS as readonly string[]).includes(id) ? (id as BoardId) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type TwinFields = Pick<BoardLabState, "lesson" | "run" | "pins">;

/** The parts of BoardLabState the twin reads, checked at runtime: the dock hands panels an untyped store. */
function asBoardLab(state: unknown): TwinFields | null {
  if (!isRecord(state) || !isRecord(state.run) || !isRecord(state.pins)) return null;
  return state as TwinFields;
}

/** The open lesson's id, or null on the board overview page (and for stores that aren't the board lab's). */
export function lessonOf(state: unknown): string | null {
  const lab = asBoardLab(state);
  return lab && typeof lab.lesson === "string" ? lab.lesson : null;
}

function toView(sample: PinSample): PinView {
  const level = sample.pwm ? (sample.value >= 0.5 ? 1 : 0) : sample.value ? 1 : 0;
  const view: PinView = { mode: sample.mode, level };
  if (sample.pwm) view.duty = sample.value;
  if (sample.hz) view.hz = sample.hz;
  if (sample.servoUs) view.servoUs = sample.servoUs;
  if (sample.volts !== undefined) view.volts = sample.volts;
  return view;
}

/** The run's pins by board pin number while it runs; nets the board has no pin for are left out. */
export function runPins(state: unknown, boardId: BoardId): { running: boolean; pins: Readonly<Record<number, PinView>> } {
  const lab = asBoardLab(state);
  if (!lab || lab.run.status !== "running") return { running: false, pins: NO_PINS };
  const profile = getProfile(boardId);
  const pins: Record<number, PinView> = {};
  for (const [net, sample] of Object.entries(lab.pins)) {
    const n = pinOfNet(profile, net);
    if (n !== undefined) pins[n] = toView(sample);
  }
  return { running: true, pins };
}

/** The world inputs of one lesson, from the content registry; [] when the board or lesson isn't there. */
export async function lessonInputs(boardId: BoardId, lessonId: string): Promise<WorldInput[]> {
  const board = await loadBoard(boardId);
  return board?.lessons.find((l) => l.id === lessonId)?.world.inputs ?? [];
}

export type BoardLabSim = TwinSim & {
  /** The open lesson's world inputs, once they have loaded from src/content. */
  setInputs(inputs: readonly WorldInput[]): void;
};

/** `lessonPage`: outputs wait for the lesson's inputs (setInputs), so the guard knows them first. */
export function boardLabSim(store: LabStore, boardId: BoardId, lessonPage: boolean): BoardLabSim {
  let inputs: readonly WorldInput[] = [];
  let inputsReady = !lessonPage;
  let seen: unknown = undefined;
  let frame: SimFrame | null = null;
  const listeners = new Set<() => void>();
  return {
    getFrame() {
      const state = store.getState();
      if (!frame || state !== seen) {
        seen = state;
        frame = { boardId, ...runPins(state, boardId), inputs, inputsReady };
      }
      return frame;
    },
    subscribe(listener) {
      listeners.add(listener);
      const off = store.subscribe(listener);
      return () => {
        listeners.delete(listener);
        off();
      };
    },
    setInputs(next) {
      inputs = next;
      inputsReady = true;
      frame = null;
      for (const l of listeners) l();
    },
    setInput(id, value) {
      const action: BoardLabAction = { type: "input/set", id, value };
      store.dispatch(action);
    },
  };
}

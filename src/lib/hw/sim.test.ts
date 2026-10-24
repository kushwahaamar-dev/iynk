import { describe, expect, it, vi } from "vitest";
import { createBoardLabStore, initialState } from "@/lib/boardlab/store";
import { boardLabSim, lessonOf, runPins } from "./sim";

function runningStore() {
  const store = createBoardLabStore(initialState({ board: "uno-r3", lesson: "blink", language: "arduino-cpp" }));
  store.dispatch({ type: "run/start" });
  const id = store.getState().run.id;
  store.dispatch({ type: "run/phase", id, status: "running" });
  return { store, id };
}

describe("board lab store adapter", () => {
  it("reads the real store's pins by net and converts them to board pins", () => {
    const { store, id } = runningStore();
    store.dispatch({
      type: "run/tick",
      id,
      vt: 500,
      pins: {
        D13: { mode: "output", value: 1, pwm: false },
        D9: { mode: "output", value: 0.25, pwm: true },
        A0: { mode: "input", value: 0, pwm: false, volts: 2.5 },
        "5V": { mode: "output", value: 1, pwm: false },
      },
    });
    const { running, pins } = runPins(store.getState(), "uno-r3");
    expect(running).toBe(true);
    expect(pins[13]).toEqual({ mode: "output", level: 1 });
    expect(pins[9]).toEqual({ mode: "output", level: 0, duty: 0.25 });
    expect(pins[14]).toEqual({ mode: "input", level: 0, volts: 2.5 });
    expect(Object.keys(pins)).toHaveLength(3);
  });

  it("reads a stopped run, the overview page and foreign stores as not running", () => {
    const stopped = createBoardLabStore(initialState({ board: "uno-r3", lesson: null, language: "arduino-cpp" }));
    expect(runPins(stopped.getState(), "uno-r3").running).toBe(false);
    expect(lessonOf(stopped.getState())).toBeNull();
    expect(runPins({ design: {} }, "uno-r3").running).toBe(false);
    expect(lessonOf(runningStore().store.getState())).toBe("blink");
  });

  it("feeds real readings back as input/set and waits for the lesson's inputs", () => {
    const { store } = runningStore();
    const sim = boardLabSim(store, "uno-r3", true);
    const listener = vi.fn();
    sim.subscribe(listener);
    expect(sim.getFrame().inputsReady).toBe(false);
    sim.setInputs([]);
    expect(sim.getFrame().inputsReady).toBe(true);
    expect(listener).toHaveBeenCalled();
    sim.setInput("pot", 3.3);
    expect(store.getState().inputs.pot).toBe(3.3);
  });

  it("keeps the frame stable between store changes", () => {
    const { store } = runningStore();
    const sim = boardLabSim(store, "uno-r3", false);
    expect(sim.getFrame()).toBe(sim.getFrame());
  });
});

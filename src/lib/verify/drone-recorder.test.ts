// @vitest-environment node
import { expect, test, vi } from "vitest";
import type { FigureHandle, FigureTraffic } from "@/components/figure/protocol";
import { droneRecorder } from "./drone-recorder";
import { replayDroneSafety } from "./drone-safety";
import { runLogSchema } from "./runlog";

function fakeFigure() {
  let listener: ((traffic: FigureTraffic) => void) | null = null;
  const figure = {
    send: vi.fn(),
    observe: (fn: (traffic: FigureTraffic) => void) => {
      listener = fn;
      return () => (listener = null);
    },
    isReady: () => true,
    info: () => null,
    focus: () => {},
  } as unknown as FigureHandle;
  let at = 1000;
  const report = (state: Record<string, unknown>) => {
    at += 700;
    listener?.({ dir: "in", at, message: { type: "state", state, changed: Object.keys(state) } });
  };
  return { figure, report };
}

const BUILT = { FRAME: 0, MOTORS: 0, ESC: 0, WIRES: 0, FC: 0, XT60: 0, CAM: 0, RX: 0, VTX: 0, TOP: 0, BATT: 0, PROPS: 0 };
const { PROPS: _props, ...NO_PROPS } = BUILT;
const base = { placed: BUILT, plugged: false, fault: null, test: null, smokeOk: true, motorOk: true, accOk: true, fitted: 12, total: 12 };

test("records the bench from the figure's reports into a run the server accepts", () => {
  const { figure, report } = fakeFigure();
  const recorder = droneRecorder(figure);
  expect(droneRecorder(figure)).toBe(recorder);
  expect(figure.send).toHaveBeenCalledWith("query");
  expect(recorder.get().started).toBe(false);

  report(base);
  report({ ...base, sel: "CAM" });
  report({ ...base, placed: NO_PROPS });
  report({ ...base, placed: NO_PROPS, test: "smoke" });
  report({ ...base, placed: NO_PROPS });
  report({ ...base, placed: NO_PROPS, test: "motors", plugged: true });
  report({ ...base, placed: NO_PROPS, plugged: true });
  report({ ...base, placed: NO_PROPS });
  report({ ...base, placed: NO_PROPS, test: "calibrate" });
  report({ ...base, placed: NO_PROPS });
  report(base);

  const { inputs } = recorder.get();
  expect(inputs.map((i) => i.action.type)).toEqual(["init", "remove", "test", "test-end", "test", "test-end", "unplug", "test", "test-end", "add"]);
  expect(inputs.every((input, i) => i === 0 || input.t >= inputs[i - 1].t)).toBe(true);
  const tests = { smoke: true, motors: true, calibrate: true };
  expect(replayDroneSafety(inputs, tests)).toMatchObject({ pass: true, score: 100 });

  const log = recorder.runLog("quad5", { pass: true, score: 100 });
  expect(runLogSchema.safeParse(log).success).toBe(true);

  recorder.restart();
  expect(recorder.get().inputs).toHaveLength(1);
  expect(replayDroneSafety(recorder.get().inputs, tests)?.pass).toBe(false);
});

test("ignores reports from other figures", () => {
  const { figure, report } = fakeFigure();
  const recorder = droneRecorder(figure);
  report({ status: "running", pins: {} });
  expect(recorder.get().started).toBe(false);
});

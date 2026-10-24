import type { FigureHandle } from "@/components/figure/protocol";
import { benchEventsBetween, initEvent, readDroneReport, type DroneReport } from "./drone-safety";
import type { RunInput, RunLog } from "./runlog";

// Records a drone bench run from the figure bridge (FigureHandle.observe):
// every `state` report becomes the effective bench events since the last one.
// One recorder per figure handle, so it keeps recording while the Passport
// tab is closed and reopened.

export const APP_VERSION = "0.1.0";

/** Keeps the run log well under the attest body limit (256 KB). */
const MAX_EVENTS = 1500;

export type DroneRecording = {
  /** False until the figure has reported its bench state once. */
  started: boolean;
  inputs: readonly RunInput[];
};

export type DroneRecorder = {
  get(): DroneRecording;
  subscribe(listener: () => void): () => void;
  /** Starts over from the bench as it is now (after a credential, or on request). */
  restart(): void;
  runLog(itemId: string, result: RunLog["result"]): RunLog;
};

const EMPTY: DroneRecording = { started: false, inputs: [] };

function createRecorder(figure: FigureHandle): DroneRecorder {
  let recording = EMPTY;
  let last: DroneReport | null = null;
  let startedAt = 0;
  const listeners = new Set<() => void>();

  const publish = (inputs: RunInput[]) => {
    recording = { started: true, inputs };
    for (const listener of listeners) listener();
  };

  const begin = (report: DroneReport, at: number) => {
    startedAt = at;
    last = report;
    publish([{ t: 0, action: initEvent(report) }]);
  };

  figure.observe((traffic) => {
    if (traffic.dir !== "in" || traffic.message.type !== "state") return;
    const report = readDroneReport(traffic.message.state);
    if (!report) return;
    if (!last) return begin(report, traffic.at);
    const events = benchEventsBetween(last, report);
    last = report;
    if (!events.length) return;
    if (recording.inputs.length + events.length > MAX_EVENTS) return begin(report, traffic.at);
    const t = Math.max(0, Math.round(traffic.at - startedAt));
    publish([...recording.inputs, ...events.map((action) => ({ t, action }))]);
  });
  // The current state arrives as a fresh `state` report.
  figure.send("query");

  return {
    get: () => recording,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    restart() {
      if (last) begin(last, performance.now());
    },
    runLog: (itemId, result) => ({
      v: 1,
      kind: "drone-safety",
      itemId,
      seed: 0,
      inputs: [...recording.inputs],
      result,
      client: { appVersion: APP_VERSION },
    }),
  };
}

const recorders = new WeakMap<FigureHandle, DroneRecorder>();

export function droneRecorder(figure: FigureHandle): DroneRecorder {
  let recorder = recorders.get(figure);
  if (!recorder) {
    recorder = createRecorder(figure);
    recorders.set(figure, recorder);
  }
  return recorder;
}

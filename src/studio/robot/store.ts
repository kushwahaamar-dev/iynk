import type { CouplingReport, LoopStats, MechReport, PhysicsFrame, PidTrace, RobotCheck, RobotProblem, RunMetrics } from "@/core/robot-report";
import { createStore } from "@/studio/stores/select";
import { parsePidLines } from "./pid-sources";

const TRAIL_POINTS = 600;

export interface RobotView {
  problems: RobotProblem[];
  checks: RobotCheck[];
  coupling: CouplingReport[];
  frame: PhysicsFrame | null;
  trail: Array<[number, number]>;
  run: RunMetrics | null;
  loop: LoopStats | null;
  pid: PidTrace | null;
  runHash: string | null;
  sceneHash: string | null;
  checkpoints: string[];
}

export type RobotMsg =
  | { t: "mech_frame"; frame: PhysicsFrame }
  | { t: "robot_problems"; problems: RobotProblem[]; checks: RobotCheck[]; coupling: CouplingReport[] }
  | { t: "mech_report"; report: MechReport }
  | { t: "serial"; entries: ReadonlyArray<{ tNs: number; text: string }> };

export interface RobotStore {
  get(): RobotView;
  subscribe(fn: () => void): () => void;
  apply(msg: RobotMsg): void;
  reset(): void;
}

const EMPTY: RobotView = {
  problems: [],
  checks: [],
  coupling: [],
  frame: null,
  trail: [],
  run: null,
  loop: null,
  pid: null,
  runHash: null,
  sceneHash: null,
  checkpoints: [],
};

/** Where the chassis is on the floor: the first body of the frame. */
function floorPoint(frame: PhysicsFrame): [number, number] | null {
  const body = Object.values(frame.bodies)[0];
  return body ? [body.p[0], body.p[1]] : null;
}

function withSerial(view: RobotView, entries: ReadonlyArray<{ tNs: number; text: string }>): RobotView {
  const parsed = parsePidLines(entries);
  if (parsed.tNs.length === 0) return view;
  const old = view.pid;
  const pid: PidTrace = old
    ? {
        tNs: [...old.tNs, ...parsed.tNs],
        setpoint: [...old.setpoint, ...parsed.setpoint],
        response: [...old.response, ...parsed.response],
        output: [...old.output, ...parsed.output],
        integral: [...old.integral, ...parsed.integral],
      }
    : parsed;
  return { ...view, pid };
}

export function createRobotStore(): RobotStore {
  const store = createStore<RobotView>(EMPTY);

  return {
    get: store.getState,
    subscribe: store.subscribe,
    apply(msg) {
      store.setState((view) => {
        switch (msg.t) {
          case "mech_frame": {
            const point = floorPoint(msg.frame);
            return { ...view, frame: msg.frame, trail: point ? [...view.trail, point].slice(-TRAIL_POINTS) : view.trail };
          }
          case "robot_problems":
            return { ...view, problems: msg.problems, checks: msg.checks, coupling: msg.coupling };
          case "mech_report": {
            const { report } = msg;
            return { ...view, run: report.run, loop: report.loop, runHash: report.runHash, sceneHash: report.sceneHash, checkpoints: report.checkpoints };
          }
          case "serial":
            return withSerial(view, msg.entries);
        }
      });
    },
    reset: () => store.setState(EMPTY),
  };
}

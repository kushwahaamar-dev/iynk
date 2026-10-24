import type { DesignPick, FigureState, StateCond } from "@/content/schema";

// The drone figure's `state` report (docs/FIGURES-DRONE.md §10.2), read defensively: a figure can
// reload at any time and an older build may leave fields out.

export type FlightReadiness = {
  ready: boolean;
  fcReversed: boolean;
  propsSwapped: boolean;
  motorChecked: boolean;
  accCal: boolean;
  capFault: boolean;
  smokeTested: boolean;
  mistakes: string[];
};

export type BenchState = {
  fitted: number;
  total: number;
  placed: Record<string, 0 | 1>;
  next: string | null;
  built: boolean;
  plugged: boolean;
  powered: boolean;
  fault: string | null;
  smokeOk: boolean;
  motorOk: boolean;
  accOk: boolean;
  test: string | null;
  wrongMotor: string | null;
  exploded: boolean;
  sheet: "wiring" | null;
  sel: string | null;
  design: DesignPick | null;
  flight: FlightReadiness | null;
  log: { n: number; lines: string[] };
  sfx: { n: number; name: string | null };
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const bool = (v: unknown) => v === true;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

function readFlight(v: unknown): FlightReadiness | null {
  if (!isRecord(v)) return null;
  return {
    ready: bool(v.ready),
    fcReversed: bool(v.fcReversed),
    propsSwapped: bool(v.propsSwapped),
    motorChecked: bool(v.motorChecked),
    accCal: bool(v.accCal),
    capFault: bool(v.capFault),
    smokeTested: bool(v.smokeTested),
    mistakes: Array.isArray(v.mistakes) ? v.mistakes.filter((m): m is string => typeof m === "string") : [],
  };
}

export function readBench(state: FigureState): BenchState {
  const placed: Record<string, 0 | 1> = {};
  if (isRecord(state.placed)) {
    for (const [id, o] of Object.entries(state.placed)) if (o === 0 || o === 1) placed[id] = o;
  }
  const d = state.design;
  const design =
    isRecord(d) && typeof d.batt === "string" && typeof d.motor === "string" && typeof d.prop === "string"
      ? { batt: d.batt, motor: d.motor, prop: d.prop }
      : null;
  const log = isRecord(state.log) ? state.log : {};
  const sfx = isRecord(state.sfx) ? state.sfx : {};
  return {
    fitted: num(state.fitted),
    total: num(state.total),
    placed,
    next: str(state.next),
    built: bool(state.built),
    plugged: bool(state.plugged),
    powered: bool(state.powered),
    fault: str(state.fault),
    smokeOk: bool(state.smokeOk),
    motorOk: bool(state.motorOk),
    accOk: bool(state.accOk),
    test: str(state.test),
    wrongMotor: str(state.wrongMotor),
    exploded: bool(state.exploded),
    sheet: state.sheet === "wiring" ? "wiring" : null,
    sel: str(state.sel),
    design,
    flight: readFlight(state.flight),
    log: {
      n: num(log.n),
      lines: Array.isArray(log.lines) ? log.lines.filter((l): l is string => typeof l === "string") : [],
    },
    sfx: { n: num(sfx.n), name: str(sfx.name) },
  };
}

/** The value at a dot path ("placed.FC", "flight.ready"), or undefined. */
export function readPath(state: FigureState, path: string): unknown {
  let node: unknown = state;
  for (const part of path.split(".")) {
    if (!isRecord(node)) return undefined;
    node = node[part];
  }
  return node;
}

/** True when every path of the condition equals its value (null matches a missing field too). */
export function holds(state: FigureState, cond: StateCond): boolean {
  return Object.entries(cond).every(([path, want]) => {
    const got = readPath(state, path);
    return want === null ? got === null || got === undefined : got === want;
  });
}

const LOG_KEEP = 200;

/**
 * Appends the log lines the host has not seen yet. The figure reports its total line count and its
 * last lines; a count that went down means the figure restarted, so its lines start a new run.
 */
export function mergeLog(
  prev: { n: number; lines: string[] },
  report: { n: number; lines: string[] },
): { n: number; lines: string[] } {
  if (report.n === prev.n) return prev;
  if (report.n < prev.n) {
    return { n: report.n, lines: [...prev.lines, ...report.lines].slice(-LOG_KEEP) };
  }
  const fresh = Math.min(report.n - prev.n, report.lines.length);
  const added = fresh > 0 ? report.lines.slice(-fresh) : [];
  return { n: report.n, lines: [...prev.lines, ...added].slice(-LOG_KEEP) };
}

import type { DesignPick, DroneContent, FigureState } from "@/content/schema";
import type { HostCommand } from "@/components/figure/protocol";
import { calc } from "@/lib/drone/calc";
import { designInput, isDesignPick } from "@/lib/drone/design";
import { isEngineTest, testCommand } from "./bench";
import { cliBanner, createCliSession, runCli, type CliContext, type CliLine, type CliPatch, type CliSession } from "./cli";
import { mergeLog, readBench, type FlightReadiness } from "./figure";

// The Drone Lab workshop (D14b): one serializable state, changed only through dispatch(action).
// A reducer step returns the next state and the figure commands it implies; the page connects those to
// FigureFrame's handle.send, so rooms, replays and the AI partner see and drive the same actions.

export const DRONE_TABS = ["design", "build", "wiring", "tests", "cli", "quiz"] as const;
export type DroneTab = (typeof DRONE_TABS)[number];
export type DesignKey = keyof DesignPick;
export type BenchRun = "build" | "strip" | "plug" | "unplug";

const CLI_KEEP = 300;
const HISTORY_KEEP = 50;
/** Fields of a CLI effect the drone figure accepts; the rest only change the flight. */
const FIGURE_FIELDS = new Set(["design", "calc", "sel", "step", "add", "remove", "run", "exploded", "sheet"]);

export type DroneLabState = {
  id: string;
  pick: DesignPick;
  figure: FigureState;
  figureReady: boolean;
  sheet: "wiring" | null;
  exploded: boolean;
  sel: string | null;
  tab: DroneTab;
  log: { n: number; lines: string[] };
  /** Tests the learner ran: engine tests once the figure reported them running, craft tests once pressed. */
  attempted: Record<string, true>;
  cli: { session: CliSession; lines: CliLine[]; history: string[]; flight: CliPatch };
  /** Chosen options per question, in the order they were picked. */
  quiz: Record<string, Record<string, number[]>>;
};

export type DroneLabAction =
  | { type: "design/pick"; key: DesignKey; value: string }
  | { type: "figure/ready" }
  | { type: "figure/state"; state: FigureState }
  | { type: "figure/button"; id: string }
  | { type: "select"; id: string | null }
  | { type: "sheet"; sheet: "wiring" | null }
  | { type: "exploded"; on: boolean }
  | { type: "bench/run"; run: BenchRun }
  | { type: "bench/add"; id: string; orient: 0 | 1 }
  | { type: "bench/remove"; id: string }
  | { type: "test/run"; test: string }
  | { type: "tab"; tab: DroneTab }
  | { type: "cli/run"; line: string }
  | { type: "cli/clear" }
  | { type: "quiz/answer"; quiz: string; question: string; option: number }
  | { type: "quiz/reset"; quiz: string };

export type Step = { state: DroneLabState; send: HostCommand[] };

export function initialState(content: DroneContent, pick: DesignPick = content.design.default): DroneLabState {
  const emu = content.firmware.emulator;
  return {
    id: content.id,
    pick: isDesignPick(content.design, pick) ? pick : content.design.default,
    figure: {},
    figureReady: false,
    sheet: null,
    exploded: false,
    sel: null,
    tab: "design",
    log: { n: 0, lines: [] },
    attempted: {},
    cli: { session: createCliSession(emu), lines: cliBanner(emu), history: [], flight: {} },
    quiz: {},
  };
}

/** The numbers the wiring sheet prints for a pick. */
export function calcPatch(content: DroneContent, pick: DesignPick) {
  const r = calc(designInput(content.design, pick));
  return { V: r.V, maxA: r.maxA, hoverA: r.hoverA };
}

/** What a (re)loaded figure needs to match the page; idempotent, so it is safe on every `ready`. */
export function figureInitial(content: DroneContent, s: DroneLabState): Record<string, unknown> {
  return { design: s.pick, calc: calcPatch(content, s.pick), sheet: s.sheet, exploded: s.exploded, sel: s.sel };
}

export function cliContext(content: DroneContent, s: DroneLabState): CliContext {
  const bench = readBench(s.figure);
  const battery = content.design.batts[s.pick.batt];
  return {
    version: content.firmware.version,
    plugged: bench.plugged,
    cells: battery?.cells ?? 0,
    accCal: bench.accOk,
    built: bench.built,
  };
}

const set = (state: Record<string, unknown>): HostCommand => ({ type: "set", state });

export function reduce(content: DroneContent, s: DroneLabState, action: DroneLabAction): Step {
  switch (action.type) {
    case "design/pick": {
      const pick = { ...s.pick, [action.key]: action.value };
      if (!isDesignPick(content.design, pick)) return { state: s, send: [] };
      return { state: { ...s, pick }, send: [set({ design: pick, calc: calcPatch(content, pick) })] };
    }
    case "figure/ready":
      return { state: { ...s, figureReady: true }, send: [] };
    case "figure/state": {
      // A report may carry only what changed; a reloaded figure sends everything again.
      const figure = { ...s.figure, ...action.state };
      const bench = readBench(figure);
      const log = mergeLog(s.log, bench.log);
      let attempted = s.attempted;
      for (const test of content.tests) {
        if (bench.test !== null && bench.test === test.button && !attempted[test.id])
          attempted = { ...attempted, [test.id]: true };
      }
      return {
        state: { ...s, figure, log, attempted, sel: bench.sel, sheet: bench.sheet, exploded: bench.exploded },
        send: [],
      };
    }
    case "figure/button": {
      const tests = content.tests.filter((t) => t.button === action.id && !isEngineTest(t));
      if (tests.length === 0) return { state: s, send: [] };
      const attempted = { ...s.attempted };
      for (const t of tests) attempted[t.id] = true;
      return { state: { ...s, attempted }, send: [] };
    }
    case "select": {
      const sel = action.id !== null && action.id === s.sel ? null : action.id;
      return { state: { ...s, sel }, send: [set({ sel })] };
    }
    case "sheet":
      return { state: { ...s, sheet: action.sheet }, send: [set({ sheet: action.sheet })] };
    case "exploded":
      return { state: { ...s, exploded: action.on }, send: [set({ exploded: action.on })] };
    case "bench/run":
      return { state: s, send: [set({ run: action.run })] };
    case "bench/add":
      return { state: s, send: [set({ add: { id: action.id, orient: action.orient } })] };
    case "bench/remove":
      return { state: s, send: [set({ remove: action.id })] };
    case "test/run": {
      const test = content.tests.find((t) => t.id === action.test);
      if (!test) return { state: s, send: [] };
      const command = testCommand(test);
      const send: HostCommand[] = [command.type === "set" ? set(command.state) : { type: "press", id: command.id }];
      // An engine test counts as run once the figure reports it running (it may refuse: props on, parts missing).
      const attempted = isEngineTest(test) ? s.attempted : { ...s.attempted, [test.id]: true as const };
      return { state: { ...s, attempted }, send };
    }
    case "tab":
      return { state: { ...s, tab: action.tab }, send: [] };
    case "cli/run": {
      const emu = content.firmware.emulator;
      const result = runCli(emu, cliContext(content, s), s.cli.session, action.line);
      const figurePatches = result.effects.map((e) =>
        Object.fromEntries(Object.entries(e).filter(([k]) => FIGURE_FIELDS.has(k))),
      );
      const flight = Object.assign(
        {},
        s.cli.flight,
        ...result.effects.map((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !FIGURE_FIELDS.has(k)))),
      );
      const history = action.line.trim()
        ? [...s.cli.history.filter((h) => h !== action.line.trim()), action.line.trim()].slice(-HISTORY_KEEP)
        : s.cli.history;
      return {
        state: {
          ...s,
          cli: { session: result.session, lines: [...s.cli.lines, ...result.out].slice(-CLI_KEEP), history, flight },
        },
        send: figurePatches.filter((p) => Object.keys(p).length > 0).map(set),
      };
    }
    case "cli/clear":
      return { state: { ...s, cli: { ...s.cli, lines: [] } }, send: [] };
    case "quiz/answer": {
      const quiz = content.quizzes.find((q) => q.id === action.quiz);
      const question = quiz?.questions.find((q) => q.id === action.question);
      if (!quiz || !question || action.option < 0 || action.option >= question.options.length) return { state: s, send: [] };
      const forQuiz = s.quiz[quiz.id] ?? {};
      const picked = forQuiz[question.id] ?? [];
      if (picked.includes(question.answer) || picked.includes(action.option)) return { state: s, send: [] };
      return {
        state: { ...s, quiz: { ...s.quiz, [quiz.id]: { ...forQuiz, [question.id]: [...picked, action.option] } } },
        send: [],
      };
    }
    case "quiz/reset": {
      const quiz = { ...s.quiz };
      delete quiz[action.quiz];
      return { state: { ...s, quiz }, send: [] };
    }
  }
}

/** Score of a quiz: questions answered right on the first pick, out of all its questions. */
export function quizScore(content: DroneContent, s: DroneLabState, quizId: string) {
  const quiz = content.quizzes.find((q) => q.id === quizId);
  if (!quiz) return { score: 0, total: 0, finished: false };
  const picks = s.quiz[quizId] ?? {};
  const finished = quiz.questions.every((q) => (picks[q.id] ?? []).includes(q.answer));
  const score = quiz.questions.filter((q) => picks[q.id]?.[0] === q.answer).length;
  return { score, total: quiz.questions.length, finished };
}

/** What the fly page needs from the bench, kept for this browser tab. */
export type BenchSummary = { pick: DesignPick; built: boolean; flight: FlightReadiness | null; cli: CliPatch };

export function benchSummary(s: DroneLabState): BenchSummary {
  const bench = readBench(s.figure);
  return { pick: s.pick, built: bench.built, flight: bench.flight, cli: s.cli.flight };
}

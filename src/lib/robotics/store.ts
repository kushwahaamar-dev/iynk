// The bench page's one store (D14b): serializable state changed only through dispatch(action).
// The reducer is pure; what it wants done outside (a figure message, saved progress, a task run)
// comes back as effects that the connected handlers carry out, so a room, a replay or the AI lab
// partner driving the same actions gets the same figure messages.

import type { LabStore } from "@/components/dock/types";
import type { BridgeCommand, FigureState, RoboticsContent } from "@/content/schema";
import { progressKey } from "@/lib/progress/keys";
import { scoreQuiz, quizAfter } from "./quiz";
import { allPass, type TaskRunResult } from "./runner";
import { activeFaults, advanceSteps, canStart, currentStepIndex, emptySession, type StepsSession } from "./steps";
import type { BenchTexts } from "./text";

export type FigureCommand = BridgeCommand | { type: "flash"; text: string; ms?: number };

export type Notice =
  | { kind: "out-of-order"; step: string; before: string }
  | { kind: "sent"; step: string }
  | { kind: "by-hand"; step: string }
  | { kind: "fault-seen"; step: string }
  | { kind: "step-done"; step: string }
  | { kind: "all-done" }
  | { kind: "quiz-ready"; quiz: string }
  | { kind: "task-passed"; task: string }
  | { kind: "figure"; text: string };

export type QuizSession = {
  open: string | null;
  index: number;
  answers: Record<string, number>;
  checked: boolean;
  result: { score: number; total: number } | null;
};

export type TaskSession = { code: string; running: boolean; result: TaskRunResult | null };

export type SerialLine = { id: number; text: string };

export type BenchState = {
  bench: string;
  figure: { ready: boolean; state: FigureState };
  steps: StepsSession;
  mode: { selected: string };
  serial: { lastN: number | null; nextId: number; lines: SerialLine[] };
  notice: { seq: number; notice: Notice } | null;
  quiz: QuizSession;
  tasks: Record<string, TaskSession>;
};

export type BenchAction =
  | { type: "figure/ready" }
  | { type: "figure/state"; state: FigureState }
  | { type: "figure/flash"; text: string }
  | { type: "step/do"; step: string }
  | { type: "fault/trigger"; fault: string }
  | { type: "fault/clear" }
  | { type: "mode/select"; mode: string }
  | { type: "mode/run"; mode: string }
  | { type: "part/select"; part: string | null }
  | { type: "serial/clear" }
  | { type: "quiz/open"; quiz: string }
  | { type: "quiz/choose"; option: number }
  | { type: "quiz/check" }
  | { type: "quiz/next" }
  | { type: "quiz/close" }
  | { type: "task/edit"; task: string; code: string }
  | { type: "task/reset"; task: string }
  | { type: "task/solution"; task: string }
  | { type: "task/run"; task: string }
  | { type: "task/result"; task: string; result: TaskRunResult }
  /** A room hands a joiner the host's state (src/lib/realtime/store-sync.ts). */
  | { type: "sync/hydrate"; state: unknown };

export type BenchEffect =
  | { kind: "send"; command: FigureCommand }
  | { kind: "done"; key: string }
  | { kind: "quiz"; key: string; score: number; total: number }
  | { kind: "run"; task: string; source: string };

export type BenchSetup = {
  bench: RoboticsContent;
  /** Starter and reference code per task, with {{t:key}} already translated. */
  starters: Record<string, string>;
  solutions: Record<string, string>;
  texts: BenchTexts;
};

const SERIAL_KEEP = 200;
const closedQuiz: QuizSession = { open: null, index: 0, answers: {}, checked: false, result: null };

export function initialBenchState(setup: BenchSetup): BenchState {
  const { bench } = setup;
  return {
    bench: bench.id,
    figure: { ready: false, state: {} },
    steps: emptySession(bench.steps),
    mode: { selected: bench.defaultMode },
    serial: { lastN: null, nextId: 1, lines: [] },
    notice: null,
    quiz: closedQuiz,
    tasks: Object.fromEntries(
      bench.tasks.map((task) => [task.id, { code: setup.starters[task.id] ?? "", running: false, result: null }]),
    ),
  };
}

function notify(state: BenchState, notice: Notice): BenchState {
  return { ...state, notice: { seq: (state.notice?.seq ?? 0) + 1, notice } };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Takes a room host's steps, mode and task code, and walks this screen's figure to the same place:
 * the finished steps' bridge commands in build order, then the faults the host's figure shows.
 * Quiz, notices, serial lines and task results stay this screen's own. Steps done by hand in the
 * host's figure have no command to replay.
 */
function hydrate(setup: BenchSetup, state: BenchState, raw: unknown, send: (command: FigureCommand) => void): BenchState {
  const { bench } = setup;
  if (!isRecord(raw) || raw.bench !== bench.id) return state;
  const hostSteps = isRecord(raw.steps) ? raw.steps : {};
  const steps: StepsSession = {};
  for (const step of bench.steps) {
    const p = hostSteps[step.id];
    steps[step.id] = isRecord(p) ? { done: p.done === true, seen: p.seen === true } : { done: false, seen: false };
  }
  const hostMode = isRecord(raw.mode) ? raw.mode.selected : undefined;
  const mode = typeof hostMode === "string" && bench.modes.some((m) => m.id === hostMode) ? { selected: hostMode } : state.mode;
  const hostTasks = isRecord(raw.tasks) ? raw.tasks : {};
  const tasks = Object.fromEntries(
    Object.entries(state.tasks).map(([id, task]) => {
      const code = isRecord(hostTasks[id]) ? hostTasks[id].code : undefined;
      return [id, typeof code === "string" ? { ...task, code, result: null } : task];
    }),
  );

  for (const step of bench.steps) if (steps[step.id].done && step.action) send(step.action);
  const figure = isRecord(raw.figure) && isRecord(raw.figure.state) ? (raw.figure.state as FigureState) : {};
  for (const fault of activeFaults(bench.faults, figure)) send(fault.figure);
  if (typeof figure.mode === "string" && bench.modes.some((m) => m.id === figure.mode)) send({ type: "set", state: { mode: figure.mode } });

  return { ...state, steps, mode, tasks };
}

function appendSerial(serial: BenchState["serial"], report: unknown): BenchState["serial"] {
  if (typeof report !== "object" || report === null) return serial;
  const { n, line } = report as { n?: unknown; line?: unknown };
  if (typeof n !== "number" || n === serial.lastN) return serial;
  if (typeof line !== "string") return { ...serial, lastN: n };
  const lines = [...serial.lines, { id: serial.nextId, text: line }].slice(-SERIAL_KEEP);
  return { lastN: n, nextId: serial.nextId + 1, lines };
}

/** The pure reducer: next state plus the effects to carry out. */
export function reduceBench(setup: BenchSetup, state: BenchState, action: BenchAction): [BenchState, BenchEffect[]] {
  const { bench } = setup;
  const effects: BenchEffect[] = [];
  const send = (command: FigureCommand) => effects.push({ kind: "send", command });

  switch (action.type) {
    case "figure/ready":
      return [{ ...state, figure: { ...state.figure, ready: true } }, effects];

    case "figure/state": {
      const figure = { ready: true, state: action.state };
      let next: BenchState = { ...state, figure, serial: appendSerial(state.serial, action.state.serial) };
      const moved = advanceSteps(bench.steps, bench.faults, next.steps, action.state);
      if (moved.completed.length === 0 && moved.seen.length === 0) return [next, effects];
      next = { ...next, steps: moved.session };
      for (const stepId of moved.seen) next = notify(next, { kind: "fault-seen", step: stepId });
      for (const stepId of moved.completed) {
        effects.push({ kind: "done", key: progressKey.roboticsStep(bench.id, stepId) });
        next = notify(next, { kind: "step-done", step: stepId });
        const step = bench.steps.find((s) => s.id === stepId);
        const quiz = step?.major ? quizAfter(bench.quizzes, stepId) : undefined;
        if (quiz) next = notify(next, { kind: "quiz-ready", quiz: quiz.id });
      }
      if (currentStepIndex(bench.steps, next.steps) === bench.steps.length && moved.completed.length > 0) {
        const endQuiz = bench.quizzes.find((quiz) => quiz.afterStep === null);
        next = notify(next, endQuiz ? { kind: "quiz-ready", quiz: endQuiz.id } : { kind: "all-done" });
      }
      return [next, effects];
    }

    case "figure/flash":
      return [notify(state, { kind: "figure", text: action.text }), effects];

    case "step/do": {
      const index = bench.steps.findIndex((s) => s.id === action.step);
      if (index === -1) return [state, effects];
      const step = bench.steps[index];
      if (!canStart(bench.steps, state.steps, step.id)) {
        const before = bench.steps[currentStepIndex(bench.steps, state.steps)];
        const refusal = step.refusal ? setup.texts[step.refusal] : undefined;
        if (refusal) send({ type: "flash", text: refusal, ms: 2600 });
        return [notify(state, { kind: "out-of-order", step: step.id, before: before?.id ?? step.id }), effects];
      }
      if (!step.action) return [notify(state, { kind: "by-hand", step: step.id }), effects];
      send(step.action);
      return [notify(state, { kind: "sent", step: step.id }), effects];
    }

    case "fault/trigger": {
      const fault = bench.faults.find((f) => f.id === action.fault);
      if (!fault) return [state, effects];
      send(fault.figure);
      return [state, effects];
    }

    case "fault/clear":
      send({ type: "set", state: { fault: null } });
      return [state, effects];

    case "mode/select":
      if (!bench.modes.some((m) => m.id === action.mode)) return [state, effects];
      return [{ ...state, mode: { selected: action.mode } }, effects];

    case "mode/run":
      if (!bench.modes.some((m) => m.id === action.mode)) return [state, effects];
      send({ type: "set", state: { mode: action.mode } });
      return [{ ...state, mode: { selected: action.mode } }, effects];

    case "part/select":
      send({ type: "set", state: { select: action.part } });
      return [state, effects];

    case "serial/clear":
      return [{ ...state, serial: { ...state.serial, lines: [] } }, effects];

    case "quiz/open":
      if (!bench.quizzes.some((q) => q.id === action.quiz)) return [state, effects];
      return [{ ...state, quiz: { ...closedQuiz, open: action.quiz } }, effects];

    case "quiz/choose": {
      const quiz = bench.quizzes.find((q) => q.id === state.quiz.open);
      const question = quiz?.questions[state.quiz.index];
      if (!question || state.quiz.checked || action.option < 0 || action.option >= question.options.length) return [state, effects];
      return [{ ...state, quiz: { ...state.quiz, answers: { ...state.quiz.answers, [question.id]: action.option } } }, effects];
    }

    case "quiz/check": {
      const quiz = bench.quizzes.find((q) => q.id === state.quiz.open);
      const question = quiz?.questions[state.quiz.index];
      if (!question || state.quiz.answers[question.id] === undefined) return [state, effects];
      return [{ ...state, quiz: { ...state.quiz, checked: true } }, effects];
    }

    case "quiz/next": {
      const quiz = bench.quizzes.find((q) => q.id === state.quiz.open);
      if (!quiz || !state.quiz.checked) return [state, effects];
      if (state.quiz.index + 1 < quiz.questions.length) {
        return [{ ...state, quiz: { ...state.quiz, index: state.quiz.index + 1, checked: false } }, effects];
      }
      const result = scoreQuiz(quiz, state.quiz.answers);
      effects.push({ kind: "quiz", key: progressKey.roboticsQuiz(bench.id, quiz.id), ...result });
      return [{ ...state, quiz: { ...state.quiz, result } }, effects];
    }

    case "quiz/close":
      return [{ ...state, quiz: closedQuiz }, effects];

    case "task/edit": {
      const task = state.tasks[action.task];
      if (!task) return [state, effects];
      return [{ ...state, tasks: { ...state.tasks, [action.task]: { ...task, code: action.code } } }, effects];
    }

    case "task/reset":
    case "task/solution": {
      const task = state.tasks[action.task];
      if (!task) return [state, effects];
      const code = (action.type === "task/reset" ? setup.starters : setup.solutions)[action.task] ?? task.code;
      return [{ ...state, tasks: { ...state.tasks, [action.task]: { ...task, code, result: null } } }, effects];
    }

    case "task/run": {
      const task = state.tasks[action.task];
      if (!task || task.running) return [state, effects];
      effects.push({ kind: "run", task: action.task, source: task.code });
      return [{ ...state, tasks: { ...state.tasks, [action.task]: { ...task, running: true } } }, effects];
    }

    case "task/result": {
      const task = state.tasks[action.task];
      if (!task) return [state, effects];
      let next: BenchState = { ...state, tasks: { ...state.tasks, [action.task]: { ...task, running: false, result: action.result } } };
      if (allPass(action.result)) {
        effects.push({ kind: "done", key: progressKey.roboticsTask(bench.id, action.task) });
        next = notify(next, { kind: "task-passed", task: action.task });
      }
      return [next, effects];
    }

    case "sync/hydrate":
      return [hydrate(setup, state, action.state, send), effects];
  }
}

export type EffectHandlers = { run(effect: BenchEffect, store: BenchStore): void };

export type BenchStore = LabStore<BenchState, BenchAction> & {
  /** Carries out effects (figure messages, progress, task runs). Returns a disconnect function. */
  connect(handlers: EffectHandlers): () => void;
};

export function createBenchStore(setup: BenchSetup): BenchStore {
  let state = initialBenchState(setup);
  const listeners = new Set<() => void>();
  let handlers: EffectHandlers | null = null;

  const store: BenchStore = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(action) {
      const [next, effects] = reduceBench(setup, state, action);
      if (next !== state) {
        state = next;
        for (const listener of [...listeners]) listener();
      }
      for (const effect of effects) handlers?.run(effect, store);
    },
    connect(next) {
      handlers = next;
      return () => {
        if (handlers === next) handlers = null;
      };
    },
  };
  return store;
}

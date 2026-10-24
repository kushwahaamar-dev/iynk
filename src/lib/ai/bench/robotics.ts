// Robotics Bench (src/lib/robotics/store.ts): the build steps, the mode, the
// task programs and their results, the serial monitor and the faults the
// figure reports. Code changes go to the task whose program they quote.

import type { BenchAction, BenchState } from "@/lib/robotics/store";
import type { ProposedChange } from "../tools";
import { genericFacts, isObj, label, previewChange, summarise } from "./generic";
import type { ApplyResult, BenchAdapter, BenchFacts, BenchTest } from "./types";

function isBenchState(state: unknown): state is BenchState {
  return isObj(state) && typeof state.bench === "string" && isObj(state.steps) && isObj(state.tasks) && isObj(state.figure);
}

const FIGURE_KEYS = ["status", "rails", "leds", "why", "missing", "meas", "controls", "power"];

function facts(state: BenchState, itemId: string): BenchFacts {
  const steps = Object.entries(state.steps);
  const done = steps.filter(([, step]) => step.done).length;
  const next = steps.find(([, step]) => !step.done)?.[0];
  const report = state.figure.state;
  const faults = [
    ...(typeof report.fault === "string" ? [report.fault] : []),
    ...(Array.isArray(report.faults) ? report.faults.map((fault) => label(fault)) : []),
  ];
  const tasks = Object.entries(state.tasks);
  const tests: BenchTest[] = [];
  const errors: string[] = [];
  for (const [id, task] of tasks) {
    const result = task.result;
    if (result?.status === "ok") {
      result.checks.forEach((check, i) => tests.push({ name: `task ${id} check ${i + 1}`, pass: check.pass, ...(check.detail ? { detail: check.detail } : {}) }));
    } else if (result?.status === "error") {
      errors.push(`task ${id}, line ${result.line}: ${result.message}`);
    }
  }
  const figure = Object.fromEntries(FIGURE_KEYS.filter((key) => report[key] !== undefined).map((key) => [key, report[key]]));
  return {
    title: `robotics bench ${itemId}`,
    context: [
      `build steps done: ${done}/${steps.length}${next ? `, next: ${next}` : ""}`,
      `mode: ${state.mode.selected}`,
      ...tasks.filter(([, task]) => task.running).map(([id]) => `running task ${id}`),
    ],
    parts: [],
    nets: [],
    code: tasks.length ? { lang: "", text: tasks.map(([id, task]) => `// task ${id}\n${task.code}`).join("\n\n") } : null,
    errors,
    serial: state.serial.lines.slice(-20).map((line) => line.text),
    faults: [...new Set(faults)],
    tests,
    numbers: [],
    other: Object.keys(figure).length ? `figure: ${summarise(figure, 3, 1500)}` : "",
  };
}

function apply(state: unknown, change: ProposedChange): ApplyResult {
  if (change.kind !== "code" || !isBenchState(state)) {
    if (!isBenchState(state)) return previewChange(genericFacts(state, ""), change);
    return { ok: false, error: "propose_change: on this bench propose a code change to a task, or say which build step to do" };
  }
  const tasks = Object.entries(state.tasks);
  const matching = change.find === "" ? tasks : tasks.filter(([, task]) => task.code.includes(change.find));
  if (matching.length !== 1) {
    return {
      ok: false,
      error: matching.length ? "propose_change: quote code from one task only" : "propose_change: find text is not in any task's code",
    };
  }
  const [task, { code }] = matching[0];
  const preview = previewChange({ ...genericFacts(null, ""), code: { lang: "", text: code } }, change);
  if (!preview.ok) return preview;
  const action: BenchAction = { type: "task/edit", task, code: preview.change.after };
  return { ok: true, change: { ...preview.change, actions: [action] } };
}

export const roboticsBench: BenchAdapter = {
  facts: (state, itemId) => (isBenchState(state) ? facts(state, itemId) : genericFacts(state, `robotics bench ${itemId}`)),
  apply,
};

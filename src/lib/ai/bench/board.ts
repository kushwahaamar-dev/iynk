// Board Lab bench (src/lib/boardlab/store.ts): the board, the lesson, the
// sketch, compile and run errors, the serial monitor, pin levels, the fault
// and the lesson checks. Only the code can be changed for the learner here.

import type { BoardLabAction, BoardLabState, SerialLine } from "@/lib/boardlab/store";
import type { ProposedChange } from "../tools";
import { genericFacts, isObj, previewChange, summarise } from "./generic";
import type { ApplyResult, BenchAdapter, BenchFacts } from "./types";

function isBoardState(state: unknown): state is BoardLabState {
  return isObj(state) && typeof state.board === "string" && typeof state.code === "string" && isObj(state.run) && isObj(state.serial);
}

function serialLine(line: SerialLine): string {
  const params = line.params ? ` ${JSON.stringify(line.params)}` : "";
  if (line.kind === "sys" || line.kind === "note") return `[lab] ${line.text}${params}`;
  if (line.kind === "in") return `> ${line.text}`;
  if (line.kind === "err") return `! ${line.text}`;
  return line.text;
}

const FIGURE_KEYS = ["leds", "rails", "why", "missing", "faults", "circuit", "meas", "status", "boot"];

function facts(state: BoardLabState, itemId: string): BenchFacts {
  const { run, checks } = state;
  const context = [
    `lesson: ${state.lesson ?? "board overview"}`,
    state.variant ? `variant: ${state.variant}` : "",
    `run: ${run.status}${run.status === "running" ? ` at ${Math.round(run.vt)} ms` : ""}`,
    `power: ${state.power ?? "unplugged"}`,
    state.selected ? `selected part: ${state.selected}` : "",
    state.edited ? "the learner edited the lesson code" : "",
  ].filter(Boolean);
  const pins = Object.entries(state.pins)
    .filter(([, pin]) => pin.mode !== "input" || pin.value)
    .slice(0, 24)
    .map(([name, pin]) => {
      const level = pin.pwm ? `${Math.round(pin.value * 100)}% PWM` : pin.value ? "HIGH" : "LOW";
      const extra = [pin.servoUs ? `${pin.servoUs} µs servo` : "", pin.volts !== undefined ? `${pin.volts} V` : ""].filter(Boolean).join(", ");
      return `pin ${name} (${pin.mode}): ${level}${extra ? `, ${extra}` : ""}`;
    });
  const inputs = Object.entries(state.inputs).map(([id, value]) => `input ${id}: ${value}`);
  const figure = Object.fromEntries(FIGURE_KEYS.filter((key) => state.figure[key] !== undefined).map((key) => [key, state.figure[key]]));
  return {
    title: `board ${itemId}`,
    context,
    parts: [],
    nets: [],
    code: { lang: state.language, text: state.code },
    errors: run.error
      ? [
          `line ${run.error.line}:${run.error.col} ${run.error.kind}: ${run.error.message}${run.error.hint ? ` (hint: ${run.error.hint})` : ""}`,
        ]
      : [],
    serial: state.serial.lines.slice(-20).map(serialLine),
    faults: state.fault ? [state.fault] : [],
    tests:
      checks.status === "done"
        ? checks.results.map((result, i) => ({ name: `lesson check ${i + 1}`, pass: result.ok, ...(result.detail ? { detail: result.detail } : {}) }))
        : [],
    numbers: [...pins, ...inputs],
    other: Object.keys(figure).length ? `figure: ${summarise(figure, 3, 1500)}` : "",
  };
}

function apply(state: unknown, change: ProposedChange): ApplyResult {
  if (change.kind !== "code") {
    return { ok: false, error: "propose_change: on a board only the code can change; propose a code change or describe the wiring" };
  }
  const preview = previewChange(boardBench.facts(state, ""), change);
  if (!preview.ok || !isBoardState(state)) return preview;
  const action: BoardLabAction = { type: "code/replace", code: preview.change.after };
  return { ok: true, change: { ...preview.change, actions: [action] } };
}

export const boardBench: BenchAdapter = {
  facts: (state, itemId) => (isBoardState(state) ? facts(state, itemId) : genericFacts(state, `board ${itemId}`)),
  apply,
};

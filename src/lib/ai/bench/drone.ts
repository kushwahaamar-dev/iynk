// Drone Lab bench (src/lib/dronelab/store.ts): the picked battery, motor and
// prop, what is fitted and which way round, the build and safety-test state,
// the configurator CLI and the figure's log. Part changes become design picks
// and bench add/remove actions.

import type { DroneLabAction, DroneLabState } from "@/lib/dronelab/store";
import type { ProposedChange } from "../tools";
import { genericFacts, isObj, previewChange } from "./generic";
import type { ApplyResult, BenchAdapter, BenchFacts } from "./types";

const DESIGN_KEYS = ["batt", "motor", "prop"] as const;
type DesignKey = (typeof DESIGN_KEYS)[number];

function isDroneState(state: unknown): state is DroneLabState {
  return isObj(state) && typeof state.id === "string" && isObj(state.pick) && isObj(state.figure) && isObj(state.cli);
}

const flag = (value: unknown) => value === true;

function facts(state: DroneLabState, itemId: string): BenchFacts {
  const report = state.figure;
  const placed = isObj(report.placed) ? Object.entries(report.placed) : [];
  const flight = isObj(report.flight) ? report.flight : {};
  const safety = [
    `smoke test ${flag(report.smokeOk) ? "passed" : "not passed yet"}`,
    `motor check ${flag(report.motorOk) ? "passed" : "not passed yet"}`,
    `accelerometer ${flag(report.accOk) ? "calibrated" : "not calibrated yet"}`,
  ].join(", ");
  const attempted = Object.keys(state.attempted);
  const mistakes = Array.isArray(flight.mistakes) ? flight.mistakes.map(String) : [];
  const faults = [
    ...(typeof report.fault === "string" ? [`fault: ${report.fault}`] : []),
    ...mistakes,
    ...(typeof report.wrongMotor === "string" ? [`wrong motor: ${report.wrongMotor}`] : []),
  ];
  const fitted = typeof report.fitted === "number" && typeof report.total === "number" ? `fitted ${report.fitted}/${report.total}` : "";
  return {
    title: `drone ${itemId}`,
    context: [
      `tab: ${state.tab}`,
      fitted,
      typeof report.next === "string" ? `next part to fit: ${report.next}` : "",
      flag(report.plugged) ? "battery plugged in" : "battery unplugged",
      flag(flight.ready) ? "ready to fly" : "",
      `safety: ${safety}`,
      attempted.length ? `tests run: ${attempted.join(", ")}` : "",
      state.sel ? `selected part: ${state.sel}` : "",
    ].filter(Boolean),
    parts: [
      ...DESIGN_KEYS.map((key) => `${key}: ${state.pick[key]}`),
      ...placed.map(([id, orient]) => `${id}: fitted${orient === 1 ? " reversed" : ""}`),
    ],
    nets: [],
    code: null,
    errors: [],
    serial: [...state.cli.lines.slice(-12).map((line) => line.text), ...state.log.lines.slice(-8)].filter(Boolean),
    faults,
    tests: [],
    numbers: [],
    other: "",
  };
}

const isDesignKey = (key: string): key is DesignKey => (DESIGN_KEYS as readonly string[]).includes(key);

function apply(state: unknown, change: ProposedChange): ApplyResult {
  const facts = droneBench.facts(state, "");
  if (change.kind !== "part" || !isDroneState(state)) {
    if (!isDroneState(state)) return previewChange(facts, change);
    return { ok: false, error: "propose_change: on a drone propose a part change: a battery, motor or prop pick, or a part to fit or remove" };
  }
  const actions: DroneLabAction[] = [];
  const pick = { ...state.pick };
  for (const set of change.set) {
    const key = isDesignKey(set.id) ? set.id : isDesignKey(set.prop) ? set.prop : null;
    if (!key) return { ok: false, error: `propose_change: "${set.id}" is not batt, motor or prop` };
    pick[key] = String(set.value);
    actions.push({ type: "design/pick", key, value: String(set.value) });
  }
  for (const add of change.add) actions.push({ type: "bench/add", id: add.id ?? add.part, orient: 0 });
  for (const id of change.remove) actions.push({ type: "bench/remove", id });
  const before = facts.parts.join("\n");
  const removed = new Set(change.remove);
  const after = [
    ...DESIGN_KEYS.map((key) => `${key}: ${pick[key]}`),
    ...facts.parts.slice(DESIGN_KEYS.length).filter((line) => !removed.has(line.split(":")[0])),
    ...change.add.map((add) => `${add.id ?? add.part}: fitted`),
  ].join("\n");
  return { ok: true, change: { actions, before, after } };
}

export const droneBench: BenchAdapter = {
  facts: (state, itemId) => (isDroneState(state) ? facts(state, itemId) : genericFacts(state, `drone ${itemId}`)),
  apply,
};

import type { Descriptor } from "../../parts/descriptor.ts";
import type { Model } from "../../parts/generated/types.ts";
import { ratingValue } from "./kinds.ts";

export type Bit = 0 | 1;
export type Out = 0 | 1 | "z";

export type LogicLayerModel = Extract<Model, { kind: "logic" }>;

export interface LogicWarning {
  shadowedRows: number[];
}

export interface LogicModel {
  inputs: readonly string[];
  outputs: readonly string[];
  rows: readonly { when: Readonly<Record<string, 0 | 1 | "x">>; then: Readonly<Record<string, Out>> }[];
  delayNs: number;
  driveOhms: number;
  warnings: readonly LogicWarning[];
}

/** The per-pin drive resistance of the legacy solver (`PIN_R` in figures/engine/bench-solve.js). */
const DEFAULT_DRIVE_OHMS = 25;
const NS_PER_S = 1e9;

function delayNs(layerModel: LogicLayerModel): number {
  const delay = layerModel.delay;
  if (delay === undefined) return 0;
  if (delay.unit !== "s") throw new RangeError(`a logic delay is in seconds, not ${delay.unit}`);
  const seconds = delay.value ?? delay.typ ?? delay.max ?? delay.min ?? 0;
  return Math.floor(seconds * NS_PER_S + 0.5);
}

/** Row `earlier` hides row `later` when every input that `earlier` pins is pinned to the same level by `later`. */
function hides(earlier: LogicModel["rows"][number], later: LogicModel["rows"][number], inputs: readonly string[]): boolean {
  return inputs.every((name) => {
    const pinned = earlier.when[name] ?? "x";
    return pinned === "x" || pinned === later.when[name];
  });
}

export function compileLogic(layerModel: LogicLayerModel, def: Descriptor): LogicModel {
  const rows = layerModel.table.map((row) => ({ when: row.when as Record<string, 0 | 1 | "x">, then: row.then as Record<string, Out> }));
  const shadowedRows: number[] = [];
  rows.forEach((row, index) => {
    if (rows.slice(0, index).some((earlier) => hides(earlier, row, layerModel.inputs))) shadowedRows.push(index);
  });
  return {
    inputs: layerModel.inputs,
    outputs: layerModel.outputs,
    rows,
    delayNs: delayNs(layerModel),
    driveOhms: layerModel.output_drive === undefined ? DEFAULT_DRIVE_OHMS : ratingValue(def, layerModel.output_drive),
    warnings: shadowedRows.length > 0 ? [{ shadowedRows }] : [],
  };
}

/** The first row that matches wins. With no match every output floats and `matchedRow` is -1. */
export function evalLogic(m: LogicModel, inputs: Readonly<Record<string, Bit>>): { outputs: Record<string, Out>; matchedRow: number } {
  const outputs: Record<string, Out> = {};
  let matchedRow = -1;
  for (let i = 0; i < m.rows.length && matchedRow < 0; i++) {
    const when = m.rows[i].when;
    let matches = true;
    for (let k = 0; k < m.inputs.length; k++) {
      const wanted = when[m.inputs[k]];
      if (wanted !== undefined && wanted !== "x" && wanted !== inputs[m.inputs[k]]) {
        matches = false;
        break;
      }
    }
    if (matches) matchedRow = i;
  }
  const then = matchedRow < 0 ? undefined : m.rows[matchedRow].then;
  for (let k = 0; k < m.outputs.length; k++) outputs[m.outputs[k]] = then?.[m.outputs[k]] ?? "z";
  return { outputs, matchedRow };
}

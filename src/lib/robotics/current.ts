// The bench's current-draw model (RoboticsContent.current): every load whose condition holds draws
// `ma + maPerUnit × value(key)` from its supply; an active fault adds its `extraMa` to the first supply.

import type { CurrentModel, FailureMode, FigureState, TextKey } from "@/content/schema";
import { condHolds, numberAt } from "./state";

export type LoadDraw = { id: string; label: TextKey; ma: number };

export type SupplyDraw = {
  id: string;
  label: TextKey;
  volts: number;
  limitMa: number;
  ma: number;
  /** Positive when the loads stay under the limit, negative by how much they exceed it. */
  headroomMa: number;
  over: boolean;
  loads: LoadDraw[];
};

export type CurrentDraw = { supplies: SupplyDraw[]; totalMa: number; over: boolean };

const round1 = (n: number) => Math.round(n * 10) / 10;

export function loadMa(load: CurrentModel["loads"][number], state: FigureState): number {
  if (Object.keys(load.when).length > 0 && !condHolds(load.when, state)) return 0;
  let ma = load.ma;
  if (load.perUnit) {
    const value = numberAt(state, load.perUnit.key);
    if (Number.isFinite(value)) ma += load.perUnit.maPerUnit * value;
  }
  return Math.max(0, ma);
}

export function currentDraw(model: CurrentModel, state: FigureState, faults: readonly FailureMode[] = []): CurrentDraw {
  const supplies = model.supplies.map((supply, index): SupplyDraw => {
    const loads: LoadDraw[] = model.loads
      .filter((load) => load.supply === supply.id)
      .map((load) => ({ id: load.id, label: load.label, ma: round1(loadMa(load, state)) }))
      .filter((load) => load.ma > 0);
    if (index === 0) {
      for (const fault of faults) {
        const extra = fault.effect.extraMa ?? 0;
        if (extra > 0) loads.push({ id: `fault:${fault.id}`, label: fault.title, ma: round1(extra) });
      }
    }
    const ma = round1(loads.reduce((sum, load) => sum + load.ma, 0));
    return {
      id: supply.id,
      label: supply.label,
      volts: supply.volts,
      limitMa: supply.limitMa,
      ma,
      headroomMa: round1(supply.limitMa - ma),
      over: ma > supply.limitMa,
      loads,
    };
  });
  return {
    supplies,
    totalMa: round1(supplies.reduce((sum, supply) => sum + supply.ma, 0)),
    over: supplies.some((supply) => supply.over),
  };
}

/** `currentMa` (all supplies) or `currentMa.<supplyId>`, for status fields; undefined for other keys. */
export function currentReading(draw: CurrentDraw, key: string): number | undefined {
  if (key === "currentMa") return draw.totalMa;
  if (key.startsWith("currentMa.")) return draw.supplies.find((s) => s.id === key.slice("currentMa.".length))?.ma;
  return undefined;
}

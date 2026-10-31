import type { BrownoutDetector, RegulatorModel } from "../analog/types.ts";
import boardPowerData from "./data/board-power.json" with { type: "json" };
import type { ParameterSource } from "./types.ts";

export interface PowerSource {
  id: "usb" | "pin5" | "pin3v3";
  nominalV: number;
  minV?: number;
  maxV?: number;
  dropV?: number;
  limitA?: number;
}

export interface BoardPowerModel {
  id: string;
  source: string;
  sources: PowerSource[];
  regulator: RegulatorModel;
  mcu: { part: string; rail: string; minV: number; requires: string[] };
  brownout: BrownoutDetector;
  protection: { source: string; present: boolean }[];
  notModelled: string[];
  parameterSources: ParameterSource[];
}

const MODELS = new Map((boardPowerData as BoardPowerModel[]).map((m) => [m.id, m]));

export function boardPower(id: string): BoardPowerModel | undefined {
  return MODELS.get(id);
}

function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be a finite number, got ${value}`);
  return value;
}

export function regulatorOut(m: RegulatorModel, vin: number): number {
  finite(vin, "vin");
  return Math.max(0, Math.min(m.voutVolts, vin - m.dropoutVolts));
}

export function mcuPowered(m: BoardPowerModel, railV: number): boolean {
  return finite(railV, "railV") >= m.mcu.minV;
}

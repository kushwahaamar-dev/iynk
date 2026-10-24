// Live status fields (RoboticsContent.status) read from the figure state and the current model.

import type { FigureState, StatusField } from "@/content/schema";
import { currentReading, type CurrentDraw } from "./current";
import { valueAt } from "./state";

export type StatusUnit = "ma" | "volts" | "percent" | "rpm" | "deg" | "cm" | "hz";

export type StatusReading =
  | { kind: "none" }
  | { kind: "on-off"; on: boolean }
  | { kind: "high-low"; high: boolean }
  | { kind: "running"; running: boolean }
  | { kind: "text"; text: string }
  | { kind: "number"; value: number; unit: StatusUnit | null };

const DIGITS: Record<StatusUnit | "number", number> = { ma: 1, volts: 2, percent: 0, rpm: 0, deg: 1, cm: 1, hz: 0, number: 2 };

function roundTo(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function truthy(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (["on", "high", "running", "yes", "true", "1"].includes(v)) return true;
    if (["off", "low", "stopped", "no", "false", "0", ""].includes(v)) return false;
  }
  return undefined;
}

export function readStatus(field: StatusField, state: FigureState, draw: CurrentDraw): StatusReading {
  const fromCurrent = currentReading(draw, field.key);
  const raw = fromCurrent ?? valueAt(state, field.key);
  if (raw === undefined || raw === null) return { kind: "none" };

  switch (field.format) {
    case "on-off": {
      const on = truthy(raw);
      return on === undefined ? { kind: "none" } : { kind: "on-off", on };
    }
    case "high-low": {
      const high = truthy(raw);
      return high === undefined ? { kind: "none" } : { kind: "high-low", high };
    }
    case "running": {
      const running = raw === "running" || raw === true || raw === 1;
      return { kind: "running", running };
    }
    case "text":
      return typeof raw === "string" || typeof raw === "number" ? { kind: "text", text: String(raw) } : { kind: "none" };
    default: {
      const value = typeof raw === "number" ? raw : typeof raw === "boolean" ? Number(raw) : Number.NaN;
      if (!Number.isFinite(value)) return { kind: "none" };
      if (field.format === "number") return { kind: "number", value: roundTo(value, DIGITS.number), unit: null };
      // Duty and other fractions arrive as 0..1 (FIGURES-BENCH §13); show them as percent.
      const shown = field.format === "percent" ? value * 100 : value;
      return { kind: "number", value: roundTo(shown, DIGITS[field.format]), unit: field.format };
    }
  }
}

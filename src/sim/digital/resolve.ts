import { type SimDiagnostic, simDiag } from "../core/diagnostic.ts";

export type Logic = 0 | 1 | "Z" | "X";

export interface PinDriver {
  id: string;
  level: Logic;
  strength: "strong" | "weak" | "none";
  rOutOhms?: number;
}

/** The levels a net is driven to by drivers of one strength; `Z` drivers do not count. */
function levels(drivers: PinDriver[], strength: PinDriver["strength"]): Logic[] {
  return drivers.filter((d) => d.strength === strength && d.level !== "Z").map((d) => d.level);
}

function agree(found: Logic[]): Logic {
  return found.every((level) => level === found[0]) ? found[0] : "X";
}

/** Strong beats weak, drivers of one strength that disagree give `X`, no driver gives `Z` (SIMULATION 5.7). */
export function resolve(drivers: PinDriver[]): Logic {
  const strong = levels(drivers, "strong");
  if (strong.length > 0) return agree(strong);
  const weak = levels(drivers, "weak");
  return weak.length > 0 ? agree(weak) : "Z";
}

/** `output-contention` when two strong drivers disagree, else null. */
export function outputContention(net: string, drivers: PinDriver[]): SimDiagnostic | null {
  const strong = levels(drivers, "strong");
  return strong.some((level) => level !== strong[0]) ? simDiag("output-contention", "error", { net }) : null;
}

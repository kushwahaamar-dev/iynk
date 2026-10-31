export type RailsView = { supplyMa: number | null; vin: number | null; brownout: boolean } | null;

export type StatusView = { kind: "ok" | "brownout" | "unknown"; supplyMa: number | null };

/** What the status panel says about the board's power; no analog result means no number. */
export function statusFrom(rails: RailsView): StatusView {
  if (!rails) return { kind: "unknown", supplyMa: null };
  return { kind: rails.brownout ? "brownout" : "ok", supplyMa: rails.supplyMa === null ? null : Math.round(rails.supplyMa * 10) / 10 };
}

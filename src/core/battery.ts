export type CellChemistry = "lipo" | "lihv" | "liion";

/** Open-circuit voltage per cell against state of charge, 0..1 in even steps. Index 0 is empty. */
export const OCV: Record<CellChemistry, number[]> = {
  lipo: [3.0, 3.6, 3.7, 3.75, 3.79, 3.83, 3.87, 3.92, 4.0, 4.08, 4.2],
  lihv: [3.0, 3.62, 3.74, 3.8, 3.86, 3.91, 3.97, 4.04, 4.12, 4.22, 4.35],
  liion: [2.8, 3.3, 3.45, 3.55, 3.62, 3.68, 3.75, 3.84, 3.94, 4.05, 4.2],
};

/** Warning and cut-off voltages per cell, under load. */
export const LIMITS: Record<CellChemistry, { low: number; cut: number }> = {
  lipo: { low: 3.5, cut: 3.2 },
  lihv: { low: 3.55, cut: 3.25 },
  liion: { low: 3.1, cut: 2.9 },
};

/** Internal resistance per cell (ohm) times capacity (Ah): a bigger pack sags less. */
const IR_AH: Record<CellChemistry, number> = { lipo: 0.0066, lihv: 0.0066, liion: 0.08 };

export const NOMINAL_CELL = 3.7;

/** Interpolates an evenly spaced table that runs from empty (index 0) to full. `soc` is clamped to 0..1. */
export function ocvAt(table: readonly number[], soc: number): number {
  const last = table.length - 1;
  const s = Math.max(0, Math.min(1, soc)) * last;
  const i = Math.min(last - 1, Math.floor(s));
  return table[i] + (table[i + 1] - table[i]) * (s - i);
}

export function ocv(chem: CellChemistry, soc: number): number {
  return ocvAt(OCV[chem], soc);
}

export function cellResistance(chem: CellChemistry, mah: number): number {
  return IR_AH[chem] / Math.max(0.05, mah / 1000);
}

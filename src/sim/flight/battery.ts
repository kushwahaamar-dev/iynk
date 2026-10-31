import { checkAll, type OutOfRange } from './guards';

export type FlyChem = 'lipo' | 'lihv' | 'liion';

/** Open-circuit voltage per cell against state of charge, empty to full. */
export const OCV_PER_CELL: Readonly<Record<FlyChem, readonly number[]>> = {
  lipo: [3.0, 3.6, 3.7, 3.75, 3.79, 3.83, 3.87, 3.92, 4.0, 4.08, 4.2],
  lihv: [3.0, 3.62, 3.74, 3.8, 3.86, 3.91, 3.97, 4.04, 4.12, 4.22, 4.35],
  liion: [2.8, 3.3, 3.45, 3.55, 3.62, 3.68, 3.75, 3.84, 3.94, 4.05, 4.2],
};

/** Warning and cut-off voltages per cell, under load. */
export const CELL_LIMITS: Readonly<Record<FlyChem, { low: number; cut: number }>> = {
  lipo: { low: 3.5, cut: 3.2 },
  lihv: { low: 3.55, cut: 3.25 },
  liion: { low: 3.1, cut: 2.9 },
};

/** Internal resistance per cell (ohm) times capacity (Ah): a bigger pack sags less. */
const IR_AH: Readonly<Record<FlyChem, number>> = { lipo: 0.0066, lihv: 0.0066, liion: 0.08 };

export const NOMINAL_CELL = 3.7;

export interface PackSI {
  chem: FlyChem;
  cells: number;
  parallel: number;
  capacity_mah: number;
  r_cell_ohm: number | null;
  /** Volts per cell, full to empty. */
  ocv_table?: readonly number[];
  c_continuous?: number;
  c_burst?: number;
  mass_g: number;
}

/** Interpolates a table given empty to full, spread evenly over state of charge 0..1. */
export function ocvAt(table: readonly number[], soc: number): number {
  const n = table.length - 1;
  const s = Math.max(0, Math.min(1, soc)) * n;
  const i = Math.min(n - 1, Math.floor(s));
  return table[i] + (table[i + 1] - table[i]) * (s - i);
}

export function ocvCell(p: PackSI, soc: number): number {
  const table = p.ocv_table ? [...p.ocv_table].reverse() : OCV_PER_CELL[p.chem];
  return ocvAt(table, soc);
}

export function defaultCellResistance(chem: FlyChem, mah: number): number {
  return IR_AH[chem] / Math.max(0.05, mah / 1000);
}

export function checkPack(p: PackSI): OutOfRange | null {
  return (
    checkAll([
      ['cells', p.cells, { min: 1, max: 24, integer: true }],
      ['capacity_mah', p.capacity_mah, { min: 0, max: Infinity, minExclusive: true }],
      ['r_cell_ohm', p.r_cell_ohm ?? 1, { min: 0, max: Infinity, minExclusive: true }],
    ]) ??
    (p.ocv_table && (p.ocv_table.length < 2 || p.ocv_table.length > 64)
      ? { error: 'out-of-range', field: 'ocv_table', value: p.ocv_table.length, min: 2, max: 64 }
      : null)
  );
}

export function packResistance(p: PackSI): number {
  return p.cells * (p.r_cell_ohm ?? defaultCellResistance(p.chem, p.capacity_mah));
}

export function packOpen(p: PackSI, soc: number): number {
  return p.cells * ocvCell(p, soc);
}

/** Volts per cell with `amps` flowing from the whole pack. */
export function loadedCell(p: PackSI, soc: number, amps: number): number {
  return Math.max(0, ocvCell(p, soc) - (amps * packResistance(p)) / p.cells);
}

export function status(p: PackSI, soc: number, amps: number): 'ok' | 'low' | 'cut' {
  const v = loadedCell(p, soc, amps);
  const lim = CELL_LIMITS[p.chem];
  return v < lim.cut ? 'cut' : v < lim.low ? 'low' : 'ok';
}

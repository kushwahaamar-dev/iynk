import { type CellChemistry, OCV, ocvAt } from "../../core/battery.ts";
import { fail, ok, type Result } from "../../core/result.ts";

export interface PackParams {
  cells: number;
  parallel: number;
  capacityMah: number;
  rCellOhm: number;
  chemistry?: CellChemistry;
  /** Per-cell open-circuit volts from full to empty, as a descriptor stores it. */
  ocvTable?: number[];
}

export interface Pack {
  terminalV(iA: number): number;
  /** Draws `iA` for `hS` seconds; a negative current charges the pack up to full. */
  step(iA: number, hS: number): void;
  soc(): number;
  openCircuitV(): number;
}

export interface PackError {
  code: "no-ocv" | "bad-cells";
  message: string;
}

export function createPack(p: PackParams, soc0 = 1): Result<Pack, PackError> {
  if (!Number.isInteger(p.cells) || p.cells < 1) {
    return fail({ code: "bad-cells", message: "A pack needs at least one cell in series." });
  }
  const table = p.ocvTable ? [...p.ocvTable].reverse() : p.chemistry && OCV[p.chemistry];
  if (!table) {
    return fail({ code: "no-ocv", message: "A pack needs a known chemistry or an ocv_table." });
  }
  if (table.length < 2 || table.some((v, i) => i > 0 && v < table[i - 1])) {
    return fail({ code: "no-ocv", message: "The ocv_table must hold at least two values and fall from full to empty." });
  }

  const parallel = Math.max(1, p.parallel);
  const capacityAs = 3.6 * p.capacityMah * parallel;
  let soc = Math.max(0, Math.min(1, soc0));

  const openCircuitV = () => p.cells * ocvAt(table, soc);
  return ok({
    terminalV: (iA) => openCircuitV() - (iA * p.cells * p.rCellOhm) / parallel,
    step(iA, hS) {
      soc = Math.max(0, Math.min(1, soc - (iA * hS) / capacityAs));
    },
    soc: () => soc,
    openCircuitV,
  });
}

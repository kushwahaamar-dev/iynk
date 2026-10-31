import { describe, expect, it } from 'vitest';
import { cellResistance, LIMITS, ocv } from '@/lib/flight/battery';
import type { Chemistry } from '@/lib/flight/types';
import {
  CELL_LIMITS,
  checkPack,
  defaultCellResistance,
  loadedCell,
  ocvAt,
  ocvCell,
  OCV_PER_CELL,
  packOpen,
  packResistance,
  status,
  type FlyChem,
  type PackSI,
} from './battery';

const CHEMS: FlyChem[] = ['lipo', 'lihv', 'liion'];

const pack = (over: Partial<PackSI> = {}): PackSI => ({
  chem: 'lipo',
  cells: 4,
  parallel: 1,
  capacity_mah: 1500,
  r_cell_ohm: null,
  mass_g: 180,
  ...over,
});

describe('battery tables', () => {
  it('are the game tables, element for element', () => {
    expect(OCV_PER_CELL.lipo).toEqual([3.0, 3.6, 3.7, 3.75, 3.79, 3.83, 3.87, 3.92, 4.0, 4.08, 4.2]);
    expect(OCV_PER_CELL.lihv[10]).toBe(4.35);
    expect(OCV_PER_CELL.liion[0]).toBe(2.8);
    expect(LIMITS).toBe(CELL_LIMITS);
  });

  it('FlyChem and the game Chemistry accept each other', () => {
    const a: FlyChem = 'lipo' as Chemistry;
    const b: Chemistry = 'liion' as FlyChem;
    expect([a, b]).toHaveLength(2);
  });

  it('ocvAt matches the game ocv on random states', () => {
    for (let k = 0; k < 1000; k++) {
      const chem = CHEMS[k % 3];
      const soc = Math.random() * 1.4 - 0.2;
      expect(ocvAt(OCV_PER_CELL[chem], soc)).toBe(ocv(chem, soc));
    }
  });
});

describe('pack functions', () => {
  it('default resistance is cells times the per-cell rule', () => {
    for (const chem of CHEMS) {
      const p = pack({ chem });
      expect(packResistance(p)).toBe(p.cells * cellResistance(chem, p.capacity_mah));
      expect(defaultCellResistance(chem, 1500)).toBe(cellResistance(chem, 1500));
    }
  });

  it('uses the pack own resistance when given', () => {
    expect(packResistance(pack({ r_cell_ohm: 0.02 }))).toBeCloseTo(0.08, 12);
  });

  it('reverses a user table given full to empty', () => {
    const p = pack({ ocv_table: [4.2, 3.8, 3.0] });
    expect(ocvCell(p, 1)).toBe(4.2);
    expect(ocvCell(p, 0.5)).toBe(3.8);
    expect(ocvCell(p, 0)).toBe(3.0);
    expect(packOpen(p, 1)).toBeCloseTo(16.8, 12);
  });

  it('clamps soc', () => {
    expect(ocvCell(pack(), 2)).toBe(4.2);
    expect(ocvCell(pack(), -1)).toBe(3.0);
  });

  it('loaded voltage falls with current', () => {
    const p = pack();
    expect(loadedCell(p, 0.7, 20)).toBeLessThan(loadedCell(p, 0.7, 5));
    expect(loadedCell(p, 0.7, 0)).toBe(ocvCell(p, 0.7));
  });

  it('a tired high-resistance pack sags lower', () => {
    expect(loadedCell(pack({ r_cell_ohm: 0.05 }), 0.5, 15)).toBeLessThan(loadedCell(pack(), 0.5, 15));
  });

  it('status follows the per-cell limits', () => {
    const p = pack({ r_cell_ohm: 0.01 });
    expect(status(p, 1, 0)).toBe('ok');
    expect(status(p, 0.05, 0)).toBe('low');
    expect(status(p, 0, 0)).toBe('cut');
    expect(status(p, 1, 150)).toBe('cut');
  });
});

describe('checkPack', () => {
  it('accepts a normal pack', () => {
    expect(checkPack(pack())).toBeNull();
    expect(checkPack(pack({ r_cell_ohm: 0.01, ocv_table: [4.2, 3.0] }))).toBeNull();
  });

  it('rejects bad fields', () => {
    expect(checkPack(pack({ cells: 0 }))?.field).toBe('cells');
    expect(checkPack(pack({ cells: 25 }))?.field).toBe('cells');
    expect(checkPack(pack({ cells: 3.5 }))?.field).toBe('cells');
    expect(checkPack(pack({ capacity_mah: 0 }))?.field).toBe('capacity_mah');
    expect(checkPack(pack({ r_cell_ohm: 0 }))?.field).toBe('r_cell_ohm');
    expect(checkPack(pack({ ocv_table: [4.2] }))?.field).toBe('ocv_table');
    expect(checkPack(pack({ ocv_table: new Array(65).fill(3.7) }))?.field).toBe('ocv_table');
  });
});

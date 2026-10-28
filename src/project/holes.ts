import type { ComponentDependency, InterfaceGroup, InterfacePin } from "./generated/types.ts";

export type SurfaceKind = "half" | "full" | "mini";
export type InterfaceSnapshot = ComponentDependency["interface"];

export interface SurfaceGeometry {
  cols: number;
  rails: boolean;
  railCols: number[];
}

const COLUMNS: Record<SurfaceKind, { cols: number; rails: boolean }> = {
  half: { cols: 30, rails: true },
  full: { cols: 63, rails: true },
  mini: { cols: 17, rails: false },
};

const ROWS = "abcdefghij";
const UPPER_ROWS = "abcde";
const RAILS = [
  ["T+", "RAIL_TP"],
  ["T-", "RAIL_TN"],
  ["B+", "RAIL_BP"],
  ["B-", "RAIL_BN"],
] as const;

const GRID_HOLE = /^([a-j])(\d{1,2})$/;
const RAIL_HOLE = /^([TB][+-])(\d{1,2})$/;

/** Columns, rails and the rail columns of a breadboard, as the figure's `B.bbGeom` computes them. */
export function surfaceGeometry(kind: SurfaceKind): SurfaceGeometry {
  const { cols, rails } = COLUMNS[kind];
  const railCols: number[] = [];
  if (rails) {
    for (let k = 0; k < Math.floor((cols * 5) / 6); k++) {
      const c = 2 + k + Math.floor(k / 5);
      if (c <= cols) railCols.push(c);
    }
  }
  return { cols, rails, railCols };
}

/** The interface snapshot of a breadboard: every hole as a pin and every strip and rail as a `strip` group. */
export function surfaceInterface(kind: SurfaceKind): InterfaceSnapshot {
  const { cols, rails, railCols } = surfaceGeometry(kind);
  const pins: InterfacePin[] = [];
  const groups: InterfaceGroup[] = [];
  const hole = (id: string): InterfacePin => ({ id, type: "passive", class: "passive" });
  for (let c = 1; c <= cols; c++) {
    for (const r of ROWS) pins.push(hole(`${r}${c}`));
    for (const [side, rows] of [["u", UPPER_ROWS], ["l", ROWS.slice(UPPER_ROWS.length)]] as const) {
      const [first, second, ...rest] = [...rows].map((r) => `${r}${c}`);
      groups.push({ id: `S${c}${side}`, kind: "strip", pins: [first!, second!, ...rest] });
    }
  }
  if (rails) {
    for (const [, rail] of RAILS) {
      const [first, second, ...rest] = railCols.map((c) => `${rail}${c}`);
      for (const c of railCols) pins.push(hole(`${rail}${c}`));
      groups.push({ id: rail, kind: "strip", pins: [first!, second!, ...rest] });
    }
  }
  return { role: "surface", pins, groups, params: [] };
}

/** The pin id of a legacy hole name: `b10` stays, `T+12` becomes the nearest rail column. Anything else is null. */
export function holeToPin(kind: SurfaceKind, legacyRef: string): string | null {
  const geo = surfaceGeometry(kind);
  const grid = GRID_HOLE.exec(legacyRef);
  if (grid) {
    const c = Number(grid[2]);
    return c >= 1 && c <= geo.cols ? legacyRef : null;
  }
  const rail = RAIL_HOLE.exec(legacyRef);
  if (!rail || !geo.rails) return null;
  const want = Number(rail[2]);
  let best = geo.railCols[0]!;
  for (const c of geo.railCols) if (Math.abs(c - want) < Math.abs(best - want)) best = c;
  return `${RAILS.find(([name]) => name === rail[1])![1]}${best}`;
}

/** Hole pin id to the id of its strip, for the `strip` groups of a surface snapshot. */
export function stripOfHole(iface: InterfaceSnapshot): Map<string, string> {
  const strips = new Map<string, string>();
  for (const group of iface.groups ?? []) {
    if (group.kind !== "strip") continue;
    for (const pin of group.pins) strips.set(pin, group.id);
  }
  return strips;
}

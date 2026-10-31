import { blankProject } from "../../../project/blank.ts";
import type { Project } from "../../../project/generated/types.ts";
import type { ArtElement, ArtProvider, ResolvedPartShape } from "../types.ts";

export const VIEW_ID = "vw_bb";
export const PART_DEF = "core.resistor";
export const UNKNOWN_DEF = "core.mystery";

const PART_W = 10;
const PART_H = 3;

export const stubArt: ArtProvider = {
  get: (_defRef, lod, mode) => {
    const n = lod === 2 && mode === "illustrated" ? 12 : 4;
    return Array.from({ length: n }, (_, i): ArtElement => ({ t: "rect", x: i * 0.5, y: 0, w: 0.4, h: PART_H, fill: "var(--studio-body)" }));
  },
};

export function resolveShape(defRef: string): ResolvedPartShape {
  return {
    widthMm: PART_W,
    heightMm: PART_H,
    known: defRef !== UNKNOWN_DEF,
    pins: [
      { id: "1", xMm: 0, yMm: PART_H / 2, mechanical: false },
      { id: "2", xMm: PART_W, yMm: PART_H / 2, mechanical: false },
      { id: "M", xMm: PART_W / 2, yMm: 0, mechanical: true },
    ],
  };
}

/** `parts` resistors on a grid 20 mm apart, 10 per row, and `wires` wires from the second pin of one part to the first pin of the next. */
export function miniProject(parts = 20, wires = 30): Project {
  const p = blankProject({ board: "uno", title: "mini", locale: "en", actor: "act_a", now: "2026-10-28T00:00:00.000Z", id: "prj_mini" });
  const view = p.views.find((v) => v.id === VIEW_ID)!;
  for (let i = 0; i < parts; i++) {
    const c = `cmp_${i}`;
    p.components.push({ id: c, definition: { ref: PART_DEF, version: "1.0.0" }, refdes: `R${i + 1}` });
    view.placements.push({ c, x_mm: (i % 10) * 20, y_mm: Math.floor(i / 10) * 20 });
  }
  for (let i = 0; i < wires; i++) {
    const a = i % parts;
    const b = (i + 1) % parts;
    view.wires.push({
      id: `wir_${i}`,
      net: `net_${i}`,
      from: { kind: "pin", c: `cmp_${a}`, p: "2" },
      to: { kind: "pin", c: `cmp_${b}`, p: "1" },
    });
  }
  return p;
}

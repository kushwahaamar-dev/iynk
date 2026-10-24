import type { Course } from "../types";

// "Freestyle bando" for the 5-inch quad, rebuilt from the original's layout with its defects fixed:
// - the race gates are real, visible gates (solid posts and bar) on a loop that crosses no scenery;
// - TOWER TOP is reachable: the field's height limit is 16 m, so altitude hold tops out near 14 m,
//   well above the tower slab (10.3 m);
// - BANDO's ring sits in the 3.7 m bay between two pillars instead of behind the middle one;
// - LAND means landing: touch down on the pad, slowly;
// - every solid has a kind, so the crash message names what you hit.
export const quad5Course: Course = {
  id: "quad5-bando",
  title: "Freestyle bando",
  brief: "Thread the gap, fly through the bando, top the tower, dive it, land",
  field: 40,
  pad: [20, 6],
  ground: "#dde3cc",
  ceiling: 16,
  wind: { speed: 3, from: 200, gust: 2.5 },
  prims: [
    { type: "flat", x: 20, y: 21, w: 3, d: 32, col: "#d4cfc4", label: "OLD ROAD" },
    { type: "flat", x: 30, y: 22, w: 10, d: 14, col: "#cfc8b8" },
    // the bando: six pillars, two floors, a back wall
    ...[26.3, 30, 33.7].flatMap((x) => [16.3, 27.7].map((y) => ({ type: "box" as const, x, y, w: 0.6, d: 0.6, h: 6.3, col: "#bdb6a6", kind: "pillar" as const }))),
    { type: "box", x: 30, y: 22, z: 3, w: 8, d: 12, h: 0.3, col: "#c9c2b2", kind: "building" },
    { type: "box", x: 30, y: 22, z: 6, w: 8, d: 12, h: 0.3, col: "#c9c2b2", kind: "building" },
    { type: "box", x: 33.7, y: 22, w: 0.3, d: 11, h: 3, col: "#b3ab9a", kind: "wall" },
    // the gap: two walls 1.2 m apart
    { type: "box", x: 15, y: 20, w: 0.4, d: 6, h: 4, col: "#e0a26a", kind: "wall" },
    { type: "box", x: 16.6, y: 20, w: 0.4, d: 6, h: 4, col: "#e0a26a", kind: "wall" },
    // the dive tower
    { type: "box", x: 8, y: 30, w: 3, d: 3, h: 10, col: "#c6bfae", kind: "tower" },
    { type: "box", x: 8, y: 30, z: 10, w: 3.6, d: 3.6, h: 0.3, col: "#b3ab9a", kind: "tower" },
    // power poles along the north edge
    ...[5, 12, 19, 26, 33].map((x) => ({ type: "pole" as const, x, y: 37, h: 8 })),
    { type: "tree", x: 5, y: 9, h: 3.2 },
    { type: "tree", x: 36, y: 8, h: 3.6 },
    { type: "tree", x: 24, y: 33, h: 2.8 },
    { type: "tree", x: 11, y: 14, h: 2.6 },
    { type: "tree", x: 36, y: 33, h: 3 },
    { type: "cyl", x: 23, y: 12, r: 0.5, h: 0.9, col: "#f4b829", kind: "barrel" },
    { type: "cyl", x: 24.2, y: 12.4, r: 0.5, h: 0.9, col: "#5a82c6", kind: "barrel" },
  ],
  // a five-gate loop through the open ground: south lawn, the road, behind the gap, back down the west side
  gates: [
    { x: 20, y: 11, heading: 90, w: 1.6, h: 1.6, col: "#ef6a4c" },
    { x: 21, y: 20.5, heading: 90, w: 1.6, h: 1.6, col: "#f4b829" },
    { x: 19, y: 30, heading: 150, w: 1.6, h: 1.6, col: "#93d3b0" },
    { x: 12.5, y: 22, heading: 270, w: 1.6, h: 1.6, col: "#76a0e2" },
    { x: 13, y: 8, heading: 300, w: 1.6, h: 1.6, col: "#f3a6bb" },
  ],
  checkpoints: [
    { label: "THE GAP", x: 15.8, y: 20, z: 2, r: 0.8, heading: 90 },
    { label: "BANDO", x: 28.15, y: 22, z: 1.5, r: 1.1, heading: 90 },
    { label: "TOWER TOP", x: 8, y: 30, z: 11.6, r: 1.6 },
    { label: "DIVE", x: 8, y: 26.8, z: 1.8, r: 1.3, heading: -90 },
    { label: "LAND", x: 20, y: 6, z: 0, r: 1.5, land: true },
  ],
};

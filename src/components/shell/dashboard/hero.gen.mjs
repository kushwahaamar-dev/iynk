// Draws the dashboard hero with the Colorfigures engine and writes hero.svg,
// a self-contained drawing the page loads as an image. Run it after changing
// the scene:
//   node src/components/shell/dashboard/hero.gen.mjs [path/to/core.js]
// The default engine is the installed skill's core.js (MIT, April Zhu); only its
// drawing primitives are used, so a few browser globals are stubbed out.

import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const corePath = process.argv[2] ?? path.join(homedir(), ".claude/skills/colorfigures/assets/core.js");
const noop = () => {};
const sandbox = {
  Math,
  URLSearchParams,
  addEventListener: noop,
  removeEventListener: noop,
  location: { search: "" },
  matchMedia: () => ({ matches: false, addEventListener: noop }),
  requestAnimationFrame: noop,
  setTimeout,
  clearTimeout,
  performance: { now: () => 0 },
};
sandbox.window = sandbox;
sandbox.parent = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(
  `${readFileSync(corePath, "utf8")}
;globalThis.__cf = { box, cyl, rod, castShadow, byDepth, filterFor, INK_REF_VB, PALS, METAL, DARK, CLEAR };`,
  ctx,
);
const { box, cyl, rod, castShadow, byDepth, filterFor, INK_REF_VB, PALS, METAL, DARK, CLEAR } = ctx.__cf;

// Coordinates as in the engine: x = depth (toward the viewer), y = width (+y to the viewer's left), z = up; 1 unit ≈ 1 mm.
const corners = (x0, y0, z0, x1, y1, z1) => [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [z0, z1].map((z) => [x, y, z])));
const ring = (x, y, z, r, n = 24) =>
  Array.from({ length: n }, (_, i) => [x + r * Math.cos((i / n) * 2 * Math.PI), y + r * Math.sin((i / n) * 2 * Math.PI), z]);
const part = (b, svg) => ({ box: [[b[0], b[1], b[2]], [b[3], b[4], b[5]]], svg });
const boxPart = (b, m) => part(b, box(...b, m));

// An Uno-sized board: PCB, ATmega328P in its DIP socket, headers, USB-B and barrel jack on the short edge, power LED, reset.
const pcb = [0, 0, 0, 53, 69, 1.6];
// A motor-driver breakout on the bench beside it.
const driverPcb = [22, -38, 0, 46, -12, 1.6];
// A quadcopter hovering over the bench: X arms, motors, the stack with its battery, props spinning as clear discs.
const qx = 0, qy = -68, qz = 30, arm = 30;
const tips = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [qx + a * arm * Math.SQRT1_2, qy + b * arm * Math.SQRT1_2]);

function drawScene() {
  const board = [
    boxPart(pcb, PALS.cobalt),
    boxPart([30, 16, 1.6, 38, 52, 5.5], DARK),
    boxPart([2, 8, 1.6, 4.6, 66, 10], DARK),
    boxPart([48.5, 14, 1.6, 51, 60, 10], DARK),
    boxPart([12, 62, 1.6, 24, 75, 12], METAL),
    boxPart([36, 63, 1.6, 45, 77, 12], DARK),
    boxPart([22, 28, 1.6, 24.5, 30.5, 2.8], PALS.tomato),
    boxPart([5, 56, 1.6, 9.5, 60.5, 4.6], METAL),
  ];
  const driver = [
    boxPart(driverPcb, PALS.mint),
    boxPart([30, -29, 1.6, 38, -21, 3], DARK),
    boxPart([24, -36, 1.6, 26.4, -14, 9], DARK),
    boxPart([41.6, -36, 1.6, 44, -14, 9], DARK),
  ];
  const drone = byDepth([
    ...tips.map(([x, y]) => ({
      box: [[Math.min(x, qx), Math.min(y, qy), qz], [Math.max(x, qx), Math.max(y, qy), qz + 3]],
      svg: rod([qx, qy, qz + 1.5], [x, y, qz + 1.5], 2.2, DARK),
    })),
    ...tips.map(([x, y]) => part([x - 5, y - 5, qz, x + 5, y + 5, qz + 9], cyl(x, y, qz, qz + 9, 4.6, METAL))),
    boxPart([qx - 10, qy - 9, qz + 3, qx + 10, qy + 9, qz + 11], PALS.tomato),
    boxPart([qx - 6, qy - 13, qz + 11, qx + 6, qy + 13, qz + 18], PALS.mustard),
    boxPart([qx + 10, qy - 4, qz + 4, qx + 15, qy + 4, qz + 10], DARK),
  ]);
  const props = tips.map(([x, y]) => `<g opacity=".55">${cyl(x, y, qz + 9.5, qz + 10, 15, CLEAR, undefined, 0.8, 36)}</g>`).join("");
  const shadows =
    castShadow(corners(...pcb)) +
    castShadow(corners(...driverPcb)) +
    tips.map(([x, y]) => castShadow([...ring(qx, qy, qz, 2.2), ...ring(x, y, qz, 2.2)]) + castShadow(ring(x, y, qz + 9, 4.6))).join("") +
    castShadow(corners(qx - 10, qy - 13, qz + 3, qx + 15, qy + 13, qz + 18)) +
    `<g opacity=".35">${tips.map(([x, y]) => castShadow(ring(x, y, qz + 10, 15, 36))).join("")}</g>`;
  return shadows + drone + props + byDepth([...board, ...driver]);
}

// The frame holds every projected point of the scene and its shadows, plus a margin.
function frameOf(svg, pad = 10) {
  const nums = [...svg.matchAll(/\s(?:d|points)="([^"]+)"/g)].flatMap((m) => m[1].match(/-?\d+(?:\.\d+)?/g).map(Number));
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}

const art = drawScene();
const frame = frameOf(art);
// Strokes keep the engine's model widths. A figure page would thin them to the engine's reference
// frame (585 units wide; this scene is about 190), but the hero is shown small, next to 2 px UI borders,
// and reads better at full weight. Only the wobble and grain filter is scaled to the frame.
const inkK = frame.w / INK_REF_VB;

// The intrinsic size only sets the aspect ratio and a sharp default; the page sizes the image itself.
const pxPerUnit = 4;
const viewBox = [frame.x, frame.y, frame.w, frame.h].map((n) => n.toFixed(1)).join(" ");
writeFileSync(
  path.join(here, "hero.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${Math.round(frame.w * pxPerUnit)}" height="${Math.round(frame.h * pxPerUnit)}">` +
    `<!-- Drawn by hero.gen.mjs with the Colorfigures engine (MIT, April Zhu). Do not edit; rerun the script. -->` +
    `<defs>${filterFor(inkK)}</defs><g filter="url(#hand)">${art}</g></svg>\n`,
);
console.log(`hero.svg: viewBox ${viewBox}`);

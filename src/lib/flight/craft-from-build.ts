import type { FlightMode as ContentMode } from "@/content/schema";
import type { Build } from "@/sim/flight/build";
import { DEFAULTS, DEMO_MODE, flightMode } from "./registry";
import type { CraftLook, FlightCraft } from "./types";

const MM = 1000;
const MIN_HIT_RADIUS = 0.03;
/** Template values: the camera a stock 5-inch carries (src/content/drones/quad5.ts). */
const CAM_TILT_DEG = 30;
const FOV_DEG = 105;
const DIAGONAL_TOLERANCE = 0.2;
const AXIS_TOLERANCE = 0.1;

const stock = (id: string, kind: ContentMode["kind"]): ContentMode => ({
  id,
  kind,
  title: `flight.modes.${id}.title`,
  hint: `flight.modes.${id}.hint`,
});

export const STOCK_MODES: readonly ContentMode[] = [
  stock("alt", "alt-hold"),
  stock("angle", "angle"),
  stock("acro", "acro"),
  stock("race", "race"),
  stock("range", "range"),
];

const round = (v: number, d = 4) => Math.round(v * 10 ** d) / 10 ** d;

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Changes when the parts change, so a ghost of an older build is not shown on a new one. */
export function buildKey(b: Build): string {
  const slots = b.slots.map((s) => `${s.motorRef}|${s.propRef}|${s.escRef}`).sort();
  return `${b.projectId}~${fnv1a([...slots, b.packRef, String(b.frame?.mass_g ?? 0)].join("\n"))}`;
}

function frameLayout(b: Build): NonNullable<CraftLook["frame"]> {
  if (b.slots.length === 3) return "y";
  if (b.slots.length !== 4) return "x";
  const angles = b.slots.map((s) => Math.atan2(s.axis_mm[1], s.axis_mm[0]));
  const onAxes = angles.every((a) => Math.abs(Math.sin(2 * a)) < AXIS_TOLERANCE);
  if (onAxes) return "plus";
  const diagonal = angles.every((a) => Math.abs(Math.abs(Math.sin(2 * a)) - 1) < DIAGONAL_TOLERANCE);
  return diagonal ? "x" : "h";
}

/** Length, width and height in metres of the boxes that sit inside the ring of motors: the stack. */
function stackBody(b: Build, armLen: number): CraftLook["body"] {
  const inner = b.bodies.filter((body) => body.shape.kind === "box" && Math.hypot(body.position_mm[0], body.position_mm[1]) < (armLen * MM) / 2);
  if (inner.length === 0) return [round(armLen), round(armLen * 0.41), round(armLen * 0.36)];
  const sizes = inner.map((body) => (body.shape.kind === "box" ? body.shape.size_mm : [0, 0, 0]));
  const top = Math.max(...inner.map((body, i) => body.position_mm[2] + sizes[i][2] / 2));
  const bottom = Math.min(...inner.map((body, i) => body.position_mm[2] - sizes[i][2] / 2));
  return [round(Math.max(...sizes.map((s) => s[0])) / MM), round(Math.max(...sizes.map((s) => s[1])) / MM), round((top - bottom) / MM)];
}

/** The craft the range flies for a user build: size from the mounts and props, the rest from the template values. */
export function craftForBuild(b: Build): FlightCraft {
  const count = b.slots.length;
  const armLen = count ? b.slots.reduce((sum, s) => sum + Math.hypot(s.axis_mm[0], s.axis_mm[1]), 0) / count / MM : 0;
  const propR = count ? b.slots.reduce((sum, s) => sum + s.prop.d_m, 0) / count / 2 : 0;
  const look: CraftLook = {
    arms: count,
    armLen: round(armLen),
    propR: round(propR),
    body: stackBody(b, armLen),
    palette: "cobalt",
    frame: frameLayout(b),
    isoScale: round(Math.min(8, Math.max(1, 0.225 / Math.max(0.01, armLen))), 2),
  };
  return {
    id: buildKey(b),
    class: "multirotor",
    drag: DEFAULTS.drag,
    ceiling: DEFAULTS.ceiling,
    hitRadius: round(Math.max(MIN_HIT_RADIUS, armLen + propR * 0.5), 3),
    angleLimit: DEFAULTS.angleLimit,
    acroRate: DEFAULTS.acroRate,
    yawRate: DEFAULTS.yawRate,
    levelRate: DEFAULTS.levelRate,
    climbRate: DEFAULTS.climbRate,
    spool: DEFAULTS.spool,
    camTilt: CAM_TILT_DEG,
    fov: FOV_DEG,
    look,
    modes: [...STOCK_MODES.map((m) => flightMode(m, "multirotor")), DEMO_MODE],
  };
}

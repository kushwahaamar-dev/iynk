import type { Course as ContentCourse, DroneContent, FlightMode as ContentMode, Palette, ParTimes } from "@/content/schema";
import { DRONES } from "@/content/ids";
import { demoRoute, DEMO_MISSION } from "./route";
import type { CraftClass, CraftLook, FlightCraft, FlightMode, Course, Mission, ModeTask, Prim, VtolParams, WingParams } from "./types";

// The flight registry: every craft flies from its content module (src/content/drones/<id>.ts), so the numbers the
// CLI snippets, the prose and the range use are written once. `content.flight.params` names (all optional, with the
// defaults below):
//   every craft   drag ceiling hitRadius angleLimit acroRate yawRate levelRate climbRate spool camTilt fov
//                 loiterSpeed rtlAlt fpvProps (1 = props in the FPV image)
//   fixed-wing    loiterRadius (the circle round home on RTH)
//   fixed-wing    vstall vmin cd launchSpeed bankLimit pitchLimit rollRate pitchRate
//   quadplane     the wing's, plus transitionS hoverMotors
//   tricopter     tailMaxDeg tailRateDegS
//   swarm         swarmCount swarmSpacing
//   delivery      payloadG (what a `drop` goal releases; else the design's fixed PARCEL part)
// Content courses map one to one onto range courses with the same id.

export interface CraftFlight {
  craft: FlightCraft;
  courses: Course[];
}

const CLASS: Record<DroneContent["flight"]["physics"], CraftClass> = {
  multirotor: "multirotor",
  "fixed-wing": "wing",
  quadplane: "vtol",
  tricopter: "tricopter",
  swarm: "swarm",
};

const DEFAULTS = {
  drag: 0.045,
  ceiling: 12,
  angleLimit: 38,
  acroRate: 670,
  yawRate: 200,
  levelRate: 9,
  climbRate: 2.2,
  spool: 18,
};

const DEFAULT_GROUND = "#dde3cc";
const DEFAULT_WIND = { speed: 3, from: 200, gust: 2.5 };
/** Race gates take the five ink colours in turn, so "the yellow one" means the same gate every lap. */
const GATE_COLS = ["#ef6a4c", "#f4b829", "#93d3b0", "#76a0e2", "#f3a6bb"];

/** Mission ids a content mode can name that are tasks the sim implements itself. */
const TASKS: Record<string, ModeTask> = {
  "gps-rescue": "rtl",
  rtl: "rtl",
  rth: "rth",
  "wing-rth": "rth",
  qrtl: "qrtl",
  figure8: "figure8",
  swarm: "swarm",
  motorfail: "motorfail",
  yawdemo: "yawdemo",
  transition: "transition",
};

type Base = Pick<FlightMode, "attitude" | "throttle" | "position" | "task">;

/** What a content mode kind flies like, before the mode's own overrides. */
function baseMode(kind: ContentMode["kind"], cls: CraftClass): Base {
  const wing = cls === "wing";
  switch (kind) {
    case "acro":
    case "manual":
      return { attitude: "acro", throttle: "manual", task: "free" };
    case "race":
      return { attitude: "angle", throttle: "manual", task: "race" };
    case "range":
      return { attitude: "angle", throttle: "climb", task: "range" };
    case "alt-hold":
    case "qhover":
      return { attitude: "angle", throttle: "climb", task: "free" };
    case "loiter":
    case "pos-hold":
    case "qloiter":
      return { attitude: "angle", throttle: "climb", position: true, task: "free" };
    case "rtl":
    case "land":
      return { attitude: "angle", throttle: "climb", task: wing ? "rth" : "rtl" };
    case "rth":
      return { attitude: "angle", throttle: wing ? "manual" : "climb", task: wing ? "rth" : "rtl" };
    case "qrtl":
      return { attitude: "angle", throttle: "climb", task: "qrtl" };
    case "fbwa":
    case "cruise":
      return { attitude: "angle", throttle: "manual", task: cls === "vtol" ? "transition" : "free" };
    case "auto":
    case "mission":
      return { attitude: "angle", throttle: "climb", task: "mission" };
    case "script":
      return { attitude: "angle", throttle: "climb", task: "free" };
    default:
      return { attitude: "angle", throttle: "manual", task: "free" };
  }
}

export function flightMode(m: ContentMode, cls: CraftClass): FlightMode {
  const base = baseMode(m.kind, cls);
  const task = (m.mission && TASKS[m.mission]) || base.task;
  const attitude = m.attitude ?? base.attitude;
  const mode: FlightMode = { id: m.id, ...base, task, attitude };
  if (!mode.position) delete mode.position;
  const expo = m.expo ?? (attitude === "acro" && cls !== "wing" ? 0.7 : undefined);
  if (expo !== undefined) mode.expo = expo;
  if (m.angleLimit !== undefined) mode.angleLimit = m.angleLimit;
  if (m.rateScale !== undefined) mode.rateScale = m.rateScale;
  if (task === "mission" && m.mission) mode.missionId = m.mission;
  return mode;
}

/** The autopilot demo: it flies the selected course's own route (src/lib/flight/route.ts). */
export const DEMO_MODE: FlightMode = { id: "demo", attitude: "angle", throttle: "climb", task: "demo" };

/** Prop radius in metres: the catalogue's radius, else the label's size ("5x4.3x3" inches, "31 mm 4-blade"). */
function propRadius(content: DroneContent): number | null {
  const prop = content.design.props[content.design.default.prop];
  if (!prop) return null;
  if (prop.r) return prop.r / 1000;
  const mm = /^(\d+(?:\.\d+)?)\s*mm/i.exec(prop.label);
  if (mm) return Number(mm[1]) / 2000;
  const inch = /^(\d+(?:\.\d+)?)\s*(?:x|in|")/i.exec(prop.label);
  if (inch) return (Number(inch[1]) * 0.0254) / 2;
  return null;
}

const round = (v: number, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The range draws in the five ink palettes; a mono item flies in tomato. */
const lookPalette = (p: Palette): CraftLook["palette"] => (p === "mono" ? "tomato" : p);

export function craftLook(content: DroneContent, cls: CraftClass): CraftLook {
  const look = content.flight.look ?? {};
  const motors = content.frame.motors;
  const winged = cls === "wing" || cls === "vtol";
  const armMm = motors.length ? motors.reduce((sum, [x, y]) => sum + Math.hypot(x, y), 0) / motors.length : content.frame.sizeMm / 2;
  const armLen = round(cls === "wing" ? 0 : armMm / 1000);
  const propR = round(look.propR ?? propRadius(content) ?? Math.max(0.02, armLen * 0.56));
  const size = cls === "wing" ? content.frame.sizeMm / 2000 : armLen;
  const out: CraftLook = {
    arms: cls === "wing" ? 0 : motors.length,
    armLen,
    propR,
    body: look.body ?? [round(size * 1.0), round(size * 0.41), round(size * 0.36)],
    palette: lookPalette(DRONES[content.id].palette),
    frame: content.frame.layout === "tri" ? "y" : content.frame.layout === "plus" ? "plus" : content.frame.layout === "h" ? "h" : "x",
    isoScale: look.isoScale ?? round(clamp(0.225 / Math.max(0.01, size), 1, 8), 2),
  };
  const ducted = look.ducted ?? (content.frame.layout === "whoop" || content.class === "cinewhoop" || content.class === "whoop");
  if (ducted) out.ducted = true;
  if (winged) {
    out.span = look.span ?? content.frame.sizeMm / 1000;
    out.chord = look.chord ?? round(out.span * 0.25);
  }
  return out;
}

export function flightCraft(content: DroneContent): FlightCraft {
  const f = content.flight;
  const p = f.params;
  const cls = CLASS[f.physics];
  const look = craftLook(content, cls);
  const num = (key: string, fallback: number) => (typeof p[key] === "number" ? p[key] : fallback);
  const craft: FlightCraft = {
    id: content.id,
    class: cls,
    drag: num("drag", DEFAULTS.drag),
    ceiling: num("ceiling", DEFAULTS.ceiling),
    hitRadius: num("hitRadius", round(Math.max(0.03, look.armLen + look.propR * 0.5), 3)),
    angleLimit: num("angleLimit", DEFAULTS.angleLimit),
    acroRate: num("acroRate", DEFAULTS.acroRate),
    yawRate: num("yawRate", DEFAULTS.yawRate),
    levelRate: num("levelRate", DEFAULTS.levelRate),
    climbRate: num("climbRate", DEFAULTS.climbRate),
    spool: num("spool", DEFAULTS.spool),
    camTilt: num("camTilt", f.fpv.camTiltDeg),
    fov: num("fov", f.fpv.fovDeg),
    look,
    modes: [...f.modes.map((m) => flightMode(m, cls)), DEMO_MODE],
  };
  if (f.fpv.gimbal) craft.fpvLevel = true;
  if (num("fpvProps", content.class === "freestyle" || content.class === "racing" ? 1 : 0) === 1) craft.fpvProps = true;
  if (typeof p.loiterSpeed === "number") craft.loiterSpeed = p.loiterSpeed;
  if (typeof p.rtlAlt === "number") craft.rtlAlt = p.rtlAlt;
  if (typeof p.loiterRadius === "number") craft.loiterRadius = p.loiterRadius;
  const drops = content.courses.some((c) => c.goals.some((g) => g.action === "drop"));
  const payload = num("payloadG", content.design.fixed.find((part) => part.id === "PARCEL")?.g ?? 0);
  if (drops && payload > 0) craft.payloadG = payload;
  if (cls === "wing" || cls === "vtol") {
    const wing: WingParams = {
      vstall: num("vstall", 8),
      vmin: num("vmin", 10),
      cd: num("cd", 0.01),
      launchSpeed: num("launchSpeed", 10.5),
      bankLimit: num("bankLimit", 45),
      pitchLimit: num("pitchLimit", 28),
      rollRate: num("rollRate", 220),
      pitchRate: num("pitchRate", 140),
    };
    if (cls === "wing") craft.wing = wing;
    else craft.vtol = { ...wing, transitionS: num("transitionS", 4), hoverMotors: num("hoverMotors", content.frame.motors.length) } satisfies VtolParams;
  }
  if (cls === "tricopter") craft.tailServo = { maxDeg: num("tailMaxDeg", 40), rateDegS: num("tailRateDegS", 300) };
  if (cls === "swarm") craft.swarm = { count: num("swarmCount", 4), spacing: num("swarmSpacing", 0.6) };
  return craft;
}

/** One content course as the range flies it (same id; titles and labels stay text keys for the host to translate). */
export function flightCourse(content: DroneContent, c: ContentCourse, craft: FlightCraft): Course {
  const [gw, gh] = c.gateSize ?? [1.6, 1.6];
  const course: Course = {
    id: c.id,
    kind: c.kind,
    title: c.title,
    brief: c.brief,
    field: Math.max(c.field.w, c.field.d),
    pad: c.pad,
    ground: c.ground ?? DEFAULT_GROUND,
    wind: c.wind ?? DEFAULT_WIND,
    prims: c.prims satisfies Prim[],
    gates: c.gates.map(([x, y, heading], i) => ({ x, y, heading, w: gw, h: gh, col: GATE_COLS[i % GATE_COLS.length] })),
    // the goals are the course: on a gate course they are only drawn when it has none of its own
    checkpoints: c.kind === "gates" ? [] : c.goals.map((g) => ({ label: g.label, x: g.x, y: g.y, z: g.z, r: g.r, ...(g.heading !== undefined ? { heading: g.heading } : {}), ...(g.land ? { land: true } : {}), ...(g.action === "drop" ? { action: "drop" as const } : {}) })),
  };
  if (c.ceiling !== undefined) course.ceiling = c.ceiling;
  const missions: Mission[] = [];
  if (c.kind === "mission") {
    missions.push({
      id: c.mission ?? c.id,
      waypoints: c.goals.map((g) => ({
        x: g.x,
        y: g.y,
        z: g.land ? 0 : g.z,
        label: g.label,
        r: Math.max(0.3, g.r * 0.6),
        ...(g.hold !== undefined ? { hold: g.hold } : {}),
        ...(g.action ? { action: g.action } : {}),
        ...(g.speed !== undefined ? { speed: g.speed } : {}),
      })),
    });
  }
  const demo = demoRoute(course, craft);
  if (demo) missions.push(demo);
  if (missions.length) course.missions = missions;
  return course;
}

/** The modes a course offers: the craft's own, and the autopilot demo where the planner found a route. */
export function modesFor(craft: FlightCraft, course: Course): FlightMode[] {
  const demo = course.missions?.some((m) => m.id === DEMO_MISSION) ?? false;
  return demo ? craft.modes : craft.modes.filter((m) => m.task !== "demo");
}

/** The craft and its courses, or null when the content has no course to fly. */
export function flightOf(content: DroneContent): CraftFlight | null {
  if (!content.courses.length) return null;
  const craft = flightCraft(content);
  return { craft, courses: content.courses.map((c) => flightCourse(content, c, craft)) };
}

/** The mode a course opens in: a race mode on gates, the range mode on checkpoints, the course's mission mode. */
export function startMode(content: DroneContent, courseId: string): string {
  const c = content.courses.find((x) => x.id === courseId);
  const modes = content.flight.modes;
  const pick = (kind: ContentMode["kind"]) => modes.find((m) => m.kind === kind)?.id;
  if (c?.kind === "gates") return pick("race") ?? content.flight.defaultMode;
  if (c?.kind === "checkpoints") return pick("range") ?? content.flight.defaultMode;
  return content.flight.defaultMode;
}

/** Bronze, silver and gold for a course: its own, or around `parS` (par is the silver line). */
export function parOf(course: Pick<ContentCourse, "par" | "parS">): ParTimes | null {
  if (course.par) return course.par;
  if (!course.parS) return null;
  const r = (v: number) => (course.parS! < 30 ? Math.round(v * 2) / 2 : Math.round(v));
  return { gold: r(course.parS * 0.85), silver: course.parS, bronze: r(course.parS * 1.4) };
}

export type Medal = "gold" | "silver" | "bronze";

export function medalFor(time: number, par: ParTimes | null): Medal | null {
  if (!par) return null;
  if (time <= par.gold) return "gold";
  if (time <= par.silver) return "silver";
  if (time <= par.bronze) return "bronze";
  return null;
}

export { DEMO_MISSION };

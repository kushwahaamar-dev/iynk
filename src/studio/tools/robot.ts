import { fail, ok, type Result } from "../../core/result.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import { interfaceOf } from "../../parts/pins.ts";
import type { Body, Component, Frame, Joint, Mount, Op, Project, SensorBinding } from "../../project/generated/types.ts";
import { nextRefdes, refdesPrefix } from "./place.ts";

export type RobotPart = "chassis" | "wheel-pair" | "caster" | "gearmotor" | "driver" | "battery" | "line-array" | "ranger";

export type RecipeError = { code: "no-chassis" | "no-descriptor" | "occupied"; message: string };

export interface RecipeCtx {
  doc: Project;
  newId(prefix: "frm" | "bdy" | "jnt" | "mnt" | "cmp"): string;
  describe(id: string): Descriptor | undefined;
}

export interface RecipeChoice {
  descriptor: string;
  /** Lengths in mm. Mount positions are in the chassis frame. */
  params?: Record<string, number>;
}

export type LengthUnit = "mm" | "cm" | "in";
export type MassUnit = "kg" | "g" | "oz";
export interface UnitPrefs {
  length: LengthUnit;
  mass: MassUnit;
}

export type PropTarget = { kind: "body" | "joint" | "wheel" | "sensor"; id: string };
export type Quantity = "length" | "mass" | "other";
export interface PropReading {
  prop: string;
  quantity: Quantity;
  /** Metres, kilograms, or the plain number for `other`. */
  valueSi: number;
}

const METRES_PER: Record<LengthUnit, number> = { mm: 0.001, cm: 0.01, in: 0.0254 };
const KG_PER: Record<MassUnit, number> = { kg: 1, g: 0.001, oz: 0.028349523125 };

export const LENGTH_UNITS = Object.keys(METRES_PER) as LengthUnit[];
export const MASS_UNITS = Object.keys(KG_PER) as MassUnit[];

export const toSi = (value: number, unit: LengthUnit | MassUnit): number => value * (unit in METRES_PER ? METRES_PER[unit as LengthUnit] : KG_PER[unit as MassUnit]);
export const fromSi = (si: number, unit: LengthUnit | MassUnit): number => si / (unit in METRES_PER ? METRES_PER[unit as LengthUnit] : KG_PER[unit as MassUnit]);

/** The number a field holds, or undefined while it reads as no number. */
export function parseNumber(text: string): number | undefined {
  const n = text.trim() === "" ? Number.NaN : Number(text);
  return Number.isFinite(n) ? n : undefined;
}

const PLATE_AT: [number, number, number] = [-10, 0, 30];
const DEFAULT_BODY_MM: [number, number, number] = [160, 110, 20];
const WHEEL_CLEARANCE_MM = 10;
const OCCUPIED_MM = 4;
const WHEEL_RPY: [number, number, number] = [-90, 0, 0];
const NO_ROTATION: [number, number, number] = [0, 0, 0];
const WHEEL_AXIS: [number, number, number] = [0, 0, 1];
const WHEEL_JOINT = { damping: 0.0005, friction_nm: 0.002 };
const BODY_PHYSICS = { collider: "from-shape", restitution: 0, damping_lin: 0, damping_ang: 0, fast: false } as const;
const G_PER_KG = 1000;
const MM_PER_M = 1000;

const MOUNT_AT = {
  driver: [30, 0, 12],
  battery: [-60, 0, -2],
  motor: [10, 50, 2.5],
  line: [95, 0],
  ranger: [95, 0],
} as const;
const LINE_HEIGHT_MM = 5;
const RANGER_Z_MM = 10;

const refuse = (code: RecipeError["code"], message: string): Result<never, RecipeError> => fail({ code, message });
const round = (n: number): number => Number(n.toFixed(4));
const patch = (data: Record<string, unknown>): Op => ({ k: "domain.patch", domain: "robotics", patch: data });
const setFrame = (value: Frame): Op => ({ k: "mech.set", collection: "frames", value });
const setBody = (value: Body): Op => ({ k: "mech.set", collection: "bodies", value });
const setJoint = (value: Joint): Op => ({ k: "mech.set", collection: "joints", value });
const setMount = (value: Mount): Op => ({ k: "mech.set", collection: "mounts", value });

interface Chassis {
  body: Body;
  frame: Frame;
}

/** The body no joint hangs from. */
function chassisOf(doc: Project): Chassis | undefined {
  const { bodies = [], joints = [], frames = [] } = doc.mechanical ?? {};
  const hanging = new Set(joints.map((j) => j.child));
  const body = bodies.filter((b) => !hanging.has(b.id)).sort((a, b) => (a.id < b.id ? -1 : 1))[0];
  const frame = body && frames.find((f) => f.id === body.frame);
  return body && frame ? { body, frame } : undefined;
}

const wheelJoints = (doc: Project): Joint[] => (doc.mechanical?.joints ?? []).filter((j) => j.kind === "wheel");
const sideOf = (y: number): 1 | -1 => (y >= 0 ? 1 : -1);

/** Components carrying a motor block that no joint drives yet, on the given side of the robot. */
function freeMotor(ctx: RecipeCtx, side: 1 | -1): string | undefined {
  const driven = new Set((ctx.doc.mechanical?.joints ?? []).flatMap((j) => (j.drive ? [j.drive.component] : [])));
  const refs = new Map(ctx.doc.components.map((c) => [c.id, c.definition.ref]));
  return (ctx.doc.mechanical?.mounts ?? []).find(
    (m) => !driven.has(m.component) && ctx.describe(refs.get(m.component) ?? "")?.mechanics?.motor && sideOf(m.pose.position_mm[1]) === side,
  )?.component;
}

/** Adds the dependency (once) and the component; `pending` holds the components this recipe has made so far. */
function partOps(ctx: RecipeCtx, d: Descriptor, id: string, pending: Component[]): Op[] {
  const pinned = ctx.doc.dependencies.components.some((dep) => dep.ref === d.id && dep.version === d.version) || pending.some((c) => c.definition.ref === d.id);
  const component: Component = {
    id,
    definition: { ref: d.id, version: d.version },
    refdes: nextRefdes({ ...ctx.doc, components: [...ctx.doc.components, ...pending] }, refdesPrefix(d)),
  };
  pending.push(component);
  return [...(pinned ? [] : [{ k: "dep.set", dependency: { ref: d.id, version: d.version, origin: "builtin", interface: interfaceOf(d) } } satisfies Op]), { k: "component.add", component }];
}

const near = (a: readonly number[], b: readonly number[]): boolean => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, (a[2] ?? 0) - (b[2] ?? 0)) < OCCUPIED_MM;

function mountTaken(doc: Project, frame: string, at: readonly number[]): boolean {
  return (doc.mechanical?.mounts ?? []).some((m) => m.frame === frame && near(m.pose.position_mm, at));
}

function wheelOf(d: Descriptor) {
  const wheel = d.mechanics?.wheel;
  return wheel && wheel.mass_g !== undefined ? { ...wheel, mass_g: wheel.mass_g } : undefined;
}

function chassisRecipe(d: Descriptor, p: Record<string, number>, ctx: RecipeCtx): Result<Op[], RecipeError> {
  if (chassisOf(ctx.doc)) return refuse("occupied", "The robot already has a chassis.");
  const massG = d.mechanics?.mass_g;
  if (massG === undefined) return refuse("no-descriptor", `${d.id} has no mass.`);
  const plate = d.dimensions?.body;
  const size: [number, number, number] = [p.lengthMm ?? plate?.w ?? DEFAULT_BODY_MM[0], p.widthMm ?? plate?.h ?? DEFAULT_BODY_MM[1], p.heightMm ?? plate?.d ?? DEFAULT_BODY_MM[2]];

  const root = ctx.doc.mechanical?.frames.find((f) => f.parent === "world");
  const rootId = root?.id ?? ctx.newId("frm");
  const frame: Frame = { id: ctx.newId("frm"), name: "Chassis plate", parent: rootId, pose: { position_mm: [...PLATE_AT], rpy_deg: [...NO_ROTATION] } };
  const componentId = ctx.newId("cmp");
  const body: Body = { id: ctx.newId("bdy"), name: "Chassis", frame: frame.id, mass_g: massG, shape: { kind: "box", size_mm: size }, component: componentId };
  return ok([
    ...partOps(ctx, d, componentId, []),
    ...(root ? [] : [setFrame({ id: rootId, name: "Robot", parent: "world", pose: { position_mm: [0, 0, 0], rpy_deg: [...NO_ROTATION] } })]),
    setFrame(frame),
    setBody(body),
    patch({ bodies: { [body.id]: { ...BODY_PHYSICS, friction: 0.3 } } }),
  ]);
}

function wheelPairRecipe(d: Descriptor, p: Record<string, number>, ctx: RecipeCtx): Result<Op[], RecipeError> {
  const chassis = chassisOf(ctx.doc);
  if (!chassis) return refuse("no-chassis", "Add a chassis before the wheels.");
  if (wheelJoints(ctx.doc).length > 0) return refuse("occupied", "The robot already has wheels.");
  const wheel = wheelOf(d);
  if (!wheel) return refuse("no-descriptor", `${d.id} has no wheel data.`);

  const radius = wheel.diameter_mm / 2;
  const width = wheel.width_mm ?? radius / 2;
  const box = chassis.body.shape?.kind === "box" ? chassis.body.shape.size_mm : DEFAULT_BODY_MM;
  const track = p.trackMm ?? box[1] + width + WHEEL_CLEARANCE_MM;
  const axleX = p.axleXMm ?? 0;
  const plate = chassis.frame.pose.position_mm;
  const mu = wheel.mu ?? 0.8;

  const ops: Op[] = [];
  const physics = { bodies: {} as Record<string, unknown>, joints: {} as Record<string, unknown>, wheels: {} as Record<string, unknown> };
  for (const [side, name] of [[1, "Left wheel"], [-1, "Right wheel"]] as const) {
    const y = (side * track) / 2;
    const frame: Frame = { id: ctx.newId("frm"), name, parent: chassis.frame.parent, pose: { position_mm: [axleX, y, radius], rpy_deg: [...WHEEL_RPY] } };
    const body: Body = { id: ctx.newId("bdy"), name, frame: frame.id, mass_g: wheel.mass_g, shape: { kind: "cylinder", radius_mm: radius, height_mm: width } };
    const motor = freeMotor(ctx, side);
    const joint: Joint = {
      id: ctx.newId("jnt"),
      kind: "wheel",
      parent: chassis.body.id,
      child: body.id,
      axis: [...WHEEL_AXIS],
      origin: { position_mm: [round(axleX - plate[0]), round(y - plate[1]), round(radius - plate[2])], rpy_deg: [...WHEEL_RPY] },
      ...(motor && { drive: { component: motor } }),
    };
    ops.push(setFrame(frame), setBody(body), setJoint(joint));
    physics.bodies[body.id] = { ...BODY_PHYSICS, friction: mu };
    physics.joints[joint.id] = { ...WHEEL_JOINT };
    physics.wheels[joint.id] = { radius_mm: radius, width_mm: width, surface_mu: mu, crr: wheel.crr ?? 0 };
  }
  return ok([...ops, patch(physics)]);
}

function casterRecipe(d: Descriptor, p: Record<string, number>, ctx: RecipeCtx): Result<Op[], RecipeError> {
  const chassis = chassisOf(ctx.doc);
  if (!chassis) return refuse("no-chassis", "Add a chassis before the caster.");
  const wheel = wheelOf(d);
  if (!wheel) return refuse("no-descriptor", `${d.id} has no ball data.`);

  const radius = wheel.diameter_mm / 2;
  const x = p.xMm ?? -95;
  const taken = (ctx.doc.mechanical?.frames ?? []).some((f) => f.parent === chassis.frame.parent && f.id !== chassis.frame.id && near([...f.pose.position_mm.slice(0, 2), 0], [x, 0, 0]));
  if (taken) return refuse("occupied", "That place on the chassis is taken.");

  const plate = chassis.frame.pose.position_mm;
  const frame: Frame = { id: ctx.newId("frm"), name: "Caster ball", parent: chassis.frame.parent, pose: { position_mm: [x, 0, radius], rpy_deg: [...NO_ROTATION] } };
  const body: Body = { id: ctx.newId("bdy"), name: "Caster ball", frame: frame.id, mass_g: wheel.mass_g, shape: { kind: "sphere", radius_mm: radius } };
  const joint: Joint = {
    id: ctx.newId("jnt"),
    kind: "fixed",
    parent: chassis.body.id,
    child: body.id,
    origin: { position_mm: [round(x - plate[0]), round(-plate[1]), round(radius - plate[2])], rpy_deg: [...NO_ROTATION] },
  };
  return ok([setFrame(frame), setBody(body), setJoint(joint), patch({ bodies: { [body.id]: { ...BODY_PHYSICS, friction: wheel.mu ?? 0 } } })]);
}

function gearmotorRecipe(d: Descriptor, p: Record<string, number>, ctx: RecipeCtx): Result<Op[], RecipeError> {
  const chassis = chassisOf(ctx.doc);
  if (!chassis) return refuse("no-chassis", "Add a chassis before the motors.");
  if (!d.mechanics?.motor) return refuse("no-descriptor", `${d.id} has no motor data.`);

  const [dx, dy, dz] = MOUNT_AT.motor;
  const pending: Component[] = [];
  const ops: Op[] = [];
  const undriven = wheelJoints(ctx.doc).filter((j) => !j.drive);
  for (const [side, name] of [[1, "left"], [-1, "right"]] as const) {
    const at = [p.xMm ?? dx, side * (p.yMm ?? dy), p.zMm ?? dz] as const;
    if (mountTaken(ctx.doc, chassis.frame.id, at)) return refuse("occupied", `The ${name} motor place is taken.`);
    const id = ctx.newId("cmp");
    ops.push(...partOps(ctx, d, id, pending), setMount({ id: ctx.newId("mnt"), component: id, frame: chassis.frame.id, pose: { position_mm: [...at], rpy_deg: [...NO_ROTATION] } }));
    const wheel = undriven.find((j) => sideOf(j.origin.position_mm[1]) === side);
    if (wheel) ops.push(setJoint({ ...wheel, drive: { component: id } }));
  }
  return ok(ops);
}

/** A part with one mount: a driver or a battery. */
function mountedRecipe(has: (d: Descriptor) => boolean, at: readonly [number, number, number]) {
  return (d: Descriptor, p: Record<string, number>, ctx: RecipeCtx): Result<Op[], RecipeError> => {
    const chassis = chassisOf(ctx.doc);
    if (!chassis) return refuse("no-chassis", "Add a chassis first.");
    if (!has(d)) return refuse("no-descriptor", `${d.id} has no data for this part.`);
    return placeOnChassis(d, p, ctx, chassis, at);
  };
}

function placeOnChassis(d: Descriptor, p: Record<string, number>, ctx: RecipeCtx, chassis: Chassis, at: readonly [number, number, number]): Result<Op[], RecipeError> {
  const position: [number, number, number] = [p.xMm ?? at[0], p.yMm ?? at[1], p.zMm ?? at[2]];
  if (mountTaken(ctx.doc, chassis.frame.id, position)) return refuse("occupied", "That place on the chassis is taken.");
  const id = ctx.newId("cmp");
  return ok([...partOps(ctx, d, id, []), setMount({ id: ctx.newId("mnt"), component: id, frame: chassis.frame.id, pose: { position_mm: position, rpy_deg: [...NO_ROTATION] } })]);
}

function uniqueSensorId(doc: Project, base: string): string {
  const used = new Set(doc.domains?.robotics?.data.sensors.map((s) => s.id));
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  return id;
}

/** `zIn` turns the params and the plate height into the mount height in the plate frame. */
function sensorRecipe(base: string, at: readonly [number, number], zIn: (p: Record<string, number>, plateZ: number) => number) {
  return (d: Descriptor, p: Record<string, number>, ctx: RecipeCtx): Result<Op[], RecipeError> => {
    const chassis = chassisOf(ctx.doc);
    if (!chassis) return refuse("no-chassis", "Add a chassis before the sensors.");
    const sensor = d.mechanics?.sensor;
    if (!sensor) return refuse("no-descriptor", `${d.id} has no sensor data.`);
    const position: [number, number, number] = [p.xMm ?? at[0], p.yMm ?? at[1], zIn(p, chassis.frame.pose.position_mm[2])];
    if (mountTaken(ctx.doc, chassis.frame.id, position)) return refuse("occupied", "That place on the chassis is taken.");

    const componentId = ctx.newId("cmp");
    const mount: Mount = { id: ctx.newId("mnt"), component: componentId, frame: chassis.frame.id, pose: { position_mm: position, rpy_deg: [...NO_ROTATION] } };
    const binding: SensorBinding = { id: uniqueSensorId(ctx.doc, base), component: componentId, mount: mount.id, query: sensor.query };
    return ok([...partOps(ctx, d, componentId, []), setMount(mount), patch({ sensors: [...(ctx.doc.domains?.robotics?.data.sensors ?? []), binding] })]);
  };
}

const RECIPES: Record<RobotPart, (d: Descriptor, p: Record<string, number>, ctx: RecipeCtx) => Result<Op[], RecipeError>> = {
  chassis: chassisRecipe,
  "wheel-pair": wheelPairRecipe,
  caster: casterRecipe,
  gearmotor: gearmotorRecipe,
  driver: mountedRecipe((d) => d.mechanics?.driver !== undefined, MOUNT_AT.driver),
  battery: mountedRecipe((d) => d.mechanics?.battery !== undefined, MOUNT_AT.battery),
  "line-array": sensorRecipe("line", MOUNT_AT.line, (p, plateZ) => (p.heightMm ?? LINE_HEIGHT_MM) - plateZ),
  ranger: sensorRecipe("ranger", MOUNT_AT.ranger, (p) => p.zMm ?? RANGER_Z_MM),
};

/** The ops that add one part to the robot. Apply them as one batch: one undo takes the part away. */
export function recipe(part: RobotPart, choice: RecipeChoice, ctx: RecipeCtx): Result<Op[], RecipeError> {
  const d = ctx.describe(choice.descriptor);
  if (!d) return refuse("no-descriptor", `${choice.descriptor} is not in the parts library.`);
  return RECIPES[part](d, choice.params ?? {}, ctx);
}

function frameOfBody(doc: Project, bodyId: string): Frame | undefined {
  const frames = doc.mechanical?.frames ?? [];
  const frame = doc.mechanical?.bodies.find((b) => b.id === bodyId)?.frame;
  return frames.find((f) => f.id === frame);
}

function wheelParts(doc: Project, jointId: string) {
  const joint = doc.mechanical?.joints.find((j) => j.id === jointId && j.kind === "wheel");
  const body = joint && doc.mechanical?.bodies.find((b) => b.id === joint.child);
  const frame = body && doc.mechanical?.frames.find((f) => f.id === body.frame);
  const plate = joint && frameOfBody(doc, joint.parent);
  return joint && body && frame && plate ? { joint, body, frame, plate } : undefined;
}

/** The track: the distance between the outermost wheel joints. */
function trackOf(doc: Project): number {
  const ys = wheelJoints(doc).map((j) => j.origin.position_mm[1]);
  return ys.length > 1 ? Math.max(...ys) - Math.min(...ys) : Math.abs(ys[0] ?? 0) * 2;
}

/** The values the form shows for one target, in SI. */
export function readProps(doc: Project, target: PropTarget): PropReading[] {
  const reading = (prop: string, quantity: Quantity, valueSi: number): PropReading => ({ prop, quantity, valueSi });
  const m = (mm: number) => mm / MM_PER_M;
  if (target.kind === "body") {
    const body = doc.mechanical?.bodies.find((b) => b.id === target.id);
    if (!body) return [];
    const { shape } = body;
    return [
      ...(body.mass_g === undefined ? [] : [reading("mass", "mass", body.mass_g / G_PER_KG)]),
      ...(shape?.kind === "box" ? [reading("length", "length", m(shape.size_mm[0])), reading("width", "length", m(shape.size_mm[1])), reading("height", "length", m(shape.size_mm[2]))] : []),
      ...(shape?.kind === "cylinder" ? [reading("diameter", "length", m(shape.radius_mm * 2)), reading("width", "length", m(shape.height_mm))] : []),
      ...(shape?.kind === "sphere" ? [reading("diameter", "length", m(shape.radius_mm * 2))] : []),
    ];
  }
  if (target.kind === "wheel") {
    const spec = doc.domains?.robotics?.data.wheels[target.id];
    return spec ? [reading("diameter", "length", m(spec.radius_mm * 2)), reading("width", "length", m(spec.width_mm)), reading("track", "length", m(trackOf(doc)))] : [];
  }
  if (target.kind === "joint") {
    const physics = doc.domains?.robotics?.data.joints[target.id];
    return physics ? [reading("damping", "other", physics.damping), reading("friction", "other", physics.friction_nm)] : [];
  }
  const mount = sensorMount(doc, target.id);
  return mount ? [reading("height", "length", m(mount.pose.position_mm[2] + (frameZ(doc, mount.frame) ?? 0))), reading("offset", "length", m(mount.pose.position_mm[0]))] : [];
}

const frameZ = (doc: Project, id: string): number | undefined => doc.mechanical?.frames.find((f) => f.id === id)?.pose.position_mm[2];

function sensorMount(doc: Project, sensorId: string): Mount | undefined {
  const binding = doc.domains?.robotics?.data.sensors.find((s) => s.id === sensorId);
  return binding && doc.mechanical?.mounts.find((m) => m.id === binding.mount);
}

/** The ops that set one property to `valueSi` (metres, kilograms or the plain number). Empty when the target or property is unknown or the value is not a number. */
export function setProp(ctx: RecipeCtx, target: PropTarget, prop: string, valueSi: number): Op[] {
  if (!Number.isFinite(valueSi)) return [];
  const { doc } = ctx;
  const mmValue = round(valueSi * MM_PER_M);

  if (target.kind === "body") {
    const body = doc.mechanical?.bodies.find((b) => b.id === target.id);
    const shape = body?.shape;
    if (!body) return [];
    if (prop === "mass") return [setBody({ ...body, mass_g: round(valueSi * G_PER_KG) })];
    if (shape?.kind === "box" && ["length", "width", "height"].includes(prop)) {
      const size: [number, number, number] = [...shape.size_mm.slice(0, 3)] as [number, number, number];
      size[["length", "width", "height"].indexOf(prop)] = mmValue;
      return [setBody({ ...body, shape: { ...shape, size_mm: size } })];
    }
    if (shape?.kind === "cylinder" && prop === "diameter") return [setBody({ ...body, shape: { ...shape, radius_mm: mmValue / 2 } })];
    if (shape?.kind === "cylinder" && prop === "width") return [setBody({ ...body, shape: { ...shape, height_mm: mmValue } })];
    if (shape?.kind === "sphere" && prop === "diameter") return [setBody({ ...body, shape: { ...shape, radius_mm: mmValue / 2 } })];
    return [];
  }

  if (target.kind === "wheel") return setWheelProp(ctx, target.id, prop, mmValue);

  if (target.kind === "joint") {
    if (prop === "damping") return [patch({ joints: { [target.id]: { damping: valueSi } } })];
    if (prop === "friction") return [patch({ joints: { [target.id]: { friction_nm: valueSi } } })];
    return [];
  }

  const mount = sensorMount(doc, target.id);
  const plateZ = mount && frameZ(doc, mount.frame);
  if (!mount || plateZ === undefined) return [];
  const [x, y, z] = mount.pose.position_mm;
  if (prop === "height") return [setMount({ ...mount, pose: { ...mount.pose, position_mm: [x, y, round(mmValue - plateZ)] } })];
  if (prop === "offset") return [setMount({ ...mount, pose: { ...mount.pose, position_mm: [mmValue, y, z] } })];
  return [];
}

function setWheelProp(ctx: RecipeCtx, jointId: string, prop: string, mmValue: number): Op[] {
  const { doc } = ctx;
  const parts = wheelParts(doc, jointId);
  const spec = doc.domains?.robotics?.data.wheels[jointId];
  if (!parts || !spec || parts.body.shape?.kind !== "cylinder") return [];
  const { joint, body, frame, plate } = parts;
  const shape = parts.body.shape;

  if (prop === "diameter") {
    const radius = mmValue / 2;
    return [
      setFrame({ ...frame, pose: { ...frame.pose, position_mm: [frame.pose.position_mm[0], frame.pose.position_mm[1], radius] } }),
      setBody({ ...body, shape: { ...shape, radius_mm: radius } }),
      setJoint({ ...joint, origin: { ...joint.origin, position_mm: [joint.origin.position_mm[0], joint.origin.position_mm[1], round(radius - plate.pose.position_mm[2])] } }),
      patch({ wheels: { [jointId]: { radius_mm: radius } } }),
    ];
  }
  if (prop === "width") return [setBody({ ...body, shape: { ...shape, height_mm: mmValue } }), patch({ wheels: { [jointId]: { width_mm: mmValue } } })];
  if (prop !== "track") return [];

  const all = wheelJoints(doc);
  const middle = all.length > 1 ? all.reduce((sum, j) => sum + j.origin.position_mm[1], 0) / all.length : 0;
  return all.flatMap((j) => {
    const wheel = wheelParts(doc, j.id);
    if (!wheel) return [];
    const y = round(middle + (sideOf(j.origin.position_mm[1] - middle) * mmValue) / 2);
    const [fx, , fz] = wheel.frame.pose.position_mm;
    return [
      setFrame({ ...wheel.frame, pose: { ...wheel.frame.pose, position_mm: [fx, round(y + wheel.plate.pose.position_mm[1]), fz] } }),
      setJoint({ ...j, origin: { ...j.origin, position_mm: [j.origin.position_mm[0], y, j.origin.position_mm[2]] } }),
    ];
  });
}

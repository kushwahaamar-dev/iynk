import { LAB_TEMPLATES } from "../../content/projects";
import type { LabTemplateEntry } from "../../content/projects";
import { newId, newProjectId } from "../core/ids.ts";
import type { RandomSource } from "../core/ids.ts";
import type { PartRegistry } from "../parts/registry.ts";
import { chainStart, stateHash } from "../project/hash.ts";
import type { Project } from "../project/generated/types.ts";
import type { TemplateEntry, TemplateKind } from "../project/guided/plan.ts";
import { createSession } from "../project/session.ts";
import { forkTemplate, withStartCheckpoint } from "./fork.ts";
import type { ForkDeps } from "./fork.ts";
import { createDocStore } from "./stores/doc.ts";
import { recipe } from "./tools/robot.ts";
import { breadboardBatch } from "./views/breadboard.ts";
import type { IdSource } from "./views/breadboard.ts";

/** The owner of every project made on this device. The project worker stamps its own projects with the same actor. */
export const LOCAL_ACTOR = "usr_local";

const BREADBOARD_AT = { x: 0, y: 0 };
const UNO_AT = { x: -80, y: 0 };

export type StarterDef = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  sourceCatalogueId: string;
};

const starter = (id: string, sourceCatalogueId = `board/uno-r3/${id}`): StarterDef => ({
  id,
  titleKey: `starters.${id}.title`,
  descriptionKey: `starters.${id}.description`,
  sourceCatalogueId,
});

/** The Blink starter comes first: it is the one a first run opens. */
export const STARTERS: readonly StarterDef[] = [
  starter("blink"),
  starter("button"),
  starter("knob"),
  starter("rgb"),
  starter("sound"),
  starter("plant"),
  starter("serial-echo", "iynk-serial-echo"),
  starter("board"),
  starter("light"),
  starter("distance"),
];

type StarterFile = { default: unknown };

const FILES: Record<string, () => Promise<StarterFile>> = {
  blink: () => import("./starters/blink.project.json"),
  button: () => import("./starters/button.project.json"),
  knob: () => import("./starters/knob.project.json"),
  rgb: () => import("./starters/rgb.project.json"),
  sound: () => import("./starters/sound.project.json"),
  plant: () => import("./starters/plant.project.json"),
  "serial-echo": () => import("./starters/serial-echo.project.json"),
  board: () => import("./starters/board.project.json"),
  light: () => import("./starters/light.project.json"),
  distance: () => import("./starters/distance.project.json"),
};

/** An Uno project with a breadboard on the canvas: the blank project plus the ops that put both boards in the breadboard view. */
export function newUnoProject(blank: Project, deps: { registry: PartRegistry; rnd: RandomSource }): Project {
  const doc = createDocStore(createSession({ state: blank, clock: () => Date.parse(blank.meta.updatedAt), rnd: deps.rnd }));
  const { batch } = breadboardBatch(deps.registry, (prefix) => newId(prefix, deps.rnd), BREADBOARD_AT);
  const placeUno = { k: "view.place", view: "vw_bb", placement: { c: "brd_uno", x_mm: UNO_AT.x, y_mm: UNO_AT.y } } as const;
  const done = doc.commit([...batch, placeUno], { label: "New project" });
  if (!done.ok) throw new Error(`${done.reject}: ${done.message}`);
  return doc.getState().state;
}

/** A new project made from a starter: its own id, revision 0, `origin` naming the starter. */
export async function loadStarter(id: string, deps: { rnd: RandomSource; now: string; actor: string }): Promise<Project> {
  const load = FILES[id];
  if (!load) throw new Error(`no starter named ${id}`);
  const source = (await load()).default as Project;
  const fork = forkTemplate({ ...source, id }, "template", {
    newId: () => newProjectId(Date.parse(deps.now), deps.rnd),
    now: () => deps.now,
    actor: deps.actor,
    genesis: chainStart,
    stateHash,
  });
  fork.meta.kind = "project";
  return fork;
}

const ROBOT_FLOOR_MM = 10_000;
const CHASSIS = "core.chassis-2wd";

/** The robotics domain of a new robot project: a bare 10 m floor with the gravity, the surface and the step limits of the other robot projects. */
const ROBOTICS_DOMAIN = {
  schemaVersion: "1.0",
  data: {
    physics: { length_scale: 1, gravity_mps2: [0, 0, -9.81], sleeping: false, ccd: "auto", params: { solver_iterations: 4 } },
    surfaces: [{ id: "floor", name: "Matte white board", mu: 0.8, crr: 0.02, reflectance: 0.85 }],
    bodies: {},
    joints: {},
    wheels: {},
    sensors: [],
    arena: { floor: { size_mm: [ROBOT_FLOOR_MM, ROBOT_FLOOR_MM], surface: "floor" }, tracks: [], statics: [], start: { x_mm: 0, y_mm: 0, yaw_deg: 0 } },
  },
} as const;

/** A robot project: the blank project plus an empty arena and a chassis, put in through the ops an edit would use. */
export function newRobotProject(blank: Project, deps: { registry: PartRegistry; ids: IdSource; rnd: RandomSource }): Project {
  const session = createSession({ state: blank, clock: () => Date.parse(blank.meta.updatedAt), rnd: deps.rnd });
  const actor = blank.access.owners[0]!;
  const domain = session.apply({ k: "domain.set", domain: "robotics", value: ROBOTICS_DOMAIN }, { actor, kind: "import" });
  if (!domain.ok) throw new Error(`${domain.reject}: ${domain.message}`);
  const made = recipe("chassis", { descriptor: CHASSIS }, { doc: session.state, newId: deps.ids, describe: (id) => deps.registry.latest(id) });
  if (!made.ok) throw new Error(made.error.message);
  const done = session.apply(made.value, { actor, kind: "user" });
  if (!done.ok) throw new Error(`${done.reject}: ${done.message}`);
  return session.state;
}

export const ROBOT_TEMPLATES = [
  { id: "line-follower", titleKey: "home.lineFollower" },
  { id: "drive-base", titleKey: "home.driveBase" },
  { id: "speed-control", titleKey: "home.speedControl" },
] as const;

export type RobotTemplateId = (typeof ROBOT_TEMPLATES)[number]["id"];

const ROBOT_FILES: Record<RobotTemplateId, () => Promise<StarterFile>> = {
  "line-follower": () => import("../../content/projects/robots/line-follower.project.json"),
  "drive-base": () => import("../../content/projects/robots/drive-base.project.json"),
  "speed-control": () => import("../../content/projects/robots/speed-control.project.json"),
};

/** A new project made from one of the robot templates: its own id, revision 0, `origin` naming the template. */
export async function loadRobotTemplate(id: RobotTemplateId, deps: { ids: IdSource; now: string; actor: string }): Promise<Project> {
  const source = (await ROBOT_FILES[id]()).default as Project;
  const fork = forkTemplate(source, "template", {
    newId: () => deps.ids("prj"),
    now: () => deps.now,
    actor: deps.actor,
    genesis: chainStart,
    stateHash,
  });
  fork.meta.kind = "project";
  return fork;
}

export interface TemplateQuery {
  board?: string;
  level?: string;
  kind?: TemplateKind;
}

export function listTemplates(entries: readonly TemplateEntry[], q: TemplateQuery = {}): readonly TemplateEntry[] {
  return entries.filter(
    (e) => (q.board === undefined || e.board === q.board) && (q.level === undefined || e.level === q.level) && (q.kind === undefined || e.kind === q.kind),
  );
}

export interface LabTemplateQuery {
  lab?: LabTemplateEntry["lab"];
  kind?: LabTemplateEntry["kind"];
}

export function listLabTemplates(q: LabTemplateQuery = {}): readonly LabTemplateEntry[] {
  return LAB_TEMPLATES.filter((e) => (q.lab === undefined || e.lab === q.lab) && (q.kind === undefined || e.kind === q.kind));
}

export type OpenDeps = ForkDeps & {
  load(id: string): Promise<Project>;
  library: { create(p: Project): Promise<string> };
  findFork(templateId: string): Promise<string | undefined>;
};

/** Opens a template as the learner's own copy. An existing fork is reopened unless `fresh` asks for a new one. */
export async function openTemplate(id: string, deps: OpenDeps, opts: { fresh?: boolean } = {}): Promise<{ projectId: string; created: boolean }> {
  if (!opts.fresh) {
    const existing = await deps.findFork(id);
    if (existing !== undefined) return { projectId: existing, created: false };
  }
  const template = await deps.load(id);
  const fork = withStartCheckpoint(forkTemplate(template, "lesson", deps), deps);
  return { projectId: await deps.library.create(fork), created: true };
}

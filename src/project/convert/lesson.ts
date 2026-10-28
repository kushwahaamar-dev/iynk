import type {
  Board,
  Component,
  ComponentDependency,
  Guide,
  InterfaceParam,
  InterfacePin,
  Language,
  LibraryDependency,
  ParamValue,
  Project,
  Source,
  TestCase,
  View,
  WireColor,
} from "../generated/types.ts";
import { chainStart } from "../hash.ts";
import type { InterfaceSnapshot } from "../holes.ts";
import { cleanName } from "../legacy-names.ts";
import { CURRENT_SCHEMA_VERSION } from "../migrate.ts";
import { BOARD_INSTANCE, circuitToNets, partInstance } from "./circuit.ts";
import {
  buildAssembly,
  buildChecks,
  buildLegacyFigure,
  buildParameters,
  buildQuizzes,
  buildSerialSample,
  buildStarter,
  buildWorld,
} from "./guide.ts";
import { boardInterface, partInterface, partRef, surfaceInterface } from "./interfaces.ts";
import type { BoardInterface } from "./interfaces.ts";
import { defaultParams, renderTemplate, translator } from "./text.ts";
import type { Translate } from "./text.ts";
import type {
  CatalogueItem,
  ConvertCheck,
  ConvertLesson,
  FigureCircuit,
  FigureHeader,
  ReportCode,
  ReportItem,
  Texts,
} from "./types.ts";

type BoardItem = CatalogueItem & { lab: "board" };

export interface ConvertContext {
  /** Written to `createdAt`, `updatedAt` and the origin: the converter never reads the clock. */
  at: string;
  /** The app version written to `provenance.createdWith`. */
  version: string;
  /** Header parts of the figure board, for references such as `IOH.5`. */
  headers: readonly FigureHeader[];
  /** The legs of each figure part, by figure part id. A part missing here gets no interface. */
  legs: Readonly<Record<string, readonly string[]>>;
  /** The parameters the descriptor of each figure part declares, by figure part id. */
  params: Readonly<Record<string, readonly InterfaceParam[]>>;
  /** The refs that have a descriptor in the part library. */
  descriptors: ReadonlySet<string>;
}

export interface ConvertResult {
  project: Project;
  report: ReportItem[];
}

const ACTOR = "usr_iynk";
const SURFACE_INSTANCE = "cmp_bb";
const SEED = 0x2545f491;
const TOUR_DURATION_MS = 1000;
const VERSION = "1.0.0";
const TOOL = "iynk-catalogue-convert/0.1";

const SOURCE_FILES: Readonly<Record<Language, { id: string; path: string }>> = {
  "arduino-cpp": { id: "src_sketch", path: "sketch.ino" },
  micropython: { id: "src_main", path: "main.py" },
  python: { id: "src_main", path: "main.py" },
  verilog: { id: "src_top", path: "top.v" },
};

const ECOSYSTEMS: Readonly<Record<Language, LibraryDependency["ecosystem"]>> = {
  "arduino-cpp": "arduino",
  micropython: "micropython",
  python: "python",
  verilog: "builtin-shim",
};

const isLanguage = (s: string): s is Language => Object.hasOwn(SOURCE_FILES, s);

const isParamValue = (v: unknown): v is number | string | boolean =>
  typeof v === "number" || typeof v === "string" || typeof v === "boolean";

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const refdesOf = (id: string): string => {
  const clean = id.replace(/[^A-Za-z0-9_]/g, "_");
  return (/^[A-Za-z]/.test(clean) ? clean : `P${clean}`).slice(0, 16);
};

function freeRefdes(prefix: string, taken: Set<string>): string {
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n++;
  taken.add(`${prefix}${n}`);
  return `${prefix}${n}`;
}

function reporter(item: string, project: string) {
  const report: ReportItem[] = [];
  const note = (code: ReportCode, message: string, refs?: string[]): void => {
    report.push({ item, project, code, message, ...(refs ? { refs } : {}) });
  };
  return { report, note };
}

type Note = ReturnType<typeof reporter>["note"];

interface Skeleton {
  id: string;
  meta: Project["meta"];
  boardId: string;
  child?: string;
  thirdParty: string;
  ctx: ConvertContext;
}

type SharedFields = Pick<
  Project,
  "format" | "schemaVersion" | "id" | "revision" | "meta" | "actors" | "access" | "assets" | "history" | "provenance" | "license"
>;

/** The fields every converted board project shares. */
function skeleton(s: Skeleton): SharedFields {
  return {
    format: "iynk.project",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: s.id,
    revision: 0,
    meta: s.meta,
    actors: [{ id: ACTOR, name: "iynk" }],
    access: { authority: "advisory", grants: [], owners: [ACTOR], visibility: "private" },
    assets: [],
    history: { baseChain: chainStart(s.id), baseRevision: 0, checkpoints: [], ops: [] },
    provenance: {
      contributors: [],
      createdBy: ACTOR,
      createdWith: { app: "iynk", version: s.ctx.version },
      origin: {
        kind: "migration",
        catalogue: { lab: "board", id: s.boardId, ...(s.child === undefined ? {} : { child: s.child }) },
        tool: TOOL,
        at: s.ctx.at,
      },
      thirdParty: [
        {
          id: "tp1",
          kind: "text",
          review: "unchecked",
          source: { title: "Third-party lesson sites named in D-017" },
          what: s.thirdParty,
        },
      ],
    },
    license: { spdx: "LicenseRef-iynk-pending" },
  };
}

const boardView = (): View => ({
  id: "vw_board",
  kind: "board",
  name: "Board",
  placements: [{ c: BOARD_INSTANCE, x_mm: 0, y_mm: 0 }],
  wires: [],
});

function boardDependency(item: BoardItem, board: BoardInterface, derived: readonly InterfacePin[] = []): ComponentDependency {
  const { snapshot } = board;
  return { ref: `core.${item.id}`, version: VERSION, origin: "builtin", interface: { ...snapshot, pins: [...snapshot.pins, ...derived] } };
}

/** Signals a check reads that the board has no pin for, such as the segments of the Basys 3 display. */
function derivedSignals(checks: readonly ConvertCheck[], board: BoardInterface): InterfacePin[] {
  const names = new Set<string>();
  for (const check of checks) {
    if ("pin" in check && !board.snapshot.pins.some((p) => p.id === check.pin || p.net === check.pin)) names.add(check.pin);
  }
  return [...names].sort(byText).map((pin) => ({ id: cleanName(pin), designator: pin, net: pin, type: "digital_io", class: "digital" }));
}

function missingDescriptors(deps: Iterable<ComponentDependency>, ctx: ConvertContext): string[] {
  return [...deps].map((d) => d.ref).filter((ref) => !ctx.descriptors.has(ref)).sort(byText);
}

function englishOf(texts: Texts, missing: Set<string>): (key: string) => string {
  return (key) => {
    const text = texts.en[key];
    if (text === undefined) missing.add(key);
    return text ?? key;
  };
}

function noteLostTexts(missing: ReadonlySet<string>, note: Note): void {
  if (missing.size === 0) return;
  note("skipped", `${missing.size} text keys have no English text; each key is used as its own text`, [...missing].sort(byText));
}

/** The board tour of a catalogue board: its overview and assembly steps, with no circuit and no code. */
export function convertBoardTour(item: BoardItem, texts: Texts, ctx: ConvertContext): ConvertResult {
  const id = `prj_${item.id}-tour`;
  const { report, note } = reporter(`board/${item.id}`, id);
  const missing = new Set<string>();
  const t = translator(texts, (key) => missing.add(key));
  const english = englishOf(texts, missing);
  const data = item.data;

  const board = boardInterface(item, ctx.headers);
  const dependency = boardDependency(item, board);
  const absent = missingDescriptors([dependency], ctx);
  if (absent.length > 0) note("no-descriptor", `${absent.join(", ")} has no descriptor in the part library yet`, absent);
  note("third-party-unchecked", "Wording and order may follow third-party sites; review is pending (F-197)");

  const guide: Guide = {
    kind: "tour",
    title: t(data.title),
    lede: t(data.tagline),
    overview: t(data.overview),
    assembly: buildAssembly(data.assembly, t),
    serialSample: buildSerialSample(data.serial),
    references: data.sources.map(({ title, url }) => ({ title, url })),
    legacyFigure: buildLegacyFigure(data.figure, null),
  };

  const project: Project = {
    ...skeleton({
      id,
      boardId: item.id,
      ctx,
      thirdParty: "Board overview, assembly steps and wording may follow a third-party site (F-197 review pending)",
      meta: {
        title: english(data.title),
        description: english(data.tagline),
        kind: "template",
        tags: [item.id, "tour"],
        locale: "en",
        createdAt: ctx.at,
        updatedAt: ctx.at,
      },
    }),
    boards: [{ id: BOARD_INSTANCE, definition: { ref: dependency.ref, version: VERSION }, refdes: "U1" }],
    components: [],
    nets: [],
    views: [boardView()],
    sources: [],
    simulation: {
      seed: SEED,
      duration_ms: TOUR_DURATION_MS,
      runtimes: [],
      solver: { engine: "iynk-mna" },
      world: { inputs: [], script: [] },
      faults: [],
    },
    parameters: [],
    dependencies: { components: [dependency], libraries: [] },
    tests: [],
    guide,
  };
  noteLostTexts(missing, note);
  return { project, report };
}

/** One lesson of a catalogue board as a project: its circuit as nets, its code as a source, its checks as a test. */
export function convertLesson(
  item: BoardItem,
  lessonId: string,
  texts: Texts,
  circuits: Readonly<Record<string, FigureCircuit>>,
  ctx: ConvertContext,
): ConvertResult {
  const lesson = item.data.lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new Error(`board/${item.id} has no lesson "${lessonId}"`);
  const id = `prj_${item.id}-${lesson.id}`;
  const name = `board/${item.id}/${lesson.id}`;
  const { report, note } = reporter(name, id);
  const missing = new Set<string>();
  const t = translator(texts, (key) => missing.add(key));
  const english = englishOf(texts, missing);

  const board = boardInterface(item, ctx.headers);
  const derived = derivedSignals(lesson.checks, board);
  if (derived.length > 0) {
    note("unresolved-endpoint", "Check pins that are not pins of the board are added to its pinned interface as derived signals", derived.map((p) => p.id));
  }
  const boardDep = boardDependency(item, board, derived);
  const deps = new Map<string, ComponentDependency>([[boardDep.ref, boardDep]]);

  const circuit = lesson.circuit === null ? undefined : circuits[lesson.circuit];
  if (lesson.circuit !== null && !circuit) note("skipped", `the circuit "${lesson.circuit}" is not on the figure board, so the lesson has no nets`, [lesson.circuit]);

  const built = buildParameters(lesson.params, t);
  const components: Component[] = [];
  let nets: Project["nets"] = [];
  let view = boardView();
  const refdes = new Set<string>();

  if (circuit) {
    const snapshots = new Map<string, InterfaceSnapshot>();
    for (const part of circuit.parts) {
      const legs = ctx.legs[part.part];
      if (legs) snapshots.set(part.id, { ...partInterface(part.part, legs), params: [...(ctx.params[part.part] ?? [])] });
      refdes.add(refdesOf(part.id));
    }
    const out = circuitToNets(circuit, board, { parts: snapshots, surface: SURFACE_INSTANCE, kind: circuit.breadboard, item: name });
    for (const r of out.report) report.push({ ...r, project: id });
    nets = out.nets;

    const surface = { ref: `core.breadboard-${circuit.breadboard}`, version: VERSION };
    deps.set(surface.ref, { ...surface, origin: "builtin", interface: surfaceInterface(circuit.breadboard) });
    components.push({ id: SURFACE_INSTANCE, definition: surface, refdes: freeRefdes("BB", refdes) });

    for (const part of circuit.parts) {
      const definition = partRef(part.part);
      const ref = { ref: definition.ref, version: definition.version };
      deps.set(ref.ref, { ...ref, origin: "builtin", interface: snapshots.get(part.id) ?? { role: "part", pins: [], params: [] } });
      const declared = new Set((ctx.params[part.part] ?? []).map((p) => p.id));
      const params: Record<string, ParamValue> = {};
      for (const [key, value] of Object.entries(part)) if (declared.has(key) && isParamValue(value)) params[key] = value;
      components.push({
        id: partInstance(part.id),
        definition: ref,
        refdes: refdesOf(part.id),
        ...(Object.keys(params).length > 0 ? { params } : {}),
      });
    }

    for (const binding of built.bindings) {
      const owner = circuit.parts.find((p) => p.id === binding.part);
      const target = owner && components.find((c) => c.id === partInstance(owner.id));
      if (!owner || !target || !(ctx.params[owner.part] ?? []).some((p) => p.id === binding.key)) {
        note("skipped", `parameter ${binding.parameter} drives ${binding.part}.${binding.key}, which is not a parameter of a part in the circuit; it is not bound`, [binding.part]);
        continue;
      }
      target.params = { ...target.params, [binding.key]: { param: binding.parameter } };
    }

    view = {
      id: "vw_bb",
      kind: "breadboard",
      name: "Breadboard",
      surface: SURFACE_INSTANCE,
      placements: out.placements,
      wires: out.wires,
    };
  } else if (built.bindings.length > 0) {
    note("skipped", "the lesson has no circuit, so its parameters drive no part", built.bindings.map((b) => b.part));
  }

  const absent = missingDescriptors(deps.values(), ctx);
  if (absent.length > 0) note("no-descriptor", `${absent.join(", ")} have no descriptor in the part library yet`, absent);

  const links = {
    component: (part: string): string => {
      const owner = circuit?.parts.find((p) => p.id === part);
      if (owner) return partInstance(owner.id);
      note("unknown-part", `the world input on figure part ${part} is attached to the board, because ${part} is not a part of the circuit`, [part]);
      return BOARD_INSTANCE;
    },
    pin: (pin: string) => {
      const found = board.refToPin(pin);
      if (found === null) note("unresolved-endpoint", `the world input pin "${pin}" is not a pin of the board`, [pin]);
      return found === null ? null : { c: BOARD_INSTANCE, p: found };
    },
  };
  const world = buildWorld(lesson.world, t, links);

  const language = isLanguage(lesson.language) ? lesson.language : "arduino-cpp";
  if (!isLanguage(lesson.language)) note("skipped", `the language "${lesson.language}" is not a project language; the code is kept as ${language}`, [lesson.language]);
  const file = SOURCE_FILES[language];
  const content = renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params), english);
  if (/\{\{t:/.test(lesson.code.source)) note("code-comments-en-only", "Comments in the starter code are kept in English only");
  const libraries = [...new Set(lesson.code.libraries)].sort(byText);

  const source: Source = { id: file.id, path: file.path, language, role: "firmware", board: BOARD_INSTANCE, content };
  const firmware: NonNullable<Board["firmware"]> = {
    language,
    entry: file.id,
    sources: [file.id],
    libraries,
    ...(lesson.code.top === undefined ? {} : { top: lesson.code.top }),
    ...(lesson.code.ports === undefined ? {} : { ports: portsOf(lesson.code.ports, board, note) }),
  };

  const variant = lesson.variants[0];
  const lost = [...built.lost, ...world.lost];
  if (lost.length > 0) note("skipped", `the project schema has no field for: ${lost.join("; ")}`, lost);
  note("third-party-unchecked", "Lesson order, wording and timings may follow a third-party lesson site; review is pending (F-197)");

  const checks = buildChecks(lesson.checks, t);
  const tests: TestCase[] =
    checks.length > 0 ? [{ id: "main", name: t(lesson.title), runMs: lesson.runMs, checks: checks as TestCase["checks"] }] : [];

  const project: Project = {
    ...skeleton({
      id,
      boardId: item.id,
      child: lesson.id,
      ctx,
      thirdParty: "Lesson order, wording and timings may follow a third-party lesson site (F-197 review pending)",
      meta: {
        title: english(lesson.title),
        description: english(lesson.lede),
        kind: "lesson",
        tags: [item.id, "lesson", lesson.level],
        locale: "en",
        createdAt: ctx.at,
        updatedAt: ctx.at,
      },
    }),
    boards: [
      {
        id: BOARD_INSTANCE,
        definition: { ref: boardDep.ref, version: VERSION },
        refdes: freeRefdes("U", refdes),
        ...(variant === undefined ? {} : { variant }),
        firmware,
      },
    ],
    components,
    nets,
    views: [view],
    sources: [source],
    simulation: {
      seed: SEED,
      duration_ms: lesson.runMs,
      runtimes: [{ id: "rtm_main", board: BOARD_INSTANCE, engine: "iynk-interp" }],
      solver: { engine: "iynk-mna" },
      world: world.world,
      faults: [],
    },
    parameters: built.parameters,
    dependencies: {
      components: [...deps.values()],
      libraries: libraries.map((name) => ({ name, ecosystem: ECOSYSTEMS[language] })),
    },
    tests,
    guide: lessonGuide(item, lesson, t, buildStarter(lesson.code, lesson.params, file.id, english)),
  };
  noteLostTexts(missing, note);
  return { project, report };
}

function lessonGuide(item: BoardItem, lesson: ConvertLesson, t: Translate, starter: NonNullable<Guide["starter"]>): Guide {
  const variant = lesson.variants[0];
  const figureVariant = variant === undefined ? undefined : item.data.variants.find((v) => v.id === variant)?.figureVariant;
  return {
    kind: "lesson",
    order: lesson.n,
    level: lesson.level as Guide["level"],
    title: t(lesson.title),
    lede: t(lesson.lede),
    ...(lesson.variants.length > 0 ? { variants: lesson.variants } : {}),
    steps: lesson.steps.map(t),
    hints: lesson.hints.map(t),
    pins: lesson.pins.map((p) => ({ pin: p.pin, to: t(p.to), role: t(p.role), color: p.color as WireColor })),
    callouts: lesson.callouts.map((c) => ({ target: c.part, text: t(c.text) })),
    specs: lesson.specs.map((s) => ({ label: t(s.label), value: t(s.value) })),
    features: lesson.features.map((f) => ({ icon: f.icon, text: t(f.text) })),
    ...(lesson.quiz ? { quizzes: buildQuizzes([lesson.quiz], t) } : {}),
    starter,
    serialSample: buildSerialSample(lesson.serial),
    legacyFigure: buildLegacyFigure(item.data.figure, lesson.circuit, figureVariant),
  };
}

function portsOf(
  ports: Readonly<Record<string, readonly string[]>>,
  board: BoardInterface,
  note: Note,
): NonNullable<NonNullable<Board["firmware"]>["ports"]> {
  const out: Record<string, [string, ...string[]]> = {};
  for (const [port, pins] of Object.entries(ports)) {
    const ids = pins.map((pin) => {
      const found = board.refToPin(pin);
      if (found === null) note("unresolved-endpoint", `the Verilog port ${port} names "${pin}", which is not a pin of the board`, [port, pin]);
      return found ?? pin;
    });
    out[port] = ids as [string, ...string[]];
  }
  return out;
}

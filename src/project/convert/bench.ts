import type {
  Board,
  Component,
  ComponentDependency,
  Guide,
  InterfaceGroup,
  Project,
  Text,
  View,
} from "../generated/types.ts";
import { chainStart } from "../hash.ts";
import type { InterfaceSnapshot } from "../holes.ts";
import { boardGroups, boardPinIds, pinIdFromLeg } from "../legacy-names.ts";
import { CURRENT_SCHEMA_VERSION } from "../migrate.ts";
import { BOARD_INSTANCE, circuitToNets, partInstance } from "./circuit.ts";
import { convertBenchSim, slug } from "./bench-sim.ts";
import type { CauseOf } from "./bench-sim.ts";
import { convertSteps } from "./bench-steps.ts";
import { buildLegacyFigure } from "./guide.ts";
import { boardInterface, partInterface, partRef, surfaceInterface } from "./interfaces.ts";
import type { BoardInterface } from "./interfaces.ts";
import type { ConvertContext, ConvertResult } from "./lesson.ts";
import { translator } from "./text.ts";
import type {
  CatalogueItem,
  FigureBench,
  FigureCircuit,
  FigureHeader,
  ReportCode,
  ReportItem,
  Texts,
} from "./types.ts";

type BoardItem = CatalogueItem & { lab: "board" };
type RoboticsItem = CatalogueItem & { lab: "robotics" };

/** What `extractBench` reads on top of `FigureBench`: the default circuit and the legs of parts the bench defines. */
export interface BenchFigure extends FigureBench {
  circuit?: string | null;
  partLegs?: Readonly<Record<string, readonly string[]>>;
}

export interface BenchContext extends ConvertContext {
  /** The catalogue board of the bench (`data.board`); null for a bench without one. */
  board: BoardItem | null;
  /** The registry cause and symptoms of a bench fault. Without it a fault is its own cause and symptom. */
  causeOf?: CauseOf;
  /** The id of a bench project (`child` null) or of one of its task projects. */
  projectId?: (lab: "robotics", id: string, child: string | null) => string;
}

const ACTOR = "usr_iynk";
const SURFACE_INSTANCE = "cmp_bb";
const SEED = 0x2545f491;
const BENCH_DURATION_MS = 1000;
const VERSION = "1.0.0";
const TOOL = "iynk-catalogue-convert/0.1";
const LEGACY = "x-iynk-legacy";
const BENCH = "x-iynk-bench";

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function refdesOf(id: string, taken: Set<string>): string {
  const clean = id.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
  const base = (/^[A-Z]/.test(clean) ? clean : `P${clean}`).slice(0, 14);
  let refdes = base;
  for (let n = 2; taken.has(refdes); n++) refdes = `${base}${n}`;
  taken.add(refdes);
  return refdes;
}

interface Meta {
  tags: string[];
  palette?: string;
  boardVariant?: string;
}

/** `CatalogueItem.meta` is typed `unknown` because the portable code never needs most of it. */
function metaOf(item: RoboticsItem): Meta {
  const meta = (item.meta ?? {}) as Record<string, unknown>;
  const tags = Array.isArray(meta.tags) ? meta.tags.filter((t): t is string => typeof t === "string") : [];
  return {
    tags,
    ...(typeof meta.palette === "string" ? { palette: meta.palette } : {}),
    ...(typeof meta.boardVariant === "string" ? { boardVariant: meta.boardVariant } : {}),
  };
}

/** A header-only figure (a module or a periph board) as a pinned interface: one pin per `<header>.<n>` entry. A header whose entries are not net names, such as the A4988 `CB` coordinates, has no pins. */
function headerInterface(headers: readonly FigureHeader[]): { snapshot: InterfaceSnapshot; pin(ref: string): string | null } {
  const rows: { header: string; pin: string; net?: string }[] = [];
  for (const h of headers) {
    h.pins.forEach((net, i) => {
      if (typeof net === "string") rows.push({ header: h.id, pin: String(i + 1), ...(net === "" ? {} : { net }) });
    });
  }
  const ids = boardPinIds(rows);
  const snapshot: InterfaceSnapshot = {
    role: "part",
    pins: rows.map((row, i) => ({
      id: ids[i]!,
      designator: row.net ?? `${row.header}.${row.pin}`,
      header: row.header,
      ...(row.net === undefined ? {} : { net: row.net }),
      type: "passive",
      class: "passive",
    })),
    groups: boardGroups(rows, ids).map((g) => ({ id: g.id, kind: g.kind, pins: g.pins as InterfaceGroup["pins"] })),
    params: [],
  };
  const byRow = new Map(rows.map((row, i) => [`${row.header}.${row.pin}`, ids[i]!]));
  const byNet = new Map<string, string>();
  rows.forEach((row, i) => {
    if (row.net !== undefined && !byNet.has(row.net)) byNet.set(row.net, ids[i]!);
  });
  return { snapshot, pin: (ref) => byRow.get(ref) ?? byNet.get(ref) ?? null };
}

interface Owner {
  /** The circuit part id, or null for the main board, whose pins are written bare. */
  id: string | null;
  pin(ref: string): string | null;
}

interface Instance {
  /** The id in the circuit handed to `circuitToNets`: the figure's own id for the item. */
  id: string;
  /** The figure board, module or part it is. */
  figure: string;
  snapshot: InterfaceSnapshot;
  pin(ref: string): string | null;
}

const MAT_END = /^([A-Za-z_][\w-]*)\.(.+)$/;

function reporter(item: string, project: string) {
  const report: ReportItem[] = [];
  const note = (code: ReportCode, message: string, refs?: string[]): void => {
    report.push({ item, project, code, message, ...(refs ? { refs } : {}) });
  };
  return { report, note };
}

/** One robotics bench as a project: its mat wires or default circuit as nets, its modes as sources, its faults as simulation faults. */
export function convertBench(item: RoboticsItem, texts: Texts, bench: BenchFigure, ctx: BenchContext): ConvertResult {
  const data = item.data;
  const id = ctx.projectId?.("robotics", item.id, null) ?? `prj_bench-${slug(item.id)}`;
  const name = `robotics/${item.id}`;
  const { report, note } = reporter(name, id);
  const missing = new Set<string>();
  const t = translator(texts, (key) => missing.add(key));
  const english = (key: string): string => {
    const text = texts.en[key];
    if (text === undefined) missing.add(key);
    return text ?? key;
  };
  const meta = metaOf(item);

  if ((data.board === null) !== (ctx.board === null)) throw new Error(`${name}: the context board must be given exactly when the bench has a board`);
  const legsOf = (part: string): readonly string[] | undefined => bench.partLegs?.[part] ?? ctx.legs[part];

  const mainHeaders = bench.board === data.board ? bench.headers : (bench.periph.map((p) => (p.board === data.board ? bench.periphHeaders[p.id] : undefined)).find(Boolean) ?? []);
  const board: BoardInterface | null = ctx.board ? boardInterface(ctx.board, mainHeaders) : null;

  const instances: Instance[] = [];
  const addModule = (instanceId: string, figure: string, headers: readonly FigureHeader[]): void => {
    const { snapshot, pin } = headerInterface(headers);
    instances.push({ id: instanceId, figure, snapshot, pin });
  };
  const addPart = (instanceId: string, figure: string): void => {
    const legs = legsOf(figure);
    if (!legs) note("unknown-part", `${instanceId} (${figure}) has no legs, so it is placed without pins`, [instanceId]);
    const snapshot = legs ? { ...partInterface(figure, legs), params: [...(ctx.params[figure] ?? [])] } : { role: "part" as const, pins: [], params: [] };
    instances.push({
      id: instanceId,
      figure,
      snapshot,
      pin: (ref) => snapshot.pins.find((p) => p.designator === ref)?.id ?? snapshot.pins.find((p) => p.id === pinIdFromLeg(ref))?.id ?? null,
    });
  };
  if (bench.board && bench.board !== data.board) addModule(bench.board, bench.board, bench.headers);
  for (const p of bench.periph) {
    if (p.board !== undefined && p.board !== data.board) addModule(p.id, p.board, bench.periphHeaders[p.id] ?? []);
    else if (p.part !== undefined) addPart(p.id, p.part);
  }

  const circuit: FigureCircuit | undefined = bench.circuit ? bench.circuits[bench.circuit] : undefined;
  if (bench.circuit && !circuit) note("bench-circuit-unresolved", `the default circuit "${bench.circuit}" is not one the bench adds, so the bench has no breadboard`, [bench.circuit]);
  const circuitIds = new Set(circuit?.parts.map((p) => p.id));
  const placed = instances.filter((i) => !circuitIds.has(i.id));

  const mainOwner: Owner | null = board
    ? { id: null, pin: (ref) => (board.ids.includes(ref) ? ref : board.refToPin(ref)) }
    : null;
  const ownerOf = (instanceId: string): Owner | null => instances.find((i) => i.id === instanceId) ?? null;
  const owners = new Map<string, Owner | null>(
    bench.periph.map((p) => [p.id, p.board !== undefined && p.board === data.board ? mainOwner : ownerOf(p.id)]),
  );
  const baseOwner = bench.board === data.board ? mainOwner : bench.board ? ownerOf(bench.board) : null;
  const endOf = (ref: string): string | null => {
    const m = MAT_END.exec(ref);
    const periph = m && bench.periph.find((p) => p.id === m[1]);
    const owner = periph ? owners.get(periph.id) : baseOwner;
    const pin = owner?.pin(periph ? m[2]! : ref);
    if (!owner || !pin) return null;
    return owner.id === null ? pin : `${owner.id}.${pin}`;
  };
  const matWires = bench.wires.flatMap((wire, i) => {
    const from = endOf(wire.from);
    const to = endOf(wire.to);
    for (const [ref, end] of [[wire.from, from], [wire.to, to]] as const) {
      if (end === null) note("unresolved-endpoint", `mat wire ${i + 1}: "${ref}" is not a pin or leg of the bench`, [`wire ${i + 1}`, ref]);
    }
    return from === null || to === null ? [] : [{ ...wire, from, to }];
  });

  const snapshots = new Map(placed.map((i) => [i.id, i.snapshot]));
  const paramsOf = new Map<string, Component["params"]>();
  for (const part of circuit?.parts ?? []) {
    const legs = legsOf(part.part);
    if (legs) snapshots.set(part.id, { ...partInterface(part.part, legs), params: [...(ctx.params[part.part] ?? [])] });
    const declared = new Set((ctx.params[part.part] ?? []).map((p) => p.id));
    const values = Object.entries(part).filter(([key, value]) => declared.has(key) && ["number", "string", "boolean"].includes(typeof value));
    if (values.length > 0) paramsOf.set(part.id, Object.fromEntries(values) as Component["params"]);
  }

  const emptyBoard: BoardInterface = { snapshot: { role: "board", pins: [], params: [] }, ids: [], refToPin: () => null };
  const base = board ?? emptyBoard;
  const nets = circuitToNets(
    {
      breadboard: circuit?.breadboard ?? "half",
      parts: [...(circuit?.parts ?? []), ...placed.map((i) => ({ id: i.id, part: i.figure }))],
      wires: [...(circuit?.wires ?? []), ...matWires],
    },
    { ...base, refToPin: (ref) => (base.ids.includes(ref) ? ref : base.refToPin(ref)) },
    { parts: snapshots, surface: SURFACE_INSTANCE, kind: circuit?.breadboard ?? "half", item: name },
  );
  for (const r of nets.report) report.push({ ...r, project: id });

  const refdes = new Set<string>(board ? ["U1"] : []);
  const dependencies = new Map<string, ComponentDependency>();
  const components: Component[] = [];
  const used = new Set<string>([SURFACE_INSTANCE, BOARD_INSTANCE]);
  const unplaced = new Set<string>();
  const depend = (figure: string, snapshot: InterfaceSnapshot): { ref: string; version: "1.0.0" } => {
    const { ref, version } = partRef(figure);
    if (!ctx.descriptors.has(ref)) unplaced.add(figure);
    if (!dependencies.has(ref)) dependencies.set(ref, { ref, version, origin: "builtin", interface: snapshot });
    return { ref, version };
  };
  const addComponent = (instanceId: string, figure: string, label: string, snapshot: InterfaceSnapshot): void => {
    let cmp = partInstance(instanceId);
    for (let n = 2; used.has(cmp); n++) cmp = `${partInstance(instanceId)}_${n}`;
    used.add(cmp);
    components.push({
      id: cmp,
      definition: depend(figure, snapshot),
      refdes: refdesOf(label, refdes),
      ...(paramsOf.has(instanceId) ? { params: paramsOf.get(instanceId) } : {}),
    });
  };

  if (circuit) {
    const surface = { ref: `core.breadboard-${circuit.breadboard}`, version: VERSION };
    dependencies.set(surface.ref, { ...surface, origin: "builtin", interface: surfaceInterface(circuit.breadboard) });
    components.push({ id: SURFACE_INSTANCE, definition: surface, refdes: refdesOf("BB", refdes) });
  }
  for (const part of circuit?.parts ?? []) {
    addComponent(part.id, part.part, part.id, snapshots.get(part.id) ?? { role: "part", pins: [], params: [] });
  }
  for (const i of placed) addComponent(i.id, i.figure, i.id, i.snapshot);

  const covered = new Set<string>([...components.map((c) => c.definition.ref)]);
  const extras = [...data.modules, ...data.parts].filter((figure) => !covered.has(partRef(figure).ref));
  for (const figure of [...new Set(extras)]) {
    const legs = legsOf(figure);
    const snapshot: InterfaceSnapshot = legs ? { ...partInterface(figure, legs), params: [...(ctx.params[figure] ?? [])] } : { role: "part", pins: [], params: [] };
    addComponent(figure, figure, figure, snapshot);
  }

  const boardDep = board && ctx.board ? { ref: `core.${ctx.board.id}`, version: VERSION } : null;
  if (boardDep && board) dependencies.set(boardDep.ref, { ...boardDep, origin: "builtin", interface: board.snapshot });
  const absent = [...dependencies.values()].map((d) => d.ref).filter((ref) => !ctx.descriptors.has(ref)).sort(byText);
  if (absent.length > 0) note("no-descriptor", `${absent.join(", ")} have no descriptor in the part library yet`, absent);

  const tasks = data.tasks.map((task) => ctx.projectId?.("robotics", item.id, task.id) ?? `prj_task-${item.id}-${task.id}`);
  const { faults, sources, ext: benchExt } = convertBenchSim(data, {
    t,
    english,
    causeOf: ctx.causeOf ?? ((failure) => ({ cause_id: failure.id, symptom_ids: [failure.id] })),
    ...(board ? { board: BOARD_INSTANCE } : {}),
    tasks,
    unplaced: [...unplaced].sort(byText),
    note,
  });
  const defaultSource = sources[data.modes.findIndex((m) => m.id === data.defaultMode)];
  const libraries = [...new Set(data.modes.flatMap((m) => m.code.libraries))].sort(byText);
  const firmwareLanguage = defaultSource?.language ?? "text";
  const firmware: NonNullable<Board["firmware"]> | undefined =
    board && defaultSource && sources.length > 0
      ? { language: firmwareLanguage as NonNullable<Board["firmware"]>["language"], entry: defaultSource.id, sources: sources.map((s) => s.id) as [string, ...string[]], libraries }
      : undefined;

  const view: View = circuit
    ? { id: "vw_bb", kind: "breadboard", name: "Breadboard", surface: SURFACE_INSTANCE, placements: nets.placements, wires: nets.wires }
    : { id: "vw_mat", kind: "mat", name: "Bench", placements: nets.placements.filter((p) => p.c !== SURFACE_INSTANCE), wires: nets.wires };
  if (!board) view.placements = view.placements.filter((p) => p.c !== BOARD_INSTANCE);
  for (const c of components) {
    if (c.id !== SURFACE_INSTANCE && !view.placements.some((p) => p.c === c.id)) view.placements.push({ c: c.id, x_mm: 0, y_mm: 0 });
  }

  const guide: Guide = {
    kind: "bench",
    title: t(data.title),
    sub: t(data.sub),
    hint: t(data.hint),
    overview: t(data.overview),
    ...convertSteps(data, t),
    references: data.sources.map(({ title, url }) => ({ title, url })),
    legacyFigure: buildLegacyFigure(data.figure, null),
  };

  const otherCircuits = Object.fromEntries(Object.entries(bench.circuits).filter(([key]) => key !== bench.circuit));
  const ext: Project["ext"] = {
    [LEGACY]: {
      fig: data.fig,
      ...(meta.palette === undefined ? {} : { palette: meta.palette }),
      ...(Object.keys(otherCircuits).length > 0 ? { circuits: otherCircuits } : {}),
    },
    [BENCH]: benchExt,
  };
  if (Object.keys(otherCircuits).length > 0) {
    note("skipped", `the staged circuits ${Object.keys(otherCircuits).join(", ")} are kept as legacy data, not as nets`, Object.keys(otherCircuits));
  }
  note("third-party-unchecked", "Bench steps and wording may follow third-party sites; review is pending (F-197)");
  if (missing.size > 0) note("skipped", `${missing.size} text keys have no English text; each key is used as its own text`, [...missing].sort(byText));

  const project: Project = {
    format: "iynk.project",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    revision: 0,
    meta: {
      title: english(data.title),
      description: english(data.sub),
      kind: "bench",
      tags: [...new Set([item.id, "bench", ...meta.tags])],
      locale: "en",
      createdAt: ctx.at,
      updatedAt: ctx.at,
    },
    actors: [{ id: ACTOR, name: "iynk" }],
    access: { authority: "advisory", grants: [], owners: [ACTOR], visibility: "private" },
    boards:
      board && boardDep
        ? [
            {
              id: BOARD_INSTANCE,
              definition: boardDep,
              refdes: "U1",
              ...(meta.boardVariant === undefined && bench.variant === undefined ? {} : { variant: bench.variant ?? meta.boardVariant }),
              ...(firmware ? { firmware } : {}),
            },
          ]
        : [],
    components,
    nets: nets.nets,
    views: [view],
    sources,
    simulation: {
      seed: SEED,
      duration_ms: BENCH_DURATION_MS,
      runtimes: board ? [{ id: "rtm_main", board: BOARD_INSTANCE, engine: "iynk-interp" }] : [],
      solver: { engine: "iynk-mna" },
      world: { inputs: [], script: [] },
      faults,
    },
    parameters: [],
    assets: [],
    dependencies: {
      components: [...dependencies.values()],
      libraries: libraries.map((library) => ({ name: library, ecosystem: firmwareLanguage === "python" ? "python" : "arduino" })),
    },
    tests: [],
    guide,
    history: { baseChain: chainStart(id), baseRevision: 0, checkpoints: [], ops: [] },
    provenance: {
      contributors: [],
      createdBy: ACTOR,
      createdWith: { app: "iynk", version: ctx.version },
      origin: { kind: "migration", catalogue: { lab: "robotics", id: item.id }, tool: TOOL, at: ctx.at },
      thirdParty: [
        {
          id: "tp1",
          kind: "text",
          review: "unchecked",
          source: { title: "Third-party robotics sites named in D-017" },
          what: "Bench steps, faults and wording may follow a third-party site (F-197 review pending)",
        },
      ],
    },
    license: { spdx: "LicenseRef-iynk-pending" },
    ext,
  };
  return { project, report };
}

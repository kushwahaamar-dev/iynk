import type { Guide, IynkDroneDomainData, Project } from "../generated/types.ts";
import { chainStart } from "../hash.ts";
import { CURRENT_SCHEMA_VERSION } from "../migrate.ts";
import { buildAssembly, buildLegacyFigure, buildQuizzes } from "./guide.ts";
import type { ConvertContext, ConvertResult } from "./lesson.ts";
import { translator } from "./text.ts";
import type { Translate } from "./text.ts";
import type { CatalogueItem, ConvertCourse, ConvertDroneContent, ReportItem, Texts } from "./types.ts";

type DroneItem = CatalogueItem & { lab: "drone" };

const ACTOR = "usr_iynk";
const SEED = 0x2545f491;
const TOOL = "iynk-catalogue-convert/0.1";
const LEGACY_FIGURE = "x-iynk-legacy";
const LEGACY_CRAFT = "x-iynk-legacy-craft";

/** The neutral air of the `drone-quad` example: still, sea level, no sensor failures. */
const neutralEnvironment = (): IynkDroneDomainData["environment"] => ({
  temperature_degC: 15,
  altitude_msl_m: 0,
  pressure_pa: 101325,
  wind: { mean_mps: [0, 0, 0], gust: { kind: "none", sigma_mps: 0, tau_s: 1 } },
  sensorFailures: [],
});

interface DesignTexts {
  fixed?: { name: string }[];
  golden?: { verdict: string }[];
}

/** The craft's design table verbatim, except that the part names and the golden verdicts are text keys. */
function designOf(design: unknown, t: Translate): unknown {
  const { fixed, golden, ...rest } = design as DesignTexts & Record<string, unknown>;
  return {
    ...rest,
    ...(fixed === undefined ? {} : { fixed: fixed.map((part) => ({ ...part, name: t(part.name) })) }),
    ...(golden === undefined ? {} : { golden: golden.map((entry) => ({ ...entry, verdict: t(entry.verdict) })) }),
  };
}

const courseOf = (course: ConvertCourse, t: Translate) => ({
  ...course,
  title: t(course.title),
  brief: t(course.brief),
  goals: course.goals.map((goal) => ({ ...goal, label: t(goal.label) })),
});

function legacyCraft(data: ConvertDroneContent, t: Translate) {
  return {
    class: data.class,
    noun: t(data.noun),
    practice: t(data.practice),
    frame: data.frame,
    design: designOf(data.design, t),
    parts: data.parts.map((part) => ({ ...part, name: t(part.name), what: t(part.what) })),
    wiring: data.wiring.map((wire) => ({ ...wire, note: t(wire.note) })),
    tests: data.tests.map((test) => ({ ...test, title: t(test.title), pass: t(test.pass), fail: t(test.fail) })),
    firmware: {
      ...data.firmware,
      snippets: data.firmware.snippets.map((snippet) => ({ ...snippet, title: t(snippet.title), explain: t(snippet.explain) })),
    },
    flight: {
      ...data.flight,
      modes: data.flight.modes.map((mode) => ({ ...mode, title: t(mode.title), hint: t(mode.hint) })),
      failsafes: data.flight.failsafes.map((failsafe) => ({ ...failsafe, note: t(failsafe.note) })),
      controls: t(data.flight.controls),
    },
    courses: data.courses.map((course) => courseOf(course, t)),
  };
}

/** One drone craft of the catalogue as a project. Its drone model has no schema fields yet, so it lives in `ext` (OQ-12). */
export function convertCraft(item: DroneItem, texts: Texts, ctx: ConvertContext): ConvertResult {
  const data = item.data;
  const id = `prj_craft-${item.id}`;
  const name = `drone/${item.id}`;
  const missing = new Set<string>();
  const t = translator(texts, (key) => missing.add(key));
  const english = (key: string): string => {
    const text = texts.en[key];
    if (text === undefined) missing.add(key);
    return text ?? key;
  };

  const report: ReportItem[] = [];
  const note = (code: ReportItem["code"], message: string, refs?: string[]): void => {
    report.push({ item: name, project: id, code, message, ...(refs ? { refs } : {}) });
  };
  note("third-party-unchecked", "Craft wording, build order and firmware settings may follow third-party sources; review is pending (F-197)");
  note(
    "skipped",
    "the drone domain schema has no fields for the frame, parts, wiring, tests, firmware, flight and courses of a craft; they are kept in ext x-iynk-legacy-craft",
  );
  if (data.courses.length === 0) throw new Error(`${name} has no course`);
  if (missing.size > 0) {
    note("skipped", `${missing.size} text keys have no English text; each key is used as its own text`, [...missing].sort());
  }

  const guide: Guide = {
    kind: "craft",
    title: t(data.title),
    sub: t(data.sub),
    hint: t(data.hint),
    overview: t(data.overview),
    assembly: buildAssembly(data.build, t),
    quizzes: buildQuizzes(data.quizzes, t),
    references: data.sources.map(({ title, url }) => ({ title, url })),
    legacyFigure: buildLegacyFigure(data.figure, null),
  };

  const project: Project = {
    format: "iynk.project",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    revision: 0,
    meta: {
      title: english(data.title),
      description: english(data.sub),
      kind: "craft",
      tags: [item.id, "craft", data.class],
      locale: "en",
      createdAt: ctx.at,
      updatedAt: ctx.at,
    },
    actors: [{ id: ACTOR, name: "iynk" }],
    access: { authority: "advisory", grants: [], owners: [ACTOR], visibility: "private" },
    boards: [],
    components: [],
    nets: [],
    views: [],
    sources: [],
    simulation: {
      seed: SEED,
      duration_ms: 1000,
      runtimes: [],
      solver: { engine: "iynk-mna" },
      world: { inputs: [], script: [] },
      faults: [],
    },
    parameters: [],
    assets: [],
    dependencies: { components: [], libraries: [] },
    tests: [],
    guide,
    domains: {
      drone: {
        schemaVersion: "1.0",
        data: {
          kind: "legacy-craft",
          legacy: { contentId: item.id, calcModelId: "legacy-calc@1", flightModelId: "flight-game@1" },
          thrustSource: "legacy-calc",
          flight: { model: "flight-game@1" },
          environment: neutralEnvironment(),
          course: { builtin: data.courses[0]!.id },
          bench: { propsOff: true },
        },
      },
    },
    history: { baseChain: chainStart(id), baseRevision: 0, checkpoints: [], ops: [] },
    provenance: {
      contributors: [],
      createdBy: ACTOR,
      createdWith: { app: "iynk", version: ctx.version },
      origin: { kind: "migration", catalogue: { lab: "drone", id: item.id }, tool: TOOL, at: ctx.at },
      thirdParty: [
        {
          id: "tp1",
          kind: "text",
          review: "unchecked",
          source: { title: "Third-party drone build and firmware guides named in D-017" },
          what: "Craft wording, build order and firmware settings may follow third-party sources (F-197 review pending)",
        },
      ],
    },
    license: { spdx: "LicenseRef-iynk-pending" },
    ext: {
      [LEGACY_FIGURE]: {
        fig: data.fig,
        figureParts: data.figure.parts.map((part) => ({ ...part, name: t(part.name), what: t(part.what) })),
      },
      [LEGACY_CRAFT]: legacyCraft(data, t),
    },
  };
  return { project, report };
}

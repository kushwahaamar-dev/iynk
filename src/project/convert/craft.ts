import type { Project } from "../generated/types.ts";
import { chainStart } from "../hash.ts";
import { CURRENT_SCHEMA_VERSION } from "../migrate.ts";
import { craftDomain } from "./craft-domain.ts";
import { craftGuide, craftParameters, craftThirdParty } from "./craft-guide.ts";
import type { FixtureSource } from "./craft-guide.ts";
import type { ConvertContext, ConvertResult } from "./lesson.ts";
import { translator } from "./text.ts";
import type { CatalogueItem, ReportItem, Texts } from "./types.ts";

type DroneItem = CatalogueItem & { lab: "drone" };

const ACTOR = "usr_iynk";
const SEED = 0x2545f491;
const TOOL = "iynk-catalogue-convert/0.1";
const LEGACY = "x-iynk-legacy";

/** The optional fields of the lab generator (T-B13-15) on top of B2's context. */
export type CraftContext = ConvertContext & {
  projectId?: (lab: "drone", id: string, child: null) => string;
  fixtureSources?: readonly FixtureSource[];
};

/** `CatalogueItem.meta` is typed `unknown` because the portable code never needs most of it. */
const paletteOf = (item: DroneItem): string | undefined => {
  const palette = (item.meta as { palette?: unknown } | null)?.palette;
  return typeof palette === "string" ? palette : undefined;
};

/** One drone craft of the catalogue as a project. The craft itself stays in `src/content/drones`, named by `legacy.contentId`. */
export function convertCraft(item: DroneItem, texts: Texts, ctx: CraftContext): ConvertResult {
  const data = item.data;
  const id = ctx.projectId?.("drone", item.id, null) ?? `prj_drone-${item.id}`;
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
  const { guide, ext } = craftGuide(data, t);
  const palette = paletteOf(item);
  const title = english(data.title);
  const description = english(data.sub);
  if (missing.size > 0) {
    note("skipped", `${missing.size} text keys have no English text; each key is used as its own text`, [...missing].sort());
  }

  const project: Project = {
    format: "iynk.project",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    revision: 0,
    meta: {
      title,
      description,
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
    parameters: craftParameters(data.design),
    assets: [],
    dependencies: { components: [], libraries: [] },
    tests: [],
    guide,
    domains: { drone: craftDomain(data) },
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
        ...craftThirdParty(ctx.fixtureSources ?? []),
      ],
    },
    license: { spdx: "LicenseRef-iynk-pending" },
    ext: { ...ext, [LEGACY]: { fig: data.fig, ...(palette === undefined ? {} : { palette }) } },
  };
  return { project, report };
}

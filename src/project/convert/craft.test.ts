// @vitest-environment node
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { listItems, loadItem, loadTexts } from "../../../scripts/convert-io.mjs";
import type { Project } from "../generated/types.ts";
import { stateHash } from "../hash.ts";
import { toFileText } from "../normalize.ts";
import { validateText, validateValue } from "../validate.ts";
import { AT } from "./convert.testing.ts";
import { convertCraft } from "./craft.ts";
import type { ConvertContext, ConvertResult } from "./lesson.ts";
import type { CatalogueItem, Texts } from "./types.ts";

type DroneItem = CatalogueItem & { lab: "drone" };

const ctx: ConvertContext = { at: AT, version: "0.1.0", headers: [], legs: {}, params: {}, descriptors: new Set() };
const crafts = new Map<string, { item: DroneItem; texts: Texts; result: ConvertResult }>();

beforeAll(() => {
  for (const { lab, id } of listItems() as { lab: string; id: string }[]) {
    if (lab !== "drone") continue;
    const item = loadItem("drone", id) as DroneItem;
    const texts = loadTexts("drone", id) as Texts;
    crafts.set(id, { item, texts, result: convertCraft(item, texts, ctx) });
  }
});

const projects = (): Project[] => [...crafts.values()].map((c) => c.result.project);
const legacy = (project: Project): Record<string, unknown> => (project.ext as Record<string, Record<string, unknown>>)["x-iynk-legacy-craft"]!;

describe("the 13 converted crafts", () => {
  it("have distinct ids and the origin of their drone", () => {
    expect(crafts.size).toBe(13);
    for (const [id, { result }] of crafts) {
      expect(result.project.id).toBe(`prj_craft-${id}`);
      expect(result.project.meta.kind).toBe("craft");
      expect(result.project.guide?.kind).toBe("craft");
      expect(result.project.provenance.origin).toMatchObject({ kind: "migration", catalogue: { lab: "drone", id } });
    }
  });

  it("validate with no error, the drone domain data included", () => {
    for (const project of projects()) {
      const errors = validateValue(project).diagnostics.filter((d) => d.severity === "error");
      expect(errors.map((d) => `${project.id} ${d.code} ${d.path} ${d.message}`)).toEqual([]);
    }
  });

  it("have 173 build steps and 49 quizzes together", () => {
    expect(projects().reduce((n, p) => n + (p.guide?.assembly?.length ?? 0), 0)).toBe(173);
    expect(projects().reduce((n, p) => n + (p.guide?.quizzes?.length ?? 0), 0)).toBe(49);
  });

  it("keep the legacy model in the drone envelope and in ext", () => {
    for (const [id, { item, result }] of crafts) {
      const project = result.project;
      expect(project.nets, id).toEqual([]);
      expect(project.domains?.drone?.data).toMatchObject({
        kind: "legacy-craft",
        legacy: { contentId: id, calcModelId: "legacy-calc@1", flightModelId: "flight-game@1" },
        thrustSource: "legacy-calc",
        flight: { model: "flight-game@1" },
        course: { builtin: item.data.courses[0]!.id },
        bench: { propsOff: true },
      });
      expect(Object.keys(legacy(project)), id).toEqual(expect.arrayContaining(["frame", "design", "firmware", "flight", "courses"]));
      expect(legacy(project).courses).toHaveLength(item.data.courses.length);
    }
  });

  it("keep the build steps in the guide only", () => {
    for (const [id, { result }] of crafts) expect(legacy(result.project), id).not.toHaveProperty("build");
  });

  it("turn the quad5 craft into the race course with 12 build steps", () => {
    const { project } = crafts.get("quad5")!.result;
    expect(project.domains?.drone?.data).toMatchObject({ kind: "legacy-craft", course: { builtin: "race" } });
    expect(project.guide?.assembly).toHaveLength(12);
  });

  it("write every text in all six languages that the catalogue has", () => {
    const { project } = crafts.get("quad5")!.result;
    const title = project.guide?.title as Record<string, string>;
    expect(Object.keys(title).sort()).toEqual(["de", "en", "es", "fr", "hi", "zh"]);
    const design = legacy(project).design as { fixed: { name: { en: string } }[] };
    expect(design.fixed[0]!.name.en).not.toMatch(/^design\./);
  });

  it("round trip through the file text with the same state hash", () => {
    for (const project of projects()) {
      const report = validateText(toFileText(project));
      expect(report.ok, project.id).toBe(true);
      expect(stateHash(report.doc!), project.id).toBe(stateHash(project));
    }
  });

  it("convert to the same bytes twice", () => {
    for (const [id, { item, texts, result }] of [...crafts].slice(0, 3)) {
      expect(toFileText(convertCraft(item, texts, ctx).project), id).toBe(toFileText(result.project));
    }
  });

  it("report the third-party check and the data kept in ext for every craft", () => {
    for (const { result } of crafts.values()) {
      expect(result.report.map((r) => r.code)).toEqual(expect.arrayContaining(["third-party-unchecked", "skipped"]));
      expect(result.project.provenance.thirdParty?.[0]?.review).toBe("unchecked");
    }
  });
});

describe("the drone domain example", () => {
  it("uses the neutral environment the converter writes", () => {
    const example = JSON.parse(
      readFileSync(new URL("../../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/drone-quad.project.json", import.meta.url), "utf8"),
    ) as Project;
    expect(crafts.get("quad5")!.result.project.domains?.drone?.data.environment).toEqual(example.domains?.drone?.data.environment);
  });
});

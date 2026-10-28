// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { loadSources } from "../../../scripts/convert-catalogue.mjs";
import { builtinRegistry } from "../../parts/builtin.ts";
import { checkLibrary } from "../../parts/library-check.ts";
import { convertAll, manifestOf, renderReport } from "./index.ts";
import type { ConvertReport, ConvertSources, ConvertedProject } from "./index.ts";
import type { ConvertContext } from "./lesson.ts";
import type { CatalogueItem } from "./types.ts";

const SAMPLE = [
  { lab: "board", id: "uno-r3" },
  { lab: "robotics", id: "l298n" },
  { lab: "drone", id: "quad5" },
];

let items: CatalogueItem[];
let sources: ConvertSources;
let ctx: ConvertContext;
let projects: ConvertedProject[];
let report: ConvertReport;

beforeAll(async () => {
  const loaded = await loadSources(SAMPLE);
  items = loaded.items as CatalogueItem[];
  sources = loaded.sources as ConvertSources;
  ctx = loaded.ctx as ConvertContext;
  ({ projects, report } = convertAll(items, sources, ctx));
});

describe("convertAll on three items", () => {
  it("reports every item with its project count and status", () => {
    expect(report.items.map((i) => `${i.lab}/${i.id}`)).toEqual(["board/uno-r3", "robotics/l298n", "drone/quad5"]);
    const lessons = (items[0] as CatalogueItem & { lab: "board" }).data.lessons.length;
    const tasks = (items[1] as CatalogueItem & { lab: "robotics" }).data.tasks.length;
    expect(report.items.map((i) => i.projects)).toEqual([1 + lessons, 1 + tasks, 1]);
    expect(report.items.map((i) => i.status)).toEqual(["whole", "whole", "whole"]);
    expect(report.totals).toMatchObject({ items: 3, whole: 3, legacy: 0, failed: 0, projects: projects.length });
    expect(report.totals.withNets).toBeGreaterThan(0);
  });

  it("names the parts that have no descriptor", () => {
    expect(report.totals.noDescriptor).toContain("core.l298n");
    expect(report.totals.noDescriptor).toEqual([...report.totals.noDescriptor].sort());
  });

  it("gives every project a kind and the item it came from", () => {
    expect(new Set(projects.map((p) => p.kind))).toEqual(new Set(["tour", "lesson", "bench", "task", "craft"]));
    expect(new Set(projects.map((p) => p.id)).size).toBe(projects.length);
    for (const p of projects) expect(p.project.id).toBe(p.id);
  });

  it("has no V6-SURFACE-EMPTY error in any converted project", () => {
    const registry = builtinRegistry();
    for (const { project } of projects) {
      expect(checkLibrary(project, registry).filter((d) => d.code === "V6-SURFACE-EMPTY")).toEqual([]);
    }
  });
});

describe("status rules", () => {
  const only = (item: CatalogueItem): CatalogueItem[] => [item];

  it("marks an item legacy when its bench circuit does not resolve", () => {
    const broken: ConvertSources = { ...sources, bench: (id) => ({ ...sources.bench(id), circuit: "no-such-circuit" }) };
    const { report: r } = convertAll(only(items[1]!), broken, ctx);
    expect(r.items[0]!.status).toBe("legacy");
    expect(r.items[0]!.reasons.some((x) => x.code === "bench-circuit-unresolved")).toBe(true);
    expect(r.totals).toMatchObject({ whole: 0, legacy: 1, failed: 0 });
    expect(renderReport(r)).toContain("| robotics/l298n | legacy | bench-circuit-unresolved |");
  });

  it("marks an item failed when its conversion stops, and keeps the other items", () => {
    const broken: ConvertSources = {
      ...sources,
      texts: (lab, id) => {
        if (lab === "drone") throw new Error("no texts");
        return sources.texts(lab, id);
      },
    };
    const { report: r } = convertAll(items, broken, ctx);
    expect(r.items.map((i) => i.status)).toEqual(["whole", "whole", "failed"]);
    expect(r.items[2]!.reasons[0]!.message).toContain("no texts");
  });
});

describe("renderReport", () => {
  it("is plain markdown with no em dash and no banned word", () => {
    const text = renderReport(report);
    expect(text).toContain("# Catalogue conversion report");
    expect(text).toContain("| Items | 3 |");
    expect(text).toContain("## Parts with no descriptor");
    expect(text).not.toMatch(/—|–/);
    expect(text).not.toMatch(/validated|verified against hardware|credential|sponsor|Solana|Vercel/i);
  });
});

describe("manifestOf", () => {
  it("is sorted by id, stable and complete", () => {
    const manifest = manifestOf(projects);
    expect(manifest.map((m) => m.id)).toEqual(projects.map((p) => p.id).sort());
    expect(manifestOf([...projects].reverse())).toEqual(manifest);
    for (const m of manifest) {
      expect(m.stateHash).toMatch(/^[0-9a-f]{64}$/);
      expect(m.canonicalBytes).toBeGreaterThan(0);
      expect(m.warnings).toBe(0);
    }
  });
});

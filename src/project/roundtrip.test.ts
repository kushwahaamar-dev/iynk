// @vitest-environment node
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSources } from "../../scripts/convert-catalogue.mjs";
import { builtinRegistry } from "../parts/builtin.ts";
import { interfaceOf } from "../parts/pins.ts";
import { loadExample } from "./apply/fixtures.testing.ts";
import type { ExampleName } from "./apply/fixtures.testing.ts";
import { convertAll } from "./convert/index.ts";
import type { ConvertSources, ConvertedProject } from "./convert/index.ts";
import type { ConvertContext } from "./convert/lesson.ts";
import type { CatalogueItem } from "./convert/types.ts";
import type { Project } from "./generated/types.ts";
import { stateHash } from "./hash.ts";
import { netlist } from "./netlist.ts";
import { toFileText } from "./normalize.ts";
import { generateSession } from "./testing/generators.ts";
import { hashOf, newProject, openText, saveText, seededRandom } from "./testing/harness.ts";
import { validateText } from "./validate.ts";

const EXAMPLES = new URL("../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/", import.meta.url);
const NAMES: ExampleName[] = [
  "uno-blink-d12",
  "env-monitor-esp32",
  "lesson-uno-r3-button",
  "robot-line-follower",
  "drone-quad",
];

const SAMPLE = [
  { lab: "board", id: "uno-r3" },
  { lab: "robotics", id: "l298n" },
  { lab: "drone", id: "quad5" },
];

/** Save, open, save, open: the text does not move after the first save and the hash never changes. */
function roundTrip(text: string, project: Project): string[] {
  const problems: string[] = [];
  const report = validateText(text);
  if (!report.ok || report.warnings > 0) problems.push(`validateText: ${JSON.stringify(report.first20)}`);
  const hash = stateHash(project);

  const first = openText(text);
  if (!first.ok) return [...problems, `openText: ${JSON.stringify(first.error.slice(0, 3))}`];
  if (hashOf(first.value) !== hash) problems.push("hash changed on open");
  const saved = saveText(first.value);
  if (saved !== text) problems.push("save is not the text that was opened");

  const second = openText(saved);
  if (!second.ok) return [...problems, "the saved text does not open"];
  if (hashOf(second.value) !== hash) problems.push("hash changed on the second open");
  if (saveText(second.value) !== saved) problems.push("save is not a fixed point");

  if (!Array.isArray(netlist(second.value.state).nodes)) problems.push("netlist did not compute");
  return problems;
}

describe.each(NAMES)("example %s", (name) => {
  const text = readFileSync(new URL(`${name}.project.json`, EXAMPLES), "utf8");

  it("is in the writer's form and round trips", () => {
    const project = loadExample(name);
    expect(toFileText(project)).toBe(text);
    expect(roundTrip(text, project)).toEqual([]);
  });
});

describe("harness projects", () => {
  const uno = builtinRegistry().get("core.uno-r3", "1.0.0")!;
  const blink = loadExample("uno-blink-d12").sources[0]!.content;
  const fresh = newProject({
    title: "Round trip",
    board: interfaceOf(uno),
    blink,
    at: "2026-10-28T12:00:00.000Z",
    rnd: seededRandom(1),
  });

  it("a new project is valid, round trips and keeps the sketch", () => {
    expect(fresh.sources[0]!.content).toBe(blink);
    expect(validateText(toFileText(fresh)).diagnostics).toEqual([]);
    expect(roundTrip(toFileText(fresh), fresh)).toEqual([]);
  });

  it("a generated session round trips with its log", () => {
    const { live } = generateSession(4, 200);
    const text = saveText(live);
    expect(roundTrip(text, live.state)).toEqual([]);
    expect(live.state.history.ops.length).toBeGreaterThan(100);
  });
});

describe("corpus sample", () => {
  let projects: ConvertedProject[];

  beforeAll(async () => {
    const loaded = await loadSources(SAMPLE);
    const converted = convertAll(
      loaded.items as CatalogueItem[],
      loaded.sources as ConvertSources,
      loaded.ctx as ConvertContext,
    );
    projects = converted.projects;
  });

  it("converts every project of board/uno-r3, robotics/l298n and drone/quad5 and round trips each", () => {
    expect(projects.length).toBeGreaterThan(3);
    const problems = projects.flatMap(({ id, project }) =>
      roundTrip(toFileText(project), project).map((problem) => `${id}: ${problem}`),
    );
    expect(problems).toEqual([]);
  });
});

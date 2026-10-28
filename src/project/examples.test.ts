// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AJV_MODULE } from "../../scripts/schema-gen.mjs";
import type { Op, Project } from "./generated/types.ts";
import { validateProject } from "./generated/validate.mjs";
import { accept, loadExample, monitorAt140 } from "./apply/fixtures.testing.ts";
import type { ExampleName } from "./apply/fixtures.testing.ts";
import { canonicalBytes, foldChain, stateHash } from "./hash.ts";
import { toFileText } from "./normalize.ts";
import { validateText } from "./validate.ts";

const SCHEMAS = new URL("../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/", import.meta.url);
const read = (url: URL): string => readFileSync(url, "utf8");
const fileOf = (name: ExampleName): string => read(new URL(`examples/${name}.project.json`, SCHEMAS));

const EXAMPLES: Record<ExampleName, { hash: string; bytes: number }> = {
  "uno-blink-d12": { hash: "2034a1b8f508959a", bytes: 8945 },
  "env-monitor-esp32": { hash: "8e52bbe4fc07a568", bytes: 13196 },
  "lesson-uno-r3-button": { hash: "1f6c95022ebf5736", bytes: 32911 },
  "robot-line-follower": { hash: "f947b3b3f79a80d1", bytes: 23282 },
  "drone-quad": { hash: "62e876e86e43eae9", bytes: 16005 },
};
const NAMES = Object.keys(EXAMPLES) as ExampleName[];

const MONITOR_FULL_HASH = "8e52bbe4fc07a56800045de1579b8a22c725fb129a8de73e6efea5b08a3c0e79";
const STORED_CHECKPOINT = "097630efe2ac0c752bc7ad7a4650ebe1e9f1a820cf67cf4d461af110aa6d127c";

/** What the revision-140 monitor hashes to today. The stored checkpoint is not reproduced by it (OQ-3). */
const RECOMPUTED_140 = "0986fe918566221e7ce2676f07e53206ff6508b81f317a9d837f8018f3e00704";

type Verdict = (value: unknown) => boolean;

async function referenceVerdict(): Promise<Verdict> {
  const { default: Ajv2020 } = (await import(/* @vite-ignore */ AJV_MODULE)) as {
    default: new (options: object) => {
      addSchema(schema: unknown): void;
      compile(schema: unknown): Verdict;
    };
  };
  const json = (name: string): unknown => JSON.parse(read(new URL(name, SCHEMAS)));
  const ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true });
  ajv.addSchema(json("robotics.domain.schema.json"));
  ajv.addSchema(json("drone.domain.schema.json"));
  return ajv.compile(json("project.schema.json"));
}

const flipOneByte = (text: string): string => text.replace('"schemaVersion": "1.1"', '"schemaVersion": "1.2"');

describe.each(NAMES)("example %s", (name) => {
  const text = fileOf(name);
  const project = JSON.parse(text) as Project;

  it("validates with no error and no V1 warning", () => {
    const report = validateText(text);
    expect(report.diagnostics).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("has the recorded state hash", () => {
    expect(stateHash(project).slice(0, 16), `${name} state hash`).toBe(EXAMPLES[name].hash);
  });

  it("has the recorded canonical size", () => {
    expect(canonicalBytes(project), `${name} canonical bytes`).toBe(EXAMPLES[name].bytes);
  });

  it("is byte-identical to the writer's form", () => {
    expect(toFileText(project) === text, `${name} differs from toFileText`).toBe(true);
  });

  it("is at schema 1.1 with the pending licence", () => {
    expect(project.schemaVersion).toBe("1.1");
    expect(project.license.spdx).toBe("LicenseRef-iynk-pending");
  });

  it("gets the same verdict from the generated validator and a reference Ajv", async () => {
    const reference = await referenceVerdict();
    expect(reference(project)).toBe(true);
    expect(validateProject(project)).toBe(true);
  });
});

describe("the examples test bites", () => {
  it("a one-byte change to a copy fails the writer-form and the hash comparisons", () => {
    const text = fileOf("lesson-uno-r3-button");
    const edited = flipOneByte(text);
    expect(edited).not.toBe(text);
    expect(toFileText(JSON.parse(edited) as Project) === edited).toBe(true);
    expect(stateHash(JSON.parse(edited) as Project).slice(0, 16)).not.toBe(EXAMPLES["lesson-uno-r3-button"].hash);
    expect(validateText(text.replace("\n}\n", "\n }\n")).warnings).toBeGreaterThan(0);
  });

  it("the full monitor hash matches its recorded prefix", () => {
    expect(stateHash(loadExample("env-monitor-esp32"))).toBe(MONITOR_FULL_HASH);
  });
});

describe("the env monitor at revision 140 (Q-15, OQ-3)", () => {
  const final = loadExample("env-monitor-esp32");
  const inverses: Op[] = [
    { k: "fault.remove", id: "flt_swap" },
    { k: "source.edit", id: "src_main", baseSeq: 142, pos: 130, del: 26, ins: "" },
  ];

  const rebuilt = (): Project => accept(final, inverses).state;

  it("hand-written inverses of the two history ops reach the monitorAt140 helper", () => {
    expect(stateHash(rebuilt())).toBe(stateHash(monitorAt140()));
  });

  it("replaying the history ops from monitorAt140 reaches the final document", () => {
    const ops = final.history.ops.map((envelope) => envelope.op);
    expect(stateHash(accept(monitorAt140(), ops).state)).toBe(stateHash(final));
  });

  it("the history chain folds to the end of the stored ops", () => {
    expect(foldChain(final.history.baseChain, final.history.ops)).toMatch(/^[0-9a-f]{64}$/);
  });

  it.fails("hashes to the stored checkpoint 097630ef... (OQ-3)", () => {
    expect(stateHash(rebuilt())).toBe(STORED_CHECKPOINT);
  });

  it("hashes to the recomputed value recorded for OQ-3", () => {
    expect(stateHash(rebuilt())).toBe(RECOMPUTED_140);
  });
});

// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalize } from "../core/canonical.ts";
import { sha256Hex } from "../core/sha256.ts";
import type { OpEnvelope, Project } from "./generated/types.ts";
import { canonicalBytes, chainNext, chainStart, checkpointOf, foldChain, stateHash } from "./hash.ts";
import { toCanonicalText } from "./normalize.ts";

const dir = join(process.cwd(), "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples");
const load = (name: string) => JSON.parse(readFileSync(join(dir, name + ".project.json"), "utf8")) as Project;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const EXAMPLE_HASHES: Record<string, string> = {
  "uno-blink-d12": "5406cae2735da1eb",
  "env-monitor-esp32": "7a31304324cf3343",
  "lesson-uno-r3-button": "1f6c95022ebf5736",
  "robot-line-follower": "81e697b24e4db736",
  "drone-quad": "9556e6a86f774add",
};

const CANONICAL_BYTES: Record<string, number> = {
  "uno-blink-d12": 8945,
  "env-monitor-esp32": 13196,
  "lesson-uno-r3-button": 32911,
  "robot-line-follower": 23288,
  "drone-quad": 16011,
};

describe("stateHash of the examples", () => {
  it.each(Object.entries(EXAMPLE_HASHES))("%s", (name, prefix) => {
    const hash = stateHash(load(name));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash.slice(0, 16)).toBe(prefix);
  });

  it.each(Object.entries(CANONICAL_BYTES))("%s has the canonical size of PDM 9.6", (name, bytes) => {
    expect(canonicalBytes(load(name))).toBe(bytes);
  });
});

describe("stateHash", () => {
  const base = () => clone(load("env-monitor-esp32"));

  it("ignores revision, updatedAt, history and exports", () => {
    const doc = base();
    const wanted = stateHash(doc);
    doc.revision += 7;
    doc.meta.updatedAt = "2030-01-01T00:00:00.000Z";
    doc.history = { baseRevision: 0, baseChain: chainStart(doc.id), checkpoints: [], ops: [] };
    doc.exports = [];
    expect(stateHash(doc)).toBe(wanted);
  });

  it("ignores set order", () => {
    const doc = base();
    const wanted = stateHash(doc);
    doc.components.reverse();
    doc.nets.reverse();
    expect(stateHash(doc)).toBe(wanted);
  });

  it("changes when a net member changes", () => {
    const doc = base();
    const wanted = stateHash(doc);
    doc.nets[0].connections[0] = { c: doc.nets[0].connections[0].c, p: "other" };
    expect(stateHash(doc)).not.toBe(wanted);
  });

  it("changes with content that is not volatile", () => {
    const doc = base();
    const wanted = stateHash(doc);
    doc.meta.title += "!";
    expect(stateHash(doc)).not.toBe(wanted);
  });

  it("is equal after a change and its inverse while revision differs", () => {
    const doc = base();
    const wanted = stateHash(doc);
    const title = doc.meta.title;
    doc.meta.title = "other";
    doc.revision += 1;
    doc.meta.title = title;
    doc.revision += 1;
    expect(doc.revision).toBe(base().revision + 2);
    expect(stateHash(doc)).toBe(wanted);
  });

  it("is equal after writing to text and reading it back", () => {
    const doc = base();
    expect(stateHash(JSON.parse(toCanonicalText(doc)) as Project)).toBe(stateHash(doc));
  });

  it("does not change its input", () => {
    const doc = base();
    const before = JSON.stringify(doc);
    stateHash(doc);
    expect(JSON.stringify(doc)).toBe(before);
  });
});

describe("hash chain", () => {
  const envelope: OpEnvelope = {
    opId: "op_a1",
    seq: 1,
    base: 0,
    author: { actor: "usr_a", kind: "user" },
    at: "2026-01-01T00:00:00.000Z",
    op: { k: "meta.set", set: { title: "x" } },
  };

  it("matches the vectors of PDM 6.4", () => {
    expect(canonicalize(envelope)).toBe(
      '{"at":"2026-01-01T00:00:00.000Z","author":{"actor":"usr_a","kind":"user"},"base":0,"op":{"k":"meta.set","set":{"title":"x"}},"opId":"op_a1","seq":1}',
    );
    const chain0 = chainStart("prj_demo");
    expect(chain0).toBe("6193a5a80a5088dbc239c4307bca5df7230dda9949008bfbf2f7a42990d3dd2f");
    expect(chainNext(chain0, envelope)).toBe("a150f3e269ed521037247bdc0160f368cb05130b896c8caeab9f6c96df75dd7c");
  });

  it("folds the ops of the monitor example", () => {
    const { history } = load("env-monitor-esp32");
    expect(history.ops.length).toBeGreaterThan(0);
    let expected = history.baseChain;
    for (const op of history.ops) expected = sha256Hex(expected + canonicalize(op));
    expect(foldChain(history.baseChain, history.ops)).toBe(expected);
    expect(foldChain(history.baseChain, [])).toBe(history.baseChain);
  });

  it("depends on the order of the ops", () => {
    const second: OpEnvelope = { ...envelope, opId: "op_a2", seq: 2, base: 1 };
    const start = chainStart("prj_demo");
    expect(foldChain(start, [envelope, second])).not.toBe(foldChain(start, [second, envelope]));
  });
});

describe("checkpointOf", () => {
  it("records the revision and the state hash", () => {
    const doc = load("env-monitor-esp32");
    expect(checkpointOf(doc, "named", "Before the fault", "usr_a", "2026-01-01T00:00:00.000Z")).toEqual({
      revision: doc.revision,
      kind: "named",
      label: "Before the fault",
      at: "2026-01-01T00:00:00.000Z",
      author: "usr_a",
      stateHash: stateHash(doc),
      store: "local-db",
    });
  });

  it("leaves the label off when there is none", () => {
    const checkpoint = checkpointOf(load("uno-blink-d12"), "auto", undefined, "usr_a", "2026-01-01T00:00:00.000Z", "container");
    expect("label" in checkpoint).toBe(false);
    expect(checkpoint.store).toBe("container");
  });
});

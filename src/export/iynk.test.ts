// @vitest-environment node
import { describe, expect, it } from "vitest";
import { utf8Encode } from "../core/canonical.ts";
import { LIMITS } from "../core/limits.ts";
import type { Project } from "../project/generated/types.ts";
import { stateHash } from "../project/hash.ts";
import { loadExample } from "../project/apply/fixtures.testing.ts";
import type { ExampleName } from "../project/apply/fixtures.testing.ts";
import { generateSession } from "../project/testing/generators.ts";
import { bigProject } from "../project/testing/generators.ts";
import { readIynk, secretWarnings, writeIynk } from "./iynk.ts";
import { utf8Decode } from "./zip.ts";

const NAMES: ExampleName[] = [
  "uno-blink-d12",
  "env-monitor-esp32",
  "lesson-uno-r3-button",
  "robot-line-follower",
  "drone-quad",
];
const clock = () => Date.UTC(2026, 9, 28);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const textOf = (bytes: Uint8Array): string => utf8Decode(bytes) as string;
const edited = (doc: Project, change: (envelope: Record<string, unknown>) => void): Uint8Array => {
  const envelope = JSON.parse(textOf(writeIynk(doc))) as Record<string, unknown>;
  change(envelope);
  return utf8Encode(JSON.stringify(envelope));
};

describe("round trip", () => {
  it.each(NAMES)("%s keeps its hash", (name) => {
    const doc = loadExample(name);
    const report = readIynk(writeIynk(doc), clock);
    expect(report.ok).toBe(true);
    if (!report.ok) return;
    expect(stateHash(report.project)).toBe(stateHash(doc));
    expect(report.hash).toBe(stateHash(doc));
    expect(report.hashMatches).toBe(true);
    expect(report.warnings).toEqual([]);
  });

  it("keeps the hash of 20 generated documents", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const doc = generateSession(seed, 60).live.state;
      const report = readIynk(writeIynk(doc), clock);
      expect(report.ok, `seed ${seed}`).toBe(true);
      if (report.ok) expect(stateHash(report.project)).toBe(stateHash(doc));
    }
  });

  it("writes the same bytes twice and ends with one line feed", () => {
    const doc = loadExample("env-monitor-esp32");
    const first = writeIynk(doc);
    expect(writeIynk(doc)).toEqual(first);
    const text = textOf(first);
    expect(text.endsWith("}\n")).toBe(true);
    expect(text.includes("\r")).toBe(false);
  });

  it("writes 500 parts in under 15 ms", () => {
    const doc = bigProject(500, 500, 3);
    const times = Array.from({ length: 5 }, () => {
      const start = performance.now();
      writeIynk(doc);
      return performance.now() - start;
    });
    const ms = Math.min(...times);
    console.log(`writeIynk, 500 parts: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(15);
  });
});

describe("warnings", () => {
  it("reports a hash mismatch and still opens the project", () => {
    const doc = loadExample("uno-blink-d12");
    const report = readIynk(edited(doc, (e) => (e.hash = "0".repeat(64))), clock);
    expect(report.ok).toBe(true);
    if (!report.ok) return;
    expect(report.hashMatches).toBe(false);
    expect(report.hash).toBe(stateHash(doc));
    expect(report.warnings.map((w) => w.code)).toContain("FILE-HASH-MISMATCH");
  });

  it("opens a file with CRLF line ends", () => {
    const doc = loadExample("uno-blink-d12");
    const crlf = utf8Encode(textOf(writeIynk(doc)).replace(/\n/g, "\r\n"));
    const report = readIynk(crlf, clock);
    expect(report.ok && report.hashMatches).toBe(true);
  });

  it("warns about secret-shaped text before a write", () => {
    const doc = clone(loadExample("uno-blink-d12"));
    expect(secretWarnings(doc)).toEqual([]);
    const source = doc.sources[0];
    source.content += '\nconst char *k = "sk-abcdefghijklmnopqrstuvwxyz0123";\n';
    source.content += '// AIzaSyA1234567890abcdefghijklmnopqrstuvw\n// -----BEGIN PRIVATE KEY-----\n';
    const found = secretWarnings(doc);
    expect(found).toHaveLength(3);
    expect(found.every((d) => d.severity === "warning")).toBe(true);
  });
});

describe("refusals", () => {
  const doc = loadExample("uno-blink-d12");
  const good = textOf(writeIynk(doc));
  const refused = (bytes: Uint8Array) => {
    const report = readIynk(bytes, clock);
    if (report.ok) throw new Error("the file was accepted");
    return report.error;
  };

  it("too-large names the limit", () => {
    const error = refused(new Uint8Array(LIMITS.canonicalBytes + 1));
    expect(error.kind).toBe("too-large");
    expect(error.limit).toBe("5 MiB");
  });

  it.each([
    ["empty file", ""],
    ["not JSON", "hello"],
    ["a byte order mark", "﻿" + good],
  ])("bad-json: %s", (_, text) => {
    expect(refused(utf8Encode(text)).kind).toBe("bad-json");
  });

  it("bad-json: invalid UTF-8", () => {
    expect(refused(new Uint8Array([0x7b, 0xc3, 0x28, 0x7d])).kind).toBe("bad-json");
  });

  it("duplicate-key", () => {
    const error = refused(utf8Encode('{"format":"iynk.file","format":"iynk.file"}'));
    expect(error.kind).toBe("duplicate-key");
  });

  it("too-deep", () => {
    const error = refused(utf8Encode("[".repeat(40) + "]".repeat(40)));
    expect(error.kind).toBe("too-deep");
    expect(error.limit).toBe("32 levels");
  });

  it.each([
    ["an array", () => utf8Encode("[]")],
    ["another format", () => edited(doc, (e) => (e.format = "iynk.project"))],
    ["an extra field", () => edited(doc, (e) => (e.extra = 1))],
    ["a missing hash", () => edited(doc, (e) => delete e.hash)],
    ["a short hash", () => edited(doc, (e) => (e.hash = "abc"))],
    ["version 2", () => edited(doc, (e) => (e.version = 2))],
    ["no project", () => edited(doc, (e) => (e.project = null))],
  ])("bad-envelope: %s", (_, make) => {
    expect(refused(make()).kind).toBe("bad-envelope");
  });

  it("newer-schema hands the bytes back unopened", () => {
    const error = refused(edited(doc, (e) => ((e.project as Record<string, unknown>).schemaVersion = "2.0")));
    expect(error.kind).toBe("newer-schema");
    expect(error.message).toContain("2.0");
  });

  it("invalid", () => {
    const error = refused(edited(doc, (e) => ((e.project as { meta: Record<string, unknown> }).meta.kind = 5)));
    expect(error.kind).toBe("invalid");
    expect(error.path).toContain("/meta/kind");
  });
});

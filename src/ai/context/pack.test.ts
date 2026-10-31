// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../../core/sha256.ts";
import type { Project } from "../../project/generated/types.ts";
import { payloadGenerator } from "../testing/payloads.ts";
import { PackTooLarge, estimateTokens } from "./budget.ts";
import { containsFence } from "./fences.ts";
import { buildPack, buildPackYielding, sameBytes } from "./pack.ts";
import { blink2, packInput, scene } from "./pack.testing.ts";

const golden = readFileSync(new URL("./__golden__/blink2.pack.txt", import.meta.url), "utf8");

function withTexts(text: string): Project {
  const doc = blink2();
  return {
    ...doc,
    meta: { ...doc.meta, title: text, description: text },
    components: doc.components.map((c, i) => (i === 0 ? { ...c, label: text, params: { ...c.params, note: text } } : c)),
    nets: doc.nets.map((n) => ({ ...n, name: text })),
    sources: doc.sources.map((s) => ({ ...s, content: `// ${text}\n${s.content}` })),
  };
}

describe("buildPack", () => {
  it("builds the same stable part and hash for the same state, and matches the golden file", () => {
    const a = buildPack(packInput());
    const b = buildPack(packInput({}, { nonce: "ZZZZZZZZ" }));
    expect(b.stable).toBe(a.stable);
    expect(b.stableHash).toBe(a.stableHash);
    expect(a.text).toBe(golden);
    expect(a.stableHash).toBe(sha256Hex(a.stable));
    expect(a.text.startsWith(a.stable)).toBe(true);
  });

  it("keeps nonce, revision and state hash after [VOLATILE]", () => {
    const pack = buildPack(packInput());
    expect(pack.stable).not.toMatch(/K7QX2LM9|rev=142|9f2c41ab/);
    expect(pack.text).toContain("[VOLATILE] nonce=K7QX2LM9 rev=142 hash=9f2c41ab");
    expect(pack.stable).not.toContain("[VOLATILE]");
  });

  it("sameBytes is true for the request built from the pack, and hash8 is its SHA-256 prefix", () => {
    const pack = buildPack(packInput());
    expect(sameBytes(pack, pack.text)).toBe(true);
    expect(sameBytes(pack, `${pack.text} `)).toBe(false);
    expect(pack.hash8).toBe(sha256Hex(pack.text).slice(0, 8));
  });

  it("builds the empty project and a project without a board", () => {
    const doc = { ...blink2(), components: [], nets: [], sources: [], boards: [], tests: [] };
    const pack = buildPack(packInput({ doc }));
    expect(pack.text).toContain("[COMPONENTS] id definition refdes params\n-");
    expect(pack.text).toContain("[BOARDS] id definition refdes engine\n-");
    expect(pack.text).not.toContain("[CODE");
  });

  it("fits the 500-part scene in the standard budget", () => {
    const doc = scene(500, 1000);
    const pack = buildPack(packInput({ doc, selection: [doc.components[0]!.id] }));
    expect(pack.tokensEst).toBeLessThanOrEqual(24_000);
  });

  it("falls back to an outline plus the neighbourhood of the selection for a scene that does not fit", () => {
    const doc = scene(1500, 3000);
    const pack = buildPack(packInput({ doc, selection: [doc.components[0]!.id] }));
    expect(pack.tokensEst).toBeLessThanOrEqual(24_000);
    expect(pack.level).not.toBe("D2");
    expect(pack.evicted).toContain("digest-D1");
    expect(pack.text).toContain("near:");
  });

  it("names a selection of 100 ids by count after the first 20", () => {
    const doc = scene(150, 150);
    const pack = buildPack(packInput({ doc, selection: doc.components.slice(0, 100).map((c) => c.id) }));
    expect(pack.text).toContain("[SELECTION] 100 selected:");
    expect(pack.text).toContain("(+80 more)");
  });

  it("drops selection ids that are not in the document", () => {
    const pack = buildPack(packInput({ selection: ["cmp_ghost", "cmp_d1"] }));
    expect(pack.text).toContain("[SELECTION] 1 selected: cmp_d1");
  });

  it("copes with a title of 8,000 characters and with Hindi text", () => {
    const doc = blink2();
    const long = { ...doc, meta: { ...doc.meta, title: "ब".repeat(8000) } };
    const pack = buildPack(packInput({ doc: long }));
    const line = pack.text.split("\n").find((l) => l.startsWith("[PROJECT]"))!;
    expect(line.length).toBeLessThan(260);
  });
});

describe("payload handling", () => {
  it("puts no payload text outside a quoted or fenced field, and no fence in the stable part", () => {
    const next = payloadGenerator(11);
    for (let i = 0; i < 200; i++) {
      const text = next();
      const doc = withTexts(text);
      const pack = buildPack(packInput({ doc, selection: ["cmp_d1"] }, { userMessage: "hi", thread: { summary: text, turns: [{ role: "user", text }] } }));
      expect(containsFence(pack.stable)).toBe(false);
      const known = new Set([...doc.components, ...doc.boards, ...doc.nets, ...doc.sources, ...doc.tests].map((x) => x.id));
      const dataLines = pack.text.split("\n").filter((l) => /^(cmp|net|brd|src)_/.test(l));
      for (const l of dataLines) expect(known.has(l.split(/[\s.:]/)[0]!)).toBe(true);
      const starts = pack.text.split("\n").filter((l) => l.startsWith("[") && !l.startsWith("[redacted"));
      for (const l of starts) expect(l).toMatch(/^\[(PROJECT|BOARDS|COMPONENTS|NETS|SOURCES|TESTS|VOLATILE|SIM|RUN|DIAG|CODE [^\]]+|SELECTION|HISTORY|MESSAGE)\]/);
    }
  });

  it("shows invisible characters as escapes", () => {
    const pack = buildPack(packInput({ doc: withTexts("a‮b") }));
    expect(pack.text).toContain("a\\u{202E}b");
    expect(pack.text).not.toContain("‮");
  });

  it("replaces secrets in source comments and in the message, and counts them", () => {
    const doc = blink2();
    const key = `sk-${"a1B2".repeat(8)}`;
    const marked = { ...doc, sources: [{ ...doc.sources[0]!, content: `// key ${key}\nWiFi.begin("home", "hunter2");\n${doc.sources[0]!.content}` }] };
    const pack = buildPack(packInput({ doc: marked }, { userMessage: `my key is ${key}` }));
    expect(pack.text).not.toContain(key);
    expect(pack.text).not.toContain("hunter2");
    expect(pack.redactions).toBe(3);
  });
});

describe("hidden data", () => {
  const doc = (): Project => {
    const d = blink2();
    return {
      ...d,
      simulation: {
        ...d.simulation,
        faults: [{ id: "flt_secret", cause_id: "reverse-led", symptom_ids: [], kind: "reversed-part", target: { component: "cmp_d1" } as never, enabled: true, note: "the LED is backwards" }],
      },
      tests: [
        {
          id: "tst_one",
          name: "Blinks",
          runMs: 2000,
          checks: [
            { kind: "runs", id: "chk_vis", label: "Runs", minMs: 1000 },
            { kind: "runs", id: "chk_hid", label: "Secret check", visibility: "hidden", minMs: 1500 },
          ],
        },
      ],
    };
  };

  it("never mentions a fault, and counts hidden checks only", () => {
    const pack = buildPack(packInput({ doc: doc() }));
    for (const word of ["flt_secret", "reverse-led", "backwards", "chk_hid", "Secret check"]) expect(pack.text).not.toContain(word);
    expect(pack.text).toContain("hidden=1");
    expect(pack.text).toContain("chk_vis");
  });

  const diagnosis = (hint_level: 0 | 1 | 2 | 3) => ({
    cause_id: "led-reversed",
    symptom_id: "led-dark",
    evidence: [],
    hint_level,
  });

  it("hides the cause below hint level 3 and while a sealed item is unrevealed", () => {
    expect(buildPack(packInput({ diagnoses: [diagnosis(2)] })).text).not.toContain("led-reversed");
    expect(buildPack(packInput({ diagnoses: [diagnosis(3)], itemState: { itemId: "itm_1", phase: "sealed" } })).text).not.toContain("led-reversed");
    expect(buildPack(packInput({ diagnoses: [diagnosis(3)] })).text).toContain("cause=led-reversed");
    expect(buildPack(packInput({ diagnoses: [diagnosis(3)], itemState: { itemId: "itm_1", phase: "revealed" } })).text).toContain("cause=led-reversed");
  });
});

describe("budget", () => {
  const turns = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? ("assistant" as const) : ("user" as const), text: `turn ${i} ${"word ".repeat(40)}` }));

  it("evicts in the documented order and records it", () => {
    const doc = scene(300, 300);
    const base = packInput({ doc }, { thread: { summary: "so far", turns } });
    const full = buildPack({ ...base, profile: "extended" });
    expect(full.evicted).toEqual([]);
    expect(full.text).toContain("turn 0");

    const tight = buildPack({ ...base, profile: "compact" });
    expect(tight.evicted[0]).toBe("history");
    expect(tight.text).not.toContain("turn 0 ");
    expect(tight.text).toContain("turn 11");
    expect(tight.text).toContain("so far");
    const order = ["history", "code-window-40", "code-window-20", "serial-lines", "digest-D1", "digest-D0"];
    expect(tight.evicted).toEqual(order.slice(0, tight.evicted.length));
  });

  it("throws PackTooLarge when nothing more can go, and never cuts the message", () => {
    const doc = scene(300, 300);
    expect(() => buildPack(packInput({ doc }, { profile: "compact", correction: 40 }))).toThrow(PackTooLarge);
    const kept = buildPack(packInput({ doc }, { profile: "compact", userMessage: "why does D12 read 0" }));
    expect(kept.text).toContain("why does D12 read 0");
    expect(kept.tokensEst).toBeLessThanOrEqual(8000);
  });

  it("reports a per-source token table that adds up", () => {
    const pack = buildPack(packInput());
    const sum = pack.sections.reduce((n, s) => n + s.tokens, 0);
    expect(sum).toBeLessThanOrEqual(pack.tokensEst);
    expect(pack.sections.find((s) => s.id === "S3")?.included).toBe(true);
    expect(pack.sections.find((s) => s.id === "S10")?.included).toBe(false);
    expect(estimateTokens(pack.text, 1)).toBeGreaterThan(0);
  });

  it("leaves out a toggled-off source", () => {
    const pack = buildPack(packInput({}, { toggles: { S4: false, S99: false } as never }));
    expect(pack.text).not.toContain("[CODE");
    expect(pack.text).not.toContain("[SOURCES]");
    expect(pack.text).toContain("[NETS]");
  });
});

describe("code windows", () => {
  const long = Array.from({ length: 400 }, (_, i) => `line ${i + 1} ${"x".repeat(20)}`).join("\n");
  const doc = (): Project => ({ ...blink2(), sources: [{ ...blink2().sources[0]!, content: long }] });

  it("opens on the first lines without an error, and around the newest error line with one", () => {
    const first = buildPack(packInput({ doc: doc() }));
    expect(first.text).toContain("[CODE main.ino 1-80]");
    const run = {
      phase: "error" as const,
      stale: false,
      tNs: 0,
      readings: [],
      pins: [],
      serial: [],
      diagnostics: [{ message: "bad", file: "main.ino", line: 200 }],
      solver: null,
    };
    const near = buildPack(packInput({ doc: doc(), run }));
    expect(near.text).toContain("[CODE main.ino 160-239]");
    expect(near.text).toContain("200| line 200 x");
  });
});

describe("buildPackYielding", () => {
  it("makes the same bytes and yields between sections", async () => {
    let yields = 0;
    const input = packInput({ doc: scene(50, 50) });
    const pack = await buildPackYielding(input, async () => void yields++);
    expect(pack.text).toBe(buildPack(input).text);
    expect(yields).toBeGreaterThanOrEqual(9);
  });
});

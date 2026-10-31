// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import type { Descriptor } from "../../parts/descriptor.ts";
import { DRAFT_LIMITS, draftFromDescriptor, draftIssues, newDraft, reduceDraft, slugFor, toDescriptor } from "./draft.ts";
import type { DraftAction, PartDraft } from "./draft.ts";

const NOW = "2026-10-31T10:00:00Z";
const dataDir = new URL("../../parts/data/", import.meta.url);
const examples = readdirSync(dataDir)
  .filter((name) => name.endsWith(".component.json"))
  .map((name) => JSON.parse(readFileSync(new URL(name, dataDir), "utf8")) as Descriptor);
const ctx = { installed: new Map<string, string>(), existingKeys: new Set<string>() };

const run = (start: PartDraft, ...actions: DraftAction[]): PartDraft => actions.reduce(reduceDraft, start);
const errors = (s: PartDraft) => draftIssues(s, ctx).filter((i) => i.severity === "error");

function twoPinPart(name = "Pulse stretcher"): PartDraft {
  const slug = slugFor(name, new Set());
  return run(
    newDraft(NOW),
    { type: "setField", field: "name", value: name },
    { type: "setField", field: "slug", value: slug },
    { type: "addPin" },
    { type: "addPin" },
  );
}

const runnableLayer = {
  id: "main",
  domain: "analog",
  reads: ["P1", "P2"],
  summary: { en: "A fixed resistance." },
  model: {
    kind: "element",
    element: "res",
    terminals: { a: "P1", b: "P2" },
    params: { ohms: { value: 100, unit: "ohm", rationale: { en: "Chosen by the person who made the part." } } },
  },
};

const runnablePatch = (status: "partly-modelled" | "not-modelled-yet", tier: "T1" | "none"): DraftAction => ({
  type: "applyPatch",
  patch: {
    layers: [runnableLayer],
    simulation: {
      tier,
      status,
      whatItModels: ["A fixed resistance between the two pins."],
      notModelled: ["Everything this form does not set"],
      knownGaps: [],
      solverRequires: ["res"],
    },
    tests: [{ id: "dc_100", kind: "golden-trace", file: "tests/dc_100.json" }],
  },
});

describe("round trip", () => {
  it("covers the nine examples", () => expect(examples).toHaveLength(9));

  it.each(examples.map((d) => [d.id, d] as const))("%s comes back equal", (_id, d) => {
    expect(toDescriptor(draftFromDescriptor(d), NOW)).toEqual(d);
  });

  it.each(examples.map((d) => [d.id, d] as const))("%s survives the JSON view and back", (_id, d) => {
    const there = run(draftFromDescriptor(d), { type: "switchMode", mode: "json" });
    expect(JSON.parse(there.rawJson ?? "")).toEqual(d);
    const back = run(there, { type: "switchMode", mode: "form" });
    expect(back.mode).toBe("form");
    expect(toDescriptor(back, NOW)).toEqual(d);
  });

  it("carries protocols, failure modes and x_ keys through", () => {
    for (const key of ["protocols", "failure_modes"]) {
      const d = structuredClone(examples.find((e) => e[key] !== undefined)!);
      const draft = draftFromDescriptor(d);
      expect(draft.extra).toHaveProperty(key);
      expect(toDescriptor(draft, NOW)).toEqual(d);
    }
    const custom = { ...structuredClone(examples[0]), x_note: { a: 1 } } as Descriptor;
    const draft = draftFromDescriptor(custom);
    expect(draft.extra).toHaveProperty("x_note");
    expect(draft.extra).not.toHaveProperty("pins");
    expect(toDescriptor(draft, NOW)).toEqual(custom);
  });

  it("keeps the other languages of a text and of a pin name", () => {
    const d = structuredClone(examples[0]) as Descriptor;
    d.simulation.what_it_models = [{ en: "One", de: "Eins" }, { en: "Two" }];
    d.pins[0].name = { en: "Plus", i18n_key: "pin.plus" };
    expect(toDescriptor(draftFromDescriptor(d), NOW)).toEqual(d);
  });

  it("ignores a form-owned field in extra", () => {
    const s = { ...twoPinPart(), extra: { ...twoPinPart().extra, version: "9.9.9", pins: [] } };
    expect(toDescriptor(s).version).toBe("1.0.0");
    expect(toDescriptor(s).pins).toHaveLength(2);
  });
});

describe("a new part", () => {
  it("becomes the descriptor the card describes", () => {
    const d = toDescriptor(twoPinPart(), NOW);
    expect(d.id).toBe("local.pulse-stretcher");
    expect(d.provenance.license).toBe("LicenseRef-local-private");
    expect(d.provenance.origin).toBe("local-user");
    expect(d.simulation).toMatchObject({ status: "not-modelled-yet", tier: "none" });
    expect(d.behaviour.layers).toHaveLength(1);
    expect(d.behaviour.layers[0].model.kind).toBe("none");
  });

  it("derives the id from the name while the slug is empty", () => {
    const s = run(newDraft(NOW), { type: "setField", field: "name", value: "Pulse stretcher" });
    expect(toDescriptor(s).id).toBe("local.pulse-stretcher");
  });

  it("validates with one name and two pins", () => {
    expect(errors(twoPinPart())).toEqual([]);
  });

  it("validates with a runnable layer, partly-modelled and T1", () => {
    expect(errors(run(twoPinPart(), runnablePatch("partly-modelled", "T1")))).toEqual([]);
  });

  it("fails with P-STATUS-LAYERS when the layer runs but the part is still not-modelled-yet", () => {
    const codes = errors(run(twoPinPart(), runnablePatch("not-modelled-yet", "none"))).map((i) => i.code);
    expect(codes).toContain("P-STATUS-LAYERS");
  });

  it("reports a taken id@version and a repeated designator", () => {
    const s = run(twoPinPart(), { type: "setPinField", uid: "p2", field: "designator", value: "1" });
    const issues = draftIssues(s, { ...ctx, existingKeys: new Set(["local.pulse-stretcher@1.0.0"]) });
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(["P-DRAFT-KEY", "P-DRAFT-DESIGNATOR"]));
  });

  it("does not call the saved version of the part it came from a collision", () => {
    const s = { ...twoPinPart(), baseKey: "local.pulse-stretcher@1.0.0" };
    const issues = draftIssues(s, { ...ctx, existingKeys: new Set([s.baseKey]) });
    expect(issues.map((i) => i.code)).not.toContain("P-DRAFT-KEY");
  });
});

describe("pins", () => {
  it("refuses the 33rd and names the limit", () => {
    const full = run(newDraft(NOW), ...Array.from({ length: DRAFT_LIMITS.pins }, (): DraftAction => ({ type: "addPin" })));
    expect(full.pins).toHaveLength(32);
    const over = reduceDraft(full, { type: "addPin" });
    expect(over.pins).toHaveLength(32);
    expect(over.issue?.message).toContain("32");
    expect(over.dirty).toBe(full.dirty);
  });

  it("reports more than 32 pins that arrive by a patch", () => {
    const many = run(newDraft(NOW), { type: "applyPatch", patch: { pins: Array.from({ length: 33 }, (_, i) => ({ uid: `p${i}`, id: `P${i}`, name: "", designator: `${i}`, type: "passive" as const, class: "passive" as const, x: i, y: 0 })) } });
    expect(draftIssues(many, ctx).map((i) => i.code)).toContain("P-DRAFT-LIMIT");
  });

  it("validates a 32-pin draft in well under 50 ms", () => {
    const full = run(newDraft("2026-10-31"), ...Array.from({ length: 32 }, (): DraftAction => ({ type: "addPin" })));
    draftIssues(full, ctx);
    const t = performance.now();
    draftIssues(full, ctx);
    expect(performance.now() - t).toBeLessThan(50);
  });

  it("takes out the references to a removed pin and lists them", () => {
    const led = draftFromDescriptor(examples.find((d) => d.id === "core.led-5mm")!);
    const next = reduceDraft(led, { type: "removePin", uid: led.pins[0].uid });
    expect(next.pins.map((p) => p.id)).toEqual(["K"]);
    expect(JSON.stringify(next.layers)).not.toContain('"A"');
    expect(next.lastCascade?.length).toBeGreaterThan(0);
  });

  it("drops a group that falls under two pins", () => {
    const s = run(twoPinPart(), { type: "addGroup" }, { type: "setGroupPins", id: "g1", pins: ["P1", "P2"] }, { type: "removePin", uid: "p1" });
    expect(s.groups).toEqual([]);
    expect(s.lastCascade).toEqual(["group g1"]);
  });

  it("follows a renamed pin id into the groups and layers", () => {
    const s = run(
      twoPinPart(),
      { type: "addGroup" },
      { type: "setGroupPins", id: "g1", pins: ["P1", "P2"] },
      runnablePatch("partly-modelled", "T1"),
      { type: "setPinField", uid: "p1", field: "id", value: "IN" },
    );
    expect(s.groups[0].pins).toEqual(["IN", "P2"]);
    expect(JSON.stringify(s.layers)).toContain('"IN"');
    expect(JSON.stringify(s.layers)).not.toContain('"P1"');
    expect(s.lastCascade).toBeUndefined();
  });
});

describe("modes", () => {
  it("keeps the last good descriptor while the JSON does not parse", () => {
    const json = run(twoPinPart(), { type: "switchMode", mode: "json" });
    const broken = reduceDraft(json, { type: "setRawJson", text: '{ "id": ' });
    expect(toDescriptor(broken).id).toBe("local.pulse-stretcher");
    expect(draftIssues(broken, ctx)[0].message).toContain("does not parse");
  });

  it("stays in JSON mode and says why when the text will not become a form", () => {
    const json = reduceDraft(run(twoPinPart(), { type: "switchMode", mode: "json" }), { type: "setRawJson", text: "[]" });
    const refused = reduceDraft(json, { type: "switchMode", mode: "form" });
    expect(refused.mode).toBe("json");
    expect(refused.issue).toBeDefined();
  });

  it("follows edits made in the JSON view", () => {
    const json = run(twoPinPart(), { type: "switchMode", mode: "json" });
    const edited = JSON.parse(json.rawJson ?? "");
    edited.identity.model = "Edited in JSON";
    const form = run(json, { type: "setRawJson", text: JSON.stringify(edited) }, { type: "switchMode", mode: "form" });
    expect(form.name).toBe("Edited in JSON");
  });

  it("marks a draft dirty on an edit and clean on reset", () => {
    expect(twoPinPart().dirty).toBe(true);
    expect(reduceDraft(twoPinPart(), { type: "reset", draft: newDraft(NOW) }).dirty).toBe(false);
  });
});

describe("slugFor", () => {
  it("lowercases and joins runs of other characters with one hyphen", () => {
    expect(slugFor("  Pulse -- Stretcher! ", new Set())).toBe("pulse-stretcher");
  });

  it("cuts to 40 characters", () => {
    expect(slugFor("a".repeat(60), new Set())).toHaveLength(40);
  });

  it("appends -2, -3 until the slug is free", () => {
    expect(slugFor("Relay", new Set(["relay", "relay-2"]))).toBe("relay-3");
  });

  it("keeps the slug a valid id segment", () => {
    expect(slugFor("555 timer", new Set())).toBe("part-555-timer");
    expect(slugFor("???", new Set())).toBe("part");
  });
});

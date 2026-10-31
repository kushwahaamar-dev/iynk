import { describe, expect, it } from "vitest";
import type { Mode } from "./modes.ts";
import { callWithFallback, loadRoutes, resolveRoute, ROUTES_KEY, saveRoutes, tierFor } from "./routing.ts";
import type { Attempt, Route, RoutesFile, Task, Tier, TierSignals } from "./routing.ts";

const A: Route = { profileId: "a", model: "m-a" };
const B: Route = { profileId: "b", model: "m-b" };
const C: Route = { profileId: "c", model: "m-c" };

const file = (over: Partial<RoutesFile> = {}): RoutesFile => ({
  version: 1,
  tiers: { fast: A, standard: A, strong: A },
  fallback: [B],
  source: "user",
  updatedAt: "2026-10-30T00:00:00.000Z",
  ...over,
});

const calm: TierSignals = { thinkHarder: false, proposalInvalidTwice: false, p7FailedAfterRepair: false, traceBig: false };

describe("tierFor", () => {
  const rows: [Task, Mode, Partial<TierSignals>, Tier, boolean][] = [
    ["chat", "socratic", {}, "fast", false],
    ["chat", "beginner", {}, "fast", false],
    ["chat", "direct", {}, "standard", false],
    ["chat", "debugging", {}, "standard", false],
    ["chat", "advanced", {}, "standard", false],
    ["compaction", "direct", {}, "fast", false],
    ["translation", "advanced", {}, "fast", false],
    ["conformance", "direct", {}, "standard", false],
    ["eval", "socratic", {}, "standard", false],
    ["chat", "direct", { thinkHarder: true }, "strong", true],
    ["chat", "advanced", { proposalInvalidTwice: true }, "strong", true],
    ["chat", "direct", { p7FailedAfterRepair: true }, "strong", true],
    ["chat", "debugging", { traceBig: true }, "strong", true],
    ["chat", "direct", { traceBig: true }, "standard", false],
    ["chat", "advanced", { traceBig: true }, "standard", false],
    ["chat", "beginner", { thinkHarder: true }, "fast", false],
    ["chat", "socratic", { p7FailedAfterRepair: true }, "fast", false],
    ["compaction", "direct", { thinkHarder: true }, "fast", false],
    ["eval", "direct", { proposalInvalidTwice: true }, "standard", false],
    ["conformance", "debugging", { traceBig: true }, "standard", false],
  ];
  it.each(rows)("%s %s %j gives %s", (task, mode, signals, tier, escalated) => {
    const got = tierFor(task, mode, { ...calm, ...signals });
    expect(got.tier).toBe(tier);
    expect(got.escalated).toBe(escalated);
    expect(got.reason !== undefined).toBe(escalated);
  });
});

describe("resolveRoute", () => {
  it("fills gaps from the nearest tier", () => {
    const f = file({ tiers: { fast: null, standard: B, strong: C } });
    expect(resolveRoute(f, "fast")).toEqual(B);
    expect(resolveRoute(file({ tiers: { fast: A, standard: null, strong: null } }), "strong")).toEqual(A);
    expect(resolveRoute(file({ tiers: { fast: null, standard: null, strong: C } }), "fast")).toEqual(C);
  });
  it("gives null when nothing is configured", () => {
    expect(resolveRoute(file({ tiers: { fast: null, standard: null, strong: null } }), "standard")).toBeNull();
  });
});

describe("callWithFallback (AI-AC-17)", () => {
  const fail = (error: Attempt<string> & { ok: false }) => error;
  const run = (results: Record<string, Attempt<string>>, f = file(), usable: (r: Route) => boolean = () => true) => {
    const calls: string[] = [];
    return callWithFallback(f, "standard", usable, async (r) => {
      calls.push(r.profileId);
      return results[r.profileId] ?? fail({ ok: false, error: "internal", outputBegan: false });
    }).then((out) => ({ out, calls }));
  };

  it("falls to a listed route when the primary is busy before output", async () => {
    const { out, calls } = await run({
      a: { ok: false, error: "upstream_busy", outputBegan: false },
      b: { ok: true, value: "hi" },
    });
    expect(calls).toEqual(["a", "b"]);
    expect(out).toEqual({ ok: true, value: "hi", route: B, fellBack: true });
  });
  it("does not fall back after output began", async () => {
    const { out, calls } = await run({ a: { ok: false, error: "upstream_busy", outputBegan: true } });
    expect(calls).toEqual(["a"]);
    expect(out).toEqual({ ok: false, error: "upstream_busy", tried: [A] });
  });
  it("does not fall back on auth", async () => {
    const { calls } = await run({ a: { ok: false, error: "auth", outputBegan: false } });
    expect(calls).toEqual(["a"]);
  });
  it("never tries a route that is not listed", async () => {
    const { out, calls } = await run({
      a: { ok: false, error: "network", outputBegan: false },
      b: { ok: false, error: "network", outputBegan: false },
    });
    expect(calls).toEqual(["a", "b"]);
    expect(out).toEqual({ ok: false, error: "network", tried: [A, B] });
  });
  it("skips unusable routes", async () => {
    const { calls } = await run(
      { a: { ok: false, error: "network", outputBegan: false }, c: { ok: true, value: "x" } },
      file({ fallback: [B, C] }),
      (r) => r.profileId !== "b",
    );
    expect(calls).toEqual(["a", "c"]);
  });
  it("skips the route just tried", async () => {
    const { calls } = await run({ a: { ok: false, error: "network", outputBegan: false } }, file({ fallback: [A] }));
    expect(calls).toEqual(["a"]);
  });
  it("reports not_configured with no route", async () => {
    const f = file({ tiers: { fast: null, standard: null, strong: null } });
    expect((await run({}, f)).out).toEqual({ ok: false, error: "not_configured", tried: [] });
  });
  it("turns a throwing attempt into internal", async () => {
    const out = await callWithFallback(file(), "fast", () => true, async () => {
      throw new Error("boom");
    });
    expect(out).toEqual({ ok: false, error: "internal", tried: [A] });
  });
});

describe("storage", () => {
  it("gives the empty file for garbage", () => {
    for (const raw of ["{nope", JSON.stringify({ version: 2 }), null]) {
      const got = loadRoutes({ getItem: () => raw });
      expect(got.tiers).toEqual({ fast: null, standard: null, strong: null });
      expect(got.fallback).toEqual([]);
    }
  });
  it("rejects a fallback list over four routes", () => {
    const f = file({ fallback: [A, B, C, A, B] });
    expect(loadRoutes({ getItem: () => JSON.stringify(f) }).fallback).toEqual([]);
  });
  it("round-trips a saved file", () => {
    const mem = new Map<string, string>();
    const f = file();
    expect(saveRoutes({ setItem: (k, v) => void mem.set(k, v) }, f)).toBe(true);
    expect(loadRoutes({ getItem: (k) => mem.get(k) ?? null })).toEqual(f);
    expect(mem.has(ROUTES_KEY)).toBe(true);
  });
  it("returns false when setItem throws", () => {
    expect(
      saveRoutes(
        {
          setItem: () => {
            throw new Error("blocked");
          },
        },
        file(),
      ),
    ).toBe(false);
  });
});

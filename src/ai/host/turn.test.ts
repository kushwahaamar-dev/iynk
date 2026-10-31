// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { ModelAdapter, ModelEvent, ModelRequest } from "../adapters/types.ts";
import { createSeenUrls } from "../render/links.ts";
import { DEFAULT_CAPS, createLedger } from "../ledger.ts";
import type { Caps } from "../ledger.ts";
import { emptyTotals } from "../../local/ai-usage.ts";
import type { AiLogRow } from "../log.ts";
import { createToolRunner } from "../tools/registry.ts";
import { fakeSources } from "../testing/fake-sources.ts";
import { MODE_SETTINGS, defaultMode } from "../modes.ts";
import { TOOLS } from "../tools/registry.ts";
import { runTurn } from "./turn.ts";
import type { TurnDeps, TurnEvent } from "./turn.ts";

const usage = (out = 20): ModelEvent => ({ t: "usage", inTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outTokens: out });

function setup(script: ModelEvent[][], caps: Caps = DEFAULT_CAPS) {
  const requests: ModelRequest[] = [];
  const rows: AiLogRow[] = [];
  const calls = { n: 0 };
  const client = {
    async *stream(req: ModelRequest) {
      requests.push(structuredClone(req));
      for (const ev of script[calls.n++] ?? []) yield ev;
    },
    probe: async () => ({ reachable: true, modelIds: [] }),
  };
  const store = {
    recordCall: async (row: AiLogRow) => void rows.push(row),
    dayTotals: async () => emptyTotals(),
    monthTotals: async () => emptyTotals(),
    rows: async () => [],
    rebuildUsage: async () => {},
    prune: async () => {},
  };
  const sources = fakeSources();
  let t = 1_000;
  const deps: TurnDeps = {
    client,
    ledger: createLedger({ store, caps: () => caps, now: () => t, day: () => "1970-01-01", random: Math.random }),
    sources,
    tools: createToolRunner(sources, { highlight() {}, openPanel() {} }, { random: Math.random }),
    effects: null,
    profile: { id: "prf_0123456789", label: "stub", family: "openai-compat", baseUrl: "https://example.com/v1", keyId: null, via: "direct", models: [] },
    model: { id: "stub-model", contextTokens: 100_000, maxOutputTokens: 4_000 },
    caps,
    log: async (row) => void rows.push(row),
    seenUrls: createSeenUrls(),
    random: Math.random,
    now: () => (t += 5),
    locale: "en",
    threadId: "thr_test",
    projectId: null,
    correction: () => 1,
  };
  return { deps, requests, rows };
}

async function collect(gen: AsyncGenerator<TurnEvent>): Promise<TurnEvent[]> {
  const out: TurnEvent[] = [];
  for await (const ev of gen) out.push(ev);
  return out;
}

const ask = (text = "why is D12 low") => ({ mode: "debugging" as const, text, thread: [], signal: new AbortController().signal });

describe("runTurn", () => {
  it("answers after a tool round, cites resolved refs and logs one row per call", async () => {
    const { deps, requests, rows } = setup([
      [{ t: "tool_call", id: "c1", name: "get_netlist", argsJson: "{}" }, usage(), { t: "done", reason: "tool" }],
      [{ t: "text", delta: "D12 is [[net_d12]] and the LED is [[cmp_nope]]." }, usage(), { t: "done", reason: "stop" }],
    ]);
    const events = await collect(runTurn(deps, ask()));
    expect(events.map((e) => e.t)).toEqual(["pack", "tool", "usage", "text", "usage", "done"]);
    const done = events.at(-1) as Extract<TurnEvent, { t: "done" }>;
    expect(done.turn.refs).toEqual(["net_d12"]);
    expect(done.turn.flags).toContain("unverified");
    expect(done.turn.tools).toHaveLength(1);
    expect(done.turn.usage?.inTokens).toBe(200);
    expect(rows).toHaveLength(2);
    expect(rows[0].toolCalls[0].name).toBe("get_netlist");
    expect(requests[1].messages.map((m) => m.role)).toEqual(["user", "assistant", "tool"]);
  });

  it("forces a text answer in the sixth round", async () => {
    const call: ModelEvent[] = [{ t: "tool_call", id: "c", name: "get_sim_state", argsJson: "{}" }, usage(), { t: "done", reason: "tool" }];
    const { deps, requests, rows } = setup([call, call, call, call, call, call]);
    const events = await collect(runTurn(deps, ask()));
    expect(requests).toHaveLength(6);
    expect(requests[5].tools).toEqual([]);
    expect(requests[5].toolChoice).toBe("none");
    expect(rows.at(-1)?.outcome).toBe("tool_limit");
    expect(events.at(-1)?.t).toBe("done");
  });

  it("makes no request once a cap is reached", async () => {
    const { deps, requests, rows } = setup([[]], { ...DEFAULT_CAPS, sessionUSD: null, dayUSD: 0, monthUSD: null, dayTokens: 0, sessionTokens: 0 });
    deps.model = { ...deps.model, price: { in: 1, cacheRead: null, cacheWrite: null, out: 1, asOf: "2026-10-26", source: "test" } };
    const events = await collect(runTurn(deps, ask()));
    expect(requests).toHaveLength(0);
    expect(rows.map((r) => r.outcome)).toEqual(["capped"]);
    expect(events.at(-1)).toMatchObject({ t: "error", error: { code: "capped" } });
  });

  it("retries once at a smaller pack profile when the context is too long", async () => {
    const { deps, requests } = setup([
      [{ t: "error", code: "context_too_long" }],
      [{ t: "text", delta: "ok" }, usage(), { t: "done", reason: "stop" }],
    ]);
    const events = await collect(runTurn(deps, ask()));
    expect(requests).toHaveLength(2);
    expect(events.filter((e) => e.t === "pack")).toHaveLength(2);
    expect(events.at(-1)?.t).toBe("done");
  });

  it("passes a missing key through without a log row", async () => {
    const { deps, rows } = setup([[{ t: "error", code: "no_key" }]]);
    const events = await collect(runTurn(deps, ask()));
    expect(events.at(-1)).toMatchObject({ t: "error", error: { code: "no_key" } });
    expect(rows).toHaveLength(0);
  });

  it("stops on abort and ends with an aborted error", async () => {
    const { deps, rows } = setup([[{ t: "text", delta: "a" }]]);
    const controller = new AbortController();
    controller.abort();
    const events = await collect(runTurn(deps, { ...ask(), signal: controller.signal }));
    expect(events).toMatchObject([{ t: "error", error: { code: "aborted" } }]);
    expect(rows).toHaveLength(0);
  });

  it("rejects empty and over-long text", async () => {
    const { deps } = setup([]);
    await expect(collect(runTurn(deps, ask("  ")))).rejects.toThrow(RangeError);
    await expect(collect(runTurn(deps, ask("x".repeat(8_001))))).rejects.toThrow(RangeError);
  });

  it("offers no effect tool in any mode and maps kinds to modes", () => {
    for (const settings of Object.values(MODE_SETTINGS)) {
      for (const name of settings.readTools) expect(["read", "compute", "ui"]).toContain(TOOLS.find((t) => t.name === name)?.cls);
    }
    expect(defaultMode("lesson")).toBe("socratic");
    expect(defaultMode("tour")).toBe("beginner");
    expect(defaultMode("bench")).toBe("debugging");
  });
});

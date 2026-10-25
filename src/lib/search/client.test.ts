import { beforeEach, describe, expect, it, vi } from "vitest";

const tracked = vi.hoisted(() => [] as [string, unknown][]);
vi.mock("@/lib/telemetry", () => ({ track: (kind: string, data: unknown) => tracked.push([kind, data]) }));

import { fetchNearby, fetchOffers } from "./client";

beforeEach(() => {
  tracked.length = 0;
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { code: "not_configured" } }, { status: 503 })));
});

describe("search client", () => {
  it("counts each call by its engine, never by what was searched for", async () => {
    const offers = await fetchOffers({ parts: [{ key: "motor", query: "2207 1750kv motor", qty: 4 }], country: "us" });
    expect(offers).toEqual({ ok: false, code: "not_configured" });
    await fetchNearby({ kind: "makerspace", near: "Austin, TX" });
    expect(tracked).toEqual([
      ["search.call", { engine: "offers" }],
      ["search.call", { engine: "nearby" }],
    ]);
  });
});

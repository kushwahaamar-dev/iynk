// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { runTool, type Tool, type ToolContext, type ToolOutcome } from "./registry";
import { getItem, searchCatalog } from "./tools/catalog";
import { droneCalc } from "./tools/drone";
import { priceParts } from "./tools/market";
import { createRoom } from "./tools/together";

const flags = vi.hoisted(() => ({ ai: true, voice: true, search: true, db: false, realtime: true, gemini: false }));
const offers = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/env", () => ({ env: { NEXT_PUBLIC_SITE_URL: "https://iynk.test" }, features: flags }));

vi.mock("@/content/index.generated", async () => {
  const { quad5 } = await import("./__fixtures__/content");
  return {
    loadBoard: async () => null,
    loadRobotics: async () => null,
    loadDrone: async (id: string) => (id === "quad5" ? quad5 : null),
  };
});

vi.mock("@/i18n/server", async () => {
  const { quad5Prose } = await import("./__fixtures__/content");
  return {
    getContentText: async (locale: string, lab: string, id: string) => {
      const text = lab === "drones" && id === "quad5" ? quad5Prose[locale] : undefined;
      if (!text) throw new Error("missing");
      return text;
    },
  };
});

vi.mock("@/lib/server/search/serpapi", () => {
  class SearchError extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  }
  return { offers, SearchError };
});

const ctx: ToolContext = { siteUrl: "https://iynk.test" };

beforeEach(() => {
  Object.assign(flags, { ai: true, search: true, realtime: true });
  offers.mockReset();
});

/** The result of a call that must succeed, typed by the tool's output schema. */
function dataOf<T extends Tool>(_tool: T, out: ToolOutcome): z.output<T["output"]> {
  if (!out.ok) throw new Error(`${out.code}: ${out.message}`);
  return out.data as z.output<T["output"]>;
}

describe("search_catalog", () => {
  it("finds items by tag, chip and title words, best match first", async () => {
    const out = await runTool(searchCatalog, { query: "esp32 wifi" }, ctx);
    expect(out.ok).toBe(true);
    const data = out.ok ? (out.data as { results: { lab: string; id: string; url: string }[] }) : null;
    expect(data?.results.slice(0, 2).map((r) => r.id)).toEqual(["esp32-devkitc", "esp32-s3-devkitc-1"]);
    expect(data?.results[0].url).toBe("https://iynk.test/en/boards/esp32-devkitc");
  });

  it("reads titles from the item's prose in the asked language, falling back to English", async () => {
    const out = await runTool(searchCatalog, { query: "freestyle", lab: "drone", locale: "es" }, ctx);
    const data = out.ok ? (out.data as { results: { id: string; title: string | null; tagline: string | null; url: string }[] }) : null;
    expect(data?.results[0]).toMatchObject({
      id: "quad5",
      title: "Cuadricóptero freestyle de 5 pulgadas",
      tagline: "The all-rounder everyone learns on",
      url: "https://iynk.test/es/drones/quad5",
    });
  });

  it("returns an empty list when nothing matches, and rejects an empty query", async () => {
    const none = await runTool(searchCatalog, { query: "zzqx" }, ctx);
    expect(none).toEqual({ ok: true, data: { query: "zzqx", total: 0, results: [] } });
    const bad = await runTool(searchCatalog, { query: "  " }, ctx);
    expect(bad).toMatchObject({ ok: false, code: "bad_input" });
  });
});

describe("get_item", () => {
  it("summarises a drone with its design options and sources", async () => {
    const data = dataOf(getItem, await runTool(getItem, { lab: "drone", id: "quad5" }, ctx));
    expect(data.title).toBe("5-inch freestyle quad");
    expect(data.details).toMatchObject({
      design: { default: { batt: "6s1100", motor: "2306-1750", prop: "5x4.3x3" }, batteries: expect.arrayContaining([{ key: "6s1800", label: "6S 1800 mAh" }]) },
      parts: [{ id: "FRAME", name: "Carbon frame" }],
      tests: [{ id: "smoke", kind: "smoke-stopper", title: "Smoke stopper" }],
    });
    expect(data.sources).toEqual([{ title: "Betaflight documentation", url: "https://betaflight.com/docs" }]);
  });

  it("still answers for an item whose data module is not written yet", async () => {
    const out = await runTool(getItem, { lab: "board", id: "uno-r3" }, ctx);
    expect(out).toMatchObject({ ok: true, data: { id: "uno-r3", title: null, details: null, url: "https://iynk.test/en/boards/uno-r3" } });
  });

  it("reports an unknown id as a tool error the model can act on", async () => {
    const out = await runTool(getItem, { lab: "board", id: "arduino-mega" }, ctx);
    expect(out).toMatchObject({ ok: false, code: "not_found" });
  });
});

describe("drone_calc", () => {
  it("runs the calculator on the default pick", async () => {
    const data = dataOf(droneCalc, await runTool(droneCalc, { drone: "quad5" }, ctx));
    expect(data.pick).toEqual({ battery: "6s1100", motor: "2306-1750", prop: "5x4.3x3" });
    expect(data.result).toMatchObject({ allUpWeightG: 514, packVolts: 22.2 });
    expect(data.verdicts).toEqual(["ok"]);
    expect(data.options.batteries).toContain("4s1500");
  });

  it("flags an over-spinning build", async () => {
    const data = dataOf(droneCalc, await runTool(droneCalc, { drone: "quad5", battery: "6s1800", motor: "2306-2450", prop: "5x5x3" }, ctx));
    expect(data.verdicts).toContain("over");
    expect(data.checks[0]).toEqual({ code: "over-spin", level: "danger", values: { kv: 2450, cells: 6 } });
  });

  it("names the valid keys when an option does not exist", async () => {
    const out = await runTool(droneCalc, { drone: "quad5", battery: "9s9999" }, ctx);
    expect(out).toMatchObject({ ok: false, code: "bad_input" });
    expect(!out.ok && out.message).toMatch(/battery "9s9999" \(choose from 6s1100, 6s1800, 4s1500\)/);
  });

  it("says so when the drone's data module is missing", async () => {
    expect(await runTool(droneCalc, { drone: "octo" }, ctx)).toMatchObject({ ok: false, code: "not_found" });
  });
});

describe("price_parts", () => {
  const listing = (price: number, extra: object = {}) => ({ source: "amazon", title: "2306 1750KV motor", price, currency: "USD", url: `https://shop.test/${price}`, ...extra });

  it("prices each part from its best listing and totals them", async () => {
    offers.mockResolvedValue({
      parts: [
        { key: "p1", offers: [listing(21.99, { pack: 1 }), listing(19.5)], best: 1 },
        { key: "p2", offers: [], best: undefined },
      ],
    });
    const out = await runTool(
      priceParts,
      { lab: "drone", id: "quad5", parts: [{ name: "2306 1750KV motor", qty: 4 }, { name: "6S 1100 mAh LiPo", qty: 1 }] },
      ctx,
    );
    expect(offers).toHaveBeenCalledWith(
      [
        { key: "p1", query: "2306 1750KV motor", qty: 4, pack: undefined },
        { key: "p2", query: "6S 1100 mAh LiPo", qty: 1, pack: undefined },
      ],
      expect.any(AbortSignal),
    );
    const data = dataOf(priceParts, out);
    expect(data.parts[0]).toMatchObject({ listings: 2, cost: 78, best: { price: 19.5, seller: null, inStock: null } });
    expect(data.parts[1]).toMatchObject({ best: null, cost: null });
    expect(data).toMatchObject({ total: 78, currency: "USD", partial: null, url: "https://iynk.test/en/drones/quad5" });
  });

  it("prices a bench's own parts list from hx:search's bill of materials", async () => {
    offers.mockResolvedValue({ parts: [] });
    const out = await runTool(priceParts, { lab: "robotics", id: "tb6612fng" }, ctx);
    const keys = (offers.mock.calls[0][0] as { key: string }[]).map((p) => p.key);
    expect(keys).toEqual(expect.arrayContaining(["board:nano", "part:tb6612fng", "part:tt-motor"]));
    expect(dataOf(priceParts, out)).toMatchObject({ total: null, currency: null, parts: expect.arrayContaining([expect.objectContaining({ name: "Arduino Nano", best: null })]) });
  });

  it("prices a drone build as picked, with the catalogue estimate beside each line", async () => {
    offers.mockResolvedValue({ parts: [] });
    const out = await runTool(priceParts, { lab: "drone", id: "quad5", pick: { battery: "6s1800" } }, ctx);
    const keys = (offers.mock.calls[0][0] as { key: string }[]).map((p) => p.key);
    expect(keys).toContain("batt:6s1800");
    expect(keys).not.toContain("batt:6s1100");
    expect(keys).toContain("motor:2306-1750");
    const battery = dataOf(priceParts, out).parts.find((p) => p.name === "6S 1800 mAh");
    expect(battery?.estimate).toBe(54);
    expect(await runTool(priceParts, { lab: "drone", id: "quad5", pick: { motor: "9999kv" } }, ctx)).toMatchObject({ ok: false, code: "bad_input" });
  });

  it("refuses a drone pick on a board, or with a list of its own", async () => {
    const parts = [{ name: "XT60 connector", qty: 2 }];
    expect(await runTool(priceParts, { lab: "board", id: "uno-r3", pick: { battery: "6s1800" } }, ctx)).toMatchObject({ ok: false, code: "bad_input" });
    expect(await runTool(priceParts, { lab: "drone", id: "quad5", pick: { battery: "6s1800" }, parts }, ctx)).toMatchObject({ ok: false, code: "bad_input" });
    expect(offers).not.toHaveBeenCalled();
  });

  it("maps search failures to tool errors", async () => {
    const { SearchError } = await import("@/lib/server/search/serpapi");
    offers.mockRejectedValue(new SearchError("quota_exhausted", "budget"));
    const out = await runTool(priceParts, { lab: "drone", id: "quad5", parts: [{ name: "XT60 plug", qty: 2 }] }, ctx);
    expect(out).toMatchObject({ ok: false, code: "rate_limited" });
  });

  it("is not set up without a SerpApi key", async () => {
    flags.search = false;
    const out = await runTool(priceParts, { lab: "drone", id: "quad5", parts: [{ name: "XT60 plug", qty: 2 }] }, ctx);
    expect(out).toMatchObject({ ok: false, code: "not_configured" });
    expect(offers).not.toHaveBeenCalled();
  });
});

describe("create_room", () => {
  it("makes a fresh room link on the asked item", async () => {
    const out = await runTool(createRoom, { lab: "drone", id: "quad5", locale: "hi" }, ctx);
    expect(out.ok).toBe(true);
    const data = out.ok ? (out.data as { room: string; link: string; maxPeople: number }) : null;
    expect(data?.room).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]{6}$/);
    expect(data?.link).toMatch(new RegExp(`/hi/drones/quad5\\?room=${data?.room}$`));
    expect(data?.maxPeople).toBe(8);
  });

  it("opens on the first board without arguments, and wants lab and id together", async () => {
    expect(await runTool(createRoom, {}, ctx)).toMatchObject({ ok: true, data: { lab: "board", id: "uno-r3" } });
    expect(await runTool(createRoom, { lab: "drone" }, ctx)).toMatchObject({ ok: false, code: "bad_input" });
  });

  it("is not set up without the realtime relay", async () => {
    flags.realtime = false;
    expect(await runTool(createRoom, {}, ctx)).toMatchObject({ ok: false, code: "not_configured" });
  });
});

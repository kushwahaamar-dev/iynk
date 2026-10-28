// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLedger } from "./ledger";

const fs = vi.hoisted(() => ({ failRename: false }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...real,
    rename: (from: string, to: string) => (fs.failRename ? Promise.reject(new Error("disk went away")) : real.rename(from, to)),
  };
});

const KEY = "iynk-canary-KEY-0001-do-not-use";
let dir: string;
let at: Date;

const make = (over: Partial<Parameters<typeof createLedger>[0]> = {}) =>
  createLedger({ dir, aiDailyTokens: 1000, searchMonthly: 3, now: () => at, ...over });

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "iynk-ledger-"));
  at = new Date("2026-10-27T12:00:00Z");
  fs.failRename = false;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("ledger", () => {
  it("counts tokens and requests per key and day", async () => {
    const ledger = make();
    const a = ledger.keyId(KEY);
    const b = ledger.keyId("another-key-0002");
    await ledger.recordAi(a, { tokens: 300 });
    await ledger.recordAi(a, { tokens: 200 });
    await ledger.recordAi(b, { tokens: 5 });
    expect(ledger.summary(a)).toMatchObject({ day: "2026-10-27", month: "2026-10", ai: { today: { tokens: 500, requests: 2 }, month: { tokens: 500, requests: 2 }, dailyCap: 1000 } });
    expect(ledger.summary(b).ai.today).toEqual({ tokens: 5, requests: 1 });
  });

  it("refuses at the cap with the seconds to UTC midnight, allows the next day, and may overshoot by one call", async () => {
    at = new Date("2026-10-27T23:59:59Z");
    const ledger = make();
    const id = ledger.keyId(KEY);
    await ledger.recordAi(id, { tokens: 999 });
    expect(ledger.checkAi(id)).toEqual({ ok: true });
    await ledger.recordAi(id, { tokens: 500 });
    expect(ledger.checkAi(id)).toEqual({ ok: false, retryAfterSec: 1, used: 1499, cap: 1000 });
    at = new Date("2026-10-28T00:00:00Z");
    expect(ledger.checkAi(id)).toEqual({ ok: true });
    expect(ledger.summary(id).ai.month.tokens).toBe(1499);
  });

  it("refuses every call when the cap is 0", () => {
    const ledger = make({ aiDailyTokens: 0, searchMonthly: 0 });
    expect(ledger.checkAi(ledger.keyId(KEY)).ok).toBe(false);
    expect(ledger.checkSearch(ledger.keyId(KEY)).ok).toBe(false);
  });

  it("still refuses after a restart", async () => {
    const first = make();
    await first.recordAi(first.keyId(KEY), { tokens: 1000 });
    const restarted = make();
    expect(restarted.checkAi(restarted.keyId(KEY)).ok).toBe(false);
  });

  it("counts searches per month and starts over in the next one", async () => {
    at = new Date("2026-10-31T10:00:00Z");
    const ledger = make();
    const id = ledger.keyId(KEY);
    await ledger.recordSearch(id);
    await ledger.recordSearch(id, 2);
    expect(ledger.summary(id).search).toEqual({ today: 3, month: 3, monthlyCap: 3 });
    const check = ledger.checkSearch(id);
    expect(check).toMatchObject({ ok: false, used: 3, cap: 3 });
    expect(check.ok === false && check.retryAfterSec).toBe(14 * 3600);
    at = new Date("2026-11-01T00:00:00Z");
    expect(ledger.checkSearch(id)).toEqual({ ok: true });
    expect(ledger.summary(id).search).toEqual({ today: 0, month: 0, monthlyCap: 3 });
  });

  it("prunes days older than 62 days and months older than 14 on write", async () => {
    writeFileSync(
      path.join(dir, "usage.json"),
      JSON.stringify({
        v: 1,
        days: { "2026-08-20": { k: { aiTokens: 1, aiRequests: 1 } }, "2026-08-26": { k: { aiTokens: 1, aiRequests: 1 } } },
        months: { "2025-07": { k: { searches: 1 } }, "2025-09": { k: { searches: 1 } } },
      }),
    );
    const ledger = make();
    await ledger.recordAi(ledger.keyId(KEY), { tokens: 1 });
    const saved = JSON.parse(readFileSync(path.join(dir, "usage.json"), "utf8"));
    expect(Object.keys(saved.days)).toEqual(["2026-08-26", "2026-10-27"]);
    expect(Object.keys(saved.months)).toEqual(["2025-09"]);
  });

  it("moves a corrupt file aside and starts empty", async () => {
    writeFileSync(path.join(dir, "usage.json"), "{not json");
    const ledger = make();
    expect(ledger.summary(ledger.keyId(KEY)).ai.today.tokens).toBe(0);
    expect(readdirSync(dir).some((name) => name.startsWith("usage.json.bad-"))).toBe(true);
    await ledger.recordAi(ledger.keyId(KEY), { tokens: 7 });
    expect(JSON.parse(readFileSync(path.join(dir, "usage.json"), "utf8")).v).toBe(1);
  });

  it("derives a stable key id and never writes the key", async () => {
    const ledger = make();
    const id = ledger.keyId(KEY);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(id).toBe(make().keyId(KEY));
    expect(id).not.toBe(ledger.keyId(`${KEY}x`));
    await ledger.recordAi(id, { tokens: 1 });
    await ledger.recordSearch(id);
    const files = readdirSync(dir).map((name) => readFileSync(path.join(dir, name), "utf8"));
    expect(files.join("\n")).not.toContain(KEY);
  });

  it("keeps the old file valid when the rename fails, and the cap still holds in memory", async () => {
    const ledger = make();
    const id = ledger.keyId(KEY);
    await ledger.recordAi(id, { tokens: 100 });
    fs.failRename = true;
    await ledger.recordAi(id, { tokens: 900 });
    expect(JSON.parse(readFileSync(path.join(dir, "usage.json"), "utf8")).days["2026-10-27"][id].aiTokens).toBe(100);
    expect(ledger.checkAi(id).ok).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("cannot write"));
  });
});

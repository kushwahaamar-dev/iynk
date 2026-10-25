import { beforeEach, describe, expect, it } from "vitest";
import {
  challengeDay,
  challengeLink,
  dailyChallenge,
  isChallengeDay,
  loadChallengeBest,
  readChallengeQuery,
  saveChallengeBest,
  type ChallengeCraft,
} from "./challenge";

const pool: ChallengeCraft[] = [
  { id: "quad5", courses: [{ id: "bando", kind: "gates" }, { id: "field" }], batts: ["4s1500", "6s1100"] },
  { id: "wing", courses: [{ id: "loop" }], batts: ["3s2200"] },
  { id: "nocourse", courses: [], batts: ["2s"] },
];

beforeEach(() => localStorage.clear());

describe("the daily challenge", () => {
  it("is the same for everyone on a day, whatever order the crafts come in", () => {
    const a = dailyChallenge("2026-10-24", pool)!;
    expect(dailyChallenge("2026-10-24", [...pool].reverse())).toEqual(a);
    expect(a.board).toBe("daily-20261024");
    expect(a.board).toMatch(/^[a-z0-9][a-z0-9-]{0,47}$/);
    // a craft with nothing to fly never comes up
    const crafts = new Set(Array.from({ length: 60 }, (_, i) => dailyChallenge(`2026-11-${String((i % 28) + 1).padStart(2, "0")}`, pool)!.craft));
    expect(crafts.has("nocourse")).toBe(false);
    expect(crafts.size).toBe(2);
  });

  it("flies a course and pack the craft has", () => {
    for (let d = 1; d <= 28; d++) {
      const c = dailyChallenge(`2026-12-${String(d).padStart(2, "0")}`, pool)!;
      const craft = pool.find((p) => p.id === c.craft)!;
      expect(craft.courses.map((x) => x.id)).toContain(c.course);
      expect(craft.batts).toContain(c.batt);
    }
  });

  it("is null for a bad date or an empty pool", () => {
    expect(dailyChallenge("2026-02-30", pool)).toBeNull();
    expect(dailyChallenge("yesterday", pool)).toBeNull();
    expect(dailyChallenge("2026-10-24", [])).toBeNull();
    expect(isChallengeDay("2026-10-24")).toBe(true);
    expect(challengeDay(new Date("2026-10-24T23:59:59Z"))).toBe("2026-10-24");
  });
});

describe("the share link", () => {
  it("opens the day's craft with the time to beat, and reads back what it carries", () => {
    const c = dailyChallenge("2026-10-24", pool)!;
    const link = challengeLink("fr", c, { time: 23.4567, by: "Ana" });
    expect(link).toBe(`/fr/drones/${c.craft}/fly?challenge=2026-10-24&beat=23.46&by=Ana`);
    expect(readChallengeQuery(link.slice(link.indexOf("?")))).toEqual({ date: "2026-10-24", beat: 23.46, by: "Ana" });
    expect(challengeLink("en", c)).toBe(`/en/drones/${c.craft}/fly?challenge=2026-10-24`);
  });

  it("drops what is malformed", () => {
    expect(readChallengeQuery("?challenge=nope")).toBeNull();
    expect(readChallengeQuery("?challenge=2026-10-24&beat=-3&by=%E2%80%AE%20")).toEqual({ date: "2026-10-24", beat: null, by: null });
    expect(readChallengeQuery("?challenge=2026-10-24&beat=Infinity")?.beat).toBeNull();
    expect(readChallengeQuery(`?challenge=2026-10-24&by=${"x".repeat(80)}`)?.by).toHaveLength(24);
  });
});

describe("your best on the day", () => {
  it("keeps the faster time", () => {
    expect(loadChallengeBest("2026-10-24")).toBeNull();
    expect(saveChallengeBest("2026-10-24", 30)).toBe(true);
    expect(saveChallengeBest("2026-10-24", 31)).toBe(false);
    expect(saveChallengeBest("2026-10-24", 28.5)).toBe(true);
    expect(loadChallengeBest("2026-10-24")).toBe(28.5);
    expect(loadChallengeBest("2026-10-25")).toBeNull();
  });
});

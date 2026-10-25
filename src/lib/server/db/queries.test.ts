// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { arrayLiteral, insertEvents, upsertProfile } from "./queries";
import type { Sql } from "./client";

describe("arrayLiteral", () => {
  it("quotes every element, so commas, braces and spaces stay inside it", () => {
    expect(arrayLiteral(["drones", "a,b", "{brace}", " spaced "])).toBe('{"drones","a,b","{brace}"," spaced "}');
  });

  it("escapes quotes and backslashes", () => {
    expect(arrayLiteral(['say "hi"', "back\\slash"])).toBe('{"say \\"hi\\"","back\\\\slash"}');
  });

  it("writes null as NULL and an empty list as {}", () => {
    expect(arrayLiteral(["quad5", null])).toBe('{"quad5",NULL}');
    expect(arrayLiteral([])).toBe("{}");
  });
});

// The queries must send plain strings, not sql.array() parameters, which a fresh pool can serialize as "a,b".
function recordingSql() {
  const calls: unknown[][] = [];
  const sql = vi.fn((_strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push(values);
    return Promise.resolve([{ expires_at: new Date("2026-10-26T12:00:00Z") }]);
  });
  return { sql: sql as unknown as Sql, calls };
}

describe("array parameters", () => {
  it("insertEvents sends each column as an array literal", async () => {
    const { sql, calls } = recordingSql();
    await insertEvents(sql, [
      { ts: new Date("2026-10-25T13:44:06.356Z"), kind: "flight.lap", session: "s1234567", room: null, item: "quad5", data: { timeMs: 42_180 } },
    ]);
    expect(calls[0]).toEqual([
      '{"2026-10-25T13:44:06.356Z"}',
      '{"flight.lap"}',
      '{"s1234567"}',
      "{NULL}",
      '{"quad5"}',
      '{"{\\"timeMs\\":42180}"}',
    ]);
  });

  it("upsertProfile sends interests and built as array literals", async () => {
    const { sql, calls } = recordingSql();
    const profile = { id: "smoke1234", name: "Ada", lang: "en" as const, interests: ["drones", "fpv"], built: ["board:uno-r3:blink"], wants: "" };
    await upsertProfile(sql, profile, "token-aaaaaaaaaaaaaaaa");
    expect(calls[0]).toContain('{"drones","fpv"}');
    expect(calls[0]).toContain('{"board:uno-r3:blink"}');
    expect(calls[0].some((v) => Array.isArray(v))).toBe(false);
  });
});

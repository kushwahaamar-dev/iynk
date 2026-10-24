// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatCount, formatLap } from "./format";

describe("formatLap", () => {
  it("shows seconds with milliseconds under a minute, m:ss.mmm above", () => {
    expect(formatLap(42_180, "en")).toBe("42.180s");
    expect(formatLap(62_345, "en")).toBe("1:02.345");
    expect(formatLap(62_345, "de")).toBe("1:02,345");
  });
});

describe("formatCount", () => {
  it("keeps small numbers whole and compacts big ones per locale", () => {
    expect(formatCount(1204, "en")).toBe("1,204");
    expect(formatCount(1204, "de")).toBe("1.204");
    expect(formatCount(12_400, "en")).toBe("12.4K");
    expect(formatCount(-3, "en")).toBe("0");
  });
});

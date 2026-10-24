// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const available = vi.hoisted(() => ({ board: [] as string[], robotics: [] as string[], drone: [] as string[] }));
vi.mock("@/content/index.generated", () => ({ AVAILABLE: available }));

afterEach(() => {
  available.board = [];
  available.robotics = [];
  available.drone = [];
});

describe("catalog", () => {
  it("offers every D3 id while no content module exists", async () => {
    const { catalog, itemKey } = await import("./catalog");
    const keys = catalog().map(itemKey);
    expect(keys).toHaveLength(12 + 13 + 13);
    expect(keys).toContain("board:uno-r3");
    expect(keys).toContain("robotics:led-resistor");
    expect(keys).toContain("drone:octo");
  });

  it("offers only items with content once the generated index lists any", async () => {
    available.drone = ["quad5"];
    available.board = ["uno-r3"];
    const { catalog, catalogLines } = await import("./catalog");
    expect(catalog()).toEqual([
      { lab: "board", id: "uno-r3", tags: ["arduino", "avr", "beginner"] },
      { lab: "drone", id: "quad5", tags: ["freestyle", "5-inch"] },
    ]);
    expect(catalogLines(catalog())).toBe("board:uno-r3 (arduino, avr, beginner)\ndrone:quad5 (freestyle, 5-inch)");
  });

  it("splits keys back into lab and id", async () => {
    const { parseItemKey } = await import("./catalog");
    expect(parseItemKey("robotics:hc-sr04")).toEqual({ lab: "robotics", id: "hc-sr04" });
  });
});

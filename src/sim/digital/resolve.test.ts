// @vitest-environment node
import { describe, expect, it } from "vitest";
import { type PinDriver, outputContention, resolve } from "./resolve.ts";

const strong = (id: string, level: PinDriver["level"]): PinDriver => ({ id, level, strength: "strong" });
const weak = (id: string, level: PinDriver["level"]): PinDriver => ({ id, level, strength: "weak" });

describe("resolve", () => {
  it("gives Z with no driver", () => {
    expect(resolve([])).toBe("Z");
    expect(resolve([{ id: "a", level: 1, strength: "none" }])).toBe("Z");
  });

  it("lets a strong driver beat a weak one", () => {
    expect(resolve([weak("pull", 1), strong("pin", 0)])).toBe(0);
    expect(resolve([strong("pin", 1), weak("pull", 0)])).toBe(1);
  });

  it("gives X when two weak drivers disagree", () => {
    expect(resolve([weak("a", 0), weak("b", 1)])).toBe("X");
    expect(resolve([weak("a", 1), weak("b", 1)])).toBe(1);
  });

  it("ignores a driver that is high impedance", () => {
    expect(resolve([strong("a", "Z"), weak("b", 1)])).toBe(1);
    expect(resolve([strong("a", "Z")])).toBe("Z");
  });

  it("gives X and the output-contention diagnostic when strong drivers disagree", () => {
    const drivers = [strong("a", 0), strong("b", 1)];
    expect(resolve(drivers)).toBe("X");
    expect(outputContention("n1", drivers)).toMatchObject({ id: "output-contention", severity: "error", ref: { net: "n1" } });
  });

  it("raises no diagnostic when strong drivers agree", () => {
    expect(outputContention("n1", [strong("a", 1), strong("b", 1), weak("c", 0)])).toBeNull();
  });
});

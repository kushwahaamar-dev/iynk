import { describe, expect, it } from "vitest";
import type { WorldInput } from "@/project/generated/types";
import { clampStep, controlFor } from "./inputs";

const base: WorldInput = {
  id: "in_a",
  quantity: "level",
  device: { kind: "pot", ohms: 10000 },
  component: "cmp_a",
  min: 0,
  max: 1023,
  step: 1,
  default: 0,
  gesture: "knob",
  label: "Knob",
};

describe("controlFor", () => {
  it("maps a button to hold", () => {
    expect(controlFor({ ...base, quantity: "button", device: { kind: "button", pull: "internal-up", bounceMs: 0 }, gesture: "press" })).toEqual({ kind: "hold" });
  });

  it("maps a pot to a slider", () => {
    expect(controlFor(base)).toEqual({ kind: "slider" });
  });

  it("maps a network input to its requests and skips URLs", () => {
    const device = { kind: "network" as const, ssid: "s", ip: "1.2.3.4", requests: ["GET /on", " GET /off ", "GET http://x.y/z"] };
    expect(controlFor({ ...base, device })).toEqual({
      kind: "requests",
      requests: [
        { value: 0, label: "GET /on" },
        { value: 1, label: "GET /off" },
      ],
    });
  });
});

describe("clampStep", () => {
  it("clamps to the range and the step grid", () => {
    const range = { min: 0, max: 1, step: 0.1 };
    expect(clampStep(range, 2)).toBe(1);
    expect(clampStep(range, -1)).toBe(0);
    expect(clampStep(range, 0.34)).toBe(0.3);
  });
});

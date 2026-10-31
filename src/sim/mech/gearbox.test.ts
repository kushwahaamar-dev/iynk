import { describe, expect, it } from "vitest";
import { type GearParams, outputTorque, reflectedInertia } from "./gearbox.ts";

const gear: GearParams = { ratio: 30, efficiency: 0.8, backdrivable: true, jOutKgM2: 1e-6 };

describe("gearbox", () => {
  it("multiplies torque by ratio and efficiency while the motor drives the output", () => {
    expect(outputTorque(gear, 0.01, 5)).toBeCloseTo(0.24, 12);
    expect(outputTorque(gear, -0.01, -5)).toBeCloseTo(-0.24, 12);
  });

  it("asks the load for the losses as well when it back-drives the motor", () => {
    expect(outputTorque(gear, 0.01, -5)).toBeCloseTo(0.375, 12);
  });

  it("is lossless at efficiency 1", () => {
    const ideal = { ...gear, efficiency: 1 };
    expect(outputTorque(ideal, 0.01, 5)).toBeCloseTo(0.3, 12);
    expect(outputTorque(ideal, 0.01, -5)).toBeCloseTo(0.3, 12);
  });

  it("reflects rotor inertia by the ratio squared", () => {
    expect(reflectedInertia(6e-6, gear)).toBeCloseTo(5.4e-3, 12);
  });
});

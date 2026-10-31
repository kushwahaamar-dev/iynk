// @vitest-environment node
import { describe, expect, it } from "vitest";
import { blankProject } from "../project/blank.ts";
import type { InterfaceSnapshot } from "../parts/pins.ts";
import { interfaceOf } from "../parts/pins.ts";
import { resolvePart } from "./parts-view.ts";
import { registry } from "./testing/breadboard-fixture.ts";

function project() {
  return blankProject({ board: "uno", title: "t", locale: "en", actor: "act_a", now: "2026-10-28T00:00:00.000Z", id: "prj_t" });
}

const pinned = (ref: string, version: string, iface: InterfaceSnapshot) => ({ ref, version, origin: "builtin" as const, interface: iface });

describe("resolvePart", () => {
  it("gives a known part its dimensions and flips its pins to the y-down frame", () => {
    const shape = resolvePart(project(), "core.led-5mm");
    const d = registry.latest("core.led-5mm")!;
    expect(shape.known).toBe(true);
    expect(shape.widthMm).toBe(d.dimensions!.body!.w);
    expect(shape.heightMm).toBe(d.dimensions!.body!.h);
    const k = shape.pins.find((p) => p.id === "K")!;
    expect(k).toEqual({ id: "K", xMm: 2.54, yMm: d.dimensions!.body!.h, mechanical: false });
  });

  it("uses the version the project pinned, not the newest", () => {
    const state = project();
    const led = registry.latest("core.led-5mm")!;
    state.dependencies.components.push(pinned(led.id, led.version, interfaceOf(led)));
    expect(resolvePart(state, "core.led-5mm").known).toBe(true);
    state.dependencies.components[1] = pinned(led.id, "9.9.9", interfaceOf(led));
    expect(resolvePart(state, "core.led-5mm").known).toBe(false);
  });

  it("lays out the pins of a board that gives none", () => {
    const shape = resolvePart(project(), "core.uno-r3");
    expect(shape.known).toBe(true);
    expect(shape.pins.length).toBeGreaterThan(20);
    for (const pin of shape.pins) {
      expect(pin.xMm).toBeGreaterThanOrEqual(0);
      expect(pin.yMm).toBeLessThanOrEqual(shape.heightMm);
    }
  });

  it("marks mechanical pins", () => {
    const iface: InterfaceSnapshot = {
      role: "part",
      params: [],
      pins: [
        { id: "A", type: "passive", class: "passive" },
        { id: "M", type: "mechanical", class: "mechanical" },
      ],
    };
    const state = project();
    state.dependencies.components.push(pinned("x.mount", "1.0.0", iface));
    const shape = resolvePart(state, "x.mount");
    expect(shape.pins.map((p) => p.mechanical)).toEqual([false, true]);
  });

  it("builds an unknown part from the pinned interface so wires still land", () => {
    const state = project();
    const iface: InterfaceSnapshot = {
      role: "part",
      params: [],
      pins: ["VCC", "GND", "SDA", "SCL"].map((id) => ({ id, type: "passive", class: "passive" })),
    };
    state.dependencies.components.push(pinned("pack.mystery", "1.0.0", iface));
    const shape = resolvePart(state, "pack.mystery");
    expect(shape.known).toBe(false);
    expect(shape.pins.map((p) => p.id)).toEqual(["VCC", "GND", "SDA", "SCL"]);
    expect(shape.widthMm).toBeGreaterThan(0);
    expect(shape.heightMm).toBeGreaterThan(0);
    expect(resolvePart(state, "pack.mystery")).toBe(shape);
  });

  it("is an empty box when nothing was pinned", () => {
    const shape = resolvePart(project(), "pack.nothing");
    expect(shape).toMatchObject({ known: false, pins: [] });
    expect(shape.widthMm).toBeGreaterThan(0);
  });

  it("serves the same shape object for the same descriptor", () => {
    const state = project();
    expect(resolvePart(state, "core.resistor")).toBe(resolvePart(state, "core.resistor"));
  });
});

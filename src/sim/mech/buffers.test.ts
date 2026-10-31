// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createBuffers } from "./buffers.ts";

describe("buffers", () => {
  it("reads prev inside a step and next at its end", () => {
    const b = createBuffers();
    b.next.atNs = 100;
    b.swap();
    b.next.atNs = 200;
    expect(b.prev.atNs).toBe(100);
    for (const at of [100, 125, 199]) expect(b.readAt(at)).toBe(b.prev);
    expect(b.readAt(200)).toBe(b.next);
  });

  it("returns the state of t for sixteen reads spread over one step", () => {
    const b = createBuffers();
    b.next.atNs = 0;
    b.next.joints.set("w", { angle: 1, speed: 0, torque: 0 });
    b.swap();
    b.next.atNs = 160;
    b.next.joints.set("w", { angle: 2, speed: 0, torque: 0 });
    for (let i = 0; i < 16; i++) expect(b.readAt(i * 10).joints.get("w")?.angle).toBe(1);
  });
});

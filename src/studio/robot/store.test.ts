// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createRobotStore } from "./store";

describe("robot store", () => {
  it("keeps the physics engine state the worker reports and clears it on reset", () => {
    const store = createRobotStore();
    expect(store.get().physics).toEqual({ state: null });
    store.apply({ t: "mech_status", state: "loading-physics", wireBytes: 150_000 });
    expect(store.get().physics).toEqual({ state: "loading-physics", wireBytes: 150_000 });
    store.apply({ t: "mech_status", state: "failed", reason: "physics engine not available offline" });
    expect(store.get().physics).toEqual({ state: "failed", reason: "physics engine not available offline" });
    store.reset();
    expect(store.get().physics).toEqual({ state: null });
  });
});

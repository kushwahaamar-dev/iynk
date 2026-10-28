// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { digestOf } from "./descriptor.ts";
import type { Descriptor } from "./descriptor.ts";
import { createRegistry } from "./registry.ts";

const load = (name: string): Descriptor =>
  JSON.parse(
    readFileSync(
      new URL(`../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/${name}.component.json`, import.meta.url),
      "utf8",
    ),
  );

const withVersion = (version: string): Descriptor => ({ ...load("led-5mm"), version });

describe("createRegistry", () => {
  it("stores a part and finds it by id and version", () => {
    const registry = createRegistry();
    const led = load("led-5mm");
    const added = registry.add(led);
    expect(added.ok).toBe(true);
    expect(registry.has("core.led-5mm", led.version)).toBe(true);
    expect(registry.get("core.led-5mm", led.version)).toEqual(led);
    expect(registry.get("core.led-5mm", "9.9.9")).toBeUndefined();
    expect(registry.get("core.nothing", "1.0.0")).toBeUndefined();
  });

  it("summarises what it holds", () => {
    const registry = createRegistry();
    const led = load("led-5mm");
    registry.add(led);
    const [summary, ...rest] = registry.list();
    expect(rest).toEqual([]);
    expect(summary).toMatchObject({
      ref: "core.led-5mm",
      version: led.version,
      category: led.identity.category,
      tier: led.simulation.tier,
      status: led.simulation.status,
      digest: digestOf(led),
    });
    expect(summary?.bytes).toBeGreaterThan(1000);
  });

  it("orders versions numerically and returns the newest as latest", () => {
    const registry = createRegistry();
    for (const v of ["1.10.0", "1.2.0", "1.9.3"]) expect(registry.add(withVersion(v)).ok).toBe(true);
    expect(registry.versions("core.led-5mm")).toEqual(["1.2.0", "1.9.3", "1.10.0"]);
    expect(registry.latest("core.led-5mm")?.version).toBe("1.10.0");
    expect(registry.versions("core.nothing")).toEqual([]);
    expect(registry.latest("core.nothing")).toBeUndefined();
  });

  it("keeps the old version when a newer one is added", () => {
    const registry = createRegistry();
    const old = withVersion("1.0.0");
    registry.add(old);
    registry.add(withVersion("1.1.0"));
    expect(registry.get("core.led-5mm", "1.0.0")).toEqual(old);
  });

  it("refuses the same id and version with different contents", () => {
    const registry = createRegistry();
    registry.add(load("led-5mm"));
    const other = load("led-5mm");
    other.identity.model = "Changed";
    const result = registry.add(other);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.map((x) => x.code)).toEqual(["P-DUP-BYTES"]);
    expect(registry.list()).toHaveLength(1);
  });

  it("takes the same bytes twice without adding a second entry", () => {
    const registry = createRegistry();
    registry.add(load("led-5mm"));
    expect(registry.add(load("led-5mm")).ok).toBe(true);
    expect(registry.list()).toHaveLength(1);
    expect(registry.versions("core.led-5mm")).toHaveLength(1);
  });

  it("does not add a part with an error", () => {
    const registry = createRegistry();
    const bad = load("led-5mm") as Record<string, unknown>;
    delete bad.visual;
    const result = registry.add(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error[0]?.code).toBe("P-SCHEMA");
    expect(registry.list()).toEqual([]);
  });

  it("finds a part by an old figure id", () => {
    const registry = createRegistry();
    registry.add(load("led-5mm"));
    expect(registry.resolveLegacy("led")).toBe("core.led-5mm");
    expect(registry.resolveLegacy("nothing")).toBeUndefined();
  });
});

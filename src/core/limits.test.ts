// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIMITS, overLimit } from "./limits.ts";
import type { LimitName } from "./limits.ts";

type Node = Record<string, unknown>;
const schema = JSON.parse(
  readFileSync(new URL("../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/project.schema.json", import.meta.url), "utf8"),
) as Node;

function maxItemsAt(path: string): unknown {
  let node: unknown = schema;
  for (const key of path.split("/").filter(Boolean)) node = (node as Node)[key];
  return (node as Node).maxItems;
}

const SCHEMA_PATHS: Partial<Record<LimitName, string>> = {
  boards: "/properties/boards",
  components: "/properties/components",
  nets: "/properties/nets",
  connectionsPerNet: "/$defs/Net/properties/connections",
  views: "/properties/views",
  placementsPerView: "/$defs/View/properties/placements",
  wiresPerView: "/$defs/View/properties/wires",
  junctionsPerView: "/$defs/View/properties/junctions",
  labelsPerView: "/$defs/View/properties/labels",
  sources: "/properties/sources",
  assets: "/properties/assets",
  parameters: "/properties/parameters",
  tests: "/properties/tests",
  checksPerTest: "/$defs/TestCase/properties/checks",
  worldInputs: "/$defs/Simulation/properties/world/properties/inputs",
  scriptEvents: "/$defs/Simulation/properties/world/properties/script",
  faults: "/$defs/Simulation/properties/faults",
  instruments: "/$defs/Simulation/properties/instruments",
  historyOps: "/$defs/History/properties/ops",
  checkpoints: "/$defs/History/properties/checkpoints",
  interfacePins: "/$defs/ComponentDependency/properties/interface/properties/pins",
  interfaceGroups: "/$defs/ComponentDependency/properties/interface/properties/groups",
  interfaceParams: "/$defs/ComponentDependency/properties/interface/properties/params",
  pinsPerGroup: "/$defs/InterfaceGroup/properties/pins",
};

describe("LIMITS", () => {
  it.each(Object.entries(SCHEMA_PATHS))("%s equals the schema maxItems", (name, path) => {
    expect(LIMITS[name as LimitName]).toBe(maxItemsAt(path));
  });

  it("holds the byte and range limits from the data model", () => {
    expect(LIMITS.canonicalBytes).toBe(5 * 1024 * 1024);
    expect(LIMITS.sourceBytes).toBe(256 * 1024);
    expect(LIMITS.assetBytes).toBe(16 * 1024 * 1024);
    expect(LIMITS.containerBytes).toBe(128 * 1024 * 1024);
    expect(LIMITS.opEnvelopeBytes).toBe(64 * 1024);
    expect(LIMITS.descriptorBytes).toBe(256 * 1024);
    expect(LIMITS.jsonDepth).toBe(32);
    expect(LIMITS.layoutAbsMm).toBe(1_000_000);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(LIMITS)).toBe(true);
  });
});

describe("overLimit", () => {
  it("is null at the limit and an error one above", () => {
    expect(overLimit("nets", LIMITS.nets)).toBeNull();
    const d = overLimit("nets", LIMITS.nets + 1);
    expect(d).toMatchObject({ code: "V4-NETS", severity: "error" });
    expect(d?.message).toContain("nets");
    expect(d?.message).toContain(String(LIMITS.nets));
  });

  it("writes camel case names as upper snake codes", () => {
    expect(overLimit("canonicalBytes", LIMITS.canonicalBytes + 1)?.code).toBe("V4-CANONICAL_BYTES");
    expect(overLimit("connectionsPerNet", LIMITS.connectionsPerNet + 1)?.code).toBe("V4-CONNECTIONS_PER_NET");
  });
});

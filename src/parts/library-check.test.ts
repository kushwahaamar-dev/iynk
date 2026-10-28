// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extractPartLegs } from "../../scripts/figure-extract.mjs";
import { loadExample } from "../project/apply/fixtures.testing.ts";
import type { ExampleName } from "../project/apply/fixtures.testing.ts";
import { PART_REFS, partInterface } from "../project/convert/interfaces.ts";
import type { ComponentDependency, Fault, Project } from "../project/generated/types.ts";
import { builtinRegistry } from "./builtin.ts";
import { digestOf } from "./descriptor.ts";
import type { Descriptor } from "./descriptor.ts";
import { checkLibrary, compareInterface, placeholderFor, refreshInterface } from "./library-check.ts";
import { interfaceOf } from "./pins.ts";
import { createRegistry } from "./registry.ts";

const registry = builtinRegistry();
const led = registry.get("core.led-5mm", "1.0.0")!;
const uno = registry.get("core.uno-r3", "1.0.0")!;

const pinned = (d: Descriptor, origin: ComponentDependency["origin"] = "builtin"): ComponentDependency => ({
  ref: d.id,
  version: d.version,
  origin,
  interface: interfaceOf(d),
});

function projectWith(dep: ComponentDependency, faults: Fault[] = []): Project {
  const doc = loadExample("uno-blink-d12");
  doc.dependencies.components = [dep];
  doc.simulation.faults = faults;
  return doc;
}

const codes = (diagnostics: { code: string }[]): string[] => diagnostics.map((d) => d.code);

describe("compareInterface", () => {
  it("finds nothing between an interface and itself", () => {
    expect(compareInterface(interfaceOf(uno), interfaceOf(uno))).toEqual([]);
  });

  it("ignores the legacy net and header fields", () => {
    const legacy = interfaceOf(uno);
    for (const pin of legacy.pins) Object.assign(pin, { net: "X", header: "J1" });
    expect(compareInterface(legacy, interfaceOf(uno))).toEqual([]);
  });

  it("does not count class, polarity or position the snapshot leaves out", () => {
    const bare = interfaceOf(led);
    for (const pin of bare.pins) {
      delete pin.class;
      delete pin.polarity;
      delete pin.position;
    }
    expect(compareInterface(bare, interfaceOf(led))).toEqual([]);
  });

  it("names a renamed pin on both sides", () => {
    const old = interfaceOf(led);
    old.pins[0].id = "ANODE";
    expect(compareInterface(old, interfaceOf(led))).toEqual(["/pins/ANODE", "/pins/A"]);
  });

  it("names the field of a pin that changed", () => {
    const old = interfaceOf(led);
    old.pins[0].type = "digital_io";
    old.pins[1].polarity = "anode";
    expect(compareInterface(old, interfaceOf(led))).toEqual(["/pins/A/type", "/pins/K/polarity"]);
  });

  it("reports a role change, a changed group and a changed parameter", () => {
    const button = registry.get("core.push-button-6mm", "1.0.0")!;
    const old = interfaceOf(button);
    old.role = "board";
    old.groups![0].pins = [old.groups![0].pins[0], old.groups![1].pins[0]];
    expect(compareInterface(old, interfaceOf(button))).toEqual(["/role", `/groups/${old.groups![0].id}/pins`]);

    const pot = registry.get("core.potentiometer-10k", "1.0.0")!;
    const params = interfaceOf(pot);
    if (params.params.length === 0) throw new Error("the potentiometer pins no parameters");
    const changed = structuredClone(params);
    changed.params[0].default = "other";
    expect(compareInterface(changed, params)).toEqual([`/params/${params.params[0].id}/default`]);
    changed.params.shift();
    expect(compareInterface(changed, params)).toEqual([`/params/${params.params[0].id}`]);
  });
});

describe("checkLibrary", () => {
  it("is quiet for a builtin part that matches", () => {
    expect(checkLibrary(projectWith(pinned(led)), registry)).toEqual([]);
  });

  it("warns once about a part the library does not have and keeps its pins", () => {
    const missing = pinned(led);
    missing.ref = "core.mystery-sensor";
    const doc = projectWith(missing);
    const found = checkLibrary(doc, registry);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ code: "V6-UNKNOWN-PART", severity: "warning", path: "/dependencies/components/0" });
    expect(doc.dependencies.components[0].interface.pins).toHaveLength(2);
  });

  it("does not call an embedded part with its own definition unknown", () => {
    const embedded = { ...pinned(led, "embedded"), ref: "local.mine", digest: digestOf(led), definition: led };
    expect(checkLibrary(projectWith(embedded), registry)).toEqual([]);
  });

  it("names the pin when the descriptor renamed it", () => {
    const rename = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(rename)
        : value !== null && typeof value === "object"
          ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === "unit" ? v : rename(v)]))
          : value === "A"
            ? "ANODE"
            : value;
    const renamed = rename(led) as Descriptor;
    const reg = createRegistry();
    const added = reg.add(renamed, { origin: "core" });
    expect(added.ok, JSON.stringify(!added.ok && added.error)).toBe(true);
    const found = checkLibrary(projectWith(pinned(led)), reg);
    expect(codes(found)).toEqual(["V6-INTERFACE-DRIFT"]);
    expect(found[0].severity).toBe("warning");
    expect(found[0].message).toContain("/pins/A");
    expect(found[0].message).toContain("/pins/ANODE");
  });

  it("checks the digest of a library or embedded part and not of a builtin one", () => {
    const stale = { ...pinned(led, "library"), digest: "sha256:" + "0".repeat(64) };
    expect(codes(checkLibrary(projectWith(stale), registry))).toEqual(["V6-DIGEST"]);
    expect(codes(checkLibrary(projectWith({ ...stale, origin: "embedded" }), registry))).toEqual(["V6-DIGEST"]);
    expect(codes(checkLibrary(projectWith({ ...stale, digest: digestOf(led) }), registry))).toEqual([]);
    expect(codes(checkLibrary(projectWith({ ...pinned(led, "library") }), registry))).toEqual(["V6-DIGEST"]);
    expect(codes(checkLibrary(projectWith({ ...stale, origin: "builtin" }), registry))).toEqual([]);
  });

  describe("injectable faults", () => {
    const withInstance = (injectable: Fault["injectable"]): Project => {
      const doc = projectWith(pinned(led));
      const instance = doc.components.find((c) => c.definition.ref === "core.led-5mm")!;
      const fault: Fault = {
        id: "flt_x",
        cause_id: "x",
        symptom_ids: [],
        kind: "short",
        target: { component: instance.id },
        enabled: true,
        ...(injectable && { injectable }),
      };
      doc.simulation.faults = [fault];
      return doc;
    };
    const instanceId = (doc: Project) => doc.components.find((c) => c.definition.ref === "core.led-5mm")!.id;

    it("resolves a declared fault", () => {
      const probe = withInstance(undefined);
      const declared = led.injectable_faults![0].id;
      expect(checkLibrary(withInstance({ component: instanceId(probe), id: declared }), registry)).toEqual([]);
    });

    it("warns when the part declares no such fault", () => {
      const probe = withInstance(undefined);
      const found = checkLibrary(withInstance({ component: instanceId(probe), id: "no-such-fault" }), registry);
      expect(found).toHaveLength(1);
      expect(found[0]).toMatchObject({ code: "V6-FAULT-DRIFT", severity: "warning", path: "/simulation/faults/0/injectable" });
    });

    it("warns when the instance is gone", () => {
      expect(codes(checkLibrary(withInstance({ component: "cmp_gone", id: led.injectable_faults![0].id }), registry))).toEqual([
        "V6-FAULT-DRIFT",
      ]);
    });

    it("leaves a fault without an injectable alone", () => {
      expect(checkLibrary(withInstance(undefined), registry)).toEqual([]);
    });
  });

  describe("surfaces", () => {
    const surface = (origin: ComponentDependency["origin"]): ComponentDependency => ({
      ref: "core.breadboard-half",
      version: "1.0.0",
      origin,
      interface: { role: "surface", pins: [], params: [] },
    });

    it.each(["builtin", "library", "embedded"] as const)("is an error for an empty %s surface, even without a registry", (origin) => {
      const found = checkLibrary(projectWith(surface(origin)));
      expect(found).toHaveLength(1);
      expect(found[0]).toMatchObject({ code: "V6-SURFACE-EMPTY", severity: "error", path: "/dependencies/components/0/interface/pins" });
    });

    it("is quiet for a surface with holes", () => {
      const full = surface("builtin");
      full.interface.pins = [{ id: "a1", type: "passive", class: "passive" }];
      expect(checkLibrary(projectWith(full))).toEqual([]);
    });
  });
});

describe("the examples against the builtin parts", () => {
  const EXPECTED: Record<ExampleName, string[]> = {
    "uno-blink-d12": ["V6-SURFACE-EMPTY /dependencies/components/0/interface/pins", "V6-INTERFACE-DRIFT /dependencies/components/0/interface"],
    "lesson-uno-r3-button": [
      "V6-SURFACE-EMPTY /dependencies/components/0/interface/pins",
      "V6-INTERFACE-DRIFT /dependencies/components/0/interface",
    ],
    "env-monitor-esp32": [
      "V6-UNKNOWN-PART /dependencies/components/0",
      "V6-UNKNOWN-PART /dependencies/components/1",
      "V6-UNKNOWN-PART /dependencies/components/4",
    ],
    "robot-line-follower": [0, 1, 2, 3, 4].map((i) => `V6-UNKNOWN-PART /dependencies/components/${i}`),
    "drone-quad": [0, 1, 2, 3, 4, 5].map((i) => `V6-UNKNOWN-PART /dependencies/components/${i}`),
  };

  it.each(Object.keys(EXPECTED) as ExampleName[])("%s has only the expected findings", (name) => {
    const found = checkLibrary(loadExample(name), registry).map((d) => `${d.code} ${d.path}`);
    expect(found).toEqual(EXPECTED[name]);
  });

  it("finds drift only where an example pins a breadboard with no holes", () => {
    for (const name of Object.keys(EXPECTED) as ExampleName[]) {
      const drift = codes(checkLibrary(loadExample(name), registry)).filter((c) => c === "V6-INTERFACE-DRIFT");
      expect(drift).toHaveLength(name === "uno-blink-d12" || name === "lesson-uno-r3-button" ? 1 : 0);
    }
  });
});

// What the converter's snapshots differ in today, recorded as data. It pins no parameters and types every leg passive.
const CONVERTER_DRIFT: Record<string, string[]> = {
  led: ["/params/color"],
  resistor: ["/params/ohms"],
  "push-button": [],
  potentiometer: ["/params/ohms", "/params/pos"],
  "piezo-buzzer": ["/params/kind"],
  ssd1306: ["GND", "VCC", "SCL", "SDA"].flatMap((pin) => [`/pins/${pin}/type`, `/pins/${pin}/class`]).concat("/params/address"),
};

describe("the converter's part table against the library", () => {
  it.each(Object.entries(PART_REFS))("%s resolves and its figure legs match the descriptor", async (figurePart, { ref, version }) => {
    const descriptor = registry.get(ref, version);
    expect(descriptor, `${ref}@${version}`).toBeDefined();
    const legs = (await extractPartLegs(`figures/parts/${figurePart}.js`)) as string[];
    expect(compareInterface(partInterface(figurePart, legs), interfaceOf(descriptor!))).toEqual(CONVERTER_DRIFT[figurePart]);
  });
});

describe("refreshInterface", () => {
  it("derives the interface again and keeps the rest", () => {
    const old = { ...pinned(led, "library"), digest: "sha256:" + "0".repeat(64) };
    old.interface.pins = old.interface.pins.slice(1);
    const refreshed = refreshInterface(old, led);
    expect(refreshed.interface).toEqual(interfaceOf(led));
    expect(refreshed.digest).toBe(digestOf(led));
    expect(refreshed.ref).toBe(old.ref);
    expect(old.interface.pins).toHaveLength(1);
  });

  it("adds no digest to a dependency that had none", () => {
    expect(refreshInterface(pinned(led), led)).not.toHaveProperty("digest");
  });
});

describe("placeholderFor", () => {
  it("lays out a 44-pin snapshot, labelled with the part ref", () => {
    const dep = pinned(uno);
    expect(dep.interface.pins).toHaveLength(44);
    const spec = placeholderFor(dep);
    expect(spec.pins.map((p) => p.id)).toEqual(dep.interface.pins.map((p) => p.id));
    expect(spec.label).toBe("core.uno-r3");
    expect(spec.renderer).toBe("generic-box");
    expect(new Set(spec.pins.map((p) => `${p.x_mm},${p.y_mm}`)).size).toBe(44);
  });
});

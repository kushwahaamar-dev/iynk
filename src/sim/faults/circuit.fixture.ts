import { builtinRegistry } from "../../parts/builtin.ts";
import type { SimNetlist, SimPart } from "../engine.ts";
import { buildNetView } from "./netlist-view.ts";
import type { CodeFacts, NetView } from "./types.ts";

const registry = builtinRegistry();

export const describePart = (id: string) => {
  const [ref = "", version = ""] = id.split("@");
  return registry.get(ref, version);
};

export type Wiring = Record<string, string>;
export interface PartSpec {
  id: string;
  ref: "uno-r3" | "led-5mm" | "resistor" | "push-button-6mm" | "buzzer-piezo" | "potentiometer-10k" | "ssd1306";
  wires: Wiring;
}

const descriptorId = (ref: PartSpec["ref"]): string => `core.${ref}@${registry.latest(`core.${ref}`)?.version ?? ""}`;

/** A netlist with the pins you name wired and every other pin of the part left open. */
export function netlistOf(specs: PartSpec[], ground = "gnd"): SimNetlist {
  const nets = new Set<string>([ground]);
  const parts: SimPart[] = specs.map((spec) => {
    const id = descriptorId(spec.ref);
    const d = describePart(id);
    const pins: SimPart["pins"] = {};
    for (const p of d?.pins ?? []) pins[p.id] = spec.wires[p.id] ?? null;
    for (const n of Object.values(spec.wires)) nets.add(n);
    return { id: spec.id, descriptor: id, params: {}, pins, kind: spec.ref === "uno-r3" ? "board" : "other" };
  });
  return {
    version: 1,
    docHash: "test",
    nets: [...nets].map((id) => ({ id })),
    ground,
    parts,
    settings: { seed: 1, toleranceMode: "nominal", analog: { mode: "dc-event", stepNs: 1000 }, speed: 1 },
  };
}

export const viewOf = (specs: PartSpec[], ground = "gnd"): NetView => buildNetView(netlistOf(specs, ground), describePart);

export function codeOf(parts: Partial<Pick<CodeFacts, "pinModes" | "pinWrites" | "pinReads">>): CodeFacts {
  return { language: "arduino-cpp", pinModes: [], pinWrites: [], pinReads: [], i2cAddresses: [], unresolved: 0, ...parts };
}

const at = { file: "main.ino", line: 1 };
export const mode = (pin: string, m: "INPUT" | "OUTPUT" | "INPUT_PULLUP") => ({ value: { pin, mode: m }, ...at });
export const read = (pin: string, fn: "digitalRead" | "analogRead" = "digitalRead") => ({ value: { pin, fn }, ...at });

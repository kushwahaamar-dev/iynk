import { bigProject, startProject } from "../../project/testing/generators.ts";
import type { Net, Project } from "../../project/generated/types.ts";
import type { Locale } from "../../i18n/config.ts";
import type { PackInput } from "./pack.ts";
import type { ItemState, PartnerSources, RunSnapshot } from "../sources.ts";
import type { Diagnosis } from "../../project/diagnosis.ts";

export type Overrides = {
  doc?: Project;
  selection?: readonly string[];
  run?: RunSnapshot | null;
  diagnoses?: readonly Diagnosis[];
  itemState?: ItemState | null;
};

export function stubSources(o: Overrides = {}): PartnerSources {
  const doc = o.doc ?? blink2();
  return {
    locale: () => "en" as Locale,
    project: () => ({ revision: 142, stateHash: "9f2c41ab0000000000000000000000000000000000000000000000000000abcd", doc }),
    selection: () => o.selection ?? [],
    run: () => o.run ?? null,
    trace: () => ({ ok: false, code: "no_run" }),
    diagnoses: () => o.diagnoses ?? [],
    itemState: () => o.itemState ?? null,
    registry: () => {
      throw new Error("the pack does not read the registry");
    },
    rules: () => [],
    actors: () => new Map(),
  };
}

/** The generated start project with the two blink nets wired and a short sketch. */
export function blink2(): Project {
  const doc = startProject(7);
  const nets: Net[] = [
    { id: "net_a1", name: "A1", class: "signal", connections: [{ c: "cmp_r1", p: "P2" }, { c: "cmp_d1", p: "anode" }] },
    { id: "net_d12", name: "D12", class: "signal", connections: [{ c: "brd_main", p: "D12" }, { c: "cmp_r1", p: "P1" }] },
  ];
  return {
    ...doc,
    nets,
    sources: [
      {
        ...doc.sources[0]!,
        content: "void setup() {\n  pinMode(12, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(12, HIGH);\n  delay(500);\n}\n",
      },
    ],
  };
}

export function packInput(o: Overrides = {}, extra: Partial<PackInput> = {}): PackInput {
  return {
    sources: stubSources(o),
    mode: "debugging",
    profile: "standard",
    thread: { summary: null, turns: [] },
    userMessage: "why does D12 read 0",
    nonce: "K7QX2LM9",
    toggles: {},
    correction: 1,
    ...extra,
  };
}

export function scene(parts: number, wires: number): Project {
  return bigProject(parts, wires, 3);
}

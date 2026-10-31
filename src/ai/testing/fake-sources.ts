import { builtinRegistry } from "../../parts/builtin.ts";
import { sampleBlinkD12 } from "../../project/samples.ts";
import type { Project } from "../../project/generated/types.ts";
import type { PartnerSources, RunSnapshot, RuleFinding } from "../sources.ts";

export type FakeSourcesInit = {
  doc?: Project;
  selection?: readonly string[];
  run?: RunSnapshot | null;
  diagnoses?: ReturnType<PartnerSources["diagnoses"]>;
  itemState?: ReturnType<PartnerSources["itemState"]>;
  rules?: readonly RuleFinding[];
};

/** A `PartnerSources` over the blink-on-D12 sample and the built-in parts. Every field can be replaced. */
export function fakeSources(init: FakeSourcesInit = {}): PartnerSources {
  const doc = init.doc ?? (sampleBlinkD12() as Project);
  const registry = builtinRegistry();
  return {
    locale: () => "en",
    project: () => ({ revision: doc.revision, stateHash: "0".repeat(64), doc }),
    selection: () => init.selection ?? [],
    run: () => init.run ?? null,
    trace: () => ({ ok: false, code: "no_run" }),
    diagnoses: () => init.diagnoses ?? [],
    itemState: () => init.itemState ?? null,
    registry: () => registry,
    rules: () => init.rules ?? [],
    actors: () => new Map(doc.actors.map((a, i) => [a.id, i === 0 ? "you" : `buddy-${i}`])),
  };
}

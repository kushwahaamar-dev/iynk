import { GENERATED_DESCRIPTORS } from "./data/index.generated.ts";
import { createRegistry } from "./registry.ts";
import type { PartRegistry } from "./registry.ts";

// To add a part: drop `<name>.component.json` into ./data and run `npm run content`, which regenerates the barrel.
// `builtinRegistry` refuses to build if any file fails validation, and `npm run schema:check` reads every file in ./data.
export const BUILTIN_DESCRIPTORS: readonly unknown[] = [...GENERATED_DESCRIPTORS];

/** A registry holding every part that ships with iynk. A shipped file that fails validation is a build bug, so it throws. */
export function builtinRegistry(): PartRegistry {
  const registry = createRegistry();
  for (const descriptor of BUILTIN_DESCRIPTORS) {
    const added = registry.add(descriptor, { origin: "core" });
    if (!added.ok) {
      const lines = added.error.map((d) => `${d.code} ${d.path}: ${d.message}`);
      throw new Error(`a built-in part is invalid:\n${lines.join("\n")}`);
    }
  }
  return registry;
}

let appRegistry: PartRegistry | undefined;

/** The one registry the app shares: Studio, the orchestrator and the library all read this instance. */
export function getAppRegistry(): PartRegistry {
  appRegistry ??= builtinRegistry();
  return appRegistry;
}

import uno from "./data/uno-r3.component.json" with { type: "json" };
import { createRegistry } from "./registry.ts";
import type { PartRegistry } from "./registry.ts";

// To add a part: drop `<name>.component.json` into ./data, import it above with `with { type: "json" }` and add it
// to the list below. `builtinRegistry` refuses to build if any listed file fails validation, and `npm run schema:check`
// reads every file in ./data.
export const BUILTIN_DESCRIPTORS: readonly unknown[] = [uno];

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

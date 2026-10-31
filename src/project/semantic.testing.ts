import type { Project } from "./generated/types.ts";
import { surfaceInterface } from "./holes.ts";

/** The examples pin a breadboard with no holes (V6-SURFACE-EMPTY); the hole and strip rules need the real ones. */
export function withHoles(doc: Project): Project {
  for (const dep of doc.dependencies.components) {
    if (dep.interface.role === "surface") dep.interface = surfaceInterface("half");
  }
  return doc;
}

import { StateHasher } from "../core/hash.ts";
import type { SimTime } from "../core/clock.ts";
import type { PinEdge } from "../orchestrator.ts";

/** Hash of the pin edges in order: time, net and level of each. */
export function pinTraceHash(edges: readonly PinEdge[]): string {
  const hasher = new StateHasher().int(edges.length);
  for (const edge of edges) hasher.int(edge.at).str(edge.net).str(String(edge.level));
  return hasher.hex();
}

/** Hash of the serial output in order: time and text of each write. */
export function serialHash(lines: ReadonlyArray<{ at: SimTime; text: string }>): string {
  const hasher = new StateHasher().int(lines.length);
  for (const line of lines) hasher.int(line.at).str(line.text);
  return hasher.hex();
}

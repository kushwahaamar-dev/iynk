import type { PinRef, WorldInput as ProjectWorldInput } from "../project/generated/types.ts";
import { type SimDiagnostic, simDiag } from "./core/diagnostic.ts";
import { railLevels } from "./digital/nets.ts";
import type { SimNetlist } from "./engine.ts";

/**
 * The board pins a world input reaches through the wires: for each pin of the input's part (or the pins the input
 * lists), the board pins on its net, apart from ground and power. Two different board pins on one net are ambiguous
 * and that net contributes none.
 */
export function deriveInputPins(net: SimNetlist, input: ProjectWorldInput): { pins: string[]; diagnostics: SimDiagnostic[] } {
  const diagnostics: SimDiagnostic[] = [];
  const part = net.parts.find((p) => p.id === input.component);
  if (!part) {
    diagnostics.push(simDiag("unknown-part", "error", { part: input.component }));
    return { pins: [], diagnostics };
  }

  const rails = railLevels(net);
  const boardPins = new Map<string, string[]>();
  for (const board of net.parts) {
    if (board.kind !== "board") continue;
    for (const [pin, target] of Object.entries(board.pins)) {
      if (target === null || rails.has(target)) continue;
      boardPins.set(target, [...(boardPins.get(target) ?? []), pin]);
    }
  }

  const refs: PinRef[] = input.pins ?? Object.keys(part.pins).map((p) => ({ c: part.id, p }));
  const pins: string[] = [];
  const ambiguous = new Set<string>();
  for (const ref of refs) {
    const target = net.parts.find((p) => p.id === ref.c)?.pins[ref.p];
    const found = target == null ? undefined : boardPins.get(target);
    if (!found) continue;
    if (found.length > 1) {
      if (ambiguous.has(target!)) continue;
      ambiguous.add(target!);
      diagnostics.push(simDiag("ambiguous-input-pin", "error", { part: part.id, pin: ref, net: target! }, { pins: found.join(", ") }));
      continue;
    }
    if (!pins.includes(found[0])) pins.push(found[0]);
  }
  return { pins, diagnostics };
}

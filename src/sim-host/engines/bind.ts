import type { WorldInput as LegacyWorldInput } from "@/content/schema";
import { netResolver } from "@/lib/interp/pins";
import { WorldBinding } from "@/lib/interp/lesson-world";
import type { BoardProfile } from "@/lib/interp/profiles";
import type { WorldInput as ProjectWorldInput } from "@/project/generated/types";
import type { SimNetlist } from "@/sim/engine";
import { deriveInputPins } from "@/sim/world-pins";
import type { InterpEngine } from "./interp-engine";

type BuiltinInput = ProjectWorldInput & { device: LegacyWorldInput["device"] };

/** Registry devices have no interpreter model, so `WorldBinding` has nothing to do with them. */
const isBuiltin = (input: ProjectWorldInput): input is BuiltinInput => input.device.kind !== "registry";

/** The input in the shape `WorldBinding` reads: the pins come from the wires, not from the lesson. */
function legacyInput(net: SimNetlist, input: BuiltinInput): LegacyWorldInput {
  return {
    id: input.id,
    quantity: input.quantity,
    device: input.device,
    pins: deriveInputPins(net, input).pins,
    part: input.component,
    min: input.min,
    max: input.max,
    step: input.step,
    default: input.default,
    unit: input.unit,
    gesture: "tap",
    label: input.id,
  };
}

/**
 * Wires a project's world inputs to the engine's run through the netlist. `inputs` are the converted inputs, with the
 * pins the wires give; pass them to `binding.apply`.
 */
export function bindWorld(
  engine: InterpEngine,
  net: SimNetlist,
  inputs: ProjectWorldInput[],
  profile: BoardProfile,
): { binding: WorldBinding; inputs: LegacyWorldInput[] } {
  const converted = inputs.filter(isBuiltin).map((i) => legacyInput(net, i));
  const binding = new WorldBinding(engine.run, { inputs: converted, script: [] }, { logicV: profile.logicV, resolve: netResolver(profile) });
  return { binding, inputs: converted };
}

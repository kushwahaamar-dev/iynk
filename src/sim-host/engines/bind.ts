import type { WorldInput as LegacyWorldInput } from "@/content/schema";
import { netResolver, pinNet } from "@/lib/interp/pins";
import { WorldBinding } from "@/lib/interp/lesson-world";
import type { BoardProfile } from "@/lib/interp/profiles";
import type { WorldInput as ProjectWorldInput } from "@/project/generated/types";
import type { BusEvent } from "@/sim/bus";
import type { Descriptor } from "@/parts/descriptor";
import { type LiveAnalog, pinElementId } from "@/sim/analog/live";
import type { SimNetlist, SimPart } from "@/sim/engine";
import { bindI2c, instantiateNetlistDevices, netlistContext } from "@/sim/mcu/i2c-bind";
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

/** `analogRead` on the engine's board returns what the solver finds on the pin. */
export function bindAnalog(engine: InterpEngine, live: LiveAnalog, board: string, profile: BoardProfile): void {
  engine.run.world.setAnalogSource((pin) => live.pinVolts(pinElementId(board, pinNet(profile, pin))));
}

/**
 * Makes the netlist the only source of I2C devices: each `Wire.begin` binds the bus to the nets on the pins it names,
 * and only parts wired to those nets answer. A pin nothing is wired to is reported as a warning to the learner.
 */
export function bindI2cBus(
  engine: InterpEngine,
  net: SimNetlist,
  board: string,
  profile: BoardProfile,
  descriptorOf: (part: SimPart) => Descriptor | undefined,
  onEvent: (e: BusEvent) => void,
  volts?: (net: string) => number | undefined,
): void {
  const { world } = engine.run;
  world.deviceSource = "netlist";
  world.i2cBinder = (sda, scl) => {
    const bound = bindI2c(net, board, { sda: pinNet(profile, sda), scl: pinNet(profile, scl) }, descriptorOf);
    if (!bound.ok) {
      world.warn(
        bound.reason === "pins-on-one-net"
          ? `Wire.begin(${sda}, ${scl}): both pins are on the same wire`
          : `Wire.begin(${sda}, ${scl}): ${bound.pin} is not wired to anything`,
      );
      world.bus.bindNetlist({ sdaNet: "", sclNet: "", speedHz: 100_000, pullup: { kind: "assumed" } }, []);
      return;
    }
    const ctx = netlistContext(net, profile.logicV, () => Math.round(world.clock.now * 1000), onEvent, volts);
    const { devices, events } = instantiateNetlistDevices(net, bound.binding, descriptorOf, ctx);
    for (const e of events) onEvent(e);
    world.bus.bindNetlist(bound.binding, devices);
  };
}

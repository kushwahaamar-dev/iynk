import type { Layer } from "../../parts/generated/types.ts";
import { loadDevice } from "../devices/loader.ts";
import type { DeviceContext } from "../devices/register-map.ts";
import type { ParamScalar } from "./kinds.ts";

export type LayerDomain = Layer["domain"];

export interface BuiltinImpl {
  ref: string;
  domain: LayerDomain;
  bind: "i2c-device" | "netlist-hook";
  make(params: Readonly<Record<string, ParamScalar>>): unknown;
}

/** A register-map device that `src/sim/mcu/i2c-bind.ts` binds: `make` returns the function that builds it for a bus. */
const registerDevice = (ref: string): BuiltinImpl => ({
  ref,
  domain: "protocol",
  bind: "i2c-device",
  make: () => (ctx: DeviceContext) => loadDevice(ref, ctx),
});

/** A device the registry lists whose behaviour the netlist builder wires in; `make` returns what the hook needs. */
const netlistHook = (ref: string): BuiltinImpl => ({
  ref,
  domain: "protocol",
  bind: "netlist-hook",
  make: (params) => ({ ref, params }),
});

const IMPLS: readonly BuiltinImpl[] = [
  registerDevice("device:i2c/mpu6050@1"),
  registerDevice("device:i2c/bme280@1"),
  netlistHook("device:ssd1306@1"),
  netlistHook("device:pca9685@1"),
];

/** Behaviour code that lives only in a figure page (`module:l298n-bridge@1`, `power:linear-regulator@1`) is not here: the Studio cannot run it. */
export const BUILTINS: ReadonlyMap<string, BuiltinImpl> = new Map(IMPLS.map((impl) => [impl.ref, impl]));

export function builtinRefsForImport(): ReadonlySet<string> {
  return new Set(BUILTINS.keys());
}

import type { Descriptor } from "../../parts/descriptor.ts";
import type { BusEvent } from "../bus/index.ts";
import type { I2cDevice } from "../bus/i2c.ts";
import type { DeviceContext } from "../devices/register-map.ts";
import { loadDevice } from "../devices/loader.ts";
import { railLevels } from "../digital/nets.ts";
import type { SimNetlist, SimPart } from "../engine.ts";

const DEFAULT_I2C_HZ = 100_000;
const DEVICE_REF = /^device:i2c\/[a-z0-9_-]+@\d+$/;
const ANALOG_KINDS: readonly SimPart["kind"][] = ["resistor", "pot"];

export interface I2cBinding {
  sdaNet: string;
  sclNet: string;
  speedHz: number;
  pullup: { kind: "resistor"; ohms: number } | { kind: "onboard"; ohms: number } | { kind: "assumed" } | { kind: "none" };
}

export type I2cBindFailure = "pin-has-no-net" | "pins-on-one-net";

export interface NetlistDevices {
  devices: I2cDevice[];
  events: BusEvent[];
}

interface Candidate {
  part: SimPart;
  ref: string;
  sda: string;
  scl: string;
  onboardPullupOhms?: number;
}

const boardPin = (net: SimNetlist, board: string, pin: string): string | undefined =>
  net.parts.find((p) => p.id === board && p.kind === "board")?.pins[pin] ?? undefined;

function candidates(net: SimNetlist, descriptorOf: (part: SimPart) => Descriptor | undefined): Candidate[] {
  const found: Candidate[] = [];
  for (const part of net.parts) {
    const descriptor = descriptorOf(part);
    const protocol = descriptor?.protocols?.find((p) => p.kind === "i2c" && p.status === "modelled");
    if (!descriptor || !protocol) continue;
    const ref = descriptor.behaviour.layers.flatMap((l) => (l.model.kind === "builtin" ? [l.model.ref] : [])).find((r) => DEVICE_REF.test(r));
    const sda = protocol.pins.sda;
    const scl = protocol.pins.scl;
    if (ref === undefined || sda === undefined || scl === undefined) continue;
    const onboard = (protocol as { params?: { onboard_pullup_ohms?: unknown } }).params?.onboard_pullup_ohms;
    found.push({ part, ref, sda, scl, onboardPullupOhms: typeof onboard === "number" ? onboard : undefined });
  }
  return found;
}

/** The smallest resistor between each bus net and the high rail, then the larger of the two: the weaker line sets the rise time. */
function resistorPullup(net: SimNetlist, nets: [string, string]): number | undefined {
  const rails = railLevels(net);
  const ohms = nets.map((bus) => {
    let best: number | undefined;
    for (const part of net.parts) {
      if (part.kind !== "resistor") continue;
      const ends = [...new Set(Object.values(part.pins).filter((n): n is string => n !== null))];
      if (ends.length !== 2 || !ends.includes(bus)) continue;
      const other = ends.find((n) => n !== bus);
      const value = part.params.ohms;
      if (other === undefined || rails.get(other) !== 1 || typeof value !== "number") continue;
      best = best === undefined ? value : Math.min(best, value);
    }
    return best;
  });
  return ohms.some((o) => o === undefined) ? undefined : Math.max(...(ohms as number[]));
}

/**
 * What holds the bus lines high: a resistor to the supply on both lines, else the largest pull-up a part on the bus
 * carries on its board, else nothing when the circuit has analog parts to say so, else the assumed pull-up.
 */
export function findPullup(net: SimNetlist, nets: [string, string], descriptorOf: (part: SimPart) => Descriptor | undefined): I2cBinding["pullup"] {
  const resistor = resistorPullup(net, nets);
  if (resistor !== undefined) return { kind: "resistor", ohms: resistor };
  const onboard = candidates(net, descriptorOf)
    .filter((c) => c.part.pins[c.sda] === nets[0] && c.part.pins[c.scl] === nets[1] && c.onboardPullupOhms !== undefined)
    .map((c) => c.onboardPullupOhms!);
  if (onboard.length > 0) return { kind: "onboard", ohms: Math.max(...onboard) };
  return net.parts.some((p) => ANALOG_KINDS.includes(p.kind)) ? { kind: "none" } : { kind: "assumed" };
}

/** The nets the sketch's I2C pins sit on. A pin nothing is wired to, or both pins on one net, cannot carry a bus. */
export function bindI2c(
  net: SimNetlist,
  board: string,
  pins: { sda: string; scl: string },
  descriptorOf: (part: SimPart) => Descriptor | undefined,
): { ok: true; binding: I2cBinding } | { ok: false; reason: I2cBindFailure; pin?: string } {
  const sdaNet = boardPin(net, board, pins.sda);
  if (sdaNet === undefined) return { ok: false, reason: "pin-has-no-net", pin: pins.sda };
  const sclNet = boardPin(net, board, pins.scl);
  if (sclNet === undefined) return { ok: false, reason: "pin-has-no-net", pin: pins.scl };
  if (sdaNet === sclNet) return { ok: false, reason: "pins-on-one-net" };
  return { ok: true, binding: { sdaNet, sclNet, speedHz: DEFAULT_I2C_HZ, pullup: findPullup(net, [sdaNet, sclNet], descriptorOf) } };
}

/**
 * Context for a part's register device: a pin reads high or low when its net is a rail, and floats otherwise; the
 * supply is the rail voltage, or what `volts` (the solver's answer) says about the net.
 */
export function netlistContext(
  net: SimNetlist,
  supplyV: number,
  nowNs: () => number,
  onEvent: (e: BusEvent) => void,
  volts?: (net: string) => number | undefined,
): (part: SimPart) => DeviceContext {
  const rails = railLevels(net);
  return (part) => {
    const netOf = (pin: string): string | undefined => part.pins[pin] ?? undefined;
    return {
      pin(name) {
        const level = rails.get(netOf(name) ?? "");
        return level === undefined ? "floating" : level === 1 ? "high" : "low";
      },
      supplyV(pin) {
        const target = netOf(pin);
        if (target === undefined) return undefined;
        const solved = volts?.(target);
        if (solved !== undefined) return solved;
        const level = rails.get(target);
        return level === undefined ? undefined : level === 1 ? supplyV : 0;
      },
      nowNs,
      onEvent,
    };
  };
}

/**
 * The devices a bound bus has: a part answers only when its SDA and SCL pins are on the bus nets. Pins on the two nets
 * the wrong way round raise `swapped-pins`; a part on any other nets belongs to another bus and is skipped.
 */
export function instantiateNetlistDevices(
  net: SimNetlist,
  binding: I2cBinding,
  descriptorOf: (part: SimPart) => Descriptor | undefined,
  ctx: (part: SimPart) => DeviceContext,
): NetlistDevices {
  const devices: I2cDevice[] = [];
  const events: BusEvent[] = [];
  for (const { part, ref, sda, scl } of candidates(net, descriptorOf)) {
    const onSda = part.pins[sda];
    const onScl = part.pins[scl];
    if (onSda === binding.sclNet && onScl === binding.sdaNet) {
      events.push({ atNs: 0, bus: "i2c0", kind: "swapped-pins", detail: `${part.id}: ${sda} is on ${binding.sclNet} and ${scl} is on ${binding.sdaNet}` });
      continue;
    }
    if (onSda !== binding.sdaNet || onScl !== binding.sclNet) continue;
    const loaded = loadDevice(ref, ctx(part));
    if (loaded.ok) devices.push(loaded.device);
    else events.push({ atNs: 0, bus: "i2c0", kind: "not-modelled", detail: `${part.id}: ${loaded.error}` });
  }
  return { devices, events };
}

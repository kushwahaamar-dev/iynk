import mpu6050 from "./data/mpu6050.device.json" with { type: "json" };
import { type BehaviourFn, type DeviceContext, type DeviceDescriptor, type RegisterDevice, createRegisterDevice, validateDescriptor } from "./register-map.ts";

const SLEEP_BIT = 0x40;

export const BEHAVIOURS = new Map<string, BehaviourFn>();

export function registerBehaviour(ref: string, fn: BehaviourFn): void {
  BEHAVIOURS.set(ref, fn);
}

registerBehaviour("mpu6050.wake", (d, ev) => {
  if (ev.kind === "write") d.state.awake = ev.value & SLEEP_BIT ? 0 : 1;
});

const DESCRIPTORS: readonly unknown[] = [mpu6050];

/** `ref` is the builtin ref of the component schema, for example `device:i2c/mpu6050@1`. */
export function loadDevice(ref: string, ctx: DeviceContext): { ok: true; device: RegisterDevice } | { ok: false; error: string } {
  const raw = DESCRIPTORS.find((d) => (d as { id?: unknown }).id === ref);
  if (raw === undefined) return { ok: false, error: "unknown-device" };
  const checked = validateDescriptor(raw, (r) => BEHAVIOURS.has(r));
  if (!checked.ok) return checked;
  const descriptor: DeviceDescriptor = checked.value;
  return { ok: true, device: createRegisterDevice(descriptor, ctx, Object.fromEntries(BEHAVIOURS)) };
}

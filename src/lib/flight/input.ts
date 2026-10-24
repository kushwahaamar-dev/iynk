import { clamp } from "./math";
import type { Sticks } from "./types";

/** Keys the range owns while it has focus; the page must not scroll on them. */
export const FLIGHT_KEYS = new Set([
  "KeyW",
  "KeyS",
  "KeyA",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyR",
  "KeyV",
]);

/** Held keys that move a stick (Space, R and V are one-shot commands). */
export const STICK_KEYS = new Set(["KeyW", "KeyS", "KeyA", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export const MANUAL_THROTTLE_RATE = 0.32; // stick travel per second while W or S is held

export interface TouchStick {
  x: number; // -1..1, right positive
  y: number; // -1..1, up positive
}

export interface InputState {
  keys: Set<string>;
  smooth: { yaw: number; pitch: number; roll: number };
  manualThrottle: number; // 0..1, where a manual throttle stick was left
  left: TouchStick | null;
  right: TouchStick | null;
  pad: Sticks | null; // gamepad channels this frame
}

export function createInput(): InputState {
  return { keys: new Set(), smooth: { yaw: 0, pitch: 0, roll: 0 }, manualThrottle: 0, left: null, right: null, pad: null };
}

const has = (s: InputState, code: string) => (s.keys.has(code) ? 1 : 0);

/**
 * Merges keyboard, touch sticks and gamepad into RC channels. Touch wins over
 * the gamepad, the gamepad over keys. In climb (altitude-hold) modes the
 * throttle springs back to the centre; in manual modes it stays where it was left.
 */
export function readSticks(inp: InputState, climb: boolean, dt: number): Sticks {
  const k = Math.min(1, 10 * dt);
  const target = {
    yaw: has(inp, "KeyD") - has(inp, "KeyA"),
    pitch: has(inp, "ArrowUp") - has(inp, "ArrowDown"),
    roll: has(inp, "ArrowLeft") - has(inp, "ArrowRight"),
  };
  inp.smooth.yaw += (target.yaw - inp.smooth.yaw) * k;
  inp.smooth.pitch += (target.pitch - inp.smooth.pitch) * k;
  inp.smooth.roll += (target.roll - inp.smooth.roll) * k;
  const w = has(inp, "KeyW"), s = has(inp, "KeyS");
  let throttle: number;
  if (climb) throttle = w || s ? 0.5 + (w - s) / 2 : 0.5;
  else {
    inp.manualThrottle = clamp(inp.manualThrottle + (w - s) * MANUAL_THROTTLE_RATE * dt, 0, 1);
    throttle = inp.manualThrottle;
  }
  const out: Sticks = { throttle, yaw: inp.smooth.yaw, pitch: inp.smooth.pitch, roll: inp.smooth.roll };
  if (inp.pad) {
    const keysIdle = target.yaw === 0 && target.pitch === 0 && target.roll === 0 && !w && !s;
    if (keysIdle) Object.assign(out, inp.pad);
    if (!climb && keysIdle) inp.manualThrottle = inp.pad.throttle;
  }
  if (inp.left) {
    out.yaw = inp.left.x;
    if (climb) out.throttle = 0.5 + inp.left.y / 2;
    else {
      inp.manualThrottle = (inp.left.y + 1) / 2;
      out.throttle = inp.manualThrottle;
    }
  }
  if (inp.right) {
    out.roll = -inp.right.x;
    out.pitch = inp.right.y;
  }
  return out;
}

/** Where a manual throttle stick parks: centred in climb modes, at the bottom otherwise. */
export function parkedThrottle(climb: boolean, manualThrottle: number) {
  return climb ? 0 : manualThrottle * 2 - 1;
}

export type Channel = "throttle" | "yaw" | "pitch" | "roll";
export const CHANNELS: Channel[] = ["throttle", "yaw", "pitch", "roll"];

export interface PadMapping {
  axes: Record<Channel, { axis: number; invert: boolean }>;
  arm: number;
  fpv: number;
  reset: number;
  deadband: number;
}

/** Mode 2 on a standard-layout gamepad: left stick throttle/yaw, right stick pitch/roll. */
export const DEFAULT_PAD: PadMapping = {
  axes: {
    throttle: { axis: 1, invert: true },
    yaw: { axis: 0, invert: false },
    pitch: { axis: 3, invert: true },
    roll: { axis: 2, invert: true },
  },
  arm: 9,
  fpv: 3,
  reset: 8,
  deadband: 0.06,
};

const dead = (v: number, d: number) => (Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d));

/** Gamepad axes to RC channels. Throttle -1..1 on the axis becomes 0..1. */
export function padSticks(axes: readonly number[], map: PadMapping): Sticks {
  const read = (c: Channel) => {
    const a = map.axes[c];
    const v = clamp(axes[a.axis] ?? 0, -1, 1);
    return a.invert ? -v : v;
  };
  return {
    throttle: clamp((read("throttle") + 1) / 2, 0, 1),
    yaw: dead(read("yaw"), map.deadband),
    pitch: dead(read("pitch"), map.deadband),
    roll: dead(read("roll"), map.deadband),
  };
}

/**
 * Learns an axis: given the axes at rest and now, returns the axis that moved
 * most (by more than half its travel) and whether it moved negative.
 */
export function learnAxis(rest: readonly number[], now: readonly number[]): { axis: number; invert: boolean } | null {
  let best = -1, delta = 0;
  for (let i = 0; i < now.length; i++) {
    const d = (now[i] ?? 0) - (rest[i] ?? 0);
    if (Math.abs(d) > Math.abs(delta)) {
      best = i;
      delta = d;
    }
  }
  return best >= 0 && Math.abs(delta) > 0.5 ? { axis: best, invert: delta < 0 } : null;
}

export function isPadMapping(v: unknown): v is PadMapping {
  if (!v || typeof v !== "object") return false;
  const m = v as PadMapping;
  return (
    typeof m.arm === "number" &&
    typeof m.fpv === "number" &&
    typeof m.reset === "number" &&
    typeof m.deadband === "number" &&
    !!m.axes &&
    CHANNELS.every((c) => typeof m.axes[c]?.axis === "number" && typeof m.axes[c]?.invert === "boolean")
  );
}

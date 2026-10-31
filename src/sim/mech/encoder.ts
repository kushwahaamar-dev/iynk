import type { SimTime } from "./ports.ts";

export interface EncoderSpec {
  /** Edges per revolution of the whole channel set. */
  countsPerRev: number;
  channels: "a" | "ab";
  index: boolean;
  onMotorShaft: boolean;
  gearRatio: number;
}

export interface Edge {
  atNs: SimTime;
  channel: "a" | "b" | "index";
  level: 0 | 1;
  dir: 1 | -1;
  /** Net edge count after this edge. An index pulse carries the count of the edge it sits on. */
  count: number;
}

export interface EncoderState {
  lastIndex: number;
  a: 0 | 1;
  b: 0 | 1;
  count: number;
}

const TWO_PI = 2 * Math.PI;
const RING_SIZE = 4096;

type Level = 0 | 1;
type Channel = "a" | "b";

/** Levels after `k` net edges: A rises, B rises, A falls, B falls. */
function levelsAt(k: number, channels: EncoderSpec["channels"]): { a: Level; b: Level } {
  if (channels === "a") return { a: (((k % 2) + 2) % 2) as Level, b: 0 };
  switch (((k % 4) + 4) % 4) {
    case 1:
      return { a: 1, b: 0 };
    case 2:
      return { a: 1, b: 1 };
    case 3:
      return { a: 0, b: 1 };
    default:
      return { a: 0, b: 0 };
  }
}

/** The channel that changes when edge `k` is crossed. */
function channelOf(k: number, channels: EncoderSpec["channels"]): Channel {
  return channels === "a" || k % 2 !== 0 ? "a" : "b";
}

export function createEncoder(spec: EncoderSpec) {
  const n = spec.countsPerRev;
  if (!Number.isInteger(n) || n <= 0) throw new RangeError(`countsPerRev must be a positive integer, got ${n}`);
  if (spec.onMotorShaft && !(Number.isFinite(spec.gearRatio) && spec.gearRatio > 0)) {
    throw new RangeError(`gearRatio must be positive, got ${spec.gearRatio}`);
  }
  const scale = spec.onMotorShaft ? spec.gearRatio : 1;

  const ring: Edge[] = [];
  let head = 0;
  let count = 0;
  let lastIndex = 0;
  let swapped = false;

  const label = (c: Channel): Channel => (swapped ? (c === "a" ? "b" : "a") : c);

  function push(e: Edge) {
    if (ring.length < RING_SIZE) ring.push(e);
    else {
      ring[head] = e;
      head = (head + 1) % RING_SIZE;
    }
  }

  function state(): EncoderState {
    const { a, b } = levelsAt(count, spec.channels);
    return swapped ? { lastIndex, a: b, b: a, count } : { lastIndex, a, b, count };
  }

  function edgesInStep(thetaA: number, thetaB: number, tNs: SimTime, hNs: number): Edge[] {
    if (!Number.isFinite(thetaA) || !Number.isFinite(thetaB)) throw new RangeError("encoder angle must be finite");
    if (thetaA === thetaB) return [];
    const a = thetaA * scale;
    const b = thetaB * scale;
    const ka = Math.floor((a * n) / TWO_PI);
    const kb = Math.floor((b * n) / TWO_PI);
    const forward = b > a;
    const dir = forward ? 1 : -1;
    const out: Edge[] = [];
    const first = forward ? ka + 1 : ka;
    const last = forward ? kb : kb + 1;
    for (let k = first; forward ? k <= last : k >= last; k += dir) {
      const frac = ((k * TWO_PI) / n - a) / (b - a);
      const at = Math.min(tNs + hNs, Math.max(tNs + 1, tNs + Math.round(hNs * frac)));
      const after = forward ? k : k - 1;
      const levels = levelsAt(after, spec.channels);
      const channel = channelOf(k, spec.channels);
      const edge: Edge = { atNs: at, channel: label(channel), level: levels[channel], dir, count: after };
      out.push(edge);
      push(edge);
      if (spec.index && k % n === 0) {
        out.push({ atNs: at, channel: "index", level: 1, dir, count: after });
        lastIndex = after;
      }
    }
    count = kb;
    return out;
  }

  function countAt(atNs: SimTime): number {
    let at = count;
    for (let i = 0; i < ring.length; i++) {
      const e = ring[(head + ring.length - 1 - i) % ring.length]!;
      if (e.atNs <= atNs) return at;
      at = e.count - e.dir;
    }
    if (ring.length === RING_SIZE) throw new RangeError(`encoder history only reaches back ${RING_SIZE} edges`);
    return at;
  }

  function swapChannels(on: boolean) {
    swapped = on;
  }

  return { state, edgesInStep, countAt, swapChannels };
}

import type { BodyState, JointState } from "./backend.ts";
import type { SimTime } from "./ports.ts";

export interface Snapshot {
  atNs: SimTime;
  bodies: Map<string, BodyState>;
  joints: Map<string, JointState>;
}

const empty = (): Snapshot => ({ atNs: 0, bodies: new Map(), joints: new Map() });

/** `prev` is the world at the start of the step in flight, `next` the world at its end. */
export function createBuffers() {
  let prev = empty();
  let next = empty();
  return {
    get prev(): Snapshot {
      return prev;
    },
    get next(): Snapshot {
      return next;
    },
    swap(): void {
      [prev, next] = [next, prev];
    },
    /** Anything strictly before the end of the step sees the start of it. */
    readAt(atNs: SimTime): Snapshot {
      return atNs < next.atNs ? prev : next;
    },
  };
}

export type Buffers = ReturnType<typeof createBuffers>;

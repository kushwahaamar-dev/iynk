import type { Clock, RandomSource } from "../core/ids.ts";
import { newId } from "../core/ids.ts";
import type { Op, OpEnvelope } from "./generated/types.ts";

/** Gives accepted ops their place in the history. The one place that assigns `seq`. */
export interface LocalAuthority {
  stamp(ops: readonly Op[], author: OpEnvelope["author"]): OpEnvelope[];
  readonly mode: "local";
}

export interface LocalAuthorityOptions {
  clock: Clock;
  rnd: RandomSource;
  /** The revision of the document the first stamped op lands on. */
  startRevision: number;
}

export function createLocalAuthority(opts: LocalAuthorityOptions): LocalAuthority {
  let revision = opts.startRevision;
  return {
    mode: "local",
    stamp(ops, author) {
      const at = new Date(opts.clock()).toISOString();
      const envelopes = ops.map((op): OpEnvelope => {
        revision += 1;
        return { opId: newId("op", opts.rnd), seq: revision, base: revision - 1, author: { ...author }, at, op };
      });
      const first = envelopes[0];
      if (first && envelopes.length > 1) for (const envelope of envelopes) envelope.batch = first.opId;
      return envelopes;
    },
  };
}

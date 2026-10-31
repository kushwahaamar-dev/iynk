import type { Clock, RandomSource } from "../core/ids.ts";
import { newId } from "../core/ids.ts";
import type { Op, OpEnvelope, Project } from "./generated/types.ts";
import type { ApplyResult } from "./session.ts";

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

/** A batch the session has already applied locally and the authority now has to get accepted. */
export interface PendingBatch {
  batchId: string;
  /** The revision of the visible document the batch was applied on. */
  base: number;
  author: OpEnvelope["author"];
  ops: Op[];
}

export type SubmitResult =
  | { ok: true; envelopes: OpEnvelope[]; inverse: Op[] }
  | { ok: false; reject: Extract<ApplyResult, { ok: false }>["reject"] | "not_baton" };

/** Where batches go once they are applied locally and where other people's batches come from. The `DocStore` never learns which kind it has. */
export interface Authority {
  readonly mode: string;
  submit(batch: PendingBatch): Promise<SubmitResult>;
  onRemote(handler: (envelopes: OpEnvelope[]) => void): () => void;
  /** The visible state replaced as a whole: the confirmed document plus whatever is still pending. */
  onResync(handler: (snapshot: Project) => void): () => void;
}

import { cryptoRandom } from "@/core/ids";
import type { OpEnvelope, Project } from "@/project/generated/types";
import { stateHash } from "@/project/hash";
import { createSession } from "@/project/session";

export type FoldResult = { ok: true } | { ok: false; reason: "gap" | "reject" };

/** The worker's copy of the open document, kept current by folding in the main thread's op batches. */
export interface Shadow {
  readonly projectId: string;
  readonly revision: number;
  readonly doc: Project;
  fold(ops: OpEnvelope[], from: number, to: number): FoldResult;
  hash(): string;
}

/** The envelopes cut into the batches they were applied in. */
function batchesOf(envelopes: readonly OpEnvelope[]): OpEnvelope[][] {
  const batches: OpEnvelope[][] = [];
  for (const envelope of envelopes) {
    const last = batches[batches.length - 1];
    if (last && envelope.batch !== undefined && last[0]?.batch === envelope.batch) last.push(envelope);
    else batches.push([envelope]);
  }
  return batches;
}

export function createShadow(projectId: string, doc: Project, revision: number): Shadow {
  let at = Date.parse(doc.meta.updatedAt);
  const session = createSession({ state: doc, clock: () => at, rnd: cryptoRandom });
  let current = revision;

  return {
    projectId,
    get revision() {
      return current;
    },
    get doc() {
      return session.state;
    },

    fold(ops, from, to) {
      if (from !== current) return { ok: false, reason: "gap" };
      if (ops.length === 0) return to === from ? { ok: true } : { ok: false, reason: "gap" };
      if (ops[0]!.seq !== from + 1 || ops[ops.length - 1]!.seq !== to) return { ok: false, reason: "gap" };

      const before = session.state;
      const reject = (): FoldResult => {
        session.replace(before);
        return { ok: false, reason: "reject" };
      };
      for (const batch of batchesOf(ops)) {
        const first = batch[0]!;
        at = Date.parse(first.at);
        if (Number.isNaN(at)) return reject();
        if (!session.apply(batch.map((envelope) => envelope.op), first.author).ok) return reject();
        // The session stamped its own envelopes; the stored history must hold the main thread's.
        const { history } = session.state;
        const kept = history.ops.slice(0, history.ops.length - batch.length);
        session.replace({ ...session.state, history: { ...history, ops: [...kept, ...batch] } });
      }
      if (session.revision !== to) return reject();
      current = to;
      return { ok: true };
    },

    hash: () => stateHash(session.state),
  };
}

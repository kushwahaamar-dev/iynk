import type { Authority } from "@/project/authority";
import type { OpEnvelope } from "@/project/generated/types";
import type { RandomSource } from "@/core/ids";
import { newId } from "@/core/ids";
import type { DocAccess, DocStore } from "@/studio/stores/doc";

/** The server's limit on one submission (T-B7-01). */
const MAX_BATCH_OPS = 40;

/** The part of a room's status the store needs; `RoomStatus` fits it, so Studio never imports the collab module. */
export interface AuthorityStatus {
  confirmedSeq: number;
  access: DocAccess;
}

export type LinkedAuthority = Authority & {
  getStatus(): AuthorityStatus;
  subscribe(fn: () => void): () => void;
};

export interface AuthorityLinkDeps {
  doc: DocStore;
  authority: LinkedAuthority;
  rnd: RandomSource;
}

/**
 * Sends what the person does to the authority and brings other people's work into the one visible state. The store
 * applies a batch first and the authority hears about it afterwards (ADR-0402).
 */
export function linkAuthority({ doc, authority, rnd }: AuthorityLinkDeps): () => void {
  let applyingRemote = false;

  const copyStatus = () => {
    const { access, confirmedSeq } = authority.getStatus();
    doc.setAccess(access);
    doc.setConfirmedSeq(confirmedSeq);
  };
  copyStatus();

  const stopStatus = authority.subscribe(copyStatus);

  const stopLocal = doc.onChange((change) => {
    if (applyingRemote || change.origin === "load" || change.ops.length === 0) return;
    const author = doc.session.state.history.ops.at(-1)?.author;
    if (!author) return;
    for (let i = 0; i < change.ops.length; i += MAX_BATCH_OPS) {
      void authority.submit({ batchId: newId("op", rnd), base: change.from, author, ops: change.ops.slice(i, i + MAX_BATCH_OPS) });
    }
  });

  const stopRemote = authority.onRemote((envelopes: OpEnvelope[]) => {
    applyingRemote = true;
    try {
      doc.applyRemote(envelopes);
    } finally {
      applyingRemote = false;
    }
  });

  const stopResync = authority.onResync((snapshot) => {
    applyingRemote = true;
    try {
      doc.resync(snapshot);
    } finally {
      applyingRemote = false;
    }
  });

  return () => {
    stopStatus();
    stopLocal();
    stopRemote();
    stopResync();
  };
}

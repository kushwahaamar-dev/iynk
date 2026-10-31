import type { Op, OpEnvelope } from "../../project/generated/types.ts";
import { lessonSession } from "../../project/session.testing.ts";
import type { ProjectSession } from "../../project/session.ts";
import { createDocStore } from "../stores/doc.ts";
import type { DocStore } from "../stores/doc.ts";

export type RecordedCommit = { batch: Op[]; label: string; author?: OpEnvelope["author"] };

/** A `DocStore` over an in-memory session that notes every `commit` call, for tool and engine tests. */
export function createRecordingDoc(session: ProjectSession = lessonSession()): DocStore & { readonly commits: readonly RecordedCommit[] } {
  const doc = createDocStore(session);
  const commits: RecordedCommit[] = [];
  return {
    ...doc,
    get session() {
      return doc.session;
    },
    commits,
    commit(batch, opts) {
      commits.push({ batch, ...opts });
      return doc.commit(batch, opts);
    },
  };
}

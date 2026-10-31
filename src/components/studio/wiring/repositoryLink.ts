import { fail, type Result } from "@/core/result";
import { attachAutosave, DEFAULT_FLUSH_STRATEGY, type AutosaveEnv, type AutosaveStatus } from "@/local/autosave";
import type { ProjectHost } from "@/local/project-host";
import type { ProjectEv } from "@/local/project-protocol";
import type { Repository } from "@/local/repository";
import type { Checkpoint } from "@/project/generated/types";
import { stateHash } from "@/project/hash";
import { compareStates, type RevisionDiff } from "@/studio/history/compare";
import { restoreOps, verifySnapshot } from "@/studio/history/restore";
import { makeCheckpoint, shouldCheckpoint, type CheckpointError, type RevisionPort } from "@/studio/history/revisions";
import type { DocStore, SaveChip } from "@/studio/stores/doc";

export type ProjectHostLike = Pick<ProjectHost, "load" | "open" | "commit" | "save" | "close" | "keepRevision" | "onEvent">;

export type LinkNotice = "hash_mismatch" | "recovered" | "lost" | "degraded";

export type LinkOptions = {
  /** One line for the person; the workspace decides how it shows. */
  onNotice?: (notice: LinkNotice) => void;
  env?: AutosaveEnv;
  /** Where version snapshots live. Without it the history hooks do nothing. */
  revisions?: RevisionPort;
  now?: () => string;
};

export type CheckpointResult = Result<Checkpoint | undefined, CheckpointError>;

type Versions = {
  checkpoint(kind: "auto" | "named", label?: string): Promise<Result<Checkpoint, CheckpointError>>;
  hook(label: string): Promise<CheckpointResult>;
  due(): boolean;
  compare(a: number, b: number): Promise<RevisionDiff | "mismatch">;
  restore(revision: number, label: string): Promise<void>;
};

/** The versions of the project the open workspace is linked to; the history hooks reach it from outside the component tree. */
let active: Versions | null = null;

const CHIP: Record<AutosaveStatus, SaveChip> = {
  saved: "saved",
  saving: "saving",
  unsaved: "unsaved",
  failed: "autosave-failed",
};

export function createRevisionPort(repo: Repository): RevisionPort {
  return {
    put: (projectId, revision, snapshot) => repo.revisions.put(projectId, revision, { state: snapshot, stateHash: stateHash(snapshot) }),
    get: async (projectId, revision) => (await repo.revisions.get(projectId, revision))?.state,
    list: (projectId) => repo.revisions.list(projectId),
    remove: (projectId, revision) => repo.revisions.remove(projectId, revision),
  };
}

function browserEnv(): AutosaveEnv {
  return {
    timers: {
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (id) => window.clearTimeout(id),
      now: () => Date.now(),
    },
    doc: document,
    win: window,
    strategy: DEFAULT_FLUSH_STRATEGY,
  };
}

function createVersions(doc: DocStore, port: RevisionPort, now: () => string): Versions {
  const session = () => doc.session;
  const author = () => session().state.access.owners[0] ?? "";
  let baseRevision = session().revision;
  let baseAt = Date.now();

  const newest = () => session().state.history.checkpoints.at(-1);

  async function checkpoint(kind: "auto" | "named", label?: string) {
    const made = await makeCheckpoint(session(), port, { kind, author: author(), at: now(), ...(label === undefined ? {} : { label }) });
    if (made.ok) {
      baseRevision = made.value.revision;
      baseAt = Date.now();
    }
    return made;
  }

  async function snapshotOf(revision: number) {
    const cp = session().state.history.checkpoints.find((c) => c.revision === revision);
    const snap = cp && (await port.get(session().state.id, revision));
    if (!cp || !snap) return undefined;
    if (verifySnapshot(snap, cp)) return snap;
    console.warn("[iynk] version failed its hash check", session().state.id, revision);
    return undefined;
  }

  return {
    checkpoint,
    async hook(label) {
      if (newest()?.stateHash === stateHash(session().state)) return { ok: true, value: undefined };
      return checkpoint("named", label);
    },
    due: () => session().revision > baseRevision && shouldCheckpoint(session().revision - baseRevision, Date.now() - baseAt),
    async compare(a, b) {
      const [before, after] = await Promise.all([snapshotOf(a), snapshotOf(b)]);
      return before && after ? compareStates(before, after) : "mismatch";
    },
    async restore(revision, label) {
      const snap = await snapshotOf(revision);
      if (!snap) throw new Error("mismatch");
      const authorship = { actor: author(), kind: "user" } as const;
      for (const batch of restoreOps(session().state, snap)) {
        const result = doc.commit(batch, { label, author: authorship });
        if (!result.ok) throw new Error(result.message);
      }
    },
  };
}

const withActive = <T>(run: (versions: Versions) => Promise<T>, none: T): Promise<T> => (active ? run(active) : Promise.resolve(none));

/** Names the current state as a version. */
export const nameVersion = (label: string): Promise<Result<Checkpoint, CheckpointError>> =>
  withActive((v) => v.checkpoint("named", label), fail("store"));

/** `"mismatch"` when either version is missing or fails its hash check. */
export const compareVersions = (a: number, b: number): Promise<RevisionDiff | "mismatch"> => withActive((v) => v.compare(a, b), "mismatch");

/** Adds the restore as ordinary changes on top of the document, so Undo reverses it. */
export const restoreVersion = async (revision: number, label: string): Promise<void> => {
  if (!active) throw new Error("store");
  await active.restore(revision, label);
};

const nameUnlessSame = (label: string): Promise<CheckpointResult> => withActive((v) => v.hook(label), fail("store"));

/** `undefined` in the value means nothing changed since the newest version. A failure never blocks the Run. */
export const onRunStart = nameUnlessSame;

/** As `onRunStart`, for saving to a file. */
export const onSaveToFile = nameUnlessSame;

/**
 * Hands every committed batch to the autosave, keeps the save chip in step with it and asks before the tab closes
 * with unsaved work. Returns the function that undoes all of it.
 */
export function linkRepository(doc: DocStore, host: ProjectHostLike, { onNotice, env = browserEnv(), revisions, now = () => new Date().toISOString() }: LinkOptions = {}): () => void {
  const session = doc.session;
  const autosave = attachAutosave(session, host, env);
  const versions = revisions && createVersions(doc, revisions, now);
  if (versions) active = versions;
  let warning = false;

  const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = "";
  };

  function syncWarning() {
    const { saveChip } = doc.getState();
    const pending = saveChip === "unsaved" || saveChip === "saving" || saveChip === "autosave-failed";
    if (pending === warning) return;
    warning = pending;
    if (pending) env.win.addEventListener("beforeunload", warnBeforeLeaving);
    else env.win.removeEventListener("beforeunload", warnBeforeLeaving);
  }

  function showStatus() {
    if (doc.getState().saveChip !== "read-only") doc.setSaveChip(CHIP[autosave.status()]);
    syncWarning();
  }

  const offChange = doc.onChange((change) => {
    // The autosave sees the same change after this listener, so its status has not moved yet.
    if (change.origin === "load" || doc.getState().saveChip === "read-only") return;
    doc.setSaveChip(autosave.status() === "failed" ? "autosave-failed" : "unsaved");
    syncWarning();
  });

  const offEvents = host.onEvent((ev: ProjectEv) => {
    switch (ev.t) {
      case "saved":
        showStatus();
        if (versions?.due()) {
          void versions.checkpoint("auto").then((made) => {
            if (!made.ok) console.warn("[iynk] version skipped", made.error);
          });
        }
        break;
      case "save_failed":
        console.warn("[iynk] save failed", ev.kind);
        showStatus();
        break;
      case "hash_mismatch":
        onNotice?.("hash_mismatch");
        host.open(session.state.id, session.state, session.revision).catch(showStatus);
        break;
      case "recovered_from_previous":
        if (ev.projectId === session.state.id) onNotice?.("recovered");
        break;
      case "record_lost":
        if (ev.projectId === session.state.id) onNotice?.("lost");
        break;
      case "degraded":
        onNotice?.("degraded");
        break;
    }
  });

  return () => {
    offChange();
    offEvents();
    autosave.dispose();
    if (versions && active === versions) active = null;
    if (warning) env.win.removeEventListener("beforeunload", warnBeforeLeaving);
  };
}

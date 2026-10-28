import { attachAutosave, DEFAULT_FLUSH_STRATEGY, type AutosaveEnv, type AutosaveStatus } from "@/local/autosave";
import type { ProjectHost } from "@/local/project-host";
import type { ProjectEv } from "@/local/project-protocol";
import type { DocStore, SaveChip } from "@/studio/stores/doc";

export type ProjectHostLike = Pick<ProjectHost, "load" | "open" | "commit" | "save" | "close" | "keepRevision" | "onEvent">;

export type LinkNotice = "hash_mismatch" | "recovered" | "lost" | "degraded";

export type LinkOptions = {
  /** One line for the person; the workspace decides how it shows. */
  onNotice?: (notice: LinkNotice) => void;
  env?: AutosaveEnv;
};

const CHIP: Record<AutosaveStatus, SaveChip> = {
  saved: "saved",
  saving: "saving",
  unsaved: "unsaved",
  failed: "autosave-failed",
};

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

/**
 * Hands every committed batch to the autosave, keeps the save chip in step with it and asks before the tab closes
 * with unsaved work. Returns the function that undoes all of it.
 */
export function linkRepository(doc: DocStore, host: ProjectHostLike, { onNotice, env = browserEnv() }: LinkOptions = {}): () => void {
  const session = doc.session;
  const autosave = attachAutosave(session, host, env);
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
    if (warning) env.win.removeEventListener("beforeunload", warnBeforeLeaving);
  };
}

import { useEffect, useState } from "react";
import { cryptoRandom } from "@/core/ids";
import { createSession } from "@/project/session";
import { createDocStore, type DocStore } from "@/studio/stores/doc";
import type { ProjectHostLike } from "./repositoryLink";

export type OpenStatus = "loading" | "ready" | "recovered" | "missing" | "lost" | "error";

export type OpenedProject = { status: OpenStatus; doc: DocStore | null; error?: string };

type Settled = OpenedProject & { id: string };

/** Loads the stored project into a session the page can edit. Undo history starts empty: stacks live in memory only. */
export function useOpenProject(id: string | null, { host }: { host: ProjectHostLike }): OpenedProject {
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (id === null) return;
    let cancelled = false;
    let opened = false;
    const finish = (outcome: OpenedProject) => {
      if (!cancelled) setSettled({ id, ...outcome });
    };

    (async () => {
      const loaded = await host.load(id);
      if (loaded.status === "missing" || loaded.status === "lost") return finish({ status: loaded.status, doc: null });
      if (!loaded.state || loaded.revision === undefined) return finish({ status: "error", doc: null, error: "The stored project came back empty." });
      const session = createSession({ state: loaded.state, clock: Date.now, rnd: cryptoRandom, onCompact: host.keepRevision });
      await host.open(id, loaded.state, loaded.revision);
      if (cancelled) return void host.close(id).catch(() => undefined);
      opened = true;
      finish({ status: loaded.status === "recovered" ? "recovered" : "ready", doc: createDocStore(session) });
    })().catch((err: unknown) => finish({ status: "error", doc: null, error: err instanceof Error ? err.message : String(err) }));

    return () => {
      cancelled = true;
      if (opened) void host.close(id).catch(() => undefined);
    };
  }, [id, host]);

  if (id === null || settled?.id !== id) return { status: "loading", doc: null };
  return settled;
}

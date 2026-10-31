import { loadForRun } from "@/components/studio/wiring/simLink";
import type { Project } from "@/project/generated/types";
import { classifyOp } from "@/protocol";
import type { Actor, ClientFrame, RunState } from "@/protocol";
import type { SimHost } from "@/sim-host/host";
import { createRunStateStore, type RunStateStore } from "@/studio/room/run-state";
import type { RoomClient } from "./client";
import { createRunClient, type RunClient } from "./run";

export interface RunWiring {
  client: RunClient;
  store: RunStateStore;
  /** Asks the room to start a run of the open project at the confirmed revision. */
  start(speed: number): void;
  dispose(): void;
}

export interface RunWiringDeps {
  room: Pick<RoomClient, "send" | "on">;
  host: SimHost;
  self: Actor;
  /** Engine versions, the same object the runner sends in `start`. */
  versions: Record<string, string>;
  /** The open project, or null while none is open. */
  project(): Project | null;
  confirmedSeq(): number;
}

export function attachRunClient(d: RunWiringDeps): RunWiring {
  const client = createRunClient({
    send: (f) => d.room.send(f as ClientFrame),
    host: d.host,
    self: d.self,
    versions: d.versions,
    classifyOp,
    load: async (run: RunState) => {
      const project = d.project();
      if (!project) throw new Error("No project is open.");
      await loadForRun(d.host, project, run.seed);
    },
    logEvent: () => {},
  });

  const off = d.room.on((e) => {
    if (e.t !== "room") return;
    const f = e.frame;
    switch (f.t) {
      case "welcome":
        return client.onWelcome({ run: f.run, log: [] });
      case "run.ev":
      case "run.tick":
      case "run.check":
      case "run.frame":
      case "run.req":
        return client.onFrame(f);
    }
  });

  return {
    client,
    store: createRunStateStore(client),
    start(speed) {
      const project = d.project();
      if (!project) return;
      client.request("start", { atSeq: d.confirmedSeq(), seed: project.simulation.seed, speed, versions: d.versions });
    },
    dispose() {
      off();
      client.dispose();
    },
  };
}

import type { ProjectEv, SaveFailure } from "@/local/project-protocol";
import { netlist } from "@/project/netlist";
import { stateHash } from "@/project/hash";
import type { DocStore } from "@/studio/stores/doc";
import type { RunStore } from "@/studio/stores/run";
import type { Announcer } from "@/studio/tools/keyboard";
import { partName } from "@/studio/tools/keyboard";
import type { ToolLogEntry } from "@/studio/tools/host";
import type { ProjectHostLike } from "./repositoryLink";

export type InjectedFailure = Extract<SaveFailure, "quota" | "blocked">;

/** What the end-to-end specs read from a build made with `NEXT_PUBLIC_STUDIO_TEST=1`. */
export interface StudioDebug {
  stateHash(): string;
  /** The pins of each net as sorted `refdes.pin` lists, the lists sorted too. */
  nets(): string[][];
  announcer(): { key: string; args?: Record<string, string | number> }[];
  run(): { startedAtMs: number | null; runningAtMs: number | null };
  tools(): readonly ToolLogEntry[];
  failNextSave(kind: InjectedFailure): void;
}

declare global {
  interface Window {
    __iynkStudioDebug?: StudioDebug;
  }
}

export interface DebugDeps {
  doc: DocStore;
  run: RunStore;
  announcer: Announcer;
  tools: () => readonly ToolLogEntry[];
}

export interface DebugHook {
  dispose(): void;
  /** The host the repository link should use: it answers the next save with the injected failure. */
  wrapHost<H extends ProjectHostLike>(host: H): H;
}

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function installDebugHook({ doc, run, announcer, tools }: DebugDeps): DebugHook {
  if (process.env.NEXT_PUBLIC_STUDIO_TEST !== "1") return { dispose() {}, wrapHost: (host) => host };

  let failure: InjectedFailure | null = null;
  const listeners = new Set<(ev: ProjectEv) => void>();

  const hook: StudioDebug = {
    stateHash: () => stateHash(doc.getState().state),
    nets() {
      const { state } = doc.getState();
      return netlist(state)
        .nodes.map((node) => node.pins.map((pin) => `${partName(state, pin.c)}.${pin.p}`).sort(byText))
        .sort((a, b) => byText(a.join(), b.join()));
    },
    announcer: () => announcer.lines.getState().map(({ key, args }) => ({ key, args })),
    run() {
      const { startedAtMs, runningAtMs } = run.getState();
      return { startedAtMs, runningAtMs };
    },
    tools,
    failNextSave(kind) {
      failure = kind;
    },
  };
  window.__iynkStudioDebug = hook;

  return {
    dispose() {
      if (window.__iynkStudioDebug === hook) delete window.__iynkStudioDebug;
    },
    wrapHost(host) {
      return Object.assign(Object.create(host) as typeof host, {
        save(reason: Parameters<typeof host.save>[0]) {
          if (failure === null) return host.save(reason);
          const kind = failure;
          failure = null;
          for (const fn of [...listeners]) fn({ t: "save_failed", kind, detail: "Injected by the test hook." });
          return Promise.resolve();
        },
        onEvent(fn: (ev: ProjectEv) => void) {
          listeners.add(fn);
          const off = host.onEvent(fn);
          return () => {
            listeners.delete(fn);
            off();
          };
        },
      });
    },
  };
}

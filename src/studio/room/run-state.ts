import type { RunClient, RunClientState } from "@/collab/run";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";

export type RunT = Translate<Messages["run"]>;

export type StatusLook = {
  text: string;
  /** Why the copy is following frames instead of simulating, when it is. */
  reason?: string;
  tone: "ok" | "info" | "warn";
};

export interface RunStateStore {
  get(): RunClientState;
  subscribe(fn: () => void): () => void;
}

const PUBLISH_GAP_MS = 500;
const NS_PER_SECOND = 1e9;

/** Holds the latest client state and tells its listeners at most twice a second. */
export function createRunStateStore(client: Pick<RunClient, "subscribe" | "state">): RunStateStore {
  let current = client.state;
  let wake: ReturnType<typeof setTimeout> | null = null;
  let lastPublished = Number.NEGATIVE_INFINITY;
  const listeners = new Set<() => void>();
  let off: (() => void) | null = null;

  function publish() {
    wake = null;
    lastPublished = Date.now();
    for (const fn of [...listeners]) fn();
  }

  function onState(next: RunClientState) {
    current = next;
    if (wake !== null) return;
    const wait = Math.max(0, lastPublished + PUBLISH_GAP_MS - Date.now());
    wake = setTimeout(publish, wait);
  }

  return {
    get: () => current,
    subscribe(fn) {
      listeners.add(fn);
      off ??= client.subscribe(onState);
      current = client.state;
      return () => {
        listeners.delete(fn);
        if (listeners.size > 0) return;
        off?.();
        off = null;
        if (wake !== null) clearTimeout(wake);
        wake = null;
      };
    },
  };
}

const HALT_KEY = {
  edited: "halt.edited",
  "server-restarted": "halt.server",
  log_full: "halt.logFull",
  error: "halt.error",
} as const;

/** The words for what this copy of the run is doing. `runnerName` is whose run it is following. */
export function describeStatus(s: RunClientState, t: RunT, runnerName = ""): StatusLook {
  switch (s.status) {
    case "in-sync":
      if (s.run.state === "paused" && s.run.runner === null) return { text: t("halt.runnerLost"), tone: "warn" };
      return { text: t("inSync", { t: formatSeconds(s.lastCheckAt ?? 0) }), tone: "ok" };
    case "catching-up":
      return { text: t("catchingUp"), tone: "info" };
    case "diverged":
      return { text: t("watching", { name: runnerName }), reason: t("reason.diverged"), tone: "warn" };
    case "engine-mismatch":
      return { text: t("watching", { name: runnerName }), reason: t("reason.engines"), tone: "warn" };
    case "frames":
      return { text: t("watching", { name: runnerName }), tone: "info" };
    case "detached-own":
      return { text: t("private"), tone: "info" };
    case "halted":
      return { text: t(s.run.haltReason ? HALT_KEY[s.run.haltReason] : "halt.error"), tone: "warn" };
  }
}

export function formatSeconds(ns: number): string {
  return (ns / NS_PER_SECOND).toFixed(1);
}

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { RunClient } from "@/collab/run";
import { Button, InlineStatus } from "@/components/ui";
import type { Actor } from "@/protocol";
import { describeStatus, type RunStateStore, type RunT } from "@/studio/room/run-state";
import { RunnerPicker, type RoomPerson } from "./RunnerPicker";

const BEHIND_HINT_MS = 5000;

type Props = {
  store: RunStateStore;
  client: Pick<RunClient, "detach" | "rejoin">;
  t: RunT;
  self: Actor;
  host: Actor | null;
  people: readonly RoomPerson[];
  onSetRunner(to: Actor): void;
};

/** True once `flag` has been up for `ms` without a break. */
function useHeldFor(flag: boolean, ms: number): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!flag) return;
    const timer = setTimeout(() => setHeld(true), ms);
    return () => {
      clearTimeout(timer);
      setHeld(false);
    };
  }, [flag, ms]);
  return held && flag;
}

/** Who runs the shared circuit, whether this copy matches theirs, and the way out to a private run and back. */
export function RunIndicator({ store, client, t, self, host, people, onSetRunner }: Props) {
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  const behind = useHeldFor(state.role === "runner" && state.behindReal, BEHIND_HINT_MS);
  const { run } = state;
  if (run.runId === "" || run.state === "idle") return null;

  const nameOf = (actor: Actor | null) => (actor === null ? "" : actor === self ? t("you") : (people.find((p) => p.actor === actor)?.name ?? ""));
  const isHost = host === self;
  const look = describeStatus(state, t, nameOf(run.runner));
  const following = state.status === "in-sync" || state.status === "catching-up";

  return (
    <section aria-label={t("indicator")} className="flex flex-col gap-2" data-testid="run-indicator">
      <p className="text-sm font-semibold">{t(`state.${run.state}`)}</p>
      {run.runner ? <p className="text-sm">{t("runner", { name: nameOf(run.runner) })}</p> : null}
      <div
        data-testid="run-sync"
        data-status={state.status}
        data-at={state.lastCheckAt ?? ""}
        data-hb={state.lastHb ?? ""}
        data-hd={state.lastHd ?? ""}
      >
        <InlineStatus tone={look.tone === "ok" ? "good" : look.tone} live>
          {look.reason ? `${look.text}: ${look.reason}` : look.text}
        </InlineStatus>
      </div>
      {behind && !isHost ? (
        <InlineStatus tone="warn" live>
          {t("moveRunner", { host: nameOf(host) })}
        </InlineStatus>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        {state.status === "detached-own" ? null : (
          <Button size="sm" variant="secondary" disabled={state.status === "catching-up" || state.role === "runner"} onClick={() => client.detach("own")}>
            {t("detach")}
          </Button>
        )}
        {following ? null : (
          <Button size="sm" variant="primary" onClick={() => client.rejoin()}>
            {t("rejoin")}
          </Button>
        )}
        {isHost ? <RunnerPicker people={people} runner={run.runner} t={t} onPick={onSetRunner} /> : null}
      </div>
    </section>
  );
}

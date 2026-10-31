"use client";

import { useEffect, useState } from "react";
import type { EditAccess, RoomStatus } from "@/collab/authority";
import type { RoomClient } from "@/collab/client";
import { keepCopy } from "@/collab/fork";
import type { RebaseReport as Report } from "@/collab/rebase";
import { Button, Callout, Chip, type CalloutTone } from "@/components/ui";
import type { Project } from "@/project/generated/types";
import { stateHash } from "@/project/hash";
import { useServices } from "../wiring/services";
import { RebaseReport } from "./RebaseReport";
import { RoomEndedNotice } from "./RoomEndedNotice";
import {
  useEditAccess,
  useRoomHandle,
  useRoomStatus,
  type StudioRoomsT,
} from "./RoomDock";

const OFFLINE_AFTER_MS = 3000;

type Line = { tone: CalloutTone; text: string };
type Why = "closed" | "kicked" | "unavailable";
type Held<T> = { client: RoomClient; value: T };

/** True once the link has been down for three seconds; a short blip stays at "Reconnecting". */
function useOffline(since: number | null): boolean {
  const [elapsed, setElapsed] = useState<number | null>(null);
  useEffect(() => {
    if (since === null) return;
    const timer = window.setTimeout(() => setElapsed(since), OFFLINE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [since]);
  return since !== null && elapsed === since;
}

/** Why the room ended, once it has; a rejoin from another tab ("superseded") is not an ending the person needs told about. */
function useEndedWhy(client: RoomClient | undefined): Why | null {
  const [ended, setEnded] = useState<Held<Why> | null>(null);
  useEffect(
    () =>
      client?.on((e) => {
        if (e.t === "ended" && e.why !== "superseded")
          setEnded({ client, value: e.why });
      }),
    [client],
  );
  return client !== undefined && ended?.client === client ? ended.value : null;
}

/** The report of the latest rebase that dropped work, until the person closes it. */
function useRebaseReport(
  client: RoomClient | undefined,
): [Report | null, () => void] {
  const [held, setHeld] = useState<Held<Report> | null>(null);
  useEffect(
    () =>
      client?.on((e) => {
        if (e.t === "rebase" && e.report.dropped.length > 0)
          setHeld({ client, value: e.report });
      }),
    [client],
  );
  return [
    client !== undefined && held?.client === client ? held.value : null,
    () => setHeld(null),
  ];
}

function connection(
  status: RoomStatus,
  offline: boolean,
  kicked: boolean,
  t: StudioRoomsT,
): Line {
  switch (status.state) {
    case "connecting":
    case "authenticating":
      return { tone: "note", text: t("banner.connecting") };
    case "syncing":
      return { tone: "note", text: t("banner.syncing") };
    case "reconnecting":
      return offline
        ? { tone: "warn", text: t("banner.offlineKept") }
        : { tone: "warn", text: t("banner.reconnecting") };
    case "ended":
    case "failed": {
      if (kicked) return { tone: "danger", text: t("banner.kicked") };
      return status.access.mode === "readonly" &&
        status.access.reason === "closed"
        ? { tone: "warn", text: t("banner.closed") }
        : { tone: "warn", text: t("banner.ended") };
    }
    case "live": {
      const here = status.members.filter((m) => m.online).length;
      return {
        tone: "success",
        text: `${t("banner.live")}. ${t("members.count", { count: here })}`,
      };
    }
  }
}

function notice(
  access: EditAccess,
  pending: number,
  t: StudioRoomsT,
): string | null {
  if (access.mode !== "readonly") return null;
  switch (access.reason) {
    case "queue_full":
      return t("banner.queueFull", { count: pending });
    case "share":
      return t("banner.readOnlyShare");
    case "role":
      return t("banner.readOnlyRole");
    default:
      return null;
  }
}

/** The connection and access state of the room, in words, with a live region that speaks on a state change only. */
export function BannerArea({ t }: { t: StudioRoomsT }) {
  const handle = useRoomHandle();
  const status = useRoomStatus();
  const access = useEditAccess();
  const offline = useOffline(status?.offlineSince ?? null);
  const { library } = useServices();
  const why = useEndedWhy(handle?.client);
  const [report, closeReport] = useRebaseReport(handle?.client);

  if (!status && !(access.mode === "readonly" && access.reason === "share"))
    return null;

  const finalState = handle?.client.confirmed ?? null;
  const copyOf = (doc: Project) => () =>
    keepCopy(library, doc, {
      project: doc.id,
      revision: doc.revision,
      stateHash: stateHash(doc),
    });
  const endedNotice =
    status && why && finalState ? (
      <RoomEndedNotice
        why={why}
        isCreator={status.you?.role === "owner"}
        onKeepCopy={copyOf(finalState)}
        t={t}
      />
    ) : null;
  const line =
    status && !endedNotice
      ? connection(status, offline, why === "kicked", t)
      : null;
  const extra = notice(access, status?.pending ?? 0, t);
  const action = access.mode === "readonly" ? access.action : undefined;
  const pending = access.mode === "edit" ? (status?.pending ?? 0) : 0;

  return (
    <div className="mb-4 flex flex-wrap items-start gap-2">
      <div
        role="status"
        aria-live="polite"
        className="flex min-w-0 flex-1 flex-col gap-2"
      >
        {line ? <Callout tone={line.tone}>{line.text}</Callout> : null}
        {endedNotice}
        {extra ? (
          <Callout tone="note" variant={line ? "quiet" : "box"}>
            {extra}
          </Callout>
        ) : null}
      </div>
      {pending > 0 ? (
        <Chip tone="info" mono aria-live="off">
          {t("banner.pending", { count: pending })}
        </Chip>
      ) : null}
      {action ? (
        <Button size="sm" variant="secondary" onClick={() => void action.run()}>
          {action.id === "makeCopy" ? t("share.makeCopy") : t("fork.keepCopy")}
        </Button>
      ) : null}
      {report ? (
        <RebaseReport
          report={report}
          members={status?.members ?? []}
          onKeepCopy={async () => void (await copyOf(report.localBefore)())}
          onClose={closeReport}
          t={t}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Actor, CmdName } from "@/protocol";
import type { RoomHandle } from "@/collab/join";
import { Button, InlineStatus, Select } from "@/components/ui";
import { useRoomHandle, useRoomStatus, type StudioRoomsT } from "./RoomDock";

let sent = 0;

/** Sends one room command over the socket; the server decides whether the sender may. */
export function sendCommand(handle: RoomHandle, name: CmdName, args?: Record<string, unknown>): void {
  sent += 1;
  handle.client.send({ t: "cmd", id: `c-${Date.now().toString(36)}-${sent}`, name, ...(args && { args }) });
}

export function BatonControl({ t }: { t: StudioRoomsT }) {
  const handle = useRoomHandle();
  const status = useRoomStatus();
  const [askedWhile, setAskedWhile] = useState<{ holder: Actor | null } | null>(null);

  const you = status?.you;
  if (!handle || !status || !you || you.spectator || (you.role !== "owner" && you.role !== "editor")) return null;

  const { baton, members } = status;
  const holds = baton === you.actor;
  const holder = members.find((m) => m.actor === baton);
  const others = members.filter((m) => m.online && !m.spectator && (m.role === "owner" || m.role === "editor") && m.actor !== you.actor);
  const asked = askedWhile !== null && askedWhile.holder === baton;

  const summary = holds ? t("baton.youHold") : baton === null ? t("baton.free") : t("baton.heldBy", { name: holder?.name ?? "" });

  return (
    <div className="flex flex-wrap items-end gap-2" data-testid="baton-control">
      <p className="py-2 text-sm font-semibold">{summary}</p>
      {!holds ? (
        <Button
          size="sm"
          variant={baton === null ? "primary" : "secondary"}
          onClick={() => {
            sendCommand(handle, "baton.request");
            if (baton !== null) setAskedWhile({ holder: baton });
          }}
        >
          {baton === null ? t("baton.take") : t("baton.request")}
        </Button>
      ) : null}
      {(holds || you.host) && others.length > 0 ? (
        <Select
          label={t("baton.giveTo")}
          value=""
          onChange={(event) => event.target.value && sendCommand(handle, "baton.grant", { to: event.target.value })}
        >
          <option value="">{t("baton.pickPerson")}</option>
          {others.map((m) => (
            <option key={m.actor} value={m.actor}>
              {m.name}
            </option>
          ))}
        </Select>
      ) : null}
      {holds ? (
        <Button size="sm" variant="secondary" onClick={() => sendCommand(handle, "baton.release")}>
          {t("baton.release")}
        </Button>
      ) : null}
      {you.host && baton !== null && !holds ? (
        <Button size="sm" variant="secondary" onClick={() => sendCommand(handle, "baton.take")}>
          {t("baton.takeBack")}
        </Button>
      ) : null}
      {asked ? (
        <InlineStatus tone="info" live>
          {t("baton.asked")}
        </InlineStatus>
      ) : null}
    </div>
  );
}

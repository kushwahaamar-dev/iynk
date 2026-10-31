"use client";

import { useState } from "react";
import type { Actor, Member, RoomSettings } from "@/protocol";
import type { RoomHandle } from "@/collab/join";
import { Button, Callout, Icon, IconButton, Menu, Popover, Select, Toggle, type MenuItem } from "@/components/ui";
import { sendCommand } from "./BatonControl";
import { useRoomHandle, useRoomStatus, type StudioRoomsT } from "./RoomDock";

type Confirm = { kind: "kick"; actor: Actor; name: string } | { kind: "close" };

function memberItems(member: Member, handle: RoomHandle, t: StudioRoomsT, ask: (c: Confirm) => void): MenuItem[] {
  return [
    { id: "mute", label: t("host.mute"), onSelect: () => sendCommand(handle, "member.mute", { actor: member.actor, on: true }) },
    { id: "unmute", label: t("host.unmute"), onSelect: () => sendCommand(handle, "member.mute", { actor: member.actor, on: false }) },
    { id: "pass", label: t("host.pass", { name: member.name }), onSelect: () => sendCommand(handle, "host.pass", { to: member.actor }) },
    { separator: true },
    { id: "kick", label: t("host.kick"), tone: "danger", onSelect: () => ask({ kind: "kick", actor: member.actor, name: member.name }) },
  ];
}

export function HostControls({ t }: { t: StudioRoomsT }) {
  const handle = useRoomHandle();
  const status = useRoomStatus();
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const you = status?.you;
  if (!handle || !status || !you || (!you.host && you.role !== "owner")) return null;

  const settings = status.settings;
  const change = (patch: Partial<RoomSettings>) => sendCommand(handle, "room.settings", { settings: patch });
  const others = status.members.filter((m) => m.actor !== you.actor);

  const accept = () => {
    if (confirm?.kind === "kick") sendCommand(handle, "member.kick", { actor: confirm.actor });
    else if (confirm?.kind === "close") sendCommand(handle, "room.close");
    setConfirm(null);
  };

  return (
    <Popover
      label={t("host.title")}
      className="w-[min(24rem,calc(100vw-2rem))]"
      trigger={
        <Button size="sm" variant="secondary">
          <Icon name="key" size={16} />
          {t("host.title")}
        </Button>
      }
    >
      {confirm ? (
        <Callout tone="warn" live>
          <p className="font-semibold">{confirm.kind === "kick" ? t("host.kickConfirm", { name: confirm.name }) : t("host.closeConfirm")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="danger" onClick={accept}>
              {confirm.kind === "kick" ? t("host.kick") : t("host.close")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirm(null)}>
              {t("share.keep")}
            </Button>
          </div>
        </Callout>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2" aria-label={t("members.title")}>
            {others.map((member) => (
              <li key={member.actor} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold">
                  {member.name}
                  <span className="ms-2 font-normal text-muted">{t(`members.role.${member.role}`)}</span>
                </span>
                {you.host ? (
                  <Menu
                    label={t("host.memberActions", { name: member.name })}
                    items={memberItems(member, handle, t, setConfirm)}
                    trigger={<IconButton label={t("host.memberActions", { name: member.name })} icon="chevron-down" size="sm" />}
                  />
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {you.host ? (
              <Button size="sm" variant="secondary" onClick={() => sendCommand(handle, "room.lock", { on: settings?.locked !== true })}>
                {settings?.locked ? t("host.unlock") : t("host.lock")}
              </Button>
            ) : (
              <Button size="sm" variant="primary" onClick={() => sendCommand(handle, "host.claim")}>
                {t("host.claim")}
              </Button>
            )}
          </div>
          {you.host && settings ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-semibold">{t("host.settings")}</legend>
              <Toggle checked={settings.codeMode === "baton"} onChange={() => {}} disabled label={t("host.keyboardPassing")} />
              <Select
                label={t("host.runControl")}
                value={settings.runControl}
                onChange={(event) => change({ runControl: event.target.value === "host" ? "host" : "editors" })}
              >
                <option value="editors">{t("host.runEditors")}</option>
                <option value="host">{t("host.runHost")}</option>
              </Select>
              <Toggle
                checked={settings.spectatorCursors}
                onChange={(on) => change({ spectatorCursors: on })}
                label={t("host.spectatorCursors")}
              />
            </fieldset>
          ) : null}
          {you.host ? (
            <Button size="sm" variant="danger" onClick={() => setConfirm({ kind: "close" })}>
              {t("host.close")}
            </Button>
          ) : null}
        </div>
      )}
    </Popover>
  );
}

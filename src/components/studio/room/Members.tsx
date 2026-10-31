"use client";

import { useSyncExternalStore } from "react";
import { PeerAvatar } from "@/components/realtime/PeerAvatar";
import { Chip, cx } from "@/components/ui";
import type { MemberView, PresenceSnapshot } from "@/collab/presence";
import { usePresence, type StudioRoomsT } from "./RoomDock";

const NOBODY: PresenceSnapshot = { me: null, members: [], host: null, baton: null, cursors: new Map(), events: [] };
const NO_UPDATES = () => () => {};

function MemberRow({ member, mine, t }: { member: MemberView; mine: MemberView | null; t: StudioRoomsT }) {
  const version = member.app && member.app !== mine?.app ? member.app : null;
  return (
    <li className={cx("flex items-center gap-3 py-2", !member.online && "opacity-70")}>
      <PeerAvatar name={member.name} color={member.color} baton={member.baton} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-semibold break-words [overflow-wrap:anywhere]">{member.name}</span>
          {member.m === mine?.m ? <span className="text-muted">({t("members.you")})</span> : null}
        </p>
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{t(`members.role.${member.role}`)}</span>
          {member.host ? <Chip tone="ink">{t("members.host")}</Chip> : null}
          {member.baton ? <Chip tone="info">{t("members.holder")}</Chip> : null}
          <Chip tone={member.online ? "good" : "neutral"}>{t(member.online ? "members.online" : "members.offline")}</Chip>
          {version ? (
            <span className="tabular">
              {t("members.appVersion")} {version}
            </span>
          ) : null}
        </p>
      </div>
    </li>
  );
}

function Group({ title, members, mine, t }: { title: string; members: readonly MemberView[]; mine: MemberView | null; t: StudioRoomsT }) {
  return (
    <section aria-label={title} className="flex flex-col">
      <h3 className="mb-2 text-xs font-semibold text-muted">{title}</h3>
      <ul className="flex flex-col divide-y divide-rule">
        {members.map((member) => (
          <MemberRow key={member.actor} member={member} mine={mine} t={t} />
        ))}
      </ul>
    </section>
  );
}

/** Who is in the room, what each person may do, and who holds the host and the keyboard. */
export function Members({ t }: { t: StudioRoomsT }) {
  const presence = usePresence();
  const { me, members } = useSyncExternalStore(
    (fn) => presence?.subscribe(fn) ?? NO_UPDATES(),
    () => presence?.getSnapshot() ?? NOBODY,
    () => NOBODY,
  );
  const people = members.filter((member) => !member.spectator);
  const watching = members.filter((member) => member.spectator);
  return (
    <div className="flex flex-col gap-4">
      <Group title={t("members.count", { count: people.length })} members={people} mine={me} t={t} />
      {watching.length > 0 ? <Group title={t("members.spectator")} members={watching} mine={me} t={t} /> : null}
    </div>
  );
}

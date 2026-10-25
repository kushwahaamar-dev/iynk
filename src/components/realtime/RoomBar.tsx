"use client";

import { useId, useMemo, useState } from "react";
import { Button, Callout, Chip, Dialog } from "@/components/ui";
import { ROLES, type Peer, type Role, type RoomApi } from "@/lib/realtime";
import { InviteDialog } from "./InviteDialog";
import type { TogetherT } from "./messages";
import { PeerAvatar } from "./PeerAvatar";
import { setPointing, usePointing } from "./pointing";

/** Who's in the room, the invite, your role, the keyboard baton, leave. */
export function RoomBar({ room, t, onLeave, onRename }: { room: RoomApi; t: TogetherT; onLeave: () => void; onRename?: () => void }) {
  const id = useId();
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<Peer | null>(null);
  const [passTo, setPassTo] = useState("");
  const pointing = usePointing();
  // Refused edits you've already answered, per keyboard holder (the count restarts when it moves).
  const [deniedSeen, setDeniedSeen] = useState({ holder: room.batonHolder, count: 0 });
  const everyone = useMemo(() => [room.you, ...room.peers], [room.you, room.peers]);
  const youHost = room.hostId === room.you.id;
  const youHold = room.batonHolder === room.you.id;
  const holder = everyone.find((peer) => peer.id === room.batonHolder);

  // The newest keyboard request, unless the keyboard moved since.
  const request = useMemo(() => {
    for (let i = room.messages.length - 1; i >= 0; i -= 1) {
      const event = room.messages[i].system;
      if (event?.event === "baton") return null;
      if (event?.event === "baton-request") return event.peer !== room.you.id ? event : null;
    }
    return null;
  }, [room.messages, room.you.id]);

  const denied = !youHold && room.batonDenied > (deniedSeen.holder === room.batonHolder ? deniedSeen.count : 0);
  const present = (peerId: string | undefined) => room.peers.some((peer) => peer.id === peerId);
  // Pass to whoever asked, unless you picked someone else.
  const passTarget = present(passTo) ? passTo : present(request?.peer) ? request!.peer : (room.peers[0]?.id ?? "");

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`${id}-title`} className="font-head text-base font-bold">
          {t("bar.label", { code: room.id })}
        </h3>
        <Chip tone={room.status === "live" ? (room.transport === "ws" ? "mint" : "cobalt") : "mustard"} dot>
          {t(`bar.status.${room.status === "live" ? room.transport : room.status}`)}
        </Chip>
        <div className="flex basis-full flex-wrap gap-1.5">
          <Button size="sm" variant="primary" onClick={() => setInviting(true)}>
            {t("bar.invite")}
          </Button>
          {onRename ? (
            <Button size="sm" variant="ghost" onClick={onRename}>
              {t("identity.rename")}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={onLeave}>
            {t("bar.leave")}
          </Button>
        </div>
      </div>

      {room.status === "reconnecting" ? <Callout tone="warn" live>{t("panel.reconnecting")}</Callout> : null}
      {room.status === "syncing" ? <Callout tone="note" live>{t("panel.syncing")}</Callout> : null}

      <div>
        <div className="mb-1 flex min-h-9 items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted">{t("bar.people", { count: everyone.length })}</p>
          {room.peers.length > 0 ? (
            <Button size="sm" variant="ghost" aria-pressed={pointing} onClick={() => setPointing(!pointing)} className="gap-1.5">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <path d="M3 2l9 5-4 1-1.6 4z" />
              </svg>
              {t("cursors.point")}
            </Button>
          ) : null}
        </div>
        <ul className="flex flex-col gap-1.5">
          {everyone.map((peer) => (
            <li key={peer.id} className="flex min-h-11 items-center gap-2">
              <PeerAvatar name={peer.name} color={peer.color} baton={peer.baton} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {peer.name}
                  {peer.id === room.you.id ? <span className="font-normal text-muted"> ({t("bar.you")})</span> : null}
                </p>
                <p className="truncate text-xs text-muted">
                  {[
                    peer.id === room.hostId ? t("bar.host") : null,
                    peer.role ? t(`bar.roles.${peer.role}`) : null,
                    t("bar.peerLanguage", { lang: t(`languages.${peer.lang}`) }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {youHost && peer.id !== room.you.id ? (
                <Button size="sm" variant="ghost" onClick={() => setRemoving(peer)} aria-label={t("bar.remove", { name: peer.name })}>
                  {t("bar.removeYes")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`${id}-role`}>
        {t("bar.role")}
        <select
          id={`${id}-role`}
          value={room.you.role ?? ""}
          onChange={(event) => room.setPresence({ role: (event.target.value || undefined) as Role | undefined })}
          className="ink-field w-full font-normal"
        >
          <option value="">{t("bar.roles.none")}</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`bar.roles.${role}`)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2 rounded-ink-sm bg-sunken p-3">
        <p className="flex items-center gap-2 text-sm font-semibold" aria-live="polite">
          <PeerAvatar name={holder?.name ?? ""} color={holder?.color ?? "#cfc8b8"} baton size="sm" />
          {youHold ? t("bar.keyboardYou") : t("bar.keyboardOther", { name: holder?.name ?? t("chat.someone") })}
        </p>
        {youHold && request ? <p className="text-sm">{t("bar.asked", { name: request.name })}</p> : null}
        {youHold && room.peers.length > 0 ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold" htmlFor={`${id}-pass`}>
              {t("bar.passTo")}
              <select
                id={`${id}-pass`}
                value={passTarget}
                onChange={(event) => setPassTo(event.target.value)}
                className="ink-field w-full font-normal"
              >
                {room.peers.map((peer) => (
                  <option key={peer.id} value={peer.id}>
                    {peer.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              onClick={() => {
                if (passTarget) room.passBaton(passTarget);
                setPassTo("");
              }}
            >
              {t("bar.pass")}
            </Button>
          </div>
        ) : null}
        {!youHold ? (
          <div className="flex flex-wrap gap-2">
            {youHost ? (
              <Button size="sm" onClick={() => room.passBaton(room.you.id)}>
                {t("bar.take")}
              </Button>
            ) : (
              <Button size="sm" onClick={() => room.requestBaton()}>
                {t("bar.ask")}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {denied ? (
        <Callout tone="tip" live>
          <span className="flex flex-wrap items-center gap-2">
            {t("bar.denied", { name: holder?.name ?? t("chat.someone") })}
            <Button
              size="sm"
              onClick={() => {
                room.requestBaton();
                setDeniedSeen({ holder: room.batonHolder, count: room.batonDenied });
              }}
            >
              {t("bar.ask")}
            </Button>
          </span>
        </Callout>
      ) : null}

      <InviteDialog
        open={inviting}
        onClose={() => setInviting(false)}
        link={room.link}
        code={room.id}
        title={t("bar.inviteTitle", { code: room.id })}
        hint={t("bar.inviteHint")}
        t={t}
      />
      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={removing ? t("bar.removeConfirm", { name: removing.name }) : ""}
        closeLabel={t("bar.close")}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              {t("identity.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (removing) room.kick(removing.id);
                setRemoving(null);
              }}
            >
              {t("bar.removeYes")}
            </Button>
          </div>
        }
      />
    </section>
  );
}

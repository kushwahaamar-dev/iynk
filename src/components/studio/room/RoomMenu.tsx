"use client";

import type { Actor } from "@/protocol";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { inviteLink, type RoomHandle } from "@/collab/join";
import type { LobbyClient } from "@/collab/lobby";
import { createInvite, describeRoomError, revokeInvite, type RoomInvite } from "@/collab/rooms-api";
import { InviteDialog } from "@/components/realtime/InviteDialog";
import type { TogetherT } from "@/components/realtime/messages";
import { Button, Dialog, Icon, InlineStatus, Menu, Select, type MenuItem } from "@/components/ui";
import type { ServerClient } from "@/server-client/client";
import { useRoomHandle, useRoomStatus, type StudioRoomsT } from "./RoomDock";

/** What the menu needs from the signed in session; `run` is the Studio command of that name. */
export type RoomMenuEnv = {
  client: ServerClient;
  lobby: LobbyClient;
  lang: string;
  run: (command: "room.open" | "room.join" | "room.leave" | "room.close") => void;
};

const EnvContext = createContext<RoomMenuEnv | null>(null);
export const RoomMenuEnvProvider = EnvContext.Provider;

export function useRoomMenuEnv(): RoomMenuEnv | null {
  return useContext(EnvContext);
}

type LinkRole = "viewer" | "editor";
type Panel =
  | { step: "picking" }
  | { step: "creating" }
  | { step: "inviting"; invite: RoomInvite; link: string; note: string }
  | { step: "live" }
  | { step: "closing" };
type Intent = { kind: "link"; role: LinkRole } | { kind: "buddy"; actor: Actor };
type Status = { tone: "good" | "bad" | "info"; text: string };

export function RoomMenu({ t, tt }: { t: StudioRoomsT; tt: TogetherT }) {
  const env = useRoomMenuEnv();
  return env ? <Menus env={env} t={t} tt={tt} /> : null;
}

function Menus({ env, t, tt }: { env: RoomMenuEnv; t: StudioRoomsT; tt: TogetherT }) {
  const handle = useRoomHandle();
  const status = useRoomStatus();
  const [serverHasRooms, setServerHasRooms] = useState<boolean | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [role, setRole] = useState<LinkRole>("viewer");
  const [live, setLive] = useState<RoomInvite[]>([]);
  const [line, setLine] = useState<Status | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);

  const lobby = useSyncExternalStore(env.lobby.subscribe, env.lobby.getSnapshot, env.lobby.getSnapshot);

  useEffect(() => {
    let current = true;
    void env.client.probe().then(
      (info) => current && setServerHasRooms(info.features.rooms),
      () => current && setServerHasRooms(false),
    );
    return () => {
      current = false;
    };
  }, [env]);

  const failure = (e: unknown): string => {
    const kind = describeRoomError(e);
    if (kind === "needs_server") return t("invite.needsServer");
    if (kind === "quota") return t("invite.quota");
    return kind === "tooLarge" ? t("share.tooLarge") : t("share.networkError");
  };

  const expiry = (invite: RoomInvite) => t("invite.expires", { when: new Date(invite.expiresAt).toLocaleString(env.lang, { dateStyle: "medium", timeStyle: "short" }) });
  const describe = (invite: RoomInvite) => [t(`members.role.${invite.role}`), t("invite.uses", { count: invite.maxUses }), expiry(invite)].join(", ");

  const makeLink = (h: RoomHandle, linkRole: LinkRole) =>
    createInvite(env.client, h.room.id, { link: true, role: linkRole }).then(
      ({ invite, token }) => {
        if (token === undefined) return setPanel({ step: "picking" });
        setLive((all) => [...all, invite]);
        setPanel({ step: "inviting", invite, link: inviteLink(window.location.origin, env.lang, h.room.id, token), note: describe(invite) });
      },
      (e) => {
        setLine({ tone: "bad", text: failure(e) });
        setPanel({ step: "picking" });
      },
    );

  const inviteBuddy = (h: RoomHandle, actor: Actor) =>
    createInvite(env.client, h.room.id, { buddy: actor, role: "editor" }).then(
      ({ invite }) => {
        setLive((all) => [...all, invite]);
        setLine({ tone: "good", text: t("invite.sent") });
      },
      (e) => setLine({ tone: "bad", text: failure(e) }),
    );

  // Runs once per request: the room opens first when there is none, and the request waits for its handle.
  useEffect(() => {
    if (!handle || !intent) return;
    const work = intent.kind === "link" ? makeLink(handle, intent.role) : inviteBuddy(handle, intent.actor);
    void work.then(() => setIntent(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the handlers are rebuilt on every render; only a new handle or request should start work
  }, [handle, intent]);

  const request = (next: Intent) => {
    if (next.kind === "link") setPanel({ step: "creating" });
    else setLine({ tone: "info", text: t("banner.connecting") });
    setIntent(next);
    if (!handle) env.run("room.open");
  };

  const revoke = (invite: RoomInvite) =>
    revokeInvite(env.client, invite.roomId, invite.id).then(
      () => {
        setLive((all) => all.filter((other) => other.id !== invite.id));
        setPanel((open) => (open?.step === "inviting" && open.invite.id === invite.id ? null : open));
      },
      (e) => setLine({ tone: "bad", text: failure(e) }),
    );

  const leave = () => {
    env.run("room.leave");
    setLive([]);
  };

  const items: MenuItem[] = [];
  const waiting = lobby.invites[0];
  if (!handle && waiting) {
    const from = lobby.buddies.find((buddy) => buddy.actor === waiting.from)?.name ?? waiting.from;
    items.push(
      { id: "join", label: `${t("invite.join")}: ${t("invite.invitedBy", { name: from, title: waiting.title })}`, icon: "people", onSelect: () => env.run("room.join") },
      { id: "decline", label: t("invite.decline"), onSelect: () => env.lobby.dismiss(waiting.room) },
      { separator: true },
    );
  }
  for (const buddy of lobby.buddies) {
    const away = buddy.online ? "" : ` (${t("invite.away")})`;
    items.push({ id: buddy.actor, label: `${t("invite.titleFor", { name: buddy.name })}${away}`, icon: "send", onSelect: () => request({ kind: "buddy", actor: buddy.actor }) });
  }
  if (lobby.buddies.length === 0) items.push({ id: "none", label: t("invite.noBuddies"), disabled: true, onSelect: () => {} });
  items.push(
    { separator: true },
    { id: "link", label: handle ? t("invite.open") : t("invite.copyLink"), icon: "link", onSelect: () => setPanel({ step: "picking" }) },
  );
  if (live.length > 0) items.push({ id: "live", label: `${t("invite.live")} (${live.length})`, onSelect: () => setPanel({ step: "live" }) });
  if (handle) {
    items.push({ separator: true }, { id: "leave", label: t("members.leave"), onSelect: leave });
    if (status?.you?.host) items.push({ id: "close", label: t("host.close"), tone: "danger", onSelect: () => setPanel({ step: "closing" }) });
  }

  const count = lobby.invites.length;
  const label = count > 0 && !handle ? `${t("invite.menu")}, ${t("invite.invitations", { count })}` : t("invite.menu");
  const locked: MenuItem[] = [{ id: "needs-server", label: t("invite.needsServer"), disabled: true, onSelect: () => {} }];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Menu
        label={t("invite.menu")}
        items={serverHasRooms === false ? locked : items}
        trigger={
          <Button size="sm" variant="secondary">
            <Icon name="people" size={16} />
            {label}
          </Button>
        }
      />
      {line ? (
        <InlineStatus tone={line.tone} live>
          {line.text}
        </InlineStatus>
      ) : null}
      <Dialog
        open={panel?.step === "picking" || panel?.step === "creating"}
        onClose={() => setPanel(null)}
        title={t("invite.open")}
        description={t("invite.hint")}
        closeLabel={t("share.close")}
        size="sm"
      >
        <div className="flex flex-col gap-3">
          <Select label={t("invite.roleLabel")} value={role} onChange={(event) => setRole(event.target.value === "editor" ? "editor" : "viewer")}>
            <option value="viewer">{t("invite.roleViewer")}</option>
            <option value="editor">{t("invite.roleEditor")}</option>
          </Select>
          <Button variant="primary" busy={panel?.step === "creating"} onClick={() => request({ kind: "link", role })}>
            {t("share.create")}
          </Button>
          {line?.tone === "bad" ? (
            <InlineStatus tone="bad" live>
              {line.text}
            </InlineStatus>
          ) : null}
        </div>
      </Dialog>
      {panel?.step === "inviting" ? (
        <InviteDialog
          open
          onClose={() => setPanel(null)}
          link={panel.link}
          title={t("invite.open")}
          hint={t("invite.hint")}
          code={handle?.room.title ?? ""}
          note={panel.note}
          action={{ label: t("invite.revoke"), run: () => void revoke(panel.invite) }}
          t={tt}
        />
      ) : null}
      <Dialog open={panel?.step === "live"} onClose={() => setPanel(null)} title={t("invite.live")} closeLabel={t("share.close")} size="sm">
        <ul className="flex flex-col gap-3">
          {live.map((invite) => (
            <li key={invite.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-sm">{describe(invite)}</span>
              <Button size="sm" variant="secondary" onClick={() => void revoke(invite)}>
                {t("invite.revoke")}
              </Button>
            </li>
          ))}
        </ul>
      </Dialog>
      <Dialog open={panel?.step === "closing"} onClose={() => setPanel(null)} title={t("host.close")} description={t("host.closeConfirm")} closeLabel={t("share.close")} size="sm">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="danger"
            onClick={() => {
              setPanel(null);
              env.run("room.close");
            }}
          >
            {t("host.close")}
          </Button>
          <Button variant="secondary" onClick={() => setPanel(null)}>
            {t("share.keep")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

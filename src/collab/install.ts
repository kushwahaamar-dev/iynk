import type { ProjectSession } from "../project/session.ts";
import { NeedsEnrolment } from "../server-client/types.ts";
import { joinRoom, openRoomFor, parseJoinFragment } from "./join.ts";
import type { RoomHandle, RoomOpenDeps } from "./join.ts";
import { LobbyClient } from "./lobby.ts";
import { closeRoom, describeRoomError } from "./rooms-api.ts";
import type { RoomTransport } from "./ws-transport.ts";

/** What a command is run with; Studio's command context has this shape. */
export type CollabCtx = { doc: { session: ProjectSession } };

export type CollabCommand = {
  id: string;
  labelKey: string;
  keys?: string[];
  scope: "global";
  enabled(ctx: CollabCtx): boolean;
  run(ctx: CollabCtx): void;
};

export type CollabNotice = "invite.expired" | "share.needsServer" | "share.networkError";

export type CollabInstallDeps = RoomOpenDeps & {
  registerCommand: (c: CollabCommand) => () => void;
  connectLobby: () => RoomTransport;
  /** The address bar's current hash, and a way to hear it change. */
  readHash: () => string;
  onHash: (fn: () => void) => () => void;
  navigate: (hash: string) => void;
  replaceHash: (hash: string) => void;
  /** The session to share, or null when the dialog closes. */
  onShare: (session: ProjectSession | null) => void;
  onHandle?: (h: RoomHandle | null) => void;
  onNotice: (notice: CollabNotice) => void;
  /** A link was opened by a browser that has no enrolment; the token has already been taken off the address. */
  onNeedsEnrolment: () => void;
};

const noticeFor = (e: unknown): CollabNotice => {
  const kind = describeRoomError(e);
  if (kind === "needs_server") return "share.needsServer";
  return kind === "network" ? "share.networkError" : "invite.expired";
};

/** Registers the room commands, starts the lobby and acts on a join link. The returned function undoes all of it. */
export function installCollab(d: CollabInstallDeps): () => void {
  const lobby = new LobbyClient(d.connectLobby, d.clock, d.timers, { random: d.random, hidden: d.hidden });
  let handle: RoomHandle | null = null;
  let rooms: boolean | null = null;
  let joining = false;
  let disposed = false;

  const hold = (next: RoomHandle | null) => {
    handle = next;
    d.onHandle?.(next);
  };

  const fail = (e: unknown) => d.onNotice(noticeFor(e));

  const projectHash = (h: RoomHandle): Promise<string> =>
    new Promise((resolve) => {
      const known = h.client.confirmed?.id;
      if (known !== undefined) return resolve(`#/${known}`);
      const off = h.client.on((e) => {
        const id = h.client.confirmed?.id;
        if (e.t === "view" && id !== undefined) {
          off();
          resolve(`#/${id}`);
        } else if (e.t === "ended") {
          off();
          resolve("#/");
        }
      });
    });

  const fromFragment = async () => {
    const link = parseJoinFragment(d.readHash());
    if (!link || joining || disposed) return;
    joining = true;
    try {
      if (handle) {
        d.replaceHash(await projectHash(handle));
        return d.onNotice("invite.expired");
      }
      d.replaceHash("#/");
      const joined = await joinRoom(d, link.room, link.token);
      hold(joined);
      d.replaceHash(await projectHash(joined));
    } catch (e) {
      if (e instanceof NeedsEnrolment) d.onNeedsEnrolment();
      else fail(e);
    } finally {
      joining = false;
    }
  };

  const offCommands = [
    d.registerCommand({
      id: "room.open",
      labelKey: "studio.rooms.invite.workTogether",
      scope: "global",
      enabled: () => rooms !== false && handle === null,
      run: ({ doc }) => void openRoomFor(d, doc.session, doc.session.state.meta.title).then(hold, fail),
    }),
    d.registerCommand({
      id: "room.join",
      labelKey: "studio.rooms.invite.join",
      scope: "global",
      enabled: () => rooms !== false && handle === null && lobby.getSnapshot().invites.length > 0,
      run: () => {
        const invite = lobby.getSnapshot().invites[0];
        if (!invite) return;
        lobby.dismiss(invite.room);
        joinRoom(d, invite.room, null, invite.room)
          .then(async (joined) => {
            hold(joined);
            d.navigate(await projectHash(joined));
          })
          .catch(fail);
      },
    }),
    d.registerCommand({
      id: "room.leave",
      labelKey: "studio.rooms.members.leave",
      scope: "global",
      enabled: () => handle !== null,
      run: () => {
        handle?.leave();
        hold(null);
      },
    }),
    d.registerCommand({
      id: "room.close",
      labelKey: "studio.rooms.host.close",
      scope: "global",
      enabled: () => handle !== null && handle.room.hostId === d.me.identityId,
      run: () => {
        const closing = handle;
        if (!closing) return;
        closeRoom(d.client, closing.room.id).then(
          () => {
            closing.leave();
            if (handle === closing) hold(null);
          },
          fail,
        );
      },
    }),
    d.registerCommand({
      id: "share.open",
      labelKey: "studio.rooms.invite.open",
      scope: "global",
      enabled: () => true,
      run: ({ doc }) => d.onShare(doc.session),
    }),
  ];

  d.client.probe().then(
    (info) => (rooms = info.features.rooms),
    () => (rooms = false),
  );
  lobby.start();
  const offHash = d.onHash(() => void fromFragment());
  void fromFragment();

  return () => {
    disposed = true;
    offHash();
    for (const off of offCommands) off();
    lobby.stop();
  };
}

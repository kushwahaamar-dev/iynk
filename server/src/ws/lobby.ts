import type { Actor, DeviceId, LobbyBuddy, LobbyInvite, Role, RoomId, ServerFrame } from "../../../src/protocol/frames.ts";

export type BuddyInfo = { device: DeviceId; actor: Actor; name: string; color: string; showOnline: boolean };

type Link = { send: (f: ServerFrame) => void; known: BuddyInfo[] };

export class LobbyHub {
  readonly #links = new Map<DeviceId, Link>();
  readonly #buddiesOf: (device: DeviceId) => BuddyInfo[];

  constructor(d: { buddiesOf(device: DeviceId): BuddyInfo[] }) {
    this.#buddiesOf = d.buddiesOf;
  }

  /** Sends the buddy list and tells connected buddies this device is online, unless its owner chose to appear offline. */
  attach(device: DeviceId, send: (f: ServerFrame) => void): () => void {
    const link: Link = { send, known: this.#buddiesOf(device) };
    this.#links.set(device, link);
    send({ t: "buddies", list: this.#list(link.known) });
    this.#announce(device);
    return () => {
      if (this.#links.get(device) !== link) return;
      this.#links.delete(device);
      this.#announce(device);
    };
  }

  pushInvite(toDevice: DeviceId, inv: { room: RoomId; from: Actor; title: string; role: Role; expires: string }): boolean {
    const link = this.#links.get(toDevice);
    if (!link) return false;
    const frame: LobbyInvite = { t: "invite", ...inv };
    link.send(frame);
    return true;
  }

  isOnline(device: DeviceId): boolean {
    return this.#links.has(device);
  }

  buddyRemoved(a: DeviceId, b: DeviceId): void {
    for (const [mine, theirs] of [[a, b], [b, a]] as const) {
      const link = this.#links.get(mine);
      if (!link) continue;
      const gone = link.known.find((info) => info.device === theirs);
      if (gone) link.send({ t: "buddy", actor: gone.actor, patch: { online: false } });
      link.known = this.#buddiesOf(mine);
      link.send({ t: "buddies", list: this.#list(link.known) });
    }
  }

  #appearsOnline(known: BuddyInfo[], actor: Actor): boolean {
    return known.some((info) => info.actor === actor && info.showOnline && this.#links.has(info.device));
  }

  #list(known: BuddyInfo[]): LobbyBuddy[] {
    const byActor = new Map<Actor, LobbyBuddy>();
    for (const info of known) {
      const seen = byActor.get(info.actor);
      byActor.set(info.actor, { actor: info.actor, name: seen?.name ?? info.name, color: seen?.color ?? info.color, online: this.#appearsOnline(known, info.actor) });
    }
    return [...byActor.values()];
  }

  #announce(device: DeviceId): void {
    for (const buddy of this.#buddiesOf(device)) {
      const link = this.#links.get(buddy.device);
      if (!link) continue;
      const view = this.#buddiesOf(buddy.device);
      const me = view.find((info) => info.device === device);
      if (!me?.showOnline) continue;
      link.known = view;
      link.send({ t: "buddy", actor: me.actor, patch: { online: this.#appearsOnline(view, me.actor) } });
    }
  }
}

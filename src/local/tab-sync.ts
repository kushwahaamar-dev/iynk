export interface TabAnnouncement {
  id: string;
  revision: number;
  hash: string;
}

export interface TabSync {
  announce(m: TabAnnouncement): void;
  /** Called for a save made by another tab. A tab never hears its own announcements. */
  onOther(fn: (m: TabAnnouncement) => void): () => void;
}

const isAnnouncement = (data: unknown): data is TabAnnouncement => {
  if (typeof data !== "object" || data === null) return false;
  const m = data as Record<string, unknown>;
  return typeof m.id === "string" && typeof m.revision === "number" && typeof m.hash === "string";
};

/** `channel` is null where `BroadcastChannel` does not exist; the tab then works alone. */
export function createTabSync(channel: Pick<BroadcastChannel, "postMessage" | "addEventListener" | "removeEventListener"> | null): TabSync {
  return {
    announce({ id, revision, hash }) {
      channel?.postMessage({ id, revision, hash });
    },

    onOther(fn) {
      if (!channel) return () => undefined;
      const listener = (ev: MessageEvent) => {
        if (isAnnouncement(ev.data)) fn(ev.data);
      };
      channel.addEventListener("message", listener);
      return () => channel.removeEventListener("message", listener);
    },
  };
}

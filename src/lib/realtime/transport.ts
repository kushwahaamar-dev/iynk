import type { ClientMsg, ServerMsg } from "./protocol";

export type TransportKind = "ws" | "broadcast";

export type TransportStatus = "connecting" | "open" | "reconnecting" | "closed";

/**
 * One connection to a room. The transport re-sends the join frame from
 * `join()` on every (re)connect, so a dropped peer resumes as itself.
 */
export type Transport = {
  readonly kind: TransportKind;
  start(join: () => Extract<ClientMsg, { t: "join" }>): void;
  /** False when the frame could not go out now (not connected, or too big). */
  send(msg: ClientMsg): boolean;
  onMessage(listener: (msg: ServerMsg) => void): () => void;
  onStatus(listener: (status: TransportStatus) => void): () => void;
  close(): void;
};

/** A tiny listener set shared by the transports. */
export function listeners<T>() {
  const set = new Set<(value: T) => void>();
  return {
    add(listener: (value: T) => void) {
      set.add(listener);
      return () => {
        set.delete(listener);
      };
    },
    emit(value: T) {
      for (const listener of [...set]) listener(value);
    },
    clear() {
      set.clear();
    },
  };
}

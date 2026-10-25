import type { LabKind, LabStore } from "@/components/dock/types";
import { track } from "@/lib/telemetry";
import { newId, type Action } from "./protocol";
import type { RoomClient } from "./room";
import { HYDRATE, labSync } from "./shared-actions";

type SyncOptions = {
  /**
   * The page this store belongs to, the same in every language ("/boards/nano/blink"). A room spans
   * one lab item, so a board's lessons and a drone's fly page share it: actions and snapshots carry
   * the scope, and a screen only takes the ones from its own page.
   */
  scope?: string;
  debounceMs?: number;
  maxWaitMs?: number;
};

type Snapshot = { scope: string; state: unknown };

const isSnapshot = (value: unknown): value is Snapshot =>
  typeof value === "object" && value !== null && typeof (value as Snapshot).scope === "string" && "state" in value;

/**
 * Puts a lab store in a room. While attached, the store's dispatch sends
 * shared actions to the relay instead of applying them, and the room applies
 * them back in seq order through the original dispatch. Lab pages keep
 * calling store.dispatch as before; detaching restores it.
 *
 * The keyboard baton is enforced here, not in the UI: a build action from
 * anyone but its holder is refused (and `batonDenied` bumped so the page can
 * say why), and on apply only the holder at that point in the order counts.
 * Code edits are applied at once by the holder (so typing never waits for the
 * network) and everyone else follows the full text, sent debounced.
 */
export function attachStore<S, A extends { type: string }>(
  store: LabStore<S, A>,
  lab: LabKind,
  room: RoomClient,
  options: SyncOptions = {},
): () => void {
  const scope = options.scope ?? "";
  const debounceMs = options.debounceMs ?? 200;
  const maxWaitMs = options.maxWaitMs ?? 800;
  const sync = labSync(lab);
  const target = store as { dispatch: (action: A) => void };
  const hadOwn = Object.prototype.hasOwnProperty.call(store, "dispatch");
  const previous = store.dispatch;
  const original = previous.bind(store) as (action: A) => void;
  const run = (action: Action) => original(action as unknown as A);
  const send = (action: Action) => room.sendAction({ ...action, scope });
  /** Nonces of code we applied before sending, so our own echo is skipped. */
  const ownCode = new Set<string>();
  let edits: Action[] = [];
  let sentKey = sync.codeKey(store.getState());
  let timer: ReturnType<typeof setTimeout> | undefined;
  let firstEditAt = 0;

  const flushCode = () => {
    clearTimeout(timer);
    timer = undefined;
    firstEditAt = 0;
    const state = store.getState();
    const key = sync.codeKey(state);
    const pending = edits;
    edits = [];
    if (key === sentKey) return;
    const actions = sync.codeSync(state, pending);
    if (!actions) return;
    sentKey = key;
    for (const action of actions) {
      const n = newId(8);
      ownCode.add(n);
      send({ ...action, n });
    }
  };

  const scheduleCode = () => {
    const now = Date.now();
    if (!firstEditAt) firstEditAt = now;
    clearTimeout(timer);
    timer = setTimeout(flushCode, Math.max(0, Math.min(debounceMs, firstEditAt + maxWaitMs - now)));
  };

  const intercept = (action: A) => {
    const shared = action as unknown as Action;
    if (!sync.isShared(action.type)) return original(action);
    if (!sync.isFree(action.type) && !room.holdsBaton()) {
      room.denyBaton();
      return;
    }
    if (sync.isCodeEdit(action.type) && sync.codeSync(store.getState(), [shared]) !== null) {
      original(action);
      edits.push(shared);
      scheduleCode();
      return;
    }
    // Everything else, and code that isn't readable as text, travels as it is, in order.
    send(shared);
    // The type only, never the payload; code text going out as you type isn't counted.
    track("room.action", { type: action.type });
  };

  room.bind({
    snapshot: (): Snapshot => ({ scope, state: store.getState() }),
    hydrate: (snapshot) => {
      if (!isSnapshot(snapshot) || snapshot.scope !== scope) return;
      run({ type: HYDRATE, state: snapshot.state });
      for (const action of sync.resume(snapshot.state)) run(action);
      sentKey = sync.codeKey(store.getState());
    },
    apply: (action, from) => {
      if (typeof action.scope === "string" && action.scope !== scope) return;
      const self = from === room.getState().you.id;
      if (self && typeof action.n === "string" && ownCode.delete(action.n)) return;
      // A build action only counts from whoever held the keyboard at this point in the order.
      if (!sync.isFree(action.type) && from !== room.getState().batonHolder) return;
      const code = sync.isCodeEdit(action.type);
      const before = sync.codeKey(store.getState());
      run(action);
      const after = sync.codeKey(store.getState());
      if (code) sentKey = after;
      else if (after !== before && room.holdsBaton()) scheduleCode();
    },
  });
  const offFlush = room.beforeBatonPass(flushCode);

  try {
    target.dispatch = intercept;
  } catch {
    // A frozen store can't be put in a room; chat and presence still work.
  }

  return () => {
    clearTimeout(timer);
    offFlush();
    room.bind(null);
    if (target.dispatch !== intercept) return;
    if (hadOwn) target.dispatch = previous;
    else delete (target as { dispatch?: unknown }).dispatch;
  };
}

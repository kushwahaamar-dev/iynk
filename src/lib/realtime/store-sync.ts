import type { LabKind, LabStore } from "@/components/dock/types";
import { newId, type Action } from "./protocol";
import type { RoomClient } from "./room";
import { HYDRATE, labSync } from "./shared-actions";

type SyncOptions = { debounceMs?: number; maxWaitMs?: number };

/**
 * Puts a lab store in a room. While attached, the store's dispatch sends
 * shared actions to the relay instead of applying them, and the room applies
 * them back in seq order through the original dispatch. Lab pages keep
 * calling store.dispatch as before; detaching restores it.
 *
 * Code edits are the exception: the keyboard holder applies them at once (so
 * typing never waits for the network) and everyone else follows through the
 * full text, sent debounced; edits from anyone else are refused.
 */
export function attachStore<S, A extends { type: string }>(
  store: LabStore<S, A>,
  lab: LabKind,
  room: RoomClient,
  options: SyncOptions = {},
): () => void {
  const debounceMs = options.debounceMs ?? 200;
  const maxWaitMs = options.maxWaitMs ?? 800;
  const sync = labSync(lab);
  const target = store as { dispatch: (action: A) => void };
  const hadOwn = Object.prototype.hasOwnProperty.call(store, "dispatch");
  const previous = store.dispatch;
  const original = previous.bind(store) as (action: A) => void;
  const run = (action: Action) => original(action as unknown as A);
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
      room.sendAction({ ...action, n });
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
    if (sync.isCodeEdit(action.type)) {
      if (!room.holdsBaton()) {
        room.denyBaton();
        return;
      }
      if (sync.codeSync(store.getState(), [shared]) !== null) {
        original(action);
        edits.push(shared);
        scheduleCode();
        return;
      }
      // The code isn't readable as text: the edit itself travels, in order.
    }
    room.sendAction(shared);
  };

  room.bind({
    snapshot: () => store.getState(),
    hydrate: (state) => {
      const before = store.getState();
      run({ type: HYDRATE, state });
      // A store that doesn't know sync/hydrate is rebuilt through its own actions.
      if (store.getState() === before) for (const action of sync.rebuild(state)) run(action);
      sentKey = sync.codeKey(store.getState());
    },
    apply: (action, from) => {
      const self = from === room.getState().you.id;
      if (self && typeof action.n === "string" && ownCode.delete(action.n)) return;
      const code = sync.isCodeEdit(action.type);
      // Code only counts from whoever held the keyboard at this point in the order.
      if (code && from !== room.getState().batonHolder) return;
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

// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createTabSync } from "./tab-sync";

/** Every instance sees what the others post, never its own, as BroadcastChannel does. */
function fakeBus() {
  const members = new Set<{ listeners: Set<(ev: MessageEvent) => void> }>();
  return () => {
    const me = { listeners: new Set<(ev: MessageEvent) => void>() };
    members.add(me);
    return {
      postMessage: (data: unknown) => {
        for (const other of members) if (other !== me) other.listeners.forEach((fn) => fn({ data } as MessageEvent));
      },
      addEventListener: (_: "message", fn: (ev: MessageEvent) => void) => void me.listeners.add(fn),
      removeEventListener: (_: "message", fn: (ev: MessageEvent) => void) => void me.listeners.delete(fn),
    } as unknown as Pick<BroadcastChannel, "postMessage" | "addEventListener" | "removeEventListener">;
  };
}

const note = { id: "p1", revision: 9, hash: "abc" };

describe("tab sync", () => {
  it("tells another tab about a save and not the tab that made it", () => {
    const open = fakeBus();
    const a = createTabSync(open());
    const b = createTabSync(open());
    const heardA = vi.fn();
    const heardB = vi.fn();
    a.onOther(heardA);
    b.onOther(heardB);

    a.announce(note);

    expect(heardB).toHaveBeenCalledWith(note);
    expect(heardA).not.toHaveBeenCalled();
  });

  it("stops after the returned function is called", () => {
    const open = fakeBus();
    const a = createTabSync(open());
    const b = createTabSync(open());
    const heard = vi.fn();
    b.onOther(heard)();
    a.announce(note);
    expect(heard).not.toHaveBeenCalled();
  });

  it("drops messages that are not announcements", () => {
    const open = fakeBus();
    const channel = open();
    const heard = vi.fn();
    createTabSync(channel).onOther(heard);
    open().postMessage({ id: 1 });
    open().postMessage("hello");
    expect(heard).not.toHaveBeenCalled();
  });

  it("works alone without a channel", () => {
    const sync = createTabSync(null);
    expect(() => sync.announce(note)).not.toThrow();
    expect(sync.onOther(() => undefined)).toBeTypeOf("function");
  });

  it("sends only the id, revision and hash", () => {
    const post = vi.fn();
    createTabSync({ postMessage: post, addEventListener: vi.fn(), removeEventListener: vi.fn() }).announce({ ...note, extra: "x" } as typeof note);
    expect(post).toHaveBeenCalledWith(note);
  });
});

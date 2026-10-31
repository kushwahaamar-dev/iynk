import { afterEach, describe, expect, it, vi } from "vitest";
import { cryptoRandom } from "@/core/ids";
import type { ProjectEv } from "@/local/project-protocol";
import { stateHash } from "@/project/hash";
import { createSession } from "@/project/session";
import { LOCAL_ACTOR, loadStarter } from "@/studio/templates";
import { createDocStore } from "@/studio/stores/doc";
import { createRunStore } from "@/studio/stores/run";
import { createAnnouncer } from "@/studio/tools/keyboard";
import { installDebugHook } from "./debugHook";
import { linkRepository, type ProjectHostLike } from "./repositoryLink";

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.__iynkStudioDebug;
});

async function rig() {
  const project = await loadStarter("blink", { rnd: cryptoRandom, now: "2026-10-28T10:00:00.000Z", actor: LOCAL_ACTOR });
  const doc = createDocStore(createSession({ state: project, clock: Date.now, rnd: cryptoRandom }));
  const run = createRunStore();
  const announcer = createAnnouncer();
  const tools = vi.fn(() => [{ tool: "select" as const, result: "none" as const }]);
  return { project, doc, run, announcer, tools, hook: installDebugHook({ doc, run, announcer, tools }) };
}

function fakeHost() {
  const listeners = new Set<(ev: ProjectEv) => void>();
  const host: ProjectHostLike = {
    load: vi.fn(),
    open: vi.fn(async () => undefined),
    commit: vi.fn(async () => undefined),
    save: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    keepRevision: vi.fn(),
    onEvent(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
  return { host, listeners };
}

describe("debug hook", () => {
  it("does nothing without the test flag", async () => {
    const { hook } = await rig();
    expect(window.__iynkStudioDebug).toBeUndefined();
    const { host } = fakeHost();
    expect(hook.wrapHost(host)).toBe(host);
    hook.dispose();
  });

  it("reads the document, the nets, the announcer, the run and the tool log", async () => {
    vi.stubEnv("NEXT_PUBLIC_STUDIO_TEST", "1");
    const { doc, run, announcer, tools, hook } = await rig();
    const debug = window.__iynkStudioDebug!;
    expect(debug.stateHash()).toBe(stateHash(doc.getState().state));

    const nets = debug.nets();
    expect(nets.length).toBeGreaterThan(0);
    for (const net of nets) {
      expect(net).toEqual([...net].sort());
      for (const pin of net) expect(pin).toMatch(/^[^.]+\..+$/);
    }
    expect(nets).toEqual([...nets].sort((a, b) => (a.join() < b.join() ? -1 : 1)));

    announcer.say("studioWire.announce.gridOn");
    expect(debug.announcer()).toEqual([{ key: "studioWire.announce.gridOn", args: {} }]);

    run.apply({ t: "phase", phase: "starting" });
    expect(debug.run().startedAtMs).not.toBeNull();
    expect(debug.tools()).toBe(tools.mock.results[0]!.value);

    hook.dispose();
    expect(window.__iynkStudioDebug).toBeUndefined();
  });

  it("makes the next save fail once and the chip show it", async () => {
    vi.stubEnv("NEXT_PUBLIC_STUDIO_TEST", "1");
    const { doc, hook } = await rig();
    const { host } = fakeHost();
    const wrapped = hook.wrapHost(host);
    const off = linkRepository(doc, wrapped);

    window.__iynkStudioDebug!.failNextSave("quota");
    await wrapped.save("manual");
    expect(host.save).not.toHaveBeenCalled();
    expect(doc.getState().saveChip).toBe("autosave-failed");

    await wrapped.save("manual");
    expect(host.save).toHaveBeenCalledTimes(1);
    off();
    hook.dispose();
  });

  it("stops forwarding events to a listener once it unsubscribes", async () => {
    vi.stubEnv("NEXT_PUBLIC_STUDIO_TEST", "1");
    const { hook } = await rig();
    const { host, listeners } = fakeHost();
    const wrapped = hook.wrapHost(host);
    const off = wrapped.onEvent(() => {});
    expect(listeners.size).toBe(1);
    off();
    expect(listeners.size).toBe(0);
    hook.dispose();
  });
});

import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createMemoryRepository } from "@/local/memory-repository";
import { createProjectHandler } from "@/local/project-handler";
import { createProjectHost } from "@/local/project-host";
import { createShadow } from "@/local/shadow";
import { fakeTimers } from "@/local/timers.testing";
import { createInlinePort } from "@/protocol";
import { stateHash } from "@/project/hash";
import type { Op } from "@/project/generated/types";
import { startProject } from "@/project/testing/generators";
import { useOpenProject } from "./openProject";
import { linkRepository, type ProjectHostLike } from "./repositoryLink";

function realHost() {
  return createProjectHost({
    makePort: () => createInlinePort(createProjectHandler({ repo: createMemoryRepository(), shadowFactory: createShadow, clock: () => 1_790_000_000_000 })),
  });
}

function fakeHost(load: ProjectHostLike["load"]): ProjectHostLike {
  return {
    load,
    open: vi.fn(async () => undefined),
    commit: vi.fn(async () => undefined),
    save: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    keepRevision: vi.fn(),
    onEvent: () => () => undefined,
  };
}

const project = startProject(1);

describe("useOpenProject", () => {
  it("is loading until the host answers, then ready with a store", async () => {
    const host = fakeHost(async () => ({ status: "ok", state: project, revision: project.revision }));
    const { result } = renderHook(() => useOpenProject(project.id, { host }));
    expect(result.current).toEqual({ status: "loading", doc: null });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.doc?.getState()).toMatchObject({ revision: project.revision, canUndo: false, saveChip: "saved" });
    expect(host.open).toHaveBeenCalledWith(project.id, project, project.revision);
  });

  it("reports recovered when the previous copy was opened", async () => {
    const host = fakeHost(async () => ({ status: "recovered", state: project, revision: project.revision }));
    const { result } = renderHook(() => useOpenProject(project.id, { host }));
    await waitFor(() => expect(result.current.status).toBe("recovered"));
    expect(result.current.doc).not.toBeNull();
  });

  it.each(["missing", "lost"] as const)("reports %s without opening anything", async (status) => {
    const host = fakeHost(async () => ({ status }));
    const { result } = renderHook(() => useOpenProject("prj_gone", { host }));
    await waitFor(() => expect(result.current.status).toBe(status));
    expect(result.current.doc).toBeNull();
    expect(host.open).not.toHaveBeenCalled();
  });

  it("reports an error when the host throws", async () => {
    const host = fakeHost(async () => {
      throw new Error("worker gone");
    });
    const { result } = renderHook(() => useOpenProject(project.id, { host }));
    await waitFor(() => expect(result.current).toMatchObject({ status: "error", doc: null, error: "worker gone" }));
  });

  it("waits while there is no id and closes the project on unmount", async () => {
    const load = vi.fn(async () => ({ status: "ok" as const, state: project, revision: project.revision }));
    const host = fakeHost(load);
    const idle = renderHook(() => useOpenProject(null, { host }));
    expect(idle.result.current.status).toBe("loading");
    expect(load).not.toHaveBeenCalled();

    const { result, unmount } = renderHook(() => useOpenProject(project.id, { host }));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    unmount();
    expect(host.close).toHaveBeenCalledWith(project.id);
  });

  it("settles under StrictMode", async () => {
    const host = fakeHost(async () => ({ status: "ok", state: project, revision: project.revision }));
    const { result } = renderHook(() => useOpenProject(project.id, { host }), { wrapper: StrictMode });
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });
});

describe("edit, save and reopen", () => {
  it("gives the same document hash back and an empty undo stack", async () => {
    const host = realHost();
    const id = await host.library.create({ board: "uno" });
    const first = renderHook(() => useOpenProject(id, { host }));
    await waitFor(() => expect(first.result.current.status).toBe("ready"));
    const doc = first.result.current.doc!;

    const timers = fakeTimers();
    const target = { addEventListener: () => undefined, removeEventListener: () => undefined };
    const unlink = linkRepository(doc, host, {
      env: { timers, doc: { ...target, visibilityState: "visible" }, win: target, strategy: "main-journal-at-pagehide" },
    });
    const retitles: Op[] = [1, 2, 3, 4, 5].map((n) => ({ k: "meta.set", set: { title: `Blinky ${n}` } }));
    act(() => {
      for (const op of retitles) expect(doc.commit([op], { label: "Retitle" }).ok).toBe(true);
    });
    const before = stateHash(doc.session.state);
    await act(async () => {
      await host.save("manual");
    });
    unlink();
    first.unmount();
    await Promise.resolve();

    const second = renderHook(() => useOpenProject(id, { host }));
    await waitFor(() => expect(second.result.current.status).toBe("ready"));
    const reopened = second.result.current.doc!;
    expect(stateHash(reopened.session.state)).toBe(before);
    expect(reopened.getState().canUndo).toBe(false);
    expect(reopened.undo()).toBeNull();
  });
});

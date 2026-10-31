import { act, cleanup, configure, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cryptoRandom } from "@/core/ids";
import { writeIynk } from "@/export/iynk";
import faults from "@/i18n/messages/en/faults.json";
import fidelity from "@/i18n/messages/en/fidelity.json";
import instruments from "@/i18n/messages/en/instruments.json";
import partinfo from "@/i18n/messages/en/partinfo.json";
import run from "@/i18n/messages/en/run.json";
import studio from "@/i18n/messages/en/studio.json";
import studioCode from "@/i18n/messages/en/studioCode.json";
import studioEdit from "@/i18n/messages/en/studioEdit.json";
import studioHome from "@/i18n/messages/en/studioHome.json";
import studioInspect from "@/i18n/messages/en/studioInspect.json";
import studioModels from "@/i18n/messages/en/studioModels.json";
import studioRun from "@/i18n/messages/en/studioRun.json";
import studioWire from "@/i18n/messages/en/studioWire.json";
import type { StudioMessages } from "@/i18n/namespaces";
import { createMemoryRepository } from "@/local/memory-repository";
import { createProjectHandler } from "@/local/project-handler";
import { createProjectHost } from "@/local/project-host";
import { createShadow } from "@/local/shadow";
import { createInlinePort } from "@/protocol";
import type { SimHost } from "@/sim-host/host";
import { LOCAL_ACTOR, loadStarter } from "@/studio/templates";
import { createServices, ServicesProvider, type Services } from "./wiring/services";
import { Workspace } from "./Workspace";

// The workspace builds its whole graph before the first region shows; the default one second is tight on a busy machine.
configure({ asyncUtilTimeout: 5000 });

const messages = { studio, studioHome, studioEdit, studioInspect, studioWire, studioCode, studioRun, studioModels, fidelity, instruments, faults, run, partinfo } as StudioMessages;
const regions = studio.layout.regions;

function fakeSim() {
  const subscribed = vi.fn();
  const unsubscribed = vi.fn();
  const sim = {
    load: vi.fn(async () => ({ diagnostics: [], runId: 1 })),
    control: vi.fn(async () => undefined),
    input: vi.fn(async () => undefined),
    onEvent: vi.fn(() => {
      subscribed();
      return unsubscribed;
    }),
    staticCheck: vi.fn(async () => ({ findings: [], skipped: {}, errors: [] })),
    state: "ready",
    kill: vi.fn(async () => undefined),
  };
  return { sim: sim as unknown as SimHost, load: sim.load, subscribed, unsubscribed };
}

async function rig() {
  // Strict Mode kills the host once on its way through, so a restarted worker has to find the same repository.
  const repo = createMemoryRepository();
  const host = createProjectHost({
    makePort: () => createInlinePort(createProjectHandler({ repo, shadowFactory: createShadow, clock: () => 1_790_000_000_000 })),
  });
  const sim = fakeSim();
  const services = createServices({ host, sim: sim.sim });
  const project = await loadStarter("blink", { rnd: cryptoRandom, now: "2026-10-28T10:00:00.000Z", actor: LOCAL_ACTOR });
  const stored = await services.files.importBytes(writeIynk(project), `${project.meta.title}.iynk`);
  if (!stored.ok) throw new Error(stored.error.message);
  const factory = (): Services => services;
  const mount = (props: { projectId?: string; autorun?: boolean; strict?: boolean } = {}) => {
    const tree = (
      <ServicesProvider factory={factory}>
        <Workspace projectId={props.projectId ?? stored.id} autorun={props.autorun ?? false} messages={messages} lang="en" />
      </ServicesProvider>
    );
    return render(props.strict ? <StrictMode>{tree}</StrictMode> : tree);
  };
  return { mount, sim, project, id: stored.id };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.title = "";
});

describe("Workspace", () => {
  it("opens a starter with every region named and the project name in the title", async () => {
    const { mount, project } = await rig();
    mount();
    await screen.findByRole("region", { name: regions.canvas });
    for (const name of [regions.left, regions.right, regions.dock]) expect(screen.getByRole("region", { name })).toBeTruthy();
    expect(screen.getByRole("group", { name: regions.top })).toBeTruthy();
    expect(screen.getByRole("toolbar", { name: studio.topBar.label })).toBeTruthy();
    expect(screen.getByRole("application")).toBeTruthy();
    expect(document.title).toBe(`${project.meta.title} | iynk`);
  });

  it("shows a message page with a way home for a project that is not stored", async () => {
    const { mount } = await rig();
    mount({ projectId: "prj_gone" });
    expect(await screen.findByText(studio.workspace.missingTitle)).toBeTruthy();
    const back = screen.getByRole("button", { name: studio.workspace.back });
    act(() => back.click());
    expect(window.location.hash).toBe("#/");
  });

  it("starts the run once for autorun, also under Strict Mode", async () => {
    const { mount, sim } = await rig();
    mount({ autorun: true, strict: true });
    await screen.findByRole("region", { name: regions.canvas });
    await waitFor(() => expect(sim.load).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(sim.load).toHaveBeenCalledTimes(1);
  });

  it("does not run without autorun", async () => {
    const { mount, sim } = await rig();
    mount();
    await screen.findByRole("region", { name: regions.canvas });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(sim.load).not.toHaveBeenCalled();
  });

  it("leaves one live graph after Strict Mode mounts it twice", async () => {
    // One listener for the run link and one for the fault link.
    const { mount, sim } = await rig();
    mount({ strict: true });
    await screen.findByRole("region", { name: regions.canvas });
    expect(sim.subscribed.mock.calls.length - sim.unsubscribed.mock.calls.length).toBe(2);
  });

  it("removes every listener it added to the window and the document", async () => {
    const { mount } = await rig();
    const added: [string, unknown][] = [];
    const removed: [string, unknown][] = [];
    for (const target of [window, document]) {
      const add = target.addEventListener.bind(target);
      const remove = target.removeEventListener.bind(target);
      vi.spyOn(target, "addEventListener").mockImplementation((type: string, fn: unknown, options?: unknown) => {
        added.push([type, fn]);
        add(type, fn as EventListener, options as AddEventListenerOptions);
      });
      vi.spyOn(target, "removeEventListener").mockImplementation((type: string, fn: unknown, options?: unknown) => {
        removed.push([type, fn]);
        remove(type, fn as EventListener, options as AddEventListenerOptions);
      });
    }
    const view = mount();
    await screen.findByRole("region", { name: regions.canvas });
    view.unmount();
    // React keeps one `selectionchange` listener on the document for good.
    const leaked = added.filter(([type, fn]) => type !== "selectionchange" && !removed.some(([t, f]) => t === type && f === fn));
    expect(leaked).toEqual([]);
  });

  it("mounts the palette with its search box", async () => {
    const { mount } = await rig();
    mount();
    const left = await screen.findByRole("region", { name: regions.left });
    expect(within(left).getByRole("searchbox")).toBeTruthy();
  });
});

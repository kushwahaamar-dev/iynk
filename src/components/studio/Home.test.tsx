import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import robot from "@/i18n/messages/en/robot.json";
import studio from "@/i18n/messages/en/studio.json";
import studioHome from "@/i18n/messages/en/studioHome.json";
import { createMemoryRepository } from "@/local/memory-repository";
import { createProjectHandler } from "@/local/project-handler";
import { createProjectHost } from "@/local/project-host";
import { createShadow } from "@/local/shadow";
import { createInlinePort } from "@/protocol";
import { utf8Encode } from "@/core/canonical";
import { writeIynk } from "@/export/iynk";
import { blankProject } from "@/project/blank";
import { createSimHost } from "@/sim-host/host";
import { STARTERS } from "@/studio/templates";
import { Home } from "./Home";
import { createServices, ServicesProvider, type Services } from "./wiring/services";

const picked: { file: { name: string; bytes: Uint8Array } | null } = { file: null };

vi.mock("@/local/files", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/local/files")>()),
  openFile: vi.fn(async () => picked.file),
}));

const BASE = 1_790_000_000_000;

function rig({ degraded = false } = {}) {
  let tick = 0;
  let made!: Services;
  const factory = () => {
    const host = createProjectHost({
      makePort: () =>
        createInlinePort(
          createProjectHandler({ repo: createMemoryRepository(), shadowFactory: createShadow, clock: () => BASE + (tick += 60_000), degraded }),
        ),
    });
    const sim = createSimHost({ makePort: () => ({ call: vi.fn(), on: vi.fn(), kill: vi.fn(async () => undefined), state: "ready" }) as never });
    return (made = createServices({ host, sim }));
  };
  const onOpen = vi.fn();
  render(
    <ServicesProvider factory={factory}>
      <Home messages={studioHome} robot={robot} strings={studio} lang="en" onOpen={onOpen} />
    </ServicesProvider>,
  );
  return { onOpen, services: () => made };
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  picked.file = null;
});

describe("Home", () => {
  it("offers New project, Open from file and ten starters, and a way to start when there are no projects", async () => {
    rig();
    expect(await screen.findByText(studio.list.emptyTitle)).toBeTruthy();
    expect(screen.getByRole("button", { name: studio.newProject })).toBeTruthy();
    expect(screen.getByRole("button", { name: studio.openFromFile })).toBeTruthy();
    expect(screen.getByRole("button", { name: studioHome.starters.first.action })).toBeTruthy();
    expect(within(screen.getByRole("list", { name: studioHome.starters.listLabel })).getAllByRole("button")).toHaveLength(STARTERS.length);
  });

  it("makes an Uno project with a breadboard and opens it", async () => {
    const { onOpen, services } = rig();
    fireEvent.click(await screen.findByRole("button", { name: studio.newProject }));
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    const [id, opts] = onOpen.mock.calls[0]!;
    expect(opts).toBeUndefined();
    const loaded = await services().host.load(id);
    expect(loaded.state?.meta.title).toBe(studio.newName);
    expect(loaded.state?.boards.map((b) => b.definition.ref)).toEqual(["core.uno-r3"]);
    expect(loaded.state?.components.map((c) => c.refdes)).toEqual(["BB1"]);
    expect(loaded.state?.provenance.origin).toEqual({ kind: "blank" });
  });

  it("creates one project for two quick clicks", async () => {
    const { onOpen, services } = rig();
    const button = await screen.findByRole("button", { name: studio.newProject });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(onOpen).toHaveBeenCalled());
    expect(await services().library.list()).toHaveLength(1);
  });

  it("starts the Blink starter from the empty state and asks the workspace to run it", async () => {
    const { onOpen, services } = rig();
    fireEvent.click(await screen.findByRole("button", { name: studioHome.starters.first.action }));
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    const [id, opts] = onOpen.mock.calls[0]!;
    expect(opts).toEqual({ run: true });
    const loaded = await services().host.load(id);
    expect(loaded.state?.provenance.origin).toEqual({ kind: "template", template: "blink" });
    expect(loaded.state?.revision).toBe(0);
  });

  it("opens any other starter without running it", async () => {
    const { onOpen, services } = rig();
    await screen.findByText(studio.list.emptyTitle);
    click(new RegExp(studioHome.starters.button.title));
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    expect(onOpen.mock.calls[0]![1]).toBeUndefined();
    expect(await services().library.list()).toHaveLength(1);
  });

  it("lists a stored project and opens it from its row", async () => {
    const { onOpen } = rig();
    fireEvent.click(await screen.findByRole("button", { name: studio.newProject }));
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    const [id] = onOpen.mock.calls[0]!;
    fireEvent.click(await screen.findByRole("button", { name: `Open ${studio.newName}` }));
    expect(onOpen).toHaveBeenLastCalledWith(id);
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("warns that projects will not be kept when the browser store is unavailable", async () => {
    rig({ degraded: true });
    expect(await screen.findByText(studio.banner.degradedTitle)).toBeTruthy();
  });

  it("refuses a file from a newer iynk and offers it back", async () => {
    rig();
    const envelope = JSON.parse(new TextDecoder().decode(writeIynk(blankProject({ board: "uno", title: "Future", locale: "en", actor: "usr_x", now: "2026-10-28T10:00:00.000Z", id: "prj_future" })))) as { project: Record<string, unknown> };
    envelope.project.schemaVersion = "2.0";
    picked.file = { name: "future.iynk", bytes: utf8Encode(JSON.stringify(envelope)) };
    fireEvent.click(await screen.findByRole("button", { name: studio.openFromFile }));
    expect(await screen.findByText(studio.banner.newerTitle)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download future.iynk" })).toBeTruthy();
  });
});

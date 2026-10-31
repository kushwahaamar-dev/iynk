import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import strings from "@/i18n/messages/en/studio.json";
import { createInlinePort } from "@/protocol";
import { createProjectHandler } from "@/local/project-handler";
import { createProjectHost, type ProjectHost } from "@/local/project-host";
import type { ProjectEv } from "@/local/project-protocol";
import { createMemoryRepository } from "@/local/memory-repository";
import { createShadow } from "@/local/shadow";
import { ProjectList } from "./ProjectList";

const BASE = 1_790_000_000_000;

function rig() {
  let tick = 0;
  const listeners: Array<(ev: ProjectEv) => void> = [];
  const real = createProjectHost({
    makePort: () =>
      createInlinePort(
        createProjectHandler({ repo: createMemoryRepository(), shadowFactory: createShadow, clock: () => BASE + (tick += 60_000) }),
      ),
  });
  const host: ProjectHost = {
    ...real,
    onEvent(fn) {
      listeners.push(fn);
      return real.onEvent(fn);
    },
  };
  const emit = (ev: ProjectEv) => act(() => listeners.forEach((fn) => fn(ev)));
  render(<ProjectList strings={strings} lang="en" host={host} />);
  return { host, emit };
}

const newButton = () => screen.findByRole("button", { name: strings.newProject });

async function addProject() {
  fireEvent.click(await newButton());
  await screen.findByTestId("project-list");
}

describe("project list", () => {
  it("shows the empty state with New project focused", async () => {
    rig();
    expect(await screen.findByText(strings.list.emptyTitle)).toBeTruthy();
    expect(document.activeElement).toBe(await newButton());
  });

  it("adds a row named Blink on a board called Arduino Uno R3", async () => {
    rig();
    await addProject();
    const row = within(screen.getByTestId("project-list")).getAllByRole("row")[1];
    expect(within(row).getByText(strings.newName)).toBeTruthy();
    expect(within(row).getAllByText(strings.board.unoR3).length).toBeGreaterThan(0);
  });

  it("renames, and refuses an empty name inline", async () => {
    rig();
    await addProject();
    fireEvent.click(screen.getByRole("button", { name: "Rename Blink" }));
    const input = screen.getByLabelText("New name for Blink");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: strings.rename.save }));
    expect((await screen.findByRole("alert")).textContent).toBe(strings.rename.invalid);
    fireEvent.change(input, { target: { value: "Fade" } });
    fireEvent.click(screen.getByRole("button", { name: strings.rename.save }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Fade" })).toBeTruthy());
  });

  it("duplicates, deletes to the trash and restores", async () => {
    rig();
    await addProject();
    fireEvent.click(screen.getByRole("button", { name: "Duplicate Blink" }));
    await screen.findByRole("button", { name: "Open Copy of Blink" });

    fireEvent.click(screen.getByRole("button", { name: "Delete Copy of Blink" }));
    const restore = await screen.findByRole("button", { name: "Restore Copy of Blink" });
    expect(screen.queryByRole("button", { name: "Open Copy of Blink" })).toBeNull();

    fireEvent.click(restore);
    await screen.findByRole("button", { name: "Open Copy of Blink" });
    expect(screen.queryByRole("button", { name: "Restore Copy of Blink" })).toBeNull();
  });

  it("empties the trash", async () => {
    rig();
    await addProject();
    fireEvent.click(screen.getByRole("button", { name: "Delete Blink" }));
    await screen.findByRole("button", { name: "Restore Blink" });
    fireEvent.click(screen.getByRole("button", { name: strings.trash.emptyTrash }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Restore Blink" })).toBeNull());
  });

  it("opens a project and shows its revision and hash prefix", async () => {
    rig();
    await addProject();
    fireEvent.click(screen.getByRole("button", { name: "Open Blink" }));
    const panel = await screen.findByRole("region", { name: strings.selected.title });
    expect(within(panel).getByText(strings.selected.hash)).toBeTruthy();
    expect(within(panel).getByText(/^[0-9a-f]{8}$/)).toBeTruthy();
  });

  it("shows the banner when the host says projects are not kept", async () => {
    const { emit } = rig();
    await newButton();
    await emit({ t: "degraded", reason: "indexeddb-unavailable" });
    expect((await screen.findByText(strings.banner.degraded, { exact: false })).closest("[role=status]")).toBeTruthy();
  });

  it("shows the banner when a damaged save was replaced, and when a record is lost", async () => {
    const { emit } = rig();
    await newButton();
    await emit({ t: "recovered_from_previous", projectId: "prj_x", revision: 4 });
    await emit({ t: "record_lost", projectId: "prj_y" });
    expect(screen.getByText(strings.banner.recoveredTitle)).toBeTruthy();
    expect(screen.getByText(strings.banner.lostTitle)).toBeTruthy();
  });

  it("shows the quota banner when a save fails for space", async () => {
    const { emit } = rig();
    await newButton();
    await emit({ t: "save_failed", kind: "quota", detail: "full" });
    expect(screen.getByText(strings.banner.quotaTitle)).toBeTruthy();
  });

  it("names every action after its project and keeps each one focusable", async () => {
    rig();
    await addProject();
    const names = ["Open Blink", "Save Blink to file", "Rename Blink", "Duplicate Blink", "Delete Blink"];
    for (const name of names) {
      const button = screen.getByRole("button", { name });
      expect(button.tagName).toBe("BUTTON");
      expect(button.tabIndex).toBe(0);
      button.focus();
      expect(document.activeElement).toBe(button);
    }
  });
});

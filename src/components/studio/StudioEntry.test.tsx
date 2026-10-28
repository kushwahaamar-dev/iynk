import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudioMessages } from "@/i18n/namespaces";
import studio from "@/i18n/messages/en/studio.json";
import { StudioEntry } from "./StudioEntry";

vi.mock("next/dynamic", () => ({
  default: (load: () => Promise<unknown>) => {
    void load;
    return function Stub() {
      return <div data-testid="stub" />;
    };
  },
}));

vi.mock("./wiring/services", () => ({ ServicesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./Home", () => ({ Home: () => <div data-testid="home" /> }));
vi.mock("./Workspace", () => ({
  Workspace: ({ projectId, autorun }: { projectId: string; autorun: boolean }) => <div data-testid="workspace" data-project={projectId} data-autorun={String(autorun)} />,
}));

const messages = { studio } as StudioMessages;

afterEach(() => {
  window.location.hash = "";
});

const setHash = (hash: string) =>
  act(() => {
    window.location.hash = hash;
  });

describe("StudioEntry", () => {
  it("shows home and the diagnostics section at the bare hash", () => {
    render(<StudioEntry messages={messages} lang="en" />);
    expect(screen.getByTestId("home")).toBeTruthy();
    expect(screen.getByTestId("diagnostics")).toBeTruthy();
    expect(screen.queryByTestId("workspace")).toBeNull();
  });

  it("opens the workspace for a project and drops the diagnostics", () => {
    window.location.hash = "#/prj_a";
    render(<StudioEntry messages={messages} lang="en" />);
    expect(screen.getByTestId("workspace").dataset.project).toBe("prj_a");
    expect(screen.getByTestId("workspace").dataset.autorun).toBe("false");
    expect(screen.queryByTestId("home")).toBeNull();
    expect(screen.queryByTestId("diagnostics")).toBeNull();
  });

  it("passes the run flag of the hash on", () => {
    window.location.hash = "#/prj_a?run=1";
    render(<StudioEntry messages={messages} lang="en" />);
    expect(screen.getByTestId("workspace").dataset.autorun).toBe("true");
  });

  it("follows hashchange both ways", async () => {
    render(<StudioEntry messages={messages} lang="en" />);
    await setHash("#/prj_a?run=1");
    expect(screen.getByTestId("workspace")).toBeTruthy();
    await setHash("#/");
    expect(screen.queryByTestId("workspace")).toBeNull();
    expect(screen.getByTestId("diagnostics")).toBeTruthy();
  });

  it("treats an unknown hash as home", () => {
    window.location.hash = "#/Prj_A";
    render(<StudioEntry messages={messages} lang="en" />);
    expect(screen.getByTestId("home")).toBeTruthy();
  });
});

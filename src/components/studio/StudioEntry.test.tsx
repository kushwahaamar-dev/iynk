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

const messages = { studio } as StudioMessages;

vi.mock("./ProjectList", () => ({ ProjectList: () => <div data-testid="stub" /> }));

afterEach(() => {
  window.location.hash = "";
});

const setHash = (hash: string) =>
  act(() => {
    window.location.hash = hash;
  });

describe("StudioEntry", () => {
  it("shows the list and the diagnostics section on home", () => {
    render(<StudioEntry messages={messages} lang="en" />);
    expect(screen.getAllByTestId("stub").length).toBeGreaterThan(0);
    expect(screen.getByTestId("diagnostics")).toBeTruthy();
    expect(document.querySelector("[data-studio-slot]")).toBeNull();
  });

  it("shows the workspace slot and no diagnostics for a project", () => {
    window.location.hash = "#/prj_a";
    render(<StudioEntry messages={messages} lang="en" />);
    expect(document.querySelector('[data-studio-slot="workspace"]')).toBeTruthy();
    expect(screen.queryByTestId("diagnostics")).toBeNull();
  });

  it("follows hashchange both ways", async () => {
    render(<StudioEntry messages={messages} lang="en" />);
    await setHash("#/prj_a?run=1");
    expect(document.querySelector('[data-studio-slot="workspace"]')).toBeTruthy();
    await setHash("#/");
    expect(document.querySelector("[data-studio-slot]")).toBeNull();
    expect(screen.getByTestId("diagnostics")).toBeTruthy();
  });

  it("treats an unknown hash as home", () => {
    window.location.hash = "#/Prj_A";
    render(<StudioEntry messages={messages} lang="en" />);
    expect(screen.getByTestId("diagnostics")).toBeTruthy();
  });
});

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { LabStore } from "@/components/dock/types";
import common from "@/i18n/messages/en/common.json";

const flags = vi.hoisted(() => ({
  status: "ready" as "loading" | "ready" | "error",
  features: {
    ai: false,
    search: false,
    hw: false,
  },
}));

vi.mock("@/lib/features", () => ({
  useFeatures: () => ({ status: flags.status, features: flags.features }),
  reloadFeatures: () => undefined,
}));

const loaded = vi.hoisted(() => ({ real: 0 }));

vi.mock("@/components/search/RealBuildPanel", async (original) => {
  loaded.real++;
  return original();
});

import { I18nProvider } from "@/i18n/client";
import { LabDock } from "./LabDock";

const dock = common.client.dock;
const PHONE = "(max-width: 767px)";

function store(): LabStore {
  const state = {};
  return {
    getState: () => state,
    subscribe: () => () => {},
    dispatch: () => {},
  };
}

function stubPhone(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === PHONE ? matches : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  }));
}

function renderDock(lab: "board" | "drone" = "board") {
  return render(
    <I18nProvider locale="en" messages={common.client}>
      <main>
        <LabDock lab={lab} itemId={lab === "drone" ? "quad5" : "nano"} store={store()} figure={null} />
      </main>
    </I18nProvider>,
  );
}

function drawer() {
  return screen.getByRole("complementary", { name: dock.label });
}

function openDrawer() {
  fireEvent.click(screen.getByRole("button", { name: dock.open }));
  return drawer();
}

beforeEach(() => {
  flags.status = "ready";
  flags.features.ai = false;
  flags.features.search = false;
  flags.features.hw = false;
  window.history.replaceState(null, "", "/en/boards/nano");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("LabDock", () => {
  test("fetches a panel's code only when its tab is first on screen", async () => {
    renderDock();
    openDrawer();
    await waitFor(() => expect(loaded.real).toBe(1));
  });

  test("is a closed Lab tools button until pressed, then a drawer with Real", async () => {
    renderDock();
    const trigger = screen.getByRole("button", { name: dock.open });
    expect(trigger.textContent).toContain(dock.label);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("complementary", { name: dock.label })).toBeNull();

    openDrawer();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(drawer().getAttribute("data-layout")).toBe("desk");
    expect(screen.queryByRole("tab", { name: dock.tabs.partner })).toBeNull();
    expect(screen.queryByRole("tab", { name: dock.tabs.hardware })).toBeNull();

    expect(screen.getByRole("tab", { name: dock.tabs.real }).getAttribute("aria-selected")).toBe("true");
    await waitFor(() => expect(screen.getAllByTestId("not-set-up")).toHaveLength(1));
  });

  test("shows Hardware only when its flag is on", async () => {
    flags.features.hw = true;
    renderDock();
    fireEvent.click(screen.getByRole("button", { name: dock.open }));
    expect(await screen.findByRole("complementary", { name: dock.label })).toBeTruthy();
    expect(await screen.findByRole("tab", { name: dock.tabs.hardware })).toBeTruthy();
  });

  test("Escape and the close button shut the drawer and give focus back to the button", () => {
    renderDock();
    const trigger = screen.getByRole("button", { name: dock.open });
    const panel = openDrawer();
    fireEvent.keyDown(screen.getByRole("tab", { name: dock.tabs.real }), { key: "Escape" });
    expect(screen.queryByRole("complementary", { name: dock.label })).toBeNull();
    expect(panel.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);

    openDrawer();
    fireEvent.click(screen.getByRole("button", { name: dock.close }));
    expect(screen.queryByRole("complementary", { name: dock.label })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  test("a phone gets a full-height bottom sheet instead of the drawer", async () => {
    stubPhone(true);
    renderDock();
    await waitFor(() => expect(screen.getByRole("button", { name: dock.open }).getAttribute("aria-haspopup")).toBe("dialog"));
    expect(screen.queryByRole("tablist")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: dock.open }));
    const dialog = screen.getByRole("dialog", { name: dock.label });
    expect(dialog.querySelector('[data-testid="lab-dock"]')?.getAttribute("data-layout")).toBe("phone");
    fireEvent.click(screen.getByRole("tab", { name: dock.tabs.real }));
    expect((await screen.findAllByTestId("not-set-up")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: dock.close }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  test("renders no style element", () => {
    renderDock();
    openDrawer();
    expect(document.querySelector("style")).toBeNull();
  });
});

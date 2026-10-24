import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { LabStore } from "@/components/dock/types";
import common from "@/i18n/messages/en/common.json";
import ai from "@/i18n/messages/en/ai.json";
import search from "@/i18n/messages/en/search.json";
import together from "@/i18n/messages/en/together.json";

const flags = vi.hoisted(() => ({
  status: "ready" as "loading" | "ready" | "error",
  features: {
    ai: false,
    image: false,
    voice: false,
    search: false,
    solana: false,
    db: false,
    realtime: false,
    gemini: false,
    hw: false,
  },
}));

vi.mock("@/lib/features", () => ({
  useFeatures: () => ({ status: flags.status, features: flags.features }),
  reloadFeatures: () => undefined,
}));

import { I18nProvider } from "@/i18n/client";
import { LabDock } from "./LabDock";
import { LabRoom } from "./LabRoom";

const dock = common.client.dock;
const PHONE = "(max-width: 767px)";

function store(): LabStore {
  return {
    getState: () => ({}),
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

function renderDock() {
  return render(
    <I18nProvider locale="en" messages={common.client}>
      <LabDock lab="board" itemId="nano" store={store()} figure={null} />
    </I18nProvider>,
  );
}

beforeEach(() => {
  flags.status = "ready";
  flags.features.ai = false;
  flags.features.search = false;
  flags.features.solana = false;
  flags.features.hw = false;
  window.history.replaceState(null, "", "/en/boards/nano");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("LabDock", () => {
  test("opens Partner, Together and Real, and hides Passport and Hardware", async () => {
    renderDock();
    expect(screen.getByRole("tab", { name: dock.tabs.partner }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: dock.tabs.together })).toBeTruthy();
    expect(screen.getByRole("tab", { name: dock.tabs.real })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: dock.tabs.passport })).toBeNull();
    expect(screen.queryByRole("tab", { name: dock.tabs.hardware })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: dock.tabs.partner }));
    expect(await screen.findByText(ai.status.unavailable)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: dock.tabs.together }));
    expect(screen.getByRole("tab", { name: dock.tabs.together }).getAttribute("aria-selected")).toBe("true");
    await waitFor(() => {
      const start = screen.queryByRole("button", { name: together.panel.start });
      const unavailable = screen.queryByText(together.panel.unavailable);
      expect(start ?? unavailable).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("tab", { name: dock.tabs.real }));
    expect((await screen.findAllByText(search.real.notSetUp)).length).toBeGreaterThan(0);
  });

  test("shows Passport and Hardware only when their flags are on", async () => {
    flags.features.solana = true;
    flags.features.hw = true;
    renderDock();
    expect(await screen.findByRole("tab", { name: dock.tabs.passport })).toBeTruthy();
    expect(screen.getByRole("tab", { name: dock.tabs.hardware })).toBeTruthy();
  });

  test("a dock-tab event switches tabs and ignores a hidden one", () => {
    renderDock();
    act(() => {
      window.dispatchEvent(new CustomEvent("simlab:dock-tab", { detail: { tab: "real" } }));
    });
    expect(screen.getByRole("tab", { name: dock.tabs.real }).getAttribute("aria-selected")).toBe("true");
    act(() => {
      window.dispatchEvent(new CustomEvent("simlab:dock-tab", { detail: { tab: "passport" } }));
    });
    expect(screen.queryByRole("tab", { name: dock.tabs.passport })).toBeNull();
    expect(screen.getByRole("tab", { name: dock.tabs.real }).getAttribute("aria-selected")).toBe("true");
  });

  test("a room in the address opens Together", async () => {
    window.history.replaceState(null, "", "/en/boards/nano?room=k7m2qx");
    renderDock();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: dock.tabs.together }).getAttribute("aria-selected")).toBe("true");
    });
  });

  test("a phone gets a bottom sheet instead of the tab list", async () => {
    stubPhone(true);
    renderDock();
    const open = await screen.findByRole("button", { name: dock.open });
    expect(screen.queryByRole("tablist")).toBeNull();
    fireEvent.click(open);
    const dialog = screen.getByRole("dialog", { name: dock.label });
    expect(dialog).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: dock.tabs.real }));
    expect((await screen.findAllByText(search.real.notSetUp)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: dock.close }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  test("the page room is registered around the dock", () => {
    const { container } = render(
      <I18nProvider locale="en" messages={common.client}>
        <LabRoom lab="board" itemId="nano">
          <LabDock lab="board" itemId="nano" store={store()} figure={null} />
        </LabRoom>
      </I18nProvider>,
    );
    expect(container.querySelector('[data-lab-room="board"][data-lab-item="nano"]')).not.toBeNull();
    expect(screen.getByRole("tab", { name: dock.tabs.partner })).toBeTruthy();
  });
});

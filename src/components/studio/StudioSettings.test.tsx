import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/i18n/messages/en/studioHome.json";
import { setSetting } from "@/lib/settings";
import { createUiStore } from "@/studio/stores/ui";
import { StudioSettings, useReducedMotion } from "./StudioSettings";

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
}

// jsdom has no native popover, so the closed panel counts as hidden; the queries below ask for hidden nodes.
function openPanel() {
  fireEvent.click(screen.getByRole("button", { name: "View settings" }));
}

beforeEach(() => {
  localStorage.clear();
  HTMLElement.prototype.showPopover ??= () => {};
  HTMLElement.prototype.hidePopover ??= () => {};
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("StudioSettings", () => {
  it("shows the stored values on controls found by role and name", () => {
    const ui = createUiStore("prj_a", memoryStorage());
    render(<StudioSettings ui={ui} messages={en} />);
    openPanel();
    expect(screen.getByRole("radio", { name: "Illustrated", hidden: true }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: "Grid", hidden: true }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: "One key shortcuts", hidden: true }).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByLabelText("Snap in mm", { selector: "input" }) as HTMLInputElement).value).toBe("2.54");
  });

  it("writes art mode, grid and shortcuts to the store and persists them", () => {
    const storage = memoryStorage();
    const ui = createUiStore("prj_a", storage);
    render(<StudioSettings ui={ui} messages={en} />);
    openPanel();
    fireEvent.click(screen.getByRole("radio", { name: "Simple", hidden: true }));
    fireEvent.click(screen.getByRole("switch", { name: "Grid", hidden: true }));
    fireEvent.click(screen.getByRole("switch", { name: "One key shortcuts", hidden: true }));
    expect(ui.getState()).toMatchObject({ artMode: "simple", gridOn: false, singleKeyShortcuts: false });
    expect(JSON.parse(storage.data.get("iynk:studio:ui:prj_a") ?? "{}")).toMatchObject({ artMode: "simple", gridOn: false, singleKeyShortcuts: false });
  });

  it("clamps snap into 0.1 to 25.4 mm and shows the clamped value", () => {
    const ui = createUiStore("prj_a", memoryStorage());
    render(<StudioSettings ui={ui} messages={en} />);
    openPanel();
    const input = screen.getByLabelText("Snap in mm", { selector: "input" }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.blur(input);
    expect(ui.getState().snapMm).toBe(25.4);
    expect(input.value).toBe("25.4");

    fireEvent.change(input, { target: { value: "0.01" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(ui.getState().snapMm).toBe(0.1);
    expect(input.value).toBe("0.1");
  });

  it("puts back the stored snap when the field is left empty", () => {
    const ui = createUiStore("prj_a", memoryStorage());
    render(<StudioSettings ui={ui} messages={en} />);
    openPanel();
    const input = screen.getByLabelText("Snap in mm", { selector: "input" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(ui.getState().snapMm).toBe(2.54);
    expect(input.value).toBe("2.54");
  });
});

describe("useReducedMotion", () => {
  it("is off by default", () => {
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });

  it("follows the saved setting", () => {
    const { result } = renderHook(() => useReducedMotion());
    act(() => setSetting("reduceMotion", true));
    expect(result.current).toBe(true);
  });

  it("follows the operating system query", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });
});

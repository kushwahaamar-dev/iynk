import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import studio from "@/i18n/messages/en/studio.json";
import { createUiStore } from "@/studio/stores/ui";
import { RegionLayout } from "./RegionLayout";

let crashing = false;

function Boom() {
  if (crashing) throw new Error("panel crashed");
  return <p>inspector stub</p>;
}

function mount() {
  const ui = createUiStore("prj_test", undefined);
  const view = render(
    <RegionLayout
      top={<p>top stub</p>}
      left={{ palette: <p>palette stub</p>, files: <p>files stub</p>, outline: <p>outline stub</p> }}
      centre={<p>canvas stub</p>}
      right={{ inspector: <Boom />, problems: <p>problems stub</p>, models: <p>models stub</p> }}
      dock={{ code: <p>code stub</p>, serial: <p>serial stub</p> }}
      ui={ui}
      messages={studio}
    />,
  );
  return { ui, ...view };
}

function stubWidth(px: number) {
  const matches = px >= 768;
  vi.stubGlobal("matchMedia", (query: string) => ({ matches, media: query, addEventListener: () => {}, removeEventListener: () => {} }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  crashing = false;
});

describe("RegionLayout", () => {
  it("names every region", () => {
    mount();
    const regions = studio.layout.regions;
    for (const name of [regions.top, regions.left, regions.canvas, regions.right, regions.dock]) {
      expect(screen.getAllByLabelText(name).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("region", { name: regions.left })).toBeTruthy();
    expect(screen.getByRole("region", { name: regions.canvas })).toBeTruthy();
    expect(screen.getByRole("region", { name: regions.right })).toBeTruthy();
    expect(screen.getByRole("region", { name: regions.dock })).toBeTruthy();
    expect(screen.getByRole("group", { name: regions.top })).toBeTruthy();
    expect(screen.queryByText(studio.layout.narrow)).toBeNull();
  });

  it("shows the tab from the ui store and writes a switch back", () => {
    const { ui } = mount();
    const left = screen.getByRole("region", { name: studio.layout.regions.left });
    expect(within(left).getByRole("tab", { name: studio.layout.tabs.palette }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(within(left).getByRole("tab", { name: studio.layout.tabs.outline }));
    expect(ui.getState().leftRail).toBe("outline");
    fireEvent.click(screen.getByRole("tab", { name: studio.layout.tabs.serial }));
    expect(ui.getState().dock).toBe("serial");
  });

  it("resizes the dock from the keyboard", () => {
    const { ui } = mount();
    const separator = screen.getByRole("separator", { name: studio.layout.separator });
    expect(separator.getAttribute("aria-valuenow")).toBe("240");
    expect(separator.tabIndex).toBe(0);
    fireEvent.keyDown(separator, { key: "ArrowUp" });
    expect(ui.getState().dockHeightPx).toBe(256);
    fireEvent.keyDown(separator, { key: "ArrowDown" });
    fireEvent.keyDown(separator, { key: "ArrowDown" });
    expect(ui.getState().dockHeightPx).toBe(224);
    expect(separator.getAttribute("aria-valuenow")).toBe("224");
    for (let i = 0; i < 20; i++) fireEvent.keyDown(separator, { key: "PageDown" });
    expect(ui.getState().dockHeightPx).toBe(80);
    for (let i = 0; i < 20; i++) fireEvent.keyDown(separator, { key: "PageUp" });
    expect(ui.getState().dockHeightPx).toBe(640);
  });

  it("shows the phone notice and drops the rails below 768 px", () => {
    stubWidth(700);
    mount();
    expect(screen.getByText(studio.layout.narrow)).toBeTruthy();
    expect(screen.getByText("canvas stub")).toBeTruthy();
    expect(screen.queryByText("palette stub")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: studio.layout.open.replace("{name}", studio.layout.regions.right) }));
    expect(screen.getByRole("dialog", { name: studio.layout.regions.right })).toBeTruthy();
    expect(screen.getByText("inspector stub")).toBeTruthy();
  });

  it("contains a crash to one region and reloads it", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    crashing = true;
    mount();
    const name = studio.layout.regions.right;
    const right = screen.getByRole("region", { name });
    expect(within(right).getByRole("alert").textContent).toContain(studio.layout.boundary.failed.replace("{name}", name));
    expect(screen.getByText("top stub")).toBeTruthy();
    expect(screen.getByText("canvas stub")).toBeTruthy();
    expect(screen.getByText("palette stub")).toBeTruthy();
    expect(screen.getByText("code stub")).toBeTruthy();
    crashing = false;
    fireEvent.click(within(right).getByRole("button", { name: studio.layout.boundary.reload.replace("{name}", name) }));
    expect(within(right).getByText("inspector stub")).toBeTruthy();
    error.mockRestore();
  });
});

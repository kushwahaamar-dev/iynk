import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

const tabs = [
  { id: "overview", label: "Overview", content: <p>Overview body</p> },
  { id: "pinout", label: "Pinout", content: <p>Pinout body</p> },
  { id: "specs", label: "Specifications", content: <input aria-label="Notes" /> },
];

describe("Tabs", () => {
  it("links tabs and panels and shows only the selected panel", () => {
    render(<Tabs label="Board info" tabs={tabs} />);
    const list = screen.getByRole("tablist", { name: "Board info" });
    expect(list).toBeTruthy();
    const first = screen.getByRole("tab", { name: "Overview" });
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(first.tabIndex).toBe(0);
    expect(screen.getByRole("tab", { name: "Pinout" }).tabIndex).toBe(-1);
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(first.id);
    expect(first.getAttribute("aria-controls")).toBe(panel.id);
    expect((screen.getByText("Pinout body").closest("[role=tabpanel]") as HTMLElement).hidden).toBe(true);
  });

  it("moves and selects with the arrow keys, Home and End, wrapping at the ends", () => {
    const onChange = vi.fn();
    render(<Tabs label="Board info" tabs={tabs} onChange={onChange} />);
    const first = screen.getByRole("tab", { name: "Overview" });
    first.focus();

    fireEvent.keyDown(first, { key: "ArrowRight" });
    const second = screen.getByRole("tab", { name: "Pinout" });
    expect(document.activeElement).toBe(second);
    expect(second.getAttribute("aria-selected")).toBe("true");
    expect((screen.getByText("Pinout body").closest("[role=tabpanel]") as HTMLElement).hidden).toBe(false);

    fireEvent.keyDown(second, { key: "End" });
    const last = screen.getByRole("tab", { name: "Specifications" });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(last, { key: "ArrowRight" });
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(last, { key: "Home" });
    expect(document.activeElement).toBe(first);
    expect(onChange.mock.calls.map(([id]) => id)).toEqual(["pinout", "specs", "overview", "specs", "overview"]);
  });

  it("keeps what was typed in a hidden panel", () => {
    render(<Tabs label="Board info" tabs={tabs} defaultValue="specs" />);
    const input = screen.getByRole("textbox", { name: "Notes" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "check VIN" } });
    fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    fireEvent.click(screen.getByRole("tab", { name: "Specifications" }));
    expect((screen.getByRole("textbox", { name: "Notes" }) as HTMLInputElement).value).toBe("check VIN");
  });

  it("follows a controlled value", () => {
    const { rerender } = render(<Tabs label="Board info" tabs={tabs} value="pinout" />);
    expect(screen.getByRole("tab", { name: "Pinout" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    expect(screen.getByRole("tab", { name: "Pinout" }).getAttribute("aria-selected")).toBe("true");
    rerender(<Tabs label="Board info" tabs={tabs} value="overview" />);
    expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe("true");
  });
});

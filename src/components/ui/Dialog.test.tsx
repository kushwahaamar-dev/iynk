import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";
import { Sheet } from "./Sheet";

function Harness({ kind = "dialog" }: { kind?: "dialog" | "sheet" }) {
  const [open, setOpen] = useState(false);
  const body = (
    <>
      <button type="button">First</button>
      <a href="#x">Middle</a>
      <button type="button">Last</button>
    </>
  );
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <button type="button">Outside</button>
      {kind === "dialog" ? (
        <Dialog open={open} onClose={() => setOpen(false)} title="Wiring check" closeLabel="Close">
          {body}
        </Dialog>
      ) : (
        <Sheet open={open} onClose={() => setOpen(false)} title="Menu" closeLabel="Close menu">
          {body}
        </Sheet>
      )}
    </div>
  );
}

describe("Dialog", () => {
  it("opens as a labelled modal, focuses inside and makes the page inert", () => {
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Wiring check" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
    const outside = screen.getByText("Outside");
    expect(outside.closest("[inert]")).not.toBeNull();
  });

  it("opens without a tooltip on the close button it focuses", () => {
    const matches = Element.prototype.matches;
    // jsdom has no focus-visible heuristics: every focus counts as a keyboard focus.
    vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector: string) {
      return selector === ":focus-visible" || matches.call(this, selector);
    });
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
    vi.restoreAllMocks();
  });

  it("traps Tab and Shift+Tab inside", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");
    const close = screen.getByRole("button", { name: "Close" });
    const last = screen.getByRole("button", { name: "Last" });

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape and gives focus back to the opener", () => {
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(screen.getByText("Outside").closest("[inert]")).toBeNull();
  });

  it("closes from the close button", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Sheet", () => {
  it("behaves as the same modal: trap, Escape, focus return", () => {
    render(<Harness kind="sheet" />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    const sheet = screen.getByRole("dialog", { name: "Menu" });
    expect(sheet.contains(document.activeElement)).toBe(true);
    const last = screen.getByRole("button", { name: "Last" });
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close menu" }));
    fireEvent.keyDown(sheet, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

describe("overlay styling", () => {
  it("dialog scrim fades in, the panel rises and has no border", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const panel = screen.getByRole("dialog");
    expect(panel.parentElement?.className).toContain("animate-fade-in");
    expect(panel.parentElement?.className).toContain("bg-(--scrim)");
    expect(panel.className).toContain("animate-rise-in");
    expect(panel.className).not.toMatch(/(^|\s)border/);
  });

  it("sheet rounds the corners away from its edge", () => {
    const { rerender } = render(
      <Sheet open onClose={() => {}} title="Menu" closeLabel="Close menu" side="end" />,
    );
    expect(screen.getByRole("dialog").className).toContain("rounded-s-2xl");
    rerender(<Sheet open onClose={() => {}} title="Menu" closeLabel="Close menu" side="bottom" />);
    expect(screen.getByRole("dialog").className).toContain("rounded-t-2xl");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
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

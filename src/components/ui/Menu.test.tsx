import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { Menu, type MenuItem } from "./Menu";

// jsdom has no popover and refuses focus inside an element that carries the attribute, so this stand-in
// drops the attribute while the panel is open, opens on a click of the invoker and reports `toggle`.
function stubPopover() {
  const toggle = (el: HTMLElement, newState: "open" | "closed") => {
    if ((el.dataset.state ?? "closed") === newState) return;
    el.dataset.state = newState;
    if (newState === "open") el.removeAttribute("popover");
    else el.setAttribute("popover", "auto");
    el.dispatchEvent(Object.assign(new Event("toggle"), { newState }));
  };
  HTMLElement.prototype.showPopover = function (this: HTMLElement) {
    toggle(this, "open");
  };
  HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
    toggle(this, "closed");
  };
  const onClick = (event: MouseEvent) => {
    const invoker = (event.target as HTMLElement).closest<HTMLElement>("[popovertarget]");
    const panel = invoker ? document.getElementById(invoker.getAttribute("popovertarget") ?? "") : null;
    if (!panel) return;
    if (panel.dataset.state === "open") panel.hidePopover();
    else panel.showPopover();
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}

function setup(overrides?: Partial<Record<"a" | "b" | "c", () => void>>) {
  const run = { a: vi.fn(), b: vi.fn(), c: vi.fn(), ...overrides };
  const items: MenuItem[] = [
    { id: "a", label: "Copy link", onSelect: run.a },
    { id: "b", label: "Reset", onSelect: run.b, shortcut: "R" },
    { separator: true },
    { id: "c", label: "Delete", onSelect: run.c, disabled: true },
  ];
  render(<Menu label="Actions" trigger={<Button>More</Button>} items={items} />);
  return { run, trigger: screen.getByRole("button", { name: "More" }) };
}

function open(trigger: HTMLElement) {
  fireEvent.click(trigger);
}

describe("action menu", () => {
  let unstub: () => void;
  beforeEach(() => {
    unstub = stubPopover();
  });
  afterEach(() => unstub());

  it("marks its trigger as a menu opener and tracks the open state", () => {
    const { trigger } = setup();
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    open(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("puts the first item in focus on ArrowDown", () => {
    const { trigger } = setup();
    open(trigger);
    fireEvent.keyDown(screen.getByRole("menu", { hidden: true }), { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Copy link", hidden: true }));
  });

  it("closes on Escape and returns focus to the trigger", () => {
    const { trigger } = setup();
    open(trigger);
    fireEvent.keyDown(screen.getByRole("menu", { hidden: true }), { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("runs the second item after ArrowDown twice and Enter, then closes and returns focus", () => {
    const { run, trigger } = setup();
    open(trigger);
    const menu = screen.getByRole("menu", { hidden: true });
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    fireEvent.keyDown(menu, { key: "Enter" });
    expect(run.b).toHaveBeenCalledTimes(1);
    expect(run.a).not.toHaveBeenCalled();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("runs an item once when it is clicked", () => {
    const { run, trigger } = setup();
    open(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: /Reset/, hidden: true }));
    expect(run.b).toHaveBeenCalledTimes(1);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("jumps to an item by typing its first letter", () => {
    const { trigger } = setup();
    open(trigger);
    fireEvent.keyDown(screen.getByRole("menu", { hidden: true }), { key: "r" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: /Reset/, hidden: true }));
  });

  it("skips a disabled item with the arrows and does not run it", () => {
    const { run, trigger } = setup();
    open(trigger);
    const menu = screen.getByRole("menu", { hidden: true });
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: /Reset/, hidden: true }));
    act(() => screen.getByRole("menuitem", { name: "Delete", hidden: true }).click());
    expect(run.c).not.toHaveBeenCalled();
  });
});

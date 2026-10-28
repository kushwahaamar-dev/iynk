import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IconButton } from "./IconButton";
import { focusQuietly, Tooltip } from "./Tooltip";

function pointer(coarse: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: coarse && query === "(pointer: coarse)",
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

// jsdom has no focus-visible heuristics: every focus counts as a keyboard focus.
const matches = Element.prototype.matches;
function keyboardFocus(element: HTMLElement) {
  act(() => element.focus());
}

describe("tooltips", () => {
  beforeEach(() => {
    pointer(false);
    vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector: string) {
      return selector === ":focus-visible" || matches.call(this, selector);
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("show on keyboard focus and on a mouse hover", () => {
    vi.useFakeTimers();
    render(<IconButton icon="close" label="Close menu" />);
    const button = screen.getByRole("button", { name: "Close menu" });
    keyboardFocus(button);
    // A tip with `hidden` is left out of the accessibility tree, so finding it means it shows.
    expect(screen.getByRole("tooltip")).toBeTruthy();
    act(() => button.blur());
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.pointerEnter(button, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("tooltip").textContent).toBe("Close menu");
  });

  it("stay shut when the code moves focus, and show again on the next keyboard focus", () => {
    render(<IconButton icon="close" label="Close menu" />);
    const button = screen.getByRole("button", { name: "Close menu" });
    act(() => focusQuietly(button));
    expect(screen.queryByRole("tooltip")).toBeNull();
    act(() => button.blur());
    keyboardFocus(button);
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("never show on a coarse pointer, even when a menu moves focus to its close button", () => {
    pointer(true);
    vi.useFakeTimers();
    render(
      <>
        <IconButton icon="close" label="Close menu" />
        <Tooltip content="Run the sketch">
          <button type="button">Run</button>
        </Tooltip>
      </>,
    );
    keyboardFocus(screen.getByRole("button", { name: "Close menu" }));
    keyboardFocus(screen.getByRole("button", { name: "Run" }));
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Run" }), { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("move sideways to stay on the screen", () => {
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 390 });
    // Centred on a button at the right edge, the tip would run from 330 to 420.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const box = this.getAttribute("role") === "tooltip" ? { left: 330, right: 420 } : { left: 340, right: 384 };
      return { ...box, top: 0, bottom: 30, width: box.right - box.left, height: 30, x: box.left, y: 0, toJSON() {} } as DOMRect;
    });
    render(<IconButton icon="close" label="Close menu" />);
    keyboardFocus(screen.getByRole("button", { name: "Close menu" }));
    // 420 - (390 - 8) = 38 px back to the left.
    expect(screen.getByRole("tooltip", { hidden: true }).style.translate).toBe("calc(-50% + -38px) 0");
    Reflect.deleteProperty(document.documentElement, "clientWidth");
  });
});
